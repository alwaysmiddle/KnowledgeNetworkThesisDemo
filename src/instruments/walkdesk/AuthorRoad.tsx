// The RAILROAD editor — a top-down node chart where the road may fork. A fork
// is a GROUP CARD with more than one variant. Since #19 that choice showed as a
// TAB STRIP (one variant's steps at a time); since the comparator (#18) it
// shows as side-by-side COLUMNS instead — every variant is a whole route laid
// out at once, so alternatives can be compared and recombined rather than
// flipped between. #19's one-column rule is deliberately reversed here; the
// horizontal width it saved is spent, under control, on the comparison.
//
// One card renders both: a plain group (one variant) is just header + body — a
// single column, unchanged. A fork (two or more) grows a question line and then
// one COLUMN per variant, each with its own header (● chosen · label · ✕ ·
// drag-out). The CHOSEN column is the road — bright, numbered, live arrows;
// the others show muted with ghost arrows (the same onRoad/dim machinery a
// skipped optional uses). "⑂ add a variant" in the header still branches — a
// plain group grows a second column and becomes a fork.
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
import { chosenIdx, chosenSteps, isFork, isLeaf, visitCount } from './mockwalk'
import type { Stop } from './mockwalk'
import type { HoverBinding } from '../../studio/bus'

const NODEW = 150
const NODEH = 34
const AGAP = 26 // vertical space between siblings — the arrow lives here
const PAD = 10
const HEAD = 24 // container header (title) row — 24 fits 20px chrome with 2px either side (0005 D-coupling)
const MARGIN = 16
const QUESTION_H = 18 // the fork question line, above the columns
const COLGAP = 12 // horizontal space between a fork's variant columns
const COLHEAD = 24 // a variant column's header (● chosen · label · ✕ · drag-out) — 24 so the ✕ hover fill doesn't clip (0005 D-coupling)
const VIS_BAR_H = 26 // version-visibility namecard bar under a fork's columns (0005 D5); = BAR_ROW_H so both bars share a row height
const EMPTY_BODY_H = 30 // drop zone height when a variant has no steps
const SLOTH = 18 // catch height of a between-nodes drop slot (fills the AGAP)
const SELPAD = 7 // breathing room the selection box leaves around its members
// The action toolbar WRAPS in a narrow slice (review 4), so the space it needs
// above the selection box is derived from the width, not one fixed number.
const BAR_ONE_LINE_W = 430
const BAR_ROW_H = 26

// Elevation grammar (0005 D1 + tokens/elevation.css + tokens/colors.css):
// containment reads as DEPTH, not hue. A leaf is flat; an OPEN container is a
// recessed WELL whose surface darkens one step per nesting level; a SHUT
// container is the one persistently-raised thing, with stacked silhouettes
// behind it. These mirror the design tokens as STRINGS — so the numeric
// spacing-parity test (tokens.test.ts) does not cover them, and Job B (wiring
// color/elevation through a Tailwind @theme block) is what will make them a
// single source. Until then this block is the one place they live in the code.
// Containment-grammar surfaces are wired tokens now (#44): the values live once,
// in src/index.css (@theme), guarded against the design mirror by tokens.test.ts.
// Here we only name them. wellFill picks the per-depth tint (--surface-well-1..4,
// 1-indexed, clamped at 4); --sink-well / --lift-node / --border-well* are used
// inline as var(--…). Nothing to keep in sync by hand.
const wellFill = (depth: number): string => `var(--surface-well-${Math.min(depth + 1, 4)})`

/** the visibility key for one variant of one fork — the id the bottom namecard
 * bar toggles. Absent from the `hidden` set means the column is shown. */
const visKey = (s: Stop, k: number): string => `${s.key!}.${k}`
/** which variant columns a container SHOWS, in variant order. A fork shows every
 * variant NOT hidden by the visibility bar (0005 D5 — default all shown); a plain
 * group shows its single column. Never empty: the bar enforces a floor of one and
 * a group always has its one. Visibility is independent of which variant is
 * ACTIVE (chosenIdx) — hiding the active column is legal, the 5th cell in 0005. */
