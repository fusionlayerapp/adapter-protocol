# healthCheck() + Latency Budget Tests

**Issues:** hn2/adapter-protocol#3 (A1), hn2/adapter-protocol#4 (A2)  
**Batch:** Sonnet overnight 2026-05-16  
**Status:** In progress

## Current state (before)

The adapter-protocol conformance registry shows:
- FusionLayer / OpenRouter: L1, L2
- FusionLayer / Anthropic: L1 only
- FusionLayer / OpenAI: L1 only
- FusionLayer / Google: L1 only

`healthCheck()` exists only on the class-based `anthropic-adapter.js` proof-of-concept.  
The functional adapters (`anthropic.js`, `google.js`, `openai.js`, `openrouter.js`) in `packages/server/src/adapters/` do not export `healthCheck()`.

No latency-budget acceptance tests exist. The E1 spec requires P50 ≤30ms / P95 ≤80ms across all pipeline layers, but there is no automated test asserting this against adapters.

## Problem

- A1: L2 conformance cannot advance for Anthropic/OpenAI/Google without `healthCheck()`
- A2: No automated test enforces the latency budget — violations would not be caught in CI

## Intended approach

### A1 — healthCheck()
Add `healthCheck()` export to each functional adapter. Pattern:
```javascript
export async function healthCheck({ timeoutMs = 5000 } = {}) {
  const start = Date.now()
  try {
    // Minimal API call (list models or 1-token ping)
    // ...
    return { ok: true, latencyMs: Date.now() - start }
  } catch {
    return { ok: false, latencyMs: Date.now() - start }
  }
}
```

`healthCheck()` must never throw — all failures are returned as `{ ok: false }`.

### A2 — Latency budget tests
Add `packages/server/src/adapters/latency.test.js` that:
- Uses a Node.js `http.createServer` mock returning canned 1-token responses
- Runs 110 iterations per adapter (first 10 excluded as warm-up)
- Asserts P50 ≤30ms, P95 ≤80ms on adapter overhead (mock removes network latency)
- Uses `node --test` (no additional test runner needed)

## Files changed

- `packages/server/src/adapters/anthropic.js` — add `healthCheck()`
- `packages/server/src/adapters/openai.js` — add `healthCheck()`
- `packages/server/src/adapters/google.js` — add `healthCheck()`
- `packages/server/src/adapters/openrouter.js` — add `healthCheck()` (inherits from openai)
- `packages/server/src/adapters/latency.test.js` — L2 latency harness (new)

---

## Results (after — 2026-05-17)

### What was done
- Added `healthCheck()` export to: `anthropic.js`, `openai.js`, `google.js`, `openrouter.js`
- Each `healthCheck()` calls the vendor's model-list endpoint (fastest/cheapest probe)
- Never throws — all failures returned as `{ ok: false, latencyMs: N, vendorId }`
- Created `packages/server/src/adapters/latency.test.js` with 7 tests

### Test results
All 7 latency tests pass:
- `test_anthropic_adapter_p50_under_30ms` ✔
- `test_openai_adapter_p50_under_30ms` ✔
- `test_google_adapter_p50_under_30ms` ✔
- `test_openrouter_adapter_p50_under_30ms` ✔
- `test_latency_harness_excludes_first_10_warmup_iterations` ✔
- `test_latency_harness_fails_when_budget_exceeded` ✔
- `test_health_check_never_throws` ✔

All 44 pre-existing adapter tests still pass.

### Notes
- P50 on local mock server is <<1ms — well within budget. Real-world latency with live APIs will be dominated by network; the budget applies to pipeline overhead, not total round-trip.
- Google health check probe uses /v1beta/models endpoint (the only free probe available)

### Follow-up items
- Update CONFORMANCE-REGISTRY.md to mark Anthropic, OpenAI, Google at L2 (was L1 only)
- L3 (live API) procedure documentation (tracked in A6)
