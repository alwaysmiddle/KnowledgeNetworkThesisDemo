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

import { useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

import { byId, domainOf, DOMAIN_COLOR, topicIds } from '../../corpus/graph'
import type { AuthorState, Path } from './authordraft'
import { pathKey } from './authordraft'
import { bandFor, DT, gapFor, handleDrop } from './authordnd'
import type { Band } from './authordnd'
import { visitCount } from './mockwalk'
import type { ForkStop, StageStop, Stop } from './mockwalk'
import type { HoverBinding } from '../../studio/bus'

const NODEW = 150
const NODEH = 34
const AGAP = 26 // vertical space between siblings — the arrow lives here
const PAD = 10
const HEAD = 28
const MARGIN = 16
const BR_HEAD = 20 // branch label chip height
const BR_GAP = 18 // horizontal gap between branch lanes
const RAIL = 26 // fan-out / fan-in space above and below the lanes
const EMPTY_H = 30 // drop zone height of a branch with no steps yet
const SLOTH = 18 // catch height of a between-nodes drop slot (fills the AGAP)
const SELPAD = 7 // breathing room the selection box leaves around its members
// The action toolbar WRAPS in a narrow slice (review 4), so the space it needs
// above the selection box is no longer one fixed number — reserve too little and
// the bar comes down over the very block it describes, swallowing that block's
// clicks. Derive the rows from the width instead.
const BAR_ONE_LINE_W = 350 // the five controls measured on a single line
const BAR_ROW_H = 26

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
/** a forgiving drop target filling the gap between two siblings (or before the
 * first / after the last) — inserts at `path`, so dropping in the dead space
 * between nodes no longer falls through to append-at-end */
interface Slot {
  path: Path
  x: number
  /** the caret line — the catcher band is centered on it, height SLOTH */
  y: number
  w: number
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
  /** how tall a previewed new lane would be (chip → fan-in), for the + hover */
  h: number
}
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
      return { w: innerW + 2 * PAD, h: HEAD + PAD + stageBodyH(s) + PAD }
    }
    // a fork ALWAYS fans its lanes out (all alternatives visible — #13 review 2):
    // every branch is laid side by side and rejoins below. No hide-until-hover.
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
  const slots: Slot[] = []
  const ctr = { n: 0 }

  const placeFork = (s: ForkStop, p: Path, centerX: number, y: number, w: number, h: number, onRoad: boolean) => {
    const chosen = choices[s.key] ?? 0
    const topY = y + 4
    const botY = y + h - 4
    dots.push({ x: centerX, y: topY, live: onRoad }, { x: centerX, y: botY, live: onRoad })
    questions.push({ forkKey: s.key, question: s.question, x: centerX, y: topY })
    // the fork's own SELECT handle — enlarged (was 16²) so the diamond is an
    // easy click / marquee target, not a pinprick (#13 review 3)
    items.push({ path: p, stop: s, x: centerX - 11, y: topY - 11, w: 22, h: 22, onRoad, skipped: false })
    let lx = centerX - w / 2
    let maxLaneBot = topY
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
      maxLaneBot = Math.max(maxLaneBot, laneBot)
      rails.push({ d: `M ${cx} ${laneBot + 4} C ${cx} ${laneBot + 18}, ${centerX} ${botY - 16}, ${centerX} ${botY}`, live, head: true })
      lx += lane.w + BR_GAP
    })
    // a previewed new lane would span chip → fan-in — hand that height to the +
    addButtons.push({ forkKey: s.key, x: centerX + w / 2 + 6, y: y + RAIL, h: maxLaneBot + 4 - (y + RAIL) })
  }

  const placeList = (list: Stop[], parent: Path, centerX: number, y0: number, onRoad: boolean) => {
    let y = y0
    let prevBottom: number | null = null
    let prevSkipped = false
    let lastW = NODEW
    list.forEach((s, i) => {
      const p = [...parent, i]
      const { w, h } = measure(s)
      const x = centerX - w / 2
      // a forgiving slot in the gap ABOVE this item (before the first, or
      // between it and the previous) — the caret line sits at the gap midpoint
      slots.push({ path: p, x, y: prevBottom === null ? y - 8 : (prevBottom + y) / 2, w })
      lastW = w
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
        placeList(s.steps, p, centerX, y + HEAD + PAD, onRoad && !skipped)
      }
      prevBottom = y + h
      prevSkipped = skipped
      y += h + AGAP
    })
    // trailing slot after the last item — "append to this list" made hittable
    if (list.length && prevBottom !== null)
      slots.push({ path: [...parent, list.length], x: centerX - lastW / 2, y: prevBottom + 8, w: lastW })
  }

  const W = Math.max(NODEW, ...stops.map((s) => measure(s).w)) + 2 * MARGIN
  placeList(stops, [], W / 2, MARGIN, true)
  const bottoms = [...items.map((it) => it.y + it.h), ...emptyLanes.map((l) => l.y + EMPTY_H)]
  const H = (bottoms.length ? Math.max(...bottoms) : 0) + RAIL + MARGIN
  return { items, arrows, rails, bypasses, dots, chips, emptyLanes, questions, addButtons, slots, W, H }
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
  const [mark, setMark] = useState<Mark>(null)
  const [hotSlot, setHotSlot] = useState<number | null>(null)
  // the delete popover: a container delete ASKS (promote / delete all / drop
  // lane) instead of silently cascading — the pathKey of the container it's for
  const [delMenu, setDelMenu] = useState<string | null>(null)
  // marquee (Explorer-style rubber-band): drag on empty board to box-select.
  // coords are in the board's own space; boardRef converts client→board coords.
  const boardRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  // a finished rubber-band still fires a click on whatever ends up under the
  // pointer. Now that a group's whole card is clickable, that stray click would
  // land on the card and replace the box selection with just the card. Swallow
  // exactly one click after a real drag.
  const marqueeDragRef = useRef(false)
  // which group's title is open for editing — renaming is a MODE behind the ✎
  // button, not an always-live field competing with the card's own gestures
  const [editKey, setEditKey] = useState<string | null>(null)
  // hovering a fork's + PREVIEWS the lane it would add (a ghosted lane in the
  // slot the new branch will occupy) instead of only adding on click — the
  // "show me what this does before I commit" the review asked for (#13)
  const [hoverAdd, setHoverAdd] = useState<string | null>(null)

  const toggle = (key: string) => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

  const { items, arrows, rails, bypasses, dots, chips, emptyLanes, questions, addButtons, slots, W, H } =
    layoutRoad(state.stops, collapsed, choices, withOptionals)

  // the single selected block, if it's a container — drives the delete popover
  const selKey = state.selected.size === 1 ? [...state.selected][0] : null
  const selPlaced = selKey ? items.find((pl) => pathKey(pl.path) === selKey) : undefined
  const selStop = selPlaced?.stop
  const selIsContainer = selStop?.kind === 'stage' || selStop?.kind === 'fork'

  // the SELECTION BOX — the bounding rect of every selected block on the board.
  // It makes "what's selected" loud and reads the run as one group; the action
  // toolbar pins to this box (stable) instead of chasing the cursor (a moving
  // target is hard to click). #17.
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
  // pin the toolbar just above the box; if there's no room up top, drop it below
  const barMaxW = Math.max(180, W - 8)
  const barH = Math.max(1, Math.ceil(BAR_ONE_LINE_W / barMaxW)) * BAR_ROW_H + 8
  const barY = selBox ? (selBox.y - barH - 4 >= 0 ? selBox.y - barH - 4 : selBox.y + selBox.h + 4) : 0

  /** Windows-style select: a plain click takes just this block, shift adds or
   * removes. Shared by the node gestures and by a group card's whole surface. */
  const selectOn = (pl: Placed) => (e: ReactMouseEvent) => {
    e.stopPropagation()
    if (e.shiftKey) state.toggleSelect(pl.path)
    else state.selectPaths([pl.path])
    setDelMenu(null)
  }

  /** the block gestures every node shares — visit, pill, header, fork handle */
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
      // clear our own caret when the drag leaves this block — symmetric with the
      // gap slots' onDragLeave, so a preview bar never lingers on a node the
      // pointer has moved off (matters for the map's synthetic-event drag, which
      // has no native dragend to fall back on)
      onDragLeave: () => setMark((m) => (m?.key === key ? null : m)),
      onDrop: (e: ReactDragEvent) => {
        setMark(null)
        setHotSlot(null)
        handleDrop(e, gapFor(e, pl.path, pl.stop), state)
      },
      onClick: selectOn(pl),
    }
  }

  // ── marquee (rubber-band) select ──────────────────────────────────────────
  // Drag on the empty board to box-select everything the rectangle touches.
  // A plain drag replaces the selection; holding shift adds to it. Starting on
  // a node/control is left to that element (its own drag/click), never a marquee.
  const boardPoint = (e: ReactPointerEvent) => {
    const r = boardRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onBoardPointerDown = (e: ReactPointerEvent) => {
    marqueeDragRef.current = false // cleared FIRST: every press re-arms clicks
    if (e.button !== 0 || !boardRef.current) return
    // Only empty canvas starts a marquee — not a node, control, or overlay.
    // A group CARD is on that list since review 5: pressing it sets pointer
    // capture on this pane, and a captured press redirects the click here too,
    // so the card would never receive the click that selects it. Its own 10px
    // gutter is a poor rubber-band origin anyway — the open board around it is
    // where you actually start a band.
    if ((e.target as HTMLElement).closest('[data-rnode],[data-fork],[data-rhead],[data-rstage],[data-rstage-closed],[data-fly],[data-del-menu],[data-brpick],[data-brlabel],[data-add-branch],[data-brdrop],[data-rquestion],[data-rretitle],button,input,select')) return
    const { x, y } = boardPoint(e)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setMarquee({ x0: x, y0: y, x1: x, y1: y })
    if (!e.shiftKey) state.selectPaths([]) // fresh drag clears first
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
    // a click (no drag) shouldn't select the whole board — require a real box
    if (right - left > 4 || bottom - top > 4) {
      marqueeDragRef.current = true // ...and swallow the click this drag will fire
      const hit = items.filter((pl) => pl.x < right && pl.x + pl.w > left && pl.y < bottom && pl.y + pl.h > top)
      if (hit.length) state.selectPaths(hit.map((pl) => pl.path), e.shiftKey)
    }
    setMarquee(null)
  }

  const railStroke = (r: Rail) => ({
    stroke: r.live ? '#d97706' : '#94a3b8',
    strokeWidth: r.live ? 2.5 : 1.5,
    strokeDasharray: r.live ? undefined : '4 3',
    markerEnd: r.head ? (r.live ? 'url(#wt-road-head)' : 'url(#wt-road-ghost)') : undefined,
  })

  // the marquee listens on the whole SCROLL PANE, not just the board div: in a
  // narrow vertical slice the board is content-width, so its own empty margin
  // can be too thin — or scrolled off — to grab. Coordinates still resolve
  // against the board, so a band started out here hit-tests exactly the same.
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
        <div
          ref={boardRef}
          className="relative mx-auto my-2 select-none"
          style={{ width: W, height: H }}
        >
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
            // ghost (off-road) and bypassed stops dim — UNLESS selected, so an
            // edit inside an unchosen branch lane visibly lands on the node
            const dim = (!pl.onRoad || pl.skipped) && !isSelected ? 'opacity-50' : ''

            if (s.kind === 'visit') {
              // an unbound placeholder slot — a picker, not a node chip; the
              // node it binds names the lane (KnowledgeNetworkDemo#13)
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

            if (s.kind === 'fork') {
              return (
                <div
                  key={key}
                  {...gestures(pl)}
                  data-fork={s.key}
                  title={s.question}
                  className={[
                    'absolute z-40 rotate-45 border-2 border-amber-600 bg-amber-400 cursor-grab shadow-sm',
                    'transition-[left,top,width,height] duration-200 ease-out',
                    isSelected ? 'ring-2 ring-blue-500' : 'hover:bg-amber-300',
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
                  // DOUBLE-CLICK opens it (review 5) — the folder gesture
                  // everyone already knows, replacing the ⊞/⊟ pinprick button
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    toggle(s.key)
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
                  <span className="truncate">{s.title}</span>
                  <span className="font-normal text-green-600 whitespace-nowrap">{visitCount(s)}</span>
                </div>
              )
            }

            // THE WHOLE CARD IS LIVE (review 5): every pixel of the group —
            // header, title, green backdrop — selects on click and closes on
            // double-click. The title used to be a live text field sitting in
            // the middle of it, and that one always-editable strip was a dead
            // zone the gestures fell into, which read as an unresponsive card.
            // Renaming now waits behind the ✎ button, so nothing on the card
            // has to be exempt. Safe target: a stage's steps are board-level
            // siblings drawn OVER this box, not DOM children, so no inner node
            // can bubble a stray click up into its own parent.
            const editing = editKey === s.key
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
                onClick={(e) => {
                  if (marqueeDragRef.current) return // that click came from a rubber-band
                  selectOn(pl)(e)
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  toggle(s.key)
                }}
                title="double-click to close · ✎ renames"
                className={['absolute rounded-2xl border-2 border-green-500 bg-green-50/50 cursor-pointer transition-[left,top,width,height] duration-200 ease-out', s.optional ? 'border-dashed' : '', dim].join(' ')}
                style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
              >
                <div
                  {...gestures(pl)}
                  data-rhead={s.key}
                  className={[
                    'flex items-center gap-1 px-2 cursor-grab rounded-t-2xl',
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : '',
                  ].join(' ')}
                  style={{ height: HEAD }}
                >
                  {editing ? (
                    <input
                      data-rretitle={s.key}
                      autoFocus
                      value={s.title}
                      onChange={(e) => state.retitle(s.key, e.target.value)}
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
                    // press without stealing focus: otherwise ✓ blurs the field
                    // first, the blur closes edit mode, and this click — reading
                    // the FRESH props — would helpfully reopen it
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditKey(editing ? null : s.key)
                    }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    title={editing ? 'done renaming' : 'rename this group'}
                    className={['shrink-0 text-[10px] leading-none px-1 py-0.5 rounded', editing ? 'text-white bg-green-600' : 'text-green-600 hover:bg-green-200'].join(' ')}
                  >
                    {editing ? '✓' : '✎'}
                  </button>
                  {s.optional && <span className="text-[9px] text-green-600">◇</span>}
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
              onMouseEnter={() => setHoverAdd(b.forkKey)}
              onMouseLeave={() => setHoverAdd((h) => (h === b.forkKey ? null : h))}
              title="add a branch"
              className="absolute z-40 w-[22px] h-[22px] rounded-full border border-dashed border-amber-400 text-amber-600 text-[13px] leading-none bg-white hover:bg-amber-100"
              style={{ left: Math.min(b.x, W - 26), top: b.y }}
            >
              +
            </button>
          ))}

          {/* + hover PREVIEW — the lane the new branch would open, shown before
              the click. #13. It is a floating CARD, not a fake in-place lane:
              since review 4 the road lives in a narrow slice, and there is
              rarely real width beside a fork to draw the lane where it lands.
              So it is clamped into the board (never clipped by the pane) and
              made opaque + shadowed, which reads as "here is what you'd get"
              rather than as an edit to the lane it happens to cover. */}
          {addButtons
            .filter((b) => b.forkKey === hoverAdd)
            .map((b) => (
              <div
                key={`prev-${b.forkKey}`}
                data-add-preview={b.forkKey}
                className="absolute z-50 pointer-events-none flex flex-col items-stretch rounded-xl bg-white/95 shadow-lg ring-1 ring-amber-300 p-1.5"
                style={{ left: Math.max(2, Math.min(b.x + 20, W - NODEW - 6)), top: b.y, width: NODEW, height: b.h }}
              >
                <div
                  className="rounded-full border border-dashed border-amber-400 bg-amber-100 text-[9px] font-semibold text-amber-600 flex items-center justify-center shrink-0"
                  style={{ height: BR_HEAD }}
                >
                  ＋ new branch
                </div>
                <div className="mt-1.5 flex-1 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center text-[9px] text-amber-400">
                  drop steps here
                </div>
              </div>
            ))}

          {/* forgiving between-node drop slots — z-0 so nodes (z-20+) still win
              when the pointer is over one, but the dead gaps now catch drops
              and show a caret instead of falling through to append-at-end */}
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
                <div
                  data-rmark
                  className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded bg-amber-500 pointer-events-none"
                />
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

          {/* selection box — the bounding rect of the selected run, drawn on
              the board so the group is unmistakable (light blue). pointer-events
              -none so it never eats a click meant for a node beneath it. #17 */}
          {selBox && (
            <div
              data-selbox
              className="absolute z-30 rounded-xl border-2 border-blue-500 bg-blue-500/5 pointer-events-none transition-all duration-200 ease-out"
              style={{ left: selBox.x, top: selBox.y, width: selBox.w, height: selBox.h }}
            />
          )}

          {/* action toolbar — pinned to the selection box (stable), labeled and
              comfortably sized. Replaces the old cursor-anchored popup but keeps
              the same data-fly* hooks, so actions/drivers are unchanged. #17 */}
          {state.selected.size > 0 && selBox && (
            <div
              data-fly
              data-seltools
              // it WRAPS rather than running off the edge — since review 4 the
              // road lives in a narrow vertical slice, and a one-line bar of
              // labelled buttons is wider than the board it is pinned inside
              className="absolute z-40 flex flex-wrap items-center gap-1 px-1.5 py-1 rounded-lg border border-slate-300 bg-white shadow-md transition-[left,top] duration-200 ease-out"
              style={{ left: Math.max(4, Math.min(selBox.x, W - 180)), top: barY, maxWidth: barMaxW }}
            >
              <span className="text-[10px] font-semibold text-blue-600 px-1 select-none">
                {state.selected.size} selected
              </span>
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
                  // a container delete ASKS; a leaf just goes
                  if (selIsContainer && selKey) setDelMenu(delMenu ? null : selKey)
                  else state.deleteSelection()
                }}
                title={selIsContainer ? 'delete… (choose promote / all / lane)' : 'remove'}
                className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-600 disabled:opacity-30 hover:bg-slate-100"
              >
                ✕ Delete{selIsContainer ? '…' : ''}
              </button>
            </div>
          )}

          {/* container-delete decision — promote children, cascade everything,
              or (forks) drop just the current lane. Anchored under the selection
              box so a stage/fork is never silently cascaded. */}
          {delMenu && selKey === delMenu && selPlaced && selIsContainer && selBox && (
            <div
              data-del-menu
              className="absolute z-50 flex flex-col gap-0.5 p-1 rounded-lg border border-slate-300 bg-white shadow-lg text-[10px]"
              style={{ left: Math.max(4, Math.min(selBox.x, W - 200)), top: selBox.y + selBox.h + 6 }}
            >
              <button
                data-del-promote
                onClick={() => {
                  if (selStop?.kind === 'fork') state.resolveForkTo(selPlaced.path, choices[selStop.key] ?? 0)
                  else state.promoteSelection()
                  setDelMenu(null)
                }}
                className="text-left px-1.5 py-0.5 rounded text-amber-700 hover:bg-amber-50"
              >
                ↥ keep steps on the road
              </button>
              {selStop?.kind === 'fork' && (
                <button
                  data-del-lane
                  onClick={() => {
                    state.dropLane(selPlaced.path, choices[selStop.key] ?? 0)
                    setDelMenu(null)
                  }}
                  className="text-left px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100"
                >
                  ⌫ drop this lane only
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
