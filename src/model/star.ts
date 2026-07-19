// The relations star — the "external" reading of the Connections pane, lifted
// out of ChildrenPanel 2026-07-14.
//
// A one-hop ego graph: the anchor topic pinned at the centre, its counterparts
// on a ring. A pinned-centre one-hop graph's force equilibrium IS a ring, so the
// layout is CONSTRUCTED, not simulated — and the ring positions are seeded at
// the counterparts' TRUE MAP BEARINGS, then relaxed apart just far enough to
// stop labels colliding. That is what makes the star and the map the same
// compass: a topic that lives north-east on the map sits north-east here.

import { byId, domainIds, domainOf, pathTo, topicIds, topicsUnder } from '../corpus/graph'
import type { EdgeType, GEdge } from '../corpus/graph'
import { edgesTouching, leafPos, provinceIds, provinceOf } from './flat'
import type { XY } from './derive'
import { EDGE_TYPES } from './nav'

/** ring radii, in the pane's viewBox units — an ELLIPSE, because the canvas is
 * one (272×178 half-extents) and a circle wastes the wide axis. Sized to the
 * EDGE LABELS, not the nodes: the type word sits mid-spoke, and short spokes
 * read as all-label. Vertically 150 is the ceiling (a bottom node's label at
 * y + 22 plus descenders must clear 178); horizontally 200 keeps a worst-case
 * 30-char title, centred under a 3-o'clock node, within a pan of the 272 edge. */
export const RX_STAR = 200
export const R_STAR = 150

// Minimum angular gap between counterparts. Generous on purpose: neighbours
// often CLUSTER on one bearing (they live in the same map region), and at 0.28
// the first real test stacked two labels. Order stays compass-true; gaps don't.
export const MIN_GAP = 0.55

/** The topic that owns a node: itself if it IS one, the topic above it if it
 * sits below one, and NULL above the topic grain.
 *
 * NB this is deliberately NOT flat.ts's topicAnchorOf, which falls back to the
 * id itself when no topic is on the path. A domain has no relations OF ITS OWN
 * — its children's are not its — and the pane has to be able to say so. Silently
 * anchoring a domain to itself would make edgesTouching() return [] and the pane
 * would claim "no typed links" about a node that cannot have any. */
export function anchorTopicOf(id: string): string | null {
  return pathTo(id).find((p) => byId.get(p)!.topic) ?? null
}

/** Keep ring order, force a minimum angular gap — 1-D relaxation, no solver.
 * Order-preserving is the whole point: the compass must survive the spread. */
export function relaxRing(sorted: number[], gap: number): number[] {
  const n = sorted.length
  if (n < 2) return [...sorted]
  // more counterparts than the ring can hold at this gap — spread them evenly
  // and accept that bearings become approximate, which beats overlapping
  if (gap * n >= 2 * Math.PI) return sorted.map((_, i) => sorted[0] + (2 * Math.PI * i) / n)
  const a = [...sorted]
  for (let round = 0; round < 40; round++) {
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const d = (j === 0 ? a[j] + 2 * Math.PI : a[j]) - a[i]
      if (d < gap) {
        const push = (gap - d) / 2
        a[i] -= push
        a[j] += push
      }
    }
  }
  return a
}

export interface StarNode {
  id: string
  x: number
  y: number
  /** every link between the anchor and this counterpart, in edge-type order */
  edges: GEdge[]
}

export interface Star {
  /** null above the topic grain — see anchorTopicOf */
  anchor: string | null
  /** every typed link touching the anchor — the relationship list's rows */
  rels: GEdge[]
  /** one per COUNTERPART, not per edge: parallel links share a node */
  nodes: StarNode[]
}

const EMPTY: Star = { anchor: null, rels: [], nodes: [] }

