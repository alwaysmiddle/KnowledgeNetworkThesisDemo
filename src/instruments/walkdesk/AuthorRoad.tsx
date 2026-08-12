// The RAILROAD editor — a top-down node chart where the road may fork. A fork
// is a GROUP CARD with more than one variant. Its history: a tab strip (#19),
// then side-by-side comparator COLUMNS (#18). Since #70 the card shows ONE
// version at a time — the ACTIVE one — as a single column. The comparator and
// the ☑/☐ visibility namecard (#15 / 0005 D5) are retired: showing every version
// at once was the thing being simplified away. "Which version is shown" and
// "which version is active" are now the SAME thing, so the two channels collapse
// into one — `choices`/chosenIdx alone.
//
// An open card shows the stage `title` in its header row with the browser bar,
// and the VERSION COMBOBOX in a second row below: a green ✔ tick, the active
// version's label (click it to rename in place), and a ▼ that drops a
// menu. Versions are listed first (grey; selected one bold-green with ✔);
// "Create new version…" (italic) is at the bottom of the menu. A per-row ✕
// deletes a version, asking first if it carries real steps (#33). Creating
// switches to the new version and opens its rename box.
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

import { byId, domainOf, DOMAIN_COLOR, topicIds } from '../../corpus/graph'
// the head's tick and caret come from the DS itself rather than being redrawn
// here — the system draws a tick and a disclosure one way (#91)
import { checkStyle, VersionedGroup } from '../../ds/group/VersionedGroup'
import { caretStyle } from '../../ds/nav/TreeRow'
import type { AuthorState, Path } from './authordraft'
import { pathKey } from './authordraft'
import { bandFor, DT, gapFor, handleDrop } from './authordnd'
import type { Band } from './authordnd'
import { chosenIdx, chosenSteps, isLeaf } from './mockwalk'
import type { Stop } from './mockwalk'
import type { HoverBinding } from '../../studio/bus'

const NODEW = 150
const NODEH = 34
// a leaf title used to `truncate` at NODEW; it now WRAPS and the node grows to
// fit, but only up to these bounds so one long title can't balloon the board (#72)
const NODE_MAXW = 220
const NODE_MAXH = 66
const LEAF_LINE_H = 16 // added height per wrapped title line past the first (13px × ~1.2 lh)
const CHAR_W = 8 // rough advance of the 13px (--fs-body) semibold Nunito title, for wrap estimation
const LEAF_CHROME_W = 40 // outline number + horizontal padding around the title
// the selection cue: an OUTLINE, not a ring — it survives the inline box-shadow
// on pills/cards, and its offset sits OUTSIDE a node's thick coloured border, so
// selection stays legible where a 1px ring was lost against the border (#72 #10)
const SEL_OUTLINE = 'outline outline-2 outline-offset-1 outline-[var(--state-selected)]'
const AGAP = 26 // vertical space between siblings — the arrow lives here
const PAD = 10
// The open card's head is the DS VersionedGroup head (#91): outline · title ·
// tally · controls, then the DescLine, then the version picker. Its rows WRAP
// like the DS one, so its height is no longer a constant — see headSize().
const HEAD_TOP = 6      // the card's own breathing room above the title row
const HEAD_ROW_MIN = 22 // the DS head row's floor, so a one-line title still breathes
const HEAD_LINE_H = 17.55 // one wrapped line of an --fs-body title: 13px at --lh-snug 1.35
const HEAD_DESC = 20    // the DescLine row at one line — its floor, not its height
const DESC_LINE_H = 16.2 // one wrapped line of --fs-caption description: 12px at --lh-snug
const HEAD_GAP = 4      // --space-1, between the three head rows
const HEAD_ORD_W = 26   // the outline number and its gap, off the title's width
const HEAD_BAR_W = 82   // the tally + minimise + ✕ cluster on the title row's right
const PICK_MIN_H = 28   // --hit-min: the picker is a click target before it is a label
const PICK_LINE_H = 17.55 // one wrapped line of the --fs-body version name at --lh-snug
const PICK_PAD_H = 12   // the picker's own vertical padding + its 1px border, both sides
const PICK_CHROME_W = 66 // tick + version code + caret, either side of the version name
const HEAD_MAX_LINES = 2 // the DS clamps the title and the version name at two lines
// ── the CLOSED container card, since #91 ────────────────────────────────────
// A shut container hosts the real DS VersionedGroup in its folded state instead
// of drawing its own pill. That is only possible because a closed card has no
// visible children — the wall that keeps the OPEN card drawing its own head
// (steps are board-level siblings, not `children`) simply does not apply here.
//
// It costs the road its measure-free assumption that a fold is pill-sized, so
// the folded box has to be PREDICTED, exactly as headRows() predicts the open
// head. These numbers are not read off the DS stylesheet — the fold's head row
// is `alignItems: baseline`, so its height comes from baseline alignment rather
// than from the tallest child, and deriving it was guesswork. They are MEASURED,
// by rendering the real component across a spread of title lengths:
// `node tools/studio-spike/shot-foldab.mjs` prints the fit it reproduces
// (1 line 70.84, 2 lines 83.94, 3 lines 101.48 at road width).
const FOLD_CHROME = 44.85 // everything that is not the title row: the 7px peek
// margin under the shell, the face's two 1px borders, its 8/9px padding, the
// --space-1 gap, and the 14.85px tally line narrow mode drops below the title
const FOLD_ROW_MIN = 26 // the head row at ONE line. NOT the DS's minHeight of 22
const FOLD_LINE_H = 17.55 // one wrapped title line — --fs-body at --lh-snug
const FOLD_BASELINE_SLACK = 4 // descent under the last line once the title wraps
const FOLD_MAX_LINES = 3 // a FOLDED title clamps at three lines (an open one, two)
const FOLD_TITLE_W = 96 // the DS title span's own minWidth. At road width the
// title wraps against THIS, not against the card — which is why one estimator
// covers every closed card without knowing the card's width
const MARGIN = 16
const EMPTY_BODY_H = 30 // drop zone height when the active version has no steps
const SLOTH = 18 // catch height of a between-nodes drop slot (fills the AGAP)
const SELPAD = 7 // breathing room the selection box leaves around its members
// The action toolbar is a static strip pinned to the top of the road panel;
// BAR_ROW_H is one button row, used to size that strip's height.
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

