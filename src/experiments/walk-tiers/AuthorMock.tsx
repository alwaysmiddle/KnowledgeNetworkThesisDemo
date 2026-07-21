// Candidate C, round 6 — the metaphor question reopens (#11): nested BOXES
// won round 4, but the round-5 feedback asks whether tiers shouldn't be
// nested NODES on a flow chart instead. So C is a side-by-side again — the
// round-5 nested-box editor on the left, the new nested-node flow on the
// right — and both render ONE shared AuthorState: edit in either, the other
// follows instantly. The flow side also trials the contextual controls
// (group/aside/remove floating beside the clicked node) that the feedback
// asked for; the box side keeps the header toolbar so the two control
// placements can be compared directly.
//
// The palette is a STAND-IN for the map instrument: the whole feed contract
// is `pal:<nodeId>` on text/plain (or a click calling insertNode) — any
// surface that can start such a drag can be the palette, so swapping in the
// atlas map at graduation is a dragstart handler, not a redesign.
// The draft starts SEEDED (three tiers) so the editor isn't blank at first
// paint; every id is a real corpus node — the tiers stay pure overlay.

import { useState } from 'react'

import { byId, domainIds, domainOf, DOMAIN_COLOR, topicsUnder } from '../../corpus/graph'
import AuthorFlow from './AuthorFlow'
import AuthorNest from './AuthorNest'
import { allKeysOf, useAuthorDraft } from './authordraft'
import type { AuthorState } from './authordraft'
import { DT } from './authordnd'
import { fringe } from './mockwalk'
import type { Stop } from './mockwalk'
import { FringeStrip } from './shared'
import type { Sync } from './sync'

/** the draft starts with a small three-tier plan so the editor has
 * something to show — authoring then continues from here */
const SEED: Stop[] = [
  { kind: 'visit', node: 'stk-dns-naming' },
  {
    kind: 'stage',
    key: 'seed-net',
    title: 'Reach the machine',
    steps: [
      { kind: 'visit', node: 'stk-ip-routing' },
      { kind: 'visit', node: 'stk-tcp-udp' },
      {
        kind: 'stage',
        key: 'seed-sec',
        title: 'Secure the channel',
        steps: [
          { kind: 'visit', node: 'cry-public-key-cryptography' },
          { kind: 'visit', node: 'cry-tls-certificates' },
        ],
      },
    ],
  },
  { kind: 'visit', node: 'web-http-rest' },
]

function Palette({ state, sync }: { state: AuthorState; sync: Sync }) {
  const [q, setQ] = useState('')
  const match = (id: string) => byId.get(id)!.title.toLowerCase().includes(q.toLowerCase())
  return (
    <div className="w-[230px] shrink-0 border-r border-slate-200 flex flex-col bg-white">
      <div className="shrink-0 px-2 py-1.5 border-b border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 mb-1">
          palette — drag into the editor, or click to insert · stand-in for the map instrument
        </div>
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

export default function AuthorMock({ sync }: { sync: Sync }) {
  const state = useAuthorDraft(SEED)

  return (
    <div className="h-full flex" data-cand="C">
      <Palette state={state} sync={sync} />

      <div className="flex-1 min-w-0 flex flex-col bg-slate-50/50">
        <div className="flex-1 min-h-0 flex">
          <div className="w-1/2 min-w-0 flex flex-col border-r border-slate-200">
            <div className="shrink-0 px-3 py-1.5 flex items-center gap-1.5 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500">nested boxes — toolbar controls</span>
              <span className="flex-1" />
              <button
                data-group
                disabled={!state.canGroup}
                onClick={state.groupSelection}
                className="text-[10px] px-1.5 py-0.5 rounded border border-amber-300 text-amber-700 bg-amber-50 disabled:opacity-30 hover:bg-amber-100"
              >
                ⊞ group into stage
              </button>
              <button
                data-aside
                disabled={!state.canAside}
                onClick={state.asideSelection}
                className="text-[10px] px-1.5 py-0.5 rounded border border-violet-300 text-violet-600 bg-violet-50 disabled:opacity-30 hover:bg-violet-100"
              >
                ≀ make aside
              </button>
              <button
                data-del
                disabled={!state.canDelete}
                onClick={state.deleteSelection}
                className="text-[10px] px-1.5 py-0.5 rounded border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-100"
              >
                ✕ remove
              </button>
            </div>
            <AuthorNest state={state} sync={sync} />
          </div>

          <div className="w-1/2 min-w-0 flex flex-col">
            <div className="shrink-0 px-3 py-1.5 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500">
                nested nodes — SAME draft as a flow chart; click a node and the controls appear beside it
              </span>
            </div>
            <AuthorFlow state={state} sync={sync} />
          </div>
        </div>

        <FringeStrip entries={fringe(state.stops, allKeysOf(state.stops))} sync={sync} />
      </div>
    </div>
  )
}