export function starFor(currentId: string): Star {
  const anchor = anchorTopicOf(currentId)
  if (!anchor) return EMPTY

  const rels = edgesTouching(anchor)
  const origin = leafPos[anchor]

  // group by counterpart — a reciprocal pair is ONE node with two edges, not two
  // nodes stacked on one bearing
  const group = new Map<string, GEdge[]>()
  for (const e of rels) {
    // the annotation is load-bearing: without it TS chases cp's type through
    // group.get(cp) back into its own initializer and gives up (TS7022)
    const cp: string = e.source === anchor ? e.target : e.source
    if (cp === anchor) continue
    const g = group.get(cp)
    if (g) g.push(e)
    else group.set(cp, [e])
  }

  const seeded = [...group.keys()]
    .map((id) => ({ id, a: Math.atan2(leafPos[id].y - origin.y, leafPos[id].x - origin.x) }))
    .sort((p, q) => p.a - q.a || p.id.localeCompare(q.id))
  const angles = relaxRing(
    seeded.map((s) => s.a),
    MIN_GAP,
  )

  return {
    anchor,
    rels,
    nodes: seeded.map((s, i) => ({
      id: s.id,
      x: Math.cos(angles[i]) * RX_STAR,
      y: Math.sin(angles[i]) * R_STAR,
      edges: group.get(s.id)!.slice().sort((a, b) => EDGE_TYPES.indexOf(a.type) - EDGE_TYPES.indexOf(b.type)),
    })),
  }
}

// ── The region star (2026-07-15, SelfNotes item A) ───────────────────────────
// Above the topic grain starFor is EMPTY by design — a domain has no relations
// of its own. But the MAP rolls a domain's underlying topic edges up into roads
// and draws them, so the pane going blank there was a real asymmetry: the notes'
// "external view shows nothing" when a whole region is selected.
//
// The fix reads that same edge set as a one-hop ego graph, centred on the
// region. A settings toggle on the graph picks the counterpart grain:
//   summary  — counterparts are other REGIONS (domains for a domain, modules for
//              a module); links bundled by type with an ×n count. This is the
//              star of the map's roads — same rollup, same compass.
//   detailed — counterparts are the individual OUTSIDE topics the region's
//              members link to, one strand per real typed edge.

// Region centres — the raw centroids the map's roads leave from (mirrors
// atlas.ts:38-39). Recomputed here, not imported, to keep star a self-contained
// pure model; the formula is identical, so a region lands on the same bearing in
// both views.
const centroidOf = (ids: string[]): XY => ({
  x: ids.reduce((s, id) => s + leafPos[id].x, 0) / ids.length,
  y: ids.reduce((s, id) => s + leafPos[id].y, 0) / ids.length,
})
const regionCenter = new Map<string, XY>([
  ...domainIds.map((d) => [d, centroidOf(topicIds.filter((t) => domainOf(t) === d))] as const),
  ...provinceIds.map((m) => [m, centroidOf(topicIds.filter((t) => provinceOf(t) === m))] as const),
])

/** Seed counterparts at their true map bearings from the centre, then relax to
 * the min gap WITHOUT reordering — the same order-preserving placement the topic
 * star uses, so the region star shares its compass. */
function ringLayout(ids: string[], posOf: (id: string) => XY, origin: XY): Map<string, XY> {
  const seeded = ids
    .map((id) => ({ id, a: Math.atan2(posOf(id).y - origin.y, posOf(id).x - origin.x) }))
    .sort((p, q) => p.a - q.a || p.id.localeCompare(q.id))
  const angles = relaxRing(
    seeded.map((s) => s.a),
    MIN_GAP,
  )
  return new Map(seeded.map((s, i) => [s.id, { x: Math.cos(angles[i]) * RX_STAR, y: Math.sin(angles[i]) * R_STAR }]))
}

export type RegionStarMode = 'summary' | 'detailed'

/** one drawn spoke between the region centre and a counterpart: a single typed
 * edge (detailed) or a rolled-up group of same-type edges (summary) */
