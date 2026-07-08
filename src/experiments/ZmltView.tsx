// Experiment G — ZMLT (De Luca et al. 2020): a zoomable map with REAL nodes
// and edges only — no meta-nodes, ever ("abstract vertices break the map
// metaphor"). What varies with zoom is a filtration by importance: level k
// shows the top-k nodes by degree plus the real tree paths connecting them
// (the minimal subtree of the max-weight spanning tree containing all
// terminals). Zooming in only ADDS nodes; positions come from the shared
// embedding and never change — ZMLT's persistence property. Non-backbone
// edges appear on hover, per node, as in E and F.

import { useEffect, useMemo, useRef, useState } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from './graph'
import { FLAT_W, FLAT_H, degreeOf, edgesTouching, importanceOrder, leafPos, levelSet, treePairs } from './flat'
import { EdgeMarkers, HoverEdges, LeafDot } from './flatSvg'

const LEVEL_K = [8, 22, 50]
const LEVEL_AT = (s: number) => (s < 1.35 ? 0 : s < 2.4 ? 1 : 2)

const VB_X = -40
const VB_Y = -40
const VB_W = FLAT_W + 80
const VB_H = FLAT_H + 80

interface View {
  tx: number
  ty: number
  s: number
}

export default function ZmltView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ tx: 0, ty: 0, s: 1 })
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const traced = hovered ?? pinned

  const level = LEVEL_AT(view.s)
  const visible = useMemo(() => levelSet(LEVEL_K[level]), [level])

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

  const tracedNeighbors = useMemo(() => {
    if (!traced) return null
    const s = new Set<string>([traced])
    for (const e of edgesTouching(traced)) {
      if (visible.has(e.source) && visible.has(e.target)) {
        s.add(e.source)
        s.add(e.target)
      }
    }
    return s
  }, [traced, visible])

  return (
    <div className="relative h-full bg-slate-50">
      <svg
        ref={svgRef}
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        className="w-full h-full"
        style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={(ev) => {
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
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.s})`}>
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

          <HoverEdges traced={traced} visible={visible} scale={view.s} />

          <g>
            {importanceOrder.map((id) => {
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
                  onClick={(n) => setPinned((prev) => (prev === n ? null : n))}
                />
              )
            })}
          </g>
        </g>
      </svg>

      <div className="absolute top-3 left-3 z-10 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-2 text-[11px] text-slate-600 max-w-[560px]">
        <div className="font-bold text-slate-800 text-[12px]">ZMLT '20 — semantic zoom, real nodes only</div>
        <div className="mt-0.5">
          No meta-nodes: every dot is a real leaf, sized by degree. Zoom adds nodes down the importance ranking — connected through
          real spanning-tree paths — and nothing ever moves or disappears (persistence).
        </div>
        <div className="mt-1 text-slate-400">
          wheel to zoom (levels switch at it) · drag to pan · hover reveals a node's non-backbone links
          {traced && beyondCount > 0 && (
            <span className="text-amber-700 font-medium"> · {beyondCount} of {byId.get(traced)!.title}'s links lead to nodes deeper than this level</span>
          )}
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-3 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 text-[11px] text-slate-600">
        <span className="text-slate-400">level</span>
        <div className="flex rounded border border-slate-300 overflow-hidden">
          {LEVEL_K.map((k, l) => (
            <button
              key={k}
              onClick={() => jumpToLevel(l)}
              className={`px-2 py-0.5 ${level === l ? 'bg-slate-700 text-white font-semibold' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
            >
              L{l} · top {k}
            </button>
          ))}
        </div>
        <span className="text-slate-400">
          showing {visible.size} of 50 nodes · zoom ×{view.s.toFixed(2)}
        </span>
        {traced && (
          <>
            <span className="w-px h-4 bg-slate-200" />
            <span className="font-semibold" style={{ color: DOMAIN_COLOR[domainOf(traced)] }}>
              {byId.get(traced)!.title}
            </span>
            <span className="text-slate-400">degree {degreeOf.get(traced)}</span>
          </>
        )}
      </div>
    </div>
  )
}
