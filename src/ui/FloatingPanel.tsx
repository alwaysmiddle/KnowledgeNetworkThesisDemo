// FloatingPanel (#76) — a reusable overlay that a pane can host: draggable by
// its handle, resizable from any edge/corner, optionally auto-hiding, and
// remembering its size+position across reloads. It bakes in NO walk-specific
// assumptions; the Walk Editor Toolbox (#54) is its first consumer but the panel
// only knows about a rect, a host box, and its children.
//
// The shell is deliberately thin: every pixel of arithmetic lives in
// ./floatingPanel (pure, unit-tested). Here we only translate pointer motion
// into deltas, hand them to drag()/resize(), and paint the result.
//
// HOST CONTRACT: mount this inside an element with `position: relative`. The
// panel positions itself absolutely against that offsetParent, and reads its
// size from it for clamping and auto-hide.

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'

import { drag, loadRect, resize, saveRect } from './floatingPanel'
import type { Bounds, Rect, ResizeEdge, SizeLimits } from './floatingPanel'

export interface FloatingPanelProps {
  /** persistence key — the panel's size+position is stored under this id */
  id: string
  /** where the panel sits when nothing is stored yet (host-local pixels) */
  defaultRect: Rect
  children: ReactNode
  /** shown in the drag handle and used as the panel's accessible name */
  title?: string
  minWidth?: number
  minHeight?: number
  /** fade out when the pointer leaves the host or goes idle; wake on activity */
  autoHide?: boolean
  /** idle time before an auto-hiding panel fades (ms) */
  idleMs?: number
}

// The eight grab zones. Edges are thin strips along a side; corners are small
// squares that sit ON TOP of the edges (rendered last) so a corner drag wins its
// overlap. The cursor names the axis it moves. Tailwind's fixed scale keeps this
// free of raw px so the file can join the #61 guard later.
const EDGES: { edge: ResizeEdge; cls: string }[] = [
  { edge: 'n', cls: 'top-0 left-0 right-0 h-1 cursor-ns-resize' },
  { edge: 's', cls: 'bottom-0 left-0 right-0 h-1 cursor-ns-resize' },
  { edge: 'w', cls: 'top-0 bottom-0 left-0 w-1 cursor-ew-resize' },
  { edge: 'e', cls: 'top-0 bottom-0 right-0 w-1 cursor-ew-resize' },
]
const CORNERS: { edge: ResizeEdge; cls: string }[] = [
  { edge: 'nw', cls: 'top-0 left-0 w-2 h-2 cursor-nwse-resize' },
  { edge: 'ne', cls: 'top-0 right-0 w-2 h-2 cursor-nesw-resize' },
  { edge: 'sw', cls: 'bottom-0 left-0 w-2 h-2 cursor-nesw-resize' },
  { edge: 'se', cls: 'bottom-0 right-0 w-2 h-2 cursor-nwse-resize' },
]

