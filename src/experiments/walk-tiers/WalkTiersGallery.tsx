// The walk-tiers spike gallery (KnowledgeNetworkDemo#11) — round 2. A
// (expanding columns) and D (metro) were judged dead on arrival and deleted;
// git history keeps them. Three survivors, rebuilt to the round-2 verdicts:
// B as selection-driven tier lines, C keeping its outline but answering
// multi-tier with a recursive top-down timeline, and E — the money shot —
// the layer stack synced with B's lines on one drill-path state. Reached
// only via `?spike=walk-tiers`; nothing here touches the bus.

import { useState } from 'react'

import OutlineTimelineMock from './OutlineTimelineMock'
import StackLinesMock from './StackLinesMock'
import TierLinesMock from './TierLinesMock'
import { PLAN } from './mockwalk'
import { DocPaneStandIn } from './shared'
import { useSync } from './sync'
import type { Sync } from './sync'

const CANDIDATES: { id: string; label: string; hint: string; render(sync: Sync): React.ReactNode }[] = [
  {
    id: 'B',
    label: 'B · Tier lines',
    hint: 'one line per tier; picking a stage opens the next line, picking anything else swaps out every line below',
    render: (sync) => <TierLinesMock sync={sync} />,
  },
  {
    id: 'C',
    label: 'C · Outline + timeline',
    hint: 'the outline kept from round 1, beside a recursive top-down timeline — an open stage branches right and rejoins',
    render: (sync) => <OutlineTimelineMock sync={sync} />,
  },
  {
    id: 'E',
    label: 'E · Stack + lines',
    hint: 'one plane per line, one line per plane — the iso stack navigates, the flat lines are the desk, one shared state',
    render: (sync) => <StackLinesMock sync={sync} />,
  },
]

export default function WalkTiersGallery() {
  const [active, setActive] = useState('E')
  const sync = useSync()
  const cand = CANDIDATES.find((c) => c.id === active)!

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="shrink-0 px-4 py-2 bg-white border-b border-slate-200 flex items-baseline gap-3">
        <h1 className="text-[14px] font-bold text-slate-800">Walk-tiers spike · round 2</h1>
        <span className="text-[11px] text-slate-400">
          one mock plan — “{PLAN.title}” — 4 tiers, a sub-walk by reference, a revisit, an aside · corpus untouched, tiers
          are pure overlay
        </span>
      </header>

      <div className="shrink-0 px-4 pt-2 pb-1.5 bg-white border-b border-slate-200 flex items-center gap-1.5">
        {CANDIDATES.map((c) => (
          <button
            key={c.id}
            data-galtab={c.id}
            onClick={() => setActive(c.id)}
            className={[
              'px-2.5 py-1 rounded-md border text-[11.5px] font-semibold',
              c.id === active ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100',
            ].join(' ')}
          >
            {c.label}
          </button>
        ))}
        <span className="text-[10.5px] text-slate-400 ml-2 truncate">{cand.hint}</span>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0">{cand.render(sync)}</div>
        <DocPaneStandIn sync={sync} />
      </div>
    </div>
  )
}
