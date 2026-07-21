// Candidate A — EXPANDING COLUMNS. The current WalkView's grammar (one column
// per stop, left to right = order) grown one axis: a stage is a column that
// can open INLINE into a bordered group of its children's columns. The
// altitude window caps inline depth at 3 tiers; opening a stage that would
// show a 4th tier DIVES instead — the view re-roots at that stage and a
// breadcrumb keeps the way back (the semantic-zoom move, applied to a walk).

import { useState } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { fringe, PLAN, stagePath, tierCount, visitCount } from './mockwalk'
import type { Stop, StageStop } from './mockwalk'
import { FringeStrip, NodeChip } from './shared'
import type { Sync } from './sync'

const WINDOW = 3 // tiers visible inline before a dive

export default function ColumnsMock({ sync }: { sync: Sync }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const [rootKey, setRootKey] = useState<string | null>(null)

  const toggle = (key: string) => {
    const next = new Set(expanded)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpanded(next)
  }
  const dive = (key: string) => {
    setExpanded(new Set(expanded).add(key))
    setRootKey(key)
  }

  const path = rootKey ? stagePath(PLAN.stops, rootKey) : []
  const stops = rootKey ? path[path.length - 1].steps : PLAN.stops

  const open = (s: StageStop, depth: number) => (depth >= WINDOW - 1 ? dive(s.key) : toggle(s.key))

  const renderStop = (s: Stop, depth: number, i: number) => {
    if (s.kind === 'visit') {
      const n = byId.get(s.node)!
      return (
        <div
          key={`${i}-${s.node}`}
          {...sync.bind(s.node)}
          data-node={s.node}
          className={[
            'w-[150px] shrink-0 self-start rounded-lg border-2 bg-white px-2.5 py-2',
            sync.lit(s.node) ? 'ring-2 ring-sky-300' : '',
          ].join(' ')}
          style={{ borderColor: DOMAIN_COLOR[domainOf(s.node)] }}
        >
          <div className="text-[11.5px] font-semibold" style={{ color: DOMAIN_COLOR[domainOf(s.node)] }}>
            {n.title}
          </div>
          {s.note && <div className="text-[9.5px] text-slate-400 mt-1 leading-snug">{s.note}</div>}
        </div>
      )
    }
    if (!expanded.has(s.key) || depth >= WINDOW - 1) {
      // collapsed stage — the ⊞ preview badge is the SpaceTree lesson: depth
      // must be visible before the user commits to opening it
      return (
        <button
          key={s.key}
          data-expand={s.key}
          onClick={() => open(s, depth)}
          className="w-[150px] shrink-0 self-start rounded-lg border-2 border-amber-400 bg-amber-50 px-2.5 py-2 text-left hover:bg-amber-100"
        >
          <div className="text-[10px] font-bold text-amber-600">⊞ stage</div>
          <div className="text-[11.5px] font-semibold text-amber-800">{s.title}</div>
          <div className="text-[9.5px] text-amber-500 mt-1">
            {visitCount(s)} stops · {tierCount(s)} tiers{depth >= WINDOW - 1 ? ' · opens as a dive' : ''}
          </div>
        </button>
      )
    }
    return (
      <div key={s.key} className="shrink-0 self-start rounded-xl border-2 border-amber-300 bg-amber-50/40">
        <button
          data-collapse={s.key}
          onClick={() => toggle(s.key)}
          className="w-full text-left px-2.5 py-1 border-b border-amber-200 hover:bg-amber-100/60 rounded-t-xl"
        >
          <span className="text-[10px] font-bold text-amber-600">⊟ </span>
          <span className="text-[11px] font-semibold text-amber-800">{s.title}</span>
        </button>
        <div className="flex gap-2 items-start p-2">
          {s.steps.map((c, j) => renderStop(c, depth + 1, j))}
          {(s.asides ?? []).map((a) => (
            <div key={a.title} className="shrink-0 self-start rounded-lg border border-dashed border-violet-300 bg-violet-50/50 px-2 py-1.5">
              <div className="text-[9.5px] font-semibold text-violet-500 mb-1">≀ {a.title} — related, not a step</div>
              <div className="flex flex-col items-start gap-1">
                {a.steps.map((st) => (
                  <NodeChip key={st.node} id={st.node} sync={sync} note={st.note} dim />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" data-cand="A">
      {rootKey && (
        <div className="shrink-0 px-3 py-1.5 flex items-center gap-2 text-[11px] bg-amber-50 border-b border-amber-200" data-crumb>
          <button data-up onClick={() => setRootKey(path.length > 1 ? path[path.length - 2].key : null)} className="px-1.5 py-0.5 rounded border border-amber-300 bg-white hover:bg-amber-100 text-amber-700">
            ↑ up
          </button>
          <span className="text-amber-800">
            {PLAN.title}
            {path.map((p) => (
              <span key={p.key}> / {p.title}</span>
            ))}
          </span>
          <span className="text-amber-500">— dived below the 3-tier window</span>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto p-3">
        <div className="flex gap-2 items-start">{stops.map((s, i) => renderStop(s, 0, i))}</div>
      </div>
      <FringeStrip entries={fringe(PLAN.stops, expanded)} sync={sync} />
    </div>
  )
}
