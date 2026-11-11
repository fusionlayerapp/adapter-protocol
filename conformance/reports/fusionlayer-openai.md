# Conformance Report — FusionLayer / OpenAI

> **Updated 2026-11-11 (#19 follow-up).** Re-verified by source inspection against hn2/fusionlayer main commit `6831e450226abf33f21ef1b6c985c8805776fdf4` (2026-11-10). The L2 mock-vendor harness was NOT re-run: the adapter is still an ES module with a `call()` signature that differs from `AdapterRequest`, the same blockers as the 2026-05 report. `healthCheck` is confirmed exported (`openai.js:84`) and `capabilities` is now exported as an array (`openai.js:5`), resolving two of the deviations below; both are reflected in the tables.

## Adapter

**Adapter source location:** `packages/server/src/adapters/openai.js`
**Repository:** hn2/fusionlayer (private)
**AAP version conformed to:** v1.0.0
**Levels claimed:** L1

## Levels Passed

### L1 — Static Shape

The adapter exports `vendorId: "openai"`, `capabilities` (array), `call` (function), `stream` (function), and `healthCheck` (function).

| Check | Result | Notes |
|-------|--------|-------|
| vendorId in KNOWN\_VENDORS | PASS | `openai` |
| capabilities declared | PASS | exported as an array of strings, matching AAP's shape |
| call is a function | PASS | |
| healthCheck is a function | PASS | `openai.js:84` |
| stream is a function (streaming declared) | PASS | |

### L2 — Mock-Vendor Harness

L2 via protocol compatibility. The OpenAI adapter uses the standard OpenAI-compatible wire format; the L2 reference adapter (built into this harness) implements the same protocol and passes all 10 scenarios. However, the FusionLayer `openai.js` adapter cannot be directly loaded by the harness because:
1. It uses ES module syntax (`export`) — the harness is CommonJS.
2. The `call()` signature differs from `AdapterRequest`.

A wrapped CommonJS adapter shim would enable direct L2 harness testing. Deferred to follow-up.

## Known Deviations

| Deviation | Severity | Rationale |
|-----------|----------|-----------|
| ES module (`export`) instead of CommonJS | Medium | Adapter cannot be directly `require()`d by the harness. Shim needed. |
| `call()` signature is `{ modelName, messages, baseUrl, apiKey, ... }` | Medium | Wrapper required to bridge to AdapterRequest. |
| No typed error codes (`err.code`) | Medium | Raw error messages only. |
| Response uses `cost_usd` not `costUsd` | Low | Field name divergence. |

**Resolved since 2026-05:** `healthCheck()` is now implemented (`openai.js:84`); `capabilities` is now exported as an array, not an object.

## Date Verified

2026-11-11 (source inspection; L2 harness not re-run — see above)

## Previous Verification

2026-05-16

## Commit Hash

Engine commit: `6831e450226abf33f21ef1b6c985c8805776fdf4` (hn2/fusionlayer main, 2026-11-10). Previous verification: see hn2/adapter-protocol#1.
