import type { CSSProperties } from 'react'

/** An action icon for "print" — a printer, drawn because the real-world shape reads
 *  faster than a Unicode stand-in (⎙ measured fine but read as a folded page, not a
 *  printer). A one-off ACTION icon, like Toolbar's Unicode glyphs — not one of the
 *  five state marks.
 *
 *  Typed port of the DS PrintMark.jsx (contract: PrintMark.d.ts). */
export interface PrintMarkProps {
  size?: number
  style?: CSSProperties
}

export function PrintMark({ size = 14, style }: PrintMarkProps) {
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
        <rect x="4.6" y="1.6" width="6.8" height="4" />
        <rect x="2" y="5.4" width="12" height="6" rx="1" />
        <rect x="4.6" y="10.4" width="6.8" height="4" />
        <circle cx="10.9" cy="8" r="0.55" fill="currentColor" stroke="none" />
      </svg>
    </span>
  )
}
