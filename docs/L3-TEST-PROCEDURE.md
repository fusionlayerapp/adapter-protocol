# L3 Live-API Test Procedure

**Issue:** hn2/adapter-protocol#8  
**Status:** Normative

---

## Overview

L3 conformance tests verify adapters against real vendor APIs. They are not run in CI by default because they consume API credits and require secrets. Run them manually before adapter releases or with a dedicated CI job that has secrets access.

---

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Node.js ≥ 18 | ESM support required |
| `npm ci` run from repo root | `ajv`, `ajv-formats` in `node_modules` |
| Valid API key for target vendor | Set as environment variable (see per-adapter section below) |
| Outbound HTTPS access | Required — L3 makes real API calls |

---

## Running L3 Tests

```bash
# Single adapter
node conformance/harness/l3.js --adapter anthropic --api-key $ANTHROPIC_API_KEY

# With streaming test included
node conformance/harness/l3.js --adapter openai --api-key $OPENAI_API_KEY --include-streaming

# Dry-run (validate request/response shape, no API call)
node conformance/harness/l3.js --adapter google --dry-run
```

### Output format

```json
{
  "adapter": "anthropic",
  "level": "L3",
  "tests_run": 8,
  "tests_passed": 8,
  "latency_p50_ms": 450,
  "latency_p95_ms": 1200,
  "cost_estimate_usd": 0.002,
  "failures": []
}
```

Exit code 0 = all L3 tests passed. Exit code 1 = one or more failures.

---

## Adapter Procedures

### Anthropic (`anthropic`)

**Environment variable:** `ANTHROPIC_API_KEY`

**Test cases (8):**

| Test | Description | Expected |
|------|-------------|----------|
| L3-A-01 | Minimal call — single `user` message | `200`, `content[].type = text` |
| L3-A-02 | Multi-turn conversation | `200`, assistant responds in context |
| L3-A-03 | Tool use — single tool definition, tool call expected | `200`, `stop_reason = tool_use` |
| L3-A-04 | Streaming — check SSE events arrive in order | SSE stream opens, closes cleanly |
| L3-A-05 | Cache breakpoints — system prompt cached on second call | `cache_read_input_tokens > 0` on call 2 |
| L3-A-06 | Extended thinking — `thinking` block in response | `200`, `content[].type = thinking` |
| L3-A-07 | Vision — image content block | `200`, assistant describes image |
| L3-A-08 | PDF content block | `200`, assistant reads PDF text |

**Cost estimate:** ~$0.002 per run using claude-haiku-3-5.

**Known issues:** Cache breakpoint tests require two consecutive calls against the same API key. Use a model that supports prompt caching (`claude-haiku-3-5` or newer).

---

### OpenAI (`openai`)

**Environment variable:** `OPENAI_API_KEY`

**Test cases (7):**

| Test | Description | Expected |
|------|-------------|----------|
| L3-O-01 | Minimal call | `200`, `choices[0].message.role = assistant` |
| L3-O-02 | Multi-turn conversation | `200`, assistant responds in context |
| L3-O-03 | Tool use — function call | `200`, `choices[0].finish_reason = tool_calls` |
| L3-O-04 | Streaming | SSE stream opens and closes with `[DONE]` |
| L3-O-05 | Vision — image URL | `200`, assistant describes image |
| L3-O-06 | JSON mode — `response_format: {type: json_object}` | `200`, response is valid JSON |
| L3-O-07 | Web search (Responses API) | `200`, `output[].type = web_search_call` |

**Cost estimate:** ~$0.001 per run using `gpt-4o-mini`.

**Notes:** L3-O-07 requires a model that supports web search (`gpt-4o-search-preview` or `gpt-4o`).

---

### Google (`google`)

**Environment variable:** `GOOGLE_API_KEY`

**Test cases (6):**

| Test | Description | Expected |
|------|-------------|----------|
| L3-G-01 | Minimal call | `200`, `candidates[0].content.parts[0].text` present |
| L3-G-02 | Multi-turn via `contents` array | `200`, assistant responds in context |
| L3-G-03 | Tool use — `tools` array | `200`, `functionCall` in response |
| L3-G-04 | Streaming | Server-sent events stream opens and closes |
| L3-G-05 | Vision — inline base64 image | `200`, assistant describes image |
| L3-G-06 | JSON mode — `responseMimeType: application/json` | `200`, response is valid JSON |

**Cost estimate:** ~$0.0005 per run using `gemini-2.0-flash`.

---

### OpenRouter (`openrouter`)

**Environment variable:** `OPENROUTER_API_KEY`

**Test cases (5):**

| Test | Description | Expected |
|------|-------------|----------|
| L3-R-01 | Minimal call via OpenAI-compatible endpoint | `200`, `choices[0].message.role = assistant` |
| L3-R-02 | Multi-turn conversation | `200`, assistant responds in context |
| L3-R-03 | Tool use | `200`, `choices[0].finish_reason = tool_calls` |
| L3-R-04 | Streaming | SSE stream opens and closes with `[DONE]` |
| L3-R-05 | Vision — image in messages | `200`, assistant describes image |

**Cost estimate:** ~$0.001 per run using `google/gemini-flash-1.5`.

**Notes:** OpenRouter proxies multiple vendors. Use the `X-OR-Custom-Header: fusionlayer-conformance` header in test calls to enable request tracing in OpenRouter dashboard.

---

## Failure Classification

| Exit Code | Category | Action |
|-----------|----------|--------|
| `AUTH_FAILED` | API key invalid or expired | Rotate key, re-run |
| `RATE_LIMITED` | Too many requests | Wait 60s, re-run with `--delay 2000` |
| `RESPONSE_SHAPE_MISMATCH` | Adapter parses response incorrectly | File a bug against the adapter |
| `LATENCY_EXCEEDED` | P95 > 5000ms | Investigate network, retry |
| `STREAMING_INCOMPLETE` | Stream closed without `[DONE]` | Check adapter stream termination logic |

---

## CI Integration (Optional)

To run L3 in CI with GitHub Actions, create a workflow with secrets:

```yaml
- name: Run L3 conformance (Anthropic)
  env:
    ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
  run: node conformance/harness/l3.js --adapter anthropic --api-key $ANTHROPIC_API_KEY
```

Recommended: run L3 only on release branches or on a scheduled weekly job, not on every PR.

---

## Conformance Registry

When an adapter passes all L3 tests, update `CONFORMANCE-REGISTRY.md`:

```markdown
| adapter-name | L3 | YYYY-MM-DD | vX.Y.Z |
```

L3 conformance is valid for 90 days or until the vendor changes their API schema.
