import React from 'react'

/** The Studio's small bordered control — pane toggles, undo/redo, mode switches.
 *  `tone` carries meaning: 'neutral' for reversible state, 'warn' for a state
 *  that changes what the road resolves to. */
export function ToggleButton({ children, tone = 'neutral', active, disabled, onClick, title }) {
  const warn = tone === 'warn'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        minHeight: 'var(--road-hit-min)',
        padding: '0 var(--space-2)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontFamily: 'inherit',
        fontSize: 'var(--fs-caption)',
        lineHeight: 1,
        borderRadius: 'var(--radius-sm)',
        border: 'var(--stroke-hair) solid ' + (warn ? 'var(--amber-400)' : 'var(--border-card)'),
        background: warn ? 'var(--amber-50)' : active ? 'var(--slate-100)' : 'var(--surface-card)',
        color: warn ? 'var(--amber-700)' : 'var(--text-2)',
        opacity: disabled ? 'var(--opacity-disabled)' : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}
