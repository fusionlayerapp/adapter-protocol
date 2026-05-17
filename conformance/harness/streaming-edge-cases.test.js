import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'

// Push all chunks at once into a Readable; consumer controls pace via events
function makeChunkStream(chunks) {
  const r = new Readable({ read() {} })
  for (const chunk of chunks) r.push(chunk)
  r.push(null)
  return r
}

function collectStream(readable) {
  return new Promise((resolve, reject) => {
    const parts = []
    readable.on('data', chunk => parts.push(chunk.toString()))
    readable.on('end', () => resolve(parts.join('')))
    readable.on('error', reject)
  })
}

test('test_partial_chunk_reassembly', async () => {
  const chunk1 = Buffer.from('data: {"tok')
  const chunk2 = Buffer.from('en":"hello"}\n\n')
  const stream = makeChunkStream([chunk1, chunk2])
  const raw = await collectStream(stream)
  const fullLine = raw.replace(/\n\n$/, '')
  assert.match(fullLine, /^data: /)
  const parsed = JSON.parse(fullLine.slice('data: '.length))
  assert.equal(parsed.token, 'hello')
})

test('test_backpressure_handles_slow_consumer', async () => {
  // Produce chunks fast, consume slowly using pause/resume.
  // Verifies no data loss when consumer applies backpressure.
  const chunkCount = 10
  const chunks = Array.from({ length: chunkCount }, (_, i) => Buffer.from(`chunk-${i}\n`))
  const stream = makeChunkStream(chunks)

  const received = []
  await new Promise((resolve, reject) => {
    stream.on('error', reject)
    stream.on('end', resolve)
    stream.on('data', chunk => {
      // Pause stream on each chunk to simulate slow consumer
      stream.pause()
      received.push(chunk.toString())
      setTimeout(() => stream.resume(), 2)
    })
  })

  // All content must be present (chunks may be coalesced by the buffer)
  const allContent = received.join('')
  for (let i = 0; i < chunkCount; i++) {
    assert.ok(allContent.includes(`chunk-${i}`), `Missing chunk-${i} in received data`)
  }
})

test('test_empty_stream_completes_without_error', async () => {
  const stream = makeChunkStream([])
  let errorFired = false
  stream.on('error', () => { errorFired = true })
  const data = await collectStream(stream)
  assert.equal(data, '')
  assert.equal(errorFired, false)
})

test('test_stream_error_propagates_to_consumer', async () => {
  const stream = new Readable({ read() {} })
  stream.push('before-error\n')
  process.nextTick(() => stream.destroy(new Error('network reset mid-stream')))

  await assert.rejects(
    () => collectStream(stream),
    (err) => {
      assert.equal(err.message, 'network reset mid-stream')
      return true
    }
  )
})

test('test_reconnect_on_network_error', async () => {
  // Spec: retry up to 3 times before surfacing error to caller.
  // Verifies retry count logic with a mock that fails N times then succeeds.
  const MAX_RETRIES = 3

  function makeRetryingFetch(failTimes) {
    let attempts = 0
    async function fetch() {
      attempts++
      if (attempts <= failTimes) throw new Error(`network error attempt ${attempts}`)
      return makeChunkStream([Buffer.from('reconnected\n')])
    }
    async function fetchWithRetry() {
      let lastErr
      for (let i = 0; i <= MAX_RETRIES; i++) {
        try {
          const stream = await fetch()
          return { stream, attempts }
        } catch (err) {
          lastErr = err
          if (i < MAX_RETRIES) await new Promise(r => setTimeout(r, 5 * (i + 1)))
        }
      }
      throw Object.assign(lastErr, { attempts })
    }
    return fetchWithRetry
  }

  // 2 failures → succeeds on 3rd attempt
  const runOk = makeRetryingFetch(2)
  const { stream: s1, attempts: a1 } = await runOk()
  assert.equal((await collectStream(s1)).trim(), 'reconnected')
  assert.equal(a1, 3)

  // MAX_RETRIES+1 failures → exhausts retries → error surfaces
  const runFail = makeRetryingFetch(MAX_RETRIES + 1)
  await assert.rejects(runFail, (err) => {
    assert.match(err.message, /network error attempt/)
    return true
  })
})
