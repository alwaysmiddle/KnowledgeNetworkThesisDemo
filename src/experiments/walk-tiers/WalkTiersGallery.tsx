// The walk-tiers spike gallery (KnowledgeNetworkDemo#11) — five candidate
// renderings of ONE tiered mock walk, side by side with a stand-in for the
// node viewer. Reached only via `?spike=walk-tiers`; the Studio never loads
// this route and nothing here touches the bus. The gallery owns the shared
// hover state so every candidate proves the same claim: no private preview
// tooltips — the document pane follows the hover channel.

import { useState } from 'react'

import ColumnsMock from './ColumnsMock'
import IsoStackMock from './IsoStackMock'
import MetroMock from './MetroMock'
import OutlineFringeMock from './OutlineFringeMock'
import RibbonMock from './RibbonMock'
import { PLAN } from './mockwalk'
import { DocPaneStandIn } from './shared'
import { useSync } from './sync'
import type { Sync } from './sync'

const CANDIDATES: { id: string; label: string; hint: string; render(sync: Sync): React.ReactNode }[] = [
  {
    id: 'A',
    label: 'A · Expanding columns',
    hint: 'the current walk grammar; a stage opens inline, a 4th tier dives with a breadcrumb',
    render: (sync) => <ColumnsMock sync={sync} />,
  },
  {
    id: 'B',
    label: 'B · Tiered ribbon',
    hint: 'icicle on the walk’s axes — horizontal order, vertical tier; a collapsed bar covers its children’s extent',
    render: (sync) => <RibbonMock sync={sync} />,
  },
  {
    id: 'C',
    label: 'C · Outline + fringe',
    hint: 'structure on the left, the projected route on the right; no altitude window needed — depth is indent',
    render: (sync) => <OutlineFringeMock sync={sync} />,
  },
  {
    id: 'D',
    label: 'D · Metro line',
    hint: 'named stations on one line that dips a tier stratum wherever a stage is expanded',
    render: (sync) => <MetroMock sync={sync} />,
  },
  {
    id: 'E',
    label: 'E · Layer stack',
    hint: 'tiers as isometric planes (the navigator) beside a flat desk (the working surface)',
    render: (sync) => <IsoStackMock sync={sync} />,
  },
]

export default function WalkTiersGallery() {
  const [active, setActive] = useState('B')
  const sync = useSync()
  const cand = CANDIDATES.find((c) => c.id === active)!

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="shrink-0 px-4 py-2 bg-white border-b border-slate-200 flex items-baseline gap-3">
        <h1 className="text-[14px] font-bold text-slate-800">Walk-tiers spike</h1>
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
