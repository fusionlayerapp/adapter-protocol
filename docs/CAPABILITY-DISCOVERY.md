# Capability Discovery

This document specifies how adapters expose their capabilities and how engines discover those capabilities at runtime.

---

## Adapter Capability Export

Every conforming adapter MUST export a `capabilities` property that is an array of capability strings drawn from the AAP capability registry (see [`CAPABILITY-REGISTRY.md`](../CAPABILITY-REGISTRY.md) and [`conformance/capability-registry.json`](../conformance/capability-registry.json)).

```javascript
export const capabilities = ['streaming', 'tools', 'vision', 'json_mode']
```

Capability IDs MUST match entries in the registry. Unrecognized IDs SHOULD trigger a warning at adapter registration time.

---

## Capability Registry

The normative capability list is [`conformance/capability-registry.json`](../conformance/capability-registry.json) (human-readable form: [`CAPABILITY-REGISTRY.md`](../CAPABILITY-REGISTRY.md)). Each entry has an `id` (for example `fl:streaming`), a `manifest_keys` list naming the capability strings adapters export (for example `streaming`), and a `supported_by` list of vendors. Vendor-specific capability schemas live in [`capabilities/`](../capabilities/).

If an adapter exports a capability string, it MUST implement it; exporting a capability it does not implement is a conformance violation. V1 scope is vendor-level capabilities only; per-model overrides are out of scope.

This repository ships the registry and conformance harness only. Engines implement their own lookup of the `capabilities` export and registry.

---

## Capability Routing

Engines SHOULD check the adapter's exported `capabilities` array to gate feature routing before making adapter calls:

```javascript
if (adapter.capabilities.includes('streaming')) {
  for await (const chunk of adapter.stream(req)) { /* ... */ }
} else {
  const response = await adapter.call(req)
}
```

Engines MUST NOT call `stream()` on an adapter that does not declare `streaming` in its capabilities.
