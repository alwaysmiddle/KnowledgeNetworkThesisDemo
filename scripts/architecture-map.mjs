// architecture-map.mjs
//
// One source of truth for "what is actually in this app".
//
// It reads the REAL import statements under src/, follows them from the entry
// point (src/main.tsx), and works out three things:
//   1. LIVE files     — reachable from the entry point (the app actually uses them)
//   2. ORPHANED files — exist in src/ but nothing live imports them (dead code)
//   3. UNUSED deps    — packages in package.json that only orphaned files import
//
// It then writes docs/ARCHITECTURE.md: a Mermaid diagram (with clickable links
// to each file) plus the orphan + unused-dependency lists. The code is the
// truth; this file just renders it. Re-run after every change:
//
//   npm run map
//
// No dependencies. Plain Node.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..')
const SRC = join(ROOT, 'src')
const ENTRY = join(SRC, 'main.tsx')
const OUT = join(ROOT, 'docs', 'ARCHITECTURE.md')

const CODE_EXT = ['.ts', '.tsx', '.js', '.jsx']

// ── 1. collect every source file ─────────────────────────────────────────────
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (CODE_EXT.some((e) => p.endsWith(e))) out.push(p)
  }
  return out
}
const files = walk(SRC)

// ── 2. extract relative imports from each file ───────────────────────────────
// Matches:  import ... from '...'   |   export ... from '...'   |   import '...'
const FROM_RE = /(?:import|export)[^'"]*?from\s*['"]([^'"]+)['"]/g
const SIDE_RE = /import\s*['"]([^'"]+)['"]/g

function rawImports(file) {
  const text = readFileSync(file, 'utf8')
  const specs = new Set()
  for (const m of text.matchAll(FROM_RE)) specs.add(m[1])
  for (const m of text.matchAll(SIDE_RE)) specs.add(m[1])
  return [...specs]
}

// resolve a relative import specifier to an actual file on disk
function resolveLocal(fromFile, spec) {
  if (!spec.startsWith('.')) return null // bare specifier = external package
  const base = resolve(dirname(fromFile), spec)
  const candidates = [
    // only follow the bare path if it is already a code file (e.g. './App.tsx');
    // this keeps non-code imports like './index.css' out of the code graph
    ...(CODE_EXT.some((e) => base.endsWith(e)) ? [base] : []),
    ...CODE_EXT.map((e) => base + e),
    ...CODE_EXT.map((e) => join(base, 'index' + e)),
  ]
  for (const c of candidates) {
    try {
      if (statSync(c).isFile()) return c
    } catch {
      /* not this one */
    }
  }
  return null // e.g. a .css import — not part of the code graph
}

const localGraph = new Map() // file -> [files it imports]
const externalImports = new Map() // file -> [bare package names]
for (const f of files) {
  const locals = []
  const externals = []
  for (const spec of rawImports(f)) {
    const target = resolveLocal(f, spec)
    if (target) locals.push(target)
    else if (!spec.startsWith('.')) externals.push(spec)
  }
  localGraph.set(f, locals)
  externalImports.set(f, externals)
}

// ── 3. reachability from the entry point ─────────────────────────────────────
const live = new Set()
;(function visit(f) {
  if (live.has(f)) return
  live.add(f)
  for (const dep of localGraph.get(f) ?? []) visit(dep)
})(ENTRY)

const orphaned = files.filter((f) => !live.has(f))

// ── 4. dependencies only orphaned files use ──────────────────────────────────
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const deps = Object.keys(pkg.dependencies ?? {})
const pkgRoot = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0])

const usedByLive = new Set()
const usedByOrphan = new Set()
for (const f of files) {
  for (const ext of externalImports.get(f) ?? []) {
    const root = pkgRoot(ext)
    if (live.has(f)) usedByLive.add(root)
    else usedByOrphan.add(root)
  }
}
const deadDeps = deps.filter((d) => usedByOrphan.has(d) && !usedByLive.has(d))

// ── 5. emit Mermaid + report ─────────────────────────────────────────────────
const rel = (f) => relative(ROOT, f).split('\\').join('/')
const id = (f) => rel(f).replace(/[^a-zA-Z0-9]/g, '_')

const liveFiles = [...live].sort()
let mermaid = 'flowchart LR\n'
for (const f of liveFiles) {
  mermaid += `  ${id(f)}["${rel(f).replace('src/', '')}"]\n`
}
for (const f of liveFiles) {
  for (const dep of localGraph.get(f) ?? []) {
    if (live.has(dep)) mermaid += `  ${id(f)} --> ${id(dep)}\n`
  }
}
// clickable links — resolve to the file on whatever host renders this markdown
for (const f of liveFiles) {
  mermaid += `  click ${id(f)} "${rel(f)}"\n`
}

const byFolder = (list) => {
  const groups = {}
  for (const f of list) {
    const folder = dirname(rel(f))
    ;(groups[folder] ??= []).push(rel(f))
  }
  return groups
}

const orphanGroups = byFolder(orphaned)
let orphanMd = ''
for (const folder of Object.keys(orphanGroups).sort()) {
  orphanMd += `\n**${folder}/**\n\n`
  for (const f of orphanGroups[folder].sort()) orphanMd += `- \`${f}\`\n`
}

const stamp = new Date().toISOString().slice(0, 10)
const md = `<!-- GENERATED by scripts/architecture-map.mjs — do not edit by hand. Run: npm run map -->

# Architecture Map

_Generated ${stamp} from the actual imports in \`src/\`. The code is the source of truth; this file is derived._

## Live app (${live.size} files)

Everything reachable from \`src/main.tsx\`. This is what actually runs.

\`\`\`mermaid
${mermaid}\`\`\`

## Orphaned files (${orphaned.length})

Present in \`src/\` but imported by nothing live. Safe to archive or delete.
${orphanMd || '\n_None — every file is reachable._\n'}
## Dependencies only orphaned files use (${deadDeps.length})

Removable from \`package.json\` once the orphaned files are gone.

${deadDeps.length ? deadDeps.map((d) => `- \`${d}\``).join('\n') : '_None._'}
`

writeFileSync(OUT, md)

// console summary
console.log(`live:     ${live.size} files`)
console.log(`orphaned: ${orphaned.length} files`)
if (orphaned.length) for (const f of orphaned.sort()) console.log(`  - ${rel(f)}`)
console.log(`dead deps: ${deadDeps.length}${deadDeps.length ? ' -> ' + deadDeps.join(', ') : ''}`)
console.log(`wrote ${rel(OUT)}`)
