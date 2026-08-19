import React, { useState, useRef, useEffect } from 'react'
import type { DomainCode } from './vocab'
import { DOMAIN_TOKEN } from './vocab'
import { useRecede } from '../chrome/IconButton'

/** A corpus node as a chip: dot (or border, or nothing), truncating title, raised
 *  on paper. Port of DS components/graph/NodeChip.jsx.
 *
 *  Deviations from DS source:
 *  - Uses DOMAIN_TOKEN from ./vocab instead of an inline DOMAIN map (single source) */

export interface NodeChipProps {
  title: string
  /** the node's step number in its container ("2.1") — derived, mono, tabular,
   *  --fs-micro at --text-3: a figure glanced at beside the name, never level with it */
  index?: string
  domain: DomainCode
  /** which carrier holds the domain colour. 'dot' (default) is the dense form for
   *  trails, legends and rails; 'border' is a 1.5px domain-coloured edge with no disc,
   *  for a node standing on its own — a stop inside a group, a node on the road;
   *  'none' is no disc and no hue at all — for a surface where domain is not the
   *  channel being read and the edge's only job is to report selection */
  mark?: 'dot' | 'border' | 'none'
  /** off the resolved path: no lift, no fill, --opacity-off-path */
  dim?: boolean
  /** LOCAL, not in the DS: this node is CONDITIONAL — an optional stop, one that may
   *  be bypassed. Dashes its own border and keeps its hue, because "dashed always
   *  means conditional" is a system rule (readme, Borders and dashes) and the border
   *  is where a chip says what it is. A prop rather than a stylesheet override from
   *  the host: the border is written here as an inline shorthand, so the only way in
   *  from outside is `border-style: dashed !important` on a descendant selector, and
   *  that stops matching the day this component gains a wrapper element — silently,
   *  with every optional stop rendering solid and nothing failing. Reported on
   *  drift-log #74; the DS should own the form. */
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
  /** drag the chip's right edge, bottom edge or corner to size it; double-click an edge
   *  gives that dimension back to automatic. Default true */
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
  dot: 7, dotTop: 6,
  /** the step number's optical lift off the first title line */
  indexTop: 1,
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
  mark?: 'dot' | 'border' | 'none'
  /** the title wraps instead of truncating. A wrapping chip is the only form
   *  whose height is not a single line, and the only one a board has to think about */
  wrap?: boolean
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
  const bordered = s.mark === 'border'
  const plain = s.mark === 'none'
  const wrap = !!s.wrap

  const stroke = tokenNum('--stroke-rule', 1.5)
  const snug = tokenNum('--lh-snug', 1.35)
  const fsTitle = tokenNum('--fs-body', 13)
  const fsIndex = tokenNum('--fs-micro', 11)
  const fwTitle = tokenNum('--fw-semibold', 600)
  const fwIndex = tokenNum('--fw-regular', 400)

  /* the shell is border-box, so its border and padding come out of the width */
  const edge = (bordered ? stroke : M.plainBorder) * 2
  const padX = bordered || plain
    ? (wrap ? M.padXWrap : M.padXFlat) * 2
    : M.dotPadLeft + M.dotPadRight
  const padY = (bordered || plain ? (wrap ? M.padYWrap : M.padYFlat) : M.dotPadY) * 2

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
  const oneLine = measure(s.title, fwTitle, fsTitle, 'ui')
  /* measured LAST of the reads above, so ctx2d has been settled by the call */
  const measured = ctx2d !== false && ctx2d !== null
  const width = Math.max(minW, Math.min(maxW, Math.ceil(chrome + oneLine)))
  const titleColumn = Math.max(1, width - chrome)

  /* wrapping, the line box is --lh-snug on the shell, inherited unitless so each
     child multiplies its OWN size by it. Truncating, there is no line-height at
     all and CSS falls back to the font's normal metrics, which no canvas reports. */
  const lh = wrap ? snug : M.normalLh
  const lineH = fsTitle * lh
  /* the height bound is spent on LINES, so the box never claims a height the
     drawn text does not fill */
  const room = s.maxHeight === undefined ? 0
    : Math.max(1, Math.floor((s.maxHeight - padY - edge) / lineH))
  const titleLines = wrap ? Math.max(1, linesOf(s.title, titleColumn, fwTitle, fsTitle, 'ui', room)) : 1

  /* wrapping tops its furniture out (align-items: flex-start, each with its own
     nudge down); truncating centres everything, so the row is just the tallest child */
  const rows = [titleLines * lineH]
  if (s.index) rows.push(fsIndex * lh + (wrap ? M.indexTop : 0))
  if (s.deletable) rows.push(M.del + (wrap ? M.delTop : 0))
  if (!bordered && !plain) rows.push(M.dot + (wrap ? M.dotTop : 0))

  const height = Math.ceil(Math.max.apply(null, rows) + padY + edge)
  return { width, height, titleLines, titleColumn: Math.round(titleColumn * 100) / 100, measured }
}

export const ChipGeometry = { CHIP_METRICS, chipSize }

