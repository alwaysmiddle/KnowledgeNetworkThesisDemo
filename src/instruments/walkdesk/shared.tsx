// Shared scaffolding for the walk desk: the corpus node chip and the
// projected-route strip (the flat reading the bus's `route` will eventually
// receive — rendered so the desk proves the projection). All presentation,
// no state. The document-pane stand-in that lived here died at graduation:
// the Studio has the real DocumentPanel.

import { byId, domainOf } from '../../corpus/graph'
import { NodeChip as DsNodeChip, PaneScroller, type DomainCode } from '@/ds'
import type { RouteEntry } from './mockwalk'
import type { HoverBinding } from '../../studio/bus'

/** a corpus node as a small chip — the DS NodeChip primitive (#62), wired to
 *  the walk desk's hover bus. The wrapper owns the bus binding and the
 *  `data-node` hook; the DS primitive owns the presentation and the `lit`
 *  hover-correspondence ring. Resolving id → title/domain is app logic and
 *  stays here.
 *
 *  NB the DS primitive renders at --fs-body (13px); the old hand-rolled chip
 *  was 10.5px (--asbuilt-fs-label) to fit the narrow projected-route rail. That
 *  rail (FringeRail) is currently unmounted, so the size change is invisible —
 *  but if it returns, the chip will be chunkier and may want a compact variant.
 *  Reported to the design agent (the design-handoff/msg channel that carried it was
 *  retired in #75; the live channels are GitHub issues and receipts/<sha>.md in the
 *  design project — see design-handoff/PROTOCOL.md). */
export function NodeChip({ id, sync, dim, note }: { id: string; sync: HoverBinding; dim?: boolean; note?: string }) {
  const n = byId.get(id)!
  return (
    <span {...sync.bind(id)} data-node={id} style={{ display: 'inline-flex', maxWidth: '100%' }}>
      <DsNodeChip title={n.title} domain={domainOf(id) as DomainCode} dim={dim} lit={sync.lit(id)} note={note} />
    </span>
  )
}

/** the flat route the bus would read at this expansion state, running TOP-DOWN
 * beside the walk editor it projects (#21). It was a wrapping bottom strip while it
 * lived on the desk; parallel to the road it reads as what it is — the same walk
 * in the same direction, with the branching resolved away. That parallel is the
 * whole point: you can put a finger on a fork above and see which stops survived
 * below, without translating between a vertical drawing and a horizontal one.
 *
 * Group entries are placeholders (no corpus node — focus only ever lands on
 * leaves), and a repeated node id gets the walk's ↺ revisit mark. */
export function FringeRail({ entries, sync }: { entries: RouteEntry[]; sync: HoverBinding }) {
  const seen = new Set<string>()
  // the visible step number counts NODES only — a group is a marker, not a stop.
  // Derived rather than accumulated: a counter reassigned inside the children
  // callback is a render-time mutation, which the compiler rightly rejects.
  const stepAt = (i: number) => entries.slice(0, i + 1).filter((e) => e.kind !== 'group').length
  return (
    <div className="h-full min-h-0 flex flex-col" data-fringe-count={entries.length}>
      <div className="shrink-0 px-2 py-1.5 border-b border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 leading-tight">projected route</div>
        <div className="text-[9.5px] text-slate-400 leading-tight">
          the flat `route` the bus would read · {entries.length} entries
        </div>
      </div>
      <PaneScroller style={{ padding: '6px' }}>
        <ol className="flex flex-col gap-1">
          {entries.map((e, i) => {
            if (e.kind === 'group')
              return (
                <li key={`${i}-${e.key}`} className="flex items-center gap-1">
                  <span className="w-4 shrink-0" />
                  <span className="min-w-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-amber-400 bg-amber-50 text-[10.5px] text-amber-700">
                    <span className="truncate">⊞ {e.title}</span>
                    <span className="text-amber-500/70 shrink-0">{e.visits}</span>
                  </span>
                </li>
              )
            const revisit = seen.has(e.id)
            seen.add(e.id)
            return (
              <li key={`${i}-${e.id}`} className="flex items-center gap-1">
                <span className="w-4 shrink-0 text-right text-[9px] text-slate-300 tabular-nums">{stepAt(i)}</span>
                <NodeChip id={e.id} sync={sync} note={e.note} />
                {revisit && <span className="text-[10px] text-slate-400 shrink-0">↺</span>}
              </li>
            )
          })}
        </ol>
      </PaneScroller>
    </div>
  )
}

