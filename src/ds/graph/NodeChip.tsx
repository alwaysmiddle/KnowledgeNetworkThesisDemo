import React, { useState, useRef, useEffect } from 'react'
import type { DomainCode } from './vocab'
import { DOMAIN_TOKEN } from './vocab'
import { useRecede } from '../chrome/IconButton'

/** WHAT EACH FORM'S BORDER WEIGHS, published because A CONNECTOR IS DRAWN AT THE BORDER
 *  WEIGHT OF WHAT IT CONNECTS AND NEVER ABOVE IT. The nodes are the objects; a line
 *  between them is a statement about them, so it is never the heaviest mark in the row.
 *  `NodeArrow.shaftFor(mark)` turns one of these into a shaft weight, so no caller ever
 *  types 1.5 or 1.25, and `NodeChain` reads the mark off the chips it places and needs no
 *  help at all. Keep this in step with the `border:` branch in the chip's style below — it
 *  is the same three cases. The weights travel ONE WAY, from the chip that draws the border
 *  to the line that answers it: this file must never import back from a connector. */
export const CHIP_BORDER: Record<string, number> = { dot: 1, border: 1.5, 'border-2': 1, none: 1 }

/** the border weight of a chip form, in px. An unknown or absent form falls back to the
 *  full-rank 1.5. THAT FALLBACK IS FOR A FORM NAME NOBODY RECOGNISES, not for a non-chip
 *  neighbour: a `VersionedGroup` card weighs 1px, not 1.5, and answers through its own
 *  `joinBorder` static. The DS's own docblock claimed otherwise for one afternoon and had a
 *  chain of group cards taking a 1.5 shaft against 1px edges — the same fault the 3px shaft
 *  was, one component over. */
export function chipBorder(mark?: string): number {
  return mark !== undefined && CHIP_BORDER[mark] !== undefined ? CHIP_BORDER[mark] : CHIP_BORDER.border
}

/** WHERE THE DISC SITS ON A STACKED CHIP, measured rather than chosen (the DS's
 *  `guidelines/chip-wrap-alignment.html`, 2026-08-19). A stacked chip aligns on the name's
 *  FIRST-LINE BASELINE, which is exact for the step number and leaves the disc 0.83px low,
 *  because a box with no text in it has no baseline and CSS synthesizes one from its border
 *  box. So the disc opts OUT (`alignSelf: flex-start`) and is placed against the first
 *  line's TOP, which does not move as the name wraps.
 *  TWO MECHANISMS THAT DO NOT WORK, both tried in the DS's rig before this one:
 *  `marginBottom`, because margins do not move a synthesized baseline (it reads 0.83
 *  unchanged); and `alignSelf: center`, which centres the disc in the whole flex line and so
 *  drifts with every line the name gains (0.44 → 17.98 across three) — and which looks
 *  correct on a one-line chip, so do not "simplify" to it. */
const DOT_FIRST_LINE_INSET = 4.83

/** A corpus node as a chip: dot (or border, or nothing), truncating title, raised
 *  on paper. Port of DS components/graph/NodeChip.jsx.
 *
 *  TWO AXES, AND THEY DO NOT INTERACT. Keep them apart when reading these props and
 *  when adding one:
 *
 *    1. WHAT THE CHIP IS — `mark`, which of the sanctioned carriers holds the domain
 *       hue and at which rank. The SURFACE picks it. Plus the states `lit`, `dim` and
 *       `wrap`, which say how this chip stands right now.
 *    2. WHAT CAN BE DONE TO IT — `selectable` (a click), `resizable` (an edge drag),
 *       `onDelete` (a ✕). ALL THREE ARE OPT-IN, ALL THREE DEFAULT OFF, and ALL THREE
 *       WORK ON EVERY `mark` FORM. `<NodeChip title domain />` is the static chip.
 *
 *  So a capability is never a property of a form: there is no resizable form and no
 *  clickable form, and tying one to `mark` — or giving one a form-dependent default —
 *  makes two components out of one. If a chip should not be sized in a dense list,
 *  that is a fact about the LIST, and the list omits the prop.
 *
 *  Deviations from DS source:
 *  - Uses DOMAIN_TOKEN from ./vocab instead of an inline DOMAIN map (single source) */

