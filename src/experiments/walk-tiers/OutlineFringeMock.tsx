// Candidate C — OUTLINE RAIL + FRINGE LANE: structure and traversal split
// into two coordinated readings. Left, a collapsible outline of the walk tree
// (SpaceTree mechanics: ⊞/⊟ plus a preview of what a collapsed row hides).
// Right, the projected route rendered as the familiar linear lane — exactly
// what the shipped WalkView would keep drawing after graduation. Notably this
// candidate needs NO altitude window: an outline scrolls, depth is indent.
// The outline is also, almost verbatim, the skeleton of the authoring view.

import { useState } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { allExpandedKeys, fringe, PLAN, tierCount, visitCount } from './mockwalk'
import type { Stop } from './mockwalk'
import type { Sync } from './sync'

export default function OutlineFringeMock({ sync }: { sync: Sync }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(['serve']))

  const toggle = (key: string) => {
    const next = new Set(expanded)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpanded(next)
  }

  const row = (s: Stop, depth: number, i: number) => {
    const pad = { paddingLeft: `${8 + depth * 16}px` }
    if (s.kind === 'visit') {
      const color = DOMAIN_COLOR[domainOf(s.node)]
      return (
        <div
          key={`${i}-${s.node}`}
          {...sync.bind(s.node)}
          data-node={s.node}
          style={pad}
          className={['flex items-center gap-1.5 py-1 pr-2 rounded text-[11px]', sync.lit(s.node) ? 'bg-sky-50 ring-1 ring-sky-300' : 'hover:bg-slate-100'].join(' ')}
        >
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: color }} />
          <span style={{ color }} className="font-medium whitespace-nowrap">
            {byId.get(s.node)!.title}
          </span>
          {s.note && <span className="text-[10px] text-slate-400 truncate">— {s.note}</span>}
        </div>
      )
    }
    const isOpen = expanded.has(s.key)
    return (
      <div key={s.key}>
        <button
          data-expand={s.key}
          onClick={() => toggle(s.key)}
          style={pad}
          className="w-full flex items-center gap-1.5 py-1 pr-2 rounded text-left text-[11px] hover:bg-amber-50"
        >
          <span className="text-amber-600 font-bold">{isOpen ? '⊟' : '⊞'}</span>
          <span className="font-semibold text-amber-800 whitespace-nowrap">{s.title}</span>
          {!isOpen && (
            <span className="text-[10px] text-amber-500">
              {visitCount(s)} stops · {tierCount(s)} tiers hidden
            </span>
          )}
        </button>
        {isOpen && (
          <>
            {s.steps.map((c, j) => row(c, depth + 1, j))}
            {(s.asides ?? []).map((a) => (
              <div key={a.title} className="border-l-2 border-dashed border-violet-300 ml-3 my-0.5" style={{ marginLeft: `${16 + depth * 16}px` }}>
                <div className="text-[9.5px] font-semibold text-violet-500 pl-2 pt-0.5">≀ {a.title} — related, not in the route</div>
                {a.steps.map((st, j) => (
                  <div
                    key={`${j}-${st.node}`}
                    {...sync.bind(st.node)}
                    data-node={st.node}
                    className={['flex items-center gap-1.5 py-0.5 pl-2 text-[10.5px] text-slate-400', sync.lit(st.node) ? 'bg-sky-50' : ''].join(' ')}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: DOMAIN_COLOR[domainOf(st.node)] }} />
                    {byId.get(st.node)!.title}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  const route = fringe(PLAN.stops, expanded)
  const seen = new Set<string>()

  return (
    <div className="h-full flex" data-cand="C">
      <div className="w-[380px] shrink-0 border-r border-slate-200 flex flex-col">
        <div className="shrink-0 px-2 py-1.5 flex items-center gap-2 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-500">outline — the walk tree</span>
          <span className="flex-1" />
          <button data-expand-all onClick={() => setExpanded(allExpandedKeys())} className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-500">
            expand all
          </button>
          <button data-collapse-all onClick={() => setExpanded(new Set())} className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-500">
            collapse all
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto py-1 pr-1">{PLAN.stops.map((s, i) => row(s, 0, i))}</div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col bg-slate-50/50">
        <div className="shrink-0 px-3 py-1.5 text-[10px] font-bold text-slate-500 border-b border-slate-100" data-fringe-count={route.length}>
          fringe lane — the projected route ({route.length} entries), what WalkView keeps rendering
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-3">
          <div className="flex flex-col gap-1.5 max-w-[340px]">
            {route.map((e, i) => {
              if (e.kind === 'stage')
                return (
                  <div key={`${i}-${e.key}`} className="px-2.5 py-1.5 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50/60 text-[11px] text-amber-700">
                    <span className="font-bold">⊞ {e.title}</span>
                    <span className="text-amber-500"> — collapsed, {e.visits} stops fold into this entry</span>
                  </div>
                )
              const revisit = seen.has(e.id)
              seen.add(e.id)
              const color = DOMAIN_COLOR[domainOf(e.id)]
              return (
                <div
                  key={`${i}-${e.id}`}
                  {...sync.bind(e.id)}
                  className={['px-2.5 py-1.5 rounded-lg border-2 bg-white text-[11px] flex items-center gap-1.5', sync.lit(e.id) ? 'ring-2 ring-sky-300' : ''].join(' ')}
                  style={{ borderColor: color }}
                >
                  <span className="text-[9px] text-slate-300 w-4 text-right shrink-0">{i + 1}</span>
                  <span className="font-semibold" style={{ color }}>
                    {byId.get(e.id)!.title}
                  </span>
                  {revisit && <span className="text-slate-400">↺</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
