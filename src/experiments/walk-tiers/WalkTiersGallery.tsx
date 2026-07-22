// The walk-tiers spike (KnowledgeNetworkDemo#11) — round 7: no more
// candidate tabs. The verdict rounds are over; this is ONE combined surface
// — palette feeds, railroad authors (forks, optionals), columns + fringe
// strip present the resolved road. Reached only via `?spike=walk-tiers`;
// nothing touches the bus.

import DeskMock from './DeskMock'
import { DocPaneStandIn } from './shared'
import { useSync } from './sync'

export default function WalkTiersGallery() {
  const sync = useSync()

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <header className="shrink-0 px-4 py-2 bg-white border-b border-slate-200 flex items-baseline gap-3">
        <h1 className="text-[14px] font-bold text-slate-800">Walk-tiers spike · round 7</h1>
        <span className="text-[11px] text-slate-400">
          one desk — the railroad can fork and rejoin, yet the columns and the strip always read ONE resolved linear
          walk · corpus untouched, tiers and branches are pure overlay
        </span>
      </header>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0">
          <DeskMock sync={sync} />
        </div>
        <DocPaneStandIn sync={sync} />
      </div>
    </div>
  )
}