export interface RegionStrand {
  /** unique per spoke — an edge id (detailed) or `type` (summary) */
  key: string
  type: EdgeType
  /** raw edges rolled in: 1 in detailed, the ×n badge in summary */
  n: number
  /** relative to the CENTRE — does the region point out, in, or both ways */
  dir: 'out' | 'in' | 'both'
}

export interface RegionStarNode {
  /** the counterpart: another region (summary) or an outside topic (detailed) */
  id: string
  x: number
  y: number
  strands: RegionStrand[]
  /** total raw links to this counterpart — the sum of its strands' n */
  n: number
}

export interface RegionStar {
  /** the focused region, pinned at the centre */
  center: string
  mode: RegionStarMode
  /** 0 = domain, 1 = module */
  tier: number
  nodes: RegionStarNode[]
  /** the raw region-crossing edges — the bottom list's source of truth */
  edges: GEdge[]
}

/** Bundle a counterpart's edges into drawn strands. Detailed keeps every edge;
 * summary collapses per type into one strand carrying the count and the merged
 * direction. Both come out in edge-type order, so the star and list agree. */
function strandsOf(es: GEdge[], mode: RegionStarMode, out: (e: GEdge) => boolean): RegionStrand[] {
  if (mode === 'detailed') {
    return es
      .slice()
      .sort((a, b) => EDGE_TYPES.indexOf(a.type) - EDGE_TYPES.indexOf(b.type))
      .map((e) => ({ key: e.id, type: e.type, n: 1, dir: out(e) ? ('out' as const) : ('in' as const) }))
  }
  const byType = new Map<EdgeType, { n: number; out: boolean; in: boolean }>()
  for (const e of es) {
    const g = byType.get(e.type) ?? { n: 0, out: false, in: false }
    g.n++
    if (out(e)) g.out = true
    else g.in = true
    byType.set(e.type, g)
  }
  return EDGE_TYPES.filter((t) => byType.has(t)).map((t) => {
    const g = byType.get(t)!
    return { key: t, type: t, n: g.n, dir: g.out && g.in ? ('both' as const) : g.out ? ('out' as const) : ('in' as const) }
  })
}

/** A star for a REGION, or null when `sel` is not one. Topics keep using starFor;
 * the root returns null too (all its links are internal — nothing reaches out). */
export function regionStarFor(sel: string, mode: RegionStarMode): RegionStar | null {
  const tier = domainIds.includes(sel) ? 0 : provinceIds.includes(sel) ? 1 : -1
  if (tier < 0) return null

  const regionOf = tier === 0 ? domainOf : provinceOf
  const members = new Set(topicsUnder(sel))

  // region-crossing edges only: one endpoint inside, one outside. Dedup by id —
  // a member↔member edge is internal (the children's affair, not the region's)
  // and would otherwise be seen once from each end.
  const seen = new Map<string, GEdge>()
  for (const t of members) for (const e of edgesTouching(t)) seen.set(e.id, e)
  const edges = [...seen.values()].filter((e) => members.has(e.source) !== members.has(e.target))

  const origin = regionCenter.get(sel)!
  // "out" = the region is the source end; the counterpart is the outside end,
  // lifted to its region in summary and kept raw in detailed.
  const out = (e: GEdge) => members.has(e.source)
  const counterpartOf = (e: GEdge) => {
    const outside = members.has(e.source) ? e.target : e.source
    return mode === 'summary' ? regionOf(outside) : outside
  }

  const groups = new Map<string, GEdge[]>()
  for (const e of edges) {
    const cp = counterpartOf(e)
    const g = groups.get(cp)
    if (g) g.push(e)
    else groups.set(cp, [e])
  }

  const place = ringLayout([...groups.keys()], (id) => regionCenter.get(id) ?? leafPos[id], origin)
  const nodes: RegionStarNode[] = [...groups.entries()].map(([cp, es]) => {
    const p = place.get(cp)!
    return { id: cp, x: p.x, y: p.y, strands: strandsOf(es, mode, out), n: es.length }
  })
  return { center: sel, mode, tier, nodes, edges }
}
