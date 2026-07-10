// Shared substrate for the flat (non-compound) paper views — E·GMap,
// F·Contours, G·ZMLT. ONE deterministic force embedding of all topic leaves,
// structural communities (CNM modularity, ported from the analysis script),
// a max-weight spanning tree (ZMLT's backbone) and importance ranks.
// All three views render THESE positions, so switching tabs changes only
// what each paper says to draw around them — never where anything sits.

import { byId, domainOf, DOMAIN_COLOR, edges, leafIds } from './graph'
import type { GEdge } from './graph'
import type { XY } from './derive'

export const FLAT_W = 1200
export const FLAT_H = 780

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ── Undirected collapse: pair weights and degrees ───────────────────────────
const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

const pairWeight = new Map<string, number>()
for (const e of edges) {
  const k = pairKey(e.source, e.target)
  pairWeight.set(k, (pairWeight.get(k) ?? 0) + 1)
}
export interface Pair {
  a: string
  b: string
  w: number
}
export const pairs: Pair[] = [...pairWeight].map(([k, w]) => {
  const [a, b] = k.split('|')
  return { a, b, w }
})

export const degreeOf = new Map<string, number>(leafIds.map((id) => [id, 0]))
for (const { a, b, w } of pairs) {
  degreeOf.set(a, degreeOf.get(a)! + w)
  degreeOf.set(b, degreeOf.get(b)! + w)
}

// Hubs are COMPUTED, not declared: the five busiest topics by total link
// degree. With authored edges, which topics are central is itself a finding.
export const HUB_IDS = [...leafIds].sort((a, b) => degreeOf.get(b)! - degreeOf.get(a)! || a.localeCompare(b)).slice(0, 5)

const rawAdj = new Map<string, GEdge[]>()
for (const e of edges) {
  if (!rawAdj.has(e.source)) rawAdj.set(e.source, [])
  if (!rawAdj.has(e.target)) rawAdj.set(e.target, [])
  rawAdj.get(e.source)!.push(e)
  rawAdj.get(e.target)!.push(e)
}
/** every raw edge touching a leaf, either direction */
export const edgesTouching = (id: string): GEdge[] => rawAdj.get(id) ?? []

// ── Community detection: CNM greedy modularity maximization ─────────────────
// Direction collapsed, weight = parallel-edge count. Merges the best pair of
// connected communities until one remains, keeps the partition with max Q.
function detectCommunities(): { groups: string[][]; Q: number } {
  const index = new Map(leafIds.map((id, i) => [id, i]))
  const twoM = 2 * edges.length

  const comm = new Map<number, Set<number>>(leafIds.map((_, i) => [i, new Set([i])]))
  const a = new Map<number, number>(leafIds.map((id, i) => [i, degreeOf.get(id)! / twoM]))
  const e = new Map<string, number>() // "ci|cj" ci<cj -> edge fraction between
  for (const p of pairs) {
    const i = index.get(p.a)!
    const j = index.get(p.b)!
    e.set(i < j ? `${i}|${j}` : `${j}|${i}`, p.w / twoM)
  }
  const getE = (x: number, y: number) => (x === y ? 0 : e.get(x < y ? `${x}|${y}` : `${y}|${x}`) ?? 0)
  const setE = (x: number, y: number, v: number) => {
    if (x === y) return
    const k = x < y ? `${x}|${y}` : `${y}|${x}`
    if (v === 0) e.delete(k)
    else e.set(k, v)
  }
  const neighborsOf = (ci: number) => {
    const out: number[] = []
    for (const key of e.keys()) {
      const [x, y] = key.split('|').map(Number)
      if (x === ci) out.push(y)
      else if (y === ci) out.push(x)
    }
    return out
  }

  let Q = -[...a.values()].reduce((s, v) => s + v * v, 0)
  let best = { Q, groups: [...comm.values()].map((s) => [...s]) }

  while (comm.size > 1) {
    let bestPair: { ci: number; cj: number; dQ: number } | null = null
    for (const key of e.keys()) {
      const [i, j] = key.split('|').map(Number)
      const dQ = 2 * (e.get(key)! - a.get(i)! * a.get(j)!)
      if (!bestPair || dQ > bestPair.dQ) bestPair = { ci: i, cj: j, dQ }
    }
    if (!bestPair) break // disconnected remainder — cannot happen, corpus is connected
    const { ci, cj, dQ } = bestPair
    for (const x of neighborsOf(cj)) {
      if (x === ci) continue
      setE(ci, x, getE(ci, x) + getE(cj, x))
      setE(cj, x, 0)
    }
    setE(ci, cj, 0)
    for (const v of comm.get(cj)!) comm.get(ci)!.add(v)
    comm.delete(cj)
    a.set(ci, a.get(ci)! + a.get(cj)!)
    a.delete(cj)
    Q += dQ
    if (Q > best.Q) best = { Q, groups: [...comm.values()].map((s) => [...s]) }
  }

  const groups = best.groups
    .map((g) => g.map((i) => leafIds[i]).sort())
    .sort((x, y) => y.length - x.length || x[0].localeCompare(y[0]))
  return { groups, Q: best.Q }
}

