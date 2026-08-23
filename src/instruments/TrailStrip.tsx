// Trail (walked path) + walk controls — the bottom strip. The trail is the
// temporal history of every focus write, append-only — where the breadcrumb
// answers "where am I in the containment tree," the trail answers "how did I
// get here." The two diverge exactly when a JUMP happens — jump chips are
// visually accented so that divergence is legible in a screenshot, not just
// in the DOM text a verification script pulls out.

import { useEffect, useRef, useSyncExternalStore } from 'react'

import { IconButton, PaneScroller, TrailChip, WalkStrip, wrapTip } from '@/ds'
import type { DomainCode } from '@/ds'

import { byId, domainOf } from '../corpus/graph'
import { listWalks, subscribeWalks } from '../model/walkstore'
import type { TrailVia } from '../model/nav'
import type { Bus } from '../studio/bus'

const VIA_TAG: Record<TrailVia, string> = {
  map: 'MAP',
  tree: 'TREE',
  link: 'LNK',
  trail: 'TRL',
  walk: 'WLK',
  graph: 'GPH',
  nav: 'NAV',
  desk: 'DSK',
}

export default function TrailStrip({ bus }: { bus: Bus }) {
  const { trail, activeWalk } = bus
  // #16: the built-ins PLUS whatever the desk has saved. Bound here rather than
  // imported as a const because the list grows while the app is running — save a
  // walk on the desk and its button must appear in this strip without a reload.
  const walks = useSyncExternalStore(subscribeWalks, listWalks)
  const onSelectTrailEntry = (id: string) => bus.setFocus(id, 'trail')
  const onActivateWalk = (walkId: string) => bus.activateWalk(walkId, 0)
  const onDeactivateWalk = bus.deactivateWalk

  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth, behavior: 'smooth' })
  }, [trail.length])

  const walk = activeWalk ? walks.find((w) => w.id === activeWalk.walkId) ?? null : null
  const cursor = activeWalk?.cursor ?? 0

  return (
    // OB-071: 92px held the old bare StepDot row; WalkStrip needs 154px on its own,
    // so the whole strip grows to fit it (both columns stretch together, same row)
    <div className="shrink-0 border-t border-slate-200 bg-white flex items-stretch h-[240px]" aria-label="trail-strip">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 pt-1.5 text-[10px] font-bold text-slate-500 shrink-0">
          Trail — {trail.length} visited (append-only; ⤳ marks a jump)
        </div>
        <PaneScroller axis="x" forwardRef={scroller} style={{ padding: '0 12px 8px' }}>
          <div className="flex items-center gap-1.5 h-full">
            {trail.map((t, i) => (
              <TrailChip
                key={`${i}-${t.id}`}
                title={byId.get(t.id)!.title}
                domain={domainOf(t.id) as DomainCode}
                via={VIA_TAG[t.via]}
                jump={t.jump}
                onClick={() => onSelectTrailEntry(t.id)}
              />
            ))}
          </div>
        </PaneScroller>
      </div>

      <div className="w-px bg-slate-200 shrink-0" />

      <PaneScroller style={{ width: 420, flex: 'none', padding: '6px 12px' }}>
        <div className="text-[10px] font-bold text-slate-500 mb-1">Walks</div>
        {!walk ? (
          <div className="flex flex-wrap gap-1.5">
            {walks.map((w) => (
              <button
                key={w.id}
                onClick={() => onActivateWalk(w.id)}
                className="px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 text-[11px] font-medium"
                title={wrapTip(w.description)}
              >
                ▶ {w.title}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-amber-700 truncate max-w-[140px]">{walk.title}</span>
            <span className="text-slate-400 shrink-0">
              stop {cursor + 1} of {walk.stops.length} · {walk.stops.length - 1 - cursor} remaining
            </span>
            <span className="flex-1" />
            <IconButton onClick={onDeactivateWalk} title="stop this walk" />
          </div>
        )}
        {walk && (
          // OB-071: WalkStrip replaces the old bare StepDot row and the separate
          // "next ▶" button — the seek bar (drag or click) is the new way to move,
          // wired to the same activateWalk the old dots' click-to-jump used.
          <div style={{ height: 154, marginTop: 6 }}>
            <WalkStrip
              steps={walk.stops.map((s) => ({ id: s.id, title: byId.get(s.id)!.title, note: s.note }))}
              cursor={cursor}
              onSeek={(index) => activeWalk && bus.activateWalk(activeWalk.walkId, index)}
            />
          </div>
        )}
      </PaneScroller>
    </div>
  )
}
