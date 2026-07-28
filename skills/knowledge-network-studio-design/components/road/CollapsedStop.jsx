import React from 'react'
import { StatusGutter } from './StatusGutter'
import { BlockMenu } from './StopPill'
import { wellTint } from './ContainerWell'

/** A COLLAPSED container. The point of the whole grammar: it is raised like a
 *  stop (because it IS a node now) but carries stacked well-tinted silhouettes
 *  behind it, so you can still see it contains a road. */
export function CollapsedStop({
  title,
  depth = 1,
  count,
  fork,
  optional,
  selected,
  linked,
  offRoad,
  dropInside,
  onToggle,
  onClick,
  onPointerDown,
  onMenu,
  width,
  style,
}) {
  const rings = selected ? ', var(--ring-selected)' : dropInside ? ', var(--ring-drop-inside)' : linked ? ', var(--ring-linked)' : ''
  const stack = (inset, drop, tintDepth) => ({
    position: 'absolute',
    left: inset,
    right: inset,
    bottom: -drop,
    height: 20,
    borderRadius: 'var(--radius-md)',
    background: wellTint(tintDepth),
    border: 'var(--stroke-hair) solid var(--border-well-strong)',
  })
  return (
    <div
      style={{ position: 'relative', width: width ?? 'var(--road-node-w)', opacity: offRoad ? 'var(--opacity-off-road)' : 1, ...style }}
      onClick={onClick}
      onPointerDown={onPointerDown}
      data-collapsed
    >
      <div style={stack(12, 12, depth + 2)} />
      <div style={stack(6, 6, depth + 1)} />
      <div
        onDoubleClick={onToggle}
        style={{
          position: 'relative',
          minHeight: 'var(--road-node-h)',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-15)',
          padding: '0 var(--space-1) 0 var(--space-15)',
          borderRadius: 'var(--radius-md)',
          background: selected ? 'var(--state-selected-wash)' : 'var(--surface-card)',
          border: 'var(--stroke-hair) ' + (optional ? 'dashed' : 'solid') + ' var(--border-card)',
          boxShadow: 'var(--lift-node)' + rings,
          cursor: 'grab',
        }}
      >
        <StatusGutter fork={fork} optional={optional && !fork} />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle && onToggle(e)
          }}
          aria-label="expand group"
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
          {'\u25b8'}
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
          <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
        )}
        <BlockMenu onMenu={onMenu} />
      </div>
    </div>
  )
}
