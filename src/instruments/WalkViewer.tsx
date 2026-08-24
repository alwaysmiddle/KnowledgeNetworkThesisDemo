// The active walk — whichever one is relevant right now — as a navigable strip.
// Two sources, one component: a SAVED walk (bus.activeWalk, played via Trail's
// walk buttons) takes priority when one is active; otherwise this shows the
// DRAFT currently open on the walk desk, live (walkdesk/presented.ts). Present
// mode mounts this instead of the walk editor, so a finished walk can be
// stepped through without the authoring UI on screen.
//
// The model behind that — steps, cursor, seek — moved to walkdesk/playback.ts
// in #195, where the presentation frame's keyboard reads the same definition.
// Seeking a SAVED walk now also moves bus.focus, which it never did before:
// activateWalk writes activeWalk and the route prefix and nothing else, so the
// document used to sit still while this strip walked.
//
// Distinct from TrailStrip, which keeps the walk TITLE / "stop N of M" text /
// deactivate control — this is purely the step-by-step navigator (WalkStrip,
// OB-071). Distinct from WalkView (id 'walk'), which is a different feature
// entirely: an ad-hoc downstream edge-follower for exploring the corpus, not a
// player for an authored walk.

import { WalkStrip } from '@/ds'

import { usePresentedRoad, usePublishPresentedRoute } from './walkdesk/presented'
import { useWalkPlayback } from './walkdesk/playback'
import type { Bus } from '../studio/bus'

export default function WalkViewer({ bus }: { bus: Bus }) {
  const road = usePresentedRoad()
  // The two-source branch, the step list and the cursor all live in
  // walkdesk/playback.ts now (#195), because the presentation frame walks the
  // same walk with a keyboard and the two must not each carry their own copy.
  const play = useWalkPlayback(bus)
  // opt out of publishing while a saved walk plays — activateWalk already owns
  // bus.route in that state (it sets the walked prefix itself)
  usePublishPresentedRoute(bus, play.source === 'saved' ? null : road)

  return (
    <div className="h-full flex flex-col" aria-label="walk-viewer">
      <div className="shrink-0 px-3 py-1.5 border-b border-slate-100">
        <span className="text-[10px] font-bold text-slate-500">
          {play.title}
          {play.steps.length > 0 && ` · step ${play.cursor + 1} of ${play.steps.length}`}
        </span>
      </div>
      <div style={{ height: 172, margin: '6px 12px' }}>
        <WalkStrip
          steps={play.steps}
          cursor={play.cursor}
          showCount
          onSeek={play.seek}
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
