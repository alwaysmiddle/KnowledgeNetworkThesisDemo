// The RAILROAD editor (round 7) — the top-down node chart the round-6
// feedback asked for, now with the road allowed to SPLIT: a fork fans out
// into labelled branch lanes that all rejoin below (well-nested fork/rejoin,
// railroad-diagram style — never a free canvas: every position is computed).
// The chosen branch IS the road — bold amber rails, walk-order badges — and
// the other lanes ride along ghosted, one click away. An optional stop wears
// a dashed border and a bypass rail; skip optionals and the bypass becomes
// the road. Stages keep their round-6 compound rendering, and the whole
// surface still edits the ONE shared AuthorState through the shared dnd
// contract — a drop means the same thing here as anywhere.
//
// Layout is arithmetic (measure → place, inherited from the round-6 flow):
// no DOM measurement, one SVG underlay for arrows/rails/bypasses.

import { useState } from 'react'
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import type { AuthorState, Path } from './authordraft'
import { pathKey } from './authordraft'
import { bandFor, DT, gapFor, handleDrop } from './authordnd'
import type { Band } from './authordnd'
import { visitCount } from './mockwalk'
import type { Aside, ForkStop, StageStop, Stop } from './mockwalk'
import type { HoverBinding } from '../../studio/bus'

const NODEW = 150
const NODEH = 34
const AGAP = 26 // vertical space between siblings — the arrow lives here
const PAD = 10
const HEAD = 28
const ASIDE_ROW = 15
const MARGIN = 16
const BR_HEAD = 20 // branch label chip height
const BR_GAP = 18 // horizontal gap between branch lanes
const RAIL = 26 // fan-out / fan-in space above and below the lanes
const EMPTY_H = 30 // drop zone height of a branch with no steps yet

type Mark = { key: string; band: Band } | null

interface Placed {
  path: Path
  stop: Stop
  x: number
  y: number
  w: number
  h: number
  /** a visit's position on the resolved road (unbadged off the road) */
  order?: number
  onRoad: boolean
  skipped: boolean
}
interface Arrow {
  x1: number
  y1: number
  x2: number
  y2: number
  live: boolean
}
interface Rail {
  d: string
  live: boolean
  head: boolean
}
interface Dot {
  x: number
  y: number
  live: boolean
}
interface BranchChip {
  forkKey: string
  idx: number
  label: string
  x: number
  y: number
  chosen: boolean
  live: boolean
}
interface EmptyLane {
  forkKey: string
  idx: number
  forkPath: Path
  x: number
  y: number
}
interface QuestionTag {
  forkKey: string
  question: string
  x: number
  y: number
}
interface AddButton {
  forkKey: string
  x: number
  y: number
}
interface AsideBox {
  x: number
  y: number
  w: number
  h: number
  aside: Aside
}

const asideH = (a: Aside) => 16 + a.steps.length * ASIDE_ROW + 4