export interface NodeChipProps {
  /** the node's NAME. A `ReactNode` rather than a string since 2026-08-19, so a caller can
   *  hand in a composed sentence — `EdgeEntry` passes a bold anchor and an elided
   *  `Parent / … / ` prefix, which belong to the SENTENCE rather than to the chip. Widening
   *  accepts every string that compiled before. Pass `note` alongside a non-string title:
   *  the tooltip reads `note` first and cannot render an element. */
  title: React.ReactNode
  /** the node's step number in its container ("2.1") — derived, mono, tabular,
   *  --fs-micro at --text-3: a figure glanced at beside the name, never level with it */
  index?: string
  domain: DomainCode
  /** which carrier holds the domain colour. 'dot' (default) is the dense form for
   *  trails, legends and rails; 'border' is a 1.5px domain-coloured edge with no disc,
   *  for a node standing on its own — a stop inside a group, a node on the road;
   *  'none' is no disc and no hue at all — for a surface where domain is not the
   *  channel being read and the edge's only job is to report selection;
   *  'border-2' is THE FORM FOR A NODE BEING NAMED RATHER THAN ACTED ON — the same border
   *  one rank down (1px of domain hue), a transparent face, NO LIFT, caption type at
   *  --text-2, --radius-md and centred text. A chip is the object: raised, white, the thing
   *  being arranged. This is a MENTION of an object that lives somewhere else, and a
   *  citation set in the same ink as the thing cited reads as a second copy of it.
   *  `EdgeEntry`'s two ends are this form and it is what the form was invented for — it drew
   *  them itself as a private node until the DS promoted the recipe. Not to be confused with
   *  `dim`, which is a STATE on any form (off the resolved path) rather than a rank. */
  mark?: 'dot' | 'border' | 'border-2' | 'none'
  /** off the resolved path: no lift, no fill, --opacity-off-path */
  dim?: boolean
  /** THIS NODE IS CONDITIONAL — an optional stop, one that may be bypassed. A STATE, not a
   *  form: it works on all four marks and beside every capability, the same as `lit` and
   *  `dim`. Ours originally, reported on drift-log #74 as a form the DS should own; adopted
   *  from the DS 2026-08-19, which kept the dashed border and ADDED the word.
   *
   *  It says two things at once, on purpose. The border DASHES, which is what dashed already
   *  means everywhere in this system (`NodeArrow dashed`, the group's empty-version zone):
   *  conditional, not yet, may not happen. And the chip says the WORD, because a dash is a
   *  convention and a convention only speaks to a reader who has already learnt it — the
   *  drawing carries the meaning for someone fluent in the system, the word carries it for
   *  everyone else.
   *
   *  DASHED RATHER THAN A COLOUR because a node's hue is its DOMAIN and its border width is
   *  what a connector matches (`chipBorder`), so neither channel is free to carry a state;
   *  the line's style is the only one left. Do NOT reach for `--state-optional` — it is a
   *  shade of acorn, and acorn means ON THE AUTHORED WALK, so an optional step painted with
   *  it says the opposite of what it is.
   *
   *  THE WORD IS FIXED AT "(optional)" AND THERE IS NO PROP TO REWORD IT. One condition, one
   *  name: the moment a caller can write its own wording, the same state reads "optional" on
   *  one screen and "if time allows" on the next, and a reader cannot tell whether those are
   *  two conditions or one. There is also NO GLYPH — no typed ◇ — which is a deliberate
   *  removal, not an omission: the drawn vocabulary is a closed set of four marks (caret,
   *  bin, live-version check, restore), and a state does not join that set by being typed
   *  instead of drawn.
   *
   *  WHERE THE WORD GOES DEPENDS ON THE RANK. A full-rank chip is an object, so the word sits
   *  UNDER the name on its own line (--fs-micro, italic, --text-3) and the chip drops to
   *  --radius-md — which makes it ONE --fs-micro LINE TALLER than the same chip without it,
   *  and `chipSize()` models that. A `border-2` chip is a mention inside a sentence, where a
   *  second line would outweigh the sentence around it, so there the word follows inline. */
  optional?: boolean
  /** cross-pane hover correspondence — a 1.5px pond ring over the chip's own lift */
  lit?: boolean
  /** SELECTABLE OR STATIC — static is the default, and most chips in this product are:
   *  a legend, a trail, a rail and an entry all show nodes being READ. Pass this for a
   *  chip that answers a click, which is what the road's stops and a group's children
   *  are. A click TOGGLES: click again and it is unselected */
  selectable?: boolean
  /** PICKED. A 2px --state-selected outline at 2px offset, sitting OUTSIDE the chip's
   *  own border rather than replacing it — so a picked network node is still visibly a
   *  network node. Hue is the data channel, pond is the state channel, and one stroke
   *  cannot carry both. An outline rather than a border because it takes no layout: a
   *  chip must not move when it is picked, nor shift its neighbours in a chain.
   *  Replaces the `lit` ring while on: one ring per meaning, never stacked.
   *
   *  Pass it and the caller owns the selection (what a board holding more than one must
   *  do); omit it and `selectable` keeps the state here. Drawing follows it either way,
   *  so a board can paint a chip picked without also handing it a gesture */
  selected?: boolean
  /** the starting state when the chip keeps its own. Default false */
  defaultSelected?: boolean
  /** the toggle's report, controlled or not */
  onSelectedChange?: (selected: boolean) => void
  /** tooltip; the stop's note when there is one */
  note?: string
  /** the title wraps (break-word, no clamp) instead of truncating; the chip squares
   *  to --radius-md and top-aligns its furniture so a two-line name reads down */
  wrap?: boolean
  onClick?: () => void
  /** SIZEABLE OR FIXED — fixed is the default. Pass this and the chip's right edge
   *  sizes its width, its bottom edge its height and its corner both; double-click an
   *  edge and that dimension goes back to automatic. Opt-in because three invisible
   *  grab strips are a promise, and most chips are being read rather than arranged — a
   *  strip at every edge of a chip in a twenty-row legend takes the pointer near
   *  something with nothing to answer. Available on EVERY `mark` form: dot, border and
   *  none resize identically, and a chip's form never decides what can be done to it.
   *  Default false (**changed 2026-08-18 upstream, OB-015** — it was true, so a caller
   *  that says nothing now gets the static chip) */
  resizable?: boolean
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
  /** CONTROLLED SIZE, on the same terms as VersionedGroup's. Omit and the chip keeps
   *  whatever the user dragged it to; pass these and the caller's numbers win — which is
   *  what a canvas needs, since a size held in the chip's own state cannot be saved
   *  across a reload, undone, or read by anything that aligns or packs. The drag itself
   *  always runs on own state and `onResize` reports on pointer-up; at rest the prop is
   *  authoritative. `null` on an axis is automatic, the same as double-clicking that edge */
  width?: number | null
  height?: number | null
  /** fires on pointer-up after an edge drag, and on the double-click that gives an axis
   *  back to automatic (`null` for that axis) */
  onResize?: (size: { width: number | null; height: number | null }) => void
  /** delete this node — adds a ✕ at the chip's trailing edge that arrives with hover
   *  or focus, berry at rest, and keeps its space reserved so the chip never changes width */
  onDelete?: () => void
}

