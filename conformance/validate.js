#!/usr/bin/env node
// AI Adapter Protocol — Conformance Harness
// Usage:
//   node conformance/validate.js              — L1 static schema validation
//   node conformance/validate.js --l2 [--adapter <path>]  — L2 mock-vendor harness

'use strict'

const fs = require('node:fs')
const path = require('node:path')
const Ajv = require('ajv/dist/2020')
const addFormats = require('ajv-formats')

const REPO_ROOT = path.resolve(__dirname, '..')
const SCHEMA_DIR = path.join(REPO_ROOT, 'schema')
const VECTORS_DIR = path.join(REPO_ROOT, 'conformance', 'vectors')
const INVALID_DIR = path.join(VECTORS_DIR, 'invalid')

const SCHEMA_MAP = {
  request: 'https://hn2.github.io/adapter-protocol/schema/1.0.0/request',
  response: 'https://hn2.github.io/adapter-protocol/schema/1.0.0/response',
  chunk: 'https://hn2.github.io/adapter-protocol/schema/1.0.0/chunk',
  capabilities: 'https://hn2.github.io/adapter-protocol/schema/1.0.0/capabilities',
}

const RESPONSE_SCHEMA_ID = SCHEMA_MAP.response
const CHUNK_SCHEMA_ID = SCHEMA_MAP.chunk

function loadAjv() {
  const ajv = new Ajv({ strict: false, allErrors: true })
  addFormats(ajv)
  for (const name of fs.readdirSync(SCHEMA_DIR)) {
    if (!name.endsWith('.schema.json')) continue
    const schema = JSON.parse(fs.readFileSync(path.join(SCHEMA_DIR, name), 'utf8'))
    if (schema['$id']) ajv.addSchema(schema, schema['$id'])
  }
  return ajv
}

function stripMeta(doc) {
  const out = {}
  for (const [k, v] of Object.entries(doc)) {
    if (!k.startsWith('_')) out[k] = v
  }
  return out
}

function loadVectors(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir)
    .filter(n => n.endsWith('.json'))
    .sort()
    .map(n => path.join(dir, n))
}

