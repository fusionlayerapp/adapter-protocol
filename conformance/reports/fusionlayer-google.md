# Conformance Report — FusionLayer / Google

> **Updated 2026-11-11 (#19 follow-up).** Re-verified by source inspection against hn2/fusionlayer main commit `6831e450226abf33f21ef1b6c985c8805776fdf4` (2026-11-10). The L2 mock-vendor harness was NOT re-run: the Gemini wire format is still not OpenAI-compatible and the adapter still reads `process.env.GOOGLE_API_KEY` directly, the same blockers as the 2026-05 report. `healthCheck` is confirmed exported (`google.js:101`) and `capabilities` is now exported as an array (`google.js:5`), resolving two of the deviations below; both are reflected in the tables.

## Adapter

**Adapter source location:** `packages/server/src/adapters/google.js`
**Repository:** hn2/fusionlayer (private)
**AAP version conformed to:** v1.0.0
**Levels claimed:** L1

## Levels Passed

### L1 — Static Shape

The adapter exports `vendorId: "google"`, `capabilities` (array), `call` (function), `stream` (function), and `healthCheck` (function).

| Check | Result | Notes |
|-------|--------|-------|
| vendorId in KNOWN\_VENDORS | PASS | `google` |
| capabilities declared | PASS | exported as an array of strings, matching AAP's shape |
| call is a function | PASS | |
| healthCheck is a function | PASS | `google.js:101` |
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
| `call()` signature is `{ modelName, messages, ... }` | Medium | Different from AdapterRequest. |
| No typed error codes (`err.code`) | Medium | Raw error messages only. |
| Response uses `cost_usd` not `costUsd` | Low | Field name divergence. |
| Message role mapping differs | Low | `assistant` → `model`, requires translation for Gemini API. |

**Resolved since 2026-05:** `healthCheck()` is now implemented (`google.js:101`); `capabilities` is now exported as an array, not an object.

## Date Verified

2026-11-11 (source inspection; L2 harness not re-run — see above)

## Previous Verification

2026-05-16

## Commit Hash

Engine commit: `6831e450226abf33f21ef1b6c985c8805776fdf4` (hn2/fusionlayer main, 2026-11-10). Previous verification: see hn2/adapter-protocol#1.
