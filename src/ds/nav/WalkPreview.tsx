import type { ReactNode } from 'react'

/** THE PREVIEW POPUP'S ONE GEOMETRY, published so three surfaces share it: how far above its
 *  anchor the card floats. A number in prose gets retyped; `WalkStrip` carried `top - 12` inline
 *  and the compact-strip rig carried a second `-12` of its own before this existed. */
export const PREVIEW_GAP = 12

/** THE ANCHOR FOR A DISCRETE HOVER — a dot, a map pin, a stop in the open row: centred on the
 *  element's own box, sitting on its top edge. A continuous scrub (the seek bar, the closed
 *  rail) anchors on the pointer's x instead and passes `{ x, top }` itself. */
export function previewAnchor(rect: { left: number; top: number; width: number }): { x: number; top: number } {
  return { x: rect.left + rect.width / 2, top: rect.top }
}

export interface WalkPreviewProps {
  /** viewport x the card is centred on — the pointer's `clientX` for a continuous scrub, the
   *  anchor element's centre for a discrete hover (`previewAnchor(rect).x`) */
  x: number
  /** viewport y of the anchor's TOP edge; the card floats `gap` above it */
  top: number
  /** px between the anchor's top edge and the card's bottom. Default `PREVIEW_GAP` (12) — CHOSEN,
   *  a look, not derived; pass a different one only when the anchor is taller than a dot. */
  gap?: number
  /** the host's preview content — what `renderPreview(step, index)` returned */
  children?: ReactNode
}

/** THE ONE POPUP EVERY WALK SURFACE SHOWS ON HOVER — the strip's seek bar and dots, the dock's
 *  closed rail and open row, and a walk pin on the map all hang the SAME card off the same
 *  geometry, so a stop previews identically wherever the pointer finds it. The host supplies the
 *  content (`renderPreview(step, index)` on every one of those components); this only places it.
 *
 *  POSITIONED AGAINST THE VIEWPORT (fixed), never the surface — a preview is meant to float free
 *  of the pane's own clipping, the same reason a video scrubber's thumbnail is never cropped by
 *  the timeline's box. Sits `PREVIEW_GAP` above the anchor, centred on its x. Pointer-transparent
 *  and aria-hidden: it is a look-ahead, not a control, and it must never steal the hover that
 *  raised it.
 *
 *  WHAT THE CALLER MUST DO (WalkPreview.d.ts): render it only while a hover is live, never during
 *  a drag or a seek; pass VIEWPORT coordinates and re-read `top` on every hover move; CURSOR HOVER
 *  ONLY — a hover published by another pane has no pointer over this surface to anchor to; and
 *  NAME THE STOP BY ITS FULL STEP PATH when the stop sits inside a `VersionedGroup` on the walk
 *  ("3.1", "1.1.1.2" — the group's own `numberScope`/`localIndex` numbering). A map pin shows
 *  only the top-level step and several pins may share it (OB-114 / #228, owner 2026-09-03); this
 *  card is where the path has room, and the ONLY place on the map it is readable. A stop at the
 *  top level names its plain number as before. The app's `renderStopPreview` does exactly that
 *  from `PlayStep.path`.
 *
 *  Typed port of the DS WalkPreview.jsx (contract: WalkPreview.d.ts), OB-131. */
export function WalkPreview({ x, top, gap = PREVIEW_GAP, children }: WalkPreviewProps) {
  return (
    <div aria-hidden="true" style={{
      position: 'fixed', left: x, top: top - gap,
      transform: 'translate(-50%, -100%)', zIndex: 20, pointerEvents: 'none',
    }}>{children}</div>
  )
}
