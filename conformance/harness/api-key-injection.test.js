import { test } from 'node:test'
import assert from 'node:assert/strict'

const ENV_VAR_MAP = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
  openrouter: 'OPENROUTER_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  xai: 'XAI_API_KEY',
  ollama: '',
}

class ApiKeyMissingError extends Error {
  constructor(envVarName) {
    super(`API key not configured — set ${envVarName} in the environment`)
    this.name = 'ApiKeyMissingError'
    this.envVarName = envVarName
  }
}

class ApiKeyInjectionError extends Error {
  constructor() {
    super('API keys must be provided via environment variables in production mode')
    this.name = 'ApiKeyInjectionError'
  }
}

function createAdapter(vendorId, options = {}) {
  const { apiKey, _testMode = false } = options
  const isTestMode = _testMode || process.env.ADAPTER_TEST_MODE === '1'

  if (apiKey !== undefined && !isTestMode) {
    throw new ApiKeyInjectionError()
  }

  const envVarName = ENV_VAR_MAP[vendorId]

  if (envVarName === undefined) {
    return { vendorId, apiKey: null }
  }

  if (envVarName === '') {
    return { vendorId, apiKey: null }
  }

  if (isTestMode && apiKey !== undefined) {
    return { vendorId, apiKey }
  }

  const resolvedKey = process.env[envVarName]
  if (!resolvedKey) {
    throw new ApiKeyMissingError(envVarName)
  }

  return { vendorId, apiKey: resolvedKey }
}

test('test_adapter_reads_key_from_env_var', () => {
  const original = process.env.ANTHROPIC_API_KEY
  try {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-from-env-12345'
    const adapter = createAdapter('anthropic')
    assert.equal(adapter.apiKey, 'sk-ant-from-env-12345')
    assert.equal(adapter.vendorId, 'anthropic')
  } finally {
    if (original === undefined) {
      delete process.env.ANTHROPIC_API_KEY
    } else {
      process.env.ANTHROPIC_API_KEY = original
    }
  }
})

test('test_adapter_throws_if_key_missing_from_env', () => {
  const original = process.env.OPENAI_API_KEY
  try {
    delete process.env.OPENAI_API_KEY
    assert.throws(
      () => createAdapter('openai'),
      (err) => {
        assert.equal(err.name, 'ApiKeyMissingError')
        assert.ok(err.message.includes('OPENAI_API_KEY'), `error message must name the env var, got: "${err.message}"`)
        return true
      }
    )
  } finally {
    if (original !== undefined) {
      process.env.OPENAI_API_KEY = original
    }
  }
})

test('test_adapter_rejects_request_param_key_in_production', () => {
  const originalTestMode = process.env.ADAPTER_TEST_MODE
  try {
    delete process.env.ADAPTER_TEST_MODE
    assert.throws(
      () => createAdapter('anthropic', { apiKey: 'sk-hardcoded-key' }),
      (err) => {
        assert.equal(err.name, 'ApiKeyInjectionError')
        assert.ok(
          !err.message.includes('sk-hardcoded-key'),
          'error message must not contain the key value'
        )
        return true
      }
    )
  } finally {
    if (originalTestMode !== undefined) {
      process.env.ADAPTER_TEST_MODE = originalTestMode
    }
  }
})

test('test_adapter_accepts_request_param_key_in_test_mode', () => {
  const adapter = createAdapter('openai', { apiKey: 'sk-test-openai-abc', _testMode: true })
  assert.equal(adapter.apiKey, 'sk-test-openai-abc')
  assert.equal(adapter.vendorId, 'openai')
})

test('test_error_message_never_contains_key_value', () => {
  const originalTestMode = process.env.ADAPTER_TEST_MODE
  const secretKey = 'sk-super-secret-key-9999'
  try {
    delete process.env.ADAPTER_TEST_MODE
    let caughtError = null
    try {
      createAdapter('anthropic', { apiKey: secretKey })
    } catch (err) {
      caughtError = err
    }
    assert.ok(caughtError !== null, 'expected an error to be thrown')
    assert.ok(
      !caughtError.message.includes(secretKey),
      `error message must not contain the secret key value, got: "${caughtError.message}"`
    )
    assert.ok(
      !(caughtError.stack || '').includes(secretKey),
      'stack trace must not contain the secret key value'
    )
  } finally {
    if (originalTestMode !== undefined) {
      process.env.ADAPTER_TEST_MODE = originalTestMode
    }
  }
})