interface SizeBounds { minW: number; maxW: number; minH: number; maxH: number }
interface SizeState { w: number | null; h: number | null }
type ResizeReport = (size: { width: number | null; height: number | null }) => void

function useSizeDrag(
  ref: React.RefObject<HTMLSpanElement | null>,
  bounds: SizeBounds,
  controlled: SizeState | null,
  onResize?: ResizeReport,
) {
  const [ownSize, setOwnSize] = useState<SizeState | null>(null)
  const [sizing, setSizing] = useState(false)
  /* CONTROLLED SIZE, on the same terms as VersionedGroup's: no prop and the chip keeps
     what it was dragged to, prop and the caller's number wins. A canvas has to own this
     — a size living in this hook cannot be saved across a reload, undone, or read by
     anything that aligns or packs. The drag itself always runs on own state (routing
     every pointermove out and back is what makes a controlled drag lag), so `sizing`
     hands the gesture back for its duration and `onResize` reports on pointer-up. */
  const size = controlled && !sizing ? controlled : ownSize
  const start = (axis: 'x' | 'y' | 'both') => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    const box = ref.current && ref.current.getBoundingClientRect()
    if (!box) return
    const node = e.currentTarget as HTMLElement
    const from = { x: e.clientX, y: e.clientY, w: box.width, h: box.height }
    let last: SizeState = { w: (size && size.w) || Math.round(box.width), h: (size && size.h) || Math.round(box.height) }
    /* seed from what is on screen NOW, so a controlled chip does not flash back to
       automatic between pointerdown and the first move */
    setSizing(true)
    setOwnSize(last)
    try { node.setPointerCapture(e.pointerId) } catch { /* older pointer impls */ }
    const move = (ev: PointerEvent) => {
      const w = axis === 'y' ? last.w
        : Math.round(Math.max(bounds.minW, Math.min(bounds.maxW, from.w + (ev.clientX - from.x))))
      const h = axis === 'x' ? last.h
        : Math.round(Math.max(bounds.minH, Math.min(bounds.maxH, from.h + (ev.clientY - from.y))))
      last = { w, h }
      setOwnSize(last)
    }
    const up = () => {
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', up)
      node.removeEventListener('pointercancel', up)
      setSizing(false)
      if (onResize) onResize({ width: last.w, height: last.h })
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', up)
    node.addEventListener('pointercancel', up)
  }
  const reset = (axis: 'x' | 'y' | 'both') => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!size) return
    const next: SizeState = { w: axis === 'y' ? size.w : null, h: axis === 'x' ? size.h : null }
    setOwnSize(!next.w && !next.h ? null : next)
    if (onResize) onResize({ width: next.w, height: next.h })
  }
  return [size, start, reset, setOwnSize] as const
}

/* ═══ PUBLISHED GEOMETRY ═════════════════════════════════════════════════════
 *  How wide and how tall is this chip, before it renders?
 *
 *  The same question GroupGeometry answers for the card, asked for the same
 *  reason: a board that lays out arithmetically — AuthorRoad does, and must,
 *  since its arrows, its drop bands and its own extent all need every box
 *  placed before React commits anything — cannot ask a rendered chip how big
 *  it is. So it either guesses or it is told. It guessed: `CHAR_W = 8` for a
 *  proportional face and `LEAF_CHROME_W = 40` for chrome that is really ~83,
 *  so a title scored as one line wrapped to two and was clipped against the
 *  height it had been told.
 *
 *  The DS ships no geometry for this component and keeps its own measuring
 *  module-private, so this is the group's own pattern applied here (reported on
 *  drift-log #74). Two rules are what make it hold:
 *
 *  1. CSS OWNS WHAT CSS DECLARES. The stroke, the line height, the font sizes
 *     and the weights are read from the stylesheet at measure time — the very
 *     custom properties the style block below writes — so a token change lands
 *     in the drawing and in the prediction together or not at all.
 *  2. THE TABLE OWNS WHAT JS DECLARES. Every number written as a literal in
 *     that style block lives in CHIP_METRICS and is read back from there, so
 *     the same is true of a padding, a gap or the delete button's box.
 *
 *  Text is MEASURED, not estimated: an offscreen canvas at the chip's own font.
 *  It needs no layout and no paint, so it is legal in the same pass that
 *  computes positions. Without a document (SSR, tests) it falls back to a
 *  0.55em factor and says so via `measured: false`.
 *
 *  `fontOf` / `measure` / `linesOf` are this file's own copies of the group's,
 *  not a shared import — the same call the DS makes for useRecede and
 *  useSizeDrag, and for the same reason: each component stays re-portable on
 *  its own, and a re-sync of one never has to reason about the other.
 *
 *  proven: tools/studio-spike/shot-foldab.mjs renders chips in the road's own
 *  forms and fails on any disagreement between chipSize and the rendered box. */

export const CHIP_METRICS = {
  /** flex gap between the chip's furniture and its title */
  gap: 6,
  /** the 'dot' and 'none' forms take a plain 1px edge; 'border' takes --stroke-rule */
  plainBorder: 1,
  /** wrapping form: squarer, and a touch more room above and below the lines */
  padXWrap: 11, padYWrap: 4,
  /** truncating form: the pill */
  padXFlat: 12, padYFlat: 3,
  /** the dot form reserves a narrower left inset, since the disc sits in it */
  dotPadLeft: 9, dotPadRight: 11, dotPadY: 4,
  /** 'border-2': the mention form. Tighter than the others and 1px rather than --stroke-rule,
   *  because it is a citation rather than an object */
  padXQuiet: 9, padYQuiet: 2, quietBorder: 1,
  dot: 7,
  /** where the disc sits on a STACKED chip — measured, see DOT_FIRST_LINE_INSET. Replaces
   *  the old `dotTop: 6`, which was a correction for top alignment and has no job under
   *  baseline alignment. `indexTop: 1` went with it: the step number now sits on the name's
   *  own baseline, which is what that nudge was approximating by eye. */
  dotTop: DOT_FIRST_LINE_INSET,
  /** the gutter the title keeps from the delete button that follows it */
  titlePadRight: 4,
  /** the delete button: an 18px box pulled 2px into the chip's own right padding */
  del: 18, delPull: 2, delTop: 1,
  /** the resize bounds the component defaults to */
  minWidth: 120, maxWidth: 520, minHeight: 28, maxHeight: 320,
  /** only ever reached without a document: CSS `line-height: normal` is the
   *  font's own metrics, which a canvas cannot report, so this stands in */
  normalLh: 1.36,
}

