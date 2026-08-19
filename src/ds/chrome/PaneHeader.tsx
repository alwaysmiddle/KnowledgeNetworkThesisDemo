import { useRef } from 'react'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { usePresence } from './IconButton'

/** Every instrument pane wears the same hat: just its title, sitting ON the
 *  pane's own hairline border like a legend — the border is the frame and the
 *  title is part of it. A pane carries NO subtitle or description line.
 *  `variant="bar"` is the older filled title row.
 *
 *  The ✕ keeps the scrollbar's manners: absent while the pane is at rest,
 *  present the moment the pointer (or the keyboard) is inside it, so a dormant
 *  pane wears an unbroken border rather than a hole where a control used to be.
 *  WHAT THE PANE AROUND IT MUST DO — three rules this header's geometry depends on
 *  that no prop can express. They lived only in the DS readme until 2026-08-17, where a
 *  port could not see them, and all three were missed here:
 *
 *   1. `position: relative`, the `--border-frame` hairline on the pane itself, and
 *      `--radius-lg` (20px) corners. The legend masks the border with a straight 2px
 *      bar, which cannot erase a curve — a tighter radius leaves a stub beside the ✕.
 *   2. THE BODY TAKES NO BACKGROUND OF ITS OWN; the pane's `--surface-paper` shows
 *      through. This header is 11px tall, so a body that paints its own colour starts
 *      INSIDE the 20px corner arc with square corners and bites two square notches out
 *      of the pane's rounded top — worst when that colour is `--surface-canopy`, which
 *      reads as a hole in the sheet. A body that must clip rounds ALL FOUR corners at
 *      `--radius-lg`, never the bottom two alone.
 *   3. A SCROLLING BODY INSETS ITSELF 12px FROM THE BOTTOM (`marginBottom`, not a radius
 *      on the scroller), so the scrollbar's end arrow stays clear of the corner arc
 *      instead of being clipped by it; the pane's own paper fills the strip.
 *
 *  Typed port of the DS PaneHeader.jsx (contract: PaneHeader.d.ts). */
export interface PaneHeaderProps {
  /** lower case, one or two words: "tree", "document", "palette" */
  title: string
  /** an optional Unicode mark from the house set */
  glyph?: string
  onClose?: () => void
  /** pane-scoped controls, rendered on the frame beside the title. The legend slot
   *  is 18px tall — put only icon-height controls here, never a full-height pill, and
   *  build them to the house icon-button recipe: round, transparent, with a **1px
   *  transparent border reserved at rest** so hover cannot move the glyph, then face
   *  → `--surface-hover`, border → `--border-rule`, ink `--text-2` → `--text-1`, and
   *  nothing else. A control on a frame is chrome, never destructive-hued */
  actions?: ReactNode
  /** legend = the title straddles the pane border (default); bar = a filled row */
  variant?: 'legend' | 'bar'
  /** what sits BEHIND the pane, so the legend can mask the border it interrupts */
  legendBg?: string
}

export function PaneHeader({ title, glyph, onClose, actions, variant = 'legend', legendBg = 'var(--surface-canopy)' }: PaneHeaderProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  // the ✕ keeps the scrollbar's grace period, and it is ONE grace period: the clock
  // lives in IconButton and is read from the script that owns it. `parent` because
  // this header is rendered BY the pane, so presence is the PANE's, not the hat's.
  const live = usePresence(rootRef, { parent: true })
  const iconStyle = (over: CSSProperties, box: number): CSSProperties => ({
    ...over,
    width: box,
    height: box,
    display: 'grid',
    placeItems: 'center',
    padding: 0,
    borderRadius: 'var(--radius-pill)',
    border: '1px solid transparent',
    background: 'transparent',
    color: 'var(--text-2)',
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: 'var(--transition-wash)',
    lineHeight: 1,
    fontSize: box === 18 ? 10 : 13,
  })
  const hoverOn = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'var(--surface-hover)'
    e.currentTarget.style.borderColor = 'var(--border-rule)'
    e.currentTarget.style.color = 'var(--text-1)'
  }
  const hoverOff = (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = 'transparent'
    e.currentTarget.style.borderColor = 'transparent'
    e.currentTarget.style.color = 'var(--text-2)'
  }
  if (variant === 'legend') {
    // The title is transparent: only the 1px border LINE is masked behind it, so
    // the frame reads as interrupted rather than as a filled chip sitting on it.
    // The row is inset by the pane's corner radius on the trailing side so the
    // ✕'s notch stops where the corner arc begins — a straight 2px mask cannot
    // erase a curve, so a notch that reaches into the arc leaves a stub of border
    // beside the button.
    const cut: CSSProperties = { position: 'absolute', left: 0, right: 0, top: 'calc(50% - 1px)', height: 2, background: legendBg, zIndex: 0 }
    const over: CSSProperties = { position: 'relative', zIndex: 1 }
    return (
      <div ref={rootRef} style={{ position: 'relative', flexShrink: 0, height: 11 }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 16,
            right: 20,
            zIndex: 2,
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            pointerEvents: 'none',
          }}
        >
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'baseline', minWidth: 0, padding: '0 5px', pointerEvents: 'auto' }}>
            <span style={cut} />
            <span
              style={{
                ...over,
                transform: 'translateY(-1px)',
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--fs-title)',
                fontWeight: 'var(--fw-semibold)',
                color: 'var(--text-1)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {glyph ? glyph + ' ' : ''}
              {title}
            </span>
          </span>
          <span style={{ flex: 1 }} />
          {actions ? (
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 7px', pointerEvents: 'auto' }}>
              <span style={cut} />
              <span style={{ ...over, display: 'inline-flex', alignItems: 'center', gap: 6, maxHeight: 18, overflow: 'hidden' }}>{actions}</span>
            </span>
          ) : null}
          {onClose ? (
            <span
              style={{
                position: 'relative',
                padding: '0 1px 0 5px',
                flexShrink: 0,
                display: 'inline-flex',
                opacity: live ? 1 : 0,
                pointerEvents: live ? 'auto' : 'none',
                transition: 'opacity var(--dur-hover) var(--ease-soft)',
              }}
            >
              <span style={{ ...cut, left: 4 }} />
              <button type="button" onClick={onClose} title="close" tabIndex={live ? 0 : -1} style={iconStyle(over, 18)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
                {'✕'}
              </button>
            </span>
          ) : null}
        </div>
      </div>
    )
  }
  return (
    <header
      style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        minHeight: 'var(--pane-header-h)',
        padding: '7px var(--pane-pad-x)',
        borderBottom: '1px solid var(--border-hair)',
        background: 'var(--surface-paper)',
        borderTopLeftRadius: 'var(--radius-lg)',
        borderTopRightRadius: 'var(--radius-lg)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--fs-title)',
          fontWeight: 'var(--fw-bold)',
          color: 'var(--text-1)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {glyph ? glyph + ' ' : ''}
        {title}
      </span>
      <span style={{ flex: 1 }} />
      {actions}
      {onClose ? (
        <button type="button" onClick={onClose} title="close" style={iconStyle({}, 24)} onMouseEnter={hoverOn} onMouseLeave={hoverOff}>
          {'✕'}
        </button>
      ) : null}
    </header>
  )
}
