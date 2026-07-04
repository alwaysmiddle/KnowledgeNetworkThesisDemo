// spec-gate.mjs
//
// The spec gate of the SDLC pipeline, using DocHub as the source of truth.
//
// Rule: every active Product Milestone in the DocHub Roadmap must link to a
// feature spec under docs/knowledge-network-thesis-demo/specs/ that exists on
// disk.

import { existsSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const DOCHUB = process.env.DOCHUB_ROOT
  ? resolve(process.env.DOCHUB_ROOT)
  : resolve(ROOT, '..', 'DocHub')
const DOCS_ROOT = join(DOCHUB, 'docs', 'knowledge-network-thesis-demo')
const ROADMAP = join(DOCS_ROOT, 'Roadmap.md')

const ACTIVE = /\b(in progress|active)\b/i
const ROW = /^\|\s*([a-z][a-z0-9-]*)\s*\|(.+)\|\s*$/

function resolveSpec(target) {
  const clean = target.trim().replace(/^\.\//, '')
  const candidates = [join(DOCS_ROOT, clean), join(DOCS_ROOT, clean + '.md')]
  return candidates.find((p) => existsSync(p)) ?? null
}

function displayPath(file) {
  return relative(ROOT, file).split('\\').join('/')
}

const text = readFileSync(ROADMAP, 'utf8')
const lines = text.split('\n')

const violations = []
const checked = []

for (const line of lines) {
  const match = line.match(ROW)
  if (!match) continue

  const id = match[1]
  const cells = match[2].split('|').map((cell) => cell.trim())
  if (cells.length < 5) continue

  const [slice, design, build, , notes] = cells
  const isActive = ACTIVE.test(design) || ACTIVE.test(build)
  if (!isActive) continue

  const link = [...notes.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)]
    .map((linkMatch) => linkMatch[1])
    .find((target) => /specs?\//i.test(target))

  if (!link) {
    violations.push(`${id} "${slice}" is active but its Notes cell links to no DocHub spec.`)
    continue
  }

  const file = resolveSpec(link)
  if (!file) {
    violations.push(`${id} "${slice}" links to missing spec "${link}".`)
    continue
  }

  checked.push(`${id} "${slice}" -> ${displayPath(file)}`)
}

console.log('Spec gate - active milestones must have a DocHub spec:')
for (const item of checked) console.log(`  ok   ${item}`)
if (!checked.length && !violations.length) console.log('  (no active milestones found)')

if (violations.length) {
  console.error('\nSpec gate FAILED:')
  for (const violation of violations) console.error(`  x ${violation}`)
  console.error('\nFix: add a DocHub feature spec and link it from the Roadmap row, or move the milestone out of an active state.')
  process.exit(1)
}

console.log('\nSpec gate passed.')
