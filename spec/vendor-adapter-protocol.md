# AI Adapter Protocol — Specification v1.0.0

**Protocol identifier:** `vendor-adapters/v1`
**Spec version:** `1.0.0`
**Status:** Stable

---

## 1. Overview

The AI Adapter Protocol (AAP) defines the canonical runtime boundary between a routing engine and an AI provider. An implementation that conforms to this spec exposes a uniform interface regardless of whether the underlying provider is a commercial API (Anthropic, OpenAI, Google …), a local model (Ollama), a federation layer (OpenRouter), or a bring-your-own adapter (`byo`).

The key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL in this document are to be interpreted as described in [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) and [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174).

---

## 2. Protocol Version

The current protocol version is **`1.0.0`**, identified by the string `vendor-adapters/v1`.

Adapters MUST declare conformance to a specific version. Engines MUST reject adapters that declare a protocol version with an incompatible major version.

---

## 3. Known Vendor IDs

Every adapter MUST declare a `vendorId` drawn from the following set of canonical identifiers:

| Vendor ID    | Provider                                  |
|--------------|-------------------------------------------|
| `anthropic`  | Anthropic (Claude models)                 |
| `openai`     | OpenAI (GPT models)                       |
| `google`     | Google DeepMind (Gemini models)           |
| `deepseek`   | DeepSeek                                  |
| `xai`        | xAI (Grok models)                         |
| `ollama`     | Ollama (local model runner)               |
| `openrouter` | OpenRouter (federation layer)             |
| `local`      | Any other local/self-hosted model         |
| `byo`        | Bring-your-own: caller-supplied adapter   |

Engines that encounter an unknown `vendorId` MUST reject the adapter at registration time with a descriptive error. This list is extended via the additive change process (see `GOVERNANCE.md` §2).

### 3.1 Vendor Aliases

The following alias strings are RECOMMENDED for use in human-facing configuration and MUST be canonicalized before adapter lookup. Aliases are never used as `vendorId` values.

| Alias      | Canonical vendor ID |
|------------|---------------------|
| `claude`   | `anthropic`         |
| `chatgpt`  | `openai`            |
| `gpt`      | `openai`            |
| `gemini`   | `google`            |
| `bard`     | `google`            |

---

## 4. Capabilities

An adapter MUST declare the capabilities it supports as an array of strings. Declared capabilities MUST be a subset of the following canonical capability flags:

| Capability          | Meaning                                                      |
|---------------------|--------------------------------------------------------------|
| `streaming`         | Adapter supports `stream()` — server-sent chunked output     |
| `tools`             | Adapter supports tool/function calling                       |
| `vision`            | Adapter accepts image inputs in message content              |
| `pdf`               | Adapter accepts PDF inputs in message content                |
| `reasoning_effort`  | Adapter honors the `reasoning` field on `AdapterRequest`     |
| `web_search`        | Adapter can execute server-side web search                   |
| `json_mode`         | Adapter supports structured output via `responseFormat`      |
| `cache_breakpoints` | Adapter supports prompt-caching / cache-control markers      |

Adapters MUST NOT declare capabilities they do not implement. Engines MUST use the capabilities manifest to gate feature routing and MUST NOT call `stream()` on an adapter that does not declare `streaming`.

An empty capabilities array is valid (the adapter can still serve basic text requests).

---

## 5. Interface Shape

### 5.1 VendorAdapter

```typescript
interface VendorAdapter {
  /** REQUIRED. Must be one of KNOWN_VENDORS. */
  vendorId: string

  /** REQUIRED. Subset of CAPABILITIES. May be empty. */
  capabilities: Capability[]

  /** REQUIRED. Execute a non-streaming request. */
  call(req: AdapterRequest): Promise<AdapterResponse>

  /**
   * OPTIONAL. Execute a streaming request.
   * MUST be present when capabilities includes "streaming".
   * MUST NOT be present (or MUST throw) when capabilities excludes "streaming".
   */
  stream?(req: AdapterRequest): AsyncIterable<AdapterChunk>

  /**
   * REQUIRED. Check that the adapter can reach the upstream provider.
   * MUST complete within 5 seconds.
   * MUST return { ok: false, latencyMs: <elapsed> } rather than throwing
   * when the upstream is unreachable.
   */
  healthCheck(): Promise<{ ok: boolean; latencyMs: number }>
}
```

