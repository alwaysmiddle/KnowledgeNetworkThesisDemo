// Formal color model (2026-07-12) — ONE definition of every node's color,
// shared by all instruments, so the layered map, the Children wheel and any
// future view paint the same node the same way.
//
// The scheme is recursive hue-range partitioning ("tree colors") in OKLCH:
// each domain anchors an arc of the hue wheel at its authored DOMAIN_COLOR
// hue; children subdivide their parent's arc (weighted by subtree size), so
// any node's hue provably sits inside its ancestor's neighborhood — color
// does double duty: sibling discrimination locally, lineage globally.
//
// Two escape hatches keep DEEP levels legible, where naive partitioning
// collapses arcs to fractions of a degree:
//  - a per-sibling hue floor (MIN_STEP) from generation 2 down — sibling
//    centers never sit closer than ~11°, even if that bleeds past the
//    parent's arc (distant cousins may then share hues; borders and
//    geography disambiguate),
//  - a lightness parity nudge from generation 3 down — adjacent same-hue
//    siblings still alternate light/dark.
//
// Three derived swatches per node, all from the same (hue, gen, nudge):
//  colorOf    — the saturated identity anchor (borders, capitals, chips)
//  fillOf     — the pale country fill (active-level territory paint)
//  inkOf      — dark readable text tinted toward the hue (labels)
//  inkStrongOf— a crisper, near-black emphasis ink (selected/focused labels),
//               darker AND far less chromatic than inkOf so it reads as clean
//               type, not a muddy colored gray, on a hue-tinted/glowing cell

import { nestedFamilyPaint } from '@/ds'

import { childrenOf, domainIds, DOMAIN_COLOR } from '../corpus/graph'

// ── OKLab/OKLCH ↔ sRGB (Björn Ottosson's matrices, D65) ─────────────────────
const lin = (u: number) => (u <= 0.04045 ? u / 12.92 : Math.pow((u + 0.055) / 1.055, 2.4))
const gam = (u: number) => (u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055)

function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const n = parseInt(hex.slice(1), 16)
  const r = lin(((n >> 16) & 255) / 255)
  const g = lin(((n >> 8) & 255) / 255)
  const b = lin((n & 255) / 255)
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_
  const c = Math.hypot(a, bb)
  return { l: L, c, h: c < 1e-6 ? 0 : (((Math.atan2(bb, a) * 180) / Math.PI) + 360) % 360 }
}

function oklchToHex(l: number, c: number, h: number): string {
  const hr = (h * Math.PI) / 180
  const a = c * Math.cos(hr)
  const b = c * Math.sin(hr)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
  const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_
  // out-of-gamut chroma just clamps — at these L/C pairs the error is subtle
  const ch = (u: number) => Math.round(255 * Math.min(1, Math.max(0, gam(u)))).toString(16).padStart(2, '0')
  return `#${ch(r)}${ch(g)}${ch(bl)}`
}

// ── Recursive arc assignment ─────────────────────────────────────────────────
const DOMAIN_SPAN = 46 // deg of hue wheel a domain's subtree spreads over
const KEEP = 0.82 // a child keeps this fraction of its width — gaps between arcs
const MIN_STEP = 11 // deg — sibling-center floor from generation 2 down

interface Slot {
  hue: number
  /** generations below the domain: 0 = domain, 1 = module, 2 = topic … */
  gen: number
  /** sibling parity: alternating ±1 (0 for only children) */
  nudge: number
}

const slot = new Map<string, Slot>()

const weightMemo = new Map<string, number>()
function weight(id: string): number {
  const hit = weightMemo.get(id)
  if (hit !== undefined) return hit
  const w = 1 + (childrenOf.get(id) ?? []).reduce((s, k) => s + weight(k.id), 0)
  weightMemo.set(id, w)
  return w
}

function assign(id: string, hue: number, span: number, gen: number, nudge: number) {
  slot.set(id, { hue: ((hue % 360) + 360) % 360, gen, nudge })
  const kids = childrenOf.get(id) ?? []
  if (kids.length === 0) return
  const W = kids.reduce((s, k) => s + weight(k.id), 0)
  const spread = Math.max(span, gen >= 2 ? MIN_STEP * (kids.length - 1) : 0)
  let acc = 0
  kids.forEach((k, i) => {
    const fr = weight(k.id) / W
    const center = hue - spread / 2 + (acc + fr / 2) * spread
    assign(k.id, center, spread * fr * KEEP, gen + 1, kids.length > 1 ? (i % 2 ? 1 : -1) : 0)
    acc += fr
  })
}

