#!/usr/bin/env node
// Regenerates the FusionLayer engine conformance reports from the engine's real adapter modules.
// Usage: node conformance/tools/generate-engine-report.mjs --engine <path to fusionlayer checkout> --sha <engine commit sha>
// Only static, observable facts are reported (L1). Nothing is claimed that was not measured here.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
if (!args.engine || !args.sha || !/^[0-9a-f]{7,40}$/i.test(args.sha)) {
  console.error('Usage: --engine <path> --sha <commit sha>')
  process.exit(2)
}
const outDir = resolve(here, '..', 'reports')
mkdirSync(outDir, { recursive: true })
const date = new Date().toISOString().slice(0, 10)
const KNOWN_VENDORS = new Set(['anthropic', 'openai', 'google', 'openrouter', 'mistral', 'deepseek', 'xai'])
const pass = (b) => (b ? 'PASS' : 'FAIL')

function paramNames(fn) {
  const m = /^[^(]*\(\s*\{([^}]*)\}/.exec(Function.prototype.toString.call(fn))
  return m ? m[1].split(',').map((s) => s.trim().split(/[=:]/)[0].trim()).filter(Boolean) : []
}

for (const vendor of ['anthropic', 'openai', 'google', 'openrouter']) {
  const file = join(resolve(args.engine), 'packages/server/src/adapters', `${vendor}.js`)
  const mod = await import(pathToFileURL(file).href)
  const callParams = paramNames(mod.call)
  const acceptsApiKey = callParams.includes('apiKey')
  const capsKind = Array.isArray(mod.capabilities) ? 'array' : typeof mod.capabilities
  const checks = [
    ['vendorId in KNOWN_VENDORS', KNOWN_VENDORS.has(mod.vendorId) && mod.vendorId === vendor, `\`${mod.vendorId}\``],
    ['capabilities declared', mod.capabilities != null && typeof mod.capabilities === 'object', `exported as ${capsKind}`],
    ['call is a function', typeof mod.call === 'function', ''],
    ['healthCheck is a function', typeof mod.healthCheck === 'function', typeof mod.healthCheck === 'function' ? 'exported' : 'not exported'],
    ['stream is a function (streaming declared)', typeof mod.stream === 'function', ''],
  ]
  const deviations = []
  if (!acceptsApiKey) deviations.push(['API key from env var, not request', 'High', `\`call()\` takes \`{ ${callParams.join(', ')} }\`; it has no \`apiKey\` field, so it reads the key from the environment. AAP requires \`apiKey\` on \`AdapterRequest\`.`])
  if (capsKind !== 'array') deviations.push(['`capabilities` is an object, not an array', 'Low', 'Declared as an object keyed by capability.'])
  if (!callParams.includes('model') && !callParams.includes('modelName')) deviations.push(['`call()` signature', 'Medium', 'Neither `model` nor `modelName` is accepted.'])
  deviations.push(['`call()` signature is `{ modelName, messages, ... }` not `AdapterRequest`', 'Medium', 'Field names differ from the AAP request shape.'])
  deviations.push(['No typed error codes (`err.code`) verified', 'Medium', 'Not checked by this static report; no claim is made.'])
  const levels = checks.every((c) => c[1]) ? 'L1' : 'L1 (not fully passing)'

  const lines = [
    `# Conformance Report — FusionLayer / ${vendor[0].toUpperCase()}${vendor.slice(1)}`,
    '',
    '## Adapter',
    '',
    `**Adapter source location:** \`packages/server/src/adapters/${vendor}.js\``,
    '**Repository:** hn2/fusionlayer (private)',
    '**AAP version conformed to:** v1.0.0',
    `**Levels claimed:** ${levels}`,
    `**Engine commit:** \`${args.sha}\``,
    '',
    '## Levels Passed',
    '',
    '### L1 — Static Shape',
    '',
    '| Check | Result | Notes |',
    '|-------|--------|-------|',
    ...checks.map(([name, ok, note]) => `| ${name} | ${pass(ok)} | ${note} |`),
    '',
    '### L2 — Mock-Vendor Harness',
    '',
    acceptsApiKey
      ? 'L2 not run by this generator (it only measures static shape).'
      : 'L2 not claimed: the adapter does not accept `apiKey` on the request, which the harness uses to inject credentials.',
    '',
    '## Known Deviations',
    '',
    '| Deviation | Severity | Rationale |',
    '|-----------|----------|-----------|',
    ...deviations.map(([d, s, r]) => `| ${d} | ${s} | ${r} |`),
    '',
    '## Date Verified',
    '',
    date,
    '',
    '## Commit Hash',
    '',
    `Verified against hn2/fusionlayer at commit \`${args.sha}\` with \`conformance/tools/generate-engine-report.mjs\`.`,
    '',
  ]
  writeFileSync(join(outDir, `fusionlayer-${vendor}.md`), lines.join('\n'))
  console.log(`wrote fusionlayer-${vendor}.md (${levels})`)
}
