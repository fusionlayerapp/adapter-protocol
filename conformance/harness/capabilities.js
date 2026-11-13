/**
 * Reference capability discovery, derived wholly from conformance/capability-registry.json (#23).
 *
 * The harness test for this has imported a non-existent `src/index.js` since the suite
 * was vendored, so it has never run. Nothing here is invented: every fact comes from the
 * registry's `supported_by` x `manifest_keys`, so the registry stays the single source of
 * truth and this file cannot drift from it.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REGISTRY_PATH = path.join(__dirname, '..', 'capability-registry.json')
const PACKAGE_PATH = path.join(__dirname, '..', '..', 'package.json')

const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'))

/** Read from package.json so it cannot drift from the published version. */
export const PROTOCOL_VERSION = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')).version

/** {vendorId: [manifestKey, ...]}, inverted from the registry. */
export const CAPABILITY_MANIFEST = buildManifest(registry)

function buildManifest (entries) {
  const manifest = {}
  for (const entry of entries) {
    const keys = entry.manifest_keys ?? []
    for (const vendorId of entry.supported_by ?? []) {
      const seen = (manifest[vendorId] ??= [])
      for (const key of keys) {
        if (!seen.includes(key)) seen.push(key)
      }
    }
  }
  return manifest
}

/**
 * Every capability a vendor's adapter declares.
 *
 * An unknown vendor is not an error: discovery is something callers do to find out, so it
 * returns an empty list and warns, rather than throwing at whoever asked the question.
 */
export function getCapabilities (vendorId) {
  const capabilities = CAPABILITY_MANIFEST[vendorId]
  if (capabilities === undefined) {
    console.warn(`UNKNOWN_VENDOR: no capability-registry entries list "${vendorId}" in supported_by`)
    return { vendor_id: vendorId, protocol_version: PROTOCOL_VERSION, capabilities: [] }
  }
  return { vendor_id: vendorId, protocol_version: PROTOCOL_VERSION, capabilities: [...capabilities] }
}

/** Whether one vendor supports one capability. False for an unknown vendor or capability. */
export function supportsCapability (vendorId, capability) {
  return (CAPABILITY_MANIFEST[vendorId] ?? []).includes(capability)
}