### 5.2 AdapterRequest

```typescript
interface AdapterRequest {
  /** REQUIRED. Model identifier as understood by the upstream provider. */
  model: string

  /**
   * REQUIRED. Conversation messages. Each message has a `role` and `content`.
   * `content` is a plain string for text-only messages or an array of
   * content-block objects for multimodal messages.
   */
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'tool'
    content: string | object[]
  }>

  /** OPTIONAL. System-level instructions prepended before `messages`. */
  systemPrompt?: string

  /**
   * OPTIONAL. Sampling temperature in [0, 2].
   * Adapters SHOULD pass this through to the upstream.
   * Adapters MAY clamp to the upstream's supported range.
   */
  temperature?: number

  /** OPTIONAL. Maximum tokens to generate. */
  maxTokens?: number

  /**
   * OPTIONAL. Tool definitions. Only valid when adapter declares "tools".
   * Format follows the OpenAI tool schema convention.
   */
  tools?: object[]

  /**
   * OPTIONAL. Structured output format. Only valid when adapter declares
   * "json_mode". Follows the OpenAI response_format convention.
   */
  responseFormat?: object

  /**
   * OPTIONAL. Reasoning effort hint. Only valid when adapter declares
   * "reasoning_effort". Accepted values: "low" | "medium" | "high".
   */
  reasoning?: 'low' | 'medium' | 'high'

  /**
   * OPTIONAL. When true, the caller intends to consume via stream().
   * Engines SHOULD set this when routing to stream(); adapters MAY use it
   * to optimize upstream request parameters.
   */
  stream?: boolean

  /** REQUIRED. API key for the upstream provider. */
  apiKey: string
}
```

### 5.3 AdapterResponse

```typescript
interface AdapterResponse {
  /** REQUIRED. The generated text output. */
  content: string

  /**
   * REQUIRED. Model identifier as returned by the upstream.
   * MAY differ from AdapterRequest.model when the upstream normalizes it.
   */
  model: string

  /** REQUIRED. Token usage for billing and context-window tracking. */
  usage: {
    input_tokens: number
    output_tokens: number
  }

  /**
   * REQUIRED. Estimated cost in US dollars.
   * Adapters that cannot compute cost (e.g., local models) MUST return 0.
   */
  costUsd: number

  /**
   * OPTIONAL. Why generation stopped.
   * Recommended values: "end_turn" | "max_tokens" | "tool_use" | "stop_sequence" | "content_filtered"
   */
  stopReason?: string

  /**
   * OPTIONAL. Tool calls requested by the model.
   * Only present when stopReason is "tool_use".
   */
  toolCalls?: object[]
}
```

### 5.4 AdapterChunk (streaming events)

Adapters that declare `streaming` MUST yield a sequence of `AdapterChunk` objects via the `stream()` AsyncIterable. The sequence MUST end with exactly one chunk of `type: "done"`.

```typescript
type Capability =
  | 'streaming'
  | 'tools'
  | 'vision'
  | 'pdf'
  | 'reasoning_effort'
  | 'web_search'
  | 'json_mode'
  | 'cache_breakpoints'

interface AdapterChunk {
  /**
   * REQUIRED. Event type.
   * - "content"   — incremental text output
   * - "usage"     — token usage (typically emitted at stream end)
   * - "tool_call" — a tool invocation from the model
   * - "error"     — a normalized error event; stream MUST terminate after this
   * - "done"      — stream is complete; no further chunks will follow
   */
  type: 'content' | 'usage' | 'tool_call' | 'error' | 'done'

  /** Present when type="content". The incremental text delta. */
  delta?: string

  /** Present when type="usage". Token usage object. */
  usage?: {
    input_tokens: number
    output_tokens: number
  }

  /** Present when type="tool_call". The tool invocation. */
  toolCall?: object

  /** Present when type="error". */
  error?: {
    code: ErrorCode
    message: string
  }
}
```

