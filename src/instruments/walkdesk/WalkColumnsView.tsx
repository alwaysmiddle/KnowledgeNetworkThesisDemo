// Walk·Columns as its own instrument (#20) — the tier columns lifted out of the
// Walk·Desk. It is a pure reading surface: one column per open tier, boxes
// joined by down-arrows in walk order, a dashed begat-edge from the stage box
// that opened the column to its right. Picking a stage drills; picking a visit
// folds back.
//
// It owns only its drill path. The road it reads comes from presented.ts and is
// not the desk's yet — see that file for why, and #14 for the wire.

import { useDrill, PRESENTED_ROAD } from './presented'
import WalkColumns from './WalkColumns'
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'

export default function WalkColumnsView({ bus }: { bus: Bus }) {
  const sync = useHover(bus)
  const { path, pick } = useDrill()

  return (
    <div data-walkcolumns className="h-full flex flex-col bg-slate-50/50">
      <div className="shrink-0 px-3 py-1.5 border-b border-slate-100">
        <span className="text-[10px] font-bold text-slate-500">
          columns — a RESOLVED road, one column per open tier · reading only
        </span>
      </div>
      <WalkColumns stops={PRESENTED_ROAD} path={path} pick={pick} sync={sync} />
    </div>
  )
}
