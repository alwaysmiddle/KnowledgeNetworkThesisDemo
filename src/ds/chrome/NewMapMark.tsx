import type { CSSProperties } from 'react'

/** An action icon for "new map" — a blank page with a plus badge, drawn because the
 *  real-world shape reads faster than any Unicode stand-in at this weight. A flat
 *  page (no folded corner), unlike NewWalkMark's document — this starts a blank
 *  canvas, not a new authored walk, and the two must not look identical. A one-off
 *  ACTION icon, like Toolbar's Unicode glyphs — not one of the five state marks.
 *
 *  Typed port of the DS NewMapMark.jsx (contract: NewMapMark.d.ts). */
export interface NewMapMarkProps {
  size?: number
  style?: CSSProperties
}

export function NewMapMark({ size = 14, style }: NewMapMarkProps) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, lineHeight: size + 'px', ...style }}>
      <span aria-hidden="true" style={{ color: 'transparent' }}>+</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ position: 'absolute', inset: 0 }}
      >
        <rect x="2" y="2" width="7.6" height="10.6" rx="1" />
        <path d="M3.4 5h4.8M3.4 7.3h3" />
        <circle cx="11.6" cy="11.3" r="4" fill="var(--surface-paper)" />
        <path d="M11.6 9.1v4.4M9.4 11.3h4.4" />
      </svg>
    </span>
  )
}
