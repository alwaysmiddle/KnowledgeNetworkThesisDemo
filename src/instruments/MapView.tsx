// The Map — the ATLAS: authored hierarchy as geography. GMap '10 still draws
// the countries and ZMLT '20 still runs the zoom, but both now read the
// AUTHORED structure instead of detected communities and degree ranks:
// countries ARE the six domains (contiguous by construction — the cluster-
// first embedding anchors them before any force runs), provinces are the
// modules, cities the 53 topics, and below the topics every subtopic and
// concept has a fixed district/street position around its city. Wheel down
// and the same geography discloses depth in place — six strata, nothing ever
// moves, the map only sharpens. That's the vertical semantic zoom: the
// filtration is containment depth, not degree.
//
// Deep places carry no typed edges by design (edges are frozen at the topic
// level), so they'd read as disconnected; instead they INHERIT their topic's
// links — hover one and its topic's real edges light up, with the containment
// thread showing the "via". Cross-view glue is unchanged: pinned nodes offer
// walk/neighborhood jumps (deep places route them through their topic), the
// walk route glows amber, and the camera obeys counter-keyed `flyTo` commands.

import { useEffect, useRef, useState } from 'react'
import { Delaunay } from 'd3-delaunay'

import { byId, domainIds, domainOf, DOMAIN_COLOR, topicIds } from '../corpus/graph'
import type { XY } from '../model/derive'
import {
  FLAT_W,
  FLAT_H,
  atlasPos,
  deepBand,
  deepUnder,
  degreeOf,
  domainCapital,
  edgesTouching,
  HUB_IDS,
  leafPos,
  provinceCapital,
  provinceIds,
  provinceOf,
  spreadLabels,
  topicAnchorOf,
  treePairs,
} from '../model/flat'
import type { DeepPlace } from '../model/flat'
import { AllEdges, EdgeMarkers, HoverEdges, LeafDot } from './flatSvg'

// ── Tessellation (module-level: deterministic, computed once) ───────────────
// Sea points fill the space BETWEEN countries so no country balloons across
// empty canvas — GMap's "random points added to break up the outer faces".
// Their cells are never drawn (the pane background is the sea); they only
// bound the countries' outer cells.
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

const seaPoints: XY[] = (() => {
  const rnd = mulberry32(7)
  const out: XY[] = []
  for (let i = 0; i < 1100; i++) {
    const p = { x: -40 + rnd() * (FLAT_W + 80), y: -40 + rnd() * (FLAT_H + 80) }
    let dmin = Infinity
    for (const id of topicIds) dmin = Math.min(dmin, Math.hypot(p.x - leafPos[id].x, p.y - leafPos[id].y))
    if (dmin > 84) out.push(p)
  }
  return out
})()

const allPoints: XY[] = [...topicIds.map((id) => leafPos[id]), ...seaPoints]
const voronoi = Delaunay.from(allPoints, (p) => p.x, (p) => p.y).voronoi([-40, -40, FLAT_W + 40, FLAT_H + 40])
const cellOfTopic = new Map(topicIds.map((id, i) => [id, i]))

// ── Region outlines: merge member cells, trace the boundary, smooth it ──────
// Interior edges appear twice (once per neighboring cell, opposite direction)
// and cancel; what's left chains into closed rings. Two Chaikin rounds turn
// the raw Voronoi zigzag into the soft country shapes GMap is known for.
type Pt = [number, number]

