// The walk-tiers spike gallery (KnowledgeNetworkDemo#11) — round 6: the
// issue reopened on authoring-metaphor feedback. C is a side-by-side again:
// the round-5 nested-box editor vs the new nested-NODE flow chart (compound
// nodes expanding in place, bold direction arrows, contextual controls at
// the click site) — both rendering ONE shared draft. E is unchanged
// presentation mode (layer stack + vertical columns). Reached only via
// `?spike=walk-tiers`; nothing touches the bus.

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
    label: 'C · Author (boxes vs nodes)',
    hint: 'one draft, two metaphors — nested boxes (toolbar controls) beside a nested-node flow chart (contextual controls, order badges, bold arrows); edit either side',
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
        <h1 className="text-[14px] font-bold text-slate-800">Walk-tiers spike · round 6</h1>
        <span className="text-[11px] text-slate-400">
          C compares two authoring metaphors on ONE shared draft; E presents “{PLAN.title}” · corpus untouched, tiers
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
