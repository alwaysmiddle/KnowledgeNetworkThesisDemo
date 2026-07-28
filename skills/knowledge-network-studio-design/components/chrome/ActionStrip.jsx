import React from 'react'

/** The selection's actions, DOCKED to the foot of the pane. Replaces a floating
 *  toolbar that chased the selection box, flipped above/below by available
 *  space, wrapped by width arithmetic, and spawned a popover beneath itself.
 *  Docked means: one fixed place, room for full sentences, no layout math. */
export function ActionStrip({ count, children, prompt }) {
  return (
    <div
      style={{
        flex: '0 0 auto',
        borderTop: 'var(--stroke-hair) solid var(--border-rule)',
        background: 'var(--surface-card)',
        padding: 'var(--space-15) var(--space-2)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-15)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-15)', minHeight: 'var(--road-bar-row-h)' }}>
        <span style={{ fontSize: 'var(--fs-caption)', fontWeight: 'var(--fw-semibold)', color: count ? 'var(--state-selected)' : 'var(--text-3)' }}>
          {count ? count + ' selected' : 'nothing selected'}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flexWrap: 'wrap' }}>{children}</span>
      </div>
      {prompt && (
        <div
          style={{
            borderTop: 'var(--stroke-hair) solid var(--border-hairline)',
            paddingTop: 'var(--space-15)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          {prompt}
        </div>
      )}
    </div>
  )
}

/** a destructive-choice row inside the strip's prompt area — full sentences */
export function ActionChoice({ children, danger, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left',
        minHeight: 'var(--road-hit-min)',
        padding: '0 var(--space-15)',
        fontFamily: 'inherit',
        fontSize: 'var(--fs-body)',
        borderRadius: 'var(--radius-sm)',
        border: 'var(--stroke-hair) solid ' + (danger ? 'var(--state-danger)' : 'var(--border-card)'),
        background: danger ? 'var(--state-danger-wash)' : 'var(--surface-card)',
        color: danger ? 'var(--state-danger)' : 'var(--text-1)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