function regionOutlines(cellIdx: number[]): Pt[][] {
  const key = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`
  const segs = new Map<string, { a: Pt; b: Pt }>()
  for (const i of cellIdx) {
    const poly = voronoi.cellPolygon(i)
    if (!poly) continue
    for (let k = 0; k + 1 < poly.length; k++) {
      const a = poly[k] as Pt
      const b = poly[k + 1] as Pt
      const ka = key(a)
      const kb = key(b)
      if (ka === kb) continue
      if (segs.delete(`${kb}|${ka}`)) continue // shared with a sibling cell — interior
      segs.set(`${ka}|${kb}`, { a, b })
    }
  }
  const byStart = new Map<string, { a: Pt; b: Pt }>()
  for (const s of segs.values()) byStart.set(key(s.a), s)
  const rings: Pt[][] = []
  const used = new Set<string>()
  for (const s of segs.values()) {
    if (used.has(key(s.a))) continue
    const ring: Pt[] = []
    let cur: { a: Pt; b: Pt } | undefined = s
    while (cur && !used.has(key(cur.a))) {
      used.add(key(cur.a))
      ring.push(cur.a)
      cur = byStart.get(key(cur.b))
    }
    if (ring.length > 2) rings.push(ring)
  }
  return rings
}

function chaikin(ring: Pt[], rounds: number): Pt[] {
  let pts = ring
  for (let r = 0; r < rounds; r++) {
    const next: Pt[] = []
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      const q = pts[(i + 1) % pts.length]
      next.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25])
      next.push([p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75])
    }
    pts = next
  }
  return pts
}

const ringsToPath = (rings: Pt[][]) =>
  rings.map((r) => `M${r.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('L')}Z`).join('')

const regionPath = (memberTopics: string[], rounds: number) =>
  ringsToPath(regionOutlines(memberTopics.map((t) => cellOfTopic.get(t)!)).map((r) => chaikin(r, rounds)))

const countryPath: Record<string, string> = {}
for (const d of domainIds) countryPath[d] = regionPath(topicIds.filter((t) => domainOf(t) === d), 2)

const provincePath: Record<string, string> = {}
const provinceParity: Record<string, number> = {}
for (const d of domainIds) {
  ;(provinceIds.filter((m) => domainOf(m) === d)).forEach((m, i) => {
    provincePath[m] = regionPath(topicIds.filter((t) => provinceOf(t) === m), 2)
    provinceParity[m] = i % 2
  })
}

// ghost labels: country names at member centroids, province names one size down
const centroidOf = (members: string[]) => ({
  x: members.reduce((s, id) => s + leafPos[id].x, 0) / members.length,
  y: members.reduce((s, id) => s + leafPos[id].y, 0) / members.length,
})
const countryLabels = spreadLabels(
  domainIds.map((d) => ({
    ...centroidOf(topicIds.filter((t) => domainOf(t) === d)),
    label: byId.get(d)!.title,
    color: DOMAIN_COLOR[d],
    key: d,
  })),
)
const provinceLabels = provinceIds.map((m) => ({
  ...centroidOf(topicIds.filter((t) => provinceOf(t) === m)),
  label: byId.get(m)!.title,
  color: DOMAIN_COLOR[domainOf(m)],
  key: m,
}))

// every deep place, with its street parent and owning topic — flat lookup
const DEEP_INFO = new Map<string, DeepPlace & { topic: string }>()
for (const t of topicIds) for (const d of deepUnder.get(t) ?? []) DEEP_INFO.set(d.id, { ...d, topic: t })

const TOTAL_PLACES = Object.keys(atlasPos).length

// lightened domain hues for the deep strata — identity stays with the domain,
// prominence falls away with depth
const mixWhite = (hex: string, f: number) => {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.round(v + (255 - v) * f)
  return `rgb(${ch((n >> 16) & 255)}, ${ch((n >> 8) & 255)}, ${ch(n & 255)})`
}

// ── Semantic-zoom strata: containment depth is the filtration ───────────────
const THRESH = [1.15, 1.9, 3.2, 4.8, 6.5]
const LEVEL_NAME = ['domains', 'modules', 'topics', 'subtopics', 'concepts', 'fine detail']
const LEVEL_S = [0.8, 1.5, 2.5, 3.9, 5.6, 7.4] // jump targets per level
const LEVEL_AT = (s: number) => THRESH.filter((t) => s >= t).length
/** deepest band (1..4 below topic) the level discloses; 0 = topics only */
const BAND_LIMIT = [0, 0, 0, 1, 2, 4]

const BAND_R = [4.4, 3.4, 2.8, 2.4] // deep dot radius (screen px) by band
const BAND_FONT = [9.5, 8.5, 8, 8]
const BAND_TINT = [0.2, 0.32, 0.42, 0.48]

const VB_X = -40
const VB_Y = -40
const VB_W = FLAT_W + 80
const VB_H = FLAT_H + 80

interface View {
  tx: number
  ty: number
  s: number
}

// the visible user-space center is ALWAYS the viewBox center (meet
// letterboxing only widens the extents symmetrically), so camera math can
// use these constants without knowing the client size
const U_CX = VB_X + VB_W / 2
const U_CY = VB_Y + VB_H / 2
const FLY_PAD = 90 // world-units margin around a fitted bbox (labels stick out right)
const FLY_S_MIN = 0.85
const FLY_S_MAX = 3.6 // past the topics threshold: a fitted neighborhood arrives disclosed to its subtopics
const FLY_MS = 650

export interface MapFlyCommand {
  /** nodes to bring into frame (unknown ids are ignored) */
  ids: string[]
  /** pin this node on arrival (traces its links, holds `ids` visible) */
  pin?: string | null
  /** fit = frame the ids' bbox; center = pan to their center, keep zoom */
  mode: 'fit' | 'center'
  /** bump to re-issue, even with identical payload */
  n: number
}

export interface MapViewProps {
  route: string[]
  onStartWalk: (id: string) => void
  onOpenNeighborhood: (id: string) => void
  visited?: Set<string>
  onFocus?: (id: string) => void
  compact?: boolean
  /** external camera command — see MapFlyCommand */
  flyTo?: MapFlyCommand | null
}

export default function MapView({ route, onStartWalk, onOpenNeighborhood, visited, onFocus, compact, flyTo = null }: MapViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ tx: 0, ty: 0, s: 1 })
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [hairball, setHairball] = useState(false)
  // the svg's client size, kept in state (refs must not be read in render)
  const [clientBox, setClientBox] = useState<{ w: number; h: number } | null>(null)
  const traced = hovered ?? pinned
  const tracedTopic = traced ? topicAnchorOf(traced) : null

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const ro = new ResizeObserver(() => {
      const r = svg.getBoundingClientRect()
      setClientBox({ w: r.width, h: r.height })
    })
    ro.observe(svg)
    return () => ro.disconnect()
  }, [])

  // ── the commandable camera ─────────────────────────────────────────────────
  // A fly is an rAF tween over the SAME view state the wheel and drag write —
  // one rendering path, and user input simply cancels the flight. The world
  // point at the viewport center interpolates linearly while scale moves
  // geometrically, the standard zoom-and-pan camera feel. All state writes
  // happen inside the rAF callbacks, never in the effect body itself.
  const viewRef = useRef(view)
  useEffect(() => {
    viewRef.current = view
  })
  const anim = useRef<number | null>(null)
  const cancelFlight = () => {
    if (anim.current != null) cancelAnimationFrame(anim.current)
    anim.current = null
  }
  useEffect(() => () => cancelFlight(), [])

  // while the fly-pinned node stays pinned, the command's ids stay visible
  // regardless of disclosure level — the "keep the neighbors on screen" hold
  const [flyHold, setFlyHold] = useState<{ pin: string | null; ids: string[] } | null>(null)

  // counter-keyed command execution, UnfoldGraphView's resetTo pattern: the
  // dep is the counter (and clientBox — a command that arrives while this
  // pane is benched at zero size waits, then executes when the box returns).
  const latestFly = useRef(flyTo)
  useEffect(() => {
    latestFly.current = flyTo
  })
  const executedFly = useRef(0)
  useEffect(() => {
    const cmd = latestFly.current
    if (!cmd || cmd.n === executedFly.current) return
    if (!clientBox || clientBox.w < 40 || clientBox.h < 40) return // benched — retry on resize
    const pts = cmd.ids.filter((id) => atlasPos[id]).map((id) => atlasPos[id])
    if (pts.length === 0) return
    executedFly.current = cmd.n
    const minX = Math.min(...pts.map((p) => p.x))
    const maxX = Math.max(...pts.map((p) => p.x))
    const minY = Math.min(...pts.map((p) => p.y))
    const maxY = Math.max(...pts.map((p) => p.y))
    // true letterboxed extents: meet can show more than the viewBox on one axis
    const f = Math.max(VB_W / clientBox.w, VB_H / clientBox.h)
    const s =
      cmd.mode === 'center'
        ? viewRef.current.s
        : Math.min(
            FLY_S_MAX,
            Math.max(FLY_S_MIN, Math.min((clientBox.w * f) / (maxX - minX + 2 * FLY_PAD), (clientBox.h * f) / (maxY - minY + 2 * FLY_PAD))),
          )
    const target = { s, tx: U_CX - ((minX + maxX) / 2) * s, ty: U_CY - ((minY + maxY) / 2) * s }
    if (anim.current != null) cancelAnimationFrame(anim.current)
    const from = viewRef.current
    const c0 = { x: (U_CX - from.tx) / from.s, y: (U_CY - from.ty) / from.s }
    const c1 = { x: (U_CX - target.tx) / target.s, y: (U_CY - target.ty) / target.s }
    const t0 = performance.now()
    let started = false
    const tick = (now: number) => {
      if (!started) {
        started = true
        setPinned(cmd.pin ?? null)
        setFlyHold({ pin: cmd.pin ?? null, ids: cmd.ids })
      }
      const t = Math.min(1, (now - t0) / FLY_MS)
      const e = 1 - Math.pow(1 - t, 3) // cubic ease-out
      const sNow = from.s * Math.pow(target.s / from.s, e)
      const cx = c0.x + (c1.x - c0.x) * e
      const cy = c0.y + (c1.y - c0.y) * e
      setView({ s: sNow, tx: U_CX - cx * sNow, ty: U_CY - cy * sNow })
      anim.current = t < 1 ? requestAnimationFrame(tick) : null
    }
    anim.current = requestAnimationFrame(tick)
  }, [flyTo?.n, clientBox])

  const level = LEVEL_AT(view.s)

  // The viewport in world coords — the TRUE letterboxed one (meet can show
  // more than the viewBox on one axis), used for deep-strata culling.
  const f = clientBox ? Math.max(VB_W / clientBox.w, VB_H / clientBox.h) : 1
  const worldRect = {
    x: (VB_X - (clientBox ? (clientBox.w * f - VB_W) / 2 : 0) - view.tx) / view.s,
    y: (VB_Y - (clientBox ? (clientBox.h * f - VB_H) / 2 : 0) - view.ty) / view.s,
    w: (clientBox ? clientBox.w * f : VB_W) / view.s,
    h: (clientBox ? clientBox.h * f : VB_H) / view.s,
  }
  const onScreen = (p: XY, margin: number) =>
    p.x > worldRect.x - margin && p.x < worldRect.x + worldRect.w + margin && p.y > worldRect.y - margin && p.y < worldRect.y + worldRect.h + margin

  // ── What the current stratum discloses ─────────────────────────────────────
  // Cities: capitals only from afar (domain capitals at L0, + province
  // capitals at L1), every topic from L2. Route, visited, pins, and fly-held
  // neighborhoods stay on the map whatever the altitude.
  const visible = new Set<string>()
  if (level >= 2) for (const t of topicIds) visible.add(t)
  else {
    for (const c of domainCapital.values()) visible.add(c)
    if (level >= 1) for (const c of provinceCapital.values()) visible.add(c)
  }
  for (const id of route) visible.add(id)
  for (const id of visited ?? []) if (atlasPos[id]) visible.add(id)
  if (pinned && atlasPos[pinned]) visible.add(pinned)
  if (tracedTopic) visible.add(tracedTopic) // a deep trace needs its topic's edges on screen
  // a flown-to neighborhood stays on screen while its pin holds
  if (flyHold?.pin && pinned === flyHold.pin) for (const id of flyHold.ids) if (atlasPos[id]) visible.add(id)

  // Districts and streets: deep bands within the level's reach, culled to
  // topics near the viewport (at street altitude only a few cities fit the
  // screen anyway — the DOM stays small).
  const bandLimit = BAND_LIMIT[level]
  const deepShown: (DeepPlace & { topic: string })[] = []
  if (bandLimit > 0) {
    for (const t of topicIds) {
      if (!onScreen(leafPos[t], 60)) continue
      for (const d of deepUnder.get(t) ?? []) if (d.band <= bandLimit) deepShown.push({ ...d, topic: t })
    }
  }
  // force-held deep places (a fly can pin one at any altitude)
  for (const id of visible) {
    const info = DEEP_INFO.get(id)
    if (info && !(info.band <= bandLimit && onScreen(leafPos[info.topic], 60))) deepShown.push(info)
  }

  // client px -> viewBox user coords (before the pan/zoom transform)
  const toUser = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    // preserveAspectRatio=meet: uniform scale, centered
    const f = Math.max(VB_W / rect.width, VB_H / rect.height)
    return {
      x: VB_X + (clientX - rect.left - (rect.width - VB_W / f) / 2) * f,
      y: VB_Y + (clientY - rect.top - (rect.height - VB_H / f) / 2) * f,
    }
  }

  // React registers wheel passively; zoom needs preventDefault, so attach raw.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      cancelFlight() // user input takes the camera back instantly
      const u = toUser(ev.clientX, ev.clientY)
      setView((v) => {
        const s = Math.min(9, Math.max(0.65, v.s * Math.exp(-ev.deltaY * 0.0016)))
        return { s, tx: u.x - ((u.x - v.tx) / v.s) * s, ty: u.y - ((u.y - v.ty) / v.s) * s }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const drag = useRef<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const jumpToLevel = (l: number) => {
    const targetS = LEVEL_S[l]
    // keep the canvas center fixed while jumping levels
    const cx = VB_X + VB_W / 2
    const cy = VB_Y + VB_H / 2
    setView((v) => ({ s: targetS, tx: cx - ((cx - v.tx) / v.s) * targetS, ty: cy - ((cy - v.ty) / v.s) * targetS }))
  }

  const beyondCount = tracedTopic
    ? edgesTouching(tracedTopic).filter((e) => !visible.has(e.source) || !visible.has(e.target)).length
    : 0

  // muting under a trace: the traced topic's own district plus its linked
  // topics stay bright, the rest of the map recedes
  const tracedNeighbors = (() => {
    if (!tracedTopic) return null
    const s = new Set<string>([tracedTopic])
    if (traced) s.add(traced)
    for (const e of edgesTouching(tracedTopic)) {
      if (visible.has(e.source) && visible.has(e.target)) {
        s.add(e.source)
        s.add(e.target)
      }
    }
    return s
  })()

  // the containment thread: a traced deep place hangs off its topic — draw the
  // chain so "these links arrive via the city" reads on the map itself
  const thread: XY[] = []
  if (traced && DEEP_INFO.has(traced)) {
    let cur = traced
    while (DEEP_INFO.has(cur)) {
      thread.push(atlasPos[cur])
      cur = DEEP_INFO.get(cur)!.parent
    }
    thread.push(atlasPos[cur])
  }

  const hubNote = (() => {
    if (!tracedTopic || !HUB_IDS.includes(tracedTopic)) return null
    const span = new Set<string>()
    for (const e of edgesTouching(tracedTopic)) {
      span.add(domainOf(e.source))
      span.add(domainOf(e.target))
    }
    return `${byId.get(tracedTopic)!.title} is a hub: its links span ${span.size} of the ${domainIds.length} domains.`
  })()

  // country names behave like Google Maps labels: roughly constant on screen,
  // fading as you descend toward street level
  const labelSize = 30 / Math.sqrt(view.s)
  const labelOpacity = Math.max(0.1, 0.32 - (view.s - 1) * 0.07)

  const pinnedDeep = pinned ? DEEP_INFO.get(pinned) : undefined
  const pinnedTopic = pinned ? topicAnchorOf(pinned) : null

  return (
    <div className="relative h-full" style={{ background: '#eef4f8' }}>
      <svg
        ref={svgRef}
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        className="w-full h-full"
        data-tx={view.tx.toFixed(1)}
        data-ty={view.ty.toFixed(1)}
        data-zoom={view.s.toFixed(2)}
        data-level={level}
        style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={(ev) => {
          cancelFlight()
          drag.current = { x: ev.clientX, y: ev.clientY }
          setDragging(true)
          ;(ev.target as Element).setPointerCapture(ev.pointerId)
        }}
        onPointerMove={(ev) => {
          if (!drag.current) return
          const rect = svgRef.current!.getBoundingClientRect()
          const f = Math.max(VB_W / rect.width, VB_H / rect.height)
          const dx = (ev.clientX - drag.current.x) * f
          const dy = (ev.clientY - drag.current.y) * f
          drag.current = { x: ev.clientX, y: ev.clientY }
          setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }))
        }}
        onPointerUp={() => {
          drag.current = null
          setDragging(false)
        }}
        onClick={() => setPinned(null)}
      >
        <EdgeMarkers />
        <defs>
          <marker id="arr-route" viewBox="0 0 8 8" refX={7} refY={4} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
            <path d="M0,0.5 L7.5,4 L0,7.5 Z" fill="#f59e0b" />
          </marker>
        </defs>

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.s})`}>
          {/* countries: one smoothed shape per authored domain — always there,
              like landmasses; the sea is simply the pane background */}
          <g>
            {domainIds.map((d) => (
              <path
                key={d}
                d={countryPath[d]}
                fill={DOMAIN_COLOR[d]}
                fillOpacity={0.16}
                stroke={DOMAIN_COLOR[d]}
                strokeOpacity={0.5}
                strokeWidth={1.6 / view.s}
              />
            ))}
          </g>

          {/* provinces: the modules, revealed one stratum in */}
          <g style={{ opacity: level >= 1 ? 1 : 0, transition: 'opacity 350ms' }}>
            {provinceIds.map((m) => (
              <path
                key={m}
                d={provincePath[m]}
                fill={DOMAIN_COLOR[domainOf(m)]}
                fillOpacity={provinceParity[m] ? 0.08 : 0}
                stroke="#ffffff"
                strokeOpacity={0.85}
                strokeWidth={1.2 / view.s}
              />
            ))}
          </g>

          {/* ghost country names */}
          <g pointerEvents="none">
            {countryLabels.map((c) => (
              <text key={c.key} x={c.x} y={c.y} textAnchor="middle" fontSize={labelSize} fontWeight={800} fill={c.color} opacity={labelOpacity} style={{ userSelect: 'none' }}>
                {c.label}
              </text>
            ))}
          </g>
          {/* province names, one size down, gone again by street level */}
          <g pointerEvents="none" style={{ opacity: level >= 1 && level <= 3 ? 0.55 : 0, transition: 'opacity 350ms' }}>
            {provinceLabels.map((m) => (
              <text key={m.key} x={m.x} y={m.y} textAnchor="middle" fontSize={13 / Math.sqrt(view.s)} fontWeight={700} fill={m.color} style={{ userSelect: 'none' }}>
                {m.label}
              </text>
            ))}
          </g>

          {/* the road network: real tree edges among currently visible nodes */}
          <g>
            {treePairs.map((p) => {
              if (!visible.has(p.a) || !visible.has(p.b)) return null
              return (
                <line
                  key={`${p.a}|${p.b}`}
                  x1={leafPos[p.a].x}
                  y1={leafPos[p.a].y}
                  x2={leafPos[p.b].x}
                  y2={leafPos[p.b].y}
                  stroke="#94a3b8"
                  strokeWidth={(0.8 + p.w * 0.7) / view.s}
                  opacity={0.55}
                />
              )
            })}
          </g>

          {/* streets: containment segments — the local roads of each district */}
          {deepShown.length > 0 && (
            <g>
              {deepShown.map((d) => {
                const a = atlasPos[d.parent]
                const b = atlasPos[d.id]
                return (
                  <line
                    key={`s-${d.id}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#94a3b8"
                    strokeWidth={(1.3 - d.band * 0.2) / view.s}
                    opacity={0.5}
                  />
                )
              })}
            </g>
          )}

          {hairball && <AllEdges visible={visible} />}

          {/* visited nodes: quiet dashed slate rings, deliberately distinct from
              the amber route channel and the six saturated domain hues */}
          {visited && visited.size > 0 && (
            <g pointerEvents="none">
              {[...visited].map((id) =>
                visible.has(id) && atlasPos[id] ? (
                  <circle
                    key={`v-${id}`}
                    data-visited={id}
                    cx={atlasPos[id].x}
                    cy={atlasPos[id].y}
                    r={10 / view.s}
                    fill="none"
                    stroke="#475569"
                    strokeWidth={1.6 / view.s}
                    strokeDasharray="3 3"
                    opacity={0.65}
                  />
                ) : null,
              )}
            </g>
          )}

          {/* the walk route, glowing amber across the geography */}
          {route.length > 0 && (
            <g pointerEvents="none">
              {route.slice(1).map((id, i) => {
                const a = atlasPos[route[i]]
                const b = atlasPos[id]
                const d = Math.max(0.01, Math.hypot(b.x - a.x, b.y - a.y))
                const pad = 14 / view.s / d
                return (
                  <line
                    key={`r${i}`}
                    x1={a.x + (b.x - a.x) * pad}
                    y1={a.y + (b.y - a.y) * pad}
                    x2={b.x - (b.x - a.x) * pad}
                    y2={b.y - (b.y - a.y) * pad}
                    stroke="#f59e0b"
                    strokeWidth={3.2 / view.s}
                    opacity={0.85}
                    markerEnd="url(#arr-route)"
                  />
                )
              })}
              {route.map((id, i) => (
                <g key={`rn${i}-${id}`}>
                  <circle cx={atlasPos[id].x} cy={atlasPos[id].y} r={13 / view.s} fill="none" stroke="#f59e0b" strokeWidth={2.4 / view.s} opacity={0.9} />
                  <text x={atlasPos[id].x} y={atlasPos[id].y - 17 / view.s} textAnchor="middle" fontSize={11 / view.s} fontWeight={800} fill="#b45309" style={{ userSelect: 'none' }}>
                    {i + 1}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* the containment thread: a traced deep place back up to its city */}
          {thread.length > 1 && (
            <g pointerEvents="none">
              <polyline
                points={thread.map((p) => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="#475569"
                strokeWidth={1.6 / view.s}
                strokeDasharray={`${4 / view.s} ${3 / view.s}`}
                opacity={0.85}
              />
            </g>
          )}

          <HoverEdges traced={tracedTopic} visible={visible} scale={view.s} />

          {/* deep places: districts (subtopics) and streets' ends (concepts) */}
          <g>
            {deepShown.map((d) => {
              const p = atlasPos[d.id]
              const color = mixWhite(DOMAIN_COLOR[domainOf(d.id)], BAND_TINT[d.band - 1])
              const dim = !!tracedNeighbors && !tracedNeighbors.has(d.id) && d.topic !== tracedTopic
              // label on the side away from the parent, so a child left of its
              // parent doesn't run its text back over the parent's label
              const away = p.x >= atlasPos[d.parent].x
              return (
                <g
                  key={d.id}
                  opacity={dim ? 0.3 : 1}
                  style={{ cursor: 'pointer', transition: 'opacity 160ms ease' }}
                  onMouseEnter={() => setHovered(d.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    setPinned((prev) => (prev === d.id ? null : d.id))
                    onFocus?.(d.id)
                  }}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={BAND_R[d.band - 1] / view.s}
                    fill={color}
                    stroke={d.id === traced ? '#f59e0b' : '#ffffff'}
                    strokeWidth={(d.id === traced ? 2 : 0.9) / view.s}
                  />
                  <text
                    x={away ? p.x + (BAND_R[d.band - 1] + 3.5) / view.s : p.x - (BAND_R[d.band - 1] + 3.5) / view.s}
                    y={p.y + 2.8 / view.s}
                    textAnchor={away ? undefined : 'end'}
                    fontSize={BAND_FONT[d.band - 1] / view.s}
                    fontWeight={d.id === traced ? 700 : 500}
                    fill="#475569"
                    style={{ userSelect: 'none' }}
                  >
                    {byId.get(d.id)!.title}
                  </text>
                </g>
              )
            })}
          </g>

          {/* cities: the 53 edge-bearing topics */}
          <g>
            {topicIds.map((id) => {
              if (!visible.has(id)) return null
              return (
                <LeafDot
                  key={id}
                  id={id}
                  r={4.5 + Math.sqrt(degreeOf.get(id)!) * 1.1}
                  scale={view.s}
                  labelSize={11}
                  muted={!!tracedNeighbors && !tracedNeighbors.has(id)}
                  hi={id === traced}
                  onEnter={setHovered}
                  onLeave={() => setHovered(null)}
                  onClick={(n) => {
                    setPinned((prev) => (prev === n ? null : n))
                    onFocus?.(n)
                  }}
                />
              )
            })}
          </g>

          {/* ★ domain capitals — the six cities named even from orbit */}
          <g pointerEvents="none">
            {domainIds.map((d) => {
              const cap = domainCapital.get(d)!
              const rr = 4.5 + Math.sqrt(degreeOf.get(cap)!) * 1.1
              return (
                <text
                  key={cap}
                  x={leafPos[cap].x - (rr + 5) / view.s}
                  y={leafPos[cap].y + 3.5 / view.s}
                  textAnchor="end"
                  fontSize={11 / view.s}
                  fontWeight={800}
                  fill={DOMAIN_COLOR[d]}
                  style={{ userSelect: 'none' }}
                >
                  ★
                </text>
              )
            })}
          </g>
        </g>
      </svg>

      {!compact && (
        <div className="absolute top-3 left-3 z-10 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-2 text-[11px] text-slate-600 max-w-[560px]">
          <div className="font-bold text-slate-800 text-[12px]">Atlas — authored hierarchy as geography, depth as the zoom</div>
          <div className="mt-0.5">
            Countries ARE the six domains (cluster-first layout, contiguous by construction), provinces the modules, cities the
            {' '}{topicIds.length} topics — and below them every subtopic and concept holds a fixed district or street address.
            Wheel down and the same geography discloses the next stratum in place; nothing ever moves.
          </div>
          {hubNote ? (
            <div className="mt-1 text-amber-700 font-medium">{hubNote}</div>
          ) : (
            <div className="mt-1 text-slate-400">
              wheel to zoom through the six strata · drag to pan · hover for real links (deep places inherit their city's) · click to pin
              {tracedTopic && beyondCount > 0 && (
                <span className="text-amber-700 font-medium"> · {beyondCount} of {byId.get(tracedTopic)!.title}'s links lead beyond this level</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 text-[11px] text-slate-600">
        <span className="text-slate-400">level</span>
        <div className="flex rounded border border-slate-300 overflow-hidden">
          {LEVEL_NAME.map((name, l) => (
            <button
              key={l}
              onClick={() => jumpToLevel(l)}
              className={`px-2 py-0.5 ${level === l ? 'bg-slate-700 text-white font-semibold' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              title={`L${l} · ${name}`}
            >
              {compact ? `L${l}` : `L${l} · ${name}`}
            </button>
          ))}
        </div>
        <span className="text-slate-400">
          {[...visible].filter((id) => !deepBand.has(id)).length + deepShown.length} of {TOTAL_PLACES} places · zoom ×{view.s.toFixed(2)}
        </span>
        <span className="w-px h-4 bg-slate-200" />
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={hairball} onChange={(ev) => setHairball(ev.target.checked)} />
          all edges
        </label>
      </div>

      {/* pinned selection: the jumps into the other navigation modes.
          Deep places route both jumps through their topic — that's where the
          typed links live. */}
      {pinned && pinnedTopic && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 text-[11px]">
          <span className="font-semibold" style={{ color: DOMAIN_COLOR[domainOf(pinned)] }}>
            {byId.get(pinned)!.title}
          </span>
          {pinnedDeep ? (
            <span className="text-slate-400">
              inside {byId.get(pinnedTopic)!.title} · {edgesTouching(pinnedTopic).length} links via it
            </span>
          ) : (
            <span className="text-slate-400">{edgesTouching(pinned).length} links</span>
          )}
          <span className="w-px h-4 bg-slate-200" />
          <button
            onClick={() => onStartWalk(pinnedTopic)}
            className="px-2 py-0.5 rounded border border-amber-400 text-amber-700 hover:bg-amber-50 font-medium"
          >
            ▶ {pinnedDeep ? `walk from ${byId.get(pinnedTopic)!.title}` : 'start walk here'}
          </button>
          <button
            onClick={() => onOpenNeighborhood(pinnedTopic)}
            className="px-2 py-0.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium"
          >
            ◳ open neighborhood
          </button>
        </div>
      )}
    </div>
  )
}
