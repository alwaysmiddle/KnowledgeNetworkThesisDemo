// The nested-box editor (round 5) — after the round-4 verdicts this is THE
// authoring surface: the timeline and the columns are gone from C, and every
// block gesture they owned lives here now. Tiers are containment: a stage is
// a box, open by default (a `collapsed` set, inverted, so a freshly grouped
// stage is born open and ready to fill). An open box is one COARSE drop
// target — drop anywhere inside and the node appends to that stage — while
// its header row is the stage-as-block: it drags, click-selects, retitles
// inline, and takes before/after drops like any other box. Visit boxes and
// collapsed boxes take banded drops (top = before, bottom = after, a closed
// stage's middle = inside), with an amber bar marking the landing gap.
// Selection feeds the shared toolbar (group / aside / remove); Delete and
// Tab still work from the keyboard. Asides render as a violet lane inside
// their stage's box — present, visibly not on the arrowed order.

import { useState } from 'react'
import type { DragEvent as ReactDragEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import type { AuthorState, Path } from './authordraft'
import { pathKey } from './authordraft'
import { bandFor, DT, gapFor, handleDrop } from './authordnd'
import type { Band } from './authordnd'
import { visitCount } from './mockwalk'
import type { Aside, Stop } from './mockwalk'
import type { Sync } from './sync'

type Mark = { key: string; band: Band } | null

function MarkBar() {
  return <div data-drop-mark className="h-0.5 rounded bg-amber-500 my-0.5" />
}

function DownArrow() {
  return <div className="text-amber-500/80 text-[11px] leading-none text-center select-none">↓</div>
}

function AsideLane({ aside, sync }: { aside: Aside; sync: Sync }) {
  return (
    <div data-aside-lane className="mt-1 pl-2.5 border-l-2 border-dashed border-violet-300">
      <div className="text-[9.5px] font-semibold text-violet-500 pt-0.5">≀ {aside.title}</div>
      {aside.steps.map((st, j) => (
        <div key={`${j}-${st.node}`} {...sync.bind(st.node)} data-node={st.node} className="flex items-center gap-1.5 py-0.5 text-[10.5px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: DOMAIN_COLOR[domainOf(st.node)] }} />
          {byId.get(st.node)!.title}
        </div>
      ))}
    </div>
  )
}

interface Ctx {
  state: AuthorState
  sync: Sync
  collapsed: ReadonlySet<string>
  toggle(key: string): void
  hoverKey: string | null
  setHoverKey(k: string | null): void
  mark: Mark
  setMark(m: Mark): void
}

function NestLevel({ stops, parent, ctx }: { stops: Stop[]; parent: Path; ctx: Ctx }) {
  const { state, sync, collapsed, toggle, hoverKey, setHoverKey, mark, setMark } = ctx

  /** the block gestures every box row shares — visit, collapsed stage, or an
   * open stage's header */
  const blockProps = (p: Path, s: Stop) => {
    const key = pathKey(p)
    return {
      draggable: true,
      'data-blk': key,
      onDragStart: (e: ReactDragEvent) => {
        e.stopPropagation()
        e.dataTransfer.setData(DT, 'blk:' + key)
      },
      onDragEnd: () => setMark(null),
      onDragOver: (e: ReactDragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setMark({ key, band: bandFor(e, s) })
      },
      onDrop: (e: ReactDragEvent) => {
        setMark(null)
        setHoverKey(null)
        handleDrop(e, gapFor(e, p, s), state)
      },
      onClick: (e: ReactMouseEvent) => {
        e.stopPropagation()
        state.toggleSelect(p)
      },
    }
  }

  return (
    <div className="flex flex-col">
      {stops.map((s, i) => {
        const p = [...parent, i]
        const key = pathKey(p)
        const isSelected = state.selected.has(key)
        const m = mark?.key === key ? mark : null
        if (s.kind === 'visit') {
          const color = DOMAIN_COLOR[domainOf(s.node)]
          return (
            <div key={`${i}-${s.node}`} className="flex flex-col">
              {i > 0 && <DownArrow />}
              {m?.band === 'before' && <MarkBar />}
              <div
                {...blockProps(p, s)}
                {...sync.bind(s.node)}
                data-nbox
                data-node={s.node}
                className={[
                  'rounded-lg border-2 bg-white px-2 py-1.5 text-[10.5px] font-semibold cursor-grab flex items-center gap-1.5',
                  isSelected ? 'ring-2 ring-indigo-400 bg-indigo-50' : sync.lit(s.node) ? 'ring-2 ring-sky-300' : '',
                ].join(' ')}
                style={{ borderColor: color, color }}
              >
                {byId.get(s.node)!.title}
                <span className="ml-auto text-[10px] text-slate-300 select-none">⋮⋮</span>
              </div>
              {m?.band === 'after' && <MarkBar />}
            </div>
          )
        }
        const isOpen = !collapsed.has(s.key)
        return (
          <div key={s.key} className="flex flex-col">
            {i > 0 && <DownArrow />}
            {m?.band === 'before' && <MarkBar />}
            {isOpen ? (
              <div
                data-nbox
                data-ndrop={s.key}
                onDragOver={(e: ReactDragEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setHoverKey(s.key)
                }}
                onDragLeave={() => setHoverKey(null)}
                onDrop={(e: ReactDragEvent) => {
                  setHoverKey(null)
                  setMark(null)
                  handleDrop(e, [...p, s.steps.length], state)
                }}
                className={[
                  'rounded-lg border-2 border-amber-400 bg-amber-50/60 p-1.5',
                  hoverKey === s.key ? 'ring-2 ring-amber-400 bg-amber-100/80' : '',
                ].join(' ')}
              >
                <div
                  {...blockProps(p, s)}
                  className={[
                    'flex items-center gap-1.5 pb-1 cursor-grab rounded px-0.5',
                    isSelected ? 'ring-2 ring-indigo-400 bg-indigo-50' : '',
                  ].join(' ')}
                >
                  <button
                    data-nest-toggle={s.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(s.key)
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900"
                  >
                    ⊟
                  </button>
                  <input
                    data-retitle={s.key}
                    value={s.title}
                    onChange={(e) => state.retitle(s.key, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10.5px] font-bold text-amber-800 bg-transparent border-b border-dashed border-amber-300 focus:border-amber-500 outline-none flex-1 min-w-0"
                  />
                  <span className="text-[9px] text-amber-500 whitespace-nowrap">drop into the box to add</span>
                  <span className="text-[10px] text-slate-300 select-none">⋮⋮</span>
                </div>
                <div className="pl-2 border-l-2 border-dotted border-amber-300/70">
                  <NestLevel stops={s.steps} parent={p} ctx={ctx} />
                  {(s.asides ?? []).map((a, k) => (
                    <AsideLane key={k} aside={a} sync={sync} />
                  ))}
                </div>
              </div>
            ) : (
              <div
                {...blockProps(p, s)}
                data-nbox
                data-nest-toggle-closed={s.key}
                className={[
                  'rounded-lg border-2 border-amber-400 bg-amber-50 px-2 py-1.5 text-left text-[10.5px] font-bold text-amber-800 cursor-grab flex items-center gap-1.5',
                  isSelected ? 'ring-2 ring-indigo-400' : m?.band === 'inside' ? 'ring-2 ring-amber-400' : 'hover:bg-amber-100',
                ].join(' ')}
              >
                <button
                  data-nest-toggle={s.key}
                  onClick={(e) => {
                    e.stopPropagation()
                    toggle(s.key)
                  }}
                  className="text-[11px] font-bold text-amber-700 hover:text-amber-900"
                >
                  ⊞
                </button>
                {s.title}
                <span className="font-normal text-amber-500">{visitCount(s)} stops folded</span>
                <span className="ml-auto text-[10px] text-slate-300 select-none">⋮⋮</span>
              </div>
            )}
            {m?.band === 'after' && <MarkBar />}
          </div>
        )
      })}
    </div>
  )
}

export default function AuthorNest({ state, sync }: { state: AuthorState; sync: Sync }) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [mark, setMark] = useState<Mark>(null)
  const toggle = (key: string) => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

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

  const ctx: Ctx = { state, sync, collapsed, toggle, hoverKey, setHoverKey, mark, setMark }

  return (
    <div
      data-author-root
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex-1 min-h-0 overflow-auto p-3 outline-none"
      onDragOver={(e: ReactDragEvent) => e.preventDefault()}
      onDrop={(e: ReactDragEvent) => {
        setMark(null)
        setHoverKey(null)
        handleDrop(e, [state.stops.length], state)
      }}
    >
      {state.stops.length === 0 ? (
        <div className="text-[11px] text-slate-400 p-2">drop a node from the palette to start the plan</div>
      ) : (
        <NestLevel stops={state.stops} parent={[]} ctx={ctx} />
      )}
    </div>
  )
}