type FontKind = 'ui' | 'mono'
const FONTS: Partial<Record<FontKind, string>> = {}
function fontOf(kind: FontKind): string {
  const cached = FONTS[kind]
  if (cached) return cached
  let fam = kind === 'mono' ? 'ui-monospace, monospace' : 'system-ui, sans-serif'
  if (typeof document !== 'undefined' && document.documentElement) {
    const v = getComputedStyle(document.documentElement).getPropertyValue('--font-' + kind).trim()
    if (v) fam = v
  }
  FONTS[kind] = fam
  return fam
}

/** a numeric design token, read once from the stylesheet the style block writes
 *  against. `1.5px` and `1.35` both parse; anything unreadable keeps the fallback,
 *  which is the only path a test without a document ever takes. */
const TOKENS: Record<string, number> = {}
function tokenNum(name: string, fallback: number): number {
  const hit = TOKENS[name]
  if (hit !== undefined) return hit
  let v = fallback
  if (typeof document !== 'undefined' && document.documentElement) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    const n = parseFloat(raw)
    if (raw && !Number.isNaN(n)) v = n
  }
  TOKENS[name] = v
  return v
}

let ctx2d: CanvasRenderingContext2D | null | false = null
function measure(text: unknown, weight: number, size: number, kind: FontKind): number {
  const str = String(text == null ? '' : text)
  if (!str) return 0
  if (typeof document !== 'undefined') {
    if (!ctx2d) {
      try { ctx2d = document.createElement('canvas').getContext('2d') } catch { ctx2d = false }
    }
    if (ctx2d) {
      ctx2d.font = weight + ' ' + size + 'px ' + fontOf(kind)
      return ctx2d.measureText(str).width
    }
  }
  return str.length * size * 0.55
}

/** lines a title takes at a given column, honouring the chip's `overflow-wrap:
 *  break-word`: word boundaries first, and only a word that cannot fit at all is
 *  split inside itself — which is what the drawn label does. */
function linesOf(text: unknown, width: number, weight: number, size: number, kind: FontKind, clamp: number): number {
  const str = String(text == null ? '' : text).trim()
  if (!str) return 0
  if (!(width > 0)) return clamp || 1
  const words = str.split(/\s+/)
  let lines = 1
  let cur = ''
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    const trial = cur ? cur + ' ' + w : w
    if (measure(trial, weight, size, kind) <= width) { cur = trial; continue }
    if (cur) { lines++; cur = w } else cur = w
    const solo = measure(cur, weight, size, kind)
    if (solo > width) {
      lines += Math.ceil(solo / width) - 1
      cur = ''
    }
  }
  return clamp ? Math.min(lines, clamp) : lines
}

/** what a chip is going to be, given what it will be handed. The props named
 *  here are the ones that MOVE the box; everything else a chip takes (hue, lit,
 *  selected, dim) is paint, and paint takes no layout — `selected` is an outline
 *  for exactly that reason. */
export interface ChipSpec {
  title?: string
  /** the step number, if one is shown — mono, and it is measured, not counted */
  index?: string
  mark?: 'dot' | 'border' | 'border-2' | 'none'
  /** the title wraps instead of truncating. A wrapping chip is STACKED, and a stacked chip
   *  is the form whose height is not a single line */
  wrap?: boolean
  /** the chip is conditional, so it carries the "(optional)" line. ON A FULL-RANK CHIP THIS
   *  MOVES THE BOX — one --fs-micro line taller, and stacked even without `wrap`. A board
   *  that spaces chips from a predicted height and does not pass this reserves one line too
   *  few and laps its own next row. On `border-2` the word is inline and costs nothing. */
  optional?: boolean
  /** a delete button is offered. It reserves its space at rest, so it counts even unhovered */
  deletable?: boolean
  /** the caller's bounds. `maxHeight` becomes a LINE CLAMP rather than a crop:
   *  the height returned always matches the lines actually drawn, so a title too
   *  long for the bound loses its tail (the chip's own `overflow: hidden`) instead
   *  of the box lying about how tall it is. Defaults are the component's own. */
  minWidth?: number
  maxWidth?: number
  maxHeight?: number
}

export interface ChipSize {
  width: number
  height: number
  /** how many lines the title actually takes at `width` — after the clamp */
  titleLines: number
  /** the column left for the title once the furniture has taken its share */
  titleColumn: number
  /** false when there was no canvas and the text is a 0.55em estimate */
  measured: boolean
}

/** The chip's box at the width it will settle on: as wide as one line of title
 *  wants, bounded, and as tall as that title then takes at that width. */
