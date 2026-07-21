// Candidate C, round 2 — OUTLINE + RECURSIVE TIMELINE. The outline rail
// stays (round 1's most legible structure reading, and the authoring
// skeleton). The flat fringe lane is replaced by the multi-tier answer: a
// top-down timeline in the git-graph mould — one vertical line per walk,
// dots in visit order, and an open stage BRANCHES a nested timeline to the
// right which rejoins the parent line below. Same expanded set drives both
// panes, so the outline and the timeline are provably two readings of one
// state. Asides hang beside their stage's branch as a dashed lane.

import { useState } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { allExpandedKeys, PLAN, tierCount, visitCount } from './mockwalk'
import type { Aside, Stop } from './mockwalk'
import type { Sync } from './sync'

function AsideLane({ aside, sync }: { aside: Aside; sync: Sync }) {
  return (
    <div className="ml-6 my-1 pl-2.5 border-l-2 border-dashed border-violet-300">
      <div className="text-[9.5px] font-semibold text-violet-500 pt-0.5">≀ {aside.title} — related, not in the route</div>
      {aside.steps.map((st, j) => (
        <div
          key={`${j}-${st.node}`}
          {...sync.bind(st.node)}
          data-node={st.node}
          className={['flex items-center gap-1.5 py-0.5 text-[10.5px] text-slate-400', sync.lit(st.node) ? 'bg-sky-50 rounded' : ''].join(' ')}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: DOMAIN_COLOR[domainOf(st.node)] }} />
          {byId.get(st.node)!.title}
        </div>
      ))}
    </div>
  )
}

function TimelineLevel({
  stops,
  expanded,
  toggle,
  sync,
  revisits,
  prefix,
}: {
  stops: Stop[]
  expanded: ReadonlySet<string>
  toggle(key: string): void
  sync: Sync
  /** position keys of the occurrences that are revisits — precomputed PURELY
   * (mutating a seen-set during render double-marks under StrictMode) */
  revisits: ReadonlySet<string>
  prefix: string
}) {
  return (
    <div className="relative pl-4">
      {/* the line itself — one walk, top to bottom */}
      <div className="absolute left-[5px] top-2 bottom-2 w-[3px] rounded bg-amber-400/60" />
      {stops.map((s, i) => {
        if (s.kind === 'visit') {
          const color = DOMAIN_COLOR[domainOf(s.node)]
          const revisit = revisits.has(`${prefix}.${i}`)
          return (
            <div key={`${i}-${s.node}`} {...sync.bind(s.node)} data-node={s.node} className={['relative flex items-center gap-2 py-1', sync.lit(s.node) ? 'bg-sky-50 rounded' : ''].join(' ')}>
              <span className="w-3 h-3 rounded-full border-2 bg-white shrink-0 -ml-[13px] z-10" style={{ borderColor: color }} />
              <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color }}>
                {byId.get(s.node)!.title}
              </span>
              {revisit && <span data-revisit className="text-[10px] text-slate-400">↺</span>}
              {s.note && <span className="text-[10px] text-slate-400 truncate">— {s.note}</span>}
            </div>
          )
        }
        const isOpen = expanded.has(s.key)
        return (
          <div key={s.key} className="relative">
            <button data-texpand={s.key} onClick={() => toggle(s.key)} className="relative flex items-center gap-2 py-1 w-full text-left hover:bg-amber-50 rounded">
              <span className="w-3 h-3 border-2 border-amber-500 bg-amber-200 rotate-45 shrink-0 -ml-[13px] z-10" />
              <span className="text-[11px] font-bold text-amber-800 whitespace-nowrap">
                {isOpen ? '⊟' : '⊞'} {s.title}
              </span>
              {!isOpen && (
                <span className="text-[10px] text-amber-500">
                  {visitCount(s)} stops · {tierCount(s)} tiers folded into this dot
                </span>
              )}
            </button>
            {isOpen && (
              <div className="ml-5 border-l-2 border-dotted border-amber-300/60 rounded-bl-lg pb-1">
                <TimelineLevel stops={s.steps} expanded={expanded} toggle={toggle} sync={sync} revisits={revisits} prefix={`${prefix}.${i}`} />
                {(s.asides ?? []).map((a) => (
                  <AsideLane key={a.title} aside={a} sync={sync} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function OutlineTimelineMock({ sync }: { sync: Sync }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(['serve']))
  const toggle = (key: string) => {
    const next = new Set(expanded)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpanded(next)
  }

  // which visit OCCURRENCES are revisits, in the rendered (expansion-aware)
  // top-down order — computed before render so rendering stays pure
  const revisits = new Set<string>()
  {
    const seen = new Set<string>()
    const walk = (stops: Stop[], prefix: string) => {
      stops.forEach((s, i) => {
        if (s.kind === 'visit') {
          if (seen.has(s.node)) revisits.add(`${prefix}.${i}`)
          seen.add(s.node)
        } else if (expanded.has(s.key)) walk(s.steps, `${prefix}.${i}`)
      })
    }
    walk(PLAN.stops, 'r')
  }

  const outlineRow = (s: Stop, depth: number, i: number) => {
    const pad = { paddingLeft: `${8 + depth * 16}px` }
    if (s.kind === 'visit') {
      const color = DOMAIN_COLOR[domainOf(s.node)]
      return (
        <div
          key={`${i}-${s.node}`}
          {...sync.bind(s.node)}
          style={pad}
          className={['flex items-center gap-1.5 py-0.5 pr-2 rounded text-[11px]', sync.lit(s.node) ? 'bg-sky-50 ring-1 ring-sky-300' : 'hover:bg-slate-100'].join(' ')}
        >
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: color }} />
          <span style={{ color }} className="font-medium whitespace-nowrap">
            {byId.get(s.node)!.title}
          </span>
        </div>
      )
    }
    const isOpen = expanded.has(s.key)
    return (
      <div key={s.key}>
        <button data-expand={s.key} onClick={() => toggle(s.key)} style={pad} className="w-full flex items-center gap-1.5 py-0.5 pr-2 rounded text-left text-[11px] hover:bg-amber-50">
          <span className="text-amber-600 font-bold">{isOpen ? '⊟' : '⊞'}</span>
          <span className="font-semibold text-amber-800 whitespace-nowrap">{s.title}</span>
          {!isOpen && <span className="text-[10px] text-amber-500">{visitCount(s)}</span>}
        </button>
        {isOpen && (
          <>
            {s.steps.map((c, j) => outlineRow(c, depth + 1, j))}
            {(s.asides ?? []).map((a) => (
              <div key={a.title} style={{ marginLeft: `${16 + depth * 16}px` }} className="border-l-2 border-dashed border-violet-300 pl-2 text-[9.5px] text-violet-500 py-0.5">
                ≀ {a.title} ({a.steps.length})
              </div>
            ))}
          </>
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex" data-cand="C">
      <div className="w-[300px] shrink-0 border-r border-slate-200 flex flex-col">
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
        <div className="flex-1 min-h-0 overflow-auto py-1 pr-1">{PLAN.stops.map((s, i) => outlineRow(s, 0, i))}</div>
      </div>

      <div className="flex-1 min-w-0 flex flex-col bg-slate-50/50">
        <div className="shrink-0 px-3 py-1.5 text-[10px] font-bold text-slate-500 border-b border-slate-100">
          timeline — top-down, one line per walk; an open stage branches right and rejoins below (same state as the outline)
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-3">
          <TimelineLevel stops={PLAN.stops} expanded={expanded} toggle={toggle} sync={sync} revisits={revisits} prefix="r" />
        </div>
      </div>
    </div>
  )
}