for (const d of domainIds) assign(d, hexToOklch(DOMAIN_COLOR[d]).h, DOMAIN_SPAN, 0, 0)

// ── Derived swatches ─────────────────────────────────────────────────────────
// Domains keep their EXACT authored hex (continuity with the rest of the
// Studio); descendants converge from the domain's own L/C toward a standard
// anchor over three generations, so each family keeps its character.
const anchorMap = new Map<string, string>()
const fillMap = new Map<string, string>()
const inkMap = new Map<string, string>()
const inkStrongMap = new Map<string, string>()

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

for (const d of domainIds) {
  const base = hexToOklch(DOMAIN_COLOR[d])
  const walk = (id: string) => {
    const s = slot.get(id)!
    const t = Math.min(1, s.gen / 3)
    const push = s.gen >= 3 ? s.nudge : 0
    anchorMap.set(id, s.gen === 0 ? DOMAIN_COLOR[d] : oklchToHex(lerp(base.l, 0.6, t) + push * 0.03, lerp(base.c, 0.125, t), s.hue))
    fillMap.set(id, oklchToHex(0.905 + push * 0.02, 0.058, s.hue))
    inkMap.set(id, oklchToHex(0.42, 0.1, s.hue))
    // near-black, hue barely present: on the selected cell (tinted by the glow)
    // the standard ink's L 0.42 / C 0.1 reads as a muddy colored gray, so the
    // emphasis ink drops to L 0.30 and C 0.04 — clean type that still carries a
    // whisper of lineage rather than a flat neutral black.
    inkStrongMap.set(id, oklchToHex(0.3, 0.04, s.hue))
    for (const k of childrenOf.get(id) ?? []) walk(k.id)
  }
  walk(d)
}

// ── Territory fill (OB-086) ──────────────────────────────────────────────────
// `fillOf` above goes flat past two or three generations: `assign()` only
// floors sibling spacing at MIN_STEP from generation 2 down, and the fill's
// own lightness/chroma barely move with depth (a ±0.02 L wobble, constant C) —
// so a domain with several modules, each with several topics, reads as one
// undifferentiated blob a couple of levels in. That is real for every `fillOf`
// consumer (ConnectionsPane included), but the DS's own fix — `nestedFamilyPaint`
// — is scoped to what the owner actually reported: the MAP's territory fill.
// A separate map here, rather than changing `fillOf` itself, so the map gets
// depth-legible fill without silently re-tinting a consumer that never asked
// for it. Depth/index/of are computed once per node by the same kind of
// tree walk `assign()` above already does — depth from the domain ancestor,
// index/of among the node's own siblings under its immediate parent.
const territoryFillMap = new Map<string, string>()

function walkTerritory(id: string, domain: string, depth: number) {
  const kids = childrenOf.get(id) ?? []
  kids.forEach((k, i) => {
    territoryFillMap.set(k.id, nestedFamilyPaint(domain, { depth: depth + 1, index: i, of: kids.length }).fill)
    walkTerritory(k.id, domain, depth + 1)
  })
}

for (const d of domainIds) {
  territoryFillMap.set(d, nestedFamilyPaint(d, { depth: 0, index: 0, of: 1 }).fill)
  walkTerritory(d, d, 0)
}

const FALLBACK = { anchor: '#64748b', fill: '#e2e8f0', ink: '#334155', inkStrong: '#1e2530' }

/** saturated identity anchor — borders, capitals, chips */
export const colorOf = (id: string): string => anchorMap.get(id) ?? FALLBACK.anchor
/** pale country fill — active-level territory paint */
export const fillOf = (id: string): string => fillMap.get(id) ?? FALLBACK.fill
/** the map's territory fill, graded arbitrarily deep by `nestedFamilyPaint`
 *  (OB-086) — a domain and its descendants stay visually distinguishable past
 *  the two or three generations `fillOf` above goes flat at. Map-only: other
 *  `fillOf` consumers (ConnectionsPane) are unaffected. */
export const territoryFillOf = (id: string): string => territoryFillMap.get(id) ?? FALLBACK.fill
/** dark hue-tinted text color — labels on the node's own fill */
export const inkOf = (id: string): string => inkMap.get(id) ?? FALLBACK.ink
/** crisp near-black emphasis ink — selected/focused labels (see header) */
export const inkStrongOf = (id: string): string => inkStrongMap.get(id) ?? FALLBACK.inkStrong
/** the assigned hue in degrees, for anything that derives its own swatch */
export const hueOf = (id: string): number | null => slot.get(id)?.hue ?? null
