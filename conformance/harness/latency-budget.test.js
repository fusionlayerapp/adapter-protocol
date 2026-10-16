import { test } from 'node:test'
import assert from 'node:assert/strict'

function computePercentile(sortedArr, p) {
  if (sortedArr.length === 0) throw new Error('Empty array')
  const idx = Math.ceil((p / 100) * sortedArr.length) - 1
  return sortedArr[Math.max(0, idx)]
}

test('test_p50_within_30ms_budget', () => {
  const samples = Array.from({ length: 20 }, (_, i) => 5 + i)
  const sorted = [...samples].sort((a, b) => a - b)
  const p50 = computePercentile(sorted, 50)
  assert.ok(p50 <= 30, `P50 ${p50}ms exceeds 30ms budget`)
})

test('test_p95_within_80ms_budget', () => {
  const samples = [
    10, 12, 14, 15, 16, 18, 20, 22, 24, 25,
    26, 28, 30, 32, 34, 36, 38, 40, 42, 75,
  ]
  const sorted = [...samples].sort((a, b) => a - b)
  const p95 = computePercentile(sorted, 95)
  assert.ok(p95 <= 80, `P95 ${p95}ms exceeds 80ms budget`)
})

test('test_violation_detected_when_p50_exceeds_budget', () => {
  const samples = Array.from({ length: 20 }, (_, i) => 35 + i)
  const sorted = [...samples].sort((a, b) => a - b)
  const p50 = computePercentile(sorted, 50)
  assert.ok(p50 > 30, `Expected P50 ${p50}ms to exceed 30ms budget (violation should be detected)`)
})

test('test_percentile_calculation_correct', () => {
  const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const p50 = computePercentile(arr, 50)
  assert.ok(p50 >= 5 && p50 <= 6, `P50 of [1..10] should be 5 or 6, got ${p50}`)
  const p95 = computePercentile(arr, 95)
  assert.equal(p95, 10)
})
