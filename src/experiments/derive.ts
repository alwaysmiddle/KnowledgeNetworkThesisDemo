// Pure derivations over the corpus: which nodes are visible for a given
// collapse state, where edges re-anchor when their endpoints are hidden,
// how visible boxes get packed, and what an ego (radial) neighborhood is.
// Everything here is deterministic and side-effect free — views just render it.

import { byId, childrenOf, edges, leavesUnder, ROOT_ID } from './graph'
import type { EdgeType, GNode } from './graph'

export interface XY {
  x: number
  y: number
}
export interface Size {
  w: number
  h: number
}

export const CARD_W = 150
export const CARD_H = 46
const PAD = 14 // inner padding of an expanded container
const HEADER = 30 // title strip of an expanded container
const GAP = 12 // between siblings
const ROOT_GAP = 48 // between domains — whitespace is where lifted edges live

// ── Visibility ──────────────────────────────────────────────────────────────
/** Every descendant of a collapsed container (the container itself stays visible). */
export function hiddenIds(collapsed: Set<string>): Set<string> {
  const hidden = new Set<string>()
  const stack: string[] = []
  for (const c of collapsed) for (const child of childrenOf.get(c) ?? []) stack.push(child.id)
  while (stack.length) {
    const id = stack.pop()!
    if (hidden.has(id)) continue
    hidden.add(id)
    for (const child of childrenOf.get(id) ?? []) stack.push(child.id)
  }
  return hidden
}

/** The node itself if visible, else the nearest visible ancestor. */
export function visibleAncestor(id: string, hidden: Set<string>): string {
  let cur = byId.get(id)!
  while (hidden.has(cur.id) && cur.parentId) cur = byId.get(cur.parentId)!
  return cur.id
}

// ── Edge lifting ────────────────────────────────────────────────────────────
// A raw leaf→leaf edge whose endpoints are hidden re-anchors to the visible
// ancestors; parallel lifted edges merge into ONE aggregate with a count.
// Edges entirely inside one collapsed box vanish — that's the disclosure win.
export interface LiftedEdge {
  id: string
  source: string
  target: string
  count: number
  types: Partial<Record<EdgeType, number>>
  /** single type if the aggregate is uniform, else 'mixed' */
  type: EdgeType | 'mixed'
}

export function liftEdges(hidden: Set<string>): LiftedEdge[] {
  const agg = new Map<string, LiftedEdge>()
  for (const e of edges) {
    const s = visibleAncestor(e.source, hidden)
    const t = visibleAncestor(e.target, hidden)
    if (s === t) continue // internal to one collapsed box
    const key = `${s}>${t}`
    let l = agg.get(key)
    if (!l) {
      l = { id: `L:${key}`, source: s, target: t, count: 0, types: {}, type: e.type }
      agg.set(key, l)
    }
    l.count++
    l.types[e.type] = (l.types[e.type] ?? 0) + 1
    if (l.type !== e.type) l.type = 'mixed'
  }
  return [...agg.values()]
}

// ── Shelf packing ───────────────────────────────────────────────────────────
// Deterministic recursive layout: children flow left-to-right into rows (like
// text), container hugs the result. No force sim, no crossing minimization —
// the earlier prototype showed placement isn't the bottleneck, density is,
// so layout stays dumb and predictable.
function pack(sizes: Size[], gap: number, aspect: number): { slots: XY[]; w: number; h: number } {
  const area = sizes.reduce((a, s) => a + (s.w + gap) * (s.h + gap), 0)
  const targetW = Math.max(...sizes.map((s) => s.w), Math.sqrt(area * aspect))
  const slots: XY[] = []
  let x = 0
  let y = 0
  let rowH = 0
  let w = 0
  for (const s of sizes) {
    if (x > 0 && x + s.w > targetW) {
      y += rowH + gap
      x = 0
      rowH = 0
    }
    slots.push({ x, y })
    w = Math.max(w, x + s.w)
    x += s.w + gap
    rowH = Math.max(rowH, s.h)
  }
  return { slots, w, h: y + rowH }
}

export interface MapLayout {
  /** visible nodes in render order (parents before children) */
  visible: GNode[]
  pos: Record<string, XY> // absolute canvas coords
  size: Record<string, Size>
  hidden: Set<string>
}

