// Map instrument — "where am I." Authored-hierarchy regions (domains, then
// modules nested inside) with topics as dots, from layout.ts's MAP_LAYOUT
// (collapsed at the topic level — deep layers never surface here).
// Pan/zoom is copied from MapView's proven pattern (non-passive wheel
// listener attached in an effect; refs only ever read inside handlers, never
// during render) — but positions themselves NEVER change with navigation.
// Only overlays do: the you-are-here ring, the current domain's highlight,
// edges incident to the current topic, the active walk's route, and — while a
// walk is active and dimming is on — everything outside its downstream set.

import { useEffect, useRef, useState } from 'react'

import { byId, domainOf, DOMAIN_COLOR, EDGE_COLOR, ROOT_ID } from '../graph'
import { edgesTouching } from '../flat'
import { centerOf, MAP_BOUNDS, MAP_LAYOUT } from './layout'
import { WALKS } from './walks'
import { walkKeepBright } from './state'
import type { ActiveWalkState } from './state'

interface View {
  tx: number
  ty: number
  s: number
}

export interface MapPanelProps {
  currentId: string
  onSelectLeaf: (id: string) => void
  onZoomContainer: (id: string) => void
  activeWalk: ActiveWalkState | null
  dimmingOn: boolean
}

export default function MapPanel({ currentId, onSelectLeaf, onZoomContainer, activeWalk, dimmingOn }: MapPanelProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ tx: 0, ty: 0, s: 1 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number } | null>(null)

  const toUser = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const f = Math.max(MAP_BOUNDS.w / rect.width, MAP_BOUNDS.h / rect.height)
    return {
      x: MAP_BOUNDS.x + (clientX - rect.left - (rect.width - MAP_BOUNDS.w / f) / 2) * f,
      y: MAP_BOUNDS.y + (clientY - rect.top - (rect.height - MAP_BOUNDS.h / f) / 2) * f,
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
        const s = Math.min(4, Math.max(0.6, v.s * Math.exp(-ev.deltaY * 0.0016)))
        return { s, tx: u.x - ((u.x - v.tx) / v.s) * s, ty: u.y - ((u.y - v.ty) / v.s) * s }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const walk = activeWalk ? WALKS.find((w) => w.id === activeWalk.walkId) ?? null : null
  const keepBright = walk && activeWalk && dimmingOn ? walkKeepBright(walk.stops.map((s) => s.id), activeWalk.cursor) : null
  const dimmed = (id: string) => keepBright !== null && !keepBright.has(id)

  const currentNode = byId.get(currentId)
  const currentIsTopic = currentNode?.topic === true
  const currentDomain = currentId === ROOT_ID ? null : domainOf(currentId)

  // topics render as dots even though they are containers now (their deep
  // layers are collapsed out of this layout); boxes are the levels above them
  const containers = MAP_LAYOUT.visible.filter((n) => n.kind === 'container' && !n.topic)
  const topicDots = MAP_LAYOUT.visible.filter((n) => n.topic)

  return (
    <div className="relative h-full bg-slate-50" aria-label="map-panel">
      <svg
        ref={svgRef}
        viewBox={`${MAP_BOUNDS.x} ${MAP_BOUNDS.y} ${MAP_BOUNDS.w} ${MAP_BOUNDS.h}`}
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
          const f = Math.max(MAP_BOUNDS.w / rect.width, MAP_BOUNDS.h / rect.height)
          const dx = (ev.clientX - drag.current.x) * f
          const dy = (ev.clientY - drag.current.y) * f
          drag.current = { x: ev.clientX, y: ev.clientY }
          setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }))
        }}
        onPointerUp={() => {
          drag.current = null
          setDragging(false)
        }}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.s})`}>
          {/* regions: domains first, modules nested inside — a single DFS pass
              paints each container over its already-drawn parent, so nesting
              reads as a darkening tint without any explicit z-index bookkeeping */}
          {containers.map((n) => {
            const pos = MAP_LAYOUT.pos[n.id]
            const size = MAP_LAYOUT.size[n.id]
            const isDomain = n.parentId === ROOT_ID
            const color = isDomain ? DOMAIN_COLOR[n.id] : DOMAIN_COLOR[domainOf(n.id)]
            const isCurrentDomainRegion = isDomain && n.id === currentDomain
            return (
              <g key={n.id} opacity={dimmed(n.id) ? 0.25 : 1}>
                <rect
                  x={pos.x}
                  y={pos.y}
                  width={size.w}
                  height={size.h}
                  rx={10}
                  fill={color}
                  fillOpacity={isDomain ? 0.08 : 0.14}
                  stroke={color}
                  strokeOpacity={isCurrentDomainRegion || n.id === currentId ? 0.9 : 0.35}
                  strokeWidth={n.id === currentId ? 2.5 : isCurrentDomainRegion ? 2 : 1}
                  style={{ cursor: 'pointer' }}
                  onDoubleClick={() => onZoomContainer(n.id)}
                />
                <text
                  x={pos.x + 8}
                  y={pos.y + (isDomain ? 20 : 18)}
                  fontSize={isDomain ? 13 : 10.5}
                  fontWeight={800}
                  fill={color}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {n.title}
                </text>
              </g>
            )
          })}

          {/* edges incident to the current topic — the map's only edge overlay
              outside an active walk's route */}
          {currentIsTopic &&
            edgesTouching(currentId).map((e) => {
              const a = centerOf(e.source)
              const b = centerOf(e.target)
              return (
                <line
                  key={e.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={EDGE_COLOR[e.type]}
                  strokeWidth={1.8}
                  opacity={0.75}
                />
              )
            })}

          {/* active walk route: visited segments solid, remaining dashed */}
          {walk && activeWalk && (
            <g pointerEvents="none">
              {walk.stops.slice(1).map((stop, i) => {
                const a = centerOf(walk.stops[i].id)
                const b = centerOf(stop.id)
                const visited = i + 1 <= activeWalk.cursor
                return (
                  <line
                    key={`route-${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#f59e0b"
                    strokeWidth={2.6}
                    strokeDasharray={visited ? undefined : '6 4'}
                    opacity={0.9}
                  />
                )
              })}
              {walk.stops.map((stop, i) => {
                const c = centerOf(stop.id)
                return (
                  <text key={`num-${stop.id}`} x={c.x} y={c.y - 13} textAnchor="middle" fontSize={10} fontWeight={800} fill="#b45309">
                    {i + 1}
                  </text>
                )
              })}
            </g>
          )}

          {/* topics */}
          {topicDots.map((n) => {
            const c = centerOf(n.id)
            const isHere = n.id === currentId
            return (
              <g key={n.id} opacity={dimmed(n.id) ? 0.25 : 1}>
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={6}
                  fill={DOMAIN_COLOR[domainOf(n.id)]}
                  stroke="#fff"
                  strokeWidth={1}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onSelectLeaf(n.id)}
                />
                {isHere && (
                  <circle cx={c.x} cy={c.y} r={11} fill="none" stroke="#f59e0b" strokeWidth={2.4} opacity={0.9} />
                )}
              </g>
            )
          })}
        </g>
      </svg>

      <div className="absolute top-3 left-3 z-10 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-2 text-[11px] text-slate-600 max-w-[420px]">
        <div className="font-bold text-slate-800 text-[12px]">Map — you are here</div>
        <div className="mt-0.5 text-slate-400">
          the authored hierarchy, laid out once — wheel to zoom, drag to pan, double-click a region to zoom the tree ·
          click a dot to select
        </div>
      </div>

      <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-2.5 py-1 text-[11px] text-slate-500">
        zoom ×{view.s.toFixed(2)}
      </div>
    </div>
  )
}
