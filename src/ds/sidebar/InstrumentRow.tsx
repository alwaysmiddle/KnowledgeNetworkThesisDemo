import { useState } from 'react'
import type { CSSProperties } from 'react'

import { useClipped } from '../chrome/IconButton'

/** THE selection bullet, drawn rather than typed for the same reason as the
 *  disclosure caret: ● and ○ are wildly different weights in the same face, sit
 *  off the text baseline, and rescale with the font. This is an 8px disc — filled
 *  --accent-primary when ON, an inset 1.5px --text-3 ring when benched — matching
 *  DomainDot's diameter so a list can carry both marks in one column without them
 *  arguing. It is a state light: not a checkbox (no third state), not a radio
 *  (rows are independent). */
function bulletStyle(on?: boolean): CSSProperties {
  return {
    width: 8,
    height: 8,
    flexShrink: 0,
    borderRadius: 'var(--radius-pill)',
    background: on ? 'var(--accent-primary)' : 'transparent',
    boxShadow: on ? 'none' : 'inset 0 0 0 1.5px var(--text-3)',
    transition: 'var(--transition-wash)',
  }
}

/** The state bullet itself, drawn — never a style object handed to a caller. */
export function Bullet({ on }: { on?: boolean }) {
  return <span style={bulletStyle(on)} />
}

/** One instrument in the palette: toggles its pane on or off the composition.
 *  Filled bullet on screen / ring benched. Typed port of the DS InstrumentRow.jsx.
 *
 *  Note: the DS row carries no composition-order index — the earlier flat list's
 *  per-row number is not part of this contract (order is read from the pane
 *  layout itself). A lens row takes an edge-kind `swatch`; every other instrument
 *  omits it. */
export interface InstrumentRowProps {
  /** as registered, e.g. "Map", "Walk · Palette", "Lens: builds on" */
  label: string
  /** currently on screen */
  on?: boolean
  /** an edge-kind colour for lens rows; omit for every other instrument */
  swatch?: string
  /** registered but not available on this surface — dimmed to --opacity-disabled */
  disabled?: boolean
  onClick?: () => void
}

export function InstrumentRow({ label, on, swatch, disabled, onClick }: InstrumentRowProps) {
  const [hot, setHot] = useState(false)
  const labelClip = useClipped<HTMLSpanElement>(label)
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        width: '100%',
        minHeight: 'var(--hit-min)',
        padding: '5px 10px',
        textAlign: 'left',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: on ? 'var(--bark-100)' : hot && !disabled ? 'var(--surface-hover)' : 'transparent',
        color: 'var(--text-1)',
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-body)',
        fontWeight: on ? 'var(--fw-semibold)' : 'var(--fw-medium)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'var(--transition-wash)',
        opacity: disabled ? 'var(--opacity-disabled)' : 1,
      }}
    >
      <span style={{ width: 12, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
        <Bullet on={on} />
      </span>
      {swatch ? <span style={{ width: 8, height: 8, borderRadius: 3, background: swatch, flexShrink: 0 }} /> : null}
      <span {...labelClip} style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  )
}
