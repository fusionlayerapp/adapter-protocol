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

## Factory Functions

The `src/capabilities.js` module provides two factory functions for querying capabilities without instantiating an adapter:

### `getCapabilities(vendorId) → CapabilitySet`

Returns the full capability set for a vendor based on the static manifest.

```javascript
import { getCapabilities } from './src/index.js'

const result = getCapabilities('anthropic')
// {
//   vendor_id: 'anthropic',
//   capabilities: ['streaming', 'tools', 'vision', 'pdf', 'cache_breakpoints'],
//   protocol_version: '1.0.0'
// }
```

Unknown `vendorId` values return an empty capabilities set (no error is thrown) and log a warning. This allows future adapters to be registered without breaking existing callers.

### `supportsCapability(vendorId, capability) → boolean`

Returns `true` if the vendor's static manifest includes the named capability.

```javascript
import { supportsCapability } from './src/index.js'

supportsCapability('openai', 'web_search')    // true
supportsCapability('anthropic', 'web_search') // false
supportsCapability('unknown-vendor', 'streaming') // false (with warning)
```

---

## Static Manifest

The manifest at `src/capability-manifest.js` is the normative source for vendor capabilities. If the manifest declares a capability, the adapter MUST implement it. Declaring a capability the adapter does not implement is a conformance violation.

```javascript
export const CAPABILITY_MANIFEST = {
  anthropic: ['streaming', 'tools', 'vision', 'pdf', 'cache_breakpoints'],
  openai:    ['streaming', 'tools', 'vision', 'json_mode', 'web_search'],
  google:    ['streaming', 'tools', 'vision', 'pdf', 'json_mode'],
  openrouter:['streaming', 'tools', 'vision', 'json_mode'],
}
```

V1 scope: vendor-level capabilities only. Per-model capability overrides are out of scope.

---

## Capability Routing

Engines SHOULD use `supportsCapability()` to gate feature routing before making adapter calls:

```javascript
if (supportsCapability(vendorId, 'streaming')) {
  for await (const chunk of adapter.stream(req)) { /* ... */ }
} else {
  const response = await adapter.call(req)
}
```

Engines MUST NOT call `stream()` on an adapter that does not declare `streaming` in its capabilities.
