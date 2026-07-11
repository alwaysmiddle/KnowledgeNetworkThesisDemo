// EVoC spike view — one question: do EVoC's automatic cluster layers line up
// with the planted graph/stage/topic hierarchy in the mocked Infra corpus?
// Pan/zoom is copied from MapView's proven pattern (wheel needs a non-passive
// listener; refs are only ever read inside effects/handlers, never render).
// No Voronoi, no hulls, no semantic zoom, no edges — that's a later phase,
// contingent on what this spike finds. See HANDOFF-EVOC-SPIKE.md at the repo
// root and tools/evoc-spike/RESULTS.md for the experiment and its verdict.

import { useEffect, useRef, useState } from 'react'
import rawRun from './data/evocRun.json'

interface EvocRun {
  meta: { seed: number; n: number; d: number; mix: string; generatedAt: string; evocVersion: string; layersNote: 'finest-first' }
  levels: { graph: string[]; stage: string[]; topic: string[] }
  items: Array<{
    id: string; label: string; kind: string
    graph: number; stage: number; topic: number
    session: string; text: string; x: number; y: number
  }>
  evoc: { layers: Array<{ nClusters: number; noisePct: number; labels: number[] }> }
  tree: Array<{ layer: number; cluster: number; parentLayer: number; parentCluster: number }>
  metrics: Array<{
    layer: number; nClusters: number; noisePct: number
    vs: Array<{ level: 'graph' | 'stage' | 'topic' | 'session'; ari: number; nmi: number }>
  }>
}

const run = rawRun as unknown as EvocRun
const LEVELS = ['graph', 'stage', 'topic', 'session'] as const
type Level = (typeof LEVELS)[number]
type ColorBy = { kind: 'evoc'; layer: number } | { kind: 'level'; level: Level }

const VB_W = 1000
const VB_H = 620

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const colorForIndex = (idx: number) => (idx === -1 ? '#9aa0a6' : `hsl(${(idx * 137.508) % 360}, 70%, 52%)`)

const colorForItem = (i: number, cb: ColorBy): string => {
  if (cb.kind === 'evoc') return colorForIndex(run.evoc.layers[cb.layer].labels[i])
  const it = run.items[i]
  if (cb.level === 'session') return colorForIndex(hashStr(it.session))
  return colorForIndex(it[cb.level])
}

interface View {
  tx: number
  ty: number
  s: number
}

