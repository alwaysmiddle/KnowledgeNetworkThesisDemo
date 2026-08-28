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

import { childrenOf, domainIds, DOMAIN_COLOR } from '../corpus/graph'
import { provinceRings, territories } from './nested'
import type { XY } from './derive'

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

const FALLBACK = { anchor: '#64748b', fill: '#e2e8f0', ink: '#334155', inkStrong: '#1e2530' }

// ── Territory fill: four-color adjacency WITHIN each family (2026-08-27) ────
// First cut of this used four GLOBAL hues (an atlas red/green/blue/purple) —
// correct (no two touching regions ever matched) but it threw away lineage
// entirely: a node's color no longer said anything about which domain it's
// under, and a rainbow next to this app's otherwise pale, restrained fills
// read as garish. This version keeps the four-color GUARANTEE but spends it
// inside the node's own family instead of across the whole map: the base hue
// is still `slot`'s lineage hue (the same one `colorOf`/`inkOf` read), and the
// adjacency coloring below only decides a SMALL step off that hue (plus a
// lightness/chroma nudge) — enough that real geometric neighbors are always
// told apart, never enough to leave the family. Domains need none of this:
// each already owns its own authored anchor hue, distinct from every other
// domain by construction, so they just reuse `fillMap` unchanged.
//
// `regionAdjacency` finds neighbors by testing every edge of one polygon
// against every edge of the other (a shared vertex counts too — stricter than
// the theorem strictly needs, which only ever costs an extra step, never a
// wrong one). `dsaturColor` (saturation-degree greedy) assigns step indices so
// no edge in the adjacency graph connects two same-index regions. It's a
// heuristic, not the theorem's constructive proof, but on this map's
// low-degree Voronoi tessellation (each cell touches roughly 4-7 neighbors)
// it lands on 4 or fewer steps in practice — STEP below carries a couple of
// spares regardless, so a rare 5th/6th index just repeats a smaller step.
//
// Colored in three independent groups, matching what the map actually paints
// side by side at once: all provinces (level 1, which can sit shoulder to
// shoulder across DIFFERENT domains — a province border can BE a domain
// border), and each tier of the nested atlas separately (model/nested.ts) —
// a level renders exactly one tier's cells as countries.
const EPS = 0.3 // world units — cells run 50+ units across (model/nested.ts)

function segDist(a1: XY, a2: XY, b1: XY, b2: XY): number {
  const distPtSeg = (p: XY, s1: XY, s2: XY) => {
    const dx = s2.x - s1.x
    const dy = s2.y - s1.y
    const len2 = dx * dx + dy * dy
    const t = len2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p.x - s1.x) * dx + (p.y - s1.y) * dy) / len2))
    return Math.hypot(p.x - (s1.x + t * dx), p.y - (s1.y + t * dy))
  }
  return Math.min(distPtSeg(a1, b1, b2), distPtSeg(a2, b1, b2), distPtSeg(b1, a1, a2), distPtSeg(b2, a1, a2))
}

function bbox(rings: XY[][]) {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const ring of rings)
    for (const p of ring) {
      x0 = Math.min(x0, p.x)
      y0 = Math.min(y0, p.y)
      x1 = Math.max(x1, p.x)
      y1 = Math.max(y1, p.y)
    }
  return { x0, y0, x1, y1 }
}

function ringsTouch(a: XY[][], b: XY[][]): boolean {
  for (const ra of a)
    for (let i = 0; i < ra.length; i++) {
      const a1 = ra[i]
      const a2 = ra[(i + 1) % ra.length]
      for (const rb of b)
        for (let j = 0; j < rb.length; j++) {
          if (segDist(a1, a2, rb[j], rb[(j + 1) % rb.length]) < EPS) return true
        }
    }
  return false
}

