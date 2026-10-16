# Capability Namespace Governance

This document defines the prefix conventions for AAP capability identifiers and how collisions are resolved. For the canonical capability list see [`CAPABILITY-REGISTRY.md`](../CAPABILITY-REGISTRY.md). For full governance rules see [`GOVERNANCE.md` §8](../GOVERNANCE.md#8-capability-namespace-governance).

---

## Prefixes

### `fl:` — FusionLayer-official capabilities

Reserved for capabilities defined by the FusionLayer team as part of the AAP core specification. These map 1:1 to the `core.*` entries in the registry.

Examples:
- `fl:streaming` — adapter supports server-sent chunked output via `stream()`
- `fl:tool-calling` — adapter supports tool/function calling
- `fl:json-mode` — adapter supports structured output via `responseFormat`
- `fl:vision` — adapter accepts image inputs in message content

New `fl:` capabilities require a spec change (additive or breaking, per `GOVERNANCE.md` §2). No external contributor may claim this prefix.

### `vendor:` — Vendor-specific capabilities

Capabilities that are meaningful only for a specific AI provider. The format is `vendor:<vendor-id>:<feature>`, where `<vendor-id>` is the canonical AAP vendor identifier (see spec §3).

Examples:
- `vendor:openai:json-mode` — OpenAI-specific JSON mode (distinct from `fl:json-mode`)
- `vendor:anthropic:extended-thinking` — Anthropic extended thinking / chain-of-thought tokens

Adapter authors implementing the named vendor MAY use these names freely. Authors from other organizations MUST NOT claim another vendor's prefix.

### `custom:` — Operator/user-defined capabilities

Capabilities defined by operators deploying AAP-conformant engines or by end users extending their adapter implementations. The format is `custom:<reverse-domain>:<feature>`.

Examples:
- `custom:com.acme:audit-logging`
- `custom:io.myapp:response-grounding`

Custom capabilities MUST be registered in `CAPABILITY-REGISTRY.md` before use in production. See `GOVERNANCE.md` §8.2 for the registration process.

---

## Collision Resolution

When multiple capabilities share overlapping semantics, the following precedence applies (highest to lowest):

1. **`fl:` (official)** — always wins. If a `fl:` capability covers the same semantics as a `vendor:` or `custom:` entry, the non-`fl:` entry is deprecated.
2. **`vendor:` (vendor-specific)** — takes precedence over `custom:` entries with the same semantics. Vendors own their namespace.
3. **`custom:` (operator/user)** — lowest precedence. First-registered wins among `custom:` entries; duplicate registrations are rejected.

In practice: if you register `custom:com.acme:streaming` and AAP later ships `fl:streaming`, your entry is automatically deprecated and consumers SHOULD migrate to `fl:streaming`.

---

## Registry

The machine-readable registry is at [`conformance/capability-registry.json`](../conformance/capability-registry.json). Each entry has:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Full capability identifier (e.g., `fl:streaming`) |
| `prefix` | string | One of `fl`, `vendor`, `custom` |
| `description` | string | Human-readable summary |
| `supported_by` | string[] | Canonical vendor IDs that implement this capability |
| `status` | string | `draft`, `experimental`, `stable`, or `deprecated` |
