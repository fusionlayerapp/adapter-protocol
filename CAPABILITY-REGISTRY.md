# Adapter Protocol Capability Registry

Canonical list of registered AAP capabilities. See [`GOVERNANCE.md` §8](GOVERNANCE.md#8-capability-namespace-governance) for registration rules, lifecycle states, and conflict-resolution policy.

To register a new capability, open a PR adding a row to this table along with a schema fragment at `capabilities/<reverse-domain-name>.schema.json`.

| Capability | Owner | Status | Schema | Spec link | Registered |
|---|---|---|---|---|---|
| `core.streaming` | AAP core | stable | (defined in core spec) | [spec/vendor-adapter-protocol.md#4-capabilities](spec/vendor-adapter-protocol.md) | 2026-05-09 |
| `core.tool_use` | AAP core | stable | (defined in core spec) | [spec/vendor-adapter-protocol.md#4-capabilities](spec/vendor-adapter-protocol.md) | 2026-05-09 |
| `core.vision` | AAP core | stable | (defined in core spec) | [spec/vendor-adapter-protocol.md#4-capabilities](spec/vendor-adapter-protocol.md) | 2026-05-09 |
| `core.json_mode` | AAP core | stable | (defined in core spec) | [spec/vendor-adapter-protocol.md#4-capabilities](spec/vendor-adapter-protocol.md) | 2026-05-09 |
| `com.anthropic.cache_control` | Anthropic | experimental | [capabilities/com-anthropic-cache-control.schema.json](capabilities/com-anthropic-cache-control.schema.json) | [capabilities/com-anthropic-cache-control.md](capabilities/com-anthropic-cache-control.md) | 2026-05-16 |

## Notes

- `core.*` entries are governed exclusively by the AAP spec change process (see `GOVERNANCE.md` §2). No external registration is accepted for this namespace.
- Vendor entries (`com.anthropic.*`, `com.openai.*`, etc.) are owned by the respective vendor. Adapter authors implementing those vendors may use them freely.
- `status: deprecated` entries remain in this table for historical reference but MUST NOT be emitted by new adapter implementations.
