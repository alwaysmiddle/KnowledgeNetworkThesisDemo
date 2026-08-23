import type { CSSProperties } from 'react'

/** An action icon for "copy" — two overlapping pages, drawn because the real-world
 *  shape reads faster than a Unicode stand-in (⧉ measured fine but read faint at this
 *  weight). A one-off ACTION icon, like Toolbar's Unicode glyphs — not one of the
 *  five state marks.
 *
 *  Typed port of the DS CopyMark.jsx (contract: CopyMark.d.ts). */
export interface CopyMarkProps {
  size?: number
  style?: CSSProperties
}

export function CopyMark({ size = 14, style }: CopyMarkProps) {
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
        <rect x="6" y="2" width="7.4" height="8.6" rx="1" />
        <rect x="2.6" y="5.4" width="7.4" height="8.6" rx="1" />
      </svg>
    </span>
  )
}
