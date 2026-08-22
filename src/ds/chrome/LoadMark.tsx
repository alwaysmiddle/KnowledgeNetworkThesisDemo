import type { CSSProperties } from 'react'

/** An action icon for "load" — an open folder, drawn because the real-world shape
 *  reads faster than any Unicode stand-in at this weight, and pairs visually with
 *  SaveMark's floppy disk. A one-off ACTION icon, like Toolbar's Unicode glyphs —
 *  not one of the five state marks.
 *
 *  Typed port of the DS LoadMark.jsx (contract: LoadMark.d.ts). */
export interface LoadMarkProps {
  size?: number
  style?: CSSProperties
}

export function LoadMark({ size = 14, style }: LoadMarkProps) {
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
        <path d="M2.2 4.6a1 1 0 0 1 1-1h3l1.2 1.5h5.4a1 1 0 0 1 1 1v1.1H2.2z" />
        <path d="M2 7.2h11.8l-1.1 5a1 1 0 0 1-1 .8H4.1a1 1 0 0 1-1-.8z" />
      </svg>
    </span>
  )
}
