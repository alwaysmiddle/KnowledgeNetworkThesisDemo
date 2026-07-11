// Trail (walked path) + walk controls — the bottom strip. The trail is the
// temporal history of every focus write, append-only — where the breadcrumb
// answers "where am I in the containment tree," the trail answers "how did I
// get here." The two diverge exactly when a JUMP happens — jump chips are
// visually accented so that divergence is legible in a screenshot, not just
// in the DOM text a verification script pulls out.

import { useEffect, useRef } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../corpus/graph'
import { WALKS } from '../corpus/walks'
import type { ActiveWalkState, TrailEntry, TrailVia } from '../model/nav'

const VIA_TAG: Record<TrailVia, string> = {
  map: 'MAP',
  tree: 'TREE',
  link: 'LNK',
  trail: 'TRL',
  walk: 'WLK',
  graph: 'GPH',
}

export interface TrailStripProps {
  trail: TrailEntry[]
  onSelectTrailEntry: (id: string) => void
  activeWalk: ActiveWalkState | null
  onActivateWalk: (walkId: string) => void
  onAdvanceWalk: () => void
  onJumpToStop: (index: number) => void
  onDeactivateWalk: () => void
}

export default function TrailStrip({
  trail,
  onSelectTrailEntry,
  activeWalk,
  onActivateWalk,
  onAdvanceWalk,
  onJumpToStop,
  onDeactivateWalk,
}: TrailStripProps) {
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scroller.current?.scrollTo({ left: scroller.current.scrollWidth, behavior: 'smooth' })
  }, [trail.length])

  const walk = activeWalk ? WALKS.find((w) => w.id === activeWalk.walkId) ?? null : null
  const cursor = activeWalk?.cursor ?? 0

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white flex items-stretch h-[92px]" aria-label="trail-strip">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-3 pt-1.5 text-[10px] font-bold text-slate-500 shrink-0">
          Trail — {trail.length} visited (append-only; ⤳ marks a jump)
        </div>
        <div ref={scroller} className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-3 pb-2">
          <div className="flex items-center gap-1.5 h-full">
            {trail.map((t, i) => (
              <button
                key={`${i}-${t.id}`}
                onClick={() => onSelectTrailEntry(t.id)}
                title={`${VIA_TAG[t.via]} · step ${i + 1}`}
                className={[
                  'shrink-0 px-2 py-1 rounded-md border text-[11px] flex items-center gap-1',
                  t.jump ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100',
                ].join(' ')}
              >
                {t.jump && <span className="text-amber-600 font-bold">⤳</span>}
                <span style={{ color: DOMAIN_COLOR[domainOf(t.id)] ?? '#475569' }} className="font-medium truncate max-w-[120px]">
                  {byId.get(t.id)!.title}
                </span>
                <span className="text-slate-400 text-[9px]">{VIA_TAG[t.via]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-px bg-slate-200 shrink-0" />

      <div className="w-[420px] shrink-0 px-3 py-1.5 overflow-y-auto">
        <div className="text-[10px] font-bold text-slate-500 mb-1">Walks</div>
        {!walk ? (
          <div className="flex flex-wrap gap-1.5">
            {WALKS.map((w) => (
              <button
                key={w.id}
                onClick={() => onActivateWalk(w.id)}
                className="px-2 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 text-[11px] font-medium"
                title={w.description}
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
            {cursor < walk.stops.length - 1 && (
              <button onClick={onAdvanceWalk} className="px-2 py-0.5 rounded border border-amber-400 text-amber-700 hover:bg-amber-50 shrink-0">
                next ▶
              </button>
            )}
            <button onClick={onDeactivateWalk} className="px-1.5 py-0.5 rounded border border-slate-300 text-slate-500 hover:bg-slate-100 shrink-0">
              ✕
            </button>
          </div>
        )}
        {walk && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {walk.stops.map((s, i) => (
              <button
                key={s.id + i}
                onClick={() => onJumpToStop(i)}
                title={s.note}
                className={[
                  'w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center border',
                  i === cursor
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : i < cursor
                      ? 'bg-amber-100 border-amber-300 text-amber-700'
                      : 'bg-white border-slate-300 text-slate-400',
                ].join(' ')}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
