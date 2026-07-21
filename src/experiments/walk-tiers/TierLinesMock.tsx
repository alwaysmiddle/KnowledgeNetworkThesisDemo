// Candidate B tab — the tier lines alone, with the projected-route strip
// underneath. The drill-path IS an expansion state (the path's keys), so the
// route-as-projection contract from round 1 carries over unchanged.

import { fringe, PLAN } from './mockwalk'
import { FringeStrip } from './shared'
import type { Sync } from './sync'
import { TierLines } from './TierLines'
import { useTierPath } from './tierpath'

export default function TierLinesMock({ sync }: { sync: Sync }) {
  const state = useTierPath()
  return (
    <div className="h-full flex flex-col" data-cand="B">
      <TierLines state={state} sync={sync} />
      <FringeStrip entries={fringe(PLAN.stops, new Set(state.path))} sync={sync} />
    </div>
  )
}