---

## 6. Error Normalization

Adapters MUST NOT surface raw vendor exceptions to callers. All errors MUST be normalized to one of the following canonical error codes:

| Code                | HTTP status(es)         | Trigger condition                                      |
|---------------------|-------------------------|--------------------------------------------------------|
| `rate_limited`      | 429                     | Request throttled by upstream                          |
| `quota_exceeded`    | 402                     | Account has exceeded its quota or credit limit         |
| `invalid_api_key`   | 401, 403                | API key rejected or unauthorized                       |
| `invalid_request`   | 400 (other)             | Malformed request not covered by a more specific code  |
| `context_too_long`  | 400 (context/length)    | Prompt exceeds the model's context window              |
| `content_filtered`  | 400 (content/safety)    | Request or response blocked by content policy          |
| `upstream_timeout`  | ETIMEDOUT / AbortError  | Upstream did not respond within the allowed time       |
| `upstream_5xx`      | 500–599                 | Upstream server error                                  |
| `unknown`           | Any other               | Unclassified error                                     |

### 6.1 Normalization Rules

Adapters MUST apply the following rules in order:

1. HTTP 429 → `rate_limited`
2. HTTP 401 or 403 → `invalid_api_key`
3. HTTP 402 → `quota_exceeded`
4. HTTP 400 where the error message contains both "context" and "long" (case-insensitive) → `context_too_long`
5. HTTP 400 where the error message contains both "content" and "filter" (case-insensitive) → `content_filtered`
6. HTTP 400 (other) → `invalid_request`
7. HTTP 500–599 → `upstream_5xx`
8. `ETIMEDOUT` or `AbortError` → `upstream_timeout`
9. All other → `unknown`

Adapters SHOULD throw an `Error` with a `code` property set to the normalized error code string, so engine callers can distinguish error types reliably.

---

## 7. Adapter Validation

An adapter object is valid if and only if all of the following hold:

1. It is a non-null object.
2. `vendorId` is a string present in the `KNOWN_VENDORS` list.
3. `capabilities` is an array; every element is present in the `CAPABILITIES` list.
4. `call` is a function.
5. `healthCheck` is a function.
6. If `capabilities` includes `"streaming"`, then `stream` is a function.

Engines MUST validate adapters at registration time using these rules. Adapters that fail validation MUST be rejected with a descriptive error listing each failing rule.

---

## 8. Conformance Levels

Conformance is defined in `CONFORMANCE.md`. In summary:

- **L1 — Static shape:** `vendorId` is in `KNOWN_VENDORS`; `capabilities` is a valid subset; `call` and `healthCheck` are functions.
- **L2 — Harness:** Adapter passes the conformance harness with mocked upstream responses; all error codes are normalized correctly.
- **L3 — Live:** Adapter passes live conformance with real API keys against the actual upstream provider.

---

## 9. Versioning Policy

This spec follows [Semantic Versioning 2.0.0](https://semver.org).

- **MAJOR** — breaking changes: removing a required field, removing a known vendor ID, removing a capability, changing an error code value, changing normalization rules in a backward-incompatible way.
- **MINOR** — additive changes: new optional field, new known vendor ID, new capability flag, new error code, new alias.
- **PATCH** — editorial: typo, clarification, non-normative rewording.

Within a major version:
- No required field is removed.
- No vendor ID is removed from `KNOWN_VENDORS`.
- No capability is removed from `CAPABILITIES`.
- No error code is removed or repurposed.

These guarantees begin at v1.0.0. Pre-1.0 drafts may break compatibility on minor bumps.

---

## 10. Extension Points

Adapters MAY include additional properties beyond the required interface. Engines MUST ignore unknown properties on adapter objects to allow forward compatibility.

Capability flags introduced by third parties MUST use a reverse-domain prefix (e.g., `"com.mycompany.custom_cap"`). Unprefixed capability strings are reserved for this spec.

---

## 11. Changelog

See `CHANGELOG.md`.
