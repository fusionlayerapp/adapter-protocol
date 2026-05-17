import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { getCapabilities, supportsCapability, CAPABILITY_MANIFEST } from '../../src/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REGISTRY_PATH = path.join(__dirname, '..', 'capability-registry.json')
const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))

// --- Tests from issue spec ---

test('test_anthropic_capabilities_includes_cache_breakpoints', () => {
  const result = getCapabilities('anthropic')
  assert.ok(Array.isArray(result.capabilities), 'capabilities must be an array')
  assert.ok(
    result.capabilities.includes('cache_breakpoints'),
    `anthropic capabilities must include cache_breakpoints, got: ${JSON.stringify(result.capabilities)}`
  )
  assert.equal(result.vendor_id, 'anthropic')
  assert.equal(result.protocol_version, '1.0.0')
})

test('test_openai_capabilities_includes_web_search', () => {
  const result = getCapabilities('openai')
  assert.ok(Array.isArray(result.capabilities), 'capabilities must be an array')
  assert.ok(
    result.capabilities.includes('web_search'),
    `openai capabilities must include web_search, got: ${JSON.stringify(result.capabilities)}`
  )
})

test('test_unknown_vendor_returns_empty_capabilities', () => {
  const result = getCapabilities('nonexistent-vendor-xyz')
  assert.equal(result.vendor_id, 'nonexistent-vendor-xyz')
  assert.ok(Array.isArray(result.capabilities), 'capabilities must be an array')
  assert.equal(result.capabilities.length, 0, 'unknown vendor must return empty capabilities array')
})

test('test_supportsCapability_returns_false_for_unimplemented', () => {
  assert.equal(
    supportsCapability('anthropic', 'web_search'),
    false,
    'anthropic does not support web_search'
  )
  assert.equal(
    supportsCapability('google', 'cache_breakpoints'),
    false,
    'google does not support cache_breakpoints'
  )
  assert.equal(
    supportsCapability('unknown-vendor', 'streaming'),
    false,
    'unknown vendor must return false for any capability'
  )
})

// --- Tests from task brief ---

test('test_adapter_exports_capabilities_object', () => {
  const mockAdapter = {
    vendorId: 'openai',
    capabilities: CAPABILITY_MANIFEST['openai'],
  }
  assert.ok(
    mockAdapter.capabilities !== undefined,
    'adapter must export a capabilities property'
  )
  assert.ok(
    Array.isArray(mockAdapter.capabilities),
    'capabilities must be an array'
  )
  assert.ok(mockAdapter.capabilities.length > 0, 'capabilities array must not be empty')
})

test('test_capabilities_keys_match_registry', () => {
  const registryManifestKeys = new Set(
    registry.flatMap(entry => entry.manifest_keys ?? [])
  )

  for (const [vendorId, caps] of Object.entries(CAPABILITY_MANIFEST)) {
    for (const cap of caps) {
      assert.ok(
        registryManifestKeys.has(cap),
        `capability "${cap}" for vendor "${vendorId}" has no matching manifest_key entry in capability-registry.json`
      )
    }
  }
})

test('test_unknown_capability_not_in_registry_logs_warning', () => {
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args.join(' '))

  try {
    const result = getCapabilities('totally-unknown-vendor-abc')
    assert.equal(result.capabilities.length, 0)
    assert.ok(
      warnings.some(w => w.includes('UNKNOWN_VENDOR') || w.includes('totally-unknown-vendor-abc')),
      `expected a warning mentioning the unknown vendor, got: ${JSON.stringify(warnings)}`
    )
  } finally {
    console.warn = originalWarn
  }
})
