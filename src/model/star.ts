// The relations star — the "external" reading of the Connections pane, lifted
// out of ChildrenPanel 2026-07-14.
//
// A one-hop ego graph: the anchor topic pinned at the centre, its counterparts
// on a ring. A pinned-centre one-hop graph's force equilibrium IS a ring, so the
// layout is CONSTRUCTED, not simulated — and the ring positions are seeded at
// the counterparts' TRUE MAP BEARINGS, then relaxed apart just far enough to
// stop labels colliding. That is what makes the star and the map the same
// compass: a topic that lives north-east on the map sits north-east here.

import { byId, pathTo } from '../corpus/graph'
import type { GEdge } from '../corpus/graph'
import { edgesTouching, leafPos } from './flat'
import { EDGE_TYPES } from './nav'

/** ring radius, in the pane's viewBox units */
export const R_STAR = 128

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
      x: Math.cos(angles[i]) * R_STAR,
      y: Math.sin(angles[i]) * R_STAR,
      edges: group.get(s.id)!.slice().sort((a, b) => EDGE_TYPES.indexOf(a.type) - EDGE_TYPES.indexOf(b.type)),
    })),
  }
}
