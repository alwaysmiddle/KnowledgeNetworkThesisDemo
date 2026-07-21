// Candidate E, round 2 — LAYER STACK + TIER LINES on ONE selection state.
// The round-1 finding ("great navigator, unusable desk") plus the user's
// refined B ("each tier is one line; picking a node swaps out everything
// below") turned out to be the same design at two altitudes: one plane per
// line, one line per plane. The iso stack navigates and orients — planes
// appear and vanish as the drill-path deepens, the picked stage glows on its
// plane — while the flat lines beside it are where reading and picking
// actually happen. Both render from the same TierPathState, so they cannot
// disagree.

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { fringe, PLAN } from './mockwalk'
import { FringeStrip } from './shared'
import type { Sync } from './sync'
import { TierLines } from './TierLines'
import { useTierPath } from './tierpath'

export default function StackLinesMock({ sync }: { sync: Sync }) {
  const state = useTierPath(['serve'])
  const { lines, path, pick } = state

  return (
    <div className="h-full flex" data-cand="E">
      {/* the stack — one plane PER LINE, so the drill-path is visible as depth */}
      <div className="w-[430px] shrink-0 border-r border-slate-200 relative overflow-hidden bg-slate-50/60">
        <div className="absolute left-3 top-2 text-[10px] font-bold text-slate-500">
          layer stack — one plane per open line; pick on either side, both follow
        </div>
        {lines.map((line, t) => {
          const spacing = line.stops.length > 1 ? 250 / (line.stops.length - 1) : 0
          return (
            <div key={`${t}-${line.source}`}>
              <div
                className="absolute left-3 text-left text-[10px] rounded px-1.5 py-0.5 border border-slate-200 bg-white text-slate-500"
                style={{ top: 74 + t * 92 }}
                data-plane-label={t}
              >
                tier {t} · {line.stops.length}
              </div>
              <div
                data-plane={t}
                className="absolute rounded-lg border-2 border-slate-300 bg-white/70"
                style={{ left: 92, top: 44 + t * 92, width: 300, height: 122, transform: 'rotateX(56deg) rotateZ(-42deg)' }}
              >
                <div className="absolute left-[20px] right-[22px] top-[57px] h-0.5 bg-amber-300/70 rounded" />
                {line.stops.map((s, i) => {
                  const left = 18 + i * spacing
                  if (s.kind === 'stage') {
                    const picked = path[t] === s.key
                    return (
                      <button
                        key={s.key}
                        data-pick-stack={s.key}
                        onClick={() => pick(t, s)}
                        title={s.title}
                        className={['absolute w-3.5 h-3.5 border-2 rotate-45', picked ? 'bg-amber-400 border-amber-600 ring-2 ring-amber-300 scale-125' : 'bg-amber-200 border-amber-500 hover:scale-125'].join(' ')}
                        style={{ left, top: 50 }}
                      />
                    )
                  }
                  return (
                    <button
                      key={`${i}-${s.node}`}
                      {...sync.bind(s.node)}
                      onClick={() => pick(t, s)}
                      title={byId.get(s.node)!.title}
                      className={['absolute w-3 h-3 rounded-full border-2 border-white', sync.lit(s.node) ? 'ring-2 ring-sky-400 scale-150' : ''].join(' ')}
                      style={{ left, top: 51, background: DOMAIN_COLOR[domainOf(s.node)] }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* the desk — the same lines, flat and legible */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TierLines state={state} sync={sync} />
        <FringeStrip entries={fringe(PLAN.stops, new Set(path))} sync={sync} />
      </div>
    </div>
  )
}