/** Layout for the expand-in-place map: measure bottom-up, place top-down. */
export function layoutMap(collapsed: Set<string>): MapLayout {
  const hidden = hiddenIds(collapsed)
  const pos: Record<string, XY> = {}
  const size: Record<string, Size> = {}
  const childSlots = new Map<string, XY[]>() // offsets inside each expanded container

  function measure(id: string): Size {
    const n = byId.get(id)!
    if (n.kind === 'leaf' || collapsed.has(id)) {
      size[id] = { w: CARD_W, h: CARD_H }
      return size[id]
    }
    const kids = childrenOf.get(id) ?? []
    const packed = pack(kids.map((k) => measure(k.id)), GAP, id === ROOT_ID ? 2.8 : 2.2)
    childSlots.set(id, packed.slots)
    size[id] = { w: packed.w + 2 * PAD, h: packed.h + HEADER + PAD }
    return size[id]
  }

  function place(id: string, origin: XY) {
    pos[id] = origin
    const slots = childSlots.get(id)
    if (!slots) return
    const kids = childrenOf.get(id) ?? []
    kids.forEach((k, i) => place(k.id, { x: origin.x + PAD + slots[i].x, y: origin.y + HEADER + slots[i].y }))
  }

  // Root is the canvas itself: pack domains with generous gaps, no box drawn.
  const domains = childrenOf.get(ROOT_ID) ?? []
  const packed = pack(domains.map((d) => measure(d.id)), ROOT_GAP, 2.8)
  domains.forEach((d, i) => place(d.id, packed.slots[i]))

  const visible = nodesInRenderOrder(hidden)
  return { visible, pos, size, hidden }
}

/** Visible nodes sorted parents-first so containers render under their children. */
function nodesInRenderOrder(hidden: Set<string>): GNode[] {
  const out: GNode[] = []
  const walk = (id: string) => {
    for (const c of childrenOf.get(id) ?? []) {
      if (hidden.has(c.id)) continue
      out.push(c)
      walk(c.id)
    }
  }
  walk(ROOT_ID)
  return out
}

// ── Drill-down scope ────────────────────────────────────────────────────────
// One container per screen: its direct children, edges lifted to child
// granularity, and everything crossing the boundary aggregated into proxy
// "ports". A proxy is the external endpoint's ancestor whose parent is on the
// current path — i.e. the nearest thing you could actually navigate to.
export interface ProxyLink {
  proxyId: string
  itemId: string
  dir: 'in' | 'out'
  count: number
  types: Partial<Record<EdgeType, number>>
  type: EdgeType | 'mixed'
}

export interface DrillModel {
  items: GNode[]
  itemPos: Record<string, XY>
  itemSize: Size
  internal: LiftedEdge[]
  proxyLinks: ProxyLink[]
  inProxies: string[] // proxy ids, render order
  outProxies: string[]
}

