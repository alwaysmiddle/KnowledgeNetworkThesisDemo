import type { CSSProperties } from 'react'

/** An action icon for "paste" — a clipboard, drawn because the real-world shape reads
 *  faster than a Unicode stand-in (⎘ measured fine but read as a generic panel, not a
 *  clipboard). A one-off ACTION icon, like Toolbar's Unicode glyphs — not one of the
 *  five state marks.
 *
 *  Typed port of the DS PasteMark.jsx (contract: PasteMark.d.ts). */
export interface PasteMarkProps {
  size?: number
  style?: CSSProperties
}

export function PasteMark({ size = 14, style }: PasteMarkProps) {
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
        <rect x="3" y="3" width="10" height="11.5" rx="1" />
        <rect x="6" y="1.6" width="4" height="2.4" rx="0.6" />
        <path d="M5.4 7h5.2M5.4 9.3h5.2M5.4 11.6h3.4" />
      </svg>
    </span>
  )
}