const visibleVariantIdxs = (s: Stop, hidden: ReadonlySet<string>): number[] =>
  isFork(s) ? s.variants.map((_, k) => k).filter((k) => !hidden.has(visKey(s, k))) : s.variants.map((_, k) => k)

/** the rows a container reserves above its column band: the header, plus (fork
 * only) a description/question row. A fork always shows its columns now — the old
 * fan toggle is gone, so this gates on isFork rather than on an expand flag. */
const headH = (s: Stop): number => HEAD + (isFork(s) ? QUESTION_H : 0)
/** the y-offset from a card's top to where its step columns begin: head, pad, and
 * (fork only) the per-variant column-header band (COLHEAD). One source of truth
 * shared by the layout math, the column headers, and the empty-column drop zones. */
const bodyTop = (s: Stop): number => headH(s) + PAD + (isFork(s) ? COLHEAD : 0)
/** the extra height a fork reserves BELOW its columns for the visibility bar. */
const visBarH = (s: Stop): number => (isFork(s) ? VIS_BAR_H : 0)

type Mark = { key: string; band: Band } | null

/** one variant column's box (width holds its widest step, height its stack) */
interface Col {
  w: number
  h: number
}
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
  /** container nesting depth (0 at the board's top level, +1 per open container
   * we recurse into) — drives the recessed well's per-level surface tint. Counts
   * containers, NOT path hops: a fork's columns are the same well, not deeper. */
  depth: number
  /** an expanded container's per-variant column boxes, in variant order — the
   * render pass reads these to place column headers and empty-column drop zones */
  cols?: Col[]
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
  hidden: ReadonlySet<string>,
) {
  // each SHOWN variant is its own column (#18): measure each one's stack, then
  // lay the columns side by side. A plain group shows its single column; a fork
  // shows every variant the visibility bar hasn't hidden (0005 D5).
  // visibleVariantIdxs decides which variants are shown.
  const columnsOf = (s: Stop): Col[] =>
    visibleVariantIdxs(s, hidden).map((k) => {
      const kids = s.variants[k].steps.map(measure)
      const w = Math.max(NODEW, ...kids.map((c) => c.w))
      const h = kids.length ? kids.reduce((acc, c) => acc + c.h, 0) + (kids.length - 1) * AGAP : EMPTY_BODY_H
      return { w, h }
    })
  const measure = (s: Stop): { w: number; h: number; cols?: Col[] } => {
    if (isLeaf(s) || collapsed.has(s.key!)) return { w: NODEW, h: NODEH }
    const cols = columnsOf(s)
    const colsW = cols.reduce((acc, c) => acc + c.w, 0) + (cols.length - 1) * COLGAP
    const innerW = Math.max(NODEW, colsW)
    const bodyH = Math.max(...cols.map((c) => c.h))
    return { w: innerW + 2 * PAD, h: bodyTop(s) + bodyH + PAD + visBarH(s), cols }
  }

  const items: Placed[] = []
  const arrows: Arrow[] = []
  const bypasses: Bypass[] = []
  const slots: Slot[] = []
  const ctr = { n: 0 }

  const placeList = (list: Stop[], parent: Path, centerX: number, y0: number, onRoad: boolean, depth: number) => {
    let y = y0
    let prevBottom: number | null = null
    let prevSkipped = false
    let lastW = NODEW
    list.forEach((s, i) => {
      const p = [...parent, i]
      const m = measure(s)
      const { w, h } = m
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
        items.push({ path: p, stop: s, x, y, w, h, order, onRoad, skipped, depth })
      } else if (collapsed.has(s.key!)) {
        items.push({ path: p, stop: s, x, y, w, h, onRoad, skipped, depth })
      } else {
        const cols = m.cols!
        items.push({ path: p, stop: s, x, y, w, h, onRoad, skipped, depth, cols })
        // lay each SHOWN variant out as its own column, centered as a group under
        // the card. Only the CHOSEN column is the road (live arrows, order
        // numbers); the rest pass onRoad=false, so the same dim/ghost machinery a
        // skipped optional uses renders them muted — no separate styling. cols[]
        // is indexed by visible position, s.variants by variant index.
        const vis = visibleVariantIdxs(s, hidden)
        const chosen = chosenIdx(s, choices)
        const colsW = cols.reduce((acc, c) => acc + c.w, 0) + (cols.length - 1) * COLGAP
        let cx = centerX - colsW / 2
        const top = y + bodyTop(s)
        vis.forEach((k, ci) => {
          const cw = cols[ci].w
          const steps = s.variants[k].steps
          if (steps.length) placeList(steps, [...p, k], cx + cw / 2, top, onRoad && !skipped && k === chosen, depth + 1)
          cx += cw + COLGAP
        })
      }
      prevBottom = y + h
      prevSkipped = skipped
      y += h + AGAP
    })
    if (list.length && prevBottom !== null)
      slots.push({ path: [...parent, list.length], x: centerX - lastW / 2, y: prevBottom + 8, w: lastW })
  }

  const W = Math.max(NODEW, ...stops.map((s) => measure(s).w)) + 2 * MARGIN
  placeList(stops, [], W / 2, MARGIN, true, 0)
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
  // which variant COLUMNS are hidden — the bottom visibility bar's state (0005
  // D5). Keyed `${forkKey}.${idx}`; absent = shown, so the default (empty set) is
  // every version visible. This is the multi-select VISIBILITY channel, distinct
  // from the single-select ACTIVE channel (choices/chosenIdx) — a version can be
  // visible-but-inactive or, legally, hidden-but-active.
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [mark, setMark] = useState<Mark>(null)
  const [hotSlot, setHotSlot] = useState<number | null>(null)
  // deleting a variant that carries real steps ASKS first (#33) — the fork's
  // path + which variant + how many steps would go, so the ✕ on a tab never
  // silently discards authored work. Empty routes skip straight to the drop.
  const [confirmVar, setConfirmVar] = useState<{ path: Path; idx: number; n: number } | null>(null)
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
  // toggle one version's visibility, with a FLOOR OF ONE (0005): the last shown
  // column can't be hidden — a fork with no visible column is a bare header with
  // nothing to draw, so it's prevented rather than designed.
  const toggleHidden = (s: Stop, k: number) => {
    const id = visKey(s, k)
    const next = new Set(hidden)
    if (next.has(id)) next.delete(id)
    else {
      const shownNow = s.variants.filter((_, i) => !next.has(visKey(s, i))).length
      if (shownNow <= 1) return // floor of one
      next.add(id)
    }
    setHidden(next)
  }

  const { items, arrows, bypasses, slots, W, H } = layoutRoad(state.stops, collapsed, choices, withOptionals, hidden)

  // the single selected block, if it's a container — drives the delete popover
  const selKey = state.selected.size === 1 ? [...state.selected][0] : null
  const selPlaced = selKey ? items.find((pl) => pathKey(pl.path) === selKey) : undefined
  const selStop = selPlaced?.stop

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
    if ((e.target as HTMLElement).closest('[data-rnode],[data-rhead],[data-rstage],[data-rstage-closed],[data-fly],[data-varconfirm],[data-col],[data-collabel],[data-visbar],[data-rquestion],[data-rretitle],[data-rbody],button,input,select')) return
    const { x, y } = boardPoint(e)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    setMarquee({ x0: x, y0: y, x1: x, y1: y })
    if (!e.shiftKey) state.selectPaths([])
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
                    // D1/D3 (0005): a leaf is the quietest thing on the road —
                    // flat white, one 2px domain border, NEUTRAL ink. Domain now
                    // lives in the border (and the rail dot) only; --domain-sec
                    // #eda100 failed contrast as 10.5px text. It lifts (--lift-node,
                    // ~shadow-md) only while grabbed; at rest it casts no shadow.
                    'absolute z-20 rounded-full border-2 bg-white px-2.5 flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-700 cursor-grab active:shadow-md',
                    'transition-[left,top,width,height] duration-200 ease-out',
                    // D10 (0005): an optional stop is drawn EXACTLY like any other —
                    // no dashed edge. A dash reads as emphasis, backwards for a stop
                    // that might not be walked. The ghost bypass rail + the ◇ gutter
                    // badge carry optionality; optionality is a fact about the ROUTE,
                    // not the stop.
                    dim,
                    isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : sync.lit(s.node) ? 'ring-2 ring-sky-300' : '',
                  ].join(' ')}
                  style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h, borderColor: color }}
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
              // D1 (0005): a SHUT group is the only persistently-RAISED thing on
              // the road — it behaves as one stop, so it lifts (--lift-node). An
              // open well, by contrast, is recessed and casts nothing.
              // D2 (0005): behind the pill, two stacked silhouettes peek out
              // down-right (within --road-hatch = 6px) so a fold reads as a FOLDED
              // STACK, not a leaf, without opening it. The plates are decorative —
              // no gestures, no data, pointer-events-none so the peeking corner
              // never steals the double-click — and they ride the same relayout
              // transition as the pill so the stack moves as one.
              const plate = 'absolute rounded-full border pointer-events-none transition-[left,top,width,height] duration-200 ease-out'
              const plateStyle = { width: pl.w, height: pl.h, background: '#fff', borderColor: 'var(--border-well-strong)', zIndex: 20 }
              return [
                <div key={`${key}-p2`} aria-hidden className={[plate, dim].join(' ')} style={{ ...plateStyle, left: pl.x + 5, top: pl.y + 5 }} />,
                <div key={`${key}-p1`} aria-hidden className={[plate, dim].join(' ')} style={{ ...plateStyle, left: pl.x + 2.5, top: pl.y + 2.5 }} />,
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
                    // neutral white, raised, a stronger neutral edge than an open
                    // well's — depth + the stack say "group", not green.
                    'absolute z-20 rounded-full border px-2.5 flex items-center gap-1.5 text-[10.5px] font-bold text-slate-700 cursor-grab',
                    'transition-[left,top,width,height] duration-200 ease-out',
                    // D10 (0005): an optional stop is drawn EXACTLY like any other —
                    // no dashed edge. A dash reads as emphasis, backwards for a stop
                    // that might not be walked. The ghost bypass rail + the ◇ gutter
                    // badge carry optionality; optionality is a fact about the ROUTE,
                    // not the stop.
                    dim,
                    isSelected ? 'ring-2 ring-blue-500' : mark?.key === key && mark.band === 'inside' ? 'ring-2 ring-green-500' : 'hover:bg-slate-50',
                  ].join(' ')}
                  style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h, background: '#fff', borderColor: 'var(--border-well-strong)', boxShadow: 'var(--lift-node)' }}
                >
                  <span className="truncate">{s.title}</span>
                  {isFork(s) && (
                    // shut fork header (0005 D2 + 0006): no ⑂ — the active route's
                    // label stands in for it, since forking moved to a button.
                    <span className="shrink-0 font-normal text-slate-400 whitespace-nowrap">
                      · {s.variants[chosenIdx(s, choices)]?.label || `V${chosenIdx(s, choices) + 1}`}
                    </span>
                  )}
                  <span className="font-normal text-slate-400 whitespace-nowrap">{visitCount(s)}</span>
                </div>,
              ]
            }

            // a container — the OPEN card. A plain group and a collapsed fork are
            // one column; a FANNED fork grows a question line and one COLUMN per
            // variant. Steps float over the body as board-level siblings, so no
            // inner click bubbles up; the card only draws headers and empty zones.
            const editing = editKey === s.key
            const fork = isFork(s)
            const chosen = chosenIdx(s, choices)
            const steps = chosenSteps(s, choices)
            // the variant indices this card SHOWS, and where each of their columns
            // sits WITHIN the card — centered as a group, mirroring layoutRoad so
            // the headers and empty zones land exactly over their floating steps.
            const vis = visibleVariantIdxs(s, hidden)
            const cols = pl.cols ?? []
            const colsW = cols.reduce((a, c) => a + c.w, 0) + Math.max(0, cols.length - 1) * COLGAP
            const colLeft: number[] = []
            {
              let cx = (pl.w - colsW) / 2
              for (const c of cols) {
                colLeft.push(cx)
                cx += c.w + COLGAP
              }
            }
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
                title="double-click to close · ✎ renames"
                // Elevation grammar (0005 D1): an OPEN container is RECESSED — a
                // well sunk into the board, not a green-tinted card. Its surface
                // darkens one step per nesting depth (wellFill) and it carries the
                // inset --sink-well shadow, so containment reads as depth and keeps
                // reading when wells nest. The green border/wash is retired; a
                // neutral hairline is all an open well needs. D10: an optional open
                // card is drawn like any other — the bypass rail says it may skip.
                className={['absolute rounded-2xl border cursor-pointer transition-[left,top,width,height] duration-200 ease-out', dim].join(' ')}
                style={{
                  left: pl.x,
                  top: pl.y,
                  width: pl.w,
                  height: pl.h,
                  background: wellFill(pl.depth),
                  borderColor: 'var(--border-well)',
                  boxShadow: 'var(--sink-well)',
                }}
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
                      className="text-[10.5px] font-bold text-slate-700 bg-white border-b border-slate-400 outline-none flex-1 min-w-0 px-0.5 rounded-sm"
                    />
                  ) : (
                    <span data-rtitle={s.key} className="text-[10.5px] font-bold text-slate-700 truncate flex-1 min-w-0">
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
                    className={['shrink-0 text-[10px] leading-none px-1 py-0.5 rounded', editing ? 'text-white bg-slate-600' : 'text-slate-500 hover:bg-slate-200'].join(' ')}
                  >
                    {editing ? '✓' : '✎'}
                  </button>
                  {/* fork gesture (⑂) and the fan toggle moved OFF the node face
                      (0006): forking is a toolbar button now, and a fork always
                      shows its visible columns — visibility lives in the bottom
                      namecard bar, not an all-or-nothing fan. */}
                  {s.optional && <span className="text-[9px] text-slate-400">◇</span>}
                  <span data-rgrab={s.key} className="text-[10px] text-slate-300 select-none px-0.5">
                    ⋮⋮
                  </span>
                </div>

                {/* a fork: a description row, then one HEADER per VISIBLE variant
                    column (in visible order ci — a hidden version has no column).
                    Each header is that route's handle — click to make it ACTIVE
                    (the ● radio, light blue per 0006), drag out to lift it onto the
                    road (#33). Steps float over the body as board-level items,
                    placed by layoutRoad; the header just sits atop them. */}
                {fork && (
                  <>
                    <input
                      data-rquestion={s.key}
                      value={s.question ?? ''}
                      placeholder="describe this fork…"
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => state.setQuestion(s.key!, e.target.value)}
                      className="block w-full px-2 text-[9.5px] text-slate-500 bg-transparent outline-none placeholder:text-slate-300"
                      style={{ height: QUESTION_H }}
                    />
                    {vis.map((k, ci) => {
                      const vr = s.variants[k]
                      return (
                        <div
                          key={k}
                          data-col={`${s.key}.${k}`}
                          draggable
                          // the header IS the route's handle: drag it onto the road
                          // and extractVariant lifts this variant out as its own
                          // group at the drop point (#33).
                          onDragStart={(e) => {
                            e.stopPropagation()
                            e.dataTransfer.setData(DT, `var:${pathKey(pl.path)}~${k}`)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragEnd={() => {
                            setMark(null)
                            setHotSlot(null)
                          }}
                          // clicking the header makes this column ACTIVE (the road).
                          // Visibility (the bottom bar) and active (this ●) are
                          // separate channels — 0005 D5.
                          onClick={(e) => {
                            e.stopPropagation()
                            pickBranch(s.key!, k)
                          }}
                          title="click to make this the active road · drag out to lift it onto the road"
                          // z-30 so the header wins over the z-0 between-node drop
                          // slots that share its band at the top of the column
                          className={[
                            'group absolute z-30 flex items-center gap-0.5 px-1 rounded-md border cursor-grab',
                            k === chosen ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white/70 hover:bg-slate-50',
                          ].join(' ')}
                          style={{ left: colLeft[ci], top: headH(s) + PAD, width: cols[ci]?.w, height: COLHEAD }}
                        >
                          <span className={['shrink-0 text-[9px]', k === chosen ? 'text-sky-500' : 'text-slate-400'].join(' ')}>
                            {k === chosen ? '●' : '○'}
                          </span>
                          <input
                            data-collabel={`${s.key}.${k}`}
                            // not a drag source itself — the header is, so a drag
                            // anywhere on it (label included) lifts the route
                            draggable={false}
                            value={vr.label}
                            placeholder="label…"
                            // NB no onFocus→pickBranch: keyboard-tabbing to READ a
                            // label used to rewrite the plan (canUndo went true from
                            // pure reading). Active is the ● control alone now (0005
                            // D5) — relabelling a route no longer activates it.
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => state.relabelVariant(s.key!, k, e.target.value)}
                            title={vr.label || undefined}
                            className={['w-full bg-transparent text-[9px] outline-none min-w-0 text-ellipsis', k === chosen ? 'font-bold text-sky-700' : 'text-slate-500'].join(' ')}
                          />
                          {/* delete THIS route (#33). A route with real steps asks
                              first; an empty one drops immediately. Down to one
                              variant, dropVariant leaves a plain group. */}
                          <button
                            data-col-del={`${s.key}.${k}`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => {
                              e.stopPropagation()
                              const real = vr.steps.filter((st) => !(isLeaf(st) && st.unset))
                              if (real.length === 0) state.dropVariant(pl.path, k)
                              else setConfirmVar({ path: pl.path, idx: k, n: real.length })
                            }}
                            title="delete this route"
                            className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 text-[9px] leading-none px-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            ✕
                          </button>
                        </div>
                      )
                    })}
                  </>
                )}

                {/* each SHOWN empty variant column gets its own drop zone under
                    its header, so any visible route can be grown independently. A
                    plain group shows just its one column, so this reduces to the
                    old single "drop steps here" body. Empty is GREY, not red —
                    0005: unfinished, not wrong. */}
                {vis.map((k, ci) =>
                  s.variants[k].steps.length === 0 ? (
                    <div
                      key={`empty-${k}`}
                      data-rbody={`${s.key}.${k}`}
                      onClick={(e) => e.stopPropagation()}
                      onDragOver={(e: ReactDragEvent) => e.preventDefault()}
                      onDrop={(e: ReactDragEvent) => {
                        setMark(null)
                        handleDrop(e, [...pl.path, k, 0], state)
                      }}
                      className="absolute z-30 rounded-lg border-2 border-dashed border-slate-300 bg-white/60 flex items-center justify-center text-[9.5px] text-slate-400"
                      style={{ left: colLeft[ci], top: bodyTop(s), width: cols[ci]?.w, height: EMPTY_BODY_H }}
                    >
                      drop steps here
                    </div>
                  ) : null,
                )}

                {/* the VISIBILITY bar (0005 D5): one square-checkbox namecard per
                    variant — ☑ shown / ☐ hidden — the multi-select viewport control.
                    Distinct from ACTIVE in BOTH shape and hue: square + ink here vs
                    the round light-blue ● in the column header. The ● repeats on the
                    active namecard so hiding the active version is never silent (the
                    legal 5th cell). Floor of one: toggleHidden won't hide the last. */}
                {fork && (
                  <div
                    data-visbar={s.key}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute flex items-center gap-1 overflow-x-auto px-1"
                    style={{ left: PAD, top: pl.h - VIS_BAR_H, width: pl.w - 2 * PAD, height: VIS_BAR_H }}
                  >
                    {s.variants.map((vr, k) => {
                      const shown = !hidden.has(visKey(s, k))
                      return (
                        <button
                          key={k}
                          data-vischip={`${s.key}.${k}`}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleHidden(s, k)
                          }}
                          title={shown ? 'hide this version' : 'show this version'}
                          className={[
                            'shrink-0 flex items-center gap-0.5 px-1 h-[18px] rounded-sm border text-[9px] whitespace-nowrap',
                            shown ? 'border-slate-400 text-slate-700 bg-white' : 'border-slate-200 text-slate-400 bg-slate-50',
                          ].join(' ')}
                        >
                          <span className="shrink-0 leading-none">{shown ? '☑' : '☐'}</span>
                          <span className="truncate max-w-[64px]">{vr.label || `V${k + 1}`}</span>
                          {k === chosen && <span className="shrink-0 text-sky-500 leading-none">●</span>}
                        </button>
                      )
                    })}
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
              {/* ungroup (#33) — remove the group node, keep its steps on the
                  road. The inverse of Group, enabled only for a single container. */}
              <button
                data-fly-ungroup
                disabled={!state.canPromote}
                onClick={() => {
                  if (selPlaced && selStop) state.promote(selPlaced.path, chosenIdx(selStop, choices))
                }}
                title={
                  selStop && isFork(selStop)
                    ? 'a fork can’t be ungrouped — delete its extra routes first (✕ on a tab)'
                    : 'ungroup — remove the group, keep its steps on the road'
                }
                className="text-[11px] px-2 py-1 rounded border border-amber-400 text-amber-700 bg-amber-50 disabled:opacity-30 hover:bg-amber-100"
              >
                ⎍ Ungroup
              </button>
              {/* fork gesture, moved off the node face (0006): add a version to a
                  selected container — the second one turns a group into a fork. */}
              <button
                data-fly-fork
                disabled={!selStop || isLeaf(selStop)}
                onClick={() => {
                  if (selStop) state.addVariant(selStop.key!)
                }}
                title="add a version — a second one makes this group a fork"
                className="text-[11px] px-2 py-1 rounded border border-sky-400 text-sky-700 bg-sky-50 disabled:opacity-30 hover:bg-sky-100"
              >
                ⑂ Version
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
              {/* delete (#33) — a direct action now, no popover: a container
                  takes everything inside with it (undoable). Ungroup is the
                  keep-the-steps arm; dropping one route lives on its tab ✕. */}
              <button
                data-fly-del
                disabled={!state.canDelete}
                onClick={state.deleteSelection}
                title="delete — a group takes everything inside it (undoable)"
                className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-600 disabled:opacity-30 hover:bg-slate-100"
              >
                ✕ Delete
              </button>
            </div>
          )}

          {/* variant-delete confirm (#33) — dropping a route that carries real
              steps asks first, anchored just under the fork's column headers. */}
          {confirmVar &&
            (() => {
              const card = items.find((pl) => pathKey(pl.path) === pathKey(confirmVar.path))
              if (!card) return null
              return (
                <div
                  data-varconfirm
                  className="absolute z-50 flex items-center gap-1.5 px-2 py-1 rounded-lg border border-slate-300 bg-white shadow-lg text-[10px]"
                  style={{ left: Math.max(4, Math.min(card.x, W - 200)), top: card.y + bodyTop(card.stop) + 2 }}
                >
                  <span className="text-slate-600">
                    Delete route + {confirmVar.n} step{confirmVar.n > 1 ? 's' : ''}?
                  </span>
                  <button
                    data-varconfirm-yes
                    onClick={() => {
                      state.dropVariant(confirmVar.path, confirmVar.idx)
                      setConfirmVar(null)
                    }}
                    className="px-1.5 py-0.5 rounded text-white bg-rose-600 hover:bg-rose-700"
                  >
                    Delete
                  </button>
                  <button
                    data-varconfirm-no
                    onClick={() => setConfirmVar(null)}
                    className="px-1.5 py-0.5 rounded text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              )
            })()}
        </div>
      )}
    </div>
  )
}
