import type { CSSProperties } from 'react'

/** THE MARK FOR "YOU ARE HERE" ON A WALK — a minimal walking figure, standing on the
 *  step the cursor is currently on. Not part of the closed set of five state marks
 *  (caret, bin, check, restore, optional): those mark a NODE's own state; this marks a
 *  CURSOR's position on top of one, which is a different kind of fact and never
 *  competes with a node's own furniture. So it is drawn ABOVE the mark it sits on
 *  (the caller's job), never inside it.
 *
 *  CHIBI PROPORTIONS, ON PURPOSE — the head is large against the body, which is what
 *  reads as "cute" rather than "pictogram" at the size this mark actually ships at
 *  (20-24px). `currentColor`, so a caller colours it with a wrapper exactly as `Caret`
 *  and the dot are coloured — --accent-walk is the intended ink, since acorn is the hue
 *  of MOVEMENT through the corpus and this mark IS the cursor moving through it.
 *
 *  `animated` (opt-in, default off) swings the legs and the raised arm through one walk
 *  cycle on a loop, in plain SVG `<animateTransform>` — no stylesheet, nothing to
 *  inject. Off by default: the mark already reads as "walking" from its stride alone;
 *  motion is the louder version of that, for the one instance per pane that is the
 *  actual cursor.
 *
 *  Typed port of the DS WalkerMark.jsx (contract: WalkerMark.d.ts). */
export interface WalkerMarkProps {
  size?: number
  /** loops the legs and the raised arm through one walk cycle, in plain SVG
   *  `<animateTransform>` — no stylesheet, nothing to inject. Off by default: the
   *  stride alone already reads as walking, and motion is the louder version of
   *  that, meant for the one instance per pane that is the actual cursor. */
  animated?: boolean
  style?: CSSProperties
}

export function WalkerMark({ size = 20, animated = false, style }: WalkerMarkProps) {
  const legL = animated ? (
    <animateTransform attributeName="transform" type="rotate" values="-14 8.1 9.1;16 8.1 9.1;-14 8.1 9.1" dur="0.7s" repeatCount="indefinite" />
  ) : null
  const legR = animated ? (
    <animateTransform attributeName="transform" type="rotate" values="16 8.1 9.1;-14 8.1 9.1;16 8.1 9.1" dur="0.7s" repeatCount="indefinite" />
  ) : null
  const arm = animated ? (
    <animateTransform attributeName="transform" type="rotate" values="20 8.1 6.6;-16 8.1 6.6;20 8.1 6.6" dur="0.7s" repeatCount="indefinite" />
  ) : null
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0, ...style }}>
      {/* CHIBI HEAD, TONED DOWN: 1.7px radius, stroke 1.1 — see the docblock above */}
      <circle cx="8.1" cy="3.3" r="1.7" fill="currentColor" stroke="none" />
      <path d="M8.1 5.5v3.6" />
      <g>{arm}<path d="M8.1 6.6l2.5 1.7" /></g>
      <path d="M8.1 6.9l-2 1" />
      <g>{legL}<path d="M8.1 9.1l-2.3 4.2" /></g>
      <g>{legR}<path d="M8.1 9.1l1.9 4.2" /></g>
    </svg>
  )
}
