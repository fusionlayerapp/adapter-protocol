# AI Adapter Protocol — Conformance

This document defines the three conformance levels for AAP v1.0.0, the checks required at each level, and how to run the conformance harness.

---

## Conformance Levels

### L1 — Static Shape

An adapter achieves L1 by satisfying all of the following static checks:

| # | Check |
|---|-------|
| 1 | `vendorId` is a non-empty string present in `KNOWN_VENDORS` |
| 2 | `capabilities` is an array |
| 3 | Every element of `capabilities` is present in `CAPABILITIES` (or uses a valid reverse-domain vendor prefix) |
| 4 | `call` is a function |
| 5 | `healthCheck` is a function |
| 6 | If `capabilities` includes `"streaming"`, then `stream` is a function |

L1 can be verified without running the adapter — it requires only object inspection.

---

### L2 — Harness

An adapter achieves L2 by passing L1 **and** all of the following behavioral checks using mocked upstream responses (no real API keys required):

| # | Check |
|---|-------|
| 7  | `call()` returns an `AdapterResponse` that validates against `schema/response.schema.json` |
| 8  | `call()` with a well-formed `AdapterRequest` does not throw a raw vendor exception |
| 9  | When the upstream returns HTTP 429, `call()` throws (or rejects) with `code: "rate_limited"` |
| 10 | When the upstream returns HTTP 401/403, `call()` throws with `code: "invalid_api_key"` |
| 11 | When the upstream returns HTTP 402, `call()` throws with `code: "quota_exceeded"` |
| 12 | When the upstream returns HTTP 400 with a context-length message, `call()` throws with `code: "context_too_long"` |
| 13 | When the upstream returns HTTP 400 with a content-filter message, `call()` throws with `code: "content_filtered"` |
| 14 | When the upstream returns HTTP 500, `call()` throws with `code: "upstream_5xx"` |
| 15 | When the upstream times out, `call()` throws with `code: "upstream_timeout"` |
| 16 | If `capabilities` includes `"streaming"`, `stream()` yields a sequence ending with `{ type: "done" }` |
| 17 | `healthCheck()` returns `{ ok: boolean, latencyMs: number }` within 5 seconds |

Adapters SHOULD provide mock fixtures or a test mode that allows the harness to simulate each upstream failure condition.

---

### L3 — Live

An adapter achieves L3 by passing L2 **and** all of the following live checks against the real upstream provider:

| # | Check |
|---|-------|
| 18 | `healthCheck()` returns `{ ok: true, latencyMs: N }` with real credentials |
| 19 | `call()` with a minimal probe request returns a valid `AdapterResponse` |
| 20 | If `capabilities` includes `"streaming"`, `stream()` yields at least one `content` chunk followed by `done` |
| 21 | `usage.input_tokens` and `usage.output_tokens` are positive integers |
| 22 | `costUsd` is a non-negative number |

L3 conformance requires valid API credentials for the target vendor and network access to the upstream. L3 certificates are issued per-vendor and per-adapter-version.

---

## Conformance Test Vectors

The `conformance/vectors/` directory contains JSON test vectors paired with schema identifiers:

| Vector file | Schema | Valid? | Purpose |
|-------------|--------|--------|---------|
| `01-minimal-call.json` | request | Yes | Minimal valid request |
| `02-with-tools.json` | request | Yes | Request with tools |
| `03-with-system-prompt.json` | request | Yes | Request with systemPrompt |
| `04-streaming-request.json` | request | Yes | Request with stream: true |
| `05-response-with-tool-calls.json` | response | Yes | Response with toolCalls |
| `06-streaming-chunk-content.json` | chunk | Yes | Content delta chunk |
| `07-streaming-chunk-usage.json` | chunk | Yes | Usage chunk |
| `08-streaming-chunk-done.json` | chunk | Yes | Stream terminator |
| `invalid/01-missing-model.json` | request | No | Missing required field |
| `invalid/02-unknown-capability.json` | capabilities | No | Unknown capability string |
| `invalid/03-missing-content.json` | request | No | Message missing content |

---

## Running the Harness

```sh
# Install dependencies (Ajv 2020-12)
npm install

# Validate all vectors against schemas (L1 static check)
node conformance/validate.js

# Run with an adapter implementation for L2 checks
node conformance/validate.js --impl ./my-adapter.js
```

The `--impl` module MUST export:

```js
// my-adapter.js
export const adapter = {
  vendorId: 'openai',
  capabilities: ['streaming', 'tools'],
  async call(req) { /* ... */ },
  async *stream(req) { /* ... */ },
  async healthCheck() { /* ... */ },
}
```

---

## Claiming Conformance

To claim L1 or L2 conformance publicly, open an issue in this repository with:

1. Your adapter name and version.
2. A link to the public source or package.
3. The output of `node conformance/validate.js --impl ./your-adapter.js`.
4. For L2: mock test output demonstrating error normalization.

The steward will add your adapter to the conformance registry in `README.md`.
