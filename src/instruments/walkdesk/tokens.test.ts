// The design system's `--road-*` tokens and this folder's layout constants are
// the SAME NUMBERS. The road lays out by arithmetic — measure → place, no DOM
// reads — so `NODEW`, `AGAP`, `PAD` and friends are not "roughly the spacing
// scale", they ARE the layout, and `tokens/spacing.css` is a second copy of them
// that ships to a different consumer.
//
// A second copy of a number is a number that will drift. It already did: the
// tab strip's `TAB_H`/`MIN_TAB_W` were deleted when the fork went to columns
// (#18) but their tokens lingered, `BAR_ONE_LINE_W` moved 350 → 430 with the
// token left behind, and `COLGAP`/`COLHEAD` shipped with no token at all. All
// four were caught by a human re-reading source, which is not a process.
//
// So: parse both sides and compare. Parsing rather than importing is deliberate —
// it needs no `export` on the constants (nothing to forget to add) and it can
// assert the thing an import cannot: that no constant exists WITHOUT a token, and
// no token exists without either a constant or an explicit note saying why not.

// This is the one file under src/ that reads from disk. tsconfig.app.json keeps
// the app browser-pure (types: ["vite/client"]), so pull Node types in for just
// this file rather than widening the whole project's global scope.
/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))
const read = (p: string) => readFileSync(resolve(here, p), 'utf8')

const CSS = read('../../../skills/knowledge-network-studio-design/tokens/spacing.css')
const SOURCES = {
  road: read('./AuthorRoad.tsx'),
  railroad: read('./RailroadView.tsx'),
}

/** every `--road-*` / `--rail-*` px declaration in the token file */
function tokens(css: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const m of css.matchAll(/^\s*(--(?:road|rail|preview)-[a-z0-9-]+)\s*:\s*(-?[\d.]+)px\s*;/gm))
    out.set(m[1], Number(m[2]))
  return out
}

/** every top-level `const NAME = <number>` — the layout constants, by convention
 *  the only SHOUTING_CASE numeric consts in these files */
function constants(src: string): Map<string, number> {
  const out = new Map<string, number>()
  for (const m of src.matchAll(/^const ([A-Z][A-Z_0-9]*) = (-?[\d.]+)\b/gm)) out.set(m[1], Number(m[2]))
  return out
}

/** token → the constant it duplicates, and which file that constant lives in */
const BOUND: Record<string, [keyof typeof SOURCES, string]> = {
  '--road-node-w': ['road', 'NODEW'],
  '--road-node-h': ['road', 'NODEH'],
  '--road-gap': ['road', 'AGAP'],
  '--road-pad': ['road', 'PAD'],
  '--road-head-h': ['road', 'HEAD'],
  '--road-margin': ['road', 'MARGIN'],
  '--road-question-h': ['road', 'QUESTION_H'],
  '--road-col-gap': ['road', 'COLGAP'],
  '--road-col-head': ['road', 'COLHEAD'],
  '--road-vis-bar-h': ['road', 'VIS_BAR_H'],
  '--road-empty-body-h': ['road', 'EMPTY_BODY_H'],
  '--road-slot-h': ['road', 'SLOTH'],
  '--road-sel-pad': ['road', 'SELPAD'],
  '--road-bar-row-h': ['road', 'BAR_ROW_H'],
  '--road-bar-one-line-w': ['road', 'BAR_ONE_LINE_W'],
  '--preview-w': ['railroad', 'PREVIEW_W'],
}

// Tokens the design system PROPOSES, with no constant behind them yet. Each one
// is a redesign that hasn't landed. This list should only ever shrink: when the
// UI change ships, its token moves into BOUND and gains a constant.
const PROPOSED = new Set([
  '--road-gutter-w', // fixed status gutter left of every title
  '--road-menu-w', // the hover-only ⋯ affordance
  '--road-hit-min', // minimum square for a clickable road control
  '--rail-step-w', // the rail's number column
])

describe('the road\'s layout constants and the design tokens are one number', () => {
  const tk = tokens(CSS)
  const cs = { road: constants(SOURCES.road), railroad: constants(SOURCES.railroad) }

  test('the token file actually parsed', () => {
    expect(tk.size).toBeGreaterThan(10)
    expect(cs.road.size).toBeGreaterThan(10)
  })

  for (const [token, [file, name]] of Object.entries(BOUND)) {
    test(`${token} === ${name}`, () => {
      const constant = cs[file].get(name)
      expect(constant, `${name} is gone from ${file} — rename the token or restore it`).toBeDefined()
      expect(tk.get(token), `${token} is gone from spacing.css`).toBeDefined()
      expect(tk.get(token)).toBe(constant)
    })
  }

  test('no token drifts unnoticed — every --road-*/--rail-* is bound or proposed', () => {
    const loose = [...tk.keys()].filter((k) => !(k in BOUND) && !PROPOSED.has(k))
    expect(loose, 'add these to BOUND (with their constant) or to PROPOSED').toEqual([])
  })

  test('no constant ships untokenised — every layout const has a token', () => {
    const bound = new Set(Object.values(BOUND).map(([f, n]) => `${f}.${n}`))
    const loose = [
      ...[...cs.road.keys()].map((n) => `road.${n}`),
      ...[...cs.railroad.keys()].map((n) => `railroad.${n}`),
    ].filter((k) => !bound.has(k))
    expect(loose, 'a new layout constant needs a --road-* token in spacing.css').toEqual([])
  })

  test('a proposed token has NOT quietly grown a constant', () => {
    // the reverse trap: shipping the redesign but leaving the token in PROPOSED
    // means the parity check silently stops guarding it
    const all = new Set([...cs.road.keys(), ...cs.railroad.keys()])
    const shipped = [...PROPOSED].filter((t) => {
      const guess = t.replace(/^--(road|rail)-/, '').replace(/-/g, '_').toUpperCase()
      return all.has(guess)
    })
    expect(shipped, 'these landed — move them from PROPOSED into BOUND').toEqual([])
  })
})
