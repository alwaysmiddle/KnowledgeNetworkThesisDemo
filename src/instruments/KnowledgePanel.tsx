// Knowledge instrument — the current node's document. Reading happens here;
// the other instruments are for moving. Two outgoing lists close the
// navigation loop: Contained (down the tree — a SELECT, same as a tree-panel
// click) and Walks through here (walks-as-content, made visible instead of
// staying implicit history). The radial neighborhood diagram that used to sit
// above the lists is now its own Studio instrument (PlexPanel) — compose them
// side by side instead.
//
// TYPED RELATIONS ARE NOT HERE (2026-07-14). "Roads from here" used to
// duplicate, row for row, the relationship list in the Connections pane; two
// copies of one truth, side by side in the Cockpit preset. Relationships now
// have exactly ONE home — Connections — where the star canvas and the list are
// two readings of the same edges and hover binds them together. The document
// pane reads; it does not also index the graph.
//
// Walks only resolve for topics: a Walk's stops are always topic ids (see
// walks.ts) — nodes above the topic level (domains, modules) and below it
// (deep layers) show containment and the document, which is honest: that IS
// all they have.

import { byId, childrenOf, domainOf, DOMAIN_COLOR, pathTo, ROOT_ID } from '../corpus/graph'
import { DOC_BODY } from '../corpus/docs'
import { WALKS } from '../corpus/walks'
import { useHover } from '../studio/bus'
import type { Bus } from '../studio/bus'

export default function KnowledgePanel({ bus }: { bus: Bus }) {
  const currentId = bus.focus ?? ROOT_ID
  const onSelectChild = (id: string) => bus.setFocus(id, 'tree')
  const onActivateWalkAtStop = bus.activateWalk
  // the Contained rows ARE node ids, so they join the same hover channel as the
  // wheel and the map's territories: hover a child here, its cell lights up over
  // there. bind() carries the data-lit test hook with it.
  const hover = useHover(bus)

  const n = byId.get(currentId)!
  const ancestry = pathTo(currentId)
    .map((id) => byId.get(id)!.title)
    .join(' / ')
  const color = DOMAIN_COLOR[domainOf(currentId)] ?? '#475569'
  const kids = n.kind === 'container' ? childrenOf.get(currentId) ?? [] : []
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

      {n.kind === 'container' && (
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">Contained ({kids.length})</div>
          <div className="flex flex-col gap-1">
            {kids.map((k) => {
              const lit = hover.lit(k.id)
              return (
                <button
                  key={k.id}
                  {...hover.bind(k.id)}
                  onClick={() => onSelectChild(k.id)}
                  className={[
                    'text-left px-2 py-1 rounded border text-[11.5px] flex items-center gap-1.5',
                    lit ? 'border-slate-400 font-semibold bg-slate-100' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
                  ].join(' ')}
                >
                  <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: DOMAIN_COLOR[domainOf(k.id)] }} />
                  <span className="truncate" style={{ color: DOMAIN_COLOR[domainOf(k.id)] }}>
                    {k.title}
                  </span>
                  <span className="text-slate-400 ml-auto shrink-0">{k.kind}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">Walks through here ({throughWalks.length})</div>
        {throughWalks.length === 0 ? (
          <div className="text-[11px] text-slate-400">no authored walk stops here</div>
        ) : (
          <div className="flex flex-col gap-1">
            {throughWalks.map(({ walk, idx }) => (
              <button
                key={walk.id}
                onClick={() => onActivateWalkAtStop(walk.id, idx)}
                className="text-left px-2 py-1.5 rounded border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-[11.5px]"
              >
                <div className="font-semibold text-amber-800">{walk.title}</div>
                <div className="text-slate-500">
                  stop {idx + 1} of {walk.stops.length} — {walk.stops[idx].note}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
