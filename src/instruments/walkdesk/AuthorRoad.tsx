// The RAILROAD editor — a top-down node chart where the road may fork. A fork
// is a GROUP CARD with more than one variant. Its history: a tab strip (#19),
// then side-by-side comparator COLUMNS (#18). Since #70 the card shows ONE
// version at a time — the ACTIVE one — as a single column. The comparator and
// the ☑/☐ visibility namecard (#15 / 0005 D5) are retired: showing every version
// at once was the thing being simplified away. "Which version is shown" and
// "which version is active" are now the SAME thing, so the two channels collapse
// into one — `choices`/chosenIdx alone.
//
// A container — open or folded — is the DS VersionedGroup, hosted whole. Open, it
// runs in the DS's chrome-only mode (`bodySlot`): the component draws the well,
// the head (outline number · title · tally · fold/ungroup), the description, the
// version picker and its menu, the ancestry rail and the empty-version zone, and
// leaves the body EMPTY for the road to float the active version's steps into as
// board-level siblings. Retitle, describe, rename, switch, add and delete
// versions, fold and ungroup are the component's gestures, wired to ops on
// `authordraft` so undo/redo holds. The road never draws a head of its own now.
//
// The single column is the road (numbered, live arrows) when the container is on
// the road; off-road it's muted+faded with ghost arrows (the same onRoad/dim
// machinery a skipped optional uses).
//
// An OPTIONAL stop is drawn like any other but with a DASHED border and a DASHED
// arrow leading into it — the two signals that it may be skipped. There is no
// separate bypass rail any more; the dashed edge + inbound arrow carry it.
//
// Layout is arithmetic (measure → place): no DOM measurement, one SVG underlay
// for the walk arrows. Step nodes float as board-level siblings OVER each card,
// so no inner click bubbles into a parent.

