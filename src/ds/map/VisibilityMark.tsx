import type { CSSProperties } from 'react'

/**
 * The eye / eye-slash pair for "show or hide the walk-related nodes on the map." One drawn
 * mark, two states — `open` swaps in the slash rather than swapping to a second icon, so the
 * two states stay visibly the same eye. `currentColor`, like every mark in this system; ink it
 * by placing it inside `MapFloatingButton`, not by styling it directly.
 */
export interface VisibilityMarkProps {
  /** true (default) draws the plain eye — walk nodes shown. false adds the slash — hidden. */
  open?: boolean
  size?: number
  style?: CSSProperties
}

export function VisibilityMark({ open = true, size = 17, style }: VisibilityMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      <path d="M2 10c2-3.5 5-5.3 8-5.3s6 1.8 8 5.3c-2 3.5-5 5.3-8 5.3s-6-1.8-8-5.3z" />
      <circle cx="10" cy="10" r="2.3" />
      {open ? null : <line x1="3" y1="16.5" x2="17" y2="3.5" />}
    </svg>
  )
}
