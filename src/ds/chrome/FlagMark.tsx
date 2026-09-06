import type { CSSProperties } from 'react'

/** A flag on a pole — the mark for "flagged for revision" everywhere a slide, a stop or a
 *  row can be flagged. Filled once set, an outline (never solid) while only a hover/hint.
 *  Not part of the closed set of five state marks (caret, bin, check, restore, optional); a
 *  one-off action icon like `SaveMark`, drawn because a real flag shape reads faster than
 *  any Unicode stand-in. Typed port of the DS FlagMark.jsx (contract: FlagMark.d.ts),
 *  OB-136 / #267. */
export interface FlagMarkProps {
  /** px, both dimensions */
  size?: number
  /** true once the thing is actually flagged (solid fill). false draws an OUTLINE only —
   *  never a solid flag for a state that isn't set yet, the same "a state costs nothing
   *  when false" rule `OptionalMark`'s dash follows */
  filled?: boolean
  /** on the svg itself — a colour, a lift */
  style?: CSSProperties
}

export function FlagMark({ size = 12, filled = false, style }: FlagMarkProps) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 12 12" style={{ display: 'block', flexShrink: 0, ...style }}>
      <path d="M2.5 1v10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {filled
        ? <path d="M3 1.5h6L7.6 3.7 9 5.9H3z" fill="currentColor" />
        : <path d="M3 1.5h6L7.6 3.7 9 5.9H3z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />}
    </svg>
  )
}
