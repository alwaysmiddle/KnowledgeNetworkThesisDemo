// Pane graph — the radial subtree layout the Children pane draws (2026-07-12:
// the in-map flip retired; the map stays territory at every depth and THIS is
// where the node-link reading lives). Root at the origin, rings by depth,
// angular sectors ∝ √(FULL subtree weight) — the root compresses heavy/light
// sibling ratios so a leaf beside a 200-node subtree keeps a readable arc
// (2026-07-13; raw weight starved it to a sliver) — and FULL, not just what's
// open, so OPENING a node (2026-07-12: the depth cap became an interactive expanded
// set — containment discloses click by click, root always at the center)
// only adds rings outward, it never re-deals the angles: children appear
// inside the sector their parent always owned. Ring radius is FIXED at the
// depth index (2026-07-13: normalization to the pane removed — the pane is a
// pannable CANVAS now, so expanding a node adds circles outward and moves
// NOTHING that was already there; the layout never snaps). Children are
// ordered by their MAP bearing and the wheel is rotated so the first child's
// sector centers on its own bearing: the pane is a schematic of the same
// territory the map shows, same compass. The wheel carries CONTAINMENT only —
// typed relations left it 2026-07-12 for the pane's grouped list (and edge
// geometry stays the map's selection overlay alone).

import { byId, childrenOf } from '../corpus/graph'
import type { GNode } from '../corpus/graph'
import { nestedDots, territories } from './nested'
import type { XY } from './derive'

export interface PaneNode {
  id: string
  /** 0 = the pane's root */
  depth: number
  parent: string | null
  /** has children in the corpus (even if this node is closed) */
  container: boolean
  /** direct children hidden because this node is closed (0 = open or leaf) */
  clipped: number
  /** ring units: root at the origin, ring k at radius k — scale to draw */
  x: number
  y: number
}

export interface PaneGraph {
  root: string
  nodes: PaneNode[]
  /** deepest containment level below the root (0 = the root is a leaf) */
  depthAvail: number
  /** rings actually laid out = the deepest OPEN chain (≥ 1) */
  shown: number
}

// map rest pose per node: territory centroid or dot — bearings come from the
// same geography the map draws. Containers above the topic tier (root,
// domains, modules) have no cell; they pose at the mean of their children.
const mapPose = new Map<string, XY>()
for (const t of territories) mapPose.set(t.id, { x: t.cx, y: t.cy })
for (const d of nestedDots) mapPose.set(d.id, { x: d.x, y: d.y })
function poseOf(id: string): XY {
  const hit = mapPose.get(id)
  if (hit) return hit
  const kids = childrenOf.get(id) ?? []
  const ps = kids.map((k) => poseOf(k.id))
  const p = ps.length
    ? { x: ps.reduce((s, q) => s + q.x, 0) / ps.length, y: ps.reduce((s, q) => s + q.y, 0) / ps.length }
    : { x: 0, y: 0 }
  mapPose.set(id, p)
  return p
}

const WEIGHT = new Map<string, number>()
function weight(id: string): number {
  const hit = WEIGHT.get(id)
  if (hit !== undefined) return hit
  const w = 1 + (childrenOf.get(id) ?? []).reduce((s, k) => s + weight(k.id), 0)
  WEIGHT.set(id, w)
  return w
}
/** what a child's sector is proportional to — see the header on √ */
const sector = (id: string) => Math.sqrt(weight(id))

/** descendants beneath a node, excluding itself — the pane's "n of N beneath"
 * counter. Shares the memo with the sector weights (weight = self + descendants)
 * rather than walking the tree a second time, which is what ConnectionsPane used
 * to do with its own private copy. */
export const subtreeSize = (id: string) => weight(id) - 1

const DEPTH_BELOW = new Map<string, number>()
export function depthBelow(id: string): number {
  const hit = DEPTH_BELOW.get(id)
  if (hit !== undefined) return hit
  const kids = childrenOf.get(id) ?? []
  const d = kids.length ? 1 + Math.max(...kids.map((k) => depthBelow(k.id))) : 0
  DEPTH_BELOW.set(id, d)
  return d
}

export function paneGraph(root: string, expanded: ReadonlySet<string>): PaneGraph {
  const kids0 = childrenOf.get(root) ?? []
  const depthAvail = depthBelow(root)
  // shown = the deepest chain of OPEN nodes — informational only (the header
  // counter); it no longer scales the rings
  const openDepth = (kids: GNode[], depth: number): number => {
    let m = depth
    for (const k of kids) {
      const grand = childrenOf.get(k.id) ?? []
      if (grand.length > 0 && expanded.has(k.id)) m = Math.max(m, openDepth(grand, depth + 1))
    }
    return m
  }
  const shown = kids0.length ? openDepth(kids0, 1) : 1
  const origin = poseOf(root)
  const bearing = (id: string): number => {
    const p = poseOf(id)
    return Math.atan2(p.y - origin.y, p.x - origin.x)
  }
  const byBearing = (kids: GNode[]) => [...kids].sort((a, b) => bearing(a.id) - bearing(b.id) || a.id.localeCompare(b.id))

  const nodes: PaneNode[] = [{ id: root, depth: 0, parent: null, container: kids0.length > 0, clipped: 0, x: 0, y: 0 }]

  const place = (kids: GNode[], a0: number, a1: number, depth: number, parent: string) => {
    const sorted = byBearing(kids)
    const total = sorted.reduce((s, k) => s + sector(k.id), 0)
    let cum = a0
    for (const k of sorted) {
      const span = ((a1 - a0) * sector(k.id)) / total
      const mid = cum + span / 2
      const r = depth
      const grand = childrenOf.get(k.id) ?? []
      const cut = grand.length > 0 && !expanded.has(k.id)
      nodes.push({
        id: k.id,
        depth,
        parent,
        container: grand.length > 0,
        clipped: cut ? grand.length : 0,
        x: Math.cos(mid) * r,
        y: Math.sin(mid) * r,
      })
      if (!cut && grand.length) place(grand, cum, cum + span, depth + 1, k.id)
      cum += span
    }
  }
  if (kids0.length) {
    // rotate the wheel so the first child's sector centers on its own map
    // bearing — the whole ring then lands the way the map has it
    const sorted = byBearing(kids0)
    const total = sorted.reduce((s, k) => s + sector(k.id), 0)
    const span0 = (2 * Math.PI * sector(sorted[0].id)) / total
    const a0 = bearing(sorted[0].id) - span0 / 2
    place(kids0, a0, a0 + 2 * Math.PI, 1, root)
  }

  return { root, nodes, depthAvail, shown }
}

