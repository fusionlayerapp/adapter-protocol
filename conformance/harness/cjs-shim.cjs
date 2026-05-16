'use strict'

/**
 * CJS shim for ESM adapter implementations.
 *
 * Usage in CJS test harnesses:
 *   const { loadAdapter } = require('./cjs-shim')
 *   const adapter = await loadAdapter('anthropic', '/path/to/adapters/')
 *   const result = await adapter.call({ ... })
 */

/**
 * Dynamically imports an ESM adapter by vendorId.
 *
 * @param {string} vendorId - e.g. 'anthropic', 'openai', 'google'
 * @param {string} adaptersDir - absolute path to adapters directory
 * @returns {Promise<object>} adapter module exports
 */
async function loadAdapter(vendorId, adaptersDir) {
  const { pathToFileURL } = require('node:url')
  const path = require('node:path')
  const adapterPath = path.join(adaptersDir, `${vendorId}.js`)
  const fileUrl = pathToFileURL(adapterPath).href
  const mod = await import(fileUrl)
  return mod
}

/**
 * Returns call(), stream(), and healthCheck() from an adapter module,
 * normalized to the AAP v1.0.0 interface.
 */
function normalizeAdapter(mod) {
  if (typeof mod.call !== 'function') throw new Error(`Adapter missing call() export`)
  return {
    vendorId: mod.vendorId ?? 'unknown',
    capabilities: mod.capabilities ?? {},
    call: mod.call,
    stream: mod.stream ?? null,
    healthCheck: mod.healthCheck ?? null,
  }
}

module.exports = { loadAdapter, normalizeAdapter }
