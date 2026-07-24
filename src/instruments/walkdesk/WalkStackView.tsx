// Walk·Stack as its own instrument (#20) — the isometric layer stack lifted out
// of the Walk·Desk. One rotated plane per open tier, so the drill path reads as
// DEPTH rather than as a row of columns. Picking a diamond drills; picking a
// visit dot folds back.
//
// It owns only its drill path. The road it reads comes from presented.ts and is
// not the desk's yet — see that file for why, and #14 for the wire.

import LayerStack from './LayerStack'
import { useDrill, PRESENTED_ROAD } from './presented'
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'

export default function WalkStackView({ bus }: { bus: Bus }) {
  const sync = useHover(bus)
  const { path, pick } = useDrill()

  return (
    <div data-walkstack className="h-full flex flex-col bg-slate-50/40">
      <div className="flex-1 min-h-0 overflow-auto">
        <LayerStack stops={PRESENTED_ROAD} path={path} pick={pick} sync={sync} />
      </div>
    </div>
  )
}
