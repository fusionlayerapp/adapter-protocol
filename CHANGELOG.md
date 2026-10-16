# AI Adapter Protocol Changelog

## v1.0.0 — 2026-05-09

### Added
- Full spec: `spec/vendor-adapter-protocol.md` — request/response/streaming/tool-call/error shapes
- JSON schemas for all protocol payload types: `schema/request.schema.json`, `schema/response.schema.json`, `schema/chunk.schema.json`, `schema/capabilities.schema.json`
- Conformance test vectors: `conformance/vectors/01–08` (valid) and `conformance/vectors/invalid/01–03` (negative)
- `GOVERNANCE.md` — change process, versioning gates, intellectual property
- `CONTRIBUTING.md` — contribution workflow and pull request requirements
- `SECURITY.md` — vulnerability reporting policy
- `CODE_OF_CONDUCT.md` — community conduct standard
- `CONFORMANCE.md` — L1/L2/L3 conformance level definitions

### Notes
- Extracted from `hn2/fusionlayer` engine internals (`packages/server/src/contracts/vendor-adapter-protocol.js`)
- Protocol has been in production inside the FusionLayer engine since 2025-Q4; this is the public freeze at v1.0.0
- Known vendors at freeze: `anthropic`, `openai`, `google`, `deepseek`, `xai`, `ollama`, `openrouter`, `local`, `byo`
- Capabilities at freeze: `streaming`, `tools`, `vision`, `pdf`, `reasoning_effort`, `web_search`, `json_mode`, `cache_breakpoints`
- Error codes at freeze: `rate_limited`, `quota_exceeded`, `invalid_api_key`, `invalid_request`, `context_too_long`, `content_filtered`, `upstream_timeout`, `upstream_5xx`, `unknown`
