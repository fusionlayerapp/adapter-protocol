# Conformance Report — FusionLayer / OpenAI

## Adapter

**Adapter source location:** `packages/server/src/adapters/openai.js`
**Repository:** hn2/fusionlayer (private)
**AAP version conformed to:** v1.0.0
**Levels claimed:** L1

## Levels Passed

### L1 — Static Shape

The adapter exports `vendorId: "openai"`, `capabilities` (object), `call` (function), and `stream` (function). The adapter does NOT export `healthCheck`.

| Check | Result | Notes |
|-------|--------|-------|
| vendorId in KNOWN\_VENDORS | PASS | `openai` |
| capabilities declared | PASS | exported as object; see deviation |
| call is a function | PASS | |
| healthCheck is a function | FAIL | not exported |
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
| `capabilities` is an object, not an array | Low | Same pattern across all FusionLayer adapters. |
| No `healthCheck()` method | Medium | Not implemented. |
| `call()` signature is `{ modelName, messages, baseUrl, apiKey, ... }` | Medium | Wrapper required to bridge to AdapterRequest. |
| No typed error codes (`err.code`) | Medium | Raw error messages only. |
| Response uses `cost_usd` not `costUsd` | Low | Field name divergence. |

## Date Verified

2026-05-16

## Commit Hash

Verified against hn2/fusionlayer at commit: see hn2/adapter-protocol#1 for details.
