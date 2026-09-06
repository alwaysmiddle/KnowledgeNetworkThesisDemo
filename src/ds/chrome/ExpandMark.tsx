import type { CSSProperties } from 'react'

/** Four corner brackets pointing outward — full screen / expand to fill. A one-off action
 *  icon like `FlagMark`, `SaveMark`, `EditMark` — drawn because no Unicode glyph at this
 *  weight reads as "go full screen" (⛶ and ⤢ both measure too faint at 12-15px, same reason
 *  the fork is `▽` and not `⑂`). First drawn inline in `FilmRoll`'s expand button; pulled
 *  out so a second caller reuses it instead of hand-rolling the same four brackets again.
 *  Not part of the closed set of five state marks — a caller does not draw its own version;
 *  a genuinely new icon is requested from the design system first. Typed port of the DS
 *  ExpandMark.jsx (contract: ExpandMark.d.ts), OB-136 / #267. */
export interface ExpandMarkProps {
  /** px, both dimensions — the glyph is square */
  size?: number
  /** on the svg itself */
  style?: CSSProperties
}

export function ExpandMark({ size = 13, style }: ExpandMarkProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0, ...style }}>
      <path d="M4.6 1.6H1.6v3M7.4 1.6h3v3M7.4 10.4h3v-3M4.6 10.4H1.6v-3" />
    </svg>
  )
}
