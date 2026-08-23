// The active walk — whichever one is relevant right now — as a navigable strip.
// Two sources, one component: a SAVED walk (bus.activeWalk, played via Trail's
// walk buttons) takes priority when one is active; otherwise this shows the
// DRAFT currently open on the walk desk, live (walkdesk/presented.ts). Present
// mode mounts this instead of the walk editor, so a finished walk can be
// stepped through without the authoring UI on screen.
//
// Distinct from TrailStrip, which keeps the walk TITLE / "stop N of M" text /
// deactivate control — this is purely the step-by-step navigator (WalkStrip,
// OB-071). Distinct from WalkView (id 'walk'), which is a different feature
// entirely: an ad-hoc downstream edge-follower for exploring the corpus, not a
// player for an authored walk.

import { WalkStrip } from '@/ds'
import type { WalkStep } from '@/ds'

import { byId } from '../corpus/graph'
import { walkById } from '../model/walkstore'
import { leafStops } from './walkdesk/mockwalk'
import { usePresentedRoad, usePublishPresentedRoute } from './walkdesk/presented'
import type { Bus } from '../studio/bus'

export default function WalkViewer({ bus }: { bus: Bus }) {
  const road = usePresentedRoad()
  const saved = bus.activeWalk ? (walkById(bus.activeWalk.walkId) ?? null) : null
  // opt out of publishing while a saved walk plays — activateWalk already owns
  // bus.route in that state (it sets the walked prefix itself)
  usePublishPresentedRoute(bus, saved ? null : road)

  const steps: WalkStep[] = saved
    ? saved.stops.map((s) => ({ id: s.id, title: byId.get(s.id)!.title, note: s.note }))
    : leafStops(road).map((s) => ({ id: s.node, title: byId.get(s.node)!.title, note: s.note, optional: s.optional }))

  const rawCursor = saved ? bus.activeWalk!.cursor : bus.draftCursor
  const cursor = steps.length ? Math.min(Math.max(rawCursor, 0), steps.length - 1) : 0

  const onSeek = (i: number) => {
    if (saved) {
      bus.activateWalk(saved.id, i)
      return
    }
    bus.setDraftCursor(i)
    const s = steps[i]
    if (s) bus.setFocus(s.id, 'walk')
  }

  return (
    <div className="h-full flex flex-col" aria-label="walk-viewer">
      <div className="shrink-0 px-3 py-1.5 border-b border-slate-100">
        <span className="text-[10px] font-bold text-slate-500">
          {saved ? saved.title : 'the road you are authoring'}
          {steps.length > 0 && ` · step ${cursor + 1} of ${steps.length}`}
        </span>
      </div>
      <div style={{ height: 172, margin: '6px 12px' }}>
        <WalkStrip
          steps={steps}
          cursor={cursor}
          showCount
          onSeek={onSeek}
          renderPreview={(step) => {
            // WalkStrip never clamps hoverIndex against a shrinking steps
            // array, so a step can arrive here undefined mid-edit — guard,
            // don't assume the prop's own type.
            if (!step?.note) return null
            return (
              <div className="px-2 py-1 rounded border border-slate-200 bg-white shadow-lg text-[11px] max-w-[220px] text-slate-600">
                {step.note}
              </div>
            )
          }}
        />
      </div>
    </div>
  )
}
