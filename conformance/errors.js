export const ADAPTER_ERROR_CATALOG = Object.freeze({
  E_ADP_INVALID_API_KEY: {
    code: 'E_ADP_INVALID_API_KEY',
    wireCode: 'invalid_api_key',
    level: 'ERROR',
    category: 'auth',
    retryable: false,
    message: 'Upstream model vendor rejected the API key (HTTP 401/403).',
    hint: 'Rotate or verify the vendor API key in your FusionLayer / Inkfold vault.',
  },
  E_ADP_RATE_LIMITED: {
    code: 'E_ADP_RATE_LIMITED',
    wireCode: 'rate_limited',
    level: 'WARN',
    category: 'rate_limit',
    retryable: true,
    message: 'Upstream model vendor rate-limited the request (HTTP 429).',
    hint: 'Apply exponential backoff with jitter or fail over to a secondary vendor adapter.',
  },
  E_ADP_QUOTA_EXCEEDED: {
    code: 'E_ADP_QUOTA_EXCEEDED',
    wireCode: 'quota_exceeded',
    level: 'ERROR',
    category: 'billing',
    retryable: false,
    message: 'Upstream vendor quota or FinOps budget circuit-breaker exceeded (HTTP 402).',
    hint: 'Check FinOps budget caps or top up vendor credits.',
  },
  E_ADP_UPSTREAM_TIMEOUT: {
    code: 'E_ADP_UPSTREAM_TIMEOUT',
    wireCode: 'upstream_timeout',
    level: 'WARN',
    category: 'network',
    retryable: true,
    message: 'Upstream model completion or stream request timed out.',
    hint: 'Increase `_timeout_ms` or switch to streaming mode.',
  },
  E_ADP_UPSTREAM_5XX: {
    code: 'E_ADP_UPSTREAM_5XX',
    wireCode: 'upstream_5xx',
    level: 'WARN',
    category: 'upstream',
    retryable: true,
    message: 'Upstream model vendor returned a 5xx server error.',
    hint: 'Retry with backoff or route to a fallback model.',
  },
  E_ADP_SCHEMA_INVALID: {
    code: 'E_ADP_SCHEMA_INVALID',
    wireCode: 'invalid_request',
    level: 'ERROR',
    category: 'schema',
    retryable: false,
    message: 'Adapter request, response, chunk, or capability payload failed JSON Schema validation.',
    hint: 'Run `node conformance/validate.js inspect <file>` to view schema errors.',
  },
})

export function lookupAdapterError(code) {
  if (!code) return null
  const upper = String(code).trim().toUpperCase()
  if (ADAPTER_ERROR_CATALOG[upper]) return ADAPTER_ERROR_CATALOG[upper]
  return Object.values(ADAPTER_ERROR_CATALOG).find((e) => e.wireCode === String(code).trim().toLowerCase()) || null
}