const detected = detectCommunities()
export const modularityQ = detected.Q
export const communities: string[][] = detected.groups
export const communityOf = new Map<string, number>()
communities.forEach((members, ci) => members.forEach((id) => communityOf.set(id, ci)))

// Communities inherit the color of their dominant authored domain — the 88%
// agreement is the story, so the palettes should agree too. A domain that
// splits across communities gets a lightened variant for the second piece.
const mixWhite = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(v + (255 - v) * f)
  return `rgb(${ch((n >> 16) & 255)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`
}
export const communityColor: string[] = []
export const communityLabel: string[] = []
{
  const timesSeen = new Map<string, number>()
  for (const members of communities) {
    const count = new Map<string, number>()
    for (const id of members) count.set(domainOf(id), (count.get(domainOf(id)) ?? 0) + 1)
    const dom = [...count].sort((x, y) => y[1] - x[1])[0][0]
    const nth = timesSeen.get(dom) ?? 0
    timesSeen.set(dom, nth + 1)
    communityColor.push(nth === 0 ? DOMAIN_COLOR[dom] : mixWhite(DOMAIN_COLOR[dom], 0.42 * nth))
    communityLabel.push(nth === 0 ? byId.get(dom)!.title : `${byId.get(dom)!.title} ${['II', 'III', 'IV'][nth - 1]}`)
  }
}

/** fraction of leaves whose community agrees with its dominant authored domain */
export const domainPurity =
  communities.reduce((sum, members) => {
    const count = new Map<string, number>()
    for (const id of members) count.set(domainOf(id), (count.get(domainOf(id)) ?? 0) + 1)
    return sum + Math.max(...count.values())
  }, 0) / leafIds.length

/** hub id -> how many distinct communities its neighbors span (incl. its own) */
export const hubBridging = new Map<string, number>(
  HUB_IDS.map((hub) => {
    const touched = new Set<number>([communityOf.get(hub)!])
    for (const e of edges) {
      if (e.source === hub) touched.add(communityOf.get(e.target)!)
      if (e.target === hub) touched.add(communityOf.get(e.source)!)
    }
    return [hub, touched.size]
  }),
)