function runL1() {
  const ajv = loadAjv()
  const vectors = [
    ...loadVectors(VECTORS_DIR).map(p => ({ path: p, rel: path.relative(VECTORS_DIR, p) })),
    ...loadVectors(INVALID_DIR).map(p => ({ path: p, rel: path.relative(VECTORS_DIR, p) })),
  ]

  let passed = 0
  let failed = 0
  const results = []

  for (const { path: filePath, rel } of vectors) {
    let doc
    try {
      doc = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (e) {
      results.push({ rel, pass: false, error: `parse error: ${e.message}` })
      failed++
      continue
    }

    const schemaKey = doc._schema
    const schemaId = SCHEMA_MAP[schemaKey]
    if (!schemaId) {
      results.push({ rel, pass: false, error: `unknown _schema value: ${JSON.stringify(schemaKey)}` })
      failed++
      continue
    }

    const expectInvalid = doc._expect === 'invalid'
    const payload = '_value' in doc ? doc._value : stripMeta(doc)
    const valid = ajv.validate(schemaId, payload)
    const errors = (ajv.errors || []).map(e => `${e.instancePath || '(root)'} ${e.message}`)

    if (expectInvalid) {
      if (!valid) {
        results.push({ rel, pass: true, note: `expected invalid — ${errors[0] ?? ''}` })
        passed++
      } else {
        results.push({ rel, pass: false, error: 'expected validation failure but schema accepted it' })
        failed++
      }
    } else {
      if (valid) {
        results.push({ rel, pass: true })
        passed++
      } else {
        results.push({ rel, pass: false, error: errors.join('; ') })
        failed++
      }
    }
  }

  console.log('\nAdapter Protocol Conformance Harness — L1 Static Schema')
  console.log('=========================================================')
  console.log(`Passed: ${passed}  Failed: ${failed}\n`)

  for (const r of results) {
    const icon = r.pass ? 'PASS' : 'FAIL'
    const extra = r.note ? ` (${r.note})` : r.error ? ` — ${r.error}` : ''
    console.log(`[${icon}] ${r.rel}${extra}`)
  }

  if (failed > 0) {
    console.log(`\nConformance check FAILED (${failed} failure${failed === 1 ? '' : 's'})`)
    process.exit(1)
  } else {
    console.log(`\nAll ${passed} checks passed`)
  }
}

// ---------- L2 harness ----------

// Reference in-process adapter that wraps the fetch-based AAP interface.
// When --adapter is provided, load and use that adapter. Otherwise use the
// built-in reference adapter that speaks OpenAI-compatible JSON.
function makeReferenceAdapter(baseURL, apiKey) {
  return {
    vendorId: 'openai',
    capabilities: ['streaming', 'tools', 'vision', 'json_mode'],

    async call(req) {
      const controller = new AbortController()
      const timeoutMs = req._timeout_ms || 30000
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const res = await fetch(`${baseURL}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'authorization': `Bearer ${req.apiKey || apiKey}` },
          body: JSON.stringify({
            model: req.model,
            messages: req.messages,
            ...(req.tools ? { tools: req.tools } : {}),
            ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
            ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
          }),
          signal: controller.signal,
        })
        if (!res.ok) {
          const txt = await res.text().catch(() => '')
          const err = new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`)
          err.code = res.status === 429 ? 'rate_limited'
            : (res.status === 401 || res.status === 403) ? 'invalid_api_key'
            : res.status === 402 ? 'quota_exceeded'
            : res.status >= 500 ? 'upstream_5xx'
            : 'invalid_request'
          throw err
        }
        let data
        try {
          data = await res.json()
        } catch (e) {
          const err = new Error(`Parse error: ${e.message}`)
          err.code = 'unknown'
          throw err
        }
        const toolCalls = data.choices?.[0]?.message?.tool_calls
        const content = data.choices?.[0]?.message?.content
        if ((content === undefined || content === null) && !toolCalls?.length) {
          const err = new Error('Empty response: no content in choices')
          err.code = 'unknown'
          throw err
        }
        return {
          content: content || '',
          model: data.model || req.model,
          usage: {
            input_tokens: data.usage?.prompt_tokens ?? 0,
            output_tokens: data.usage?.completion_tokens ?? 0,
          },
          costUsd: 0,
          stopReason: data.choices?.[0]?.finish_reason === 'tool_calls' ? 'tool_use'
            : data.choices?.[0]?.finish_reason === 'stop' ? 'end_turn'
            : data.choices?.[0]?.finish_reason || 'end_turn',
          ...(toolCalls ? { toolCalls } : {}),
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          const te = new Error('Request timed out')
          te.code = 'upstream_timeout'
          throw te
        }
        throw err
      } finally {
        clearTimeout(timer)
      }
    },

    async* stream(req) {
      const res = await fetch(`${baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'authorization': `Bearer ${req.apiKey || apiKey}` },
        body: JSON.stringify({
          model: req.model,
          messages: req.messages,
          stream: true,
        }),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        const err = new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`)
        err.code = res.status === 429 ? 'rate_limited' : 'unknown'
        throw err
      }

      // Parse SSE
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') { yield { type: 'done' }; return }
          try {
            const parsed = JSON.parse(raw)
            const delta = parsed.choices?.[0]?.delta?.content
            if (typeof delta === 'string') yield { type: 'content', delta }
            if (parsed.usage) yield { type: 'usage', usage: { input_tokens: parsed.usage.prompt_tokens ?? 0, output_tokens: parsed.usage.completion_tokens ?? 0 } }
          } catch (_) { /* skip malformed SSE */ }
        }
      }
      yield { type: 'done' }
    },

    async healthCheck() {
      const start = Date.now()
      try {
        const res = await fetch(`${baseURL}/v1/models`, { signal: AbortSignal.timeout(5000) })
        return { ok: res.ok, latencyMs: Date.now() - start }
      } catch (_) {
        return { ok: false, latencyMs: Date.now() - start }
      }
    },
  }
}

function getScenarioInput(scenario) {
  return scenario._scenario?.input || {}
}

