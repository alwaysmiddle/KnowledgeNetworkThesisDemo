import React from 'react'
import { StatusGutter } from './StatusGutter'

/** A LEAF stop — the walk lands on a real corpus node. Always raised: a stop is
 *  a node, and nodes sit above the surface they live on. Domain colour tints the
 *  border and title only; the face stays white so elevation reads cleanly. */
export function StopPill({
  title,
  domainColor = 'var(--domain-cs)',
  order,
  optional,
  revisit,
  selected,
  linked,
  offRoad,
  dragging,
  onMenu,
  onClick,
  onPointerDown,
  width,
  style,
}) {
  const ring = selected ? 'var(--ring-selected)' : linked ? 'var(--ring-linked)' : null
  const lift = dragging ? 'var(--lift-node-drag)' : 'var(--lift-node)'
  return (
    <div
      onClick={onClick}
      onPointerDown={onPointerDown}
      data-stop
      style={{
        width: width ?? 'var(--road-node-w)',
        minHeight: 'var(--road-node-h)',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-15)',
        padding: '0 var(--space-1) 0 var(--space-15)',
        borderRadius: 'var(--radius-pill)',
        background: selected ? 'var(--state-selected-wash)' : 'var(--surface-card)',
        border: 'var(--stroke-node) ' + (optional ? 'dashed ' : 'solid ') + domainColor,
        boxShadow: ring ? lift + ', ' + ring : lift,
        opacity: offRoad ? 'var(--opacity-off-road)' : 1,
        transition: 'var(--transition-block)',
        cursor: 'grab',
        ...style,
      }}
    >
      <StatusGutter order={order} optional={optional && order === undefined} revisit={revisit} tone={offRoad ? 'off' : 'road'} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 'var(--fs-label)',
          fontWeight: 'var(--fw-semibold)',
          lineHeight: 'var(--lh-tight)',
          color: domainColor,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={title}
      >
        {title}
      </span>
      <BlockMenu onMenu={onMenu} />
    </div>
  )
}

/** the single hover-revealed action affordance every block shares */
export function BlockMenu({ onMenu }) {
  const [hot, setHot] = React.useState(false)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onMenu && onMenu(e)
      }}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      aria-label="block actions"
      style={{
        flex: '0 0 var(--road-menu-w)',
        width: 'var(--road-menu-w)',
        height: 'var(--road-menu-w)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 0,
        borderRadius: 'var(--radius-sm)',
        background: hot ? 'rgba(51,65,85,0.08)' : 'transparent',
        color: hot ? 'var(--text-1)' : 'var(--text-3)',
        cursor: 'pointer',
        font: 'inherit',
        fontSize: 11,
        lineHeight: 1,
        padding: 0,
      }}
    >
      {'\u22ef'}
    </button>
  )
}
