import React from 'react'

/** The fixed left slot on every block. STATUS ONLY — never an action.
 *  Exactly one of: the resolved step number, or a shape mark. */
export function StatusGutter({ order, optional, fork, revisit, tone = 'road' }) {
  const box = {
    width: 'var(--road-gutter-w)',
    flex: '0 0 var(--road-gutter-w)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 'var(--fs-micro)',
    lineHeight: 1,
    color: 'var(--text-3)',
    userSelect: 'none',
  }
  if (order !== undefined && order !== null)
    return (
      <span style={box} aria-label={'step ' + order}>
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: tone === 'road' ? 'var(--road-badge)' : 'var(--slate-400)',
            color: 'var(--road-badge-ink)',
            fontWeight: 'var(--fw-bold)',
            fontVariantNumeric: 'tabular-nums',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {order}
        </span>
      </span>
    )
  const mark = fork ? '\u2942' : optional ? '\u25c7' : revisit ? '\u21ba' : null
  if (!mark) return <span style={box} />
  return (
    <span style={{ ...box, color: fork ? 'var(--road-live)' : 'var(--text-3)' }} aria-hidden="true">
      {mark}
    </span>
  )
}
