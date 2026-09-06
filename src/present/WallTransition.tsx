// THE UP/DOWN MOTION FOR THE WALL (owner, 2026-09-03, revised the same day; DS OB-139 clause 8)
// — the host's, from the DS's reference host `templates/studio/PresenterScreen.jsx`.
//
// The map grows from a small pane at the slide's own TOP-RIGHT corner into the full
// box on the way up. Going down is NOT one motion — it is two, in sequence: first it
// shrinks back into that same small pane and STAYS a real, fully-opaque small pane
// overlaying the slide for a beat (so it reads as "put away", not as a special-effect
// wipe), and only THEN fades out and unmounts. `grown` drives the scale
// (`--dur-flight`, top-right anchored via `transformOrigin: '100% 0'`); `visible`
// drives the opacity (`--dur-fade`) and is a SEPARATE, later step on the way down —
// never simultaneous with the shrink the way the way up's grow-and-appear-together
// is. The double-rAF on the way up is so the small starting frame actually PAINTS
// before the transition to full size begins — a single rAF can still land in the
// same frame the element mounted in, on some browsers, and skip straight to the end
// state. The state flip underneath — which surface shows what — happens only once
// the motion has finished, never before.

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** the beat the small pane holds on the way down, and the fade after it, in ms — the
 *  reference host's numbers, CHOSEN */
export const WALL_SHRINK_MS = 400
export const WALL_HOLD_MS = 260
export const WALL_FADE_MS = 260

export function WallTransition({ up, slide, map }: { up: boolean; slide: ReactNode; map: ReactNode }) {
  const [mounted, setMounted] = useState(up)
  const [grown, setGrown] = useState(up)
  const [visible, setVisible] = useState(up)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /* the motion is a sequence of timed state writes started by a prop flip — the reference
     host's own effect. One cascade per flip, never per render, which is what the rule below
     is about. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    if (up) {
      setMounted(true)
      setVisible(true)
      requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)))
    } else {
      setGrown(false) // shrink first, staying fully visible as a small pane over the slide
      timer.current = setTimeout(() => {
        timer.current = setTimeout(() => { // held a beat as that small pane, then fades
          setVisible(false)
          timer.current = setTimeout(() => setMounted(false), WALL_FADE_MS)
        }, WALL_HOLD_MS)
      }, WALL_SHRINK_MS)
    }
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [up])
  /* eslint-enable react-hooks/set-state-in-effect */
  return (
    <div data-wall={mounted ? (grown ? 'up' : 'small') : 'slide'} style={{ position: 'absolute', inset: 0 }}>
      {slide}
      {mounted ? (
        <div style={{
          position: 'absolute', inset: 0, transformOrigin: '100% 0', overflow: 'hidden',
          transform: grown ? 'scale(1)' : 'scale(0.3)', opacity: visible ? 1 : 0,
          borderRadius: grown ? 0 : 'var(--radius-md)', boxShadow: grown ? 'none' : 'var(--lift-3)',
          transition: 'transform var(--dur-flight) var(--ease-soft), border-radius var(--dur-flight) var(--ease-soft), opacity var(--dur-fade) var(--ease-soft)',
        }}>{map}</div>
      ) : null}
    </div>
  )
}
