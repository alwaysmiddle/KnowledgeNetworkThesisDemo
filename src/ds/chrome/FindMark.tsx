import type { CSSProperties } from 'react'

/** A magnifying glass — "find a stop" / search. A one-off action icon like `FlagMark`,
 *  `ExpandMark` — drawn because no Unicode glyph at this weight reads as a search affordance
 *  without borrowing 🔍 (an emoji, ruled out everywhere in this system). Not part of the
 *  closed set of five state marks — a caller does not draw its own version; a genuinely new
 *  icon is requested from the design system first. Typed port of the DS FindMark.jsx
 *  (contract: FindMark.d.ts), OB-137 / #267. */
export interface FindMarkProps {
  /** px, both dimensions — the glyph is square */
  size?: number
  /** on the svg itself */
  style?: CSSProperties
}

export function FindMark({ size = 12, style }: FindMarkProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ display: 'block', flexShrink: 0, ...style }}>
      <circle cx="5" cy="5" r="3.6" />
      <path d="M7.8 7.8 11 11" />
    </svg>
  )
}
