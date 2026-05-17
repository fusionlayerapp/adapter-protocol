import { CAPABILITY_MANIFEST } from './capability-manifest.js'

export function getCapabilities(vendorId) {
  if (!Object.prototype.hasOwnProperty.call(CAPABILITY_MANIFEST, vendorId)) {
    console.warn(`[AAP] UNKNOWN_VENDOR: no capability manifest found for vendor "${vendorId}" — returning empty capabilities`)
    return { vendor_id: vendorId, capabilities: [], protocol_version: '1.0.0' }
  }
  return {
    vendor_id: vendorId,
    capabilities: [...CAPABILITY_MANIFEST[vendorId]],
    protocol_version: '1.0.0',
  }
}

export function supportsCapability(vendorId, capability) {
  const { capabilities } = getCapabilities(vendorId)
  return capabilities.includes(capability)
}
