// The Map — E·GMap '10 and G·ZMLT '20 merged into one view. The two papers
// turn out to compose rather than conflict: GMap's tessellation is computed
// purely from node POSITIONS, and ZMLT's filtration never moves anything, so
// the countries sit under the zoomable canvas as a permanent background —
// the same map whether 10 or 50 cities are disclosed at your altitude.
// One change to ZMLT's filtration: the COUNTRY is the unit of disclosure.
// Zoom sets a depth (top-1 / top-3 / top-10), but a country only descends past
// its capital while that ★ capital is on screen — color, shape, and cities
// arrive together, so cities never stand on uncolored ground.
//
// Cross-view glue lives here too: a pinned node offers "start walk" and
// "open neighborhood", and the current walk route glows amber on the map.
// The camera itself is commandable from outside via the counter-keyed
// `flyTo` prop (same pattern as UnfoldGraphView's resetTo): Studio flies
// the map to whatever the user is exploring in the OTHER instruments —
// 'fit' frames a set of nodes (an unfold neighborhood, a whole walk path),
// 'center' pans to one node at the current altitude. While a fly-pinned
// node stays pinned, the command's ids are held visible whatever the
// disclosure level says — that's the "keep the neighbors on screen" half
// of the sync.

import { useEffect, useRef, useState } from 'react'
import { Delaunay } from 'd3-delaunay'

import { byId, domainOf, DOMAIN_COLOR, topicIds } from './graph'
import type { XY } from './derive'
import {
  FLAT_W,
  FLAT_H,
  countries,
  communityOf,
  countryLevelSet,
  levelSet,
  degreeOf,
  domainPurity,
  hubBridging,
  leafPos,
  modularityQ,
  spreadLabels,
  edgesTouching,
  treePairs,
} from './flat'
import { AllEdges, EdgeMarkers, HoverEdges, LeafDot } from './flatSvg'

// ── Tessellation (module-level: deterministic, computed once) ───────────────
// Sea points fill the space BETWEEN countries so no country balloons across
// empty canvas — GMap's "random points added to break up the outer faces".
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

const leafList = Object.keys(leafPos)
const seaPoints: XY[] = (() => {
  const rnd = mulberry32(7)
  const out: XY[] = []
  for (let i = 0; i < 700; i++) {
    const p = { x: -40 + rnd() * (FLAT_W + 80), y: -40 + rnd() * (FLAT_H + 80) }
    let dmin = Infinity
    for (const id of leafList) dmin = Math.min(dmin, Math.hypot(p.x - leafPos[id].x, p.y - leafPos[id].y))
    if (dmin > 88) out.push(p)
  }
  return out
})()

const allPoints: XY[] = [...leafList.map((id) => leafPos[id]), ...seaPoints]
const voronoi = Delaunay.from(allPoints, (p) => p.x, (p) => p.y).voronoi([-40, -40, FLAT_W + 40, FLAT_H + 40])

const cellPath = (i: number): string | null => {
  const poly = voronoi.cellPolygon(i)
  if (!poly) return null
  return `M${poly.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L')}Z`
}

// cell indices grouped per community (and the sea), so each country can fade
// in as one unit instead of 50 independent patches
const seaCells: number[] = []
const countryCells: number[][] = countries.map(() => [])
allPoints.forEach((_, i) => {
  if (i >= leafList.length) seaCells.push(i)
  else countryCells[communityOf.get(leafList[i])!].push(i)
})

const countryLabels = spreadLabels(
  countries.map((c, ci) => {
    const cx = c.byRank.reduce((s, id) => s + leafPos[id].x, 0) / c.byRank.length
    const cy = c.byRank.reduce((s, id) => s + leafPos[id].y, 0) / c.byRank.length
    return { ci, x: cx, y: cy, label: c.label, color: c.color }
  }),
)

// ── Semantic-zoom levels: the disclosure depth zoom asks for ────────────────
const LEVEL_K = [1, 3, 10]
const LEVEL_NAME = ['capitals', 'top 3 / country', 'everything']
const LEVEL_AT = (s: number) => (s < 1.35 ? 0 : s < 2.4 ? 1 : 2)

