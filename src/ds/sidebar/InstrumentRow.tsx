import { useState } from 'react'

/** One instrument in the palette: toggles its pane on or off the composition.
 *  ● on screen / ○ benched. Typed port of the DS InstrumentRow.jsx.
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
      <span style={{ width: 12, textAlign: 'center', flexShrink: 0, color: on ? 'var(--accent-primary)' : 'var(--text-3)' }}>{on ? '●' : '○'}</span>
      {swatch ? <span style={{ width: 8, height: 8, borderRadius: 3, background: swatch, flexShrink: 0 }} /> : null}
      <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
    </button>
  )
}