/** The DS picker names a version twice: a short mono CODE for its position, and
 *  a written NAME. Our model carries only `label`, so the label is the name and
 *  the code is positional. An unnamed version still shows the placeholder, and
 *  the placeholder still takes room — so measure() and the head read it here,
 *  from one place, or the head would wrap against a width nobody reserved. */
const VERSION_UNNAMED = 'name this version'
const versionCode = (chosen: number): string => `v${chosen + 1}`
const versionName = (s: Stop, chosen: number): string => s.variants[chosen]?.label || VERSION_UNNAMED

/** how many lines `text` wraps to in `avail` px, clamped — the leafSize() trick
 *  (estimate the wrap, never measure it) applied to the head's two clamped
 *  fields. It has to be an estimate: layoutRoad places every box BEFORE anything
 *  renders, so there is no DOM to ask. */
const wrapLines = (text: string, avail: number): number => {
  const perLine = Math.max(1, Math.floor(avail / CHAR_W))
  return Math.min(HEAD_MAX_LINES, Math.max(1, Math.ceil(text.length / perLine)))
}

/** the rows a container reserves above its body: title + DescLine + version
 *  picker (#70 #86 #91). Variable now that all three wrap — `innerW` is the
 *  card's content width, which measure() already knows by the time it asks.
 *  The RENDER pass calls this too, with the same inputs, and gives each row the
 *  height it returns. That is the whole contract: one function decides, so a
 *  head can never draw taller than the space layoutRoad reserved for it. */
const headRows = (title: string, versionName: string, description: string, innerW: number) => {
  const titleH = Math.max(HEAD_ROW_MIN, wrapLines(title, innerW - HEAD_ORD_W - HEAD_BAR_W) * HEAD_LINE_H)
  const descH = Math.max(HEAD_DESC, wrapLines(description, innerW) * DESC_LINE_H)
  const pickH = Math.max(PICK_MIN_H, PICK_PAD_H + wrapLines(versionName, innerW - PICK_CHROME_W) * PICK_LINE_H)
  return { titleH, descH, pickH, total: HEAD_TOP + titleH + HEAD_GAP + descH + HEAD_GAP + pickH }
}
const headSize = (title: string, versionName: string, description: string, innerW: number): number =>
  headRows(title, versionName, description, innerW).total

/** the box a COLLAPSED container reserves — the DS folded card, predicted. Width
 *  stays NODEW so a fold still lines up with the leaf stops above and below it;
 *  only the height moves, and it moves a long way (a one-line fold is 71px where
 *  the old pill was 34). Ceiled, so the reservation is never a sub-pixel short of
 *  what renders — the overlap assertion in shot-cardhead.mjs is what catches the
 *  other direction. */
