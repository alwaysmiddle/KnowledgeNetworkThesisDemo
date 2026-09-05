// THE ONE CARD A STOP SHOWS ON HOVER, wherever the pointer finds the stop — the walk
// viewer's strip, the map's dock and the map's pins all pass this same function as
// `renderPreview`, so a stop previews identically on every surface (DS OB-131: "pass
// the SAME function you pass WalkStrip and the map's pins"). It used to be an inline
// closure in WalkViewer.tsx; three hosts would have meant three drifting copies.
//
// It shows the step's NOTE and nothing else, and nothing at all for a step without
// one: the name is already under the dot or on the pin, and a card that repeats it
// is a second tooltip.

import type { ReactNode } from 'react'

import type { WalkStep } from '@/ds'

export function renderStopPreview(step: WalkStep | undefined): ReactNode {
  // WalkStrip never clamps hoverIndex against a shrinking steps array, so a step
  // can arrive here undefined mid-edit — guard, don't assume the prop's own type.
  if (!step?.note) return null
  return (
    <div data-stoppreview className="px-2 py-1 rounded border border-slate-200 bg-white shadow-lg text-[11px] max-w-[220px] text-slate-600">
      {step.note}
    </div>
  )
}
