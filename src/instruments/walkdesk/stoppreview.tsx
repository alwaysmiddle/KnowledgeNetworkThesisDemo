// THE ONE CARD A STOP SHOWS ON HOVER, wherever the pointer finds the stop — the walk
// viewer's strip, the map's dock and the map's pins all pass this same function as
// `renderPreview`, so a stop previews identically on every surface (DS OB-131: "pass
// the SAME function you pass WalkStrip and the map's pins"). It used to be an inline
// closure in WalkViewer.tsx; three hosts would have meant three drifting copies.
//
// It shows the step's NOTE, and — for a step that sits inside a GROUP on the road —
// its full step path with its name, "3.1 · Name" (#228, DS OB-114, WalkPreview's
// caller rule 4): a map pin prints only the group's top-level number and several
// pins may share it, so this card is the ONLY place on the map the path is
// readable. A top-level step's name is already under its dot or on its pin, and a
// card that repeats it is a second tooltip — so nothing at all for one with no note.

import type { ReactNode } from 'react'

import type { WalkStep } from '@/ds'

import type { PlayStep } from './playback'

export function renderStopPreview(step: (WalkStep & Pick<PlayStep, 'path'>) | undefined): ReactNode {
  // WalkStrip never clamps hoverIndex against a shrinking steps array, so a step
  // can arrive here undefined mid-edit — guard, don't assume the prop's own type.
  if (!step) return null
  const path = step.path
  if (!path && !step.note) return null
  return (
    <div data-stoppreview className="px-2 py-1 rounded border border-slate-200 bg-white shadow-lg text-[11px] max-w-[220px] text-slate-600">
      {path ? <div data-stoppath className="font-medium text-slate-800">{path} · {step.title}</div> : null}
      {step.note ? <div>{step.note}</div> : null}
    </div>
  )
}