export function chipSize(spec?: ChipSpec): ChipSize {
  const M = CHIP_METRICS
  const s = spec || {}
  const quiet = s.mark === 'border-2'
  const bordered = s.mark === 'border' || quiet
  const plain = s.mark === 'none'
  const wrap = !!s.wrap
  const optional = !!s.optional
  /* STACKED = baseline-aligned and more than one row. A full-rank optional chip is stacked
     WITHOUT wrapping, because the word sits under the name — which is the one way this
     predictor can be wrong in a direction a board notices, so it is named rather than
     folded into `wrap`. */
  const stacked = wrap || (optional && !quiet)

  const stroke = tokenNum('--stroke-rule', 1.5)
  const snug = tokenNum('--lh-snug', 1.35)
  const fsTitle = tokenNum('--fs-body', 13)
  const fsIndex = tokenNum('--fs-micro', 11)
  const fwTitle = tokenNum('--fw-semibold', 600)
  const fwIndex = tokenNum('--fw-regular', 400)
  /* the mention form sets its own type: caption at medium, not body at semibold */
  const fsCaption = tokenNum('--fs-caption', 12)
  const fwMedium = tokenNum('--fw-medium', 500)
  const fsText = quiet ? fsCaption : fsTitle
  const fwText = quiet ? fwMedium : fwTitle

  /* the shell is border-box, so its border and padding come out of the width. The mention
     form is 1px and tighter on both axes — it is a citation, not an object. */
  const edge = (quiet ? M.quietBorder : bordered ? stroke : M.plainBorder) * 2
  const padX = quiet ? M.padXQuiet * 2
    : bordered || plain ? (wrap ? M.padXWrap : M.padXFlat) * 2
    : M.dotPadLeft + M.dotPadRight
  const padY = (quiet ? M.padYQuiet
    : bordered || plain ? (wrap ? M.padYWrap : M.padYFlat) : M.dotPadY) * 2

  /* every flex child except the title, and the gap between each pair. The resize
     handles are position:absolute, so they are out of flow and take no width. */
  const furniture: number[] = []
  if (!bordered && !plain) furniture.push(M.dot)
  if (s.index) furniture.push(measure(s.index, fwIndex, fsIndex, 'mono'))
  /* marginRight: -2 pulls the delete button back into the chip's own right padding */
  if (s.deletable) furniture.push(M.del - M.delPull)
  const gaps = furniture.length * M.gap
  const chrome = edge + padX + furniture.reduce((a, b) => a + b, 0) + gaps
    + (s.deletable ? M.titlePadRight : 0)

  const minW = s.minWidth === undefined ? M.minWidth : s.minWidth
  const maxW = s.maxWidth === undefined ? M.maxWidth : s.maxWidth
  /* on the mention form the word runs INLINE after the name, so it is part of the one line
     the chip wants to be. On a full-rank chip it is its own row and costs height, not width. */
  const oneLine = measure(s.title, fwText, fsText, 'ui')
    + (optional && quiet ? measure(' (optional)', fwIndex, fsText, 'ui') : 0)
  /* measured LAST of the reads above, so ctx2d has been settled by the call */
  const measured = ctx2d !== false && ctx2d !== null
  const width = Math.max(minW, Math.min(maxW, Math.ceil(chrome + oneLine)))
  const titleColumn = Math.max(1, width - chrome)

  /* wrapping, the line box is --lh-snug on the shell, inherited unitless so each
     child multiplies its OWN size by it. Truncating, there is no line-height at
     all and CSS falls back to the font's normal metrics, which no canvas reports. */
  const lh = stacked || quiet ? snug : M.normalLh
  const lineH = fsText * lh
  /* the height bound is spent on LINES, so the box never claims a height the
     drawn text does not fill */
  const room = s.maxHeight === undefined ? 0
    : Math.max(1, Math.floor((s.maxHeight - padY - edge) / lineH))
  const titleLines = wrap ? Math.max(1, linesOf(s.title, titleColumn, fwText, fsText, 'ui', room)) : 1

  /* THE "(optional)" LINE IS PART OF THE TITLE'S COLUMN, not a fourth flex child: it is a
     block inside the title span, so it stacks under the name rather than sitting beside it.
     Full-rank only — on the mention form it is inline and already counted in the width. */
  const optionalLine = optional && !quiet ? fsIndex * snug : 0

  /* A stacked chip aligns on the name's first-line BASELINE and every other child either
     sits on that baseline or opts out with a measured inset, so the row is still the tallest
     child — but with no nudge on the step number, which baseline alignment makes exact. */
  const rows = [titleLines * lineH + optionalLine]
  if (s.index) rows.push(fsIndex * lh)
  if (s.deletable) rows.push(M.del + (stacked ? M.delTop : 0))
  if (!bordered && !plain) rows.push(M.dot + (stacked ? M.dotTop : 0))

  const height = Math.ceil(Math.max.apply(null, rows) + padY + edge)
  return { width, height, titleLines, titleColumn: Math.round(titleColumn * 100) / 100, measured }
}

export const ChipGeometry = { CHIP_METRICS, chipSize, CHIP_BORDER, chipBorder }

