import React from 'react'
import { StatusGutter } from './StatusGutter'
import { BlockMenu } from './StopPill'

export const wellTint = (depth) => 'var(--surface-well-' + Math.min(Math.max(depth, 1), 4) + ')'

/** An OPEN container — a group of stops, and a node in its own right.
 *  Recessed: the tint steps one level darker per depth and the inset shadow
 *  reads as a well cut into the surface above it. Nesting is unbounded; past
 *  depth 4 the tint clamps and the shadow carries the depth. */
export function ContainerWell({
  title,
  depth = 1,
  count,
  fork,
  optional,
  selected,
  linked,
  offRoad,
  dropInside,
  children,
  header,
  onHeaderPointerDown,
  onClick,
  onToggle,
  onMenu,
  style,
}) {
  const rings = []
  if (selected) rings.push('var(--ring-selected)')
  else if (dropInside) rings.push('var(--ring-drop-inside)')
  else if (linked) rings.push('var(--ring-linked)')
  return (
    <div
      onClick={onClick}
      data-well
      data-depth={depth}
      style={{
        borderRadius: 'var(--radius-card)',
        background: wellTint(depth),
        border: 'var(--stroke-hair) ' + (optional ? 'dashed' : 'solid') + ' var(--border-well)',
        boxShadow: [depth >= 3 ? 'var(--sink-well-deep)' : 'var(--sink-well)', ...rings].join(', '),
        opacity: offRoad ? 'var(--opacity-off-road)' : 1,
        padding: 'var(--road-pad)',
        transition: 'var(--transition-block)',
        ...style,
      }}
    >
      <div
        onPointerDown={onHeaderPointerDown}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-15)',
          minHeight: 'var(--road-head-h)',
          cursor: 'grab',
        }}
      >
        <StatusGutter fork={fork} optional={optional && !fork} />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle && onToggle(e)
          }}
          aria-label="collapse group"
          style={{
            flex: '0 0 auto',
            width: 16,
            height: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: 'var(--stroke-hair) solid var(--border-well)',
            borderRadius: 'var(--radius-xs)',
            background: 'var(--surface-inset)',
            color: 'var(--text-2)',
            font: 'inherit',
            fontSize: 8,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          {'\u25be'}
        </button>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 'var(--fs-title)',
            fontWeight: 'var(--fw-bold)',
            lineHeight: 'var(--lh-tight)',
            color: 'var(--text-1)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={title}
        >
          {title}
        </span>
        {count !== undefined && (
          <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
            {count}
          </span>
        )}
        <BlockMenu onMenu={onMenu} />
      </div>
      {header}
      <div style={{ marginTop: 'var(--space-15)' }}>{children}</div>
    </div>
  )
}

/** the body stand-in when the chosen variant holds no steps yet */
export function EmptyBody({ label = 'drop steps here' }) {
  return (
    <div
      style={{
        height: 'var(--road-empty-body-h)',
        borderRadius: 'var(--radius-md)',
        border: 'var(--stroke-node) dashed var(--drop-zone-border)',
        background: 'var(--drop-zone-wash)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 'var(--fs-meta)',
        color: 'var(--text-3)',
      }}
    >
      {label}
    </div>
  )
}