async function runL2Scenario(adapter, scenario, ajv) {
  const s = scenario._scenario
  if (!s) return { label: scenario.name, pass: false, error: 'no _scenario metadata in canned file' }
  const label = `${s.id}. ${s.label}`
  const input = s.input || {}
  const assertions = s.assertions || {}

  try {
    switch (s.label) {
      case 'chat-happy': {
        const resp = await adapter.call(input)
        const valid = ajv.validate(RESPONSE_SCHEMA_ID, resp)
        if (!valid) {
          const errs = (ajv.errors || []).map(e => `${e.instancePath} ${e.message}`).join('; ')
          return { label, pass: false, error: `response schema invalid: ${errs}` }
        }
        if (assertions.content && resp.content !== assertions.content) {
          return { label, pass: false, error: `expected content "${assertions.content}", got "${resp.content}"` }
        }
        return { label, pass: true }
      }

      case 'streaming': {
        const chunks = []
        for await (const chunk of adapter.stream(input)) {
          const valid = ajv.validate(CHUNK_SCHEMA_ID, chunk)
          if (!valid) {
            const errs = (ajv.errors || []).map(e => `${e.instancePath} ${e.message}`).join('; ')
            return { label, pass: false, error: `chunk schema invalid: ${errs}` }
          }
          chunks.push(chunk)
        }
        const lastChunk = chunks[chunks.length - 1]
        if (lastChunk?.type !== 'done') {
          return { label, pass: false, error: 'stream did not end with done chunk' }
        }
        if (assertions.assembled_content) {
          const assembled = chunks.filter(c => c.type === 'content').map(c => c.delta).join('')
          if (assembled !== assertions.assembled_content) {
            return { label, pass: false, error: `assembled content "${assembled}" !== "${assertions.assembled_content}"` }
          }
        }
        return { label, pass: true }
      }

      case 'tool-call': {
        const resp = await adapter.call(input)
        if (assertions.stopReason && resp.stopReason !== assertions.stopReason) {
          return { label, pass: false, error: `expected stopReason "${assertions.stopReason}", got "${resp.stopReason}"` }
        }
        if (assertions.toolCalls_length !== undefined && (resp.toolCalls?.length ?? 0) !== assertions.toolCalls_length) {
          return { label, pass: false, error: `expected ${assertions.toolCalls_length} tool call(s), got ${resp.toolCalls?.length ?? 0}` }
        }
        return { label, pass: true }
      }

      case 'capabilities': {
        if (assertions.has_streaming && !adapter.capabilities.includes('streaming')) {
          return { label, pass: false, error: 'adapter does not declare streaming capability' }
        }
        if (assertions.capabilities_is_array && !Array.isArray(adapter.capabilities)) {
          return { label, pass: false, error: 'capabilities is not an array' }
        }
        return { label, pass: true }
      }

      case 'auth-failure': {
        try {
          await adapter.call(input)
          return { label, pass: false, error: 'expected adapter to throw on 401, but it succeeded' }
        } catch (err) {
          if (assertions.error_code && err.code !== assertions.error_code) {
            return { label, pass: false, error: `expected error.code "${assertions.error_code}", got "${err.code}"` }
          }
          return { label, pass: true, note: `correctly threw ${err.code}` }
        }
      }

      case 'rate-limit': {
        try {
          await adapter.call(input)
          return { label, pass: false, error: 'expected adapter to throw on 429, but it succeeded' }
        } catch (err) {
          if (assertions.error_code && err.code !== assertions.error_code) {
            return { label, pass: false, error: `expected error.code "${assertions.error_code}", got "${err.code}"` }
          }
          return { label, pass: true, note: `correctly threw ${err.code}` }
        }
      }

      case 'timeout': {
        try {
          await adapter.call(input)
          return { label, pass: false, error: 'expected adapter to throw on timeout, but it succeeded' }
        } catch (err) {
          if (assertions.error_code && err.code !== assertions.error_code) {
            return { label, pass: false, error: `expected error.code "${assertions.error_code}", got "${err.code}"` }
          }
          return { label, pass: true, note: `correctly threw ${err.code}` }
        }
      }

      case 'malformed-response': {
        try {
          await adapter.call(input)
          return { label, pass: false, error: 'expected adapter to throw on malformed JSON, but it succeeded' }
        } catch (err) {
          return { label, pass: true, note: `correctly threw (code=${err.code})` }
        }
      }

      case 'image-input': {
        const resp = await adapter.call(input)
        if (assertions.content && resp.content !== assertions.content) {
          return { label, pass: false, error: `expected content "${assertions.content}", got "${resp.content}"` }
        }
        return { label, pass: true }
      }

      case 'empty-response': {
        try {
          await adapter.call(input)
          return { label, pass: false, error: 'expected adapter to throw on empty response, but it succeeded' }
        } catch (err) {
          return { label, pass: true, note: `correctly threw (code=${err.code})` }
        }
      }

      default:
        return { label, pass: false, error: `unknown scenario label: ${s.label}` }
    }
  } catch (err) {
    // Unexpected error in harness
    return { label, pass: false, error: `harness error: ${err.message}` }
  }
}

