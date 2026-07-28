import React from 'react'
import { NodeChip } from './NodeChip'

/** One line of the projected route: the resolved step number, the chip, and the
 *  revisit mark. The number column is fixed-width and tabular so every row in the
 *  rail aligns; it is --rail-step-w (not the road's 18px --road-gutter-w) because
 *  a collapsed group shows a RANGE like "1–12" rather than one circular badge. */
export function RailRow({ step, title, domainColor, group, count, revisit, linked, dim, onPointerEnter, onPointerLeave }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', listStyle: 'none' }}>
      <span
        style={{
          width: 'var(--rail-step-w)',
          flex: '0 0 var(--rail-step-w)',
          textAlign: 'right',
          whiteSpace: 'nowrap',
          fontSize: 'var(--fs-micro)',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-3)',
        }}
      >
        {step ?? ''}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <NodeChip
          title={title}
          domainColor={domainColor}
          group={group}
          count={count}
          linked={linked}
          dim={dim}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
        />
      </span>
      {revisit && <span style={{ flex: '0 0 auto', fontSize: 'var(--fs-caption)', color: 'var(--text-3)' }}>{'\u21ba'}</span>}
    </li>
  )
}
