import type { CSSProperties } from 'react'

/** An action icon for "add a node at the selection" — a circle around a plus, the
 *  simplest possible "add" mark. Same construction as `OptionalMark` (an invisible
 *  same-font character keeps a real text baseline for this element to offer a
 *  `baseline`-aligned `PillButton` row; the visible glyph is a separate absolutely
 *  positioned SVG so nothing depends on font metrics). Solid stroke, not dashed —
 *  dashed means CONDITIONAL in this system (`OptionalMark`), and this mark carries no
 *  such meaning. Not part of the closed set of five state marks (caret, bin, check,
 *  restore, optional) — a one-off ACTION icon, the same category as `Toolbar`'s
 *  one-off Unicode glyphs, just drawn instead of typed because no single Unicode
 *  character reads as "add a node" at this weight.
 *
 *  Typed port of the DS AddNodeMark.jsx (contract: AddNodeMark.d.ts). */
export interface AddNodeMarkProps {
  size?: number
  style?: CSSProperties
}

export function AddNodeMark({ size = 14, style }: AddNodeMarkProps) {
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
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ position: 'absolute', inset: 0 }}
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M8 5.2v5.6M5.2 8h5.6" />
      </svg>
    </span>
  )
}
