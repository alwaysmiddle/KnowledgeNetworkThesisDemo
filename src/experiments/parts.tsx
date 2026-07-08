// Shared ReactFlow node renderers for the map and drill views: leaf card,
// collapsed chip, expanded container box, boundary proxy. Components only —
// the node-type registry and edge styling live in rf.ts (fast-refresh rule).
// Radial draws its own SVG and skips all of these.

import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

import { CARD_W, CARD_H } from './derive'

// Handles exist only so edges have anchor points; they are invisible and inert.
const handleStyle = {
  opacity: 0,
  width: 4,
  height: 4,
  minWidth: 0,
  minHeight: 0,
  border: 'none',
  background: 'transparent',
  pointerEvents: 'none' as const,
}

export function Anchors() {
  return (
    <>
      <Handle type="target" position={Position.Left} style={handleStyle} isConnectable={false} />
      <Handle type="source" position={Position.Right} style={handleStyle} isConnectable={false} />
    </>
  )
}

const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

// ── Leaf: a plain white card with its domain color as a left notch ──────────
export function LeafCard({ data }: NodeProps) {
  const d = data as { title: string; caption?: string; color: string; highlighted?: boolean }
  // longhand border props only: this style now flips live (pin/unpin), and
  // React rightly warns when a rerender mixes the `border` shorthand with
  // per-side overrides
  const edge = d.highlighted ? '#f59e0b' : '#e2e8f0'
  return (
    <div
      className="rounded-md bg-white shadow-sm px-2.5 py-1.5 select-none cursor-pointer"
      style={{
        width: CARD_W,
        height: CARD_H,
        borderStyle: 'solid',
        borderTopWidth: 1,
        borderRightWidth: 1,
        borderBottomWidth: 1,
        borderLeftWidth: 4,
        borderTopColor: edge,
        borderRightColor: edge,
        borderBottomColor: edge,
        borderLeftColor: d.highlighted ? '#f59e0b' : d.color,
        boxShadow: d.highlighted ? '0 0 0 3px rgba(245,158,11,.35)' : undefined,
      }}
      title={`${d.title}${d.caption ? ` — ${d.caption}` : ''} · click to trace its links`}
    >
      <div className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{d.title}</div>
      {d.caption && <div className="text-[9px] text-slate-400 truncate">{d.caption}</div>}
      <Anchors />
    </div>
  )
}

// ── Collapsed container: one chip standing in for a whole subtree ───────────
export function ContainerChip({ data }: NodeProps) {
  const d = data as { title: string; count: number; color: string; active?: boolean }
  return (
    <div
      className="rounded-lg select-none cursor-pointer px-2.5 py-1.5 shadow-sm"
      style={{
        width: CARD_W,
        height: CARD_H,
        background: alpha(d.color, 0.1),
        border: `1.5px solid ${alpha(d.color, 0.65)}`,
        boxShadow: d.active ? '0 0 0 3px rgba(245,158,11,.4)' : undefined,
      }}
      title={d.active ? `${d.title} · expanded in the panel` : `${d.title} · click to expand`}
    >
      <div className="text-[11px] font-bold truncate leading-tight" style={{ color: d.color }}>
        {d.active ? '▾' : '▸'} {d.title}
      </div>
      <div className="text-[9px] text-slate-500">{d.active ? 'expanded → panel alongside' : `${d.count} inside · click to open`}</div>
      <Anchors />
    </div>
  )
}

// ── Expanded container: a tinted region; only its header collapses it ───────
export function ContainerBox({ data }: NodeProps) {
  const d = data as { title: string; w: number; h: number; color: string; onCollapse: (id: string) => void; id: string }
  return (
    <div
      className="rounded-xl"
      style={{ width: d.w, height: d.h, background: alpha(d.color, 0.05), border: `1.5px solid ${alpha(d.color, 0.4)}` }}
    >
      <div
        className="px-2.5 h-[26px] flex items-center gap-1 text-[11px] font-bold cursor-pointer select-none"
        style={{ color: d.color }}
        onClick={(ev) => {
          ev.stopPropagation()
          d.onCollapse(d.id)
        }}
        title="click to collapse"
      >
        ▾ {d.title}
      </div>
      <Anchors />
    </div>
  )
}

// ── Boundary proxy (drill view): "there is more, over there" ────────────────
export function ProxyChip({ data }: NodeProps) {
  const d = data as { title: string; caption: string; color: string; dir: 'in' | 'out' }
  return (
    <div
      className="rounded-lg bg-white select-none cursor-pointer px-2.5 py-1.5"
      style={{ width: CARD_W, height: CARD_H, border: `1.5px dashed ${alpha(d.color, 0.8)}` }}
      title={`${d.title} · click to travel there`}
    >
      <div className="text-[11px] font-semibold truncate leading-tight" style={{ color: d.color }}>
        {d.dir === 'in' ? '⇢ ' : '⇠ '}
        {d.title}
      </div>
      <div className="text-[9px] text-slate-400 truncate">{d.caption}</div>
      <Anchors />
    </div>
  )
}

/** Floating bar for the sticky link-trace selection (map + drill): names the
 *  traced node and carries the jump that used to fire directly on leaf click. */
export function SelectionBar({ title, color, onRadial, onClear }: { title: string; color: string; onRadial: () => void; onClear: () => void }) {
  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-lg bg-white/95 border border-amber-300 shadow-md px-2.5 py-1.5 text-[11px]">
      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: color }} />
      <span className="font-semibold text-slate-800">{title}</span>
      <span className="text-slate-400">— links traced</span>
      <button onClick={onRadial} className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-700">
        ⌖ Radial
      </button>
      <button onClick={onClear} className="px-1.5 py-0.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-500" title="clear selection">
        ✕
      </button>
    </div>
  )
}

/** Cognitive-budget chip: how much is on screen right now vs. the whole corpus. */
export function BudgetHud({ boxes, links }: { boxes: number; links: number }) {
  const tone = boxes <= 25 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : boxes <= 60 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-rose-700 bg-rose-50 border-rose-200'
  return (
    <div className={`absolute bottom-3 left-3 z-10 rounded-full border px-3 py-1 text-[11px] font-medium shadow-sm ${tone}`}>
      on screen: {boxes} boxes · {links} links <span className="opacity-50">/ 68 nodes · 200 links total</span>
    </div>
  )
}
