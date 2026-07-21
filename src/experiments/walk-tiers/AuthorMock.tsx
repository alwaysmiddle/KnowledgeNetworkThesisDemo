// Candidate C, round 3 — the AUTHORING page. Verdict from round 2: C is not
// a viewer, it is where a plan gets MADE — "pick from a list of nodes, then
// draw the node map". The answer to drag-and-drop vs block editor is BOTH on
// ONE surface: the timeline is the block editor (rows are blocks — select,
// group, aside, delete, Tab-indent), and drag-and-drop is its placement
// gesture (drag a corpus node from the palette onto any gap; the amber caret
// shows where it will land; drop mid-stage-header to drop INSIDE the stage).
// Clicking a palette chip is the keyboard-flavoured twin: it inserts at the
// selection. Everything renders open — authoring has no collapsed state —
// and the strip below proves the draft projects to a route like any walk.

import { useState } from 'react'
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'

import { byId, domainIds, domainOf, DOMAIN_COLOR, topicsUnder } from '../../corpus/graph'
import { allKeysOf, parsePath, pathKey, useAuthorDraft } from './authordraft'
import type { AuthorState, Path } from './authordraft'
import { fringe } from './mockwalk'
import type { Aside, Stop } from './mockwalk'
import { FringeStrip } from './shared'
import type { Sync } from './sync'

const DT = 'text/plain'

/** where a drag over this row should insert: before, after, or (stages,
 * middle band) inside at the end — shared by dragover (caret) and drop */
function gapFor(e: ReactDragEvent, path: Path, stop: Stop): Path {
  const r = e.currentTarget.getBoundingClientRect()
  const y = (e.clientY - r.top) / r.height
  const i = path[path.length - 1]
  const parent = path.slice(0, -1)
  if (stop.kind === 'stage' && y > 0.3 && y < 0.7) return [...path, stop.steps.length]
  return y < 0.5 ? [...parent, i] : [...parent, i + 1]
}

function handleDrop(e: ReactDragEvent, target: Path, state: AuthorState) {
  e.preventDefault()
  e.stopPropagation()
  const data = e.dataTransfer.getData(DT)
  if (data.startsWith('pal:')) state.insertNode(data.slice(4), target)
  else if (data.startsWith('blk:')) state.moveBlock(parsePath(data.slice(4)), target)
  state.setCaret(null)
}

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
                className="text-[11px] font-bold text-amber-800 bg-transparent border-b border-dashed border-amber-300 focus:border-amber-500 outline-none w-44"
              />
              <span className="text-[10px] text-amber-500">{s.steps.length} steps — drop mid-row to drop inside</span>
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
    <div className="w-[280px] shrink-0 border-r border-slate-200 flex flex-col bg-white">
      <div className="shrink-0 px-2 py-1.5 border-b border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 mb-1">palette — every corpus topic; drag onto the timeline, or click to insert at the selection</div>
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
  const state = useAuthorDraft()

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
          <span className="text-[10px] font-bold text-slate-500">draft — “Untitled plan”, authored here; blocks: click selects · drag ⋮⋮ moves · Tab indents into the stage above</span>
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
          {state.stops.length === 0 && !state.caret ? (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center text-[11px] text-slate-400">
              an empty plan — drag a node here from the palette, or click one to add it
            </div>
          ) : (
            <AuthorLevel stops={state.stops} parent={[]} state={state} sync={sync} />
          )}
        </div>
        <FringeStrip entries={fringe(state.stops, allKeysOf(state.stops))} sync={sync} />
      </div>
    </div>
  )
}
