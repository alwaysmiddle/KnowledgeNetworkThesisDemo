// Candidate B — TIERED RIBBON (icicle rotated onto the walk's own axes):
// horizontal = visit order, vertical = tier. A stage is a bar spanning
// exactly its children below; collapsing merges the children up into the
// parent bar, so a collapse is visibly a SUMMARY, not a deletion. The bottom
// edge of the open frontier, read left to right, IS the projected route —
// the strip below makes that literal. Same 3-tier altitude window as A:
// opening a 4th tier dives (re-roots) with a breadcrumb back.

import { useState } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { fringe, PLAN, stagePath, tierCount, visitCount } from './mockwalk'
import type { StageStop, Stop } from './mockwalk'
import { FringeStrip, NodeChip } from './shared'
import type { Sync } from './sync'

const WINDOW = 3

/** how many leaf-widths a stop occupies at the current expansion */
function weight(s: Stop, expanded: ReadonlySet<string>): number {
  if (s.kind === 'visit') return 1
  if (!expanded.has(s.key)) return 1.15 // a summary bar is a hair wider than one stop
  return s.steps.reduce((a, c) => a + weight(c, expanded), 0)
}

export default function RibbonMock({ sync }: { sync: Sync }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(['serve']))
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
  const open = (s: StageStop, depth: number) => (depth >= WINDOW - 1 ? dive(s.key) : toggle(s.key))

  const path = rootKey ? stagePath(PLAN.stops, rootKey) : []
  const stops = rootKey ? path[path.length - 1].steps : PLAN.stops

  const cell = (s: Stop, depth: number, i: number) => {
    if (s.kind === 'visit') {
      const color = DOMAIN_COLOR[domainOf(s.node)]
      return (
        <div
          key={`${i}-${s.node}`}
          {...sync.bind(s.node)}
          data-node={s.node}
          title={s.note ?? byId.get(s.node)!.title}
          className={['min-w-0 rounded-sm px-1.5 pt-1 text-[10px] font-medium overflow-hidden', sync.lit(s.node) ? 'ring-2 ring-sky-400 z-10' : ''].join(' ')}
          style={{ flexGrow: 1, flexBasis: 0, background: color + '1c', borderTop: `3px solid ${color}`, color }}
        >
          <div className="truncate">{byId.get(s.node)!.title}</div>
        </div>
      )
    }
    const isOpen = expanded.has(s.key) && depth < WINDOW - 1
    if (!isOpen) {
      return (
        <button
          key={s.key}
          data-expand={s.key}
          onClick={() => open(s, depth)}
          className="min-w-0 rounded-sm border border-amber-400 bg-amber-100/80 px-1.5 text-left text-[10px] font-semibold text-amber-800 hover:bg-amber-200/80 overflow-hidden"
          style={{ flexGrow: weight(s, expanded), flexBasis: 0 }}
          title={`${s.title} — ${visitCount(s)} stops · ${tierCount(s)} tiers`}
        >
          <div className="truncate">
            ⊞ {s.title} <span className="font-normal text-amber-600/80">{visitCount(s)}</span>
            {depth >= WINDOW - 1 && <span className="font-normal"> ↓dive</span>}
          </div>
        </button>
      )
    }
    return (
      <div key={s.key} className="min-w-0 flex flex-col gap-px" style={{ flexGrow: weight(s, expanded), flexBasis: 0 }}>
        <button
          data-collapse={s.key}
          onClick={() => toggle(s.key)}
          className="shrink-0 h-6 min-w-0 rounded-sm border border-amber-400 bg-amber-50 px-1.5 text-left text-[10px] font-semibold text-amber-800 hover:bg-amber-100 overflow-hidden"
        >
          <div className="truncate">⊟ {s.title}</div>
        </button>
        <div className="flex-1 min-h-0 flex gap-px">{s.steps.map((c, j) => cell(c, depth + 1, j))}</div>
        {(s.asides ?? []).map((a) => (
          <div key={a.title} className="shrink-0 flex items-center gap-1 rounded-sm border border-dashed border-violet-300 bg-violet-50/60 px-1.5 py-0.5 overflow-hidden">
            <span className="text-[9px] font-semibold text-violet-500 whitespace-nowrap">≀ {a.title}</span>
            <span className="flex items-center gap-1 min-w-0 overflow-hidden">
              {a.steps.map((st) => (
                <NodeChip key={st.node} id={st.node} sync={sync} note={st.note} dim />
              ))}
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col" data-cand="B">
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
        </div>
      )}
      <div className="flex-1 min-h-0 p-3">
        <div className="h-full max-h-[290px] flex gap-px">{stops.map((s, i) => cell(s, 0, i))}</div>
      </div>
      <FringeStrip entries={fringe(PLAN.stops, expanded)} sync={sync} />
    </div>
  )
}
