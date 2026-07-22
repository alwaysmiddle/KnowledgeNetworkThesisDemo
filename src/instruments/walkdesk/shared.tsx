// Shared scaffolding for the walk desk: the corpus node chip and the
// projected-route strip (the flat reading the bus's `route` will eventually
// receive — rendered so the desk proves the projection). All presentation,
// no state. The document-pane stand-in that lived here died at graduation:
// the Studio has the real KnowledgePanel.

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import type { RouteEntry } from './mockwalk'
import type { HoverBinding } from '../../studio/bus'

/** a corpus node as a small chip — dot in its domain colour, title, hover-lit */
export function NodeChip({ id, sync, dim, note }: { id: string; sync: HoverBinding; dim?: boolean; note?: string }) {
  const n = byId.get(id)!
  return (
    <span
      {...sync.bind(id)}
      data-node={id}
      title={note ?? n.title}
      className={[
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10.5px] whitespace-nowrap',
        dim ? 'border-slate-200 bg-white/60 text-slate-400' : 'border-slate-200 bg-white text-slate-600',
        sync.lit(id) ? 'ring-2 ring-sky-300' : '',
      ].join(' ')}
    >
      <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: DOMAIN_COLOR[domainOf(id)] }} />
      {n.title}
    </span>
  )
}

/** the flat route the bus would read at this expansion state. Stage entries
 * are placeholders (no corpus node — focus only ever lands on leaves), and a
 * repeated node id gets the walk's ↺ revisit mark. */
export function FringeStrip({ entries, sync }: { entries: RouteEntry[]; sync: HoverBinding }) {
  const seen = new Set<string>()
  return (
    <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-3 py-1.5" data-fringe-count={entries.length}>
      <div className="text-[9.5px] font-semibold text-slate-400 mb-1">
        projected route — the flat `route` the bus would read at this expansion ({entries.length} entries)
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {entries.map((e, i) => {
          if (e.kind === 'stage')
            return (
              <span
                key={`${i}-${e.key}`}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-amber-400 bg-amber-50 text-[10.5px] text-amber-700 whitespace-nowrap"
              >
                ⊞ {e.title}
                <span className="text-amber-500/70">{e.visits}</span>
              </span>
            )
          const revisit = seen.has(e.id)
          seen.add(e.id)
          return (
            <span key={`${i}-${e.id}`} className="inline-flex items-center gap-0.5">
              <NodeChip id={e.id} sync={sync} note={e.note} />
              {revisit && <span className="text-[10px] text-slate-400">↺</span>}
            </span>
          )
        })}
      </div>
    </div>
  )
}