export function NodeChip({
  title, index, domain, mark = 'dot', dim, optional, lit, note, wrap, onClick, onDelete,
  selectable = false, selected, defaultSelected = false, onSelectedChange,
  resizable = true,
  minWidth = CHIP_METRICS.minWidth, maxWidth = CHIP_METRICS.maxWidth,
  minHeight = CHIP_METRICS.minHeight, maxHeight = CHIP_METRICS.maxHeight,
  width, height, onResize,
}: NodeChipProps) {
  /* the SAME table chipSize() above predicts from — read, never copied */
  const M = CHIP_METRICS
  const hue = DOMAIN_TOKEN[domain] || 'var(--swatch-anchor-fallback)'
  const bordered = mark === 'border'
  const plain = mark === 'none'
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
      title={note || title}
      onClick={() => { if (selectable) toggle(); if (onClick) onClick() }}
      onMouseEnter={showX} onMouseLeave={hideX}
      onFocus={showX} onBlur={hideX}
      style={{
        boxSizing: 'border-box',
        position: 'relative', display: 'inline-flex', gap: M.gap,
        /* ★ LOCAL: `wrap` WINS OVER A TOLD HEIGHT. The DS centres the row whenever
           a height is set — and then nudges every piece of furniture DOWN when `wrap`
           is on: the dot by M.dotTop, the index by M.indexTop, the ✕ by M.delTop with
           an `alignSelf: 'flex-start'` of its own. Those nudges are corrections for a
           TOP-aligned row, so under a told height the two mechanisms contradict inside
           one chip: the container centres, the ✕'s own alignSelf still tops out (it
           outranks alignItems), and the nudges push the rest further from where either
           rule wanted them. The road TELLS every leaf its height, so on the board that
           is every wrapped chip. `wrap` means the name reads DOWN from its first line
           — the DS's own contract says "its dot aligns to the first line, and the box
           grows down" — and a told height is room at the BOTTOM of that. Upstream
           verbatim as of the 2026-08-16 source; to report on drift-log #74.

           AND THE DESTINATION IS `baseline`, not `flex-start`. Neither of the DS's
           two branches puts the step number on the title's line, because the two
           spans have different line boxes — --fs-micro 11 × --lh-snug is 14.85,
           --fs-body 13 × --lh-snug is 17.55 — and no top- or centre-alignment makes
           two unequal boxes share a baseline. Measured against the title's FIRST
           line, which is the line the number belongs on: flex-start is a constant
           -3px (the number rides high on every chip, wrapped or not); center is
           -2.14 at one line and DRIFTS with the block, +6.63 at two and +15.41 at
           three; `baseline` is 0.00 at one, two and three lines, told and natural
           alike. That is what baseline alignment is for, and it is what the
           contract already describes ("its dot aligns to the first line"). Safe
           here because the ✕ carries its own alignSelf and `mark="border"` has no
           dot — a dot-form chip would need its marginTop revisited, which is the
           DS's call, not ours. */
        alignItems: wrap ? 'baseline' : 'center',
        width: (size && size.w) || undefined, height: (size && size.h) || undefined,
        minWidth: 'min-content', minHeight: 'fit-content',
        maxWidth: size && size.w ? 'none' : '100%',
        userSelect: 'none', WebkitUserSelect: 'none',
        /* no disc means no room reserved for one: 'none' takes the bordered padding,
           which is symmetric, rather than the dot form's narrower left inset */
        padding: bordered || plain
          ? (wrap ? `${M.padYWrap}px ${M.padXWrap}px` : `${M.padYFlat}px ${M.padXFlat}px`)
          : `${M.dotPadY}px ${M.dotPadRight}px ${M.dotPadY}px ${M.dotPadLeft}px`,
        borderRadius: wrap ? 'var(--radius-md)' : 'var(--radius-pill)',
        /* LOCAL `optional`: dashed, hue kept — dashed always means conditional */
        border: bordered
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
        background: dim ? 'transparent' : 'var(--surface-raised)',
        color: dim ? 'var(--text-3)' : 'var(--text-1)',
        boxShadow: isSel ? 'var(--lift-1)' : lit ? 'var(--ring-linked), var(--lift-1)' : dim ? 'none' : 'var(--lift-1)',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)',
        lineHeight: wrap ? 'var(--lh-snug)' : undefined,
        whiteSpace: wrap ? 'normal' : 'nowrap', overflow: 'hidden',
        /* 'inherit', not 'default': a chip inside a NodeChain sits on a slot that says
           move, and a chip that reasserted the plain arrow hid the one affordance the
           chain provides. A chip that is itself clickable keeps pointer. */
        cursor: onClick || selectable ? 'pointer' : 'inherit',
        opacity: dim ? 'var(--opacity-off-path)' : 1, transition: 'var(--transition-wash)',
      }}
    >
      {bordered || plain ? null : (
        <span style={{ width: M.dot, height: M.dot, borderRadius: 'var(--radius-pill)', flexShrink: 0, background: hue, marginTop: wrap ? M.dotTop : 0 }} />
      )}
      {index ? (
        <span style={{
          flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)',
          fontVariantNumeric: 'var(--tnum)', fontWeight: 'var(--fw-regular)',
          color: 'var(--text-3)', marginTop: wrap ? M.indexTop : 0, opacity: dim ? 0.8 : 1,
        }}>{index}</span>
      ) : null}
      {/* 'break-word', not 'anywhere': anywhere breaks mid-word at the first
          opportunity, which on a narrow chip left single letters sitting against
          the border. Word boundaries first; only split a word that cannot fit. */}
      <span style={{
        minWidth: 0, flex: onDelete ? 1 : '0 1 auto',
        overflow: 'hidden',
        overflowWrap: wrap ? 'break-word' : undefined, wordBreak: wrap ? 'normal' : undefined,
        textOverflow: wrap ? 'clip' : 'ellipsis',
        paddingRight: onDelete ? M.titlePadRight : 0,
      }}>{title}</span>
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
            alignSelf: wrap ? 'flex-start' : 'center', marginTop: wrap ? M.delTop : 0,
            transition: 'opacity var(--dur-fade) var(--ease-soft), var(--transition-wash)',
          }}>{'✕'}</button>
      ) : null}
    </span>
  )
}
