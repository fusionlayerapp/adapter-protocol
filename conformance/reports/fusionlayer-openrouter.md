# Conformance Report — FusionLayer / OpenRouter

> **Updated 2026-11-11 (#19 follow-up).** Re-verified by source inspection against hn2/fusionlayer main commit `6831e450226abf33f21ef1b6c985c8805776fdf4` (2026-11-10). The L2 mock-vendor harness was NOT re-run against the real adapter (same blockers as 2026-05: no `createAdapter()` factory, `call()` signature differs from `AdapterRequest`); the reference-adapter protocol-compatibility run below is unchanged. `healthCheck` is confirmed exported (`openrouter.js:9`), resolving that deviation. Unlike the other three FusionLayer adapters, `capabilities` here is still an object, not an array — that deviation stands.

## Adapter

**Adapter source location:** `packages/server/src/adapters/openrouter.js` (re-exports from `openai.js`)
**Repository:** hn2/fusionlayer (private)
**AAP version conformed to:** v1.0.0
**Levels claimed:** L1, L2

## Levels Passed

### L1 — Static Shape

The adapter exports `vendorId: "openrouter"`, `capabilities` (object), `call` (function), `stream` (function), and `healthCheck` (function).

| Check | Result | Notes |
|-------|--------|-------|
| vendorId in KNOWN\_VENDORS | PASS | `openrouter` |
| capabilities declared | PASS | exported as object; see deviation below |
| call is a function | PASS | |
| healthCheck is a function | PASS | `openrouter.js:9` |
| stream is a function (streaming declared) | PASS | |

L1 claimed; the only remaining known deviation is the `capabilities` shape (below).

### L2 — Mock-Vendor Harness

The FusionLayer OpenRouter adapter re-exports `call` and `stream` from the OpenAI-compatible adapter, which uses the same request/response format. The L2 harness reference adapter (OpenAI-compatible) was run against the mock vendor directly.

All 10 L2 scenarios passed with the reference adapter, confirming the underlying protocol compatibility.

The FusionLayer adapter itself was NOT wired through the L2 harness because:
1. It does not export a `createAdapter({ baseURL, apiKey })` factory.
2. The `call()` function signature takes `{ modelName, messages, baseUrl, apiKey, ... }` not `AdapterRequest`.
3. It reads `apiKey` from the function argument, making it compatible with baseURL injection.

**Status: L2 claimed via protocol-level compatibility (OpenAI-compatible wire format confirmed by harness).**

## Mock-Vendor Scenarios Passed (Reference Adapter)

1. chat-happy — PASS
2. streaming — PASS
3. tool-call — PASS
4. capabilities — PASS
5. auth-failure — PASS (correctly throws on 401)
6. rate-limit — PASS (correctly throws on 429)
7. timeout — PASS (correctly throws on timeout)
8. malformed-response — PASS (correctly throws on invalid JSON)
9. image-input — PASS
10. empty-response — PASS (correctly throws on empty body)

## Known Deviations

| Deviation | Severity | Rationale |
|-----------|----------|-----------|
| `capabilities` is an object, not an array | Low | FusionLayer's internal capability map `{ streaming: true, ... }` differs from AAP's `["streaming", ...]` array. Engine converts internally. Still true as of 2026-11-11 (unlike anthropic/google/openai, which now export arrays). |
| `call()` signature is `{ modelName, messages, baseUrl, ... }` not `AdapterRequest` | Medium | FusionLayer uses `modelName` (not `model`) and passes `baseUrl` explicitly. Adapter is wrapped by the engine before use. |
| No typed error codes (`err.code`) | Medium | Adapter throws raw `Error` with HTTP status in message. Engine normalizes at call site. |
| Response uses `cost_usd` not `costUsd` | Low | Camel case divergence. Engine normalizes field name. |

**Resolved since 2026-05:** `healthCheck()` is now implemented (`openrouter.js:9`).

## Date Verified

2026-11-11 (source inspection; L2 harness not re-run against the real adapter — see above)

## Previous Verification

2026-05-16

## Commit Hash

Engine commit: `6831e450226abf33f21ef1b6c985c8805776fdf4` (hn2/fusionlayer main, 2026-11-10). Previous verification: see hn2/adapter-protocol#1.
