// The RAILROAD editor (#19) — a top-down node chart where the road may fork.
// Since #19 a fork is NOT a third shape with its own fan-out language; it is a
// GROUP CARD with more than one variant, and the choice shows as TABS on the
// card rather than as parallel lanes. That keeps every container one column
// wide — the fan-out (diamond, lanes, chips, rejoin rails, the + preview) was
// the biggest consumer of horizontal width, and it is gone.
//
// One card renders both: a plain group (one variant) is just header + body; a
// fork (two or more) grows a question line and a tab strip under the header,
// and the body shows only the CHOSEN variant's steps. "⑂ add a variant" in the
// header is the branching gesture — a plain group becomes a fork.
//
// Layout is arithmetic (measure → place): no DOM measurement, one SVG underlay
// for the walk arrows and the optional-bypass rails. Step nodes float as
// board-level siblings OVER each card, so no inner click bubbles into a parent.

import { useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

import { byId, domainOf, DOMAIN_COLOR, topicIds } from '../../corpus/graph'
import type { AuthorState, Path } from './authordraft'
import { pathKey } from './authordraft'
import { bandFor, DT, gapFor, handleDrop } from './authordnd'
import type { Band } from './authordnd'
import { chosenIdx, chosenSteps, isBox, isFork, isLeaf, visitCount } from './mockwalk'
import type { Stop } from './mockwalk'
import type { HoverBinding } from '../../studio/bus'

const NODEW = 150
const NODEH = 34
const AGAP = 26 // vertical space between siblings — the arrow lives here
const PAD = 10
const HEAD = 28
const MARGIN = 16
const QUESTION_H = 18 // the fork question line, above the tabs
const TAB_H = 22 // the variant tab strip
const EMPTY_BODY_H = 30 // drop zone height when the chosen variant has no steps
const SLOTH = 18 // catch height of a between-nodes drop slot (fills the AGAP)
const SELPAD = 7 // breathing room the selection box leaves around its members
// The action toolbar WRAPS in a narrow slice (review 4), so the space it needs
// above the selection box is derived from the width, not one fixed number.
const BAR_ONE_LINE_W = 350
const BAR_ROW_H = 26

/** the header rows a container reserves above its body: the header, plus (fork
 * only) a question line and a tab strip. One source of truth for the layout math
 * AND the empty-body drop zone, so the two can never drift. */
const headH = (s: Stop): number => HEAD + (isFork(s) ? QUESTION_H + TAB_H : 0)

type Mark = { key: string; band: Band } | null

interface Placed {
  path: Path
  stop: Stop
  x: number
  y: number
  w: number
  h: number
  /** a leaf's position on the resolved road (unbadged off the road) */
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
interface Bypass {
  d: string
  live: boolean
}
/** a forgiving drop target filling the gap between two siblings (or before the
 * first / after the last) — inserts at `path`, so a drop in dead space no longer
 * falls through to append-at-end */
interface Slot {
  path: Path
  x: number
  y: number
  w: number
}

function layoutRoad(
  stops: Stop[],
  collapsed: ReadonlySet<string>,
  choices: Record<string, number>,
  withOptionals: boolean,
) {
  const measure = (s: Stop): { w: number; h: number } => {
    if (isLeaf(s) || collapsed.has(s.key!)) return { w: NODEW, h: NODEH }
    const kids = chosenSteps(s, choices).map(measure)
    const innerW = Math.max(NODEW, ...kids.map((k) => k.w))
    const bodyH = kids.length ? kids.reduce((acc, k) => acc + k.h, 0) + (kids.length - 1) * AGAP : EMPTY_BODY_H
    return { w: innerW + 2 * PAD, h: headH(s) + PAD + bodyH + PAD }
  }

  const items: Placed[] = []
  const arrows: Arrow[] = []
  const bypasses: Bypass[] = []
  const slots: Slot[] = []
  const ctr = { n: 0 }

  const placeList = (list: Stop[], parent: Path, centerX: number, y0: number, onRoad: boolean) => {
    let y = y0
    let prevBottom: number | null = null
    let prevSkipped = false
    let lastW = NODEW
    list.forEach((s, i) => {
      const p = [...parent, i]
      const { w, h } = measure(s)
      const x = centerX - w / 2
      slots.push({ path: p, x, y: prevBottom === null ? y - 8 : (prevBottom + y) / 2, w })
      lastW = w
      const skipped = !!s.optional && !withOptionals
      if (prevBottom !== null)
        arrows.push({ x1: centerX, y1: prevBottom + 3, x2: centerX, y2: y - 5, live: onRoad && !prevSkipped && !skipped })
      if (s.optional)
        bypasses.push({
          d: `M ${centerX} ${y - 6} C ${x + w + 26} ${y + 8}, ${x + w + 26} ${y + h - 8}, ${centerX} ${y + h + 6}`,
          live: onRoad && skipped,
        })
      if (isLeaf(s)) {
        const order = onRoad && !skipped ? ++ctr.n : undefined
        items.push({ path: p, stop: s, x, y, w, h, order, onRoad, skipped })
      } else if (collapsed.has(s.key!)) {
        items.push({ path: p, stop: s, x, y, w, h, onRoad, skipped })
      } else {
        items.push({ path: p, stop: s, x, y, w, h, onRoad, skipped })
        const chosen = chosenIdx(s, choices)
        const steps = chosenSteps(s, choices)
        if (steps.length) placeList(steps, [...p, chosen], centerX, y + headH(s) + PAD, onRoad && !skipped)
      }
      prevBottom = y + h
      prevSkipped = skipped
      y += h + AGAP
    })
    if (list.length && prevBottom !== null)
      slots.push({ path: [...parent, list.length], x: centerX - lastW / 2, y: prevBottom + 8, w: lastW })
  }

  const W = Math.max(NODEW, ...stops.map((s) => measure(s).w)) + 2 * MARGIN
  placeList(stops, [], W / 2, MARGIN, true)
  const bottoms = items.map((it) => it.y + it.h)
  const H = (bottoms.length ? Math.max(...bottoms) : 0) + MARGIN
  return { items, arrows, bypasses, slots, W, H }
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
  pickBranch(key: string, idx: number): void
  withOptionals: boolean
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [mark, setMark] = useState<Mark>(null)
  const [hotSlot, setHotSlot] = useState<number | null>(null)
  // the delete popover: a container delete ASKS (keep steps / delete all / drop
  // variant) instead of silently cascading — the pathKey of the box it's for
  const [delMenu, setDelMenu] = useState<string | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const marqueeDragRef = useRef(false)
  // which container's title is open for editing — renaming is a MODE behind ✎
  const [editKey, setEditKey] = useState<string | null>(null)

  const toggle = (key: string) => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

  const { items, arrows, bypasses, slots, W, H } = layoutRoad(state.stops, collapsed, choices, withOptionals)

  // the single selected block, if it's a container — drives the delete popover
  const selKey = state.selected.size === 1 ? [...state.selected][0] : null
  const selPlaced = selKey ? items.find((pl) => pathKey(pl.path) === selKey) : undefined
  const selStop = selPlaced?.stop
  const selIsContainer = !!selStop && isBox(selStop)
  const selIsFork = !!selStop && isFork(selStop)

  // the SELECTION BOX — the bounding rect of every selected block; the action
  // toolbar pins to it (stable) rather than chasing the cursor. #17.
  const selItems = items.filter((pl) => state.selected.has(pathKey(pl.path)))
  const selBox = selItems.length
    ? (() => {
        const x = Math.min(...selItems.map((p) => p.x)) - SELPAD
        const y = Math.min(...selItems.map((p) => p.y)) - SELPAD
        const right = Math.max(...selItems.map((p) => p.x + p.w)) + SELPAD
        const bottom = Math.max(...selItems.map((p) => p.y + p.h)) + SELPAD
        return { x, y, w: right - x, h: bottom - y }
      })()
    : null
  const barMaxW = Math.max(180, W - 8)
  const barH = Math.max(1, Math.ceil(BAR_ONE_LINE_W / barMaxW)) * BAR_ROW_H + 8
  const barY = selBox ? (selBox.y - barH - 4 >= 0 ? selBox.y - barH - 4 : selBox.y + selBox.h + 4) : 0

  /** Windows-style select: a plain click takes just this block, shift adds. */
  const selectOn = (pl: Placed) => (e: ReactMouseEvent) => {
    e.stopPropagation()
    if (e.shiftKey) state.toggleSelect(pl.path)
    else state.selectPaths([pl.path])
    setDelMenu(null)
  }

  /** the block gestures every node shares — leaf pill, card header, closed pill */
  const gestures = (pl: Placed) => {
    const key = pathKey(pl.path)
    return {
      draggable: true,
      onDragStart: (e: ReactDragEvent) => {
        e.stopPropagation()
        e.dataTransfer.setData(DT, 'blk:' + key)
      },
      onDragEnd: () => {
        setMark(null)
        setHotSlot(null)
      },
      onDragOver: (e: ReactDragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setHotSlot(null)
        setMark({ key, band: bandFor(e, pl.stop) })
      },
      onDragLeave: () => setMark((m) => (m?.key === key ? null : m)),
      onDrop: (e: ReactDragEvent) => {
        setMark(null)
        setHotSlot(null)
        handleDrop(e, gapFor(e, pl.path, pl.stop, choices), state)
      },
      onClick: selectOn(pl),
    }
  }

  // ── marquee (rubber-band) select ──────────────────────────────────────────
  const boardPoint = (e: ReactPointerEvent) => {
    const r = boardRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onBoardPointerDown = (e: ReactPointerEvent) => {
    marqueeDragRef.current = false
    if (e.button !== 0 || !boardRef.current) return
    // only empty canvas starts a marquee — not a node, control, tab, or overlay
    if ((e.target as HTMLElement).closest('[data-rnode],[data-rhead],[data-rstage],[data-rstage-closed],[data-fly],[data-del-menu],[data-tab],[data-tablabel],[data-add-variant],[data-rquestion],[data-rretitle],[data-rbody],button,input,select')) return
    const { x, y } = boardPoint(e)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setMarquee({ x0: x, y0: y, x1: x, y1: y })
    if (!e.shiftKey) state.selectPaths([])
    setDelMenu(null)
  }
  const onBoardPointerMove = (e: ReactPointerEvent) => {
    if (!marquee) return
    const { x, y } = boardPoint(e)
    setMarquee({ ...marquee, x1: x, y1: y })
  }
  const onBoardPointerUp = (e: ReactPointerEvent) => {
    if (!marquee) return
    const left = Math.min(marquee.x0, marquee.x1)
    const right = Math.max(marquee.x0, marquee.x1)
    const top = Math.min(marquee.y0, marquee.y1)
    const bottom = Math.max(marquee.y0, marquee.y1)
    if (right - left > 4 || bottom - top > 4) {
      marqueeDragRef.current = true
      const hit = items.filter((pl) => pl.x < right && pl.x + pl.w > left && pl.y < bottom && pl.y + pl.h > top)
      if (hit.length) state.selectPaths(hit.map((pl) => pl.path), e.shiftKey)
    }
    setMarquee(null)
  }

  return (
    <div
      data-road-root
      className="flex-1 min-h-0 overflow-auto"
      onPointerDown={onBoardPointerDown}
      onPointerMove={onBoardPointerMove}
      onPointerUp={onBoardPointerUp}
      onDragOver={(e: ReactDragEvent) => e.preventDefault()}
      onDrop={(e: ReactDragEvent) => {
        setMark(null)
        handleDrop(e, [state.stops.length], state)
      }}
    >
      {state.stops.length === 0 ? (
        <div className="text-[11px] text-slate-400 p-3">drop a node from the palette to start the plan</div>
      ) : (
        <div ref={boardRef} className="relative mx-auto my-2 select-none" style={{ width: W, height: H }}>
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
          </svg>

          {items.map((pl) => {
            const key = pathKey(pl.path)
            const isSelected = state.selected.has(key)
            const s = pl.stop
            const dim = (!pl.onRoad || pl.skipped) && !isSelected ? 'opacity-50' : ''

            if (isLeaf(s)) {
              // an unbound placeholder slot — a picker, not a node chip
              if (s.unset) {
                return (
                  <div
                    key={key}
                    {...gestures(pl)}
                    data-rnode
                    data-node=""
                    data-runset={1}
                    className={[
                      'absolute z-20 rounded-full border-2 border-dashed border-slate-300 bg-slate-50 px-2 flex items-center cursor-grab',
                      'transition-[left,top,width,height] duration-200 ease-out',
                      dim,
                      isSelected ? 'ring-2 ring-blue-500' : '',
                    ].join(' ')}
                    style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
                  >
                    <select
                      data-rpicknode={key}
                      value=""
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation()
                        if (e.target.value) state.bindNode(pl.path, e.target.value)
                      }}
                      className="w-full bg-transparent text-[10px] text-slate-500 outline-none cursor-pointer"
                    >
                      <option value="">pick a node ▾</option>
                      {topicIds.map((id) => (
                        <option key={id} value={id}>
                          {byId.get(id)!.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              }
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
                    'transition-[left,top,width,height] duration-200 ease-out',
                    s.optional ? 'border-dashed' : '',
                    dim,
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : sync.lit(s.node) ? 'ring-2 ring-sky-300' : '',
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

            // a container — collapsed to a pill
            if (collapsed.has(s.key!)) {
              return (
                <div
                  key={key}
                  {...gestures(pl)}
                  data-rstage-closed={s.key}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    toggle(s.key!)
                  }}
                  title="double-click to open"
                  className={[
                    'absolute z-20 rounded-full border-2 border-green-500 bg-green-50 px-2.5 flex items-center gap-1.5 text-[10.5px] font-bold text-green-800 cursor-grab',
                    'transition-[left,top,width,height] duration-200 ease-out',
                    s.optional ? 'border-dashed' : '',
                    dim,
                    isSelected ? 'ring-2 ring-blue-500' : mark?.key === key && mark.band === 'inside' ? 'ring-2 ring-green-500' : 'hover:bg-green-100',
                  ].join(' ')}
                  style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
                >
                  {isFork(s) && <span className="shrink-0 text-[10px] text-amber-600">⑂</span>}
                  <span className="truncate">{s.title}</span>
                  <span className="font-normal text-green-600 whitespace-nowrap">{visitCount(s)}</span>
                </div>
              )
            }

            // a container — the OPEN card. One card renders a plain group and a
            // fork; the fork just grows a question line + tab strip. Steps float
            // over the body as board-level siblings, so no inner click bubbles up.
            const editing = editKey === s.key
            const fork = isFork(s)
            const chosen = chosenIdx(s, choices)
            const steps = chosenSteps(s, choices)
            return (
              <div
                key={key}
                data-rstage={s.key}
                data-rdrop={s.key}
                onDragOver={(e: ReactDragEvent) => e.preventDefault()}
                onDrop={(e: ReactDragEvent) => {
                  setMark(null)
                  handleDrop(e, [...pl.path, chosen, steps.length], state)
                }}
                onClick={(e) => {
                  if (marqueeDragRef.current) return
                  selectOn(pl)(e)
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  toggle(s.key!)
                }}
                title="double-click to close · ✎ renames · ⑂ adds a variant"
                className={['absolute rounded-2xl border-2 border-green-500 bg-green-50/50 cursor-pointer transition-[left,top,width,height] duration-200 ease-out', s.optional ? 'border-dashed' : '', dim].join(' ')}
                style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
              >
                <div
                  {...gestures(pl)}
                  data-rhead={s.key}
                  className={['flex items-center gap-1 px-2 cursor-grab rounded-t-2xl', isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : ''].join(' ')}
                  style={{ height: HEAD }}
                >
                  {editing ? (
                    <input
                      data-rretitle={s.key}
                      autoFocus
                      value={s.title}
                      onChange={(e) => state.retitle(s.key!, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      onBlur={() => setEditKey(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'Escape') setEditKey(null)
                      }}
                      className="text-[10.5px] font-bold text-green-800 bg-white border-b border-green-500 outline-none flex-1 min-w-0 px-0.5 rounded-sm"
                    />
                  ) : (
                    <span data-rtitle={s.key} className="text-[10.5px] font-bold text-green-800 truncate flex-1 min-w-0">
                      {s.title}
                    </span>
                  )}
                  <button
                    data-rtitle-edit={s.key}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditKey(editing ? null : s.key!)
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    title={editing ? 'done renaming' : 'rename this group'}
                    className={['shrink-0 text-[10px] leading-none px-1 py-0.5 rounded', editing ? 'text-white bg-green-600' : 'text-green-600 hover:bg-green-200'].join(' ')}
                  >
                    {editing ? '✓' : '✎'}
                  </button>
                  <button
                    data-add-variant={s.key}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation()
                      state.addVariant(s.key!)
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    title="add a variant — a second one makes this a fork"
                    className="shrink-0 text-[11px] leading-none px-1 py-0.5 rounded text-amber-600 hover:bg-amber-100"
                  >
                    ⑂
                  </button>
                  {s.optional && <span className="text-[9px] text-green-600">◇</span>}
                  <span data-rgrab={s.key} className="text-[10px] text-slate-300 select-none px-0.5">
                    ⋮⋮
                  </span>
                </div>

                {/* fork only: the question the tabs answer, and the tab strip.
                    Only the CHOSEN tab's steps show below — the choice is these
                    tabs, not parallel lanes. */}
                {fork && (
                  <>
                    <input
                      data-rquestion={s.key}
                      value={s.question ?? ''}
                      placeholder="add a question…"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => state.setQuestion(s.key!, e.target.value)}
                      className="block w-full px-2 text-[9.5px] italic text-amber-700 bg-transparent outline-none placeholder:text-amber-300"
                      style={{ height: QUESTION_H }}
                    />
                    <div className="flex items-stretch gap-0.5 px-1.5" style={{ height: TAB_H }}>
                      {s.variants.map((vr, k) => (
                        <div
                          key={k}
                          data-tab={`${s.key}.${k}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            pickBranch(s.key!, k)
                          }}
                          className={[
                            'flex-1 min-w-0 flex items-center gap-0.5 px-1 rounded-t border-t border-x cursor-pointer',
                            k === chosen ? 'border-amber-500 bg-amber-100' : 'border-slate-200 bg-white/70 hover:bg-slate-50',
                          ].join(' ')}
                        >
                          <span className={['shrink-0 text-[9px]', k === chosen ? 'text-amber-600' : 'text-slate-400'].join(' ')}>
                            {k === chosen ? '●' : '○'}
                          </span>
                          <input
                            data-tablabel={`${s.key}.${k}`}
                            value={vr.label}
                            placeholder="label…"
                            // focusing a tab's label picks that variant — so a
                            // click anywhere on the tab (the label fills it)
                            // switches to it, and renaming an unchosen variant
                            // brings it to the front first
                            onFocus={() => pickBranch(s.key!, k)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => state.relabelVariant(s.key!, k, e.target.value)}
                            className={['w-full bg-transparent text-[9px] outline-none min-w-0', k === chosen ? 'font-bold text-amber-800' : 'text-slate-500'].join(' ')}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* when the chosen variant is empty, the body is a drop zone
                    rather than a bare card interior */}
                {steps.length === 0 && (
                  <div
                    data-rbody={s.key}
                    onClick={(e) => e.stopPropagation()}
                    onDragOver={(e: ReactDragEvent) => e.preventDefault()}
                    onDrop={(e: ReactDragEvent) => {
                      setMark(null)
                      handleDrop(e, [...pl.path, chosen, 0], state)
                    }}
                    className="absolute inset-x-2 rounded-lg border-2 border-dashed border-slate-300 bg-white/60 flex items-center justify-center text-[9.5px] text-slate-400"
                    style={{ top: headH(s) + PAD, height: EMPTY_BODY_H }}
                  >
                    drop steps here
                  </div>
                )}
              </div>
            )
          })}

          {/* forgiving between-node drop slots — z-0 so nodes (z-20+) still win
              when the pointer is over one, but the dead gaps now catch drops */}
          {slots.map((sl, i) => (
            <div
              key={`slot${i}`}
              data-rslot={pathKey(sl.path)}
              onDragOver={(e: ReactDragEvent) => {
                e.preventDefault()
                e.stopPropagation()
                setMark(null)
                setHotSlot(i)
              }}
              onDragLeave={() => setHotSlot((h) => (h === i ? null : h))}
              onDrop={(e: ReactDragEvent) => {
                setMark(null)
                setHotSlot(null)
                handleDrop(e, sl.path, state)
              }}
              className="absolute z-0"
              style={{ left: sl.x, top: sl.y - SLOTH / 2, width: sl.w, height: SLOTH }}
            >
              {hotSlot === i && (
                <div data-rmark className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-amber-500 pointer-events-none" />
              )}
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

          {/* marquee — the rubber-band while dragging on empty board. #17 */}
          {marquee && (
            <div
              data-marquee
              className="absolute z-40 border border-blue-400 bg-blue-400/10 pointer-events-none"
              style={{
                left: Math.min(marquee.x0, marquee.x1),
                top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0),
                height: Math.abs(marquee.y1 - marquee.y0),
              }}
            />
          )}

          {/* selection box — the bounding rect of the selected run. #17 */}
          {selBox && (
            <div
              data-selbox
              className="absolute z-30 rounded-xl border-2 border-blue-500 bg-blue-500/5 pointer-events-none transition-all duration-200 ease-out"
              style={{ left: selBox.x, top: selBox.y, width: selBox.w, height: selBox.h }}
            />
          )}

          {/* action toolbar — pinned to the selection box (stable). #17 */}
          {state.selected.size > 0 && selBox && (
            <div
              data-fly
              data-seltools
              className="absolute z-40 flex flex-wrap items-center gap-1 px-1.5 py-1 rounded-lg border border-slate-300 bg-white shadow-md transition-[left,top] duration-200 ease-out"
              style={{ left: Math.max(4, Math.min(selBox.x, W - 180)), top: barY, maxWidth: barMaxW }}
            >
              <span className="text-[10px] font-semibold text-blue-600 px-1 select-none">{state.selected.size} selected</span>
              <button
                data-fly-group
                disabled={!state.canGroup}
                onClick={state.groupSelection}
                title="group into stage"
                className="text-[11px] px-2 py-1 rounded border border-green-400 text-green-700 bg-green-50 disabled:opacity-30 hover:bg-green-100"
              >
                ⊞ Group
              </button>
              <button
                data-fly-fork
                disabled={!state.canFork}
                onClick={state.forkSelection}
                title="fork the road here"
                className="text-[11px] px-2 py-1 rounded border border-amber-400 text-amber-800 bg-amber-100 disabled:opacity-30 hover:bg-amber-200"
              >
                ⑂ Fork
              </button>
              <button
                data-fly-opt
                disabled={!state.canOptional}
                onClick={state.toggleOptionalSelection}
                title="toggle optional"
                className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-600 bg-slate-50 disabled:opacity-30 hover:bg-slate-100"
              >
                ◇ Optional
              </button>
              <button
                data-fly-del
                disabled={!state.canDelete}
                onClick={() => {
                  if (selIsContainer && selKey) setDelMenu(delMenu ? null : selKey)
                  else state.deleteSelection()
                }}
                title={selIsContainer ? 'delete… (keep steps / all / variant)' : 'remove'}
                className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-600 disabled:opacity-30 hover:bg-slate-100"
              >
                ✕ Delete{selIsContainer ? '…' : ''}
              </button>
            </div>
          )}

          {/* container-delete decision — keep the chosen steps on the road,
              cascade everything, or (forks) drop just the current variant. */}
          {delMenu && selKey === delMenu && selPlaced && selIsContainer && selStop && selBox && (
            <div
              data-del-menu
              className="absolute z-50 flex flex-col gap-0.5 p-1 rounded-lg border border-slate-300 bg-white shadow-lg text-[10px]"
              style={{ left: Math.max(4, Math.min(selBox.x, W - 200)), top: selBox.y + selBox.h + 6 }}
            >
              <button
                data-del-promote
                onClick={() => {
                  state.promote(selPlaced.path, chosenIdx(selStop, choices))
                  setDelMenu(null)
                }}
                className="text-left px-1.5 py-0.5 rounded text-amber-700 hover:bg-amber-50"
              >
                ↥ keep steps on the road
              </button>
              {selIsFork && (
                <button
                  data-del-variant
                  onClick={() => {
                    state.dropVariant(selPlaced.path, chosenIdx(selStop, choices))
                    setDelMenu(null)
                  }}
                  className="text-left px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100"
                >
                  ⌫ drop this variant only
                </button>
              )}
              <button
                data-del-all
                onClick={() => {
                  state.deleteSelection()
                  setDelMenu(null)
                }}
                className="text-left px-1.5 py-0.5 rounded text-rose-600 hover:bg-rose-50"
              >
                ✕ delete it and everything inside
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