export default function EvocView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ tx: 0, ty: 0, s: 1 })
  const [hovered, setHovered] = useState<number | null>(null)
  const [colorBy, setColorBy] = useState<ColorBy>({ kind: 'evoc', layer: run.evoc.layers.length - 1 })
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number } | null>(null)

  const toUser = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const f = Math.max(VB_W / rect.width, VB_H / rect.height)
    return {
      x: (clientX - rect.left - (rect.width - VB_W / f) / 2) * f,
      y: (clientY - rect.top - (rect.height - VB_H / f) / 2) * f,
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
        const s = Math.min(6, Math.max(0.7, v.s * Math.exp(-ev.deltaY * 0.0016)))
        return { s, tx: u.x - ((u.x - v.tx) / v.s) * s, ty: u.y - ((u.y - v.ty) / v.s) * s }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const evocLayerForTooltip = colorBy.kind === 'evoc' ? colorBy.layer : run.evoc.layers.length - 1
  const hoveredItem = hovered !== null ? run.items[hovered] : null
  const hoveredCluster = hovered !== null ? run.evoc.layers[evocLayerForTooltip].labels[hovered] : null

  return (
    <div className="relative h-full bg-slate-50">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VB_W} ${VB_H}`}
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
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.s})`}>
          {run.items.map((it, i) => (
            <circle
              key={it.id}
              cx={it.x}
              cy={it.y}
              r={3}
              fill={colorForItem(i, colorBy)}
              opacity={hovered === null || hovered === i ? 0.85 : 0.35}
              stroke={hovered === i ? '#1e293b' : 'none'}
              strokeWidth={hovered === i ? 1 / view.s : 0}
              onPointerEnter={() => setHovered(i)}
              onPointerLeave={() => setHovered((h) => (h === i ? null : h))}
            />
          ))}
        </g>
      </svg>

      <div className="absolute top-3 left-3 z-10 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-2 text-[11px] text-slate-600 max-w-[520px]">
        <div className="font-bold text-slate-800 text-[12px]">EVoC — can auto-clustering recover our pipeline?</div>
        <div className="mt-0.5">
          {run.meta.n} mocked Infra artifacts (mix: {run.meta.mix}), synthetic {run.meta.d}-d vectors with a planted
          graph → stage → topic hierarchy. EVoC found {run.evoc.layers.length} layers on its own — color by any of
          them or by the planted truth below, and check the metrics panel for what actually lines up.
        </div>
        <div className="mt-1 text-slate-400">wheel to zoom · drag to pan · hover a dot for details</div>
      </div>

      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-2 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 text-[11px] text-slate-600 max-w-[640px]">
        <span className="text-slate-400">EVoC layers (finest → coarsest)</span>
        <div className="flex rounded border border-slate-300 overflow-hidden">
          {run.evoc.layers.map((lyr, i) => (
            <button
              key={i}
              onClick={() => setColorBy({ kind: 'evoc', layer: i })}
              className={`px-2 py-0.5 ${
                colorBy.kind === 'evoc' && colorBy.layer === i
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              L{i} · {lyr.nClusters}
            </button>
          ))}
        </div>
        <span className="w-px h-4 bg-slate-200" />
        <span className="text-slate-400">planted truth</span>
        <div className="flex rounded border border-slate-300 overflow-hidden">
          {LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => setColorBy({ kind: 'level', level: lv })}
              className={`px-2 py-0.5 capitalize ${
                colorBy.kind === 'level' && colorBy.level === lv
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {lv}
              {lv !== 'session' && ` (${run.levels[lv].length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="absolute top-3 right-3 z-10 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-2 text-[10px] text-slate-600">
        <div className="font-bold text-slate-800 text-[11px] mb-1">metrics — mix: {run.meta.mix}</div>
        <table className="border-collapse">
          <thead>
            <tr className="text-slate-400">
              <th className="text-left pr-2 pb-1 font-medium">layer</th>
              <th className="text-right pr-1 pb-1 font-medium">n</th>
              <th className="text-right pr-2 pb-1 font-medium">noise%</th>
              {LEVELS.map((lv) => (
                <th key={lv} className="text-right px-2 pb-1 font-medium capitalize">
                  {lv}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {run.metrics.map((m) => {
              const maxAri = Math.max(...m.vs.map((v) => v.ari))
              return (
                <tr key={m.layer} className="border-t border-slate-100">
                  <td className="text-left pr-2 py-0.5 text-slate-600 font-medium">L{m.layer}</td>
                  <td className="text-right pr-1 py-0.5 text-slate-500">{m.nClusters}</td>
                  <td className="text-right pr-2 py-0.5 text-slate-500">{m.noisePct.toFixed(1)}%</td>
                  {LEVELS.map((lv) => {
                    const v = m.vs.find((x) => x.level === lv)!
                    return (
                      <td key={lv} className="text-right px-2 py-0.5">
                        <div className={v.ari === maxAri ? 'font-bold text-slate-800' : 'text-slate-600'}>{v.ari.toFixed(3)}</div>
                        <div className="text-slate-400 text-[9px]">{v.nmi.toFixed(3)}</div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="mt-1 text-slate-400 max-w-[300px]">
          ARI: 1 = perfect recovery of the planted level, 0 = random. NMI shown smaller beneath.
        </div>
      </div>

      {hoveredItem && (
        <div className="absolute bottom-3 right-3 z-10 max-w-[340px] rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-2 text-[11px] text-slate-600">
          <div className="font-bold text-slate-800 text-[12px]">{hoveredItem.label}</div>
          <div className="mt-0.5 text-slate-500">
            {hoveredItem.kind} · {run.levels.stage[hoveredItem.stage]} · topic {run.levels.topic[hoveredItem.topic]} · {hoveredItem.session}
          </div>
          <div className="text-slate-400">
            L{evocLayerForTooltip} cluster {hoveredCluster === -1 ? 'noise' : hoveredCluster}
          </div>
          <div className="mt-1 text-slate-500">{hoveredItem.text.slice(0, 160)}</div>
        </div>
      )}
    </div>
  )
}
