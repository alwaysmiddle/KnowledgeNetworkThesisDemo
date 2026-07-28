import React from 'react'

/** THE insertion caret. One renderer for every drop target — between siblings,
 *  before the first, after the last. Never draw a second kind. */
export function DropLine({ width, style }) {
  return (
    <div
      data-drop-line
      style={{
        width: width ?? '100%',
        height: 'var(--stroke-drop-line)',
        borderRadius: 2,
        background: 'var(--drop-line)',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}

/** the vertical walk arrow between two siblings, and the optional-bypass rail */
export function RoadArrow({ x, y1, y2, live = true }) {
  return (
    <g>
      <defs>
        <marker id="road-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--road-live)" />
        </marker>
        <marker id="road-ghost" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--road-ghost)" />
        </marker>
      </defs>
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        stroke={live ? 'var(--road-live)' : 'var(--road-ghost)'}
        strokeWidth={live ? 2.5 : 1.5}
        strokeDasharray={live ? undefined : '4 3'}
        markerEnd={live ? 'url(#road-head)' : 'url(#road-ghost)'}
      />
    </g>
  )
}

/** the bypass rail that arcs around an optional stop */
export function BypassRail({ d, live }) {
  return (
    <path
      d={d}
      fill="none"
      stroke={live ? 'var(--road-live)' : 'var(--road-ghost)'}
      strokeWidth={live ? 2.5 : 1.2}
      strokeDasharray={live ? undefined : '3 3'}
      markerEnd={live ? 'url(#road-head)' : undefined}
    />
  )
}
