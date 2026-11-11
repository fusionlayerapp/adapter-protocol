#!/usr/bin/env node
// CI guard (fusionlayerapp/adapter-protocol#19): every repo-relative path referenced
// inside a fenced code sample in docs/*.md must exist in this repo. Catches the exact
// defect this issue reported -- docs pointing at a `src/` directory that was removed.
//
// Scope: only paths inside fenced code blocks (``` ... ```), and only ones that look
// like a repo-relative path (start with `./` or a known top-level directory name and
// contain a `/`). Prose mentions of paths are not checked -- too much risk of false
// positives on things like "see docs/foo.md for context".
import { readFileSync, existsSync } from 'node:fs'
import { readdirSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(here, '..')
const DOCS_DIR = join(REPO_ROOT, 'docs')

// Deliberately NOT scoped to today's top-level directories -- the defect this guard
// exists to catch (#19) was docs referencing a `src/` directory that no longer exists
// at all, so a check keyed off "does this dir currently exist" would never flag it.
// Matches any `word(/word)+.ext` token with 1-4 path segments and a short extension.
const PATH_RE = /(?:\.\/)?[\w-]+(?:\/[\w.-]+){1,4}\.\w{1,5}\b/g

function extractCodeBlocks(markdown) {
  const blocks = []
  const re = /```[\w-]*\n([\s\S]*?)```/g
  let m
  while ((m = re.exec(markdown)) !== null) blocks.push(m[1])
  return blocks
}

function docFiles() {
  const out = []
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.md')) out.push(full)
    }
  }
  if (existsSync(DOCS_DIR)) walk(DOCS_DIR)
  return out
}

const problems = []
for (const file of docFiles()) {
  const markdown = readFileSync(file, 'utf8')
  for (const block of extractCodeBlocks(markdown)) {
    const matches = [...block.matchAll(PATH_RE)]
    for (const m of matches) {
      const rel = m[0].replace(/^\.\//, '')
      const abs = join(REPO_ROOT, rel)
      if (!existsSync(abs)) {
        problems.push(`${file}: references missing path \`${m[0]}\``)
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`check-doc-paths: ${problems.length} broken repo-relative path(s) in docs/*.md code samples:`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}

console.log('check-doc-paths: every repo-relative path in docs/*.md code samples exists.')
