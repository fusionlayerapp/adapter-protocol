# Conformance Report — FusionLayer / Google

## Adapter

**Adapter source location:** `packages/server/src/adapters/google.js`
**Repository:** hn2/fusionlayer (private)
**AAP version conformed to:** v1.0.0
**Levels claimed:** L1
**Engine commit:** `7141f6c2478c43252f821a4e433406a2f52671a5`

## Levels Passed

### L1 — Static Shape

| Check | Result | Notes |
|-------|--------|-------|
| vendorId in KNOWN_VENDORS | PASS | `google` |
| capabilities declared | PASS | exported as array |
| call is a function | PASS |  |
| healthCheck is a function | PASS | exported |
| stream is a function (streaming declared) | PASS |  |

### L2 — Mock-Vendor Harness

L2 not claimed: the adapter does not accept `apiKey` on the request, which the harness uses to inject credentials.

## Known Deviations

| Deviation | Severity | Rationale |
|-----------|----------|-----------|
| API key from env var, not request | High | `call()` takes `{ modelName, messages, temperature, maxTokens, startedAt, extra }`; it has no `apiKey` field, so it reads the key from the environment. AAP requires `apiKey` on `AdapterRequest`. |
| `call()` signature is `{ modelName, messages, ... }` not `AdapterRequest` | Medium | Field names differ from the AAP request shape. |
| No typed error codes (`err.code`) verified | Medium | Not checked by this static report; no claim is made. |

## Date Verified

2026-11-08

## Commit Hash

Verified against hn2/fusionlayer at commit `7141f6c2478c43252f821a4e433406a2f52671a5` with `conformance/tools/generate-engine-report.mjs`.