async function runL2(adapterPath) {
  const { startMockVendor, stopMockVendor, setActiveScenario } = require('./mock-vendor')
  const ajv = loadAjv()

  console.log('\nAdapter Protocol Conformance Harness — L2 Mock-Vendor')
  console.log('======================================================')

  let { baseURL, scenarios } = await startMockVendor()
  console.log(`Mock vendor started at ${baseURL}`)

  let adapter
  if (adapterPath) {
    try {
      const adapterModule = require(path.resolve(process.cwd(), adapterPath))
      if (typeof adapterModule.createAdapter === 'function') {
        adapter = adapterModule.createAdapter({ baseURL, apiKey: 'sk-test-harness' })
      } else if (typeof adapterModule.default === 'object') {
        adapter = adapterModule.default
      } else {
        adapter = adapterModule
      }
      console.log(`Using adapter from: ${adapterPath}`)
    } catch (err) {
      console.error(`Failed to load adapter from ${adapterPath}: ${err.message}`)
      await stopMockVendor()
      process.exit(1)
    }
  } else {
    adapter = makeReferenceAdapter(baseURL, 'sk-test-harness')
    console.log('Using built-in reference adapter (OpenAI-compatible)')
  }

  let passed = 0
  let failed = 0
  const results = []

  // Load canned scenarios
  const CANNED_DIR = path.join(__dirname, 'mock-vendor', 'canned')
  const cannedFiles = fs.readdirSync(CANNED_DIR).filter(n => n.endsWith('.json')).sort()
  const cannedScenarios = cannedFiles.map(f => JSON.parse(fs.readFileSync(path.join(CANNED_DIR, f), 'utf8')))

  for (const scenario of cannedScenarios) {
    // Pin the mock to serve exactly this scenario's response
    setActiveScenario(scenario)
    const result = await runL2Scenario(adapter, scenario, ajv)
    results.push(result)
    if (result.pass) passed++
    else failed++
  }
  setActiveScenario(null)

  await stopMockVendor()

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
  for (const r of results) {
    const icon = r.pass ? 'PASS' : 'FAIL'
    const extra = r.note ? ` (${r.note})` : r.error ? ` — ${r.error}` : ''
    console.log(`[${icon}] ${r.label}${extra}`)
  }

  if (failed > 0) {
    console.log(`\nL2 conformance FAILED (${failed} failure${failed === 1 ? '' : 's'})`)
    process.exit(1)
  } else {
    console.log(`\nAll ${passed} L2 scenarios passed`)
  }
}

// ---------- main ----------

const args = process.argv.slice(2)
const runL2Flag = args.includes('--l2')
const adapterArgIdx = args.indexOf('--adapter')
const adapterPath = adapterArgIdx !== -1 ? args[adapterArgIdx + 1] : null

if (runL2Flag) {
  runL2(adapterPath).catch(err => {
    console.error('L2 harness error:', err.message)
    process.exit(1)
  })
} else {
  runL1()
}