function layoutRoad(
  stops: Stop[],
  collapsed: ReadonlySet<string>,
  choices: Record<string, number>,
  withOptionals: boolean,
) {
  const measure = (s: Stop): { w: number; h: number } => {
    if (s.kind === 'visit') return { w: NODEW, h: NODEH }
    if (s.kind === 'stage') {
      if (collapsed.has(s.key)) return { w: NODEW, h: NODEH }
      const kids = s.steps.map(measure)
      const innerW = Math.max(NODEW, ...kids.map((k) => k.w))
      const aH = (s.asides ?? []).reduce((acc, a) => acc + asideH(a) + 6, 0)
      return { w: innerW + 2 * PAD, h: HEAD + PAD + stageBodyH(s) + aH + PAD }
    }
    const lanes = s.branches.map(laneShape)
    return {
      w: lanes.reduce((acc, l) => acc + l.w, 0) + (lanes.length - 1) * BR_GAP,
      h: RAIL + Math.max(...lanes.map((l) => BR_HEAD + 8 + l.bodyH)) + RAIL,
    }
  }
  const stageBodyH = (s: StageStop): number => {
    const kids = s.steps.map(measure)
    return kids.length ? kids.reduce((acc, k) => acc + k.h, 0) + (kids.length - 1) * AGAP : 18
  }
  const laneShape = (b: { steps: Stop[] }) => {
    const kids = b.steps.map(measure)
    return {
      w: Math.max(NODEW, ...kids.map((k) => k.w)),
      bodyH: kids.length ? kids.reduce((acc, k) => acc + k.h, 0) + (kids.length - 1) * AGAP : EMPTY_H,
    }
  }

  const items: Placed[] = []
  const arrows: Arrow[] = []
  const rails: Rail[] = []
  const bypasses: Rail[] = []
  const dots: Dot[] = []
  const chips: BranchChip[] = []
  const emptyLanes: EmptyLane[] = []
  const questions: QuestionTag[] = []
  const addButtons: AddButton[] = []
  const asideBoxes: AsideBox[] = []
  const ctr = { n: 0 }

  const placeFork = (s: ForkStop, p: Path, centerX: number, y: number, w: number, h: number, onRoad: boolean) => {
    const chosen = choices[s.key] ?? 0
    const topY = y + 4
    const botY = y + h - 4
    dots.push({ x: centerX, y: topY, live: onRoad }, { x: centerX, y: botY, live: onRoad })
    questions.push({ forkKey: s.key, question: s.question, x: centerX, y: topY })
    items.push({ path: p, stop: s, x: centerX - 8, y: topY - 8, w: 16, h: 16, onRoad, skipped: false })
    let lx = centerX - w / 2
    s.branches.forEach((b, k) => {
      const lane = laneShape(b)
      const cx = lx + lane.w / 2
      const live = onRoad && k === chosen
      const chipY = y + RAIL
      chips.push({ forkKey: s.key, idx: k, label: b.label, x: cx - NODEW / 2, y: chipY, chosen: k === chosen, live })
      rails.push({ d: `M ${centerX} ${topY} C ${centerX} ${topY + 16}, ${cx} ${chipY - 14}, ${cx} ${chipY}`, live, head: false })
      const bodyTop = chipY + BR_HEAD + 8
      if (b.steps.length) {
        rails.push({ d: `M ${cx} ${chipY + BR_HEAD + 2} L ${cx} ${bodyTop - 4}`, live, head: false })
        placeList(b.steps, [...p, k], cx, bodyTop, live)
      } else {
        emptyLanes.push({ forkKey: s.key, idx: k, forkPath: p, x: cx - NODEW / 2, y: bodyTop })
      }
      const laneBot = bodyTop + lane.bodyH
      rails.push({ d: `M ${cx} ${laneBot + 4} C ${cx} ${laneBot + 18}, ${centerX} ${botY - 16}, ${centerX} ${botY}`, live, head: true })
      lx += lane.w + BR_GAP
    })
    addButtons.push({ forkKey: s.key, x: centerX + w / 2 + 6, y: y + RAIL })
  }

  const placeList = (list: Stop[], parent: Path, centerX: number, y0: number, onRoad: boolean) => {
    let y = y0
    let prevBottom: number | null = null
    let prevSkipped = false
    list.forEach((s, i) => {
      const p = [...parent, i]
      const { w, h } = measure(s)
      const x = centerX - w / 2
      const skipped = s.kind !== 'fork' && !!s.optional && !withOptionals
      if (prevBottom !== null)
        arrows.push({ x1: centerX, y1: prevBottom + 3, x2: centerX, y2: y - 5, live: onRoad && !prevSkipped && !skipped })
      if (s.kind !== 'fork' && s.optional)
        bypasses.push({
          d: `M ${centerX} ${y - 6} C ${x + w + 26} ${y + 8}, ${x + w + 26} ${y + h - 8}, ${centerX} ${y + h + 6}`,
          live: onRoad && skipped,
          head: true,
        })
      if (s.kind === 'visit') {
        const order = onRoad && !skipped ? ++ctr.n : undefined
        items.push({ path: p, stop: s, x, y, w, h, order, onRoad, skipped })
      } else if (s.kind === 'fork') {
        placeFork(s, p, centerX, y, w, h, onRoad)
      } else if (collapsed.has(s.key)) {
        items.push({ path: p, stop: s, x, y, w, h, onRoad, skipped })
      } else {
        items.push({ path: p, stop: s, x, y, w, h, onRoad, skipped })
        const bodyTop = y + HEAD + PAD
        placeList(s.steps, p, centerX, bodyTop, onRoad && !skipped)
        let ay = bodyTop + stageBodyH(s) + 6
        for (const a of s.asides ?? []) {
          asideBoxes.push({ x: x + PAD, y: ay, w: w - 2 * PAD, h: asideH(a), aside: a })
          ay += asideH(a) + 6
        }
      }
      prevBottom = y + h
      prevSkipped = skipped
      y += h + AGAP
    })
  }

  const W = Math.max(NODEW, ...stops.map((s) => measure(s).w)) + 2 * MARGIN
  placeList(stops, [], W / 2, MARGIN, true)
  const bottoms = [...items.map((it) => it.y + it.h), ...emptyLanes.map((l) => l.y + EMPTY_H)]
  const H = (bottoms.length ? Math.max(...bottoms) : 0) + RAIL + MARGIN
  return { items, arrows, rails, bypasses, dots, chips, emptyLanes, questions, addButtons, asideBoxes, W, H }
}

