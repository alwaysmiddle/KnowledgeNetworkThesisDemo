// Experiment E — GMap (Gansner, Hu & Kobourov 2010): the graph as a
// geographic map. Embed (shared force layout) → cluster (CNM modularity) →
// tessellate: Voronoi cells over the real nodes plus seeded "sea" points,
// cells colored by community so contiguous same-community cells fuse into
// countries. Edges are HIDDEN by default (the paper superimposes them only
// optionally; ComfyUI ships the same idea as "hide links") — hover a node to
// see its real links, toggle the hairball to see why it's off.
//
// The corpus's stress case is visible by design: each of the 5 hubs bridges
// 4–6 communities, yet a hard tessellation must file it under exactly one.

import { useMemo, useState } from 'react'
import { Delaunay } from 'd3-delaunay'

import { byId, domainOf, DOMAIN_COLOR } from './graph'
import type { XY } from './derive'
import {
  FLAT_W,
  FLAT_H,
  communities,
  communityOf,
  communityColor,
  communityLabel,
  domainPurity,
  hubBridging,
  leafPos,
  modularityQ,
  spreadLabels,
  edgesTouching,
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

const countryLabels = spreadLabels(
  communities.map((members, ci) => {
    const cx = members.reduce((s, id) => s + leafPos[id].x, 0) / members.length
    const cy = members.reduce((s, id) => s + leafPos[id].y, 0) / members.length
    return { ci, x: cx, y: cy, label: communityLabel[ci], color: communityColor[ci] }
  }),
)

export default function GMapView() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const [hairball, setHairball] = useState(false)
  const traced = hovered ?? pinned

  const tracedNeighbors = useMemo(() => {
    if (!traced) return null
    const s = new Set<string>([traced])
    for (const e of edgesTouching(traced)) {
      s.add(e.source)
      s.add(e.target)
    }
    return s
  }, [traced])

  const hubNote =
    traced && hubBridging.has(traced)
      ? `${byId.get(traced)!.title} is a hub: its links span ${hubBridging.get(traced)} of the ${communities.length} countries — the tessellation had to file it under one.`
      : null

  return (
    <div className="relative h-full bg-slate-50">
      <svg viewBox={`-40 -40 ${FLAT_W + 80} ${FLAT_H + 80}`} className="w-full h-full" onClick={() => setPinned(null)}>
        <EdgeMarkers />

        {/* countries: leaf cells fuse by shared community color; sea cells stay paper-white */}
        <g>
          {allPoints.map((_, i) => {
            const d = cellPath(i)
            if (!d) return null
            if (i >= leafList.length) return <path key={i} d={d} fill="#eef4f8" stroke="#eef4f8" strokeWidth={1} />
            const ci = communityOf.get(leafList[i])!
            return <path key={i} d={d} fill={communityColor[ci]} opacity={0.26} stroke={communityColor[ci]} strokeWidth={1} strokeOpacity={0.26} />
          })}
        </g>

        {/* ghost country names */}
        <g pointerEvents="none">
          {countryLabels.map((c) => (
            <text key={c.ci} x={c.x} y={c.y} textAnchor="middle" fontSize={30} fontWeight={800} fill={c.color} opacity={0.32} style={{ userSelect: 'none' }}>
              {c.label}
            </text>
          ))}
        </g>

        {hairball && <AllEdges />}
        <HoverEdges traced={traced} />

        <g>
          {leafList.map((id) => (
            <LeafDot
              key={id}
              id={id}
              muted={!!tracedNeighbors && !tracedNeighbors.has(id)}
              hi={id === traced}
              onEnter={setHovered}
              onLeave={() => setHovered(null)}
              onClick={(n) => setPinned((prev) => (prev === n ? null : n))}
            />
          ))}
        </g>
      </svg>

      {/* what the paper claims, measured on THIS corpus */}
      <div className="absolute top-3 left-3 z-10 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-2 text-[11px] text-slate-600 max-w-[560px]">
        <div className="font-bold text-slate-800 text-[12px]">GMap '10 — communities as countries (hard tessellation)</div>
        <div className="mt-0.5">
          CNM modularity Q = {modularityQ.toFixed(3)} · {communities.length} communities · {(domainPurity * 100).toFixed(0)}% agree with the
          authored domains — Presentation is the split: canvas+search vs navigation get separate countries.
        </div>
        {hubNote ? (
          <div className="mt-1 text-amber-700 font-medium">{hubNote}</div>
        ) : (
          <div className="mt-1 text-slate-400">edges hidden by default (paper superimposes them only optionally) · hover a node for its real links · click to pin</div>
        )}
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 text-[11px] text-slate-600">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={hairball} onChange={(ev) => setHairball(ev.target.checked)} />
          superimpose all 200 edges (why the map hides them)
        </label>
        <span className="w-px h-4 bg-slate-200" />
        <span className="text-slate-400">country hue = dominant authored domain</span>
        {traced && (
          <>
            <span className="w-px h-4 bg-slate-200" />
            <span className="font-semibold" style={{ color: DOMAIN_COLOR[domainOf(traced)] }}>
              {byId.get(traced)!.title}
            </span>
            <span className="text-slate-400">{edgesTouching(traced).length} links</span>
          </>
        )}
      </div>
    </div>
  )
}