function regionAdjacency(regions: { id: string; rings: XY[][] }[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>(regions.map((r) => [r.id, new Set<string>()]))
  const boxed = regions.map((r) => ({ id: r.id, rings: r.rings, box: bbox(r.rings) }))
  for (let i = 0; i < boxed.length; i++)
    for (let j = i + 1; j < boxed.length; j++) {
      const A = boxed[i]
      const B = boxed[j]
      if (A.box.x1 < B.box.x0 - EPS || B.box.x1 < A.box.x0 - EPS || A.box.y1 < B.box.y0 - EPS || B.box.y1 < A.box.y0 - EPS) continue
      if (ringsTouch(A.rings, B.rings)) {
        adj.get(A.id)!.add(B.id)
        adj.get(B.id)!.add(A.id)
      }
    }
  return adj
}

/** saturation-degree greedy — the uncolored region touching the most already-
 *  used colors goes next, ties broken by raw degree */
function dsaturColor(ids: string[], adj: Map<string, Set<string>>): Map<string, number> {
  const color = new Map<string, number>()
  const sat = new Map(ids.map((id) => [id, new Set<number>()]))
  const remaining = new Set(ids)
  while (remaining.size > 0) {
    let pick: string | null = null
    for (const id of remaining) {
      if (!pick) {
        pick = id
        continue
      }
      const s = sat.get(id)!.size
      const sp = sat.get(pick)!.size
      if (s > sp || (s === sp && adj.get(id)!.size > adj.get(pick)!.size)) pick = id
    }
    const id = pick!
    const used = sat.get(id)!
    let c = 0
    while (used.has(c)) c++
    color.set(id, c)
    remaining.delete(id)
    for (const nb of adj.get(id) ?? []) if (remaining.has(nb)) sat.get(nb)!.add(c)
  }
  return color
}

// step index → (hue offset, lightness nudge, chroma nudge), all relative to
// the region's OWN lineage hue/depth — alternating sign so consecutive
// indices swing opposite ways rather than drifting one direction. Six entries
// (four colors used in practice, two spares) same as the DSATUR header notes.
const HUE_STEP = [0, 14, -14, 28, -28, 42]
const L_STEP = [0, -0.03, 0.03, -0.05, 0.05, -0.07]
const C_STEP = [0, 0.015, 0.015, 0.03, 0.03, 0.045]

function familyVariant(id: string, index: number): string {
  const s = slot.get(id)
  if (!s) return FALLBACK.fill
  const i = index % HUE_STEP.length
  const d = Math.min(s.gen, 4)
  const l = Math.min(0.95, Math.max(0.4, 0.9 - d * 0.028 + L_STEP[i]))
  const c = Math.max(0.02, 0.06 + d * 0.012 + C_STEP[i])
  return oklchToHex(l, c, s.hue + HUE_STEP[i])
}

const territoryFillMap = new Map<string, string>()

function fourColorGroup(regions: { id: string; rings: XY[][] }[]) {
  const adj = regionAdjacency(regions)
  const coloring = dsaturColor(regions.map((r) => r.id), adj)
  for (const r of regions) territoryFillMap.set(r.id, familyVariant(r.id, coloring.get(r.id)!))
}

for (const d of domainIds) territoryFillMap.set(d, fillMap.get(d)!)
fourColorGroup(Object.keys(provinceRings).map((m) => ({ id: m, rings: provinceRings[m] })))

const territoriesByTier = new Map<number, typeof territories>()
for (const t of territories) {
  if (!territoriesByTier.has(t.tier)) territoriesByTier.set(t.tier, [])
  territoriesByTier.get(t.tier)!.push(t)
}
for (const group of territoriesByTier.values()) fourColorGroup(group.map((t) => ({ id: t.id, rings: [t.poly] })))

// ── Label ink: contrast against the cell the label actually sits on ─────────
// OB-102 (2026-08-28), answering receipts/b656ebc.md + issue #220. The stepped
// territory fill (above) moves each cell's L/C off `fillOf`'s flat 0.905/0.058
// to separate neighbors, and on the lighter/more chromatic steps the standard
// `inkOf` (L 0.42, C 0.10) drops under 4.5:1 — 458 of 745 labels, worst 3.42.
//
// The design system's answer was explicit about which lever moves: THE INK, per
// cell. Not the halo — MapView's thin white case is grain separation, and a
// fatter or more opaque one buys the outlined-sticker look the label pass
// already rejected. And not L_STEP/C_STEP, since the neighbor separation those
// buy is the whole point of the fill change.
//
// So: keep the hue, and slide L and C together from `inkOf`'s register toward
// `inkStrongOf`'s (L 0.30, C 0.04 — measured to hold 5.77:1 everywhere) by the
// SMALLEST step that reaches 4.5:1. A cell that already passes keeps `inkOf`
// unchanged, so this darkens only where it must.
function relLum(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * lin(((n >> 16) & 255) / 255) + 0.7152 * lin(((n >> 8) & 255) / 255) + 0.0722 * lin((n & 255) / 255)
}

/** WCAG 2.x contrast ratio between two opaque sRGB hexes. */
function contrastRatio(a: string, b: string): number {
  const la = relLum(a)
  const lb = relLum(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const LABEL_MIN_CONTRAST = 4.5
const INK_STEPS = 12

const labelInkMap = new Map<string, string>()
for (const [id, fill] of territoryFillMap) {
  const s = slot.get(id)
  const base = inkMap.get(id) ?? FALLBACK.ink
  if (!s || contrastRatio(base, fill) >= LABEL_MIN_CONTRAST) {
    labelInkMap.set(id, base)
    continue
  }
  // fall through to the full inkStrong register if no partial step clears it
  let chosen = inkStrongMap.get(id) ?? FALLBACK.inkStrong
  for (let step = 1; step <= INK_STEPS; step++) {
    const t = step / INK_STEPS
    const cand = oklchToHex(lerp(0.42, 0.3, t), lerp(0.1, 0.04, t), s.hue)
    if (contrastRatio(cand, fill) >= LABEL_MIN_CONTRAST) {
      chosen = cand
      break
    }
  }
  labelInkMap.set(id, chosen)
}

/** saturated identity anchor — borders, capitals, chips */
export const colorOf = (id: string): string => anchorMap.get(id) ?? FALLBACK.anchor
/** pale country fill — active-level territory paint */
export const fillOf = (id: string): string => fillMap.get(id) ?? FALLBACK.fill
/** the map's territory fill — the node's own lineage hue, nudged by a small
 *  geometric-adjacency-driven step (four-color-theorem style, see header) so
 *  real neighbors are never confusable, without leaving the family. Map-only:
 *  other `fillOf` consumers (ConnectionsPane) are unaffected. */
export const territoryFillOf = (id: string): string => territoryFillMap.get(id) ?? FALLBACK.fill
/** dark hue-tinted text color — labels on the node's own fill */
export const inkOf = (id: string): string => inkMap.get(id) ?? FALLBACK.ink
/** the label ink for a MAP territory — `inkOf`, darkened toward
 *  `inkStrongOf`'s register only as far as 4.5:1 against that cell's own
 *  stepped `territoryFillOf` requires (OB-102, see header). Map-only: every
 *  other `inkOf` consumer paints on the flat `fillOf` and is unaffected. */
export const labelInkOf = (id: string): string => labelInkMap.get(id) ?? inkMap.get(id) ?? FALLBACK.ink
/** crisp near-black emphasis ink — selected/focused labels (see header) */
export const inkStrongOf = (id: string): string => inkStrongMap.get(id) ?? FALLBACK.inkStrong
/** the assigned hue in degrees, for anything that derives its own swatch */
export const hueOf = (id: string): number | null => slot.get(id)?.hue ?? null
