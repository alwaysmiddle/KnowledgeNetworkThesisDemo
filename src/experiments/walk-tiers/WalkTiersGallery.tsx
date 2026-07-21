// The walk-tiers spike gallery (KnowledgeNetworkDemo#11) — round 5, the
// FINAL round: the spike's two survivors, one per mode. C is the authoring
// page (palette + the nested-box editor — the round-4 winner, now owning
// every block gesture); E is presentation mode (layer stack + the vertical
// columns that replaced the horizontal tier lines). Both graduate to the
// Studio from here. Reached only via `?spike=walk-tiers`; nothing touches
// the bus.

import { useState } from 'react'

import AuthorMock from './AuthorMock'
import StackLinesMock from './StackLinesMock'
import { PLAN } from './mockwalk'
import { DocPaneStandIn } from './shared'
import { useSync } from './sync'
import type { Sync } from './sync'

const CANDIDATES: { id: string; label: string; hint: string; render(sync: Sync): React.ReactNode }[] = [
  {
    id: 'C',
    label: 'C · Author (nested boxes)',
    hint: 'the authoring mode — palette (map stand-in) + the nested-box editor; boxes select, drag, group, retitle; drop INTO an open box to add there',
    render: (sync) => <AuthorMock sync={sync} />,
  },
  {
    id: 'E',
    label: 'E · Present (stack + columns)',
    hint: 'the presentation mode — one plane per column; the iso stack navigates, the vertical columns with begat-edges are the desk, one shared state',
    render: (sync) => <StackLinesMock sync={sync} />,
  },
]

export default function WalkTiersGallery() {
  const [active, setActive] = useState('C')
  const sync = useSync()
  const cand = CANDIDATES.find((c) => c.id === active)!

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="shrink-0 px-4 py-2 bg-white border-b border-slate-200 flex items-baseline gap-3">
        <h1 className="text-[14px] font-bold text-slate-800">Walk-tiers spike · round 5 (final)</h1>
        <span className="text-[11px] text-slate-400">
          C authors a NEW plan from the corpus; E presents “{PLAN.title}” · corpus untouched, tiers are pure overlay ·
          both graduate to the Studio
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
