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

import { childrenOf } from '../corpus/graph'
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
