// Candidate C, round 4 — the AUTHORING page as THREE parallel views of ONE
// draft, side by side for comparison: (1) the timeline block editor from
// round 3 (select, group, aside, delete, Tab-indent; drag with the amber
// caret), (2) the tier lines turned VERTICAL — columns of boxes joined by
// one-way down arrows, where clicking a stage opens the next column and an
// edge is drawn from the stage box to the column it begat, and (3) the same
// boxed flow but stages EXPAND IN PLACE — nested boxes you drag nodes into.
// All three render the same AuthorState; an edit in any drop surface shows
// up in all of them, and the strip below is the one projected route.
// The draft starts SEEDED (three tiers) so the comparison is visible at
// first paint; every id is a real corpus node — the tiers stay pure overlay.

import { useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, DragEvent as ReactDragEvent } from 'react'

import { byId, domainIds, domainOf, DOMAIN_COLOR, topicsUnder } from '../../corpus/graph'
import AuthorColumns from './AuthorColumns'
import AuthorNest from './AuthorNest'
import { allKeysOf, pathKey, useAuthorDraft } from './authordraft'
import type { AuthorState, Path } from './authordraft'
import { DT, gapFor, handleDrop } from './authordnd'
import { fringe } from './mockwalk'
import type { Aside, Stop } from './mockwalk'
import { FringeStrip } from './shared'
import type { Sync } from './sync'

