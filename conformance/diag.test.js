import { test } from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {
  ADAPTER_ERROR_CATALOG,
  lookupAdapterError,
  runAdapterDoctor,
  inspectAdapterFile,
} from './validate.js'

test('Adapter Protocol doctor and error catalog lookup (#16)', () => {
  const doc = runAdapterDoctor()
  assert.equal(doc.healthy, true)
  assert.equal(doc.protocol, 'AdapterProtocol/1.0')
  assert.ok(Object.keys(ADAPTER_ERROR_CATALOG).length >= 6)

  const rateErr = lookupAdapterError('rate_limited')
  assert.equal(rateErr.code, 'E_ADP_RATE_LIMITED')
  assert.equal(rateErr.retryable, true)
})

test('inspectAdapterFile validates vector files (#16)', () => {
  const file = path.resolve('C:/Projects/adapter-protocol/conformance/vectors/01-minimal-call.json')
  const info = inspectAdapterFile(file)
  assert.equal(info.valid, true)
  assert.equal(info.schemaKey, 'request')
})

test('adapter-protocol CLI writes to CLI and optional --output file (#17)', async () => {
  const { execFileSync } = await import('node:child_process')
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const tmpDir = mkdtempSync(join(tmpdir(), 'adp-out-'))
  try {
    const outFile = join(tmpDir, 'doctor.json')
    const cliOut = execFileSync(
      process.execPath,
      [path.resolve('C:/Projects/adapter-protocol/conformance/validate.js'), 'doctor', '--output', outFile],
      { encoding: 'utf8' },
    )
    assert.match(cliOut, /HEALTHY/)
    assert.equal(JSON.parse(readFileSync(outFile, 'utf8')).healthy, true)
  } finally {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

