# AI Adapter Protocol (AAP)

> **Status:** pre-1.0 draft. Spec authored inside [hn2/fusionlayer](https://github.com/hn2/fusionlayer); this repo is the public-flip target.

The AI Adapter Protocol is an open specification for normalizing AI provider APIs (vendor, local, federated, framework) into a single canonical shape. It enables tools like FusionLayer to route across providers without per-vendor code, and lets providers self-certify conformance.

## Goals

- One request/response shape across OpenAI, Anthropic, Google, OpenRouter, Mistral, local models, frameworks
- Capability declaration manifest (streaming, tool-call, vision, JSON mode, reasoning, web-search, …)
- Error taxonomy: `rate_limit | content_policy | transient | fatal | malformed`
- Streaming event schema, tool-call schema, usage/cost schema
- Versioned with deprecation policy
- Conformance test harness + golden vectors

## Why "AI Adapter" not "Vendor Adapter"

The spec covers any AI provider — commercial vendor, self-hosted local model, framework wrapper (LiteLLM, OpenRouter), federated provider. "Vendor" was too narrow. Renamed for inclusivity at v1.0.

## Status

- v0.x — drafting inside hn2/fusionlayer, consumed only by the engine
- v1.0 — public flip target (this repo), Apache 2.0
- v1.x+ — community PRs, conformance certification

## Related

- [hn2/uacp](https://github.com/hn2/uacp) — Unified AI Context Protocol
- [hn2/flp](https://github.com/hn2/flp) — FusionLayer Primitives

## License

Apache 2.0 (planned for public flip).