/** the draft starts with a small three-tier plan so all three views have
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

function Caret() {
  return <div data-caret className="h-0.5 rounded bg-amber-500 my-0.5 ml-1 mr-6" />
}

function AsideLane({ aside }: { aside: Aside }) {
  return (
    <div data-aside-lane className="ml-6 my-1 pl-2.5 border-l-2 border-dashed border-violet-300">
      <div className="text-[9.5px] font-semibold text-violet-500 pt-0.5">≀ {aside.title}</div>
      {aside.steps.map((st, j) => (
        <div key={`${j}-${st.node}`} className="flex items-center gap-1.5 py-0.5 text-[10.5px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: DOMAIN_COLOR[domainOf(st.node)] }} />
          {byId.get(st.node)!.title}
        </div>
      ))}
    </div>
  )
}

function AuthorLevel({ stops, parent, state, sync }: { stops: Stop[]; parent: Path; state: AuthorState; sync: Sync }) {
  const caretKey = state.caret ? pathKey(state.caret) : null
  const rowProps = (p: Path, s: Stop) => ({
    draggable: true,
    'data-blk': pathKey(p),
    onDragStart: (e: ReactDragEvent) => {
      e.stopPropagation()
      e.dataTransfer.setData(DT, 'blk:' + pathKey(p))
    },
    onDragEnd: () => state.setCaret(null),
    onDragOver: (e: ReactDragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      state.setCaret(gapFor(e, p, s))
    },
    onDrop: (e: ReactDragEvent) => handleDrop(e, gapFor(e, p, s), state),
    onClick: (e: ReactMouseEvent) => {
      e.stopPropagation()
      state.toggleSelect(p)
    },
  })

  return (
    <div className="relative pl-4">
      <div className="absolute left-[5px] top-2 bottom-2 w-[3px] rounded bg-amber-400/60" />
      {stops.map((s, i) => {
        const p = [...parent, i]
        const key = pathKey(p)
        const isSelected = state.selected.has(key)
        const gapBefore = caretKey === key
        if (s.kind === 'visit') {
          const color = DOMAIN_COLOR[domainOf(s.node)]
          return (
            <div key={key}>
              {gapBefore && <Caret />}
              <div
                {...rowProps(p, s)}
                {...sync.bind(s.node)}
                data-node={s.node}
                className={[
                  'relative flex items-center gap-2 py-1 pr-2 rounded cursor-grab',
                  isSelected ? 'bg-indigo-50 ring-1 ring-indigo-400' : sync.lit(s.node) ? 'bg-sky-50' : 'hover:bg-slate-100',
                ].join(' ')}
              >
                <span className="w-3 h-3 rounded-full border-2 bg-white shrink-0 -ml-[13px] z-10" style={{ borderColor: color }} />
                <span className="text-[11px] font-semibold whitespace-nowrap" style={{ color }}>
                  {byId.get(s.node)!.title}
                </span>
                <span className="ml-auto text-[10px] text-slate-300 select-none">⋮⋮</span>
              </div>
            </div>
          )
        }
        return (
          <div key={key}>
            {gapBefore && <Caret />}
            <div
              {...rowProps(p, s)}
              className={[
                'relative flex items-center gap-2 py-1 pr-2 rounded cursor-grab',
                isSelected ? 'bg-indigo-50 ring-1 ring-indigo-400' : 'hover:bg-amber-50',
              ].join(' ')}
            >
              <span className="w-3 h-3 border-2 border-amber-500 bg-amber-200 rotate-45 shrink-0 -ml-[13px] z-10" />
              <input
                data-retitle={s.key}
                value={s.title}
                onChange={(e) => state.retitle(s.key, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] font-bold text-amber-800 bg-transparent border-b border-dashed border-amber-300 focus:border-amber-500 outline-none w-40"
              />
              <span className="text-[10px] text-amber-500">{s.steps.length} steps</span>
              <span className="ml-auto text-[10px] text-slate-300 select-none">⋮⋮</span>
            </div>
            <div className="ml-5 border-l-2 border-dotted border-amber-300/60 rounded-bl-lg pb-1">
              <AuthorLevel stops={s.steps} parent={p} state={state} sync={sync} />
              {(s.asides ?? []).map((a, k) => (
                <AsideLane key={k} aside={a} />
              ))}
            </div>
          </div>
        )
      })}
      {caretKey === pathKey([...parent, stops.length]) && <Caret />}
    </div>
  )
}

function Palette({ state, sync }: { state: AuthorState; sync: Sync }) {
  const [q, setQ] = useState('')
  const match = (id: string) => byId.get(id)!.title.toLowerCase().includes(q.toLowerCase())
  return (
    <div className="w-[230px] shrink-0 border-r border-slate-200 flex flex-col bg-white">
      <div className="shrink-0 px-2 py-1.5 border-b border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 mb-1">palette — drag onto any view, or click to insert at the selection</div>
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
                    onDragEnd={() => state.setCaret(null)}
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

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return
    if (e.key === 'Tab') {
      e.preventDefault()
      state.indentSelection()
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      state.deleteSelection()
    }
  }

  return (
    <div className="h-full flex" data-cand="C">
      <Palette state={state} sync={sync} />

      <div className="flex-1 min-w-0 flex flex-col bg-slate-50/50">
        <div className="shrink-0 px-3 py-1.5 flex items-center gap-1.5 border-b border-slate-100">
          <span className="text-[10px] font-bold text-slate-500">one draft, three views — edit anywhere, all follow</span>
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

        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 flex flex-col border-r border-slate-200">
            <div className="shrink-0 px-2 py-1 text-[9.5px] font-bold text-slate-400 border-b border-slate-100">
              1 · timeline blocks — click selects, drag ⋮⋮ moves, Tab indents; drop lands at the amber caret
            </div>
            <div
              data-author-root
              tabIndex={0}
              onKeyDown={onKeyDown}
              onDragOver={(e) => {
                e.preventDefault()
                state.setCaret([state.stops.length])
              }}
              onDrop={(e) => handleDrop(e, [state.stops.length], state)}
              className="flex-1 min-h-0 overflow-auto p-3 outline-none"
            >
              <AuthorLevel stops={state.stops} parent={[]} state={state} sync={sync} />
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col border-r border-slate-200">
            <div className="shrink-0 px-2 py-1 text-[9.5px] font-bold text-slate-400 border-b border-slate-100">
              2 · vertical columns — arrows run one way down; click a ⊞ box and the edge shows the column it opened
            </div>
            <AuthorColumns stops={state.stops} sync={sync} />
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="shrink-0 px-2 py-1 text-[9.5px] font-bold text-slate-400 border-b border-slate-100">
              3 · nested boxes — stages expand in place; drop a node INTO an open box to add it there
            </div>
            <AuthorNest state={state} sync={sync} />
          </div>
        </div>

        <FringeStrip entries={fringe(state.stops, allKeysOf(state.stops))} sync={sync} />
      </div>
    </div>
  )
}