// ── Label placement (lifted out of ChildrenPanel 2026-07-14) ────────────────
// Deterministic de-overlap. Labels keep their node's ANGLE — the order never
// re-deals, same contract as the layout itself — but step OUTWARD through up to
// three radial lanes when their box would land on an already-placed one, and a
// displaced label grows a leader line back to its node.
//
// COMMITTED LABELS PLACE FIRST, ghosts fit in around them. That is the no-jitter
// invariant applied to typography: a hover preview can never re-seat a label
// that was already on screen. The last lane accepts overlap rather than hide a
// name — a missing name was the complaint this replaced.

/** viewBox units PER RING — deep rings pan into view rather than being squeezed */
export const RING = 100
const CHAR_W = 7 // ≈ viewBox units per glyph at the pane's 12px label size
const HORIZ = 105 // |x| beyond this = "horizontal extreme": the label goes under/over
const LANE_OFF = 24 // radial units per label lane; lane > 0 gets a leader line
/** past this many nodes, leaf names are noise — only containers keep them */
const LEAF_LABEL_MAX = 110

/** a placed label: its node's angle kept, radially staggered on collision */
export interface LblPlace {
  id: string
  x: number
  y: number
  anchor: 'start' | 'end' | 'middle'
  ghost: boolean
  leader: { x1: number; y1: number; x2: number; y2: number } | null
}

interface Box {
  x0: number
  y0: number
  x1: number
  y1: number
}

export function placeLabels(pg: PaneGraph, committed: ReadonlySet<string>): LblPlace[] {
  const title = (id: string) => byId.get(id)!.title
  const leafLabels = pg.nodes.length <= LEAF_LABEL_MAX
  const cand = pg.nodes.filter((n) => n.depth > 0 && (n.container || leafLabels))
  const ang = (n: PaneNode) => Math.atan2(n.y, n.x)

  // committed first, ghosts after — so a preview fits around what is already read
  const order = [
    ...cand.filter((n) => committed.has(n.id)).sort((a, b) => a.depth - b.depth || ang(a) - ang(b)),
    ...cand.filter((n) => !committed.has(n.id)).sort((a, b) => a.depth - b.depth || ang(a) - ang(b)),
  ]

  const rootW = title(pg.root).length * CHAR_W + 8
  const boxes: Box[] = [{ x0: -rootW / 2, y0: -37, x1: rootW / 2, y1: -23 }] // the root title is pre-placed
  const hits = (b: Box) => boxes.some((o) => b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1)

  const out: LblPlace[] = []
  for (const n of order) {
    const w = title(n.id).length * CHAR_W
    const nodeR = n.container ? 10.5 : 7
    const ux = n.x / n.depth
    const uy = n.y / n.depth
    for (let lane = 0; lane < 3; lane++) {
      const r = n.depth * RING + lane * LANE_OFF
      const lx = ux * r
      const ly = uy * r
      const horiz = Math.abs(lx) > HORIZ
      let place: LblPlace
      let box: Box
      if (horiz) {
        const y = ly >= 0 ? ly + (lane === 0 ? nodeR + 13 : 11) : ly - (lane === 0 ? nodeR + 7 : 5)
        place = { id: n.id, x: lx, y, anchor: 'middle', ghost: !committed.has(n.id), leader: null }
        box = { x0: lx - w / 2, y0: y - 11, x1: lx + w / 2, y1: y + 3 }
      } else {
        const off = lane === 0 ? 14 : 6
        const x = lx + (n.x >= 0 ? off : -off)
        const y = ly + 4
        place = { id: n.id, x, y, anchor: n.x >= 0 ? 'start' : 'end', ghost: !committed.has(n.id), leader: null }
        box = n.x >= 0 ? { x0: x, y0: y - 11, x1: x + w, y1: y + 3 } : { x0: x - w, y0: y - 11, x1: x, y1: y + 3 }
      }
      if (lane > 0) {
        place.leader = { x1: n.x * RING + ux * (nodeR + 2), y1: n.y * RING + uy * (nodeR + 2), x2: lx - ux * 3, y2: ly - uy * 3 }
      }
      if (lane === 2 || !hits(box)) {
        boxes.push(box)
        out.push(place)
        break
      }
    }
  }
  return out
}
