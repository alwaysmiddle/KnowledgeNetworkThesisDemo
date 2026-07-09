// Knowledge instrument — the current node's document. Reading happens here;
// the other instruments are for moving. Three outgoing lists close the
// navigation loop: Contained (down the tree — a SELECT, same as a tree-panel
// click), Roads from here (typed cross-links — a JUMP), and Walks through
// here (walks-as-content, made visible instead of staying implicit history).
// Roads and Walks only resolve for leaves: edges are always leaf-to-leaf in
// graph.ts, and a Walk's stops are always leaf ids (see walks.ts) — a
// container currently shows neither section's contents, which is a real
// limitation worth reporting, not silently working around.

import { byId, childrenOf, domainOf, DOMAIN_COLOR, EDGE_COLOR, EDGE_LABEL, pathTo } from '../graph'
import { edgesTouching } from '../flat'
import { DOC_BODY } from './docs'
import { WALKS } from './walks'
import PlexPanel from './PlexPanel'
import { EDGE_TYPES } from './state'

export interface KnowledgePanelProps {
  currentId: string
  onSelectChild: (id: string) => void
  onJump: (id: string) => void
  onActivateWalkAtStop: (walkId: string, stopIndex: number) => void
}

export default function KnowledgePanel({ currentId, onSelectChild, onJump, onActivateWalkAtStop }: KnowledgePanelProps) {
  const n = byId.get(currentId)!
  const ancestry = pathTo(currentId)
    .map((id) => byId.get(id)!.title)
    .join(' / ')
  const color = DOMAIN_COLOR[domainOf(currentId)] ?? '#475569'
  const kids = n.kind === 'container' ? childrenOf.get(currentId) ?? [] : []
  const roads = n.kind === 'leaf' ? edgesTouching(currentId) : []
  const outgoing = roads.filter((e) => e.source === currentId)
  const incoming = roads.filter((e) => e.target === currentId)
  const throughWalks = WALKS.flatMap((w) => {
    const idx = w.stops.findIndex((s) => s.id === currentId)
    return idx >= 0 ? [{ walk: w, idx }] : []
  })

  return (
    <div className="h-full overflow-auto bg-white" aria-label="knowledge-panel">
      <div className="px-4 pt-3 pb-2 border-b border-slate-100">
        <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">{n.kind}</div>
        <div className="text-[15px] font-bold" style={{ color }}>
          {n.title}
        </div>
        <div className="text-[10.5px] text-slate-400 mt-0.5">{ancestry}</div>
      </div>

      <div className="px-4 py-3 text-[12px] leading-relaxed text-slate-700 border-b border-slate-100">{DOC_BODY[currentId]}</div>

      <div className="px-4 pt-3 pb-1 border-b border-slate-100">
        <div className="text-[10.5px] font-bold text-slate-500 mb-1">Neighborhood</div>
        <PlexPanel currentId={currentId} onSelect={onSelectChild} onJump={onJump} />
      </div>

      {n.kind === 'container' && (
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">Contained ({kids.length})</div>
          <div className="flex flex-col gap-1">
            {kids.map((k) => (
              <button
                key={k.id}
                onClick={() => onSelectChild(k.id)}
                className="text-left px-2 py-1 rounded border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-[11.5px] flex items-center gap-1.5"
              >
                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: DOMAIN_COLOR[domainOf(k.id)] }} />
                <span className="truncate" style={{ color: DOMAIN_COLOR[domainOf(k.id)] }}>
                  {k.title}
                </span>
                <span className="text-slate-400 ml-auto shrink-0">{k.kind}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {n.kind === 'leaf' && (
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">Roads from here ({roads.length})</div>
          {roads.length === 0 ? (
            <div className="text-[11px] text-slate-400">no typed links touch this node</div>
          ) : (
            <div className="flex flex-col gap-2.5" aria-label="roads-from-here">
              {EDGE_TYPES.map((type) => {
                const outs = outgoing.filter((e) => e.type === type)
                const ins = incoming.filter((e) => e.type === type)
                if (outs.length + ins.length === 0) return null
                return (
                  <div key={type}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: EDGE_COLOR[type] }} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{EDGE_LABEL[type]}</span>
                      <span className="text-[10px] text-slate-400">({outs.length + ins.length})</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {outs.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => onJump(e.target)}
                          className="text-left px-2 py-1 rounded border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-[11.5px] flex items-center gap-1.5"
                        >
                          <span className="text-slate-400 shrink-0">→</span>
                          <span className="truncate" style={{ color: DOMAIN_COLOR[domainOf(e.target)] }}>
                            {byId.get(e.target)!.title}
                          </span>
                        </button>
                      ))}
                      {ins.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => onJump(e.source)}
                          className="text-left px-2 py-1 rounded border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-[11.5px] flex items-center gap-1.5"
                        >
                          <span className="text-slate-400 shrink-0">←</span>
                          <span className="truncate" style={{ color: DOMAIN_COLOR[domainOf(e.source)] }}>
                            {byId.get(e.source)!.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
