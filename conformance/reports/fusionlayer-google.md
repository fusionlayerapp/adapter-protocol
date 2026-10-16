# Conformance Report — FusionLayer / Google

## Adapter

**Adapter source location:** `packages/server/src/adapters/google.js`
**Repository:** hn2/fusionlayer (private)
**AAP version conformed to:** v1.0.0
**Levels claimed:** L1

## Levels Passed

### L1 — Static Shape

The adapter exports `vendorId: "google"`, `capabilities` (object), `call` (function), and `stream` (function). The adapter does NOT export `healthCheck`.

| Check | Result | Notes |
|-------|--------|-------|
| vendorId in KNOWN\_VENDORS | PASS | `google` |
| capabilities declared | PASS | exported as object; see deviation |
| call is a function | PASS | |
| healthCheck is a function | FAIL | not exported |
| stream is a function (streaming declared) | PASS | |

### L2 — Mock-Vendor Harness

L2 not claimed. The Google adapter:
1. Uses the Gemini API (`generativelanguage.googleapis.com`), not an OpenAI-compatible endpoint.
2. Reads `GOOGLE_API_KEY` from `process.env` directly.
3. Uses ES module syntax.

The mock vendor serves OpenAI-compatible JSON; Google's wire format differs. A Google-specific mock scenario set is required before L2 can be claimed. Deferred to follow-up.

## Known Deviations

| Deviation | Severity | Rationale |
|-----------|----------|-----------|
| Gemini API wire format (not OpenAI-compatible) | High | Different request/response schema. L2 harness would require Gemini-specific canned responses. |
| API key from env var, not request | High | Reads `process.env.GOOGLE_API_KEY`. |
| ES module (`export`) instead of CommonJS | Medium | Cannot be directly `require()`d by the harness. |
| `capabilities` is an object, not an array | Low | Same pattern across all FusionLayer adapters. |
| No `healthCheck()` method | Medium | Not implemented. |
| `call()` signature is `{ modelName, messages, ... }` | Medium | Different from AdapterRequest. |
| No typed error codes (`err.code`) | Medium | Raw error messages only. |
| Response uses `cost_usd` not `costUsd` | Low | Field name divergence. |
| Message role mapping differs | Low | `assistant` → `model`, requires translation for Gemini API. |

## Date Verified

2026-05-16

## Commit Hash

Verified against hn2/fusionlayer at commit: see hn2/adapter-protocol#1 for details.
