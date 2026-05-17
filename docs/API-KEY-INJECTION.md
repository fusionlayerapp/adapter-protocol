# API Key Injection Standard

This document defines how AAP-conformant adapters MUST read and handle API keys. The goal is to prevent keys from appearing in logs, stack traces, or request parameters.

---

## Standard

### Production mode (default)

Adapters MUST read API keys exclusively from environment variables. They MUST NOT accept an API key as a function parameter, constructor argument, or request-body field in production mode.

Environment variable mapping by vendor:

| Vendor ID | Environment Variable |
|-----------|---------------------|
| `anthropic` | `ANTHROPIC_API_KEY` |
| `openai` | `OPENAI_API_KEY` |
| `google` | `GOOGLE_API_KEY` |
| `openrouter` | `OPENROUTER_API_KEY` |
| `deepseek` | `DEEPSEEK_API_KEY` |
| `xai` | `XAI_API_KEY` |
| `ollama` | _(no key required)_ |

Adapters MUST re-read the environment variable on each instantiation. Keys MUST NOT be cached at module load time, because that would prevent key rotation without a process restart.

### Test mode

When `_testMode: true` is explicitly set in the adapter configuration (or when `process.env.ADAPTER_TEST_MODE === '1'`), adapters MAY accept an `apiKey` option:

```javascript
// Test/development only
const adapter = createAdapter('anthropic', { apiKey: 'sk-test-...', _testMode: true })
```

`_testMode` MUST be `false` or absent in production. Adapters MUST throw `ApiKeyInjectionError` if `apiKey` is provided as a parameter without `_testMode: true`.

---

## Error Types

### `ApiKeyMissingError`

Thrown when the environment variable for the vendor is not set and no test-mode key is provided.

```
API key not configured — set ANTHROPIC_API_KEY in the environment
```

The error message MUST name the missing environment variable. It MUST NOT include partial key values or secrets.

### `ApiKeyInjectionError`

Thrown when a caller attempts to provide an API key as a parameter in production mode.

```
API keys must be provided via environment variables in production mode
```

The error message MUST NOT include the key value. It MUST NOT log the key at any severity level.

---

## Rationale

- **Keys in parameters leak into logs** — function call traces, error messages, and distributed tracing systems routinely capture arguments. Environment variables are excluded from these by default.
- **Environment variables support rotation** — operators can update the value without a code change. Module-level caching defeats rotation; per-instantiation reads support it.
- **`_testMode` escape hatch** — test suites cannot inject real environment variables reliably across all CI environments. The `_testMode` flag provides a controlled, explicit escape hatch that is structurally impossible to enable accidentally in production (it requires a deliberate option, not a default).

---

## Implementation Checklist

- [ ] Read key from `process.env[ENV_VAR_MAP[vendorId]]` inside the adapter factory, not at module top level.
- [ ] If key is absent and `_testMode` is false: throw `ApiKeyMissingError` with the env var name.
- [ ] If `apiKey` option is present and `_testMode` is false: throw `ApiKeyInjectionError` — never log the key value.
- [ ] If `_testMode` is true: accept `apiKey` option and skip env var lookup.
- [ ] `ollama` adapter: skip key lookup entirely (empty-string env var mapping signals no key required).
