import type { CSSProperties } from 'react'

/** An action icon for "save" — a floppy disk, drawn because the real-world shape reads
 *  faster than a Unicode stand-in (⤓ measured fine but didn't say "save" on sight). A
 *  one-off ACTION icon, like Toolbar's Unicode glyphs — not one of the five state marks.
 *
 *  Typed port of the DS SaveMark.jsx (contract: SaveMark.d.ts). */
export interface SaveMarkProps {
  size?: number
  style?: CSSProperties
}

export function SaveMark({ size = 14, style }: SaveMarkProps) {
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
        <rect x="2.5" y="2" width="11" height="12" rx="1" />
        <rect x="5.3" y="2" width="5.4" height="3.3" />
        <rect x="4.4" y="9.4" width="7.2" height="4.1" />
      </svg>
    </span>
  )
}
