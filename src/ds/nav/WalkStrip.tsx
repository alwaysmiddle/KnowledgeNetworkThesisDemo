import { Fragment, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'

import { NodeArrow } from '../graph/NodeArrow'
import { IconButton, usePresence, wrapTip } from '../chrome/IconButton'
import { PaneFrameContext } from '../chrome/PaneHeader'
import { WalkerMark } from '../chrome/WalkerMark'
import { LocateMark } from '../chrome/LocateMark'
import { StepDot } from './StepDot'

/** THE STRIP'S GEOMETRY, published for the same reason `RAIL_METRICS` is: a number
 *  written once here and read back by the renderer cannot drift from a number retyped
 *  at a call site. */
export const WALK_METRICS = {
  dot: 28,
  slotW: 56,
  gap: 34,
  labelOverhang: 16,
  walkerLift: 4,
  corner: 28,
}

/**
 * THE ACTIVE WALK AS A HORIZONTAL STRIP — a dedicated pane for one question: where the
 * cursor is on the current walk, what is behind it, what is ahead. Distinct from
 * `TrailStrip.tsx`'s old walk column, which listed the same `StepDot` row without a
 * scroll rail, a cursor mark, or a way back to it once scrolled away.
 *
 * WHAT THE THREE STATES ALREADY CARRY, so this component adds nothing new for it:
 * `StepDot`'s `done` / `current` / `ahead` reads walked vs. future by ITSELF (acorn
 * wash vs. plain grey vs. the filled current dot). This component's only addition is
 * the WALKER — a mark for "the cursor is here" — and the ARROW TONE, which restates the
 * same fact along the connecting line: acorn behind the cursor, quiet bark ahead. Never
 * dashed for this — dashing means CONDITIONAL, and "not yet walked" is not that.
 *
 * Typed port of the DS WalkStrip.jsx (contract: WalkStrip.d.ts). */
export interface WalkStep {
  id: string
  title: string
  /** tooltip / notes shown on hover of the dot */
  note?: string
  /** the step the walk may skip. Draws with a DASHED ring — never a different colour
   *  or weight — and the arrow leading INTO it dashes on its own; never pass `dashed`
   *  anywhere for that yourself. Same rule `NodeChain` already follows for `NodeChip`. */
  optional?: boolean
}

export interface WalkStripProps {
  /** the walk's steps, in order. THE HOST OWNS THIS LIST, same split as `NodeRail`'s
   *  `stops` — which nodes are on the walk is corpus/session state, not drawing */
  steps: WalkStep[]
  /** 'seek' (default) — no scrollbar, a waypoint seek bar under the track instead.
   *  'scrollbar' — the house-styled native scrollbar, no seek bar, no waypoints, no
   *  hover preview (a native scrollbar has no hoverable surface to hang one on).
   *  Both variants share every other piece — the track, the walker, the optional
   *  treatment, the corner act — through the same code path; only the track's own
   *  scroll affordance changes. */
  variant?: 'seek' | 'scrollbar'
  /** shows the walk's own node count ("12 nodes", bare like `VersionedGroup`'s own
   *  tally) in a reserved row above the track. Off by default — this MOVES THE BOX: it
   *  adds 18px to the strip's own minimum height (154 → 172). */
  showCount?: boolean
  /** index of the step the cursor is standing on. THE HOST OWNS THIS, AND ONLY THIS —
   *  the strip has no click-to-jump. A step's dot and label are display only; the app
   *  is the one thing allowed to move the cursor. */
  cursor: number
  /** the pointer entered step `index`, or left every step (`null`). This is NOT how
   *  the cursor moves — it is the one thing a pointer here still reports, for another
   *  pane that wants to react to "the user is looking at step N" without the strip
   *  needing to know why. */
  onStepHover?: (index: number | null) => void
  /** the pointer entered the arrow leading INTO step `index`, or left every arrow
   *  (`null`). Same report-only contract as `onStepHover`, for the gap rather than the
   *  stop itself. */
  onArrowHover?: (index: number | null) => void
  /** SEEK VARIANT ONLY — the seek bar (or a click-and-drag pan of the track itself)
   *  picked step `index`, live during a drag. This is the one control in the whole
   *  component allowed to move the walk's cursor; the host is expected to set
   *  `cursor` to `index` in response. Never fires in `variant="scrollbar"`. */
  onSeek?: (index: number) => void
  /** hovering the seek bar (no click), OR a node's own dot, shows a small preview
   *  window near the pointer/dot. Return the preview content for `step`; the strip
   *  only positions the popup and never invents a fallback — omit this and hovering
   *  shows nothing extra. */
  renderPreview?: (step: WalkStep, index: number) => ReactNode
  /** fires after the corner act recentres the scroller. */
  onRecenter?: () => void
}

interface StopProps {
  n: number
  title: string
  note?: string
  state: 'done' | 'current' | 'ahead'
  current: boolean
  optional?: boolean
  onHover?: (index: number | null) => void
  onPreviewEnter?: (index: number, rect: DOMRect) => void
  onPreviewLeave?: () => void
  dragging?: () => boolean
  wrapRef: (el: HTMLDivElement | null) => void
}

/** ONE STEP: the dot, the walker mark above it when it is the cursor, and the step's
 *  own name wrapped underneath, up to two lines. The label is WIDER than the dot's own
 *  column (`labelOverhang` on each side) and centred on it with a negative margin. */
// note isn't read here — same as the DS's own Stop, which destructures it and never
// uses it either; kept in StopProps only because it's a real WalkStep field callers pass
function Stop({ n, title, state, current, optional, onHover, onPreviewEnter, onPreviewLeave, dragging, wrapRef }: StopProps) {
  const M = WALK_METRICS
  return (
    <div ref={wrapRef} title={wrapTip(optional ? title + ' (optional)' : title)}
      onMouseEnter={(e) => {
        if (dragging && dragging()) return
        if (onHover) onHover(n - 1)
        if (onPreviewEnter) onPreviewEnter(n - 1, e.currentTarget.getBoundingClientRect())
      }}
      onMouseLeave={() => {
        if (dragging && dragging()) return
        if (onHover) onHover(null)
        if (onPreviewLeave) onPreviewLeave()
      }}
      style={{ flex: 'none', width: M.slotW, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{ position: 'relative', display: 'flex' }}>
        {current ? (
          <span aria-hidden="true" style={{
            position: 'absolute', left: '50%', bottom: '100%', transform: 'translateX(-50%)',
            marginBottom: M.walkerLift, color: 'var(--accent-walk)',
          }}>
            <WalkerMark size={22} animated />
          </span>
        ) : null}
        <StepDot n={n} state={state} size={M.dot} optional={optional} />
      </div>
      {/* THE TITLE'S OWN CLAMP (2 LINES) NEVER INCLUDES "(OPTIONAL)" — it is a sibling
          block below, not appended inside the clamped span, so a title that already
          fills both lines cannot swallow the appended word. */}
      <span style={{
          width: M.slotW + M.labelOverhang * 2, margin: `0 -${M.labelOverhang}px`,
          overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: optional ? 3 : 2,
          textAlign: 'center', textWrap: 'pretty',
          fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-micro)', lineHeight: 'var(--lh-snug)',
          fontWeight: current ? 'var(--fw-semibold)' : 'var(--fw-regular)',
          color: current ? 'var(--text-walk)' : state === 'done' ? 'var(--text-2)' : 'var(--text-3)',
        } as CSSProperties}>{title}{optional ? (
          <span style={{ fontStyle: 'italic', fontWeight: 'var(--fw-regular)', color: 'var(--text-3)' }}> (optional)</span>
        ) : null}</span>
    </div>
  )
}

interface DragState { x: number; scrollLeft: number; moved: boolean }

export function WalkStrip({ steps = [], cursor = 0, variant = 'seek', showCount = false, onStepHover, onArrowHover, onRecenter, onSeek, renderPreview }: WalkStripProps) {
  const M = WALK_METRICS
  const scrollbar = variant === 'scrollbar'
  const rootRef = useRef<HTMLDivElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)
  /* EVERY STEP'S OWN WRAPPER, keyed by index — a plain object rather than a Map so a
     step that unmounts just leaves a stale key nobody reads again next tick. */
  const stopEls = useRef<Record<number, HTMLDivElement>>({})
  const frame = useContext(PaneFrameContext)
  const live = usePresence(rootRef, {
    resolve: () => frame?.current ?? rootRef.current?.parentElement ?? null,
  })
  const [scrollable, setScrollable] = useState(false)
  const [offCursor, setOffCursor] = useState(false)
  const [nearest, setNearest] = useState(0)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)
  const [hoverTop, setHoverTop] = useState(0)
  /* EVERY STEP'S OWN SCROLL TARGET (px), evenly spaced by INDEX across the scroll
     range — recomputed whenever the steps or the track's size changes, never on
     scroll. */
  const targetsRef = useRef<number[]>([])

  const check = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setScrollable(max > 1)
    targetsRef.current = steps.map((_, i) => (steps.length > 1 ? (i / (steps.length - 1)) * max : 0))
    let best = 0
    let bestDist = Infinity
    targetsRef.current.forEach((t, i) => {
      const d = Math.abs(t - el.scrollLeft)
      if (d < bestDist) { bestDist = d; best = i }
    })
    setNearest(best)
    const cur = stopEls.current[cursor]
    if (cur) {
      const a = el.getBoundingClientRect()
      const b = cur.getBoundingClientRect()
      setOffCursor(b.left < a.left || b.right > a.right)
    }
  }, [steps, cursor])

  useEffect(() => {
    check()
    const el = trackRef.current
    if (!el) return
    el.addEventListener('scroll', check, { passive: true })
    window.addEventListener('resize', check)
    return () => { el.removeEventListener('scroll', check); window.removeEventListener('resize', check) }
  }, [check, steps.length, cursor])

  /* WHAT THE BAR DRAWS, and the one place the two cases differ (DS OB-089). While the
     track can scroll, `nearest` is the honest answer — it is measured from the real
     scroll position, so the bar agrees with what is actually on screen. When it CANNOT
     scroll, every waypoint collapses onto the same scrollLeft (0) and `check`'s
     distance search cannot tell them apart, so `nearest` is stuck at 0 and the bar
     would read 0% on every short walk regardless of where the cursor is.
     DERIVED HERE RATHER THAN STORED: writing `cursor` into `nearest` from inside
     `check` would be setting state from a PROP inside an effect body, which is exactly
     what react-hooks/set-state-in-effect forbids (and what the note above `setNearest`
     in the app-driven effect already warns about). Nothing needs storing — both inputs
     are already here at render time. */
  const barIndex = scrollable ? nearest : cursor

  const recenter = () => {
    const el = trackRef.current
    const cur = stopEls.current[cursor]
    if (!el || !cur) return
    const target = cur.offsetLeft - el.clientWidth / 2 + cur.offsetWidth / 2
    el.scrollTo({ left: Math.max(0, target), behavior: 'smooth' })
    if (onRecenter) onRecenter()
  }

  /* THE APP CAN ALSO MOVE THE ACTIVE NODE (seek variant only): cursor is host-owned,
     and onSeek is only ONE way it changes. lastSeekRef distinguishes a cursor change
     THIS strip's own last onSeek call already reflected on screen from an app-driven
     change this effect must catch up to. */
  const lastSeekRef = useRef<number | null>(null)
  useEffect(() => {
    if (scrollbar) return
    if (lastSeekRef.current === cursor) return
    const el = trackRef.current
    const target = targetsRef.current[cursor]
    if (!el || target === undefined) return
    el.scrollTo({ left: target, behavior: 'smooth' })
    // setNearest here is paired with the DOM scroll above, not derivable from props
    // alone: it exists so the bar's own fill/thumb agree with wherever an app-driven
    // cursor change just scrolled to, which only this effect can know once it runs.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNearest(cursor)
  }, [cursor, scrollbar])

  /* THE SEEK BAR IS N FIXED WAYPOINTS, NOT A FREE SCROLLBAR: a click or drag anywhere
     on it snaps the viewport to whichever STEP is nearest the pointer. */
  const seekTo = (clientX: number) => {
    const bar = barRef.current
    const el = trackRef.current
    const targets = targetsRef.current
    if (!bar || !el || !targets.length) return
    const r = bar.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    const i = Math.round(frac * (targets.length - 1))
    el.scrollLeft = targets[i]
    setNearest(i)
    lastSeekRef.current = i
    if (onSeek) onSeek(i)
  }
  const seekingRef = useRef(false)
  const onBarPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    seekingRef.current = true
    setHoverIndex(null)
    seekTo(e.clientX)
    const move = (ev: PointerEvent) => seekTo(ev.clientX)
    const up = () => {
      seekingRef.current = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /* THE PREVIEW POPUP: hovering the bar — no click needed — shows a small window near
     the pointer for whichever step is nearest it, the same convention a video
     scrubber uses. renderPreview is the HOST's content. */
  const indexAt = (clientX: number) => {
    const bar = barRef.current
    if (!bar || !steps.length) return 0
    const r = bar.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (clientX - r.left) / r.width))
    return Math.round(frac * (steps.length - 1))
  }
  const onBarHoverMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (seekingRef.current) return
    setHoverIndex(indexAt(e.clientX))
    setHoverX(e.clientX)
    const bar = barRef.current
    if (bar) setHoverTop(bar.getBoundingClientRect().top)
  }
  const onBarHoverLeave = () => setHoverIndex(null)

  /* HOVERING A NODE'S OWN DOT ALSO SHOWS THE PREVIEW — the same popup, anchored to
     the dot instead of following the pointer. Not gated on !scrollbar: the scrollbar
     variant has no seek bar to hover, but its dots still can. */
  const onNodePreviewEnter = (i: number, rect: DOMRect) => {
    if (!renderPreview) return
    setHoverIndex(i)
    setHoverX(rect.left + rect.width / 2)
    setHoverTop(rect.top)
  }
  const onNodePreviewLeave = () => setHoverIndex(null)

  /* CLICK-AND-DRAG TO PAN THE TRACK — dragging any empty part of the track scrolls
     it, the same gesture a trackpad swipe already gives for free. A small movement
     threshold before it commits keeps an ordinary click from being read as a drag. */
  const dragRef = useRef<DragState | null>(null)
  const onTrackPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = trackRef.current
    if (!el || e.button !== 0) return
    dragRef.current = { x: e.clientX, scrollLeft: el.scrollLeft, moved: false }
    const move = (ev: PointerEvent) => {
      const d = dragRef.current
      const el2 = trackRef.current
      if (!d || !el2) return
      const dx = ev.clientX - d.x
      if (!d.moved && Math.abs(dx) > 3) {
        d.moved = true
        setHoverIndex(null)
        if (onStepHover) onStepHover(null)
        if (onArrowHover) onArrowHover(null)
      }
      if (d.moved) {
        el2.scrollLeft = d.scrollLeft - dx
        /* DRAGGING THE TRACK ITSELF ALSO MOVES THE CURSOR (seek variant only) — the
           same act the bar's own drag does; a pan and a seek are the same gesture on
           two different surfaces. */
        if (!scrollbar) {
          const targets = targetsRef.current
          let best = 0
          let bestDist = Infinity
          targets.forEach((t, i) => { const dd = Math.abs(t - el2.scrollLeft); if (dd < bestDist) { bestDist = dd; best = i } })
          setNearest(best)
          lastSeekRef.current = best
          if (onSeek) onSeek(best)
        }
      }
    }
    const up = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const cols = scrollbar ? '1fr ' + (M.corner + 8) + 'px' : '1fr'
  return (
    <div ref={rootRef} style={{ position: 'relative', height: '100%', minHeight: showCount ? 172 : 154, display: 'flex', flexDirection: 'column', minWidth: 0, padding: '0 14px', userSelect: 'none' }}>
      {/* THE COUNT SITS IN ITS OWN RESERVED ROW ABOVE THE TRACK, never over it — a
          plain absolute overlay collides with the walker mark whenever the current
          step happens to be the last one. */}
      {showCount ? (
        <div style={{ flex: 'none', height: 18, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-micro)', lineHeight: 'var(--lh-snug)', color: 'var(--text-3)' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'var(--tnum)', fontWeight: 'var(--fw-medium)' }}>{steps.length}</span>
            {' ' + (steps.length === 1 ? 'node' : 'nodes')}
          </span>
        </div>
      ) : null}
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', minWidth: 0 }}>
      {/* THE BLOCK IS A GRID, NOT A FLEX ROW, so the seek bar's row can share the exact
          same column as the content row without measuring anything. */}
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: cols, rowGap: 6, width: '100%', minWidth: 0 }}>
        <div ref={trackRef} data-sb-off={scrollbar ? undefined : ''} onPointerDown={onTrackPointerDown} style={{
          gridColumn: 1, gridRow: 1,
          minWidth: 0, display: 'flex', alignItems: 'flex-start', overflowX: 'auto', overflowY: 'hidden',
          padding: `32px ${M.labelOverhang}px 14px`, userSelect: 'none', cursor: 'grab',
          scrollbarWidth: scrollbar ? undefined : 'none', msOverflowStyle: scrollbar ? undefined : 'none',
        } as CSSProperties}>
          {steps.map((s, i) => (
            <Fragment key={s.id}>
              {i > 0 ? (
                <span style={{ flex: 'none', display: 'flex', alignItems: 'center', height: M.dot }}
                  onMouseEnter={() => { if (dragRef.current && dragRef.current.moved) return; if (onArrowHover) onArrowHover(i) }}
                  onMouseLeave={() => { if (dragRef.current && dragRef.current.moved) return; if (onArrowHover) onArrowHover(null) }}>
                  <NodeArrow direction="right" length={M.gap} tone={i <= cursor ? 'walk' : 'quiet'} dashed={!!s.optional} />
                </span>
              ) : null}
              <Stop n={i + 1} title={s.title} note={s.note} optional={s.optional}
                state={i === cursor ? 'current' : i < cursor ? 'done' : 'ahead'}
                current={i === cursor}
                wrapRef={(el) => { if (el) stopEls.current[i] = el; else delete stopEls.current[i] }}
                onHover={onStepHover} dragging={() => !!(dragRef.current && dragRef.current.moved)}
                onPreviewEnter={onNodePreviewEnter} onPreviewLeave={onNodePreviewLeave} />
            </Fragment>
          ))}
        </div>
        {/* THE SEEK BAR ROW — same column as the track, one row below. ALWAYS mounted
            in the seek variant, whether or not the track can scroll (DS OB-089,
            2026-08-26). It is the only control in this component that can move the
            cursor — the dots and the labels above it are display only — so a walk short
            enough to fit its pane still needs it. Gating it on `scrollable` left such a
            walk with no way to move the active node from here at all. */}
        {!scrollbar ? (
          <div style={{ gridColumn: 1, gridRow: 2, display: 'flex', alignItems: 'center', gap: 8, paddingRight: M.corner + 8 }}>
            {/* THE HIT AREA IS TALLER THAN THE DRAWN RAIL — a browser's own scrollbar
                solves this with an invisible gutter wider than the drawn thumb; this
                does the same. */}
            <div ref={barRef} onPointerDown={onBarPointerDown}
              onMouseMove={onBarHoverMove} onMouseLeave={onBarHoverLeave} style={{
              flex: 1, minWidth: 0, height: 24, display: 'flex', alignItems: 'center', position: 'relative', cursor: 'pointer',
            }}>
              <div aria-hidden="true" style={{ width: '100%', height: 4, borderRadius: 'var(--radius-pill)', background: 'var(--bark-100)', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, width: (steps.length > 1 ? (barIndex / (steps.length - 1)) * 100 : 0) + '%', borderRadius: 'var(--radius-pill)', background: 'var(--accent-walk)' }} />
                <div aria-hidden="true" style={{
                  position: 'absolute', top: '50%', left: (steps.length > 1 ? (barIndex / (steps.length - 1)) * 100 : 0) + '%', width: 10, height: 10, borderRadius: 'var(--radius-pill)',
                  background: 'var(--accent-walk)', transform: 'translate(-50%, -50%)', boxShadow: 'var(--lift-1)',
                }} />
              </div>
            </div>
            <span style={{
              flex: 'none', fontFamily: 'var(--font-mono)', fontVariantNumeric: 'var(--tnum)', fontSize: 'var(--fs-micro)',
              color: 'var(--text-3)', width: 30, textAlign: 'right',
            }}>{steps.length > 1 ? Math.round((barIndex / (steps.length - 1)) * 100) : 0}%</span>
          </div>
        ) : null}
        {hoverIndex !== null && renderPreview ? (
          /* POSITIONED AGAINST THE VIEWPORT (fixed), not the bar — a preview window is
             meant to float free of the pane's own clipping. */
          <div aria-hidden="true" style={{
            position: 'fixed', left: hoverX, top: hoverTop - 12,
            transform: 'translate(-50%, -100%)', zIndex: 20, pointerEvents: 'none',
          }}>
            {renderPreview(steps[hoverIndex], hoverIndex)}
          </div>
        ) : null}
        <span style={{
          position: 'absolute', right: 2, bottom: 2,
          opacity: offCursor ? 1 : 0, pointerEvents: offCursor ? 'auto' : 'none',
          transition: 'opacity var(--dur-fade) var(--ease-soft)',
        }}>
          <IconButton size={M.corner} reveal={live && offCursor} reachable={offCursor}
            title="active node" label="active node" onClick={recenter} style={{ color: 'var(--text-3)' }}>
            <LocateMark />
          </IconButton>
        </span>
      </div>
      </div>
    </div>
  )
}
