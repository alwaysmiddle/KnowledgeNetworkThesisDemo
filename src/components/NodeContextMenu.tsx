import { useEffect, useRef } from 'react'

interface NodeContextMenuProps {
  nodeId: string
  nodeLabel: string
  canDrillDown: boolean
  canDrillUp: boolean
  onDrillDown: () => void
  onDrillUp: () => void
  onClose: () => void
  position: { x: number; y: number }
}

export function NodeContextMenu({
  nodeLabel,
  canDrillDown,
  canDrillUp,
  onDrillDown,
  onDrillUp,
  onClose,
  position,
}: NodeContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={menuRef}
      style={{ top: position.y, left: position.x }}
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-2 min-w-[140px]"
    >
      <div className="text-xs font-semibold text-slate-500 px-2 py-1 truncate border-b border-slate-100 mb-1">
        {nodeLabel}
      </div>
      <button
        onClick={() => { onDrillDown(); onClose() }}
        disabled={!canDrillDown}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-left transition-colors
          disabled:text-slate-300 disabled:cursor-not-allowed
          enabled:text-slate-700 enabled:hover:bg-blue-50 enabled:hover:text-blue-700"
      >
        <span>↓</span> Drill Down
      </button>
      <button
        onClick={() => { onDrillUp(); onClose() }}
        disabled={!canDrillUp}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-left transition-colors
          disabled:text-slate-300 disabled:cursor-not-allowed
          enabled:text-slate-700 enabled:hover:bg-blue-50 enabled:hover:text-blue-700"
      >
        <span>↑</span> Drill Up
      </button>
    </div>
  )
}