export function NodeChip({
  title, index, domain, mark = 'dot', dim, optional, lit, note, wrap, onClick, onDelete,
  selectable = false, selected, defaultSelected = false, onSelectedChange,
  resizable = false,
  minWidth = CHIP_METRICS.minWidth, maxWidth = CHIP_METRICS.maxWidth,
  minHeight = CHIP_METRICS.minHeight, maxHeight = CHIP_METRICS.maxHeight,
  width, height, onResize,
}: NodeChipProps) {
  /* the SAME table chipSize() above predicts from — read, never copied */
  const M = CHIP_METRICS
  const hue = DOMAIN_TOKEN[domain] || 'var(--swatch-anchor-fallback)'
  const quiet = mark === 'border-2'
  const bordered = mark === 'border' || quiet
  const plain = mark === 'none'
  /* see ChipSpec.optional: a full-rank optional chip is two rows without wrapping */
  const stacked = wrap || (optional && !quiet)
  /* drawn from the prop when there is one, from own state when there is not — and
     drawing follows `isSel` even without `selectable`, so a board that owns the whole
     selection can paint a chip picked without also handing it a gesture it must not have */
  const [ownSel, setOwnSel] = useState(!!defaultSelected)
  const isSel = selected === undefined ? ownSel : selected
  const toggle = () => {
    const next = !isSel
    if (selected === undefined) setOwnSel(next)
    if (onSelectedChange) onSelectedChange(next)
  }
  const [hot, showX, hideX] = useRecede()
  /* A SECOND HOVER STATE, AND IT HAS TO BE SEPARATE FROM `hot`. `useRecede` holds `hot` true
     for a grace period after the pointer leaves, so a revealed ✕ does not vanish from under a
     pointer travelling towards it. A FACE WASH has no such errand: it must drop the instant
     you leave, or the chip sits lit beside the one you actually moved to. Same handlers, two
     clocks — the control lingers, the wash does not. */
  const [hov, setHov] = useState(false)
  /* A CHIP WASHES ON HOVER ONLY IF IT IS SOMETHING TO DO. Most chips in this product are
     being READ — a legend, a trail, an entry's ends, a rail of names — and feedback on those
     promises an act that is not there. `onClick` or `selectable` is the whole test, the same
     one `cursor` already uses below. `dim` never washes: off the resolved path is a statement
     about the node, and lighting it up on the way past contradicts it. */
  const interactive = !!(onClick || selectable)
  const washed = interactive && hov && !dim
  const shell = useRef<HTMLSpanElement | null>(null)
  const given: SizeState | null = width === undefined && height === undefined ? null
    : { w: width || null, h: height || null }
  const [size, startSize, resetSize, setSizeFromLayout] = useSizeDrag(
    shell, { minW: minWidth, maxW: maxWidth, minH: minHeight, maxH: maxHeight }, given, onResize)

  useEffect(() => {
    const el = shell.current
    /* a told size is the caller's to correct — writing a measured one back would fight
       the prop every frame, and the loop this guards against is the drag's own */
    if (!el || !size || given) return
    const w = size.w ? Math.max(size.w, Math.round(el.offsetWidth)) : size.w
    const h = size.h ? Math.max(size.h, Math.round(el.offsetHeight)) : size.h
    if (Math.abs((w || 0) - (size.w || 0)) > 1 || Math.abs((h || 0) - (size.h || 0)) > 1) {
      setSizeFromLayout({ w, h })
    }
  })

  return (
    <span
      ref={shell}
      /* the native tooltip is a STRING attribute, so a composed `title` cannot go in it —
         which is why the contract says to pass `note` alongside a non-string title. Falling
         back to `undefined` rather than stringifying: React would render "[object Object]"
         into the attribute, and a tooltip that lies is worse than one that is absent. */
      title={note || (typeof title === 'string' ? title : undefined)}
      onClick={() => { if (selectable) toggle(); if (onClick) onClick() }}
      /* both clocks off the same four handlers — the control lingers (`showX`/`hideX` hold
         `hot` through a grace period so a revealed ✕ stays reachable), the wash does not */
      onMouseEnter={() => { showX(); setHov(true) }}
      onMouseLeave={() => { hideX(); setHov(false) }}
      onFocus={() => { showX(); setHov(true) }}
      onBlur={() => { hideX(); setHov(false) }}
      style={{
        boxSizing: 'border-box',
        position: 'relative', display: 'inline-flex', gap: M.gap,
        /* A STACKED CHIP ALIGNS ON THE NAME'S FIRST-LINE BASELINE, told a height or
           not. This was OURS first — reported as OB-027, adopted by the DS verbatim
           on 2026-08-19 and handed back as OB-035 — so the line is unchanged and it
           is no longer a deviation. What follows is why it is the rule, kept because
           both alternatives are what a flex row reaches for first.

           The two spans have DIFFERENT LINE BOXES: the index at --fs-micro 11 x
           --lh-snug is 14.85, the title at --fs-body 13 x --lh-snug is 17.55. No top-
           or centre-alignment makes two unequal boxes share a line. Measured against
           the title's FIRST line, which is the line the number belongs on at any
           length: `flex-start` is a constant -3px, `center` is -2.14 at one line and
           DRIFTS with the block (+6.63 at two, +15.41 at three), `baseline` is 0.00 at
           one, two and three lines.

           AND A TOLD HEIGHT GETS NO BRANCH OF ITS OWN. The first upstream fix read
           `size && size.h ? 'center' : (stacked ? 'baseline' : 'center')`, which put
           the drift straight back for any caller that sets a height — and that is
           every caller here. A BOARD THAT LAYS ITSELF OUT ARITHMETICALLY TELLS EVERY
           LEAF ITS HEIGHT: `AuthorRoad` asks `chipSize()` and hands back `{w, h}` for
           every stop, so the told path is the ONLY path on our road, and the branch
           upstream treated as the exception is our rule. Told column, measured by
           shot-foldab: -2.64 / +6.13 / +14.91 at one, two and three lines — the same
           drift their own rig had already disqualified `center` for. Their specimens
           all size themselves, which is why none of them showed it.

           A told height still centres a chip that is NOT stacked, and that is right:
           one line in a hand-set box has real slack, and text pinned to its top reads
           as a layout accident. Safe here because the X carries its own alignSelf and
           `mark="border"` has no dot — a dot-form chip would need its marginTop
           revisited, which is the DS's call. */
        alignItems: stacked ? 'baseline' : 'center',
        width: (size && size.w) || undefined, height: (size && size.h) || undefined,
        /* THE TEXT IS THE FLOOR — but only where the text cannot reflow. A WRAPPING CHIP
           TAKES 0 INSTEAD, which is not an exception to that rule but the same rule where
           breaking IS possible. As a flex item, `min-width: min-content` OVERRIDES
           `max-width: 100%`, so a chip whose longest word is wider than its share of a row
           spilled straight out of its container (the DS's connections pane, owner-reported
           2026-08-19). At 0 the box takes its container's width and the title's own
           `overflow-wrap: break-word` breaks the long word onto another line, with
           `min-height: fit-content` growing the box to hold it. Nothing is hidden — the words
           move instead of the border moving. A NOWRAP chip keeps the floor, because there
           breaking is unavailable and the only thing that could give is the name itself.
           THE DIAGNOSTIC, for next time: a wrapping failure looks like TEXT overflowing; a
           min-content floor looks like the BOX overflowing, with the text already wrapped and
           still not fitting. Resize is unaffected — the drag's floor is the `minWidth` PROP
           inside useSizeDrag, not this. */
        minWidth: wrap ? 0 : 'min-content', minHeight: 'fit-content',
        maxWidth: size && size.w ? 'none' : '100%',
        userSelect: 'none', WebkitUserSelect: 'none',
        /* no disc means no room reserved for one: 'none' takes the bordered padding,
           which is symmetric, rather than the dot form's narrower left inset */
        padding: quiet ? `${M.padYQuiet}px ${M.padXQuiet}px`
          : bordered || plain
          ? (wrap ? `${M.padYWrap}px ${M.padXWrap}px` : `${M.padYFlat}px ${M.padXFlat}px`)
          : `${M.dotPadY}px ${M.dotPadRight}px ${M.dotPadY}px ${M.dotPadLeft}px`,
        borderRadius: stacked || quiet ? 'var(--radius-md)' : 'var(--radius-pill)',
        /* DASHED, NEVER A DIFFERENT COLOUR OR WEIGHT. The hue is the domain and the width is
           what a connector matches (`chipBorder`), so neither is available to say `optional`;
           the line's STYLE is the free channel. On the dot form the border is neutral and the
           hue lives in the disc, so the neutral line is what dashes — same statement, same
           place, whichever form the chip takes. */
        border: quiet
          ? M.quietBorder + 'px ' + (optional ? 'dashed ' : 'solid ') + (dim ? 'var(--border-hair)' : hue)
          : bordered
          ? 'var(--stroke-rule) ' + (optional ? 'dashed ' : 'solid ') + (dim ? 'var(--border-hair)' : hue)
          : M.plainBorder + 'px ' + (optional ? 'dashed ' : 'solid ') + (dim ? 'var(--border-hair)' : 'var(--border-rule)'),
        /* takes no layout and leaves the chip's own border readable under it */
        outline: isSel ? 'var(--stroke-ring) solid var(--state-selected)' : undefined,
        /* 2px, not 1: at 1px the 2px pond ring all but touched the 1.5px domain border
           and the two merged into one heavy ~3.5px stroke — which loses the domain hue
           at the exact moment the node is being acted on, and makes a selected chip
           read as a different shape from a selected group, which has no border under
           its ring. 2px of paper between them and both strokes read as themselves. */
        outlineOffset: isSel ? 2 : undefined,
        /* THE FACE STEP, AND NOTHING ELSE. The border is not touched: it carries the DOMAIN,
           and a hue is never a state in this system — nor is the geometry, the lift, or the
           type. `quiet` has no face of its own, so its step is the plain wash over whatever it
           sits on; a filled chip takes the RAISED token, because a wash cannot tint white.
           Hover is deliberately a WEAKER VERSION OF SELECTED rather than a mark of its own, so
           pointing at a chip previews what a click would do. And it lights the CHIP, never the
           row around it — the DS tried a row-wide band in the connections pane on 2026-08-19
           and pulled it the same day. Where the ROW is the object (a TreeRow) the row is right
           to wash; a chip on a rail is the object. */
        background: dim ? 'transparent'
          : quiet ? (washed ? 'var(--surface-hover)' : 'transparent')
          : washed ? 'var(--surface-hover-raised)' : 'var(--surface-raised)',
        color: dim ? 'var(--text-3)' : quiet ? 'var(--text-2)' : 'var(--text-1)',
        /* the second rank takes NO LIFT at all: a mention is not standing on the pane, and a
           ring on it would claim it is the object rather than a reference to one */
        boxShadow: quiet ? (isSel ? 'none' : lit ? 'var(--ring-linked)' : 'none')
          : isSel ? 'var(--lift-1)' : lit ? 'var(--ring-linked), var(--lift-1)' : dim ? 'none' : 'var(--lift-1)',
        fontFamily: 'var(--font-ui)',
        fontSize: quiet ? 'var(--fs-caption)' : 'var(--fs-body)',
        fontWeight: quiet ? 'var(--fw-medium)' : 'var(--fw-semibold)',
        lineHeight: stacked || quiet ? 'var(--lh-snug)' : undefined,
        whiteSpace: wrap ? 'normal' : 'nowrap', overflow: 'hidden',
        /* 'inherit', not 'default': a chip inside a NodeChain sits on a slot that says
           move, and a chip that reasserted the plain arrow hid the one affordance the
           chain provides. A chip that is itself clickable keeps pointer. */
        cursor: onClick || selectable ? 'pointer' : 'inherit',
        opacity: dim ? 'var(--opacity-off-path)' : 1, transition: 'var(--transition-wash)',
      }}
    >
      {bordered || plain ? null : (
        <span style={{
          width: M.dot, height: M.dot, borderRadius: 'var(--radius-pill)', flexShrink: 0,
          background: hue,
          /* opts OUT of baseline alignment — a box with no text has no baseline, so CSS
             synthesizes one from its border box and the disc reads 0.83px low. Placed against
             the first line's TOP instead, which does not move as the name wraps. */
          alignSelf: stacked ? 'flex-start' : undefined,
          marginTop: stacked ? M.dotTop : 0,
        }} />
      )}
      {index ? (
        <span style={{
          flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)',
          fontVariantNumeric: 'var(--tnum)', fontWeight: 'var(--fw-regular)',
          /* NO VERTICAL CORRECTION: baseline alignment puts this on the name's own baseline,
             which is what the old `marginTop: 1` was approximating by eye. */
          color: 'var(--text-3)', opacity: dim ? 0.8 : 1,
        }}>{index}</span>
      ) : null}
      {/* 'break-word', not 'anywhere': anywhere breaks mid-word at the first
          opportunity, which on a narrow chip left single letters sitting against
          the border. Word boundaries first; only split a word that cannot fit. */}
      <span style={{
        minWidth: 0, flex: onDelete ? 1 : '0 1 auto',
        /* block, so the name and the (optional) line below it are two rows rather than one
           inline run with a block in the middle of it */
        display: optional && !quiet ? 'block' : undefined,
        overflow: 'hidden',
        textAlign: quiet ? 'center' : undefined,
        overflowWrap: wrap ? 'break-word' : undefined, wordBreak: wrap ? 'normal' : undefined,
        textOverflow: wrap ? 'clip' : 'ellipsis',
        paddingRight: onDelete ? M.titlePadRight : 0,
      }}>{title}{optional && quiet ? (
        <span style={{ fontStyle: 'italic', fontWeight: 'var(--fw-regular)', color: 'var(--text-3)' }}> (optional)</span>
      ) : null}{optional && !quiet ? (
        /* ITALIC AT REGULAR WEIGHT, and that pairing is not a taste call: Nunito is loaded at
           `ital,wght 1,400` only, so an italic string asked for medium or semibold is
           SYNTHESISED by the browser — a slanted upright, heavier and blurrier than the real
           face beside it. Italic already carries one meaning here (the group's empty
           description): a thing that is not there yet. An optional step is exactly that, so
           the register is borrowed rather than overloaded.
           A separate element, never part of `title`: `title` is the node's NAME, reproduced
           verbatim, and a caller appending "(optional)" to it would be editing the name. */
        <span style={{
          display: 'block', fontSize: 'var(--fs-micro)', fontWeight: 'var(--fw-regular)',
          fontStyle: 'italic', color: 'var(--text-3)', lineHeight: 'var(--lh-snug)',
        }}>(optional)</span>
      ) : null}</span>
      {resizable ? (
        <>
          <span aria-hidden="true" title="drag to resize · double-click to reset"
            onPointerDown={startSize('x')} onDoubleClick={resetSize('x')}
            style={{ position: 'absolute', top: 8, bottom: 8, right: 0, width: 7, zIndex: 2, background: 'transparent', cursor: 'ew-resize', touchAction: 'none' }} />
          <span aria-hidden="true" title="drag to resize · double-click to reset"
            onPointerDown={startSize('y')} onDoubleClick={resetSize('y')}
            style={{ position: 'absolute', left: 10, right: 10, bottom: 0, height: 7, zIndex: 2, background: 'transparent', cursor: 'ns-resize', touchAction: 'none' }} />
          <span aria-hidden="true" title="drag to resize · double-click to reset"
            onPointerDown={startSize('both')} onDoubleClick={resetSize('both')}
            style={{ position: 'absolute', right: 0, bottom: 0, width: 11, height: 11, zIndex: 3, background: 'transparent', cursor: 'nwse-resize', touchAction: 'none' }} />
        </>
      ) : null}
      {onDelete ? (
        <button type="button" title="delete this node" aria-label="delete this node"
          tabIndex={hot ? 0 : -1}
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--state-danger-wash)'; e.currentTarget.style.borderColor = 'var(--state-danger)'; e.currentTarget.style.color = 'var(--berry-600)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--state-danger)' }}
          style={{
            width: M.del, height: M.del, flexShrink: 0, marginLeft: 'auto', marginRight: -M.delPull, padding: 0,
            display: 'grid', placeItems: 'center', boxSizing: 'border-box',
            borderRadius: 'var(--radius-pill)', border: '1px solid transparent', background: 'transparent',
            color: 'var(--state-danger)', fontFamily: 'var(--font-ui)', fontSize: 10, lineHeight: 1,
            cursor: 'pointer', opacity: hot ? 1 : 0, pointerEvents: hot ? 'auto' : 'none',
            /* opts out of the row's baseline alignment and pins to the FIRST LINE, the same
               reference the disc uses. `stacked`, not `wrap`: an optional chip is two lines
               tall without wrapping and the ✕ belongs beside the name either way. */
            alignSelf: stacked ? 'flex-start' : 'center', marginTop: stacked ? M.delTop : 0,
            transition: 'opacity var(--dur-fade) var(--ease-soft), var(--transition-wash)',
          }}>{'✕'}</button>
      ) : null}
    </span>
  )
}

/** WHAT A LINE MEETING THIS COMPONENT HAS TO MATCH, declared on the component so a container
 *  can read it without knowing what the component is. Set to the DEFAULT form's weight, for
 *  `<NodeChip title domain />` with no explicit `mark`: `props.mark` is undefined there, so a
 *  container reading props alone would learn nothing and fall back to full rank — a 1.5 shaft
 *  against a 1px dot-form border, which is the bug this whole thread is about. A container
 *  reads `props.mark` FIRST (it is the more specific fact) and this second.
 *  Anything new an arrow can meet should declare one; `VersionedGroup` does. Only a host's own
 *  box, which cannot declare anything to us, passes a number itself. */
NodeChip.joinBorder = CHIP_BORDER.dot
