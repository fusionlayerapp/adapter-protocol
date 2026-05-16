# AI Adapter Protocol (AAP)

> **Status:** v1.0.0 — stable. Extracted from [hn2/fusionlayer](https://github.com/hn2/fusionlayer) and frozen here as the public spec.

The AI Adapter Protocol is an open specification for normalizing AI provider APIs — commercial vendors, local models, federation layers, and bring-your-own adapters — into a single canonical request/response shape. It enables tools to route across providers without per-vendor code, and lets implementers self-certify conformance.

---

## Why AAP

- **One shape** for OpenAI, Anthropic, Google, xAI, DeepSeek, Ollama, OpenRouter, and custom adapters.
- **Capability manifest** so routers know what each provider supports before making a call.
- **Normalized error taxonomy** — no more raw vendor exceptions leaking through abstraction layers.
- **Versioned with a conformance harness** — three levels (L1 static, L2 mocked, L3 live).

---

## Quick Start: Implementing a Conforming Adapter

A conforming adapter is a JavaScript/TypeScript object (or module default export) that satisfies the `VendorAdapter` interface:

```js
// my-openai-adapter.js
import { VENDOR_ADAPTER_PROTOCOL_VERSION } from './protocol-constants.js'

export const adapter = {
  vendorId: 'openai',
  capabilities: ['streaming', 'tools', 'vision', 'json_mode'],

  async call(req) {
    // req: AdapterRequest — see spec/vendor-adapter-protocol.md §5.2
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${req.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: req.model,
        messages: req.messages,
        temperature: req.temperature,
        max_tokens: req.maxTokens,
        tools: req.tools,
      }),
    })

    if (!res.ok) {
      throw normalizeUpstreamError(res.status, await res.json())
    }

    const data = await res.json()

    // Return AdapterResponse — see spec §5.3
    return {
      content: data.choices[0].message.content ?? '',
      model: data.model,
      usage: {
        input_tokens: data.usage.prompt_tokens,
        output_tokens: data.usage.completion_tokens,
      },
      costUsd: computeCost(data.model, data.usage),
      stopReason: data.choices[0].finish_reason,
      toolCalls: data.choices[0].message.tool_calls,
    }
  },

  async *stream(req) {
    // Must yield AdapterChunk objects — see spec §5.4
    // ... implementation omitted for brevity ...
    yield { type: 'content', delta: 'Hello' }
    yield { type: 'usage', usage: { input_tokens: 10, output_tokens: 5 } }
    yield { type: 'done' }
  },

  async healthCheck() {
    const start = Date.now()
    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      })
      return { ok: res.ok, latencyMs: Date.now() - start }
    } catch {
      return { ok: false, latencyMs: Date.now() - start }
    }
  },
}

function normalizeUpstreamError(status, body) {
  // Adapters MUST normalize to AAP error codes — see spec §6
  const err = new Error(body?.error?.message ?? 'upstream error')
  if (status === 429) err.code = 'rate_limited'
  else if (status === 401 || status === 403) err.code = 'invalid_api_key'
  else if (status === 402) err.code = 'quota_exceeded'
  else if (status >= 500) err.code = 'upstream_5xx'
  else err.code = 'invalid_request'
  return err
}
```

---

## Spec

| Document | Contents |
|----------|----------|
| [`spec/vendor-adapter-protocol.md`](spec/vendor-adapter-protocol.md) | Full normative spec: vendor IDs, capabilities, interfaces, error normalization, versioning |
| [`CONFORMANCE.md`](CONFORMANCE.md) | L1/L2/L3 conformance levels and how to claim them |
| [`GOVERNANCE.md`](GOVERNANCE.md) | Change process, versioning policy, IP |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | How to contribute |
| [`CHANGELOG.md`](CHANGELOG.md) | Version history |

## Schemas

JSON Schema 2020-12 definitions for all protocol payload types:

| Schema | Validates |
|--------|-----------|
| [`schema/request.schema.json`](schema/request.schema.json) | `AdapterRequest` |
| [`schema/response.schema.json`](schema/response.schema.json) | `AdapterResponse` |
| [`schema/chunk.schema.json`](schema/chunk.schema.json) | `AdapterChunk` (streaming event) |
| [`schema/capabilities.schema.json`](schema/capabilities.schema.json) | Capabilities manifest array |

## Test Vectors

`conformance/vectors/` contains 8 valid vectors and 3 invalid vectors. Use them to verify that your schemas and adapter implementation handle all cases correctly.

## Run L2 Conformance

```bash
# Run L1 static schema validation (no adapter needed)
node conformance/validate.js

# Run L2 mock-vendor harness with the built-in reference adapter
node conformance/validate.js --l2

# Run L2 against your own adapter (must export createAdapter({ baseURL, apiKey }))
node conformance/validate.js --l2 --adapter ./path/to/my-adapter.js
```

---

## Known Vendors

`anthropic` · `openai` · `google` · `deepseek` · `xai` · `ollama` · `openrouter` · `local` · `byo`

## Capabilities

`streaming` · `tools` · `vision` · `pdf` · `reasoning_effort` · `web_search` · `json_mode` · `cache_breakpoints`

## Error Codes

`rate_limited` · `quota_exceeded` · `invalid_api_key` · `invalid_request` · `context_too_long` · `content_filtered` · `upstream_timeout` · `upstream_5xx` · `unknown`

---

## Conformance Registry

| Adapter | Version | Level | Link |
|---------|---------|-------|------|
| — | — | — | — |

To register your adapter, see [`CONFORMANCE.md`](CONFORMANCE.md).

---

## Related

- [hn2/uacp](https://github.com/hn2/uacp) — Unified AI Context Protocol (conversation portability)

## License

Spec text: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
Schemas, test vectors, reference code: [MIT](LICENSE)
