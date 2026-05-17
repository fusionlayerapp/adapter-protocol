#!/usr/bin/env node
import { performance } from 'node:perf_hooks'
import { parseArgs } from 'node:util'

function computePercentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1
  return sortedArr[Math.max(0, idx)]
}

export async function runMultiAdapterBenchmark(adapters, options = {}) {
  const runs = options.runs ?? 10
  const timestamp = new Date().toISOString()

  const results = []
  for (const adapter of adapters) {
    const latencies = []
    let errors = 0

    if (runs === 0) {
      results.push({
        vendor_id: adapter.vendorId,
        p50_ms: 0,
        p95_ms: 0,
        p99_ms: 0,
        mean_ms: 0,
        min_ms: 0,
        max_ms: 0,
        error_rate_pct: 0,
        budget_passed: true,
      })
      continue
    }

    for (let i = 0; i < runs; i++) {
      const start = performance.now()
      try {
        await adapter.call({})
      } catch {
        errors++
      }
      latencies.push(performance.now() - start)
    }

    const sorted = [...latencies].sort((a, b) => a - b)
    const mean = latencies.reduce((s, v) => s + v, 0) / latencies.length
    const p50 = computePercentile(sorted, 50)
    const p95 = computePercentile(sorted, 95)
    const p99 = computePercentile(sorted, 99)

    results.push({
      vendor_id: adapter.vendorId,
      p50_ms: Math.round(p50 * 100) / 100,
      p95_ms: Math.round(p95 * 100) / 100,
      p99_ms: Math.round(p99 * 100) / 100,
      mean_ms: Math.round(mean * 100) / 100,
      min_ms: Math.round(sorted[0] * 100) / 100,
      max_ms: Math.round(sorted[sorted.length - 1] * 100) / 100,
      error_rate_pct: Math.round((errors / runs) * 10000) / 100,
      budget_passed: p50 <= 30 && p95 <= 80,
    })
  }

  const successful = results.filter(r => r.error_rate_pct < 100)
  const winner = successful.length > 0
    ? successful.reduce((best, r) => r.p50_ms < best.p50_ms ? r : best).vendor_id
    : null

  return {
    timestamp,
    adapters: results,
    winner,
    notes: `Benchmark run against mock adapter. Sequential mode. ${runs} runs per adapter.`,
  }
}

// CLI entry point
if (process.argv[1].endsWith('benchmark.js') || process.argv[1].endsWith('benchmark')) {
  const { values } = parseArgs({
    options: {
      adapter: { type: 'string', default: 'mock' },
      runs: { type: 'string', default: '10' },
    },
    strict: false,
  })

  const runs = parseInt(values.runs, 10)
  const vendorId = values.adapter

  const mockAdapter = {
    vendorId,
    call: async () => ({ content: 'ok' }),
  }

  const report = await runMultiAdapterBenchmark([mockAdapter], { runs })
  process.stdout.write(JSON.stringify(report, null, 2) + '\n')
}
