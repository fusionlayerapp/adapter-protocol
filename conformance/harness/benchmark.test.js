import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runMultiAdapterBenchmark } from './benchmark.js'

function makeMockAdapter(vendorId, latencyMs = 0) {
  return {
    vendorId,
    call: async () => {
      if (latencyMs > 0) await new Promise(r => setTimeout(r, latencyMs))
      return { content: 'ok' }
    },
  }
}

function makeFailingAdapter(vendorId) {
  return {
    vendorId,
    call: async () => { throw new Error('adapter unavailable') },
  }
}

test('test_benchmark_computes_correct_p50', async () => {
  // Use a fast mock adapter — P50 should be ≤30ms
  const adapter = makeMockAdapter('test-vendor', 0)
  const report = await runMultiAdapterBenchmark([adapter], { runs: 20 })

  const result = report.adapters.find(a => a.vendor_id === 'test-vendor')
  assert.ok(result, 'adapter result must be present')
  assert.ok(result.p50_ms >= 0, 'p50_ms must be non-negative')
  assert.ok(result.p50_ms <= 30, `P50 ${result.p50_ms}ms must be ≤30ms for mock adapter`)
})

test('test_benchmark_outputs_all_required_fields', async () => {
  const adapter = makeMockAdapter('alpha', 0)
  const report = await runMultiAdapterBenchmark([adapter], { runs: 5 })

  // Top-level fields
  assert.ok(typeof report.timestamp === 'string', 'timestamp must be a string')
  assert.ok(Array.isArray(report.adapters), 'adapters must be an array')
  assert.ok(typeof report.winner === 'string' || report.winner === null, 'winner must be string or null')
  assert.ok(typeof report.notes === 'string', 'notes must be a string')

  // Per-adapter fields
  const r = report.adapters[0]
  for (const field of ['vendor_id', 'p50_ms', 'p95_ms', 'p99_ms', 'mean_ms', 'min_ms', 'max_ms', 'error_rate_pct', 'budget_passed']) {
    assert.ok(field in r, `adapter result must have field: ${field}`)
  }
  assert.ok(typeof r.budget_passed === 'boolean', 'budget_passed must be boolean')
})

test('test_benchmark_handles_zero_runs_gracefully', async () => {
  const adapter = makeMockAdapter('zero-run-vendor', 0)
  const report = await runMultiAdapterBenchmark([adapter], { runs: 0 })

  assert.ok(Array.isArray(report.adapters))
  assert.equal(report.adapters.length, 1)
  const r = report.adapters[0]
  assert.equal(r.vendor_id, 'zero-run-vendor')
  assert.equal(r.p50_ms, 0)
  assert.equal(r.p95_ms, 0)
  assert.equal(r.error_rate_pct, 0)
})
