// Knowledge instrument — the current node's document. Reading happens here;
// the other instruments are for moving. The one navigation aid left is "Walks
// through here" — walks-as-content, made visible instead of staying implicit
// history. The radial neighborhood diagram that used to sit above the lists is
// now its own Studio instrument (PlexPanel) — compose them side by side instead.
//
// NAVIGATION LISTS ARE NOT HERE (2026-07-14). "Roads from here" (typed
// relations) left first, then "Contained" (the child list) followed it; both
// duplicated the Connections pane row for row. Relationships AND containment now
// have exactly ONE home — Connections — where a graph reading (star / wheel) and
// a list reading sit together and hover binds them. The document pane reads; it
// does not also index the graph or the tree.
//
// Walks only resolve for topics: a Walk's stops are always topic ids (see
// walks.ts) — nodes above the topic level (domains, modules) and below it
// (deep layers) just show the document, which is honest: that IS all they have.

import { WalkCard } from '@/ds'

import { byId, domainOf, DOMAIN_COLOR, pathTo, ROOT_ID } from '../corpus/graph'
import { DOC_BODY } from '../corpus/docs'
import { WALKS } from '../corpus/walks'
import type { Bus } from '../studio/bus'

export default function KnowledgePanel({ bus }: { bus: Bus }) {
  const currentId = bus.focus ?? ROOT_ID
  const onActivateWalkAtStop = bus.activateWalk

  const n = byId.get(currentId)!
  const ancestry = pathTo(currentId)
    .map((id) => byId.get(id)!.title)
    .join(' / ')
  const color = DOMAIN_COLOR[domainOf(currentId)] ?? '#475569'
  const throughWalks = WALKS.flatMap((w) => {
    const idx = w.stops.findIndex((s) => s.id === currentId)
    return idx >= 0 ? [{ walk: w, idx }] : []
  })

  return (
    <div className="h-full overflow-auto bg-white" aria-label="knowledge-panel">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100">
        <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{n.topic ? 'topic' : n.kind}</div>
        <div className="text-[15px] font-bold" style={{ color }}>
          {n.title}
        </div>
        <div className="text-[10.5px] text-slate-400 mt-0.5">{ancestry}</div>
      </div>

      <div className="px-4 py-3 text-[12px] leading-relaxed text-slate-700 border-b border-slate-100">{DOC_BODY[currentId]}</div>

      <div className="px-4 py-3">
        <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">Walks through here ({throughWalks.length})</div>
        {throughWalks.length === 0 ? (
          <div className="text-[11px] text-slate-400">no authored walk stops here</div>
        ) : (
          <div className="flex flex-col gap-1">
            {throughWalks.map(({ walk, idx }) => (
              <WalkCard
                key={walk.id}
                title={walk.title}
                meta={`stop ${idx + 1} of ${walk.stops.length} — ${walk.stops[idx].note}`}
                onClick={() => onActivateWalkAtStop(walk.id, idx)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
