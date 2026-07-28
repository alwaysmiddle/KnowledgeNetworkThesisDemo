import React from 'react'

/** A corpus node as a small chip — the rail's unit. Dot in the domain colour,
 *  truncating title, hover-lit for cross-pane correspondence. */
export function NodeChip({ title, domainColor = 'var(--domain-cs)', dim, linked, group, count, onPointerEnter, onPointerLeave }) {
  if (group)
    return (
      <span
        style={{
          minWidth: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-1)',
          padding: '2px var(--space-15)',
          borderRadius: 'var(--radius-sm)',
          border: 'var(--stroke-hair) dashed var(--border-well)',
          background: 'var(--surface-well-1)',
          boxShadow: linked ? 'var(--ring-linked)' : undefined,
          fontSize: 'var(--fs-label)',
          color: 'var(--text-2)',
          whiteSpace: 'nowrap',
          maxWidth: '100%',
          overflow: 'hidden',
        }}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{'\u229e ' + title}</span>
        {count !== undefined && <span style={{ flex: '0 0 auto', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>}
      </span>
    )
  return (
    <span
      title={title}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: '2px var(--space-15)',
        borderRadius: 'var(--radius-sm)',
        border: 'var(--stroke-hair) solid var(--border-rule)',
        background: dim ? 'rgba(255,255,255,0.6)' : 'var(--surface-card)',
        boxShadow: linked ? 'var(--ring-linked)' : undefined,
        color: dim ? 'var(--text-3)' : 'var(--text-2)',
        fontSize: 'var(--fs-label)',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', flex: '0 0 auto', background: domainColor }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
    </span>
  )
}
