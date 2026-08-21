// FloatingPanel (#76) — a reusable overlay that a pane can host: draggable by
// its legend title (a DS PaneHeader with `grabbable`) OR a bottom move-grip,
// resizable from any edge/corner,
// optionally auto-hiding, and remembering its size+position across reloads. Its
// title rides in the top border as a legend, like every Studio pane. It bakes in
// NO walk-specific
// assumptions; the Walk Editor Toolbox (#54) is its first consumer but the panel
// only knows about a rect, a host box, and its children.
//
// The shell is deliberately thin: every pixel of arithmetic lives in
// ./floatingPanelRect (pure, unit-tested). Here we only translate pointer motion
// into deltas, hand them to drag()/resize(), and paint the result.
//
// The core is named floatingPanelRect (not floatingPanel) on purpose: a
// `floatingPanel.ts` next to `FloatingPanel.tsx` collides on a case-insensitive
// filesystem, and `@/ui/FloatingPanel` would resolve `.ts` before `.tsx` and
// import the core instead of this component. Distinct names avoid that.
//
// HOST CONTRACT: mount this inside an element with `position: relative`. The
// panel positions itself absolutely against that offsetParent, and reads its
// size from it for clamping and auto-hide.

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'

import { PaneHeader, PaneScroller, wrapTip } from '@/ds'
import { drag, loadRect, resize, saveRect } from './floatingPanelRect'
import type { Bounds, Rect, ResizeEdge, SizeLimits } from './floatingPanelRect'

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
    // NB: no overflow:hidden here — the legend title straddles the top border and
    // would be clipped by it. The scroll body below clips its own content instead.
  }

  // a small drawn four-way move arrow (DS direction: load-bearing marks are drawn
  // geometry, not glyphs) — currentColor so it inherits the grip's text colour.
  const moveIcon = (
    <svg viewBox="0 0 12 12" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 1.2v9.6M1.2 6h9.6" />
      <path d="M6 1.2 4.7 2.7M6 1.2 7.3 2.7M6 10.8 4.7 9.3M6 10.8 7.3 9.3M1.2 6 2.7 4.7M1.2 6 2.7 7.3M10.8 6 9.3 4.7M10.8 6 9.3 7.3" />
    </svg>
  )

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={title ?? 'panel'}
      aria-hidden={!visible}
      className="flex flex-col min-w-0 min-h-0 select-none"
      style={frame}
    >
      {/* The title sits ON the top border like a legend AND is the primary drag
          handle (#54): grabbing the title moves the panel. This WAS a hand-written
          copy of PaneHeader's legend, forked only because the header had no way to
          make its title grabbable; `grabbable` + `onGrabStart` landed upstream on
          2026-08-18 (OB-013), so the copy is deleted and the component owns the
          notch, the mask, the type and the cursor. We keep the position, which is
          the whole division of labour — the header supplies the affordance, the host
          knows its coordinate space.

          legendBg is REQUIRED here and is not the default: PaneHeader masks the
          border it interrupts with the colour BEHIND the pane, which for a docked
          pane is the canopy desk. This panel floats on --surface-raised, and the
          default would paint a canopy-coloured notch across its own top border.

          The header's inner row carries z-index 2, matching what this fork set, so
          it still wins over the 4px 'n' resize strip beneath it — the title moves
          and the bare border resizes, two affordances on one edge. */}
      <PaneHeader
        title={title ?? ''}
        legendBg="var(--surface-raised)"
        grabbable
        onGrabStart={(e) => beginGesture(e, 'move')}
      />

      {/* body — the consumer's content (a DS Toolbar, buttons, …); it owns the
          clip so the frame can stay overflow-visible for the straddling title. */}
      <PaneScroller>{children}</PaneScroller>

      {/* the SECOND drag affordance the spec names (#54): a move grip straddling
          the bottom-centre border, a twin of the title notch. z-index over the
          's' resize strip so the centre moves and the flanks still resize. */}
      <div
        aria-label="floating-panel-move"
        title={wrapTip('drag to move')}
        onPointerDown={(e) => beginGesture(e, 'move')}
        style={{ position: 'absolute', left: '50%', bottom: 0, zIndex: 3, transform: 'translate(-50%, 50%)', display: 'grid', placeItems: 'center', width: 18, height: 14, borderRadius: 'var(--radius-pill)', background: 'var(--surface-raised)', border: '1px solid var(--border-rule)', color: 'var(--text-3)', cursor: 'move' }}
      >
        {moveIcon}
      </div>

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
