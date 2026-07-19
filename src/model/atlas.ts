// The Map's derived model — everything the atlas computes that is not React.
// Lifted out of NestedAtlasView (2026-07-14), which was 948 lines with the
// whole selection-overlay derivation trapped inside it: what roads a selection
// draws, how they roll up to a coarser grain, and how parallel links collapse
// into one. All of it is a pure function of the corpus and one id, and none of
// it was reachable — or testable — from outside the component.
//
// It is also the piece a route needs. "Draw this walk on the map" is the same
// trim-and-bundle machinery pointed at a different edge set, and it could not
// even be attempted while this lived inside a render function.

import { byId, domainIds, domainOf, topicIds, topicsUnder } from '../corpus/graph'
import type { EdgeType, GEdge } from '../corpus/graph'
import type { XY } from './derive'
import { edgesTouching, leafPos, provinceIds, provinceOf, topicAnchorOf } from './flat'
import { countryPath, countryRings, provincePath, provinceRings, territories, topicPoly } from './nested'

// ── Geography: the label anchors and region centres, derived once ────────────
const centroidOf = (members: string[]) => ({
  x: members.reduce((s, id) => s + leafPos[id].x, 0) / members.length,
  y: members.reduce((s, id) => s + leafPos[id].y, 0) / members.length,
})

/** domain name anchors — RAW centroids. The overlap-spread nudge went with the
 * single-line rendering it served: names wrap INSIDE their regions now
 * (fitRegionLabel), and a wrap anchored off-centre defeats the fit. */
export const countryLabels = domainIds.map((d) => ({
  ...centroidOf(topicIds.filter((t) => domainOf(t) === d)),
  label: byId.get(d)!.title,
  key: d,
}))

export const provinceLabels = provinceIds.map((m) => ({
  ...centroidOf(topicIds.filter((t) => provinceOf(t) === m)),
  label: byId.get(m)!.title,
  key: m,
}))

// region anchor points for the rolled-up arrows — RAW centroids, not the
// overlap-spread label positions (a road must leave from where the region is,
// not from where its name was nudged to)
const domainCenter = new Map(domainIds.map((d) => [d, centroidOf(topicIds.filter((t) => domainOf(t) === d))]))
const provinceCenter = new Map(provinceIds.map((m) => [m, centroidOf(topicIds.filter((t) => provinceOf(t) === m))]))

const terrD = new Map(territories.map((t) => [t.id, t.d]))

/** The svg outline of any node's cell, at whatever grain it lives on. The
 * selection, the hover preselect and the cross-pane spotlight all ask this same
 * question, and all three used to spell out the same three-way fallback. */
export const outlineOf = (id: string): string | undefined => countryPath[id] ?? provincePath[id] ?? terrD.get(id)

/** which grain a selection sits on: 0 = domain, 1 = module, 2+ = topic-or-deeper */
export const tierOf = (id: string): number => (countryPath[id] ? 0 : provincePath[id] ? 1 : 2)

// ── The peek flight target (SelfNotes: hover a connection, the map flies) ────
const terrCenter = new Map(territories.map((t) => [t.id, { c: { x: t.cx, y: t.cy }, tier: t.tier }]))

/** Where the camera goes to LOOK AT a node: its own region's centre, and the
 * tier whose canonical scale frames it — a domain at L0, a module at L1, every
 * territory at its own stratum. A node too deep to own a territory falls back
 * to its owning topic's cell; null only for an id the map has never heard of. */
export const flightTargetOf = (id: string): { c: XY; tier: number } | null => {
  const d = domainCenter.get(id)
  if (d) return { c: d, tier: 0 }
  const p = provinceCenter.get(id)
  if (p) return { c: p, tier: 1 }
  const t = terrCenter.get(id)
  if (t) return t
  return byId.has(id) ? terrCenter.get(topicAnchorOf(id)) ?? null : null
}

