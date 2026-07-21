// The nested-NODE editor (round 6) — the other half of C's comparison. The
// round-5 verdict liked nested boxes but asked: why can't tiers be nested
// NODES, like a flow chart? Same draft, same gestures, different metaphor:
// a visit is a pill node on a vertical spine, a stage is a COMPOUND node
// that expands in place into a container holding its own arrowed mini-flow.
// Direction is the loudest thing on the page — bold arrows between every
// consecutive stop, and each visit wears its walk-order badge (its position
// in the projected route, so the flat order stays readable through nesting).
// The group/aside/remove controls are CONTEXTUAL here: a floating toolbar
// appears beside the node the user just clicked, so grouping happens where
// the hands already are — no trip to a header toolbar.
//
// Layout is arithmetic (measure → place, like WalkColumns): no DOM
// measurement, every node absolutely positioned, arrows drawn in one SVG
// underlay. Expansion state is view-local (a `collapsed` set, all open by
// default) — the draft itself is shared with the nested-box editor, which
// is the point of the side-by-side: one AuthorState, two renderings.

import { useState } from 'react'
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import type { AuthorState, Path } from './authordraft'
import { pathKey } from './authordraft'
import { bandFor, DT, gapFor, handleDrop } from './authordnd'
import type { Band } from './authordnd'
import { visitCount } from './mockwalk'
import type { Aside, StageStop, Stop } from './mockwalk'
import type { Sync } from './sync'

const NODEW = 150
const NODEH = 34
const AGAP = 26 // vertical space between siblings — the arrow lives here
const PAD = 10
const HEAD = 28
const ASIDE_ROW = 15
const MARGIN = 16

type Mark = { key: string; band: Band } | null

interface Placed {
  path: Path
  stop: Stop
  x: number
  y: number
  w: number
  h: number
  /** a visit's position in the projected route */
  order?: number
}
interface Arrow {
  x1: number
  y1: number
  x2: number
  y2: number
}
interface AsideBox {
  x: number
  y: number
  w: number
  h: number
  aside: Aside
}

const asideH = (a: Aside) => 16 + a.steps.length * ASIDE_ROW + 4

function layoutDraft(stops: Stop[], collapsed: ReadonlySet<string>) {
  const measure = (s: Stop): { w: number; h: number } => {
    if (s.kind === 'visit' || collapsed.has(s.key)) return { w: NODEW, h: NODEH }
    const kids = s.steps.map(measure)
    const innerW = Math.max(NODEW, ...kids.map((k) => k.w))
    const aH = (s.asides ?? []).reduce((acc, a) => acc + asideH(a) + 6, 0)
    return { w: innerW + 2 * PAD, h: HEAD + PAD + bodyH(s) + aH + PAD }
  }
  const bodyH = (s: StageStop): number => {
    const kids = s.steps.map(measure)
    return kids.length ? kids.reduce((acc, k) => acc + k.h, 0) + (kids.length - 1) * AGAP : 18
  }

  const items: Placed[] = []
  const arrows: Arrow[] = []
  const asideBoxes: AsideBox[] = []
  const ctr = { n: 0 }

  const placeList = (list: Stop[], parent: Path, centerX: number, y0: number) => {
    let y = y0
    let prevBottom: number | null = null
    list.forEach((s, i) => {
      const p = [...parent, i]
      const { w, h } = measure(s)
      const x = centerX - w / 2
      if (prevBottom !== null) arrows.push({ x1: centerX, y1: prevBottom + 3, x2: centerX, y2: y - 5 })
      if (s.kind === 'visit') {
        items.push({ path: p, stop: s, x, y, w, h, order: ++ctr.n })
      } else if (collapsed.has(s.key)) {
        items.push({ path: p, stop: s, x, y, w, h })
      } else {
        items.push({ path: p, stop: s, x, y, w, h })
        const bodyTop = y + HEAD + PAD
        placeList(s.steps, p, centerX, bodyTop)
        let ay = bodyTop + bodyH(s) + 6
        for (const a of s.asides ?? []) {
          asideBoxes.push({ x: x + PAD, y: ay, w: w - 2 * PAD, h: asideH(a), aside: a })
          ay += asideH(a) + 6
        }
      }
      prevBottom = y + h
      y += h + AGAP
    })
  }

  const W = Math.max(NODEW, ...stops.map((s) => measure(s).w)) + 2 * MARGIN
  placeList(stops, [], W / 2, MARGIN)
  const H = (items.length ? Math.max(...items.map((it) => it.y + it.h)) : 0) + MARGIN
  return { items, arrows, asideBoxes, W, H }
}

