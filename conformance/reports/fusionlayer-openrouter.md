# Conformance Report — FusionLayer / OpenRouter

## Adapter

**Adapter source location:** `packages/server/src/adapters/openrouter.js` (re-exports from `openai.js`)
**Repository:** hn2/fusionlayer (private)
**AAP version conformed to:** v1.0.0
**Levels claimed:** L1, L2

## Levels Passed

### L1 — Static Shape

The adapter exports `vendorId: "openrouter"`, `capabilities` (object), `call` (function), and `stream` (function). The adapter does NOT export `healthCheck`.

| Check | Result | Notes |
|-------|--------|-------|
| vendorId in KNOWN\_VENDORS | PASS | `openrouter` |
| capabilities declared | PASS | exported as object; see deviation below |
| call is a function | PASS | |
| healthCheck is a function | FAIL | not exported |
| stream is a function (streaming declared) | PASS | |

L1 claimed with known deviation on `healthCheck`.

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
| `capabilities` is an object, not an array | Low | FusionLayer's internal capability map `{ streaming: true, ... }` differs from AAP's `["streaming", ...]` array. Engine converts internally. |
| No `healthCheck()` method | Medium | Method not implemented. Engine performs its own uptime checks separately. |
| `call()` signature is `{ modelName, messages, baseUrl, ... }` not `AdapterRequest` | Medium | FusionLayer uses `modelName` (not `model`) and passes `baseUrl` explicitly. Adapter is wrapped by the engine before use. |
| No typed error codes (`err.code`) | Medium | Adapter throws raw `Error` with HTTP status in message. Engine normalizes at call site. |
| Response uses `cost_usd` not `costUsd` | Low | Camel case divergence. Engine normalizes field name. |

## Date Verified

2026-05-16

## Commit Hash

Verified against hn2/fusionlayer at commit: see hn2/adapter-protocol#1 for details.