// ── The one shared embedding: weighted Fruchterman–Reingold, seeded ─────────
function embed(): Record<string, XY> {
  const rnd = mulberry32(97)
  const n = leafIds.length
  const index = new Map(leafIds.map((id, i) => [id, i]))
  const px = new Float64Array(n)
  const py = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    px[i] = (rnd() - 0.5) * FLAT_W * 0.7
    py[i] = (rnd() - 0.5) * FLAT_H * 0.7
  }

  const k = 0.85 * Math.sqrt((FLAT_W * FLAT_H) / n)
  // sub-linear weight so heavy pairs pull firmly without collapsing onto each other
  const springs = pairs.map((p) => ({ i: index.get(p.a)!, j: index.get(p.b)!, w: Math.pow(p.w, 0.6) }))
  const ITER = 600
  const dx = new Float64Array(n)
  const dy = new Float64Array(n)

  for (let it = 0; it < ITER; it++) {
    const t = Math.max(2, 110 * (1 - it / ITER))
    dx.fill(0)
    dy.fill(0)
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let vx = px[i] - px[j]
        let vy = py[i] - py[j]
        let d = Math.hypot(vx, vy)
        if (d < 0.01) {
          // deterministic tiny separation for coincident points
          vx = 0.01 * ((i * 7919 + j) % 13 - 6)
          vy = 0.01 * ((i * 104729 + j) % 17 - 8)
          d = Math.hypot(vx, vy)
        }
        const f = (k * k) / d / d // repulsion k²/d, spread over the unit vector
        dx[i] += vx * f
        dy[i] += vy * f
        dx[j] -= vx * f
        dy[j] -= vy * f
      }
    }
    for (const s of springs) {
      const vx = px[s.j] - px[s.i]
      const vy = py[s.j] - py[s.i]
      const d = Math.max(0.01, Math.hypot(vx, vy))
      const f = ((d * d) / k) * s.w * 0.06 / d
      dx[s.i] += vx * f
      dy[s.i] += vy * f
      dx[s.j] -= vx * f
      dy[s.j] -= vy * f
    }
    for (let i = 0; i < n; i++) {
      // weak gravity keeps the periphery from drifting off
      dx[i] -= px[i] * 0.03
      dy[i] -= py[i] * 0.03
      const len = Math.hypot(dx[i], dy[i])
      const cap = Math.min(len, t)
      if (len > 0.01) {
        px[i] += (dx[i] / len) * cap
        py[i] += (dy[i] / len) * cap
      }
    }
  }

  // normalize into a padded canvas box, preserving aspect
  const PADX = 90
  const PADY = 70
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, px[i]); maxX = Math.max(maxX, px[i])
    minY = Math.min(minY, py[i]); maxY = Math.max(maxY, py[i])
  }
  const scale = Math.min((FLAT_W - 2 * PADX) / (maxX - minX), (FLAT_H - 2 * PADY) / (maxY - minY))
  for (let i = 0; i < n; i++) {
    px[i] = PADX + (px[i] - minX) * scale + (FLAT_W - 2 * PADX - (maxX - minX) * scale) / 2
    py[i] = PADY + (py[i] - minY) * scale + (FLAT_H - 2 * PADY - (maxY - minY) * scale) / 2
  }

  // overlap relaxation so labels stay legible
  const MIN = 44
  for (let round = 0; round < 80; round++) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const vx = px[j] - px[i]
        const vy = py[j] - py[i]
        const d = Math.max(0.01, Math.hypot(vx, vy))
        if (d >= MIN) continue
        const push = (MIN - d) / 2 / d
        px[i] -= vx * push
        py[i] -= vy * push
        px[j] += vx * push
        py[j] += vy * push
      }
    }
  }

  const out: Record<string, XY> = {}
  leafIds.forEach((id, i) => (out[id] = { x: px[i], y: py[i] }))
  return out
}
export const leafPos: Record<string, XY> = embed()

// ── Max-weight spanning tree: the "road network" ZMLT filters along ─────────
function maxSpanningTree(): Pair[] {
  const sorted = [...pairs].sort((x, y) => y.w - x.w || pairKey(x.a, x.b).localeCompare(pairKey(y.a, y.b)))
  const parent = new Map<string, string>(leafIds.map((id) => [id, id]))
  const find = (x: string): string => {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)!)!)
      x = parent.get(x)!
    }
    return x
  }
  const out: Pair[] = []
  for (const p of sorted) {
    const ra = find(p.a)
    const rb = find(p.b)
    if (ra === rb) continue
    parent.set(ra, rb)
    out.push(p)
    if (out.length === leafIds.length - 1) break
  }
  return out
}
export const treePairs: Pair[] = maxSpanningTree()