import { useEffect, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

import { byId, domainOf, topicIds } from '../../corpus/graph'
import { ARROW_METRICS, NodeArrow } from '../../ds/graph/NodeArrow'
import { NodeChip, chipSize } from '../../ds/graph/NodeChip'
import type { DomainCode } from '../../ds/graph/vocab'
import { VersionedGroup, GroupGeometry, GROUP_METRICS } from '../../ds/group/VersionedGroup'
import type { GroupSpec } from '../../ds/group/VersionedGroup'
import type { AuthorState, Path } from './authordraft'
import { pathKey } from './authordraft'
import { bandFor, DT, gapFor, handleDrop } from './authordnd'
import type { Band } from './authordnd'
import { chosenIdx, chosenSteps, isLeaf } from './mockwalk'
import type { Stop } from './mockwalk'
import type { HoverBinding } from '../../studio/bus'

const NODEW = 150
// an UNSET slot is the road's own picker — a dashed pill round a <select> — so
// this is the road's box to choose. A BOUND leaf is a NodeChip and asks that
// component for its own; see leafSize.
const NODEH = 34
const FOLD_MIN_W = 190 // DS foldedMinWidth: the shell's CONTENT is never squeezed
// below this — the face is 190 wide, exactly as in the DS's own studio; the shell
// renders FOLD_MIN_W + the DS's 6px peek = 196 (GroupGeometry.foldedSize().width),
// 46px over the NODEW slot it reserves, 23px each side, since placeList centres
// it on the column axis (see visualW). Content-box — the DS's regime, which the
// [data-ds-host] rule in index.css restores on every hosted card.
// a leaf title used to `truncate` at NODEW; it now WRAPS and the node grows to
// fit, but only up to these bounds so one long title can't balloon the board (#72).
// These two are the road's POLICY — how much of the board one stop may take — and
// they are the only leaf numbers left here. Everything about the chip's own box
// (its 1.5px edge, its paddings, the delete button's 18px, the real advance of the
// mono step number) belongs to ChipGeometry, exported from the file that draws it.
// NODE_MAXH is spent on LINES rather than cropped to, so a title too long for it
// loses its tail instead of the box lying about how tall it is.
const NODE_MAXW = 220
const NODE_MAXH = 66
/** the step number as the CHIP is handed it — LOCAL to the container it sits in, so
 *  a leaf shows its position in its own list rather than the path down to it: the
 *  stop whose outline is `2.1` reads `1.`. The last segment IS that position, since
 *  placeList builds every outline as `${prefix}.${i + 1}`.
 *
 *  This is one scheme rather than two. The cards have always read this way —
 *  VersionedGroup's `numberScope` defaults to 'local' and truncates whatever it is
 *  handed — so while the chips carried full paths a nested card said `1.` with
 *  chips beside it saying `2.1.` and `2.2.`: one level in two schemes, which the DS
 *  calls worse than either. Numbering follows the nesting, which the reader can
 *  already see; `numberScope="path"` is there if a citable address is ever the point.
 *
 *  leafSize measures this and the render below draws it, from one place — the
 *  trailing dot is a few px of mono, and a reservation that missed it would be that
 *  much too narrow on every stop. */
const leafIndex = (outline: string) => `${outline.slice(outline.lastIndexOf('.') + 1)}.`
// the selection cue on a LEAF: an OUTLINE, not a ring — it survives the inline
// box-shadow on pills, and its offset sits OUTSIDE a node's thick coloured border,
// so selection stays legible where a 1px ring was lost against the border (#72 #10)
const SEL_OUTLINE = 'outline outline-2 outline-offset-1 outline-[var(--state-selected)]'
// A CONTAINER does not wear this on its wrapper: the wrapper's box is the card plus
// whatever the road reserved round it, so an outline on it is a loose rectangle. The
// DS card draws its own — round the face when folded, round the HEAD when open (its
// body holds nodes that are selectable in their own right) — via `selected`.
const AGAP = 26 // vertical space between siblings — the arrow lives here
// ── the OPEN container card, hosted whole since the DS grew `bodySlot` ────────
// The card is the DS VersionedGroup in chrome-only mode; the road floats the active
// version's steps into the slot it leaves empty. layoutRoad places every box in one
// pass BEFORE anything renders, so it cannot ask the rendered card where its slot is
// — it asks GroupGeometry, the DS's own published numbers, exported from the file
// that draws them (openHeight for the card and where its slot begins; foldedSize
// for a fold). Text is measured on a canvas at the DS's own fonts, so nothing here
// is read off a screenshot any more. What the road still has to know is where the
// slot sits SIDEWAYS: after the well's padding and the ancestry rail on the left,
// before the slot's own padding and the well's padding on the right — all
// GROUP_METRICS, so a change there lands here.
//   proven: node tools/studio-spike/shot-foldab.mjs compares openHeight/foldedSize
//   against the rendered card and the slot the component REPORTS (onBodySlot), and
//   fails on any drift.
const M = GROUP_METRICS
const SLOT_LEFT = M.faceBorder + M.padX + M.railIndent + M.railStroke + M.railPadLeft // 33.5
const SLOT_RIGHT = M.bodyPadRight + M.padX + M.faceBorder // 17
// The two are the card's own asymmetry: the ancestry rail hangs on the left, so the
// slot is inset further that side, and its centre therefore sits (SLOT_LEFT -
// SLOT_RIGHT) / 2 = 8.25px RIGHT of the card's own centre. The SLOT sits on the road's
// axis (see reachOf), so an open card hangs that 8.25px left of it — the same amount at
// every width, which is what lets two cards of one width share their edges. Both are
// also how far the DS's own empty zone reaches, which is what the road's transparent
// drop target has to cover.
const EMPTY_SLOT_H = 34 // what to ask for when the active version has no steps: the DS's own
// zone minimum. The zone the component then draws is taller (GROUP_METRICS.emptyZone) and
// openHeight knows it; the road's transparent drop target covers that box.
const CARD_MIN_W = M.narrowAt // 250: below this the DS drops the tally to its own line;
// the road keeps a card at least this wide so a head reads as one row
const MARGIN = 16
const SLOTH = 18 // catch height of a between-nodes drop slot (fills the AGAP)
const SELPAD = 7 // breathing room the selection box leaves around its members
// The action toolbar is a static strip pinned to the top of the road panel;
// BAR_ROW_H is one button row, used to size that strip's height.
const BAR_ROW_H = 26


/** The DS picker names a version twice: a short mono CODE for its position, and
 *  a written NAME. Our model carries only `label`, so the label is the name and
 *  the code is positional. An unnamed version still shows the placeholder, and
 *  the placeholder still takes room — so measure() and the head read it here,
 *  from one place, or the head would wrap against a width nobody reserved. */
const VERSION_UNNAMED = 'name this version'
const versionCode = (chosen: number): string => `v${chosen + 1}`
const versionName = (s: Stop, chosen: number): string => s.variants[chosen]?.label || VERSION_UNNAMED

/** what GroupGeometry — and the component — is told about a container: the same
 *  strings, plus the width the card is laid out at and how tall its slot is. ONE
 *  builder, so the reservation and the drawing can never disagree on an input. */
const groupSpec = (s: Stop, outline: string, width: number, slotH: number, chosen: number): GroupSpec => ({
  width,
  title: s.title ?? '',
  index: outline,
  description: s.description ?? '',
  descPlaceholder: 'enter description',
  versionName: versionName(s, chosen),
  versionLabel: versionCode(chosen),
  count: s.variants[chosen]?.steps.length ?? 0,
  countLabel: 'nodes',
  narrow: width < M.narrowAt,
  bodyHeight: slotH,
})


type Mark = { key: string; band: Band } | null

/** the active version's column box (width holds its widest step, height its stack) */
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
  /** hierarchical outline number by AUTHORING position — "2", "2.1", "2.1.3" —
   * shown left of every title. Replaced the flat amber walk-order badge (#15);
   * the walk sequence now lives only in the right-pane route preview. */
  outline: string
  onRoad: boolean
  skipped: boolean
  /** container nesting depth (0 at the board's top level, +1 per open container
   * we recurse into) — drives the recessed well's per-level surface tint. Counts
   * containers, NOT path hops: a fork's columns are the same well, not deeper. */
  depth: number
  /** an expanded container's single column box — the active version's steps.
   * `h` is the SLOT height the component is told (EMPTY_SLOT_H when empty). */
  body?: Col
  /** an expanded container: where its slot's content begins, from the card's top,
   * as GroupGeometry.openHeight predicted it — the same number the component draws */
  bodyTop?: number
  /** an expanded container: the spec the layout built — the render pass hands the
   * SAME strings and numbers to the component, so what was reserved is what draws */
  spec?: GroupSpec
  /** for folded containers: the actual rendered shell width (≥ FOLD_SHELL_W), which
   * overhangs the layout reservation (w = NODEW) — evenly, since `x` centres the
   * fold on the column axis by THIS width, so an arrow lands on its midpoint. The
   * wrapper, selBox and marquee all size by it, so what is drawn, hit and boxed is
   * what the user sees. Absent on leaves and open cards. */
  visualW?: number
}
interface Arrow {
  x1: number
  y1: number
  x2: number
  y2: number
  live: boolean
  /** this arrow leads INTO an optional stop — drawn dashed to say "may be
   * skipped". Optionality reads off the inbound arrow + the node's dashed border
   * now; the old bypass rail is gone. */
  optional: boolean
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
  choices: Record<string, string>,
  withOptionals: boolean,
) {
  // one container, one column: the ACTIVE version's steps (#70). The comparator's
  // side-by-side columns are gone, so a card is as wide as its column needs in order
  // to clear the DS rail on BOTH sides (never under CARD_MIN_W), and as tall as the
  // DS says a card with that head and that slot is.
  // a bound leaf's box: wide enough for a short title on one line, growing (and
  // wrapping) toward NODE_MAXW / NODE_MAXH for a long one, then clamped (#72 #8).
  // ASKED, not guessed. chipSize is the chip's own geometry, exported from the
  // file that draws it and reading back the same CHIP_METRICS its style block
  // writes, so a padding change lands in the reservation and in the drawing
  // together or not at all — the rule GroupGeometry already gives the card.
  // What stood here counted characters at CHAR_W = 8 against chrome scored at 40
  // when the chip's real chrome is ~83, so every title it scored as one line
  // wrapped to two and was clipped against the height it had been told (#97).
  const leafSize = (title: string, outline: string): { w: number; h: number } => {
    const c = chipSize({
      title,
      index: leafIndex(outline),
      // the road's leaf, in exactly the form the chip is handed below
      mark: 'border', wrap: true, deletable: true,
      minWidth: NODEW, maxWidth: NODE_MAXW, maxHeight: NODE_MAXH,
    })
    return { w: c.width, h: c.height }
  }
  /** the active version's column: its widest step wide, its whole stack tall —
   *  or, empty, the slot height the DS zone wants */
  const bodyColOf = (s: Stop, outline: string): Col => {
    const kids = chosenSteps(s, choices).map((c, i) => measure(c, `${outline}.${i + 1}`))
    const w = Math.max(NODEW, ...kids.map((c) => c.w))
    const h = kids.length ? kids.reduce((acc, c) => acc + c.h, 0) + (kids.length - 1) * AGAP : EMPTY_SLOT_H
    return { w, h }
  }
  const measure = (s: Stop, outline: string): { w: number; h: number; body?: Col; bodyTop?: number; spec?: GroupSpec } => {
    if (isLeaf(s)) {
      // a bound leaf wraps and grows within bounds (#72 #8); an unset slot keeps
      // the fixed pill size
      return s.unset ? { w: NODEW, h: NODEH } : leafSize(byId.get(s.node)?.title ?? '', outline)
    }
    const chosen = chosenIdx(s, choices)
    if (collapsed.has(s.key!)) {
      // a COLLAPSED CONTAINER is the DS folded card, so it reserves that card's
      // predicted height (#91) — the DS's own number now. Width stays NODEW so a
      // fold still lines up with the leaf stops above and below it; the shell
      // overhangs that evenly (see visualW).
      const spec = groupSpec(s, outline, NODEW, 0, chosen)
      return { w: NODEW, h: Math.ceil(GroupGeometry.foldedSize({ ...spec, foldedMinWidth: FOLD_MIN_W, narrow: true }).height), spec }
    }
    // the OPEN card wraps its slot ASYMMETRICALLY — SLOT_LEFT of ancestry rail on one
    // side, SLOT_RIGHT on the other — because the SLOT, not the card, is what sits on
    // the road's axis. That is the DS's own rule (VersionedGroup.prompt.md, "Filling the
    // body slot" point 7): the chain continues THROUGH the body, so the arrows into and
    // out of a card must land on the body's axis, and a chain whose arrows sit on two
    // axes reads as a mistake even when every box is where it should be. The card's own
    // edges then fall a fixed 8.25px left of the axis — fixed being the point, see
    // reachOf. Width is still content-driven, floored at CARD_MIN_W.
    // Never so narrow the head goes to two rows. Width first, THEN height: the head's
    // fields wrap against the width, so this order is what keeps openHeight() an
    // answer rather than a circular question.
    const body = bodyColOf(s, outline)
    const w = Math.max(CARD_MIN_W, SLOT_LEFT + body.w + SLOT_RIGHT)
    const spec = groupSpec(s, outline, w, body.h, chosen)
    const g = GroupGeometry.openHeight(spec)
    return { w, h: Math.ceil(g.height), body, bodyTop: g.bodyTop, spec }
  }

  /** how far a stop reaches either side of the road's AXIS, and what it PAINTS —
   *  which is not always what it RESERVES.
   *
   *  The axis is where the arrows are drawn, and the DS's body-slot rule puts it on
   *  the BODY SLOT rather than on the card. So a leaf or a fold is centred on it and
   *  reaches half its painted width each way (a fold's DS shell overhangs the NODEW
   *  slot it keeps in the column, which is why `painted` is not always `m.w`), while
   *  an OPEN CARD reaches to its SLOT's centre — (w + SLOT_LEFT - SLOT_RIGHT) / 2,
   *  since the slot is inset further on the rail side — and so hangs 8.25px left of
   *  the axis at every width.
   *
   *  It used to reach to the CONTENT COLUMN's centre instead. That is the same number
   *  only while the content fills the slot, and it never does: CARD_MIN_W (250) is
   *  wider than most bodies, and every pixel of that surplus fell on the RIGHT of the
   *  column, so a card's offset moved with its widest step. Measured on the Plan board
   *  2026-08-16, two cards BOTH 250 wide sat 12px apart, their arrows entering at +17
   *  and +5 from the axis every leaf chip was exactly on — read as two boxes that
   *  simply failed to line up. Reaching to the slot centres the chips in the slot they
   *  are floated over, gives equal-width cards equal edges, and satisfies point 7
   *  exactly rather than approximately.
   *  Placement and board sizing both read this, so the two can never disagree. */
  const reachOf = (s: Stop, m: { w: number; body?: Col; spec?: GroupSpec }) => {
    if (!isLeaf(s) && collapsed.has(s.key!)) {
      const painted = Math.max(m.w, GroupGeometry.foldedSize({ ...m.spec!, foldedMinWidth: FOLD_MIN_W, narrow: true }).width)
      return { left: painted / 2, right: painted / 2, painted }
    }
    if (isLeaf(s)) return { left: m.w / 2, right: m.w / 2, painted: m.w }
    const left = (m.w + SLOT_LEFT - SLOT_RIGHT) / 2
    return { left, right: m.w - left, painted: m.w }
  }

  const items: Placed[] = []
  const arrows: Arrow[] = []
  const slots: Slot[] = []

  // `prefix` is the parent container's outline number ("" at the top level); each
  // child is prefix.(i+1), so numbering follows AUTHORING position, not walk order.
  const placeList = (list: Stop[], parent: Path, centerX: number, y0: number, onRoad: boolean, depth: number, prefix: string) => {
    let y = y0
    let prevBottom: number | null = null
    let prevSkipped = false
    let lastW = NODEW
    list.forEach((s, i) => {
      const p = [...parent, i]
      const outline = prefix ? `${prefix}.${i + 1}` : String(i + 1)
      const m = measure(s, outline)
      const { w, h } = m
      // the SLOT is what sits on centerX, not the card. Arrows are drawn at
      // centerX, so what has to land there is whatever the chain runs through: a
      // leaf's own box, a fold's face, and an open card's BODY SLOT — never the open
      // card's outline, which hangs 8.25px left of it because the rail is inset
      // further than the other side. That offset is the same for every card, so two
      // cards of one width DO share edges. The drop slot keeps the RESERVED width
      // and stays centred, so a slot above a fold still lines up with the leaves.
      const isFold = !isLeaf(s) && collapsed.has(s.key!)
      const r = reachOf(s, m)
      const vw = r.painted
      const x = centerX - r.left
      slots.push({ path: p, x: centerX - w / 2, y: prevBottom === null ? y - 8 : (prevBottom + y) / 2, w })
      lastW = w
      const skipped = !!s.optional && !withOptionals
      if (prevBottom !== null)
        arrows.push({ x1: centerX, y1: prevBottom + 3, x2: centerX, y2: y - 5, live: onRoad && !prevSkipped && !skipped, optional: !!s.optional })
      if (isLeaf(s)) {
        items.push({ path: p, stop: s, x, y, w, h, outline, onRoad, skipped, depth })
      } else if (isFold) {
        items.push({ path: p, stop: s, x, y, w, h, outline, onRoad, skipped, depth, visualW: vw })
      } else {
        const body = m.body!
        const bodyTop = m.bodyTop!
        items.push({ path: p, stop: s, x, y, w, h, outline, onRoad, skipped, depth, body, bodyTop, spec: m.spec })
        // lay the ACTIVE version's steps as ONE column in the card's slot, on the
        // same axis. It is the road (live arrows, order numbers) when the container
        // itself is on the road. The other versions aren't drawn at all now (#70)
        // — switching versions swaps which steps this column holds.
        const chosen = chosenIdx(s, choices)
        const steps = s.variants[chosen].steps
        if (steps.length) placeList(steps, [...p, chosen], centerX, y + bodyTop, onRoad && !skipped, depth + 1, outline)
      }
      prevBottom = y + h
      prevSkipped = skipped
      y += h + AGAP
    })
    if (list.length && prevBottom !== null)
      slots.push({ path: [...parent, list.length], x: centerX - lastW / 2, y: prevBottom + 8, w: lastW })
  }

  // the board holds the axis at MARGIN + the furthest any stop reaches LEFT of it,
  // and is as wide as that plus the furthest any reaches right. The two sides are
  // measured separately because an open card is not symmetric about the axis, and
  // they are measured from what each stop PAINTS, which keeps a fold's overhanging
  // shell inside the board instead of over its edge.
  const reaches = stops.map((s, i) => reachOf(s, measure(s, String(i + 1))))
  const halfL = Math.max(NODEW / 2, ...reaches.map((r) => r.left))
  const halfR = Math.max(NODEW / 2, ...reaches.map((r) => r.right))
  const W = halfL + halfR + 2 * MARGIN
  placeList(stops, [], MARGIN + halfL, MARGIN, true, 0, '')
  const bottoms = items.map((it) => it.y + it.h)
  const H = (bottoms.length ? Math.max(...bottoms) : 0) + MARGIN
  return { items, arrows, slots, W, H }
}