/** Which src/tgt in a selection's Bundle a node would touch — the grain-lift a
 * hovered counterpart needs to find its road. A road is drawn at the selection's
 * grain (see tierOf), but a hover arrives as a TOPIC id (a relationship row one
 * pane over) or a deeper node; both must resolve to the region that actually
 * carries the road. At the topic grain that is the node's own owning topic;
 * rolled up, that topic's module or domain. Idempotent on an id already at the
 * grain — so the counterpart cell itself resolves to itself, and the road it is
 * on lights. */
export const endpointAtTier = (id: string, tier: number): string => {
  const topic = topicAnchorOf(id)
  return tier <= 0 ? domainOf(topic) : tier === 1 ? provinceOf(topic) : topic
}

// ── Edge trimming against cell borders ──────────────────────────────────────
/** param t along a→b where the segment crosses the polygon boundary. Topic
 * cells are convex and the capitals sit inside them, so the line LEAVES the
 * source cell at the smallest crossing ('min') and ENTERS the target cell at
 * the largest ('max') — exactly the two border points the edge trim needs. */
export function polyCrossT(a: XY, b: XY, poly: XY[] | undefined, pick: 'min' | 'max'): number | null {
  if (!poly) return null
  const dx = b.x - a.x
  const dy = b.y - a.y
  let best: number | null = null
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const ex = q.x - p.x
    const ey = q.y - p.y
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-9) continue
    const t = ((p.x - a.x) * ey - (p.y - a.y) * ex) / den
    const u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / den
    if (t <= 0 || t >= 1 || u < 0 || u > 1) continue
    if (best === null || (pick === 'min' ? t < best : t > best)) best = t
  }
  return best
}

/** same, over a multi-ring region outline: first exit / last entry wins */
export function ringsCrossT(a: XY, b: XY, rings: XY[][] | undefined, pick: 'min' | 'max'): number | null {
  if (!rings) return null
  let best: number | null = null
  for (const r of rings) {
    const t = polyCrossT(a, b, r, pick)
    if (t !== null && (best === null || (pick === 'min' ? t < best : t > best))) best = t
  }
  return best
}

// ── The selection overlay ───────────────────────────────────────────────────
/** an overlay arrow — one raw edge at topic grain, or a rolled-up group at the
 * domain/module grain */
export interface Arrow {
  key: string
  src: string
  tgt: string
  type: EdgeType
  /** raw edges rolled into this arrow (1 at the topic grain) */
  n: number
  a: XY
  b: XY
  srcRings: XY[][] | undefined
  tgtRings: XY[][] | undefined
}

/** every arrow between one PAIR of cells, collapsed into a single drawn line.
 * Two topics wired by four links used to be four curves fanned apart by a bulge
 * index — legible as geometry, unreadable as a map. The map's question is "is
 * there a road here, and how busy", so one road is drawn and its traffic is a
 * number. WHICH links and WHICH WAY they run is the star's question, one pane
 * away. */
export interface Bundle {
  key: string
  src: string
  tgt: string
  /** raw edges collapsed in here — the ×n badge */
  n: number
  /** the one relation type, or null when the bundle mixes types (no type colour
   * would be true, so the renderer draws it slate) */
  type: EdgeType | null
  /** all links run src→tgt, or the pair is reciprocal — and then NO arrowhead:
   * a two-way road with one head drawn on it would be a lie */
  dir: 'fwd' | 'both'
  a: XY
  b: XY
  srcRings: XY[][] | undefined
  tgtRings: XY[][] | undefined
}

export interface Roads {
  /** the grain the overlay is drawn at — see tierOf */
  tier: number
  /** one per counterpart+type+direction; the legend counts these */
  arrows: Arrow[]
  /** one per unordered PAIR; the map draws these */
  bundles: Bundle[]
}

const NO_ROADS: Roads = { tier: -1, arrows: [], bundles: [] }

/** Relations live at the topic grain, so any selection resolves to topics first
 * — itself, or everything under it — and the overlay draws THEIR typed edges. A
 * selection ABOVE the topic grain (a domain, a module) then ROLLS THOSE EDGES
 * UP: each underlying topic edge maps to its counterpart's region at the same
 * tier, and edges internal to the selection drop out entirely. A child's
 * relationships are never drawn raw across a coarser map. And a selection BELOW
 * the topic grain draws NOTHING (2026-07-17): it has no edges of its own, and
 * the old fallback — borrowing the owning topic's roads, the map-side twin of
 * the pane's retired "via" lift — kept the parent's arrows on screen for every
 * relation-less child, so every deep selection looked connected. */
