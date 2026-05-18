import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'

export interface KGNodeData {
  label: string
  nodeType: string
  hasChildren: boolean
  layerIndex?: number   // 0–3, drives accent color
  dimmed?: boolean      // world map: non-visible nodes
  [key: string]: unknown
}

// Accent color per layer — consistent across both panes
const LAYER_COLORS = [
  'border-blue-400 bg-blue-50 text-blue-800',          // 0 Departments
  'border-emerald-400 bg-emerald-50 text-emerald-800', // 1 Professors
  'border-amber-400 bg-amber-50 text-amber-800',       // 2 Courses
  'border-violet-400 bg-violet-50 text-violet-800',    // 3 Students
  'border-rose-400 bg-rose-50 text-rose-800',          // 4 Subtopics
]

export function KGNodeComponent({ data, selected }: NodeProps) {
  const { label, hasChildren, layerIndex, dimmed } = data as KGNodeData

  const colorClass =
    (data as KGNodeData).clusterColor as string
    ?? (layerIndex !== undefined ? LAYER_COLORS[layerIndex] : undefined)
    ?? 'border-slate-300 bg-white text-slate-700'

  return (
    <div
      className={[
        'relative flex items-center justify-center rounded-xl border-2 shadow-sm transition-all duration-150 cursor-pointer select-none text-sm font-medium',
        colorClass,
        dimmed ? 'opacity-30 pointer-events-none' : '',
        !dimmed && selected
          ? 'ring-2 ring-offset-2 ring-blue-500 shadow-md scale-105'
          : '',
        !dimmed && !selected ? 'hover:scale-105 hover:shadow-md' : '',
      ].join(' ')}
      style={{ width: 120, height: 50 }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <span className="px-2 text-center leading-tight">{label}</span>

      {hasChildren && !dimmed && (
        <span className="absolute bottom-0.5 right-1.5 text-[10px] opacity-50">▼</span>
      )}

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  )
}

// Exported color metadata for use in legends and headers
export { LAYER_COLORS }