export default function AuthorRoad({
  state,
  sync,
  choices,
  pickBranch,
  withOptionals,
  onLeafFocus,
}: {
  state: AuthorState
  sync: HoverBinding
  choices: Record<string, string>
  pickBranch(key: string, id: string): void
  withOptionals: boolean
  onLeafFocus?: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [mark, setMark] = useState<Mark>(null)
  const [hotSlot, setHotSlot] = useState<number | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const marqueeDragRef = useRef(false)
  // Title, description and version-name editing, the version menu, the delete
  // confirm and the ungroup refusal are all the DS card's own now — it opens its
  // fields on a click, asks before a delete, and refuses a multi-version ungroup
  // with its own note. The road only hears the results, as ops on `authordraft`.
  // a toolbar button's keyboard-shortcut hint, revealed after a 1s hover (#15)
  const [shortcutHint, setShortcutHint] = useState<string | null>(null)
  const hintTimer = useRef<number | null>(null)

  const toggle = (key: string) => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

  // create a fresh version and switch to it (#70); the DS card then opens the new
  // name for editing itself. The new variant is appended; addVariant seeds it with
  // one unset slot, so it reads as a blank new version with a default name.
  const createVersion = (s: Stop) => {
    const newId = state.addVariant(s.key!)
    pickBranch(s.key!, newId)
  }
  // the DS card asked already (its inline "delete this version?" row, #33's ask
  // moved into the component), so this is the drop itself
  const deleteVersion = (path: Path, s: Stop, id: string) => {
    const k = s.variants.findIndex((v) => v.id === id)
    if (k >= 0) state.dropVariant(path, k)
  }

  // GroupGeometry measures titles on a canvas at the DS's fonts. Until the webfonts
  // arrive it measures the fallback face, so the first layout can wrap a title
  // differently from the card that renders once Quicksand/Nunito are in — lay out
  // again the moment they are, and every reservation is measured at the real face.
  const [, setFontsReady] = useState(0)
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return
    let on = true
    document.fonts.ready.then(() => { if (on) setFontsReady((n) => n + 1) })
    return () => { on = false }
  }, [])

  const { items, arrows, slots, W, H } = layoutRoad(state.stops, collapsed, choices, withOptionals)

  // the SELECTION BOX — the bounding rect of every selected block; the action
  // toolbar pins to it (stable) rather than chasing the cursor. #17.
  const selItems = items.filter((pl) => state.selected.has(pathKey(pl.path)))
  // only drawn for a MULTI-selection — for a single node the per-node thin ring
  // is the whole selection cue, so we don't box a lone node twice.
  const selBox = selItems.length > 1
    ? (() => {
        const x = Math.min(...selItems.map((p) => p.x)) - SELPAD
        const y = Math.min(...selItems.map((p) => p.y)) - SELPAD
        const right = Math.max(...selItems.map((p) => p.x + (p.visualW ?? p.w))) + SELPAD
        const bottom = Math.max(...selItems.map((p) => p.y + p.h)) + SELPAD
        return { x, y, w: right - x, h: bottom - y }
      })()
    : null
  // refinement: the action toolbar no longer floats near the selection. It is a
  // STATIC strip pinned to the top of the road panel (rendered below), always
  // present; its buttons enable/disable off the selection instead of appearing
  // and disappearing. The selection box below still marks the run itself.

  // g = group, once a selection exists (#15). Ungroup has no shortcut — it is the
  // container's ✕ now (the toolbar ✕ Delete removes the whole group). The rest of
  // the toolbar stays mouse-only. Ignored while a text field is focused.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key !== 'g' && e.key !== 'G') return
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return
      if (state.canGroup) {
        e.preventDefault()
        state.groupSelection()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state])

  // a toolbar button reveals its shortcut after a full second of hover (#15)
  const hintOn = (k: string) => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
    hintTimer.current = window.setTimeout(() => setShortcutHint(k), 1000)
  }
  const hintOff = () => {
    if (hintTimer.current) clearTimeout(hintTimer.current)
    setShortcutHint(null)
  }

  /** Plain click selects one block; Shift/Ctrl/Cmd toggles membership.
   * A plain click on a leaf also drives the doc pane (#14). */
  const selectOn = (pl: Placed) => (e: ReactMouseEvent) => {
    e.stopPropagation()
    if (e.shiftKey || e.ctrlKey || e.metaKey) state.toggleSelect(pl.path)
    else {
      state.selectPaths([pl.path])
      if (isLeaf(pl.stop) && onLeafFocus) onLeafFocus(pl.stop.node)
    }
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

/** a LEAF's hover/select chrome (#15): its ✕, top-right, fading in on hover;
   * `shown` forces it visible (selected). A leaf is DELETED by it. A container's
   * fold and ungroup controls are the DS card's own head cluster now — the ✕
   * there UNGROUPS (its active version's steps are lifted out in place and the
   * wrapper, plus any other versions, drops), and deleting a whole group,
   * contents and all, is the toolbar's ✕ Delete. All undoable. */
  // the road's own delete ✕ for a leaf stop is RETIRED (#97): NodeChip carries one,
  // berry at rest, receding on the shared PKT_SB clock with its space reserved so the
  // chip never changes width — the same control every other ✕ in the system is.


  // ── marquee (rubber-band) select ──────────────────────────────────────────
  const boardPoint = (e: ReactPointerEvent) => {
    const r = boardRef.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  const onBoardPointerDown = (e: ReactPointerEvent) => {
    marqueeDragRef.current = false
    if (e.button !== 0 || !boardRef.current) return
    // only empty canvas starts a marquee — not a node, control, tab, or overlay
    if ((e.target as HTMLElement).closest('[data-rnode],[data-rstage],[data-rstage-closed],[data-fly],[data-rbody],button,input,select')) return
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
      const hit = items.filter((pl) => pl.x < right && pl.x + (pl.visualW ?? pl.w) > left && pl.y < bottom && pl.y + pl.h > top)
      if (hit.length) state.selectPaths(hit.map((pl) => pl.path), e.shiftKey)
    }
    setMarquee(null)
  }

  return (
    // DS PaneHeader.d.ts rule 3: A SCROLLING BODY INSETS 12px AT BOTH ENDS, as a
    // margin rather than a radius on the scroller, so the scrollbar's end arrows stay
    // clear of the pane's corner arcs instead of being clipped by them; the pane's own
    // paper fills the strips.
    //
    // BOTH, not just the bottom. A scroller reserves an arrow square at EACH end of its
    // gutter and the pane has a rounded corner at each end of its right edge, so one
    // inset alone leaves the OTHER arrow painting over its arc. The rule read
    // `marginBottom` alone when we adopted it in #110 — "one inset serves both axes",
    // which is true of the two AXES and false of the two ENDS — and the DS amended it
    // on 2026-08-17f after finding the same bug in its own Pane. #113 H2.
    <div
      data-road-root
      className="flex-1 min-h-0 overflow-auto"
      style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-3)' }}
      onPointerDown={onBoardPointerDown}
      onPointerMove={onBoardPointerMove}
      onPointerUp={onBoardPointerUp}
      onDragOver={(e: ReactDragEvent) => e.preventDefault()}
      onDrop={(e: ReactDragEvent) => {
        setMark(null)
        handleDrop(e, [state.stops.length], state)
      }}
    >
      {/* STATIC action toolbar — pinned to the top of the road panel, always
          present (an experiment, replacing the floating dock that chased the
          selection). data-fly keeps onBoardPointerDown from treating a toolbar
          click as a board marquee/deselect. Buttons enable/disable off the
          current selection; the shortcut-hint badges (G / Ctrl+G) still appear
          after ~1s of hover, now dropping BELOW their button. */}
      <div
        data-fly
        data-seltools
        className="sticky top-0 z-40 flex items-center gap-1 px-2 border-b border-[var(--border-hair)] backdrop-blur-sm"
        style={{ minHeight: BAR_ROW_H + 8, background: 'var(--surface-veil)' }}
      >
        <span className="text-[var(--fs-caption)] font-semibold px-1 select-none tabular-nums" style={{ color: 'var(--state-selected)' }}>
          {state.selected.size > 0 ? `${state.selected.size} selected` : 'no selection'}
        </span>
        <span className="relative flex" onMouseEnter={() => hintOn('group')} onMouseLeave={hintOff}>
          <button
            data-fly-group
            disabled={!state.canGroup}
            onClick={state.groupSelection}
            title="group into stage"
            className="text-[var(--fs-body)] px-2 py-1 rounded border border-[var(--accent-primary)] bg-[var(--accent-primary-wash)] disabled:opacity-30 hover:bg-[var(--moss-100)]"
            style={{ color: 'var(--accent-primary-ink)' }}
          >
            ⊞ Group
          </button>
          {shortcutHint === 'group' && (
            <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap rounded text-[var(--fs-micro)] font-semibold px-1.5 py-0.5 shadow pointer-events-none" style={{ background: 'var(--bark-800)', color: 'var(--text-inverse)' }}>
              G
            </span>
          )}
        </span>
        <button
          data-fly-opt
          disabled={!state.canOptional}
          aria-pressed={state.optionalActive}
          onClick={state.toggleOptionalSelection}
          title={state.optionalActive ? 'optional — click to make required' : 'toggle optional'}
          className="text-[var(--fs-body)] px-2 py-1 rounded border disabled:opacity-30"
          style={state.optionalActive
            ? { borderColor: 'var(--state-optional)', color: 'var(--text-walk)', background: 'var(--accent-walk-wash)' }
            : { borderColor: 'var(--border-rule)', color: 'var(--text-2)', background: 'var(--surface-canopy)' }}
        >
          ◇ Optional
        </button>
        <button
          data-fly-del
          disabled={!state.canDelete}
          onClick={state.deleteSelection}
          title="delete — a group takes everything inside it (undoable)"
          className="text-[var(--fs-body)] px-2 py-1 rounded border border-[var(--border-rule)] disabled:opacity-30 hover:bg-[var(--surface-hover)]"
          style={{ color: 'var(--text-2)' }}
        >
          ✕ Delete
        </button>
      </div>

      {state.stops.length === 0 ? (
        <div className="text-[var(--fs-body)] p-3" style={{ color: 'var(--text-3)' }}>drop a node from the palette to start the plan</div>
      ) : (
        <div ref={boardRef} className="relative mx-auto my-2 select-none" style={{ width: W, height: H }}>
          {/* #113 H4: the sequence is drawn with the DS NodeArrow, one per gap, instead
              of the road's own <line>s and two <marker> heads.

              The road still OWNS the layout. It computes every gap arithmetically in one
              pass, so each arrow is PLACED from ARROW_METRICS rather than handed to a
              NodeChain — the chain wants to own order and slots as well, which is the
              same structural reason the open card needs `bodySlot`. Adopting the drawing
              settles the tone; it does not settle AGAP 26 against the chain's 22, which
              is a layout constant and stays open on #109.

              Two signals collapse into the DS's model on purpose:
                · the live shaft goes 2.5 -> 1.5, because NodeArrow strokes one width;
                · the ghost's own '4 3' dash is DROPPED. The DS reserves dashed for
                  CONDITIONAL, and on this road that already means `optional` — so a
                  second dash pattern meaning "off the road" was decoration, and two
                  dashes for two meanings is the thing the rule exists to stop.
              Off-road now reads in tone alone: quiet (--bark-400) against walk
              (--accent-walk). It was --text-3, which IS bark (--bark-500), one step
              darker than the system's quiet — not the "neutral grey" #113 H4 reports. */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {arrows.map((a, i) => (
              <div
                key={`a${i}`}
                data-rarrow
                data-rarrow-tone={a.live ? 'walk' : 'quiet'}
                style={{ position: 'absolute', left: a.x1 - ARROW_METRICS.across / 2, top: a.y1 }}
              >
                <NodeArrow
                  direction="down"
                  length={Math.max(1, a.y2 - a.y1 - ARROW_METRICS.head)}
                  tone={a.live ? 'walk' : 'quiet'}
                  dashed={a.optional}
                />
              </div>
            ))}
          </div>

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
                      'absolute z-20 rounded-full border-2 border-dashed px-2 flex items-center cursor-grab',
                      'transition-[left,top,width,height] duration-200 ease-out',
                      dim,
                      isSelected ? SEL_OUTLINE : '',
                    ].join(' ')}
                    style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h, borderColor: 'var(--border-dashed)', background: 'var(--surface-canopy)' }}
                  >
                    <select
                      data-rpicknode={key}
                      value=""
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation()
                        if (e.target.value) state.bindNode(pl.path, e.target.value)
                      }}
                      className="w-full bg-transparent text-[var(--fs-caption)] outline-none cursor-pointer" style={{ color: 'var(--text-3)' }}
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
              // a stop is a DS NodeChip (#97), not a pill the road draws. `mark="border"`
              // is the DS's own form for a node standing on its own — the domain on the
              // edge, no disc, and the step number in the freed column — and it takes its
              // hue from --domain-* rather than the corpus's raw authored hex, which is
              // what the road was reading before.
              //
              // The road keeps everything that is BEHAVIOUR and hands over the drawing,
              // exactly as the folded card does: the wrapper owns position, the relayout
              // transition, drag, the hover-bus binding and the selection SET; the chip
              // owns its picture, its ✕ and its rings. `selected` WITHOUT `selectable` is
              // the DS's own advice for a board — it paints the chip picked without also
              // handing it a click gesture, which would fight the marquee and the drag.
              // `dim` is the DS's off-the-resolved-path treatment (no lift, no fill,
              // --opacity-off-path), a step past the plain opacity the road used.
              return (
                <div
                  key={key}
                  {...gestures(pl)}
                  {...sync.bind(s.node)}
                  data-rnode
                  data-node={s.node}
                  data-ropt={s.optional ? 1 : undefined}
                  data-rord={pl.outline}
                  className="absolute z-20 cursor-grab transition-[left,top,width,height] duration-200 ease-out"
                  style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
                >
                  {/* #72 #8: the title WRAPS instead of truncating — the node grew to
                      fit in measure()/leafSize, which ASKS this component's own
                      chipSize() for the box and bounds it by NODE_MAXW/NODE_MAXH. So
                      what the chip is told here is what it would have measured. */}
                  <NodeChip
                    title={byId.get(s.node)!.title}
                    index={leafIndex(pl.outline)}
                    domain={domainOf(s.node) as DomainCode}
                    mark="border"
                    wrap
                    optional={!!s.optional}
                    dim={(!pl.onRoad || pl.skipped) && !isSelected}
                    lit={sync.lit(s.node)}
                    selected={isSelected}
                    width={pl.w}
                    height={pl.h}
                    resizable={false}
                    onDelete={() => state.deleteAt(pl.path)}
                  />
                </div>
              )
            }

            // a container — COLLAPSED, and since #91 this is the real DS
            // VersionedGroup in its folded state rather than a drawing of one.
            // A closed card has no visible children, so the wall that keeps the
            // OPEN card mirroring the DS head by hand — steps are board-level
            // siblings, not `children` — does not apply here, and the whole
            // component can be hosted.
            //
            // The road keeps everything that is BEHAVIOUR and hands over
            // everything that is DRAWING. The wrapper owns position, the relayout
            // transition, drag (`gestures`), selection, hover-dim, the outline
            // number's hook and double-click-to-open; the component owns the
            // fold's picture, its title, its tally and its two controls.
            //
            // What this gives up, plainly: the two peek plates of ADR-0005 D2.
            // The DS stacks a single well-tinted plate behind its fold, per its
            // own elevation.css rule ("a folded group -> raised again, with the
            // well tint stacked behind it"), and two pill silhouettes behind a
            // rounded-lg card is not a drawing anyone chose. The plural reading
            // those plates carried now rides on the tally instead, in words. That
            // trade is the subject of #100 and was made deliberately — see #91.
            if (collapsed.has(s.key!)) {
              // D1 (0005) still holds and is now the DS's own rule too: a SHUT
              // group is the only persistently-RAISED thing on the road, and the
              // component draws that itself (--lift-2 over a well-tinted plate).
              // It is self-contained — no floating step children — so it still
              // takes the hover-lift scale cleanly.
              const shutSteps = chosenSteps(s, choices)
              const shutChosen = chosenIdx(s, choices)
              return (
                <div
                  key={key}
                  {...gestures(pl)}
                  data-rstage-closed={s.key}
                  data-rord={pl.outline}
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    toggle(s.key!)
                  }}
                  title="double-click to open"
                  // the DS's own box model applies inside (see [data-ds-host] in
                  // index.css): everything under this wrapper is the DS card
                  data-ds-host=""
                  className={[
                    'group absolute z-20 cursor-grab',
                    'transition-[left,top,width,height] duration-200 ease-out',
                    pl.path.length === 1 ? 'hover-lift' : '',
                    dim,
                    // selection is drawn by the card itself (`selected` below), on
                    // its face; only the drop-target mark rides on the wrapper
                    !isSelected && mark?.key === key && mark.band === 'inside' ? 'ring-2 ring-[var(--accent-primary)] rounded-[var(--radius-lg)]' : '',
                  ].join(' ')}
                  style={{ left: pl.x, top: pl.y, width: pl.visualW ?? pl.w, height: pl.h }}
                >
                  <VersionedGroup
                    folded
                    // the road's two cues, drawn by the card on its own FACE so they
                    // follow the rounded corners like on every other node. Not on
                    // this wrapper: its box is the face + the peek plate + the
                    // reserved height, and an outline on it is a loose rectangle
                    // around a rounded stack (the DS card owns its border, so
                    // neither cue restyles the component's edge — both ride outside
                    // it). dashed ALWAYS means conditional; it yields to selection.
                    selected={isSelected}
                    optional={!!s.optional}
                    title={s.title ?? ''}
                    index={pl.outline}
                    /* the road floats its cards as board-level siblings, so the DS's
                       Depth context never reaches them — `pl.depth` is the same count,
                       kept by the layout that did the floating */
                    depth={pl.depth}
                    description={s.description ?? ''}
                    count={shutSteps.length}
                    versions={s.variants.map((v, i) => ({ id: v.id, name: v.label || VERSION_UNNAMED, label: versionCode(i) }))}
                    activeId={s.variants[shutChosen]?.id ?? ''}
                    onSelect={(id) => pickBranch(s.key!, id)}
                    // TOLD, never measured: `narrow` uninstalls the component's
                    // ResizeObserver, which is what lets GroupGeometry.foldedSize()
                    // predict this box before it renders. `width` pins it to the
                    // leaf column so a fold still lines up with the stops above and
                    // below it.
                    narrow
                    width={NODEW}
                    foldedMinWidth={FOLD_MIN_W}
                    // both gestures belong to the road: dragging a stop is the
                    // board's job, and a fold has no resize handle to offer
                    movable={false}
                    resizable={false}
                    // the #15 gesture set, now drawn by the DS: its RestoreMark
                    // maximises, and its ✕ ungroups — including the CONFIRMATION
                    // when more than one version lives here, which askUngroup already
                    // implements exactly as the road did by hand. Both stay ops on
                    // `authordraft`, so undo/redo holds.
                    onToggleFold={() => toggle(s.key!)}
                    onClose={() => state.promote(pl.path, shutChosen)}
                    ungroupConfirmLabel={`ungroup this node? the live version's steps spill onto the road — its other ${s.variants.length - 1} version${s.variants.length === 2 ? '' : 's'} go with it`}
                  />
                </div>
              )
            }

