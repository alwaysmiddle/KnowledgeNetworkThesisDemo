// Shared scaffolding for the candidate mocks: the corpus node chip, the
// projected-route strip (the thing the bus's `route` would read — rendered so
// every fringe-centric candidate proves the projection), and the document
// pane stand-in for KnowledgePanel. All presentation, no state.

import { byId, domainOf, DOMAIN_COLOR, pathTo } from '../../corpus/graph'
import { DOC_BODY } from '../../corpus/docs'
import type { RouteEntry } from './mockwalk'
import type { Sync } from './sync'

/** a corpus node as a small chip — dot in its domain colour, title, hover-lit */
export function NodeChip({ id, sync, dim, note }: { id: string; sync: Sync; dim?: boolean; note?: string }) {
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
export function FringeStrip({ entries, sync }: { entries: RouteEntry[]; sync: Sync }) {
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

/** stand-in for the KnowledgePanel instrument (the node viewer). The real
 * candidates will NOT grow hover tooltips — they publish on the hover channel
 * and the doc pane follows, which is why this pane exists in the gallery. */
export function DocPaneStandIn({ sync }: { sync: Sync }) {
  const id = sync.hovered
  const n = id ? byId.get(id) : undefined
  return (
    <div className="w-[280px] shrink-0 border-l border-slate-200 bg-white flex flex-col" data-doc={id ?? ''}>
      <div className="px-3 pt-2 pb-1.5 border-b border-slate-100 text-[9.5px] uppercase tracking-wide text-slate-400 font-semibold">
        document — stand-in for the KnowledgePanel instrument
      </div>
      {!n || !id ? (
        <div className="px-3 py-3 text-[11px] text-slate-400">
          hover any stop in the candidate — the node viewer follows the shared hover channel, so no candidate needs its own
          preview tooltip
        </div>
      ) : (
        <div className="min-h-0 overflow-auto">
          <div className="px-3 pt-2.5 pb-2 border-b border-slate-100">
            <div className="text-[13px] font-bold" style={{ color: DOMAIN_COLOR[domainOf(id)] }}>
              {n.title}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {pathTo(id)
                .map((p) => byId.get(p)!.title)
                .join(' / ')}
            </div>
          </div>
          <div className="px-3 py-2.5 text-[11px] leading-relaxed text-slate-600">{DOC_BODY[id]}</div>
        </div>
      )}
    </div>
  )
}