// ── Importance filtration (ZMLT levels) ─────────────────────────────────────
export const importanceOrder = [...leafIds].sort(
  (a, b) => degreeOf.get(b)! - degreeOf.get(a)! || a.localeCompare(b),
)

// BFS parents on the tree, rooted at the most important node: the level-k
// subgraph is the union of tree paths from each top-k terminal to the root —
// i.e. the minimal subtree containing all terminals. Real nodes only, and
// monotone: zooming in only ever ADDS nodes (ZMLT's persistence property).
const treeParent = new Map<string, string | null>()
{
  const adj = new Map<string, string[]>(leafIds.map((id) => [id, []]))
  for (const p of treePairs) {
    adj.get(p.a)!.push(p.b)
    adj.get(p.b)!.push(p.a)
  }
  const root = importanceOrder[0]
  treeParent.set(root, null)
  const queue = [root]
  while (queue.length) {
    const cur = queue.shift()!
    for (const nb of adj.get(cur)!) {
      if (treeParent.has(nb)) continue
      treeParent.set(nb, cur)
      queue.push(nb)
    }
  }
}

/** Push overlapping ghost labels apart vertically (group/country names). */
export function spreadLabels<T extends XY>(labels: T[]): T[] {
  const out = labels.map((l) => ({ ...l }))
  for (let round = 0; round < 30; round++) {
    for (let i = 0; i < out.length; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const dx = Math.abs(out[i].x - out[j].x)
        const dy = out[j].y - out[i].y
        if (dx > 190 || Math.abs(dy) > 42) continue
        const push = (42 - Math.abs(dy)) / 2 + 1
        const sign = dy >= 0 ? 1 : -1
        out[i].y -= sign * push
        out[j].y += sign * push
      }
    }
  }
  return out
}

export function levelSet(topK: number): Set<string> {
  const out = new Set<string>()
  for (const t of importanceOrder.slice(0, topK)) {
    let cur: string | null = t
    while (cur !== null && !out.has(cur)) {
      out.add(cur)
      cur = treeParent.get(cur) ?? null
    }
  }
  return out
}

// ── Countries: the map's unit of disclosure ─────────────────────────────────
// GMap's color/shape and ZMLT's filtration used to be gated separately, which
// let cities appear on uncolored ground. One record per country now joins the
// two papers' halves — identity (label, color), anchor (capital), and the
// importance ranking the zoom walks down — so a country reveals as ONE thing.
const importanceRank = new Map(importanceOrder.map((id, i) => [id, i]))

export interface Country {
  label: string
  color: string
  capital: string // most important member: the one node shown even undisclosed
  byRank: string[] // all members, most important first — the zoom's descent order
}

export const countries: Country[] = communities.map((members, ci) => {
  const byRank = [...members].sort((a, b) => importanceRank.get(a)! - importanceRank.get(b)!)
  return { label: communityLabel[ci], color: communityColor[ci], capital: byRank[0], byRank }
})

// The level set for a PER-COUNTRY depth vector: country ci contributes its
// top-k[ci] members. Terminals are still closed over the spanning tree, so the
// set stays connected and monotone (ZMLT's persistence property) — closure may
// pull in a few pass-through nodes from shallower countries: roads need towns.
export function countryLevelSet(kByCountry: number[]): Set<string> {
  const out = new Set<string>()
  countries.forEach((c, ci) => {
    for (const t of c.byRank.slice(0, kByCountry[ci])) {
      let cur: string | null = t
      while (cur !== null && !out.has(cur)) {
        out.add(cur)
        cur = treeParent.get(cur) ?? null
      }
    }
  })
  return out
}
