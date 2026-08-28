import type { CSSProperties, MouseEvent, ReactNode } from 'react'
import { useState } from 'react'

import { wrapTip } from '../chrome/IconButton'

/** THE FLOATING MAP CHROME RECIPE — a raised white square that sits directly on the map
 *  canvas: zoom, levels and visibility all wear it. It is deliberately not `IconButton`:
 *  `IconButton` is borderless at rest and reveals its border on hover (the pane-header
 *  recipe, for a control that belongs to something else). A control floating alone on open
 *  canvas needs to be findable at rest, so this one is bordered and raised (`--lift-1`)
 *  ALWAYS, and only its FACE steps on hover — never its border, never a shadow change.
 *
 *  Hover is tracked in state rather than left to the `[data-kn-hover]` CSS hook: the hook
 *  only wins when the control's background/border come from the stylesheet, and this one's
 *  come from an inline style object (CLAUDE.md's "one failure mode" note on that hook). */
export interface MapFloatingButtonProps {
  /** px, square. 38 is the standard for a lone button; pass the same size to both halves of
   *  a stacked pair (see `ZoomControl`) so the divider sits exactly at the midline. */
  size?: number
  /** this control's target state is active right now (e.g. the levels popover is open) —
   *  draws the moss wash/border, never a hue swap on the icon alone */
  selected?: boolean
  disabled?: boolean
  /** the tooltip, folded by `wrapTip` — never type one out unfolded */
  title?: string
  label?: string
  children?: ReactNode
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  /** POSITION ONLY on the surrounding pane — where THIS button sits, not its face. Do not
   *  restyle border/background/shadow from a caller; that is what this component owns. */
  style?: CSSProperties
}

export function MapFloatingButton({ size = 38, selected, disabled, title, label, onClick, children, style }: MapFloatingButtonProps) {
  const [hot, setHot] = useState(false)
  return (
    <button
      type="button"
      title={wrapTip(title)}
      aria-label={label || title}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid ' + (selected ? 'var(--moss-400)' : 'var(--border-rule)'),
        borderRadius: 'var(--radius-md)',
        background: selected ? 'var(--accent-primary-wash)' : hot && !disabled ? 'var(--surface-hover-raised)' : 'var(--surface-raised)',
        color: selected ? 'var(--accent-primary-ink)' : 'var(--text-1)',
        boxShadow: 'var(--lift-1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 'var(--opacity-disabled)' : 1,
        transition: 'var(--transition-wash)',
        padding: 0,
        ...style,
      }}
    >
      {children}
    </button>
  )
}
