import type { FilterStep } from '../types'

interface BreadcrumbProps {
  filterPath: FilterStep[]
  layerNames: string[]
  currentLayerIndex: number
  onNavigateTo: (stepIndex: number) => void
}

export function Breadcrumb({ filterPath, layerNames, currentLayerIndex, onNavigateTo }: BreadcrumbProps) {
  const currentLayerName = layerNames[currentLayerIndex] ?? `Layer ${currentLayerIndex}`

  return (
    <nav className="flex items-center gap-1 text-sm flex-wrap">
      {/* Root entry */}
      <button
        onClick={() => onNavigateTo(-1)}
        className="text-blue-600 hover:underline font-medium"
      >
        All {layerNames[0]}
      </button>

      {filterPath.map((step, i) => (
        <span key={step.nodeId} className="flex items-center gap-1">
          <span className="text-slate-400">›</span>
          {i < filterPath.length - 1 ? (
            <button
              onClick={() => onNavigateTo(i)}
              className="text-blue-600 hover:underline"
            >
              {step.nodeLabel}
            </button>
          ) : (
            <span className="text-slate-500">{step.nodeLabel}</span>
          )}
        </span>
      ))}

      {/* Current layer name */}
      <span className="flex items-center gap-1">
        <span className="text-slate-400">›</span>
        <span className="font-semibold text-slate-700">{currentLayerName}</span>
      </span>
    </nav>
  )
}