export function roadsFor(sel: string | null): Roads {
  if (!sel || !byId.has(sel)) return NO_ROADS

  const selTopics = topicsUnder(sel)
  if (selTopics.length === 0) return { tier: tierOf(sel), arrows: [], bundles: [] }

  const seen = new Map<string, GEdge>()
  for (const t of selTopics) for (const e of edgesTouching(t)) seen.set(e.id, e)
  const selEdges = [...seen.values()]

  const tier = tierOf(sel)
  const arrows = tier >= 2 ? rawArrows(selEdges) : rolledArrows(selEdges, tier)
  return { tier, arrows, bundles: bundle(arrows) }
}

/** topic grain: one arrow per raw edge, drawn cell-border to cell-border */
function rawArrows(selEdges: GEdge[]): Arrow[] {
  return selEdges.map((e) => ({
    key: e.id,
    src: e.source,
    tgt: e.target,
    type: e.type,
    n: 1,
    a: leafPos[e.source],
    b: leafPos[e.target],
    srcRings: topicPoly.has(e.source) ? [topicPoly.get(e.source)!] : undefined,
    tgtRings: topicPoly.has(e.target) ? [topicPoly.get(e.target)!] : undefined,
  }))
}

/** region grain: lift each topic edge to its counterpart's region, drop the
 * ones that stay inside the selection, group the rest by counterpart+type */
function rolledArrows(selEdges: GEdge[], tier: number): Arrow[] {
  const regionOf = (t: string) => (tier === 0 ? domainOf(t) : provinceOf(t))
  const center = tier === 0 ? domainCenter : provinceCenter
  const rings = tier === 0 ? countryRings : provinceRings

  const groups = new Map<string, { src: string; tgt: string; type: EdgeType; n: number }>()
  for (const e of selEdges) {
    const rs = regionOf(e.source)
    const rt = regionOf(e.target)
    if (rs === rt) continue // internal — the children's affair, not the region's
    const k = `${rs}>${rt}|${e.type}`
    const g = groups.get(k)
    if (g) g.n++
    else groups.set(k, { src: rs, tgt: rt, type: e.type, n: 1 })
  }
  return [...groups.entries()].map(([key, g]) => ({
    key,
    ...g,
    a: center.get(g.src)!,
    b: center.get(g.tgt)!,
    srcRings: rings[g.src],
    tgtRings: rings[g.tgt],
  }))
}

/** Collapse every arrow between the same PAIR of cells into one line. Grouping
 * is by UNORDERED pair, so a reciprocal A→B / B→A becomes one two-way road, not
 * two curves bowed past each other. Geometry comes from the first arrow in the
 * group, which fixes the drawn orientation; the rest are compared against it to
 * decide whether the road is one-way. */
function bundle(arrows: Arrow[]): Bundle[] {
  const by = new Map<string, Arrow[]>()
  for (const ar of arrows) {
    const k = ar.src < ar.tgt ? `${ar.src}|${ar.tgt}` : `${ar.tgt}|${ar.src}`
    const g = by.get(k)
    if (g) g.push(ar)
    else by.set(k, [ar])
  }
  return [...by.entries()].map(([key, group]) => {
    const head = group[0]
    const types = new Set(group.map((ar) => ar.type))
    return {
      key,
      src: head.src,
      tgt: head.tgt,
      n: group.reduce((s, ar) => s + ar.n, 0),
      type: types.size === 1 ? head.type : null,
      // head defines the drawn direction, so "every arrow agrees with head" is
      // exactly "one-way"
      dir: group.every((ar) => ar.src === head.src) ? ('fwd' as const) : ('both' as const),
      a: head.a,
      b: head.b,
      srcRings: head.srcRings,
      tgtRings: head.tgtRings,
    }
  })
}