const foldSize = (title: string): { w: number; h: number } => {
  const perLine = Math.max(1, Math.floor(FOLD_TITLE_W / CHAR_W))
  const lines = Math.min(FOLD_MAX_LINES, Math.max(1, Math.ceil(title.length / perLine)))
  const rowH = lines <= 1 ? FOLD_ROW_MIN : lines * FOLD_LINE_H + FOLD_BASELINE_SLACK
  return { w: NODEW, h: Math.ceil(FOLD_CHROME + rowH) }
}
/** the y-offset from a card's top to where its single column of steps begins */
const bodyTop = (headH: number): number => headH + PAD

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
  /** an expanded container's single column box — the active version's steps. The
   * render pass reads it to size the empty-column drop zone and centre the column. */
  body?: Col
  /** an expanded container's head height, as headSize() predicted it. Carried so
   * the render pass offsets the body by the SAME number the layout used — the
   * head wraps now, so neither side can re-derive it from a constant. */
  headH?: number
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
  choices: Record<string, number>,
  withOptionals: boolean,
) {
  // one container, one column: the ACTIVE version's steps (#70). The comparator's
  // side-by-side columns are gone, so a card is as wide as its active version's
  // widest step (or its combobox), and as tall as that version's stack.
  // a bound leaf's box: wide enough for a short title on one line, growing (and
  // wrapping) toward NODE_MAXW / NODE_MAXH for a long one, then clamped (#72 #8).
  const leafSize = (title: string): { w: number; h: number } => {
    const w = Math.min(NODE_MAXW, Math.max(NODEW, title.length * CHAR_W + LEAF_CHROME_W))
    const perLine = Math.max(1, Math.floor((w - LEAF_CHROME_W) / CHAR_W))
    const lines = Math.max(1, Math.ceil(title.length / perLine))
    return { w, h: Math.min(NODE_MAXH, NODEH + (lines - 1) * LEAF_LINE_H) }
  }
  /** the active version's column: its widest step wide, its whole stack tall */
  const bodyColOf = (s: Stop): Col => {
    const kids = chosenSteps(s, choices).map(measure)
    const w = Math.max(NODEW, ...kids.map((c) => c.w))
    const h = kids.length ? kids.reduce((acc, c) => acc + c.h, 0) + (kids.length - 1) * AGAP : EMPTY_BODY_H
    return { w, h }
  }
  const measure = (s: Stop): { w: number; h: number; body?: Col; headH?: number } => {
    if (isLeaf(s) || collapsed.has(s.key!)) {
      // a bound leaf wraps and grows within bounds (#72 #8); an unset slot keeps
      // the fixed pill size; a COLLAPSED CONTAINER is the DS folded card now, so
      // it reserves that card's predicted height rather than a pill's (#91)
      if (isLeaf(s)) return s.unset ? { w: NODEW, h: NODEH } : leafSize(byId.get(s.node)?.title ?? '')
      return foldSize(s.title ?? '')
    }
    const body = bodyColOf(s)
    // factor both the stage title row and the version picker into the card's
    // minimum width so the card never collapses below its own header (#72 #3 / #70).
    // Width first, THEN height: the head's fields wrap against the width, so this
    // order is what keeps headSize() an answer rather than a circular question.
    const chosen = chosenIdx(s, choices)
    const name = versionName(s, chosen)
    const stageTitleW = Math.min(300, (s.title?.length ?? 0) * CHAR_W + HEAD_ORD_W + HEAD_BAR_W)
    const comboW = Math.min(300, name.length * CHAR_W + PICK_CHROME_W)
    const innerW = Math.max(NODEW, body.w, stageTitleW, comboW)
    const headH = headSize(s.title ?? '', name, s.description ?? '', innerW)
    return { w: innerW + 2 * PAD, h: bodyTop(headH) + body.h + PAD, body, headH }
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
      const m = measure(s)
      const { w, h } = m
      const x = centerX - w / 2
      slots.push({ path: p, x, y: prevBottom === null ? y - 8 : (prevBottom + y) / 2, w })
      lastW = w
      const skipped = !!s.optional && !withOptionals
      if (prevBottom !== null)
        arrows.push({ x1: centerX, y1: prevBottom + 3, x2: centerX, y2: y - 5, live: onRoad && !prevSkipped && !skipped, optional: !!s.optional })
      if (isLeaf(s)) {
        items.push({ path: p, stop: s, x, y, w, h, outline, onRoad, skipped, depth })
      } else if (collapsed.has(s.key!)) {
        items.push({ path: p, stop: s, x, y, w, h, outline, onRoad, skipped, depth })
      } else {
        const body = m.body!
        const headH = m.headH!
        items.push({ path: p, stop: s, x, y, w, h, outline, onRoad, skipped, depth, body, headH })
        // lay the ACTIVE version's steps as ONE column, centred under the card. It
        // is the road (live arrows, order numbers) when the container itself is on
        // the road. The other versions aren't drawn at all now (#70) — switching
        // versions swaps which steps this column holds.
        const chosen = chosenIdx(s, choices)
        const steps = s.variants[chosen].steps
        if (steps.length) placeList(steps, [...p, chosen], centerX, y + bodyTop(headH), onRoad && !skipped, depth + 1, outline)
      }
      prevBottom = y + h
      prevSkipped = skipped
      y += h + AGAP
    })
    if (list.length && prevBottom !== null)
      slots.push({ path: [...parent, list.length], x: centerX - lastW / 2, y: prevBottom + 8, w: lastW })
  }

  const W = Math.max(NODEW, ...stops.map((s) => measure(s).w)) + 2 * MARGIN
  placeList(stops, [], W / 2, MARGIN, true, 0, '')
  const bottoms = items.map((it) => it.y + it.h)
  const H = (bottoms.length ? Math.max(...bottoms) : 0) + MARGIN
  return { items, arrows, slots, W, H }
}

/** the version dropdown menu (#70) — the panel the combobox ▼ drops open. Leads
 * with "Create new version…" (italic), then one row per version: grey, but the
 * SELECTED (active) one is bold-green with a ✔ on its left. A per-row ✕ (on hover)
 * deletes that version. Rendered at BOARD level (like the delete-confirm popover)
 * so it escapes the card's stacking context and paints over the floating steps. */
