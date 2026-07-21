// The walk-tiers spike gallery (KnowledgeNetworkDemo#11) — round 3. The
// standalone B tab is gone (its TierLines component lives on inside E); C is
// rebuilt as the AUTHORING page (palette + editable timeline — drag-and-drop
// AND block-editor gestures on one surface); E keeps the stack + lines and
// gains the Obsidian-style tier canvas. Reached only via `?spike=walk-tiers`;
// nothing here touches the bus.

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
    label: 'C · Author',
    hint: 'pick nodes from the palette, drop them on the timeline (amber caret = landing spot); select blocks to group into a stage, fork an aside, Tab-indent',
    render: (sync) => <AuthorMock sync={sync} />,
  },
  {
    id: 'E',
    label: 'E · Stack + lines + canvas',
    hint: 'one plane per line, one line per plane; the canvas is the OPEN tier as cards you arrange — arrows stay the walk’s order, stage cards drill',
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
        <h1 className="text-[14px] font-bold text-slate-800">Walk-tiers spike · round 3</h1>
        <span className="text-[11px] text-slate-400">
          E is the reading cockpit over “{PLAN.title}”; C authors a NEW plan from the same corpus · corpus untouched,
          tiers are pure overlay
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
