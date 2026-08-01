/** The one drawn mark in the system: a bin, for deleting a user-saved thing.
 *  Unicode has no in-class bin glyph, so this is built from plain geometry — a
 *  lid rule and a tapered body — in currentColor at the chrome's 1.5px weight. It
 *  is deliberately the ONLY drawn icon; everything else is a Unicode glyph. Typed
 *  port of the DS BinMark.jsx. */
export interface BinMarkProps {
  /** px; 11 in a 20px icon button, the only place it appears today */
  size?: number
}

export function BinMark({ size = 11 }: BinMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.75 4.5h10.5" />
      <path d="M6.25 4.5V3.25h3.5V4.5" />
      <path d="M4.25 4.5l.6 8a1 1 0 0 0 1 .95h4.3a1 1 0 0 0 1-.95l.6-8" />
    </svg>
  )
}
