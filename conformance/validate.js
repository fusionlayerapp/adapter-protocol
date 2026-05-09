#!/usr/bin/env node
// AI Adapter Protocol — L1 Static Schema Conformance Harness
// Usage: node conformance/validate.js

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

function main() {
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

  console.log('\nAdapter Protocol Conformance Harness')
  console.log('=====================================')
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

main()
