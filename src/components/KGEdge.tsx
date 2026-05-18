import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'
import type { EdgeProps } from '@xyflow/react'

export interface KGEdgeData {
  relationship: string
  [key: string]: unknown
}

export function KGEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const { relationship } = (data ?? {}) as KGEdgeData

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  return (
    <>
      <BaseEdge id={id} path={edgePath} className="stroke-slate-300" style={{ strokeWidth: 1.5 }} />
      {relationship && (
        <EdgeLabelRenderer>
          <span
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            className="absolute pointer-events-none bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-500 shadow-sm"
          >
            {relationship}
          </span>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
