// The palette (extracted from the round-6 AuthorMock) — the corpus, filtered,
// as a source of stops. The whole feed contract is `pal:<nodeId>` on text/plain
// (or a click calling insertNode), so ANY surface that can start such a drag can
// be a palette. That was written when this stood in for the map; since #21 the
// real map is a pane away in the same preset, and giving it a dragstart handler
// is the remaining step — still a handler, not a redesign.
//
// PaletteView wraps this for the Studio; the component itself stays presentation
// plus two callbacks, so a second palette over a different corpus is free.

import { useState } from 'react'

import { byId, domainIds, domainOf, DOMAIN_COLOR, topicsUnder } from '../../corpus/graph'
import type { AuthorState } from './authordraft'
import { DT } from './authordnd'
import type { HoverBinding } from '../../studio/bus'

export default function Palette({ state, sync }: { state: AuthorState; sync: HoverBinding }) {
  const [q, setQ] = useState('')
  const match = (id: string) => byId.get(id)!.title.toLowerCase().includes(q.toLowerCase())
  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col bg-white">
      <div className="shrink-0 px-2 py-1.5 border-b border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 mb-1">drag into the road, or click to insert</div>
        <input
          data-pal-search
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="filter…"
          className="w-full text-[11px] px-1.5 py-0.5 rounded border border-slate-200 outline-none focus:border-sky-400"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-auto py-1">
        {domainIds.map((d) => {
          const topics = topicsUnder(d).filter(match)
          if (!topics.length) return null
          return (
            <div key={d} className="px-2 pb-1.5">
              <div className="text-[9.5px] uppercase tracking-wide font-semibold py-0.5" style={{ color: DOMAIN_COLOR[d] }}>
                {byId.get(d)!.title}
              </div>
              <div className="flex flex-wrap gap-1">
                {topics.map((id) => (
                  <button
                    key={id}
                    {...sync.bind(id)}
                    data-pal={id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData(DT, 'pal:' + id)}
                    onClick={() => state.insertNode(id)}
                    className={[
                      'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10.5px] whitespace-nowrap cursor-grab',
                      sync.lit(id) ? 'ring-2 ring-sky-300 border-slate-200 bg-white' : 'border-slate-200 bg-slate-50 hover:bg-white',
                    ].join(' ')}
                  >
                    <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: DOMAIN_COLOR[domainOf(id)] }} />
                    {byId.get(id)!.title}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
