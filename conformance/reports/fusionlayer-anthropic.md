# Conformance Report — FusionLayer / Anthropic

> **Updated 2026-11-11 (#19 follow-up).** Re-verified by source inspection against hn2/fusionlayer main commit `6831e450226abf33f21ef1b6c985c8805776fdf4` (2026-11-10). The L2 mock-vendor harness was NOT re-run: it is CommonJS and the adapter is still an ES module reading `process.env.ANTHROPIC_API_KEY` directly, the same blocker as the 2026-05 report. `healthCheck` is confirmed exported (`anthropic.js:91`) and `capabilities` is now exported as an array (`anthropic.js:5`), resolving two of the deviations below; both are reflected in the tables.

## Adapter

**Adapter source location:** `packages/server/src/adapters/anthropic.js`
**Repository:** hn2/fusionlayer (private)
**AAP version conformed to:** v1.0.0
**Levels claimed:** L1

## Levels Passed

### L1 — Static Shape

The adapter exports `vendorId: "anthropic"`, `capabilities` (array), `call` (function), `stream` (function), and `healthCheck` (function).

| Check | Result | Notes |
|-------|--------|-------|
| vendorId in KNOWN\_VENDORS | PASS | `anthropic` |
| capabilities declared | PASS | exported as an array of strings, matching AAP's shape |
| call is a function | PASS | |
| healthCheck is a function | PASS | `anthropic.js:91` |
| stream is a function (streaming declared) | PASS | |

### L2 — Mock-Vendor Harness

L2 not claimed. The Anthropic adapter reads `ANTHROPIC_API_KEY` from `process.env` directly (not from `AdapterRequest.apiKey`), making it incompatible with the L2 harness which injects credentials via the request. Running the adapter through the harness would require environment variable injection — deferred to a follow-up.

## Known Deviations

| Deviation | Severity | Rationale |
|-----------|----------|-----------|
| API key from env var, not request | High | `call()` reads `process.env.ANTHROPIC_API_KEY` directly. AAP requires `apiKey` on `AdapterRequest`. Follow-up: hn2/fusionlayer — refactor to accept apiKey from request parameter. |
| `call()` signature is `{ modelName, messages, ... }` not `AdapterRequest` | Medium | Same as OpenRouter adapter. |
| No typed error codes (`err.code`) | Medium | Adapter throws raw `Error` with HTTP status in message. |
| Response uses `cost_usd` not `costUsd` | Low | Field name divergence. |
| `thinking` capability maps to `reasoning_effort` in AAP | Low | FusionLayer uses `thinking: true` where AAP specifies `reasoning_effort`. |

**Resolved since 2026-05:** `healthCheck()` is now implemented (`anthropic.js:91`); `capabilities` is now exported as an array, not an object.

## Date Verified

2026-11-11 (source inspection; L2 harness not re-run — see above)

## Previous Verification

2026-05-16

## Commit Hash

Engine commit: `6831e450226abf33f21ef1b6c985c8805776fdf4` (hn2/fusionlayer main, 2026-11-10). Previous verification: see hn2/adapter-protocol#1.
