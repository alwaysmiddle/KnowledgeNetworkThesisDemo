// The relation palette agrees with the tokens it claims to mirror (OB-123, #248).
//
// `EDGE_COLOR` and `MIXED_EDGE_COLOR` are hand-written copies of `--edge-*` from
// `src/tokens/colors.css`. They have to be copies: the values are handed to SVG
// `stroke` and `fill` PRESENTATION ATTRIBUTES, where a `var()` does not resolve —
// the attribute is dropped and the shape renders black — so the app cannot simply
// reference the tokens the way a stylesheet would.
//
// A hand-kept copy is exactly the thing that goes stale without anyone noticing,
// and this repo has the receipts: `--color-edge-mixed` in `tokens/kn-theme.css` sat
// a generation behind `colors.css` for days, and the fingerprint check that exists
// to catch that class of miss had itself been dead for eleven days (#240). So the
// copies are not trusted here — the token files are READ, and the values compared.
//
// It checks BOTH copies, because there are two: the palette this module exports,
// and the Tailwind utility mirror. The mirror is generated upstream by hand, which
// is why it is the one that drifted.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { EDGE_COLOR, MIXED_EDGE_COLOR } from './graph'

const TOKENS = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'tokens')
const read = (f: string) => readFileSync(join(TOKENS, f), 'utf8')

/** every `--name: value;` in a stylesheet, last declaration winning */
function declarations(css: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const m of css.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gim)) {
    out.set(m[1], m[2].trim())
  }
  return out
}

/** follow `var(--x)` one hop at a time until a literal colour comes out */
function resolveVar(decls: Map<string, string>, name: string): string {
  let v = decls.get(name)
  for (let i = 0; i < 8 && v; i++) {
    const m = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(v)
    if (!m) return v
    v = decls.get(m[1])
  }
  if (!v) throw new Error(`${name} does not resolve to a value in colors.css`)
  return v
}

const colors = declarations(read('colors.css'))
const theme = declarations(read('kn-theme.css'))

/** the four typed relations plus the aggregate, and the token each one copies */
const PAIRS: Array<[string, string]> = [
  ['--edge-depends-on', EDGE_COLOR.depends_on],
  ['--edge-uses', EDGE_COLOR.uses],
  ['--edge-see-also', EDGE_COLOR.see_also],
  ['--edge-implemented-with', EDGE_COLOR.implemented_with],
  ['--edge-mixed', MIXED_EDGE_COLOR],
]

describe('the relation palette is the naturalised column', () => {
  it.each(PAIRS)('%s is what the app actually draws', (token, drawn) => {
    expect(drawn).toBe(resolveVar(colors, token))
  })

  // THE REGRESSION ITSELF, stated as its own claim rather than left implied by the
  // equalities above. Before OB-123 every one of these drew the `-raw` value:
  // full-saturation orange, red and hot pink over paper pastels.
  it.each(PAIRS)('%s is NOT the raw hex it used to be', (token, drawn) => {
    const raw = colors.get(`${token}-raw`)
    expect(raw).toBeTruthy()
    expect(drawn).not.toBe(raw)
  })
})

describe('the Tailwind mirror agrees with the tokens', () => {
  // This is the copy that actually went stale — `--color-edge-mixed` read #8a8071
  // against colors.css's oklch(0.52 0.035 255), and nothing caught it, because the
  // mirror RESTATES values rather than aliasing them (a var() would be circular in
  // a Tailwind @theme block, which is why it is hand-kept upstream).
  it.each(PAIRS.map(([token]) => token))('%s matches its --color-* twin', (token) => {
    const mirror = `--color-${token.slice(2)}`
    expect(theme.get(mirror), `${mirror} missing from kn-theme.css`).toBeTruthy()
    expect(theme.get(mirror)).toBe(resolveVar(colors, token))
  })

  it('and the raw column is mirrored too, so neither half drifts alone', () => {
    for (const [token] of PAIRS) {
      expect(theme.get(`--color-${token.slice(2)}-raw`)).toBe(colors.get(`${token}-raw`))
    }
  })
})

describe('the reader itself', () => {
  // Every assertion above is an equality against something parsed out of a file. If
  // the parse returned nothing, `resolveVar` throws rather than comparing undefined
  // to undefined — but the count is asserted anyway, because a sweep that swept
  // nothing is the failure this repo keeps finding.
  it('read real stylesheets, not empty ones', () => {
    expect(colors.size).toBeGreaterThan(50)
    expect(theme.size).toBeGreaterThan(50)
  })

  it('resolves a var() chain rather than returning the var() text', () => {
    // --edge-uses is `var(--hue-clay-stroke)` in colors.css; if the hop were not
    // followed, every equality above would compare a var() string to a colour and
    // this file would be asserting the opposite of what it claims.
    expect(resolveVar(colors, '--edge-uses')).not.toMatch(/^var\(/)
    expect(colors.get('--edge-uses')).toMatch(/^var\(/)
  })
})