export default function AuthorRoad({
  state,
  sync,
  choices,
  pickBranch,
  withOptionals,
}: {
  state: AuthorState
  sync: HoverBinding
  choices: Record<string, number>
  pickBranch(forkKey: string, idx: number): void
  withOptionals: boolean
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [fly, setFly] = useState<{ x: number; y: number } | null>(null)
  const [mark, setMark] = useState<Mark>(null)

  const toggle = (key: string) => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

  const { items, arrows, rails, bypasses, dots, chips, emptyLanes, questions, addButtons, asideBoxes, W, H } =
    layoutRoad(state.stops, collapsed, choices, withOptionals)

  /** the block gestures every node shares — visit, pill, header, fork handle */
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

  const railStroke = (r: Rail) => ({
    stroke: r.live ? '#d97706' : '#94a3b8',
    strokeWidth: r.live ? 2.5 : 1.5,
    strokeDasharray: r.live ? undefined : '4 3',
    markerEnd: r.head ? (r.live ? 'url(#wt-road-head)' : 'url(#wt-road-ghost)') : undefined,
  })

  return (
    <div
      data-road-root
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
              <marker id="wt-road-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#d97706" />
              </marker>
              <marker id="wt-road-ghost" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
              </marker>
            </defs>
            {arrows.map((a, i) => (
              <line
                key={`a${i}`}
                data-rarrow
                x1={a.x1}
                y1={a.y1}
                x2={a.x2}
                y2={a.y2}
                stroke={a.live ? '#d97706' : '#94a3b8'}
                strokeWidth={a.live ? 2.5 : 1.5}
                strokeDasharray={a.live ? undefined : '4 3'}
                markerEnd={a.live ? 'url(#wt-road-head)' : 'url(#wt-road-ghost)'}
              />
            ))}
            {rails.map((r, i) => (
              <path key={`r${i}`} data-rail fill="none" d={r.d} {...railStroke(r)} />
            ))}
            {bypasses.map((r, i) => (
              <path
                key={`b${i}`}
                data-rbypass
                fill="none"
                d={r.d}
                stroke={r.live ? '#d97706' : '#94a3b8'}
                strokeWidth={r.live ? 2.5 : 1.2}
                strokeDasharray={r.live ? undefined : '3 3'}
                markerEnd={r.live ? 'url(#wt-road-head)' : undefined}
              />
            ))}
            {dots.map((d, i) => (
              <circle key={`d${i}`} cx={d.x} cy={d.y} r={4} fill={d.live ? '#d97706' : '#94a3b8'} />
            ))}
          </svg>

          {items.map((pl) => {
            const key = pathKey(pl.path)
            const isSelected = state.selected.has(key)
            const s = pl.stop
            const dim = !pl.onRoad || pl.skipped ? 'opacity-50' : ''

            if (s.kind === 'visit') {
              const color = DOMAIN_COLOR[domainOf(s.node)]
              return (
                <div
                  key={key}
                  {...gestures(pl)}
                  {...sync.bind(s.node)}
                  data-rnode
                  data-node={s.node}
                  data-ropt={s.optional ? 1 : undefined}
                  className={[
                    'absolute z-20 rounded-full border-2 bg-white px-2.5 flex items-center gap-1.5 text-[10.5px] font-semibold cursor-grab',
                    s.optional ? 'border-dashed' : '',
                    dim,
                    isSelected ? 'ring-2 ring-indigo-400 bg-indigo-50' : sync.lit(s.node) ? 'ring-2 ring-sky-300' : '',
                  ].join(' ')}
                  style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h, borderColor: color, color }}
                >
                  {pl.order !== undefined && (
                    <span
                      data-rord={pl.order}
                      className="shrink-0 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center"
                    >
                      {pl.order}
                    </span>
                  )}
                  {s.optional && <span className="shrink-0 text-[9px] text-slate-400">◇</span>}
                  <span className="truncate">{byId.get(s.node)!.title}</span>
                </div>
              )
            }

            if (s.kind === 'fork') {
              return (
                <div
                  key={key}
                  {...gestures(pl)}
                  data-fork={s.key}
                  title={s.question}
                  className={[
                    'absolute z-30 rotate-45 border-2 border-amber-600 bg-amber-400 cursor-grab',
                    isSelected ? 'ring-2 ring-indigo-400' : 'hover:bg-amber-300',
                  ].join(' ')}
                  style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
                />
              )
            }

            if (collapsed.has(s.key)) {
              return (
                <div
                  key={key}
                  {...gestures(pl)}
                  data-rstage-closed={s.key}
                  className={[
                    'absolute z-20 rounded-full border-2 border-amber-400 bg-amber-50 px-2.5 flex items-center gap-1.5 text-[10.5px] font-bold text-amber-800 cursor-grab',
                    s.optional ? 'border-dashed' : '',
                    dim,
                    isSelected ? 'ring-2 ring-indigo-400' : mark?.key === key && mark.band === 'inside' ? 'ring-2 ring-amber-400' : 'hover:bg-amber-100',
                  ].join(' ')}
                  style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
                >
                  <button
                    data-road-toggle={s.key}
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
                data-rstage={s.key}
                data-rdrop={s.key}
                onDragOver={(e: ReactDragEvent) => e.preventDefault()}
                onDrop={(e: ReactDragEvent) => {
                  setMark(null)
                  handleDrop(e, [...pl.path, s.steps.length], state)
                }}
                className={['absolute rounded-2xl border-2 border-amber-400 bg-amber-50/50', s.optional ? 'border-dashed' : '', dim].join(' ')}
                style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
              >
                <div
                  {...gestures(pl)}
                  data-rhead={s.key}
                  className={[
                    'flex items-center gap-1 px-2 cursor-grab rounded-t-2xl',
                    isSelected ? 'ring-2 ring-indigo-400 bg-indigo-50' : '',
                  ].join(' ')}
                  style={{ height: HEAD }}
                >
                  <button
                    data-road-toggle={s.key}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggle(s.key)
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900"
                  >
                    ⊟
                  </button>
                  <input
                    data-rretitle={s.key}
                    value={s.title}
                    onChange={(e) => state.retitle(s.key, e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10.5px] font-bold text-amber-800 bg-transparent border-b border-dashed border-amber-300 focus:border-amber-500 outline-none flex-1 min-w-0"
                  />
                  {s.optional && <span className="text-[9px] text-amber-500">◇</span>}
                  <span data-rgrab={s.key} className="text-[10px] text-slate-300 select-none px-0.5">
                    ⋮⋮
                  </span>
                </div>
              </div>
            )
          })}

          {questions.map((q) => (
            <input
              key={q.forkKey}
              data-rquestion={q.forkKey}
              value={q.question}
              onChange={(e) => state.setForkQuestion(q.forkKey, e.target.value)}
              className="absolute z-30 text-[9.5px] italic text-amber-700 bg-transparent border-b border-dotted border-amber-300 focus:border-amber-500 outline-none"
              style={{ left: Math.min(q.x + 12, W - 140), top: q.y - 8, width: 130 }}
            />
          ))}

          {chips.map((c) => (
            <div
              key={`${c.forkKey}.${c.idx}`}
              onClick={() => pickBranch(c.forkKey, c.idx)}
              className={[
                'absolute z-20 rounded-full border flex items-center gap-1 px-1.5 cursor-pointer',
                c.chosen ? 'border-amber-500 bg-amber-100' : 'border-slate-300 bg-white hover:bg-slate-50',
              ].join(' ')}
              style={{ left: c.x, top: c.y, width: NODEW, height: BR_HEAD }}
            >
              <button
                data-brpick={`${c.forkKey}.${c.idx}`}
                onClick={(e) => {
                  e.stopPropagation()
                  pickBranch(c.forkKey, c.idx)
                }}
                className={['shrink-0 text-[10px]', c.chosen ? 'text-amber-600' : 'text-slate-400'].join(' ')}
              >
                {c.chosen ? '●' : '○'}
              </button>
              <input
                data-brlabel={`${c.forkKey}.${c.idx}`}
                value={c.label}
                onChange={(e) => state.relabelBranch(c.forkKey, c.idx, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className={[
                  'text-[9.5px] bg-transparent outline-none flex-1 min-w-0',
                  c.chosen ? 'font-bold text-amber-800' : 'text-slate-500',
                ].join(' ')}
              />
            </div>
          ))}

          {emptyLanes.map((l) => (
            <div
              key={`${l.forkKey}.${l.idx}`}
              data-brdrop={`${l.forkKey}.${l.idx}`}
              onDragOver={(e: ReactDragEvent) => e.preventDefault()}
              onDrop={(e: ReactDragEvent) => {
                setMark(null)
                handleDrop(e, [...l.forkPath, l.idx, 0], state)
              }}
              className="absolute z-20 rounded-lg border-2 border-dashed border-slate-300 bg-white/60 flex items-center justify-center text-[9.5px] text-slate-400"
              style={{ left: l.x, top: l.y, width: NODEW, height: EMPTY_H }}
            >
              drop steps here
            </div>
          ))}

          {addButtons.map((b) => (
            <button
              key={b.forkKey}
              data-add-branch={b.forkKey}
              onClick={() => state.addBranch(b.forkKey)}
              title="add a branch"
              className="absolute z-20 w-[18px] h-[18px] rounded-full border border-dashed border-amber-400 text-amber-600 text-[11px] leading-none bg-white hover:bg-amber-50"
              style={{ left: Math.min(b.x, W - 22), top: b.y }}
            >
              +
            </button>
          ))}

          {asideBoxes.map((b, i) => (
            <div
              key={i}
              data-raside
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
                  data-rmark
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
                data-fly-fork
                disabled={!state.canFork}
                onClick={state.forkSelection}
                title="fork the road here"
                className="text-[11px] px-1 rounded border border-amber-400 text-amber-800 bg-amber-100 disabled:opacity-30 hover:bg-amber-200"
              >
                ⑂
              </button>
              <button
                data-fly-opt
                disabled={!state.canOptional}
                onClick={state.toggleOptionalSelection}
                title="toggle optional"
                className="text-[11px] px-1 rounded border border-slate-300 text-slate-600 bg-slate-50 disabled:opacity-30 hover:bg-slate-100"
              >
                ◇
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
