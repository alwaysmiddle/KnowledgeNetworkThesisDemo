// Candidate E, round 5 — PRESENTATION MODE: layer stack + vertical columns
// on ONE selection state. The round-4 verdict moved the vertical columns out
// of the authoring page ("confusing for authoring, great for reading") and
// retired the horizontal TierLines they descend from: the columns ARE the
// lines, rotated, with the begat-relationship drawn as a real edge instead
// of a "↳ inside" label. The iso stack still navigates and orients — one
// plane per column — while the columns are the desk where reading and
// picking happen. Both render from the same TierPathState, so they cannot
// disagree. This pair graduates to the Studio as the presentation view.

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { fringe, PLAN } from './mockwalk'
import { FringeStrip } from './shared'
import type { Sync } from './sync'
import { useTierPath } from './tierpath'
import WalkColumns from './WalkColumns'

export default function StackLinesMock({ sync }: { sync: Sync }) {
  const { lines, path, pick } = useTierPath(['serve'])

  return (
    <div className="h-full flex" data-cand="E">
      {/* the stack — one plane PER COLUMN, so the drill-path is visible as depth */}
      <div className="w-[430px] shrink-0 border-r border-slate-200 relative overflow-hidden bg-slate-50/60">
        <div className="absolute left-3 top-2 text-[10px] font-bold text-slate-500">
          layer stack — one plane per open column; pick on either side, both follow
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

      {/* the desk — the same drill-path as vertical columns with begat-edges */}
      <div className="flex-1 min-w-0 flex flex-col">
        <WalkColumns stops={PLAN.stops} path={path} pick={pick} sync={sync} />
        <FringeStrip entries={fringe(PLAN.stops, new Set(path))} sync={sync} />
      </div>
    </div>
  )
}
