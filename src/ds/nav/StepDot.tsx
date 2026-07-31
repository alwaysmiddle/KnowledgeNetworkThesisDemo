/** A numbered stop on the active walk: done (behind the cursor), current (the
 *  cursor), or ahead (not yet reached). Typed port of the DS StepDot.jsx. */
export interface StepDotProps {
  n: number
  /** done = behind the cursor, current = the cursor, ahead = not yet reached */
  state?: 'done' | 'current' | 'ahead'
  /** the stop's authored note */
  title?: string
  onClick?: () => void
}

export function StepDot({ n, state = 'ahead', onClick, title }: StepDotProps) {
  const skin =
    state === 'current'
      ? { bg: 'var(--accent-walk)', bd: 'var(--accent-walk)', ink: 'var(--text-inverse)' }
      : state === 'done'
        ? { bg: 'var(--acorn-100)', bd: 'var(--acorn-200)', ink: 'var(--text-walk)' }
        : { bg: 'var(--surface-raised)', bd: 'var(--border-rule)', ink: 'var(--text-3)' }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        width: 24,
        height: 24,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        borderRadius: 'var(--radius-pill)',
        border: '1px solid ' + skin.bd,
        background: skin.bg,
        color: skin.ink,
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--fs-micro)',
        fontWeight: 'var(--fw-medium)',
        fontVariantNumeric: 'var(--tnum)',
        cursor: 'pointer',
        transition: 'var(--transition-wash)',
      }}
    >
      {n}
    </button>
  )
}
