import React from 'react'

/** An instrument pane's header: what this pane is, then its controls. The
 *  subtitle explains the pane's contract in one plain line — the Studio's
 *  house style. */
export function PaneHeader({ title, subtitle, children }) {
  return (
    <div
      style={{
        flex: '0 0 auto',
        padding: 'var(--space-15) var(--space-2)',
        borderBottom: 'var(--stroke-hair) solid var(--border-hairline)',
        background: 'var(--surface-card)',
      }}
    >
      <div style={{ fontSize: 'var(--fs-pane)', fontWeight: 'var(--fw-bold)', color: 'var(--text-1)', lineHeight: 'var(--lh-tight)' }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ marginTop: 2, fontSize: 'var(--fs-meta)', color: 'var(--text-3)', lineHeight: 'var(--lh-snug)' }}>{subtitle}</div>
      )}
      {children && (
        <div style={{ marginTop: 'var(--space-15)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
          {children}
        </div>
      )}
    </div>
  )
}