export function FloatingPanel({
  id,
  defaultRect,
  children,
  title,
  minWidth = 140,
  minHeight = 80,
  autoHide = false,
  idleMs = 2500,
}: FloatingPanelProps) {
  // rect lives in state (drives render) AND a ref (so the pointer-up handler,
  // captured once at drag start, can persist the LATEST value without being
  // re-bound every move).
  const [rect, setRect] = useState<Rect>(() => loadRect(id, defaultRect))
  // a ref mirror of rect, so the pointer-up handler (bound once at gesture start)
  // and the bounds fallback read the LATEST rect without being re-created every
  // move. Mirrored in an effect, not during render (react-hooks/refs).
  const rectRef = useRef(rect)
  useEffect(() => {
    rectRef.current = rect
  }, [rect])

  const panelRef = useRef<HTMLDivElement>(null)
  const limits: SizeLimits = { minW: minWidth, minH: minHeight }

  /** the host's content box — the offsetParent this panel is positioned against.
   * Falls back to the panel's own size (no clamping room) if it isn't mounted in
   * a positioned ancestor yet. */
  const hostBounds = (): Bounds => {
    const host = panelRef.current?.offsetParent
    if (host) return { w: host.clientWidth, h: host.clientHeight }
    return { w: rectRef.current.x + rectRef.current.w, h: rectRef.current.y + rectRef.current.h }
  }

  // One gesture handler for both drag and resize: capture the start point and the
  // rect at grab time, then map every pointermove to a delta the pure core folds
  // in. window-level listeners (not element capture) keep tracking even when the
  // pointer outruns the tiny grab strip. On release we persist once.
  const beginGesture = (e: ReactPointerEvent, kind: 'move' | ResizeEdge) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const startRect = rectRef.current
    const host = hostBounds()

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      setRect(kind === 'move' ? drag(startRect, dx, dy, host) : resize(startRect, kind, dx, dy, limits, host))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      saveRect(id, rectRef.current)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // Auto-hide: the host wakes the panel on pointer activity and fades it after an
  // idle spell or when the pointer leaves the host entirely. Moving onto the
  // panel counts as activity because pointermove bubbles from child to host;
  // leaving the host for good fires pointerleave (which a move onto the child
  // does not). The panel only fades — it stays mounted so its rect survives.
  // `faded` only means anything when autoHide is on; visibility is DERIVED so the
  // effect never sets state synchronously (react-hooks/set-state-in-effect). The
  // flag is flipped only from event handlers and the idle timeout — both async.
  const [faded, setFaded] = useState(false)
  const visible = !autoHide || !faded
  useEffect(() => {
    if (!autoHide) return
    const host = panelRef.current?.offsetParent
    if (!host) return
    let timer: ReturnType<typeof setTimeout>
    const wake = () => {
      setFaded(false)
      clearTimeout(timer)
      timer = setTimeout(() => setFaded(true), idleMs)
    }
    const leave = () => {
      clearTimeout(timer)
      setFaded(true)
    }
    host.addEventListener('pointermove', wake)
    host.addEventListener('pointerleave', leave)
    timer = setTimeout(() => setFaded(true), idleMs) // begin the idle countdown
    return () => {
      host.removeEventListener('pointermove', wake)
      host.removeEventListener('pointerleave', leave)
      clearTimeout(timer)
    }
  }, [autoHide, idleMs])

  const frame: CSSProperties = {
    position: 'absolute',
    left: rect.x,
    top: rect.y,
    width: rect.w,
    height: rect.h,
    background: 'var(--surface-raised)',
    border: '1px solid var(--border-rule)',
    borderRadius: 'var(--radius-md)',
    boxShadow: 'var(--lift-2)',
    opacity: visible ? 1 : 0,
    pointerEvents: visible ? 'auto' : 'none',
    transition: 'opacity 160ms ease',
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title ?? 'panel'}
      aria-hidden={!visible}
      className="flex flex-col min-w-0 min-h-0 overflow-hidden select-none"
      style={frame}
    >
      {/* drag handle — the whole header moves the panel. The 4px edge strips
          below sit on top of it, so grabbing the very top edge resizes instead. */}
      <div
        aria-label="floating-panel-handle"
        onPointerDown={(e) => beginGesture(e, 'move')}
        className="shrink-0 flex items-center px-2 h-6 cursor-move"
        style={{
          background: 'var(--surface-sunken)',
          borderBottom: '1px solid var(--border-rule)',
          color: 'var(--text-2)',
          fontSize: 'var(--fs-micro)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {title}
      </div>

      {/* body — the consumer's content (a DS Toolbar, buttons, …) */}
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>

      {/* grab zones, corners last so they win their overlap with the edges */}
      {[...EDGES, ...CORNERS].map(({ edge, cls }) => (
        <div
          key={edge}
          aria-label={`floating-panel-resize-${edge}`}
          onPointerDown={(e) => beginGesture(e, edge)}
          className={`absolute ${cls}`}
        />
      ))}
    </div>
  )
}
