import type { CSSProperties } from 'react'

/** An action icon for "start a new walk" — a page with a folded corner and a plus, at
 *  the house 1.4px stroke weight. Plain geometry, not a Unicode fallback: no clean
 *  single character reads as "new document" at this size. Same baseline technique as
 *  `OptionalMark`/`AddNodeMark` — an invisible same-font character keeps a real text
 *  baseline for a `baseline`-aligned `PillButton` row; the visible glyph is a separate
 *  absolutely positioned SVG. A flat page WOULD collide with `NewMapMark`'s own blank
 *  page — the folded corner is what keeps "new walk" and "new map" from reading as the
 *  same icon. Not part of the closed set of five state marks (caret, bin, check,
 *  restore, optional) — a one-off ACTION icon, like `Toolbar`'s Unicode glyphs, just
 *  drawn because Unicode has nothing usable for this one either.
 *
 *  Typed port of the DS NewWalkMark.jsx (contract: NewWalkMark.d.ts). */
export interface NewWalkMarkProps {
  size?: number
  style?: CSSProperties
}

export function NewWalkMark({ size = 14, style }: NewWalkMarkProps) {
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
        <path d="M3.3 2h5.5l3.2 3.2v8.6a1 1 0 0 1-1 1h-7.7a1 1 0 0 1-1-1v-10.8a1 1 0 0 1 1-1z" />
        <path d="M8.8 2v2.7a0.5 0.5 0 0 0 .5.5h3.2" />
        <path d="M7.6 7.9v4.2M5.5 10h4.2" />
      </svg>
    </span>
  )
}
