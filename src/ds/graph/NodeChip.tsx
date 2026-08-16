import React, { useState, useRef, useEffect } from 'react'
import type { DomainCode } from './vocab'
import { DOMAIN_TOKEN } from './vocab'

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

function useRecede(): [boolean, () => void, () => void] {
  const [shown, setShown] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current) }, [])
  const show = () => { if (timer.current !== null) clearTimeout(timer.current); setShown(true) }
  const hide = () => {
    if (timer.current !== null) clearTimeout(timer.current)
    const LEAVE = ((window as unknown as { PKT_SB?: { LEAVE: number } }).PKT_SB?.LEAVE) ?? 500
    timer.current = window.setTimeout(() => setShown(false), LEAVE)
  }
  return [shown, show, hide]
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

export function NodeChip({
  title, index, domain, mark = 'dot', dim, lit, note, wrap, onClick, onDelete,
  selectable = false, selected, defaultSelected = false, onSelectedChange,
  resizable = true, minWidth = 120, maxWidth = 520, minHeight = 28, maxHeight = 320,
  width, height, onResize,
}: NodeChipProps) {
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
        position: 'relative', display: 'inline-flex', gap: 6,
        /* a hand-set height centres its content: the extra room is deliberate, and
           text pinned to the top of it looks like a layout accident instead */
        alignItems: size && size.h ? 'center' : (wrap ? 'flex-start' : 'center'),
        width: (size && size.w) || undefined, height: (size && size.h) || undefined,
        minWidth: 'min-content', minHeight: 'fit-content',
        maxWidth: size && size.w ? 'none' : '100%',
        userSelect: 'none', WebkitUserSelect: 'none',
        /* no disc means no room reserved for one: 'none' takes the bordered padding,
           which is symmetric, rather than the dot form's narrower left inset */
        padding: bordered || plain ? (wrap ? '4px 11px' : '3px 12px') : '4px 11px 4px 9px',
        borderRadius: wrap ? 'var(--radius-md)' : 'var(--radius-pill)',
        border: bordered
          ? 'var(--stroke-rule) solid ' + (dim ? 'var(--border-hair)' : hue)
          : '1px solid ' + (dim ? 'var(--border-hair)' : 'var(--border-rule)'),
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
        <span style={{ width: 7, height: 7, borderRadius: 'var(--radius-pill)', flexShrink: 0, background: hue, marginTop: wrap ? 6 : 0 }} />
      )}
      {index ? (
        <span style={{
          flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)',
          fontVariantNumeric: 'var(--tnum)', fontWeight: 'var(--fw-regular)',
          color: 'var(--text-3)', marginTop: wrap ? 1 : 0, opacity: dim ? 0.8 : 1,
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
        paddingRight: onDelete ? 4 : 0,
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
            width: 18, height: 18, flexShrink: 0, marginLeft: 'auto', marginRight: -2, padding: 0,
            display: 'grid', placeItems: 'center', boxSizing: 'border-box',
            borderRadius: 'var(--radius-pill)', border: '1px solid transparent', background: 'transparent',
            color: 'var(--state-danger)', fontFamily: 'var(--font-ui)', fontSize: 10, lineHeight: 1,
            cursor: 'pointer', opacity: hot ? 1 : 0, pointerEvents: hot ? 'auto' : 'none',
            alignSelf: wrap ? 'flex-start' : 'center', marginTop: wrap ? 1 : 0,
            transition: 'opacity var(--dur-fade) var(--ease-soft), var(--transition-wash)',
          }}>{'✕'}</button>
      ) : null}
    </span>
  )
}