function VersionMenu({
  stop,
  chosen,
  x,
  y,
  onPick,
  onCreate,
  onDelete,
}: {
  stop: Stop
  chosen: number
  x: number
  y: number
  onPick(k: number): void
  onCreate(): void
  onDelete(k: number): void
}) {
  return (
    <div
      data-vmenu={stop.key}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute z-50 min-w-[140px] max-w-[240px] py-1 rounded-lg border text-[var(--fs-caption)]"
      style={{ left: x, top: y, borderColor: 'var(--border-rule)', background: 'var(--surface-paper)', boxShadow: 'var(--lift-2)' }}
    >
      {stop.variants.map((vr, k) => {
        const active = k === chosen
        return (
          <div
            key={k}
            data-vrow={`${stop.key}.${k}`}
            className="group/vrow flex items-center gap-1 pl-1.5 pr-1 hover:bg-[var(--surface-hover)]"
          >
            {/* tick — MOSS, only on the selected version (#70: tick alone = selection) */}
            <span className={['shrink-0 w-3 text-center leading-none', active ? '' : 'invisible'].join(' ')} style={{ color: 'var(--accent-primary)' }}>✔</span>
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                onPick(k)
              }}
              className="flex-1 min-w-0 text-left truncate py-1"
              style={active ? { fontWeight: 'var(--fw-bold)', color: 'var(--accent-primary-ink)' } : { color: 'var(--text-2)' }}
            >
              {vr.label || `v${k + 1}`}
            </button>
            <button
              data-vrow-del={`${stop.key}.${k}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation()
                onDelete(k)
              }}
              title="delete this version"
              className="shrink-0 grid place-items-center w-3.5 h-3.5 rounded text-[var(--fs-micro)] leading-none hover:bg-[var(--state-danger-wash)]"
              style={{ color: 'var(--state-danger)' }}
            >
              ✕
            </button>
          </div>
        )
      })}
      <div className="my-1 border-t border-[var(--border-hair)]" />
      {/* create a new version — italic, at the bottom of the list (#70 design) */}
      <button
        data-vcreate={stop.key}
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.stopPropagation()
          onCreate()
        }}
        className="w-full flex items-center gap-1 px-2 py-1 italic hover:bg-[var(--surface-hover)]"
        style={{ color: 'var(--text-3)' }}
      >
        + Create new version…
      </button>
    </div>
  )
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
  choices: Record<string, number>
  pickBranch(key: string, idx: number): void
  withOptionals: boolean
  onLeafFocus?: (id: string) => void
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [mark, setMark] = useState<Mark>(null)
  const [hotSlot, setHotSlot] = useState<number | null>(null)
  // deleting a version that carries real steps ASKS first (#33) — the container's
  // path + which version + how many steps would go, so the ✕ on a dropdown row
  // never silently discards authored work. Empty versions skip straight to the drop.
  const [confirmVar, setConfirmVar] = useState<{ path: Path; idx: number; n: number } | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const marqueeDragRef = useRef(false)
  // which container's version LABEL is open for editing — the combobox rename box
  // (#70). Opened by clicking the combobox label, or when a new version is created.
  const [editKey, setEditKey] = useState<string | null>(null)
  // which container's stage TITLE is open for inline editing — Row 1 of the open
  // card header (#86 single-click-for-all-fields).
  const [titleEditKey, setTitleEditKey] = useState<string | null>(null)
  // which container's DESCRIPTION is open for editing — optional DescLine row (#86)
  const [descEditKey, setDescEditKey] = useState<string | null>(null)
  // which container is showing the "cannot ungroup — N versions" refusal note (#86)
  const [refuseKey, setRefuseKey] = useState<string | null>(null)
  const refuseTimer = useRef<number | null>(null)
  // which container's version DROPDOWN is open (the combobox ▼), or null. One at a
  // time; a board click or an outside click closes it.
  const [menuKey, setMenuKey] = useState<string | null>(null)
  // a toolbar button's keyboard-shortcut hint, revealed after a 1s hover (#15)
  const [shortcutHint, setShortcutHint] = useState<string | null>(null)
  const hintTimer = useRef<number | null>(null)

  const toggle = (key: string) => {
    const next = new Set(collapsed)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setCollapsed(next)
  }

  // create a fresh version, switch to it, and open its rename box (#70). The new
  // variant is appended, so its index is the pre-add length; addVariant seeds it
  // with one unset slot, so it reads as a blank new version with a default name.
  const createVersion = (s: Stop) => {
    const newIdx = s.variants.length
    state.addVariant(s.key!)
    pickBranch(s.key!, newIdx)
    setMenuKey(null)
    setEditKey(s.key!)
  }
  // show the ungroup-refused note and auto-dismiss after 2.5 s (#86)
  const showRefuse = (key: string) => {
    if (refuseTimer.current !== null) clearTimeout(refuseTimer.current)
    setRefuseKey(key)
    refuseTimer.current = window.setTimeout(() => {
      setRefuseKey(null)
      refuseTimer.current = null
    }, 2500)
  }

  // delete one version — asks first if it carries real (bound) steps (#33)
  const deleteVersion = (path: Path, s: Stop, k: number) => {
    const real = s.variants[k].steps.filter((st) => !(isLeaf(st) && st.unset))
    if (real.length === 0) state.dropVariant(path, k)
    else setConfirmVar({ path, idx: k, n: real.length })
    setMenuKey(null)
  }

  // close the open dropdown on any outside pointer-down (#70). A click on the
  // combobox or inside the menu itself stops propagation, so this only fires for
  // clicks elsewhere.
  useEffect(() => {
    if (menuKey === null) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null
      if (t && t.closest('[data-vmenu],[data-vcombo]')) return
      setMenuKey(null)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [menuKey])

  // dismiss the ungroup-refusal note on any pointer-down (#86)
  useEffect(() => {
    if (refuseKey === null) return
    const onDown = () => setRefuseKey(null)
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [refuseKey])

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
        const right = Math.max(...selItems.map((p) => p.x + p.w)) + SELPAD
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

  /** the per-node hover/select chrome (#15): a compact top-right corner cluster.
   * A container shows its active-version item count, minimise/maximise, and the
   * ✕; a leaf shows the ✕ only. What the ✕ does depends on the node: a leaf is
   * DELETED, a container is UNGROUPED — its active version's steps are lifted out
   * in place and the wrapper (plus any other versions) drops. Deleting a whole
   * group, contents and all, is the toolbar's ✕ Delete instead. Both are undoable.
   * It lives inside the node's `group`, so it fades in on hover; `shown` forces
   * it visible (selected, or mid-rename). */
  const browserBar = (pl: Placed, kind: 'leaf' | 'open' | 'closed', shown: boolean) => {
    const s = pl.stop
    const key = pathKey(pl.path)
    const count = kind === 'leaf' ? 0 : s.variants[chosenIdx(s, choices)]?.steps.length ?? 0
    const ctl = 'shrink-0 grid place-items-center w-3.5 h-3.5 rounded transition-colors'
    return (
      <span
        data-browserbar={key}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        className={['shrink-0 flex items-center gap-0.5 pl-0.5 transition-opacity duration-150', shown ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'].join(' ')}
      >
        {kind === 'closed' && (
          // item counter: active-version step count in a round unfilled circle (#15).
          // CLOSED pills only since #91 — an open card carries the DS tally line
          // ("3 steps") in its head instead, which is always visible rather than
          // fading in on hover, and there is room there for the word.
          <span
            title={`${count} inside`}
            aria-label={`${count} items inside`}
            className="shrink-0 grid place-items-center min-w-[15px] h-3.5 px-1 rounded-full border text-[var(--fs-micro)] font-bold tabular-nums leading-none"
            style={{ borderColor: 'var(--border-rule)', color: 'var(--text-3)' }}
          >
            {count}
          </span>
        )}
        {kind !== 'leaf' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggle(s.key!)
            }}
            title={kind === 'closed' ? 'maximise' : 'minimise'}
            aria-label={kind === 'closed' ? 'maximise' : 'minimise'}
            className={[ctl, 'hover:bg-[var(--surface-hover)] hover:text-[var(--text-1)]'].join(' ')}
            style={{ color: 'var(--text-3)' }}
          >
            {kind === 'closed' ? '▢' : '—'}
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (kind === 'leaf') state.deleteAt(pl.path)
            else if (s.variants.length > 1) showRefuse(s.key!)
            else state.promote(pl.path, chosenIdx(s, choices))
          }}
          title={kind === 'leaf' ? 'delete this node' : 'ungroup — lift its steps out (use the toolbar ✕ Delete to remove the whole group)'}
          aria-label={kind === 'leaf' ? 'delete' : 'ungroup'}
          className={[ctl, 'hover:bg-[var(--state-danger-wash)] hover:text-[var(--state-danger)]'].join(' ')}
          style={{ color: 'var(--state-danger)' }}
        >
          ✕
        </button>
      </span>
    )
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
    if ((e.target as HTMLElement).closest('[data-rnode],[data-rhead],[data-rstage],[data-rstage-closed],[data-fly],[data-varconfirm],[data-varrefuse],[data-vmenu],[data-vcombo],[data-rbody],button,input,select')) return
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
          <svg className="absolute inset-0 pointer-events-none z-10" width={W} height={H}>
            <defs>
              <marker id="wt-road-head" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: 'var(--acorn-600)' }} />
              </marker>
              <marker id="wt-road-ghost" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: 'var(--text-3)' }} />
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
                style={{ stroke: a.live ? 'var(--acorn-600)' : 'var(--text-3)' }}
                strokeWidth={a.live ? 2.5 : 1.5}
                strokeDasharray={a.optional ? '5 4' : a.live ? undefined : '4 3'}
                markerEnd={a.live ? 'url(#wt-road-head)' : 'url(#wt-road-ghost)'}
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
                    'group absolute z-20 rounded-full border px-3 flex items-center gap-1.5 text-[var(--fs-body)] font-semibold cursor-grab',
                    'transition-[left,top,width,height] duration-200 ease-out',
                    s.optional ? 'border-dashed' : '',
                    dim,
                    isSelected ? SEL_OUTLINE : '',
                  ].join(' ')}
                  style={{
                    left: pl.x, top: pl.y, width: pl.w, height: pl.h,
                    borderWidth: 'var(--stroke-rule)',
                    borderColor: color,
                    color: 'var(--text-1)',
                    background: 'var(--surface-raised)',
                    boxShadow: !isSelected && sync.lit(s.node) ? 'var(--ring-linked)' : undefined,
                  }}
                >
                  <span data-rord={pl.outline} className="shrink-0 text-[var(--fs-micro)] font-bold tabular-nums" style={{ color: 'var(--text-3)' }}>
                    {pl.outline}.
                  </span>
                  {/* a leaf (unnested node) centres its title (#15). #72 #8: it
                      WRAPS now instead of truncating — the node grew to fit in
                      measure()/leafSize, bounded by NODE_MAXW/NODE_MAXH. */}
                  <span className="flex-1 text-center whitespace-normal break-words leading-tight">{byId.get(s.node)!.title}</span>
                  {/* #15: a leaf's close (delete) button, top-right, on hover/select */}
                  {browserBar(pl, 'leaf', isSelected)}
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
                  className={[
                    'group absolute z-20 cursor-grab',
                    'transition-[left,top,width,height] duration-200 ease-out',
                    pl.path.length === 1 ? 'hover-lift' : '',
                    dim,
                    isSelected ? SEL_OUTLINE : mark?.key === key && mark.band === 'inside' ? 'ring-2 ring-[var(--accent-primary)] rounded-[var(--radius-lg)]' : '',
                  ].join(' ')}
                  style={{
                    left: pl.x, top: pl.y, width: pl.w, height: pl.h,
                    // dashed ALWAYS means conditional. The DS card owns its own
                    // border, so optionality rides OUTSIDE it as an offset dashed
                    // outline rather than restyling the component's edge. It
                    // yields to selection, which wants the same outline and is
                    // the more urgent of the two signals.
                    ...(s.optional && !isSelected
                      ? { outline: '1.5px dashed var(--border-dashed)', outlineOffset: '2px', borderRadius: 'var(--radius-lg)' }
                      : {}),
                  }}
                >
                  <VersionedGroup
                    folded
                    title={s.title ?? ''}
                    index={pl.outline}
                    description={s.description ?? ''}
                    count={shutSteps.length}
                    countLabel="steps"
                    versions={s.variants.map((v, i) => ({ id: String(i), name: v.label || VERSION_UNNAMED, label: versionCode(i) }))}
                    activeId={String(shutChosen)}
                    // TOLD, never measured: `narrow` uninstalls the component's
                    // ResizeObserver, which is what lets foldSize() predict this
                    // box before it renders. `width` pins it to the leaf column so
                    // a fold still lines up with the stops above and below it.
                    narrow
                    width={NODEW}
                    foldedMinWidth={NODEW}
                    // both gestures belong to the road: dragging a stop is the
                    // board's job, and a fold has no resize handle to offer
                    movable={false}
                    resizable={false}
                    // the #15 gesture set, now drawn by the DS: its RestoreMark
                    // maximises, and its ✕ ungroups — including the refusal when
                    // more than one version lives here, which askUngroup already
                    // implements exactly as the road did by hand. Both stay ops on
                    // `authordraft`, so undo/redo holds.
                    onToggleFold={() => toggle(s.key!)}
                    onClose={() => state.promote(pl.path, shutChosen)}
                    ungroupBlockedLabel={`cannot ungroup — ${s.variants.length} versions live here; delete all but one first`}
                  />
                </div>
              )
            }

            // a container — the OPEN card (#70). ONE version showing: the active
            // one, as a single centred column. Its steps float over the body as
            // board-level siblings, so no inner click bubbles up; the card itself
            // draws only the combobox header and (when the version is empty) the
            // drop zone. The version switcher is the combobox ▼ / board-level menu.
            const editing = editKey === s.key
            const menuOpen = menuKey === s.key
            const chosen = chosenIdx(s, choices)
            const steps = chosenSteps(s, choices)
            const code = versionCode(chosen)
            const name = s.variants[chosen]?.label ?? ''
            // the active version's column, centred under the card (mirrors layoutRoad)
            const body = pl.body ?? { w: NODEW, h: EMPTY_BODY_H }
            const bodyLeft = (pl.w - body.w) / 2
            // the same call layoutRoad made, so every row draws at the height it
            // was measured at — see headRows()
            const rows = headRows(s.title ?? '', versionName(s, chosen), s.description ?? '', pl.w - 2 * PAD)
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
                // #15: minimise is the browser-bar button now — no double-click to
                // collapse. (A collapsed pill still double-clicks to expand.)
                title="click the title or version name to rename · ▼ to switch versions · drag to move"
                // Elevation grammar (0005 D1): an OPEN container is RECESSED — a
                // well sunk into the board, not a green-tinted card. Its surface
                // darkens one step per nesting depth (wellFill) and it carries the
                // inset --sink-well shadow, so containment reads as depth and keeps
                // reading when wells nest. The green border/wash is retired; a
                // neutral hairline is all an open well needs — DASHED when the
                // container is optional (border + inbound arrow, no bypass rail).
                // Since the shadow pass it ALSO casts an OUTER --lift-node drop
                // shadow so the whole card floats off the board — a floating
                // recessed panel, superseding D1's "an open well casts nothing".
                // hover-lift scales it to 1.05 on hover like every group node.
                className={[
                  'group absolute z-[5] rounded-2xl border cursor-pointer',
                  // #72 #2: only a TOP-LEVEL card lifts; a nested one is part of its
                  // parent, so hovering into it no longer fires a second lift.
                  pl.path.length === 1 ? 'hover-lift' : '',
                  s.optional ? 'border-dashed' : '',
                  // #72 #10: the whole card carries the selection outline now, not
                  // just its header — a nested card reads as selected end to end.
                  isSelected ? SEL_OUTLINE : '',
                  dim,
                ].join(' ')}
                style={{
                  left: pl.x,
                  top: pl.y,
                  width: pl.w,
                  height: pl.h,
                  background: wellFill(pl.depth),
                  borderColor: 'var(--border-well)',
                  boxShadow: 'var(--sink-well), var(--lift-node)',
                }}
              >
                <div
                  {...gestures(pl)}
                  data-rhead={s.key}
                  className="cursor-grab rounded-t-2xl flex flex-col"
                  style={{ paddingLeft: PAD, paddingRight: PAD, paddingTop: HEAD_TOP, gap: HEAD_GAP }}
                >
                  {/* Row 1 — the DS head row (#91): outline · title (wraps to two
                      lines) · tally · controls. Baseline-aligned like the DS, with
                      the control cluster pinned to the top so a two-line title
                      doesn't drag the buttons down with it. */}
                  <div className="flex gap-1.5" style={{ height: rows.titleH, alignItems: 'baseline' }}>
                    <span
                      data-rord={pl.outline}
                      className="shrink-0"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--fs-caption)',
                        fontVariantNumeric: 'var(--tnum)',
                        fontWeight: 'var(--fw-medium)',
                        lineHeight: 'var(--lh-snug)',
                        color: 'var(--text-2)',
                      }}
                    >
                      {pl.outline}
                    </span>
                    {titleEditKey === s.key ? (
                      <input
                        data-rtitle={s.key}
                        autoFocus
                        value={s.title ?? ''}
                        placeholder="name this stage"
                        onChange={(e) => state.retitle(s.key!, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => setTitleEditKey(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') setTitleEditKey(null)
                        }}
                        className="flex-1 min-w-0 text-[var(--fs-body)] font-bold outline-none px-0.5 rounded-sm"
                        style={{ color: 'var(--text-1)', background: 'var(--surface-raised)', borderBottom: '1px solid var(--border-strong)' }}
                      />
                    ) : (
                      <span
                        data-rstitle={s.key}
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuKey(null)
                          setEditKey(null)
                          setTitleEditKey(s.key!)
                        }}
                        title="click to rename this stage"
                        className="min-w-0 cursor-text"
                        style={{
                          flex: '1 1 auto',
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: HEAD_MAX_LINES,
                          overflow: 'hidden',
                          overflowWrap: 'anywhere',
                          whiteSpace: 'normal',
                          lineHeight: 'var(--lh-snug)',
                          fontFamily: 'var(--font-display)',
                          fontSize: 'var(--fs-body)',
                          fontWeight: 'var(--fw-bold)',
                          color: 'var(--text-1)',
                        }}
                      >
                        {s.title}
                      </span>
                    )}
                    {/* the DS tally line — always readable, where our count pill
                        used to fade in on hover. The number is mono so a column
                        of cards lines its digits up. */}
                    <span
                      data-rtally={s.key}
                      title={`${steps.length} inside this version`}
                      className="shrink-0 self-start"
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: 'var(--fs-micro)',
                        lineHeight: 'var(--lh-snug)',
                        color: 'var(--text-3)',
                      }}
                    >
                      <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'var(--tnum)', fontWeight: 'var(--fw-medium)' }}>
                        {steps.length}
                      </span>
                      {steps.length === 1 ? ' step' : ' steps'}
                    </span>
                    <span className="shrink-0 self-start flex items-center">
                      {browserBar(pl, 'open', isSelected || editing || titleEditKey === s.key)}
                    </span>
                  </div>
                  {/* Row 1.5: DescLine — a short caption beneath the title, always present (#86).
                      It wraps to two lines like the DS DescLine, and headRows()
                      reserved exactly this height for it. */}
                  <div style={{ height: rows.descH }} className="flex items-start">
                    {descEditKey === s.key ? (
                      <input
                        data-rdesc={s.key}
                        autoFocus
                        value={s.description ?? ''}
                        placeholder="describe this stage…"
                        onChange={(e) => state.redesc(s.key!, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={() => setDescEditKey(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') setDescEditKey(null)
                        }}
                        className="flex-1 min-w-0 text-[var(--fs-caption)] outline-none px-0.5 rounded-sm"
                        style={{ color: 'var(--text-2)', background: 'var(--surface-raised)', borderBottom: '1px solid var(--border-strong)' }}
                      />
                    ) : (
                      <span
                        data-rdesc={s.key}
                        onClick={(e) => { e.stopPropagation(); setDescEditKey(s.key!) }}
                        title="click to add a description"
                        className={[
                          'min-w-0 cursor-text transition-opacity duration-100',
                          // DS shows its placeholder always; a board of nested cards
                          // would then repeat "describe this stage…" on every one, so
                          // the empty state still waits for hover here (#86).
                          s.description ? '' : 'opacity-0 group-hover:opacity-100',
                        ].join(' ')}
                        style={{
                          flex: '1 1 auto',
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: HEAD_MAX_LINES,
                          overflow: 'hidden',
                          overflowWrap: 'anywhere',
                          whiteSpace: 'normal',
                          fontFamily: 'var(--font-ui)',
                          fontSize: 'var(--fs-caption)',
                          lineHeight: 'var(--lh-snug)',
                          fontStyle: s.description ? 'normal' : 'italic',
                          color: s.description ? 'var(--text-2)' : 'var(--text-3)',
                        }}
                      >
                        {s.description || 'describe this stage…'}
                      </span>
                    )}
                  </div>
                  {/* Row 2 — the DS version picker (#91). The whole row is the
                      control: click it to drop the menu, click the NAME to rename.
                      It names the version twice, as the DS does — a mono code for
                      where it sits, a written name for what it is. The tick and the
                      caret are the DS's drawn marks, not glyphs. */}
                  <div
                    data-vcombo={s.key}
                    role="button"
                    tabIndex={0}
                    title="show all versions"
                    aria-label="show all versions"
                    aria-expanded={menuOpen}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (editing) return
                      setEditKey(null)
                      setTitleEditKey(null)
                      setMenuKey(menuOpen ? null : s.key!)
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter' && e.key !== ' ') return
                      e.preventDefault()
                      setMenuKey(menuOpen ? null : s.key!)
                    }}
                    className="flex gap-1.5 rounded-md border border-transparent cursor-pointer transition-colors duration-100 hover:border-[var(--border-rule)] hover:bg-[var(--surface-sunken-2)]"
                    style={{ height: rows.pickH, alignItems: 'flex-start', padding: '5px 6px 5px 7px' }}
                  >
                    <span
                      aria-hidden
                      className="shrink-0 grid place-items-center"
                      style={{ width: 12, height: 18, color: 'var(--accent-primary-ink)' }}
                    >
                      <span style={checkStyle()} />
                    </span>
                    <span
                      className="shrink-0"
                      style={{
                        lineHeight: '18px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: 'var(--fs-micro)',
                        fontVariantNumeric: 'var(--tnum)',
                        fontWeight: 'var(--fw-medium)',
                        color: 'var(--accent-primary-ink)',
                      }}
                    >
                      {code}
                    </span>
                    {editing ? (
                      <input
                        data-vrename={s.key}
                        autoFocus
                        value={s.variants[chosen]?.label ?? ''}
                        placeholder={VERSION_UNNAMED}
                        onChange={(e) => state.relabelVariant(s.key!, chosen, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        onBlur={() => setEditKey(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') setEditKey(null)
                        }}
                        className="flex-1 min-w-0 outline-none px-0.5 rounded-sm"
                        style={{
                          fontSize: 'var(--fs-body)',
                          fontWeight: 'var(--fw-semibold)',
                          lineHeight: '18px',
                          color: 'var(--accent-primary-ink)',
                          background: 'var(--surface-raised)',
                          borderBottom: '1px solid var(--border-strong)',
                        }}
                      />
                    ) : (
                      <span
                        data-vlabel={s.key}
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuKey(null)
                          setTitleEditKey(null)
                          setEditKey(s.key!)
                        }}
                        title="click to rename this version"
                        className="min-w-0 cursor-text"
                        style={{
                          flex: '1 1 auto',
                          display: '-webkit-box',
                          WebkitBoxOrient: 'vertical',
                          WebkitLineClamp: HEAD_MAX_LINES,
                          overflow: 'hidden',
                          overflowWrap: 'anywhere',
                          whiteSpace: 'normal',
                          lineHeight: 'var(--lh-snug)',
                          fontSize: 'var(--fs-body)',
                          fontWeight: 'var(--fw-semibold)',
                          fontStyle: name ? 'normal' : 'italic',
                          color: name ? 'var(--accent-primary-ink)' : 'var(--text-3)',
                        }}
                      >
                        {name || VERSION_UNNAMED}
                      </span>
                    )}
                    <span
                      data-varrow={s.key}
                      aria-hidden
                      className="shrink-0 grid place-items-center"
                      style={{ width: 16, height: 16, marginTop: 1, color: menuOpen ? 'var(--text-2)' : 'var(--text-3)' }}
                    >
                      <span style={caretStyle(menuOpen)} />
                    </span>
                  </div>
                </div>

                {/* the ACTIVE version's steps float over the body as board-level
                    siblings (placed by layoutRoad). When that version is empty, a
                    single centred drop zone stands in — GREY, not red (0005:
                    unfinished, not wrong). No version boxes, no per-column headers,
                    no namecard: one version shows at a time now (#70). */}
                {steps.length === 0 && (
                  <div
                    data-rbody={`${s.key}.${chosen}`}
                    onClick={(e) => e.stopPropagation()}
                    onDragOver={(e: ReactDragEvent) => e.preventDefault()}
                    onDrop={(e: ReactDragEvent) => {
                      setMark(null)
                      handleDrop(e, [...pl.path, chosen, 0], state)
                    }}
                    className="absolute z-30 rounded-lg border-2 border-dashed flex items-center justify-center text-[var(--fs-micro)]"
                    style={{ left: bodyLeft, top: bodyTop(pl.headH ?? 0), width: body.w, height: EMPTY_BODY_H, borderColor: 'var(--border-dashed)', background: 'var(--surface-veil)', color: 'var(--text-3)' }}
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
                  style={{ left: pl.x, top: mark.band === 'before' ? pl.y - 6 : pl.y + pl.h + 3, width: pl.w, background: 'var(--acorn-500)' }}
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

          {/* the version DROPDOWN (#70) — rendered at board level so it escapes the
              card's stacking context and paints over the floating steps. Anchored
              under the combobox: the card's left+PAD, just below the header row. */}
          {menuKey !== null &&
            (() => {
              const card = items.find((pl) => pl.stop.key === menuKey)
              if (!card) return null
              return (
                <VersionMenu
                  stop={card.stop}
                  chosen={chosenIdx(card.stop, choices)}
                  x={card.x + PAD}
                  y={card.y + (card.headH ?? NODEH)}
                  onPick={(k) => {
                    pickBranch(menuKey, k)
                    setMenuKey(null)
                  }}
                  onCreate={() => createVersion(card.stop)}
                  onDelete={(k) => deleteVersion(card.path, card.stop, k)}
                />
              )
            })()}

          {/* version-delete confirm (#33) — deleting a version that carries real
              steps asks first, anchored just under the card's combobox header. */}
          {confirmVar &&
            (() => {
              const card = items.find((pl) => pathKey(pl.path) === pathKey(confirmVar.path))
              if (!card) return null
              return (
                <div
                  data-varconfirm
                  className="absolute z-50 flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[var(--fs-caption)]"
                  style={{ left: Math.max(4, Math.min(card.x, W - 200)), top: card.y + bodyTop(card.headH ?? NODEH) + 2, borderColor: 'var(--border-rule)', background: 'var(--surface-paper)', boxShadow: 'var(--lift-2)' }}
                >
                  <span style={{ color: 'var(--text-2)' }}>
                    Delete version + {confirmVar.n} step{confirmVar.n > 1 ? 's' : ''}?
                  </span>
                  <button
                    data-varconfirm-yes
                    onClick={() => {
                      state.dropVariant(confirmVar.path, confirmVar.idx)
                      setConfirmVar(null)
                    }}
                    className="px-1.5 py-0.5 rounded"
                    style={{ color: 'var(--text-inverse)', background: 'var(--state-danger)' }}
                  >
                    Delete
                  </button>
                  <button
                    data-varconfirm-no
                    onClick={() => setConfirmVar(null)}
                    className="px-1.5 py-0.5 rounded hover:bg-[var(--surface-hover)]"
                    style={{ color: 'var(--text-2)' }}
                  >
                    Cancel
                  </button>
                </div>
              )
            })()}

          {/* ungroup-refused note (#86) — shown when ✕ is clicked on a multi-version
              container; auto-dismisses after 2.5 s or on any next pointer-down. */}
          {refuseKey !== null &&
            (() => {
              const card = items.find((pl) => pl.stop.key === refuseKey)
              if (!card) return null
              const n = card.stop.variants.length
              return (
                <div
                  data-varrefuse
                  className="absolute z-50 px-2 py-1.5 rounded-lg border text-[var(--fs-caption)] max-w-[220px]"
                  style={{ left: Math.max(4, Math.min(card.x, W - 224)), top: card.y + (card.headH ?? NODEH) + 4, borderColor: 'var(--border-hair)', background: 'var(--surface-paper)', boxShadow: 'var(--lift-1)', color: 'var(--text-2)' }}
                >
                  cannot ungroup — {n} versions live here; delete all but one first
                </div>
              )
            })()}
        </div>
      )}
    </div>
  )
}
