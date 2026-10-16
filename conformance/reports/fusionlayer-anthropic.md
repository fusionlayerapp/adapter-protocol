# Conformance Report — FusionLayer / Anthropic

## Adapter

**Adapter source location:** `packages/server/src/adapters/anthropic.js`
**Repository:** hn2/fusionlayer (private)
**AAP version conformed to:** v1.0.0
**Levels claimed:** L1

## Levels Passed

### L1 — Static Shape

The adapter exports `vendorId: "anthropic"`, `capabilities` (object), `call` (function), and `stream` (function). The adapter does NOT export `healthCheck`.

| Check | Result | Notes |
|-------|--------|-------|
| vendorId in KNOWN\_VENDORS | PASS | `anthropic` |
| capabilities declared | PASS | exported as object; see deviation |
| call is a function | PASS | |
| healthCheck is a function | FAIL | not exported |
| stream is a function (streaming declared) | PASS | |

### L2 — Mock-Vendor Harness

L2 not claimed. The Anthropic adapter reads `ANTHROPIC_API_KEY` from `process.env` directly (not from `AdapterRequest.apiKey`), making it incompatible with the L2 harness which injects credentials via the request. Running the adapter through the harness would require environment variable injection — deferred to a follow-up.

## Known Deviations

| Deviation | Severity | Rationale |
|-----------|----------|-----------|
| API key from env var, not request | High | `call()` reads `process.env.ANTHROPIC_API_KEY` directly. AAP requires `apiKey` on `AdapterRequest`. Follow-up: hn2/fusionlayer — refactor to accept apiKey from request parameter. |
| `capabilities` is an object, not an array | Low | Same as OpenRouter adapter. |
| No `healthCheck()` method | Medium | Not implemented. |
| `call()` signature is `{ modelName, messages, ... }` not `AdapterRequest` | Medium | Same as OpenRouter adapter. |
| No typed error codes (`err.code`) | Medium | Adapter throws raw `Error` with HTTP status in message. |
| Response uses `cost_usd` not `costUsd` | Low | Field name divergence. |
| `thinking` capability maps to `reasoning_effort` in AAP | Low | FusionLayer uses `thinking: true` where AAP specifies `reasoning_effort`. |

## Date Verified

2026-05-16

## Commit Hash

Verified against hn2/fusionlayer at commit: see hn2/adapter-protocol#1 for details.
