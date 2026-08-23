import type { CSSProperties } from 'react'

/** "JUMP BACK TO THE ACTIVE STEP" — a ring with a filled centre and four ticks, the
 *  same construction every map and device uses for "recentre on my position": a
 *  generic, long-settled convention rather than a house invention, drawn plainly at the
 *  system's own 1.4px weight so it sits beside `AddNodeMark` and `NewWalkMark` without
 *  looking borrowed. `currentColor`, like every mark here — the caller inks it, usually
 *  inside an `IconButton`. Solid, never dashed: recentring is an act, not a conditional
 *  state.
 *
 *  Typed port of the DS LocateMark.jsx (contract: LocateMark.d.ts). */
export interface LocateMarkProps {
  size?: number
  style?: CSSProperties
}

export function LocateMark({ size = 14, style }: LocateMarkProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
      style={{ display: 'block', flexShrink: 0, ...style }}>
      <circle cx="8" cy="8" r="3.1" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <path d="M8 0.8v2.3M8 12.9v2.3M0.8 8h2.3M12.9 8h2.3" />
    </svg>
  )
}