// a container — the OPEN card. The DS VersionedGroup in chrome-only mode
            // (bodySlot): it draws the well, the head, the description, the picker
            // and its menu, the ancestry rail and — for an empty version — the
            // dashed zone; the active version's steps float into its slot as
            // board-level siblings placed by layoutRoad, so no inner click bubbles
            // into the card. What the road keeps is BEHAVIOUR: position, drag,
            // drop bands, selection, hover-dim; every edit the card offers lands as
            // an op on `authordraft`, so undo/redo holds.
            const chosen = chosenIdx(s, choices)
            const steps = chosenSteps(s, choices)
            const spec = pl.spec!
            const bodyTop = pl.bodyTop ?? 0
            // the slot layoutRoad reserved. The card must draw exactly this and
            // impose NO ceiling of its own — see bodyMaxHeight below (#97).
            const slotH = pl.body?.h ?? EMPTY_SLOT_H
            // where a drag over the card lands: the HEAD zone (above the slot) reads
            // before / inside / after in thirds, as bandFor does for a node; the slot
            // itself, and anything under it, is inside — the version on show
            const cardBand = (e: ReactDragEvent): Band => {
              const r = e.currentTarget.getBoundingClientRect()
              const t = (e.clientY - r.top) / bodyTop
              return t >= 1 ? 'inside' : t < 0.3 ? 'before' : t > 0.7 ? 'after' : 'inside'
            }
            const cardGap = (e: ReactDragEvent): Path => {
              const band = cardBand(e)
              const i = pl.path[pl.path.length - 1]
              const parent = pl.path.slice(0, -1)
              return band === 'inside' ? [...pl.path, chosen, steps.length] : band === 'before' ? [...parent, i] : [...parent, i + 1]
            }
            return (
              <div
                key={key}
                data-rstage={s.key}
                data-rdrop={s.key}
                // the DS's own box model applies inside (see [data-ds-host] in
                // index.css): everything under this wrapper is the DS card, and
                // GroupGeometry's numbers assume that regime
                data-ds-host=""
                draggable
                onDragStart={(e: ReactDragEvent) => {
                  e.stopPropagation()
                  e.dataTransfer.setData(DT, 'blk:' + key)
                }}
                onDragEnd={() => {
                  setMark(null)
                  setHotSlot(null)
                }}
                onDragOver={(e: ReactDragEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setHotSlot(null)
                  setMark({ key, band: cardBand(e) })
                }}
                onDragLeave={() => setMark((m) => (m?.key === key ? null : m))}
                onDrop={(e: ReactDragEvent) => {
                  setMark(null)
                  setHotSlot(null)
                  handleDrop(e, cardGap(e), state)
                }}
                onClick={(e) => {
                  if (marqueeDragRef.current) return
                  selectOn(pl)(e)
                }}
                title="drag to move"
                className={[
                  'group absolute z-[5] cursor-grab',
                  // #72 #2: only a TOP-LEVEL card lifts; a nested one is part of its
                  // parent, so hovering into it no longer fires a second lift.
                  pl.path.length === 1 ? 'hover-lift' : '',
                  dim,
                  // the drop-target ring rides on the wrapper, like the fold's; the
                  // card draws its own selection (round the head) via `selected`
                  !isSelected && mark?.key === key && mark.band === 'inside' ? 'ring-2 ring-[var(--accent-primary)] rounded-[var(--radius-lg)]' : '',
                ].join(' ')}
                style={{ left: pl.x, top: pl.y, width: pl.w, height: pl.h }}
              >
                <VersionedGroup
                  // CONTROLLED, both ways: the road owns fold state (`collapsed`), and
                  // the same component instance carries over between this branch and
                  // the folded one (same key, same position), so an uncontrolled fold
                  // would keep the card's own guess after the road had reopened it
                  folded={false}
                  bodySlot
                  slotHeight={slotH}
                  // NO CEILING. The DS defaults this to 260 and caps the body with
                  // `overflow-y: auto`, but openHeight — which is where the road got
                  // this card's height — does not model the cap. So a column over 260
                  // was RESERVED at full height and DRAWN capped, and because the
                  // steps are board-level siblings they do not scroll with the body:
                  // they hung out of the bottom of the card while the reserved height
                  // left dead space above the arrow out of it. Not `slotH` either —
                  // the cap applies to the body BOX, padding included, so a tight
                  // number crushes it (and the empty version's zone, which the
                  // component draws at GROUP_METRICS.emptyZone whatever was asked).
                  // The road already reserved this card's exact height; a ceiling of
                  // the card's own is a second opinion on a box that is not its to
                  // decide. Reported on #74: openHeight should model bodyMaxHeight,
                  // or say that a bodySlot host must clear it.
                  bodyMaxHeight="none"
                  // TOLD, never measured — the same spec layoutRoad reserved by, so
                  // the card draws exactly the box that was reserved for it
                  width={pl.w}
                  narrow={spec.narrow}
                  title={spec.title ?? ''}
                  index={spec.index}
                  /* the road floats its cards as board-level siblings, so the DS's
                     Depth context never reaches them — `pl.depth` is the same count,
                     kept by the layout that did the floating */
                  depth={pl.depth}
                  description={spec.description}
                  descPlaceholder={spec.descPlaceholder}
                  count={spec.count}
                  countLabel={spec.countLabel}
                  versions={s.variants.map((v, i) => ({ id: v.id, name: v.label || VERSION_UNNAMED, label: versionCode(i) }))}
                  activeId={s.variants[chosen]?.id ?? ''}
                  // the road's two cues, drawn by the card: selection round the head
                  // (a card's body holds nodes selectable in their own right);
                  // dashed round the face when the container is conditional
                  selected={isSelected}
                  optional={!!s.optional}
                  // both gestures belong to the road: dragging a stop is the board's
                  // job, and a card sized by the layout has no resize handle to offer
                  movable={false}
                  resizable={false}
                  // every edit the card offers, as an op on authordraft
                  onRetitle={(v) => state.retitle(s.key!, v)}
                  onDescribe={(v) => state.redesc(s.key!, v)}
                  onRename={(id, name) => {
                    const k = s.variants.findIndex((v) => v.id === id)
                    if (k >= 0) state.relabelVariant(s.key!, k, name)
                  }}
                  onSelect={(id) => pickBranch(s.key!, id)}
                  onAddVersion={() => createVersion(s)}
                  onDeleteVersion={(id) => deleteVersion(pl.path, s, id)}
                  onToggleFold={() => toggle(s.key!)}
                  onClose={() => state.promote(pl.path, chosen)}
                  ungroupConfirmLabel={`ungroup this node? the live version's steps spill onto the road — its other ${s.variants.length - 1} version${s.variants.length === 2 ? '' : 's'} go with it`}
                />

                {/* the ACTIVE version's steps float over the slot as board-level
                    siblings (placed by layoutRoad). When that version is empty the
                    card draws its own dashed zone; this transparent target over it
                    is what makes the zone accept the road's drops. */}
                {steps.length === 0 && (
                  <div
                    data-rbody={`${s.key}.${chosen}`}
                    onClick={(e) => e.stopPropagation()}
                    onDragOver={(e: ReactDragEvent) => e.preventDefault()}
                    onDrop={(e: ReactDragEvent) => {
                      setMark(null)
                      handleDrop(e, [...pl.path, chosen, 0], state)
                    }}
                    className="absolute z-30"
                    style={{ left: SLOT_LEFT, top: bodyTop, width: pl.w - SLOT_LEFT - SLOT_RIGHT, height: M.emptyZone }}
                  />
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
                <div data-rmark className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded pointer-events-none" style={{ background: 'var(--acorn-500)' }} />
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
                  className="absolute z-30 h-[3px] rounded pointer-events-none"
                  style={{ left: pl.x, top: mark.band === 'before' ? pl.y - 6 : pl.y + pl.h + 3, width: pl.visualW ?? pl.w, background: 'var(--acorn-500)' }}
                />
              ))}

          {/* marquee — the rubber-band while dragging on empty board. #17 */}
          {marquee && (
            <div
              data-marquee
              className="absolute z-40 border pointer-events-none"
              style={{
                left: Math.min(marquee.x0, marquee.x1),
                top: Math.min(marquee.y0, marquee.y1),
                width: Math.abs(marquee.x1 - marquee.x0),
                height: Math.abs(marquee.y1 - marquee.y0),
                borderColor: 'var(--state-selected)',
                background: 'var(--state-selected-wash)',
              }}
            />
          )}

          {/* selection box — the bounding rect of the selected run. #17 */}
          {selBox && (
            <div
              data-selbox
              className="absolute z-30 rounded-lg border pointer-events-none transition-all duration-200 ease-out"
              style={{ left: selBox.x, top: selBox.y, width: selBox.w, height: selBox.h, borderColor: 'var(--state-selected)' }}
            />
          )}

          {/* the action toolbar used to float here, pinned to the selection box.
              It is now a STATIC strip at the top of the road panel — see the
              data-seltools bar rendered above the board. */}

        </div>
      )}
    </div>
  )
}