// Per-country reveal LOD: the depth at which country ci's capital would
// surface under the GLOBAL importance ranking (levelSet), not the per-country
// floor that guarantees it a dot at every level. A hub-heavy country's capital
// is globally prominent and surfaces early; a quieter country's capital only
// clears the bar once the global ranking has gone deep enough that everyone's
// capital has — which is why "everything" (L2) always ends up fully colored.
// Floored at 1: L0 stays a plain, anonymous continent no matter the ranking.
const capitalRevealLevel: number[] = countries.map((c) => {
  const naturalLevel = LEVEL_K.findIndex((k) => levelSet(k).has(c.capital))
  return Math.max(1, naturalLevel === -1 ? LEVEL_K.length - 1 : naturalLevel)
})

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
const FLY_S_MAX = 2.8 // past L2's 2.4 threshold: a fitted neighborhood arrives fully disclosed
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
    const pts = cmd.ids.filter((id) => leafPos[id]).map((id) => leafPos[id])
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

  // ── The per-country disclosure decision ────────────────────────────────────
  // ONE bit per country, and everything it owns keys off it: disclosed means
  // zoom has reached THIS country's own LOD (capitalRevealLevel, not a shared
  // global cutoff — so countries stagger in rather than all popping at once)
  // AND its ★ capital is literally on screen; then its color fades in (CSS
  // transition) and its cities beyond the capital exist at all. Undisclosed
  // countries stay plain ground with just their capital.
  // The viewport is the TRUE letterboxed one (meet can show more than the
  // viewBox on one axis), otherwise the gate disagrees with what you see.
  const f = clientBox ? Math.max(VB_W / clientBox.w, VB_H / clientBox.h) : 1
  const worldRect = {
    x: (VB_X - (clientBox ? (clientBox.w * f - VB_W) / 2 : 0) - view.tx) / view.s,
    y: (VB_Y - (clientBox ? (clientBox.h * f - VB_H) / 2 : 0) - view.ty) / view.s,
    w: (clientBox ? clientBox.w * f : VB_W) / view.s,
    h: (clientBox ? clientBox.h * f : VB_H) / view.s,
  }
  const countryReveal = countries.map((c, ci) => {
    if (level < capitalRevealLevel[ci]) return 0 // this country's capital hasn't naturally surfaced yet
    const p = leafPos[c.capital]
    const inView =
      p.x > worldRect.x && p.x < worldRect.x + worldRect.w && p.y > worldRect.y && p.y < worldRect.y + worldRect.h
    return inView ? 1 : 0
  })

  // disclosed countries descend to the zoom's depth; the rest keep capital only
  const kByCountry = countryReveal.map((r) => (r ? LEVEL_K[level] : 1))
  const visible = countryLevelSet(kByCountry)
  for (const id of route) visible.add(id) // the walk is always on the map, whatever the altitude
  for (const id of visited ?? []) if (leafPos[id]) visible.add(id) // visited stays on the map at any altitude
  // a flown-to neighborhood stays on screen while its pin holds
  if (flyHold?.pin && pinned === flyHold.pin) for (const id of flyHold.ids) if (leafPos[id]) visible.add(id)

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
        const s = Math.min(4.5, Math.max(0.7, v.s * Math.exp(-ev.deltaY * 0.0016)))
        return { s, tx: u.x - ((u.x - v.tx) / v.s) * s, ty: u.y - ((u.y - v.ty) / v.s) * s }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const drag = useRef<{ x: number; y: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  const jumpToLevel = (l: number) => {
    const targetS = [1, 1.8, 3][l]
    // keep the canvas center fixed while jumping levels
    const cx = VB_X + VB_W / 2
    const cy = VB_Y + VB_H / 2
    setView((v) => ({ s: targetS, tx: cx - ((cx - v.tx) / v.s) * targetS, ty: cy - ((cy - v.ty) / v.s) * targetS }))
  }

  const beyondCount = traced
    ? edgesTouching(traced).filter((e) => !visible.has(e.source) || !visible.has(e.target)).length
    : 0

  const tracedNeighbors = (() => {
    if (!traced) return null
    const s = new Set<string>([traced])
    for (const e of edgesTouching(traced)) {
      if (visible.has(e.source) && visible.has(e.target)) {
        s.add(e.source)
        s.add(e.target)
      }
    }
    return s
  })()

  const hubNote =
    traced && hubBridging.has(traced)
      ? `${byId.get(traced)!.title} is a hub: its links span ${hubBridging.get(traced)} of the ${countries.length} countries — the tessellation had to file it under one.`
      : null

  // country names behave like Google Maps labels: roughly constant on screen,
  // fading as you descend toward street level
  const labelSize = 30 / Math.sqrt(view.s)
  const labelOpacity = Math.max(0.14, 0.32 - (view.s - 1) * 0.09)

  return (
    <div className="relative h-full bg-slate-50">
      <svg
        ref={svgRef}
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        className="w-full h-full"
        data-tx={view.tx.toFixed(1)}
        data-ty={view.ty.toFixed(1)}
        data-zoom={view.s.toFixed(2)}
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
          {/* countries: leaf cells fuse by shared community color; sea cells stay paper-white.
              Each country's fill is gated by countryReveal — plain continent from afar. */}
          <g>
            {seaCells.map((i) => {
              const d = cellPath(i)
              return d ? <path key={i} d={d} fill="#eef4f8" stroke="#eef4f8" strokeWidth={1} /> : null
            })}
            {countryCells.map((cells, ci) => (
              <g key={ci} style={{ opacity: countryReveal[ci], transition: 'opacity 350ms' }}>
                {cells.map((i) => {
                  const d = cellPath(i)
                  return d ? (
                    <path key={i} d={d} fill={countries[ci].color} opacity={0.26} stroke={countries[ci].color} strokeWidth={1} strokeOpacity={0.26} />
                  ) : null
                })}
              </g>
            ))}
          </g>

          {/* ghost country names */}
          <g pointerEvents="none">
            {countryLabels.map((c) => (
              <text key={c.ci} x={c.x} y={c.y} textAnchor="middle" fontSize={labelSize} fontWeight={800} fill={c.color} opacity={labelOpacity} style={{ userSelect: 'none' }}>
                {c.label}
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

          {hairball && <AllEdges visible={visible} />}

          {/* visited nodes: quiet dashed slate rings, deliberately distinct from
              the amber route channel and the five saturated domain hues */}
          {visited && visited.size > 0 && (
            <g pointerEvents="none">
              {[...visited].map((id) =>
                visible.has(id) && leafPos[id] ? (
                  <circle
                    key={`v-${id}`}
                    data-visited={id}
                    cx={leafPos[id].x}
                    cy={leafPos[id].y}
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
                const a = leafPos[route[i]]
                const b = leafPos[id]
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
                  <circle cx={leafPos[id].x} cy={leafPos[id].y} r={13 / view.s} fill="none" stroke="#f59e0b" strokeWidth={2.4 / view.s} opacity={0.9} />
                  <text x={leafPos[id].x} y={leafPos[id].y - 17 / view.s} textAnchor="middle" fontSize={11 / view.s} fontWeight={800} fill="#b45309" style={{ userSelect: 'none' }}>
                    {i + 1}
                  </text>
                </g>
              ))}
            </g>
          )}

          <HoverEdges traced={traced} visible={visible} scale={view.s} />

          <g>
            {leafList.map((id) => {
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

          {/* ★ capital markers — ties each colored country to its capital */}
          <g pointerEvents="none">
            {countries.map((c) => {
              const rr = 4.5 + Math.sqrt(degreeOf.get(c.capital)!) * 1.1
              return (
                <text
                  key={c.capital}
                  x={leafPos[c.capital].x - (rr + 5) / view.s}
                  y={leafPos[c.capital].y + 3.5 / view.s}
                  textAnchor="end"
                  fontSize={11 / view.s}
                  fontWeight={800}
                  fill={c.color}
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
          <div className="font-bold text-slate-800 text-[12px]">Map — GMap '10 countries × ZMLT '20 semantic zoom</div>
          <div className="mt-0.5">
            The countries never change (CNM Q = {modularityQ.toFixed(3)}, {(domainPurity * 100).toFixed(0)}% agree with authored domains);
            each country descends past its ★ capital once zoom reaches THAT capital's own global rank — hub-heavy countries first,
            everyone by L2 — and only while the capital is on screen. Color, territory, and cities arrive as one.
          </div>
          {hubNote ? (
            <div className="mt-1 text-amber-700 font-medium">{hubNote}</div>
          ) : (
            <div className="mt-1 text-slate-400">
              wheel to zoom (levels switch with it; a country discloses — color AND cities — only while its ★ capital is on screen) · drag to pan · hover a node for its real links · click to pin
              {traced && beyondCount > 0 && (
                <span className="text-amber-700 font-medium"> · {beyondCount} of {byId.get(traced)!.title}'s links lead deeper than this level</span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 text-[11px] text-slate-600">
        <span className="text-slate-400">level</span>
        <div className="flex rounded border border-slate-300 overflow-hidden">
          {LEVEL_K.map((_, l) => (
            <button
              key={l}
              onClick={() => jumpToLevel(l)}
              className={`px-2 py-0.5 ${level === l ? 'bg-slate-700 text-white font-semibold' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
              L{l} · {LEVEL_NAME[l]}
            </button>
          ))}
        </div>
        <span className="text-slate-400">
          {visible.size} of {topicIds.length} · zoom ×{view.s.toFixed(2)}
        </span>
        <span className="w-px h-4 bg-slate-200" />
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={hairball} onChange={(ev) => setHairball(ev.target.checked)} />
          all edges
        </label>
      </div>

      {/* pinned selection: the jumps into the other navigation modes */}
      {pinned && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 text-[11px]">
          <span className="font-semibold" style={{ color: DOMAIN_COLOR[domainOf(pinned)] }}>
            {byId.get(pinned)!.title}
          </span>
          <span className="text-slate-400">{edgesTouching(pinned).length} links</span>
          <span className="w-px h-4 bg-slate-200" />
          <button
            onClick={() => onStartWalk(pinned)}
            className="px-2 py-0.5 rounded border border-amber-400 text-amber-700 hover:bg-amber-50 font-medium"
          >
            ▶ start walk here
          </button>
          <button
            onClick={() => onOpenNeighborhood(pinned)}
            className="px-2 py-0.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium"
          >
            ◳ open neighborhood
          </button>
        </div>
      )}
    </div>
  )
}