export default function AuthorFlow({ state, sync }: { state: AuthorState; sync: Sync }) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [fly, setFly] = useState<{ x: number; y: number } | null>(null)
  const [mark, setMark] = useState<Mark>(null)

  const toggle = (key: string) => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

  const { items, arrows, asideBoxes, W, H } = layoutDraft(state.stops, collapsed)

  /** the block gestures every node shares — visit, closed pill, open header */
  const gestures = (pl: Placed) => {
    const key = pathKey(pl.path)
    return {
      draggable: true,
      onDragStart: (e: ReactDragEvent) => {
        e.stopPropagation()
        e.dataTransfer.setData(DT, 'blk:' + key)
      },
      onDragEnd: () => setMark(null),
      onDragOver: (e: ReactDragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setMark({ key, band: bandFor(e, pl.stop) })
      },
      onDrop: (e: ReactDragEvent) => {
        setMark(null)
        handleDrop(e, gapFor(e, pl.path, pl.stop), state)
      },
      onClick: (e: ReactMouseEvent) => {
        e.stopPropagation()
        state.toggleSelect(pl.path)
        setFly({ x: Math.min(pl.x + pl.w + 8, W - 30), y: pl.y })
      },
    }
  }

  return (
    <div
      data-flow-root
      className="flex-1 min-h-0 overflow-auto"
      onDragOver={(e: ReactDragEvent) => e.preventDefault()}
      onDrop={(e: ReactDragEvent) => {
        setMark(null)
        handleDrop(e, [state.stops.length], state)
      }}
    >
      {state.stops.length === 0 ? (
        <div className="text-[11px] text-slate-400 p-3">drop a node from the palette to start the plan</div>
      ) : (
        <div className="relative mx-auto my-2" style={{ width: W, height: H }}>
          <svg className="absolute inset-0 pointer-events-none z-10" width={W} height={H}>
            <defs>
              <marker id="wt-fly-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706" />
              </marker>
            </defs>
            {arrows.map((a, i) => (
              <line
                key={i}
                data-farrow
                x1={a.x1}
                y1={a.y1}
                x2={a.x2}
                y2={a.y2}
                stroke="#d97706"
                strokeWidth={2.5}
                markerEnd="url(#wt-fly-head)"
              />
            ))}
          </svg>

          {items.map((pl) => {
            const key = pathKey(pl.path)
            const isSelected = state.selected.has(key)
            const s = pl.stop

            if (s.kind === 'visit') {
              const color = DOMAIN_COLOR[domainOf(s.node)]
              return (
                <div
                  key={key}
                  {...gestures(pl)}
                  {...sync.bind(s.node)}
                  data-fnode
                  data-node={s.node}
                  className={[
                    'absolute z-20 rounded-full border-2 bg-white px-2.5 flex items-center gap-1.5 text-[10.5px] font-semibold cursor-grab',
                    isSelected ? 'ring-2 ring-indigo-400 bg-indigo-50' : sync.lit(s.node) ? 'ring-2 ring-sky-300' : '',
                  ].join(' ')}
                  style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h, borderColor: color, color }}
                >
                  <span
                    data-ford={pl.order}
                    className="shrink-0 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center"
                  >
                    {pl.order}
                  </span>
                  <span className="truncate">{byId.get(s.node)!.title}</span>
                </div>
              )
            }

            if (collapsed.has(s.key)) {
              return (
                <div
                  key={key}
                  {...gestures(pl)}
                  data-fstage-closed={s.key}
                  className={[
                    'absolute z-20 rounded-full border-2 border-amber-400 bg-amber-50 px-2.5 flex items-center gap-1.5 text-[10.5px] font-bold text-amber-800 cursor-grab',
                    isSelected ? 'ring-2 ring-indigo-400' : mark?.key === key && mark.band === 'inside' ? 'ring-2 ring-amber-400' : 'hover:bg-amber-100',
                  ].join(' ')}
                  style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
                >
                  <button
                    data-flow-toggle={s.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(s.key)
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900"
                  >
                    ⊞
                  </button>
                  <span className="truncate">{s.title}</span>
                  <span className="font-normal text-amber-500 whitespace-nowrap">{visitCount(s)}</span>
                </div>
              )
            }

            return (
              <div
                key={key}
                data-fstage={s.key}
                data-fdrop={s.key}
                onDragOver={(e: ReactDragEvent) => e.preventDefault()}
                onDrop={(e: ReactDragEvent) => {
                  setMark(null)
                  handleDrop(e, [...pl.path, s.steps.length], state)
                }}
                className="absolute rounded-2xl border-2 border-amber-400 bg-amber-50/50"
                style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
              >
                <div
                  {...gestures(pl)}
                  data-fhead={s.key}
                  className={[
                    'flex items-center gap-1 px-2 cursor-grab rounded-t-2xl',
                    isSelected ? 'ring-2 ring-indigo-400 bg-indigo-50' : '',
                  ].join(' ')}
                  style={{ height: HEAD }}
                >
                  <button
                    data-flow-toggle={s.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(s.key)
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900"
                  >
                    ⊟
                  </button>
                  <input
                    data-fretitle={s.key}
                    value={s.title}
                    onChange={(e) => state.retitle(s.key, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10.5px] font-bold text-amber-800 bg-transparent border-b border-dashed border-amber-300 focus:border-amber-500 outline-none flex-1 min-w-0"
                  />
                  <span data-fgrab={s.key} className="text-[10px] text-slate-300 select-none px-0.5">
                    ⋮⋮
                  </span>
                </div>
              </div>
            )
          })}

          {asideBoxes.map((b, i) => (
            <div
              key={i}
              data-faside
              className="absolute z-20 rounded-lg border-2 border-dashed border-violet-300 bg-violet-50/50 px-1.5 pt-0.5"
              style={{ left: b.x, top: b.y, width: b.w, height: b.h }}
            >
              <div className="text-[9px] font-semibold text-violet-500 truncate">≀ {b.aside.title}</div>
              {b.aside.steps.map((st, j) => (
                <div
                  key={`${j}-${st.node}`}
                  {...sync.bind(st.node)}
                  data-node={st.node}
                  className="flex items-center gap-1 text-[10px] text-slate-400 truncate"
                  style={{ height: ASIDE_ROW }}
                >
                  <span className="w-1.5 h-1.5 rounded-full inline-block shrink-0" style={{ background: DOMAIN_COLOR[domainOf(st.node)] }} />
                  {byId.get(st.node)!.title}
                </div>
              ))}
            </div>
          ))}

          {mark &&
            mark.band !== 'inside' &&
            items
              .filter((pl) => pathKey(pl.path) === mark.key)
              .map((pl) => (
                <div
                  key="mark"
                  data-fmark
                  className="absolute z-30 h-[3px] rounded bg-amber-500 pointer-events-none"
                  style={{ left: pl.x, top: mark.band === 'before' ? pl.y - 6 : pl.y + pl.h + 3, width: pl.w }}
                />
              ))}

          {state.selected.size > 0 && fly && (
            <div
              data-fly
              className="absolute z-40 flex flex-col gap-1 p-1 rounded-lg border border-slate-200 bg-white shadow-md"
              style={{ left: Math.min(fly.x, W - 26), top: fly.y }}
            >
              <button
                data-fly-group
                disabled={!state.canGroup}
                onClick={state.groupSelection}
                title="group into stage"
                className="text-[11px] px-1 rounded border border-amber-300 text-amber-700 bg-amber-50 disabled:opacity-30 hover:bg-amber-100"
              >
                ⊞
              </button>
              <button
                data-fly-aside
                disabled={!state.canAside}
                onClick={state.asideSelection}
                title="make aside"
                className="text-[11px] px-1 rounded border border-violet-300 text-violet-600 bg-violet-50 disabled:opacity-30 hover:bg-violet-100"
              >
                ≀
              </button>
              <button
                data-fly-del
                disabled={!state.canDelete}
                onClick={state.deleteSelection}
                title="remove"
                className="text-[11px] px-1 rounded border border-slate-200 text-slate-500 disabled:opacity-30 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