export function deriveDrill(path: string[]): DrillModel {
  const current = path[path.length - 1]
  const pathSet = new Set(path)
  const items = childrenOf.get(current) ?? []
  const itemSet = new Set(items.map((i) => i.id))

  /** ancestor-or-self that is a direct child of `current`; null if outside. */
  const itemAncestor = (id: string): string | null => {
    let cur: GNode | undefined = byId.get(id)
    while (cur) {
      if (cur.parentId === current) return itemSet.has(cur.id) ? cur.id : null
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
    return null
  }
  /** nearest navigable container/leaf outside: first ancestor whose parent is on the path. */
  const proxyFor = (id: string): string => {
    let cur: GNode = byId.get(id)!
    while (cur.parentId && !pathSet.has(cur.parentId)) cur = byId.get(cur.parentId)!
    return cur.id
  }

  const internalAgg = new Map<string, LiftedEdge>()
  const proxyAgg = new Map<string, ProxyLink>()
  for (const e of edges) {
    const a = itemAncestor(e.source)
    const b = itemAncestor(e.target)
    if (a && b) {
      if (a === b) continue
      const key = `${a}>${b}`
      let l = internalAgg.get(key)
      if (!l) {
        l = { id: `D:${key}`, source: a, target: b, count: 0, types: {}, type: e.type }
        internalAgg.set(key, l)
      }
      l.count++
      l.types[e.type] = (l.types[e.type] ?? 0) + 1
      if (l.type !== e.type) l.type = 'mixed'
    } else if (a || b) {
      const dir: 'in' | 'out' = a ? 'out' : 'in'
      const itemId = (a ?? b)!
      const proxyId = proxyFor(a ? e.target : e.source)
      const key = `${proxyId}|${itemId}|${dir}`
      let p = proxyAgg.get(key)
      if (!p) {
        p = { proxyId, itemId, dir, count: 0, types: {}, type: e.type }
        proxyAgg.set(key, p)
      }
      p.count++
      p.types[e.type] = (p.types[e.type] ?? 0) + 1
      if (p.type !== e.type) p.type = 'mixed'
    }
  }

  const proxyLinks = [...proxyAgg.values()]
  const uniq = (dir: 'in' | 'out') => [...new Set(proxyLinks.filter((p) => p.dir === dir).map((p) => p.proxyId))].sort()

  const packed = pack(items.map(() => ({ w: CARD_W, h: CARD_H })), 26, 1.9)
  const itemPos: Record<string, XY> = {}
  items.forEach((it, i) => (itemPos[it.id] = packed.slots[i]))

  return {
    items,
    itemPos,
    itemSize: { w: CARD_W, h: CARD_H },
    internal: [...internalAgg.values()],
    proxyLinks,
    inProxies: uniq('in'),
    outProxies: uniq('out'),
  }
}

// ── Downstream choices (path-builder tree) ──────────────────────────────────
// "Where can I walk from here, following link direction?" Choices are always
// LEAVES: a leaf offers the targets of its outgoing links; a container (an
// "area") offers every leaf its subtree links to outside itself. Either way,
// after the first step the walk is leaf-to-leaf.
export interface Choice {
  id: string // target leaf
  count: number
  types: Partial<Record<EdgeType, number>>
  type: EdgeType | 'mixed'
}

export function deriveChoices(from: string): Choice[] {
  const n = byId.get(from)
  if (!n) return []
  const inside = new Set(n.kind === 'container' ? leavesUnder(from) : [from])
  const agg = new Map<string, Choice>()
  for (const e of edges) {
    if (!inside.has(e.source) || inside.has(e.target)) continue
    let c = agg.get(e.target)
    if (!c) {
      c = { id: e.target, count: 0, types: {}, type: e.type }
      agg.set(e.target, c)
    }
    c.count++
    c.types[e.type] = (c.types[e.type] ?? 0) + 1
    if (c.type !== e.type) c.type = 'mixed'
  }
  // strongest link first — "the path forward" should lead with the heavy routes
  return [...agg.values()].sort((a, b) => b.count - a.count || byId.get(a.id)!.title.localeCompare(byId.get(b.id)!.title))
}

// ── Ego (radial) neighborhood ───────────────────────────────────────────────
export interface RingLink {
  a: string
  b: string
  out: boolean // a→b direction present
  back: boolean // b→a direction present
  count: number
  type: EdgeType | 'mixed'
}

export interface EgoModel {
  focus: string
  ring1: string[]
  ring2: string[]
  parent: Map<string, string> // ring2 id -> its BFS parent in ring1
  spokes1: RingLink[] // focus ↔ ring1
  spokes2: RingLink[] // ring1 parent ↔ ring2 child (BFS tree only)
  cross: RingLink[] // everything else among visible ring nodes
  beyond: Record<string, number> // ring2 id -> links leading further out
}

const adjacency = new Map<string, { other: string; type: EdgeType; out: boolean }[]>()
for (const e of edges) {
  if (!adjacency.has(e.source)) adjacency.set(e.source, [])
  if (!adjacency.has(e.target)) adjacency.set(e.target, [])
  adjacency.get(e.source)!.push({ other: e.target, type: e.type, out: true })
  adjacency.get(e.target)!.push({ other: e.source, type: e.type, out: false })
}

function mergeLink(map: Map<string, RingLink>, a: string, b: string, type: EdgeType, out: boolean) {
  // Undirected pair key — direction is carried on the flags.
  const [ka, kb] = a < b ? [a, b] : [b, a]
  const key = `${ka}|${kb}`
  let l = map.get(key)
  if (!l) {
    l = { a: ka, b: kb, out: false, back: false, count: 0, type }
    map.set(key, l)
  }
  const forward = (a === ka) === out // does this raw edge run ka→kb?
  if (forward) l.out = true
  else l.back = true
  l.count++
  if (l.type !== type) l.type = 'mixed'
}

export function deriveEgo(focus: string): EgoModel {
  const spokes1 = new Map<string, RingLink>()
  const ring1: string[] = []
  const seen1 = new Set<string>([focus])
  for (const n of adjacency.get(focus) ?? []) {
    if (!seen1.has(n.other)) {
      seen1.add(n.other)
      ring1.push(n.other)
    }
    mergeLink(spokes1, focus, n.other, n.type, n.out)
  }

  const parentOf = new Map<string, string>() // ring2 -> its BFS parent in ring1
  const ring2: string[] = []
  for (const r1 of ring1) {
    for (const n of adjacency.get(r1) ?? []) {
      if (seen1.has(n.other) || parentOf.has(n.other)) continue
      parentOf.set(n.other, r1)
      ring2.push(n.other)
    }
  }

  const ring2Set = new Set(ring2)
  const visible = new Set([focus, ...ring1, ...ring2])
  const spokes2 = new Map<string, RingLink>()
  const cross = new Map<string, RingLink>()
  const beyond: Record<string, number> = {}
  const counted = new Set<string>() // raw edge ids already folded somewhere

  const fold = (id: string, a: string, b: string, type: EdgeType, out: boolean) => {
    if (counted.has(id)) return
    counted.add(id)
    if (a === focus || b === focus) return // already in spokes1
    const isTree = (parentOf.get(a) === b) || (parentOf.get(b) === a)
    mergeLink(isTree ? spokes2 : cross, a, b, type, out)
  }

  for (const v of visible) {
    for (const n of adjacency.get(v) ?? []) {
      if (visible.has(n.other)) {
        // raw edge key independent of traversal side
        const id = n.out ? `${v}>${n.other}:${n.type}` : `${n.other}>${v}:${n.type}`
        fold(id, v, n.other, n.type, n.out)
      } else if (ring2Set.has(v)) {
        beyond[v] = (beyond[v] ?? 0) + 1
      }
    }
  }

  return {
    focus,
    ring1,
    ring2,
    parent: parentOf,
    spokes1: [...spokes1.values()],
    spokes2: [...spokes2.values()],
    cross: [...cross.values()],
    beyond,
  }
}
