#!/usr/bin/env node
// AI Adapter Protocol — L2 Mock Vendor Server
//
// In-process HTTP server on an ephemeral port that returns canned responses
// keyed by (path, method, body-shape). Used by the L2 conformance harness.
//
// Usage:
//   const { startMockVendor, stopMockVendor } = require('./mock-vendor')
//   const { baseURL } = await startMockVendor()
//   // ... run adapter calls ...
//   await stopMockVendor()

'use strict'

const http = require('node:http')
const path = require('node:path')
const fs = require('node:fs')

const CANNED_DIR = path.resolve(__dirname, 'mock-vendor', 'canned')

let _server = null
let _scenarios = []
let _activeScenario = null  // When set, always serve this scenario

function loadScenarios() {
  const files = fs.readdirSync(CANNED_DIR).filter(n => n.endsWith('.json')).sort()
  return files.map(f => JSON.parse(fs.readFileSync(path.join(CANNED_DIR, f), 'utf8')))
}

// Set the active scenario for the next request. Pass null to revert to auto-matching.
function setActiveScenario(scenario) {
  _activeScenario = scenario
}

function bodyMatches(bodyMatch, requestBody) {
  if (!bodyMatch || Object.keys(bodyMatch).length === 0) return true
  for (const [k, v] of Object.entries(bodyMatch)) {
    if (typeof v === 'object' && v !== null) {
      if (typeof requestBody[k] !== 'object') return false
      for (const vk of Object.keys(v)) {
        if (requestBody[k][vk] === undefined) return false
      }
    } else {
      if (requestBody[k] !== v) return false
    }
  }
  return true
}

function findScenario(method, urlPath, body) {
  if (_activeScenario) return _activeScenario

  const candidates = _scenarios.filter(s =>
    s.request.method === method &&
    s.request.path === urlPath &&
    bodyMatches(s.request.body_match, body)
  )
  if (candidates.length === 0) return null
  candidates.sort((a, b) => {
    const aKeys = Object.keys(a.request.body_match || {}).length
    const bKeys = Object.keys(b.request.body_match || {}).length
    return bKeys - aKeys
  })
  return candidates[0]
}

function sendSse(res, scenario) {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
    'connection': 'keep-alive',
    ...scenario.response.headers,
  })
  const events = scenario.response.body_sse || []
  let i = 0
  function sendNext() {
    if (i >= events.length) {
      res.end()
      return
    }
    const ev = events[i++]
    const data = typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data)
    res.write(`data: ${data}\n\n`)
    setImmediate(sendNext)
  }
  sendNext()
}

async function handleRequest(req, res) {
  const urlPath = req.url.split('?')[0]
  let body = {}
  let rawBody = ''

  await new Promise(resolve => {
    req.on('data', chunk => { rawBody += chunk })
    req.on('end', resolve)
  })

  if (rawBody) {
    try { body = JSON.parse(rawBody) } catch (_) { body = {} }
  }

  const scenario = findScenario(req.method, urlPath, body)

  if (!scenario) {
    res.writeHead(404, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: `No canned response for ${req.method} ${urlPath}` }))
    return
  }

  const { response } = scenario

  // Delay if requested
  if (response.delay_ms) {
    await new Promise(r => setTimeout(r, response.delay_ms))
  }

  // SSE streaming
  if (response.body_sse) {
    sendSse(res, scenario)
    return
  }

  // Raw body
  if (typeof response.body_raw === 'string') {
    res.writeHead(response.status, response.headers || {})
    res.end(response.body_raw)
    return
  }

  // JSON body
  res.writeHead(response.status, {
    'content-type': 'application/json',
    ...response.headers,
  })
  res.end(JSON.stringify(response.body))
}

async function startMockVendor() {
  _scenarios = loadScenarios()
  _server = http.createServer((req, res) => {
    handleRequest(req, res).catch(err => {
      res.writeHead(500)
      res.end(JSON.stringify({ error: err.message }))
    })
  })

  await new Promise(resolve => _server.listen(0, '127.0.0.1', resolve))
  const { port } = _server.address()
  const baseURL = `http://127.0.0.1:${port}`
  return { baseURL, scenarios: _scenarios }
}

async function stopMockVendor() {
  if (!_server) return
  await new Promise((resolve, reject) => _server.close(err => err ? reject(err) : resolve()))
  _server = null
  _scenarios = []
  _activeScenario = null
}

module.exports = { startMockVendor, stopMockVendor, setActiveScenario }
