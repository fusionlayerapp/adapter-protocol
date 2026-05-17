# Capability: `com.anthropic.cache_control`

**Owner:** Anthropic  
**Status:** experimental  
**Registered:** 2026-05-16  
**Schema:** [`com-anthropic-cache-control.schema.json`](com-anthropic-cache-control.schema.json)

## Semantics

When a vendor reports this capability, the adapter accepts cache-control markers on individual message content blocks. The marker instructs Anthropic's API to cache the prompt up to that point, reducing token costs and latency on repeated calls with the same prefix.

When a consumer requests this capability, it MAY attach a `cache_control` object to any content block in `AdapterRequest.messages[*].content[*]`:

```json
{
  "type": "text",
  "text": "You are a helpful assistant...",
  "cache_control": { "cache_type": "ephemeral" }
}
```

Adapters that implement `com.anthropic.cache_control` MUST forward these markers verbatim to the Anthropic Messages API. Adapters that do not implement this capability MUST strip or ignore `cache_control` fields rather than forwarding them (forwarding to non-Anthropic vendors causes request errors).

## Contract

- **Vendor reporting it:** adapter MUST pass `cache_control` objects through to the Anthropic API.
- **Consumer using it:** MUST check `capabilities.includes('cache_breakpoints')` (the `core.*` alias) before attaching markers.
- **Cache lifetime:** currently 5 minutes (ephemeral). Anthropic may add other tiers in future; that would require a new schema version.

## Reference

- [Anthropic prompt caching documentation](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
