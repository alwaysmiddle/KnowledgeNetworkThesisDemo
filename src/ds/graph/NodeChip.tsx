import React, { useState, useRef, useEffect } from 'react'
import type { DomainCode } from './vocab'
import { DOMAIN_TOKEN } from './vocab'

/** A corpus node as a chip: dot (or border), truncating title, raised on paper.
 *  Port of DS components/graph/NodeChip.jsx.
 *
 *  Deviations from DS source:
 *  - Uses DOMAIN_TOKEN from ./vocab instead of an inline DOMAIN map (single source)
 *  - Drops the undocumented `wrap` prop (absent from NodeChip.d.ts) */

export interface NodeChipProps {
  title: string
  /** the node's step number in its container ("2.1") — derived, mono, tabular,
   *  --fs-micro at --text-3: a figure glanced at beside the name, never level with it */
  index?: string
  domain: DomainCode
  /** which carrier holds the domain colour. 'dot' (default) is the dense form for
   *  trails, legends and rails; 'border' is a 1.5px domain-coloured edge with no disc,
   *  for a node standing on its own — a stop inside a group, a node on the road */
  mark?: 'dot' | 'border'
  /** off the resolved path: no lift, no fill, --opacity-off-path */
  dim?: boolean
  /** cross-pane hover correspondence — a 1.5px pond ring over the chip's own lift */
  lit?: boolean
  /** tooltip; the stop's note when there is one */
  note?: string
  onClick?: () => void
  /** drag the chip's right edge, bottom edge or corner to size it; double-click an edge
   *  gives that dimension back to automatic. Default true */
  resizable?: boolean
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
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

function useSizeDrag(ref: React.RefObject<HTMLSpanElement | null>, bounds: SizeBounds) {
  const [size, setSize] = useState<SizeState | null>(null)
  const start = (axis: 'x' | 'y' | 'both') => (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.preventDefault(); e.stopPropagation()
    const box = ref.current && ref.current.getBoundingClientRect()
    if (!box) return
    const node = e.currentTarget as HTMLElement
    const from = { x: e.clientX, y: e.clientY, w: box.width, h: box.height }
    let last = { w: (size && size.w) || Math.round(box.width), h: (size && size.h) || Math.round(box.height) }
    try { node.setPointerCapture(e.pointerId) } catch { /* older pointer impls */ }
    const move = (ev: PointerEvent) => {
      const w = axis === 'y' ? last.w
        : Math.round(Math.max(bounds.minW, Math.min(bounds.maxW, from.w + (ev.clientX - from.x))))
      const h = axis === 'x' ? last.h
        : Math.round(Math.max(bounds.minH, Math.min(bounds.maxH, from.h + (ev.clientY - from.y))))
      last = { w, h }
      setSize(last)
    }
    const up = () => {
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', up)
      node.removeEventListener('pointercancel', up)
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', up)
    node.addEventListener('pointercancel', up)
  }
  const reset = (axis: 'x' | 'y' | 'both') => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setSize((s) => {
      if (!s) return null
      const next: SizeState = { w: axis === 'y' ? s.w : null, h: axis === 'x' ? s.h : null }
      return !next.w && !next.h ? null : next
    })
  }
  return [size, start, reset, setSize] as const
}

export function NodeChip({
  title, index, domain, mark = 'dot', dim, lit, note, onClick, onDelete,
  resizable = true, minWidth = 120, maxWidth = 520, minHeight = 28, maxHeight = 320,
}: NodeChipProps) {
  const hue = DOMAIN_TOKEN[domain] || 'var(--swatch-anchor-fallback)'
  const bordered = mark === 'border'
  const [hot, showX, hideX] = useRecede()
  const shell = useRef<HTMLSpanElement | null>(null)
  const [size, startSize, resetSize, setSizeFromLayout] = useSizeDrag(shell, { minW: minWidth, maxW: maxWidth, minH: minHeight, maxH: maxHeight })

  useEffect(() => {
    const el = shell.current
    if (!el || !size) return
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
      onClick={onClick}
      onMouseEnter={showX} onMouseLeave={hideX}
      onFocus={showX} onBlur={hideX}
      style={{
        boxSizing: 'border-box',
        position: 'relative', display: 'inline-flex', gap: 6,
        alignItems: 'center',
        width: (size && size.w) || undefined, height: (size && size.h) || undefined,
        minWidth: 'min-content', minHeight: 'fit-content',
        maxWidth: size && size.w ? 'none' : '100%',
        userSelect: 'none', WebkitUserSelect: 'none',
        padding: bordered ? '3px 12px' : '4px 11px 4px 9px',
        borderRadius: 'var(--radius-pill)',
        border: bordered
          ? 'var(--stroke-rule) solid ' + (dim ? 'var(--border-hair)' : hue)
          : '1px solid ' + (dim ? 'var(--border-hair)' : 'var(--border-rule)'),
        background: dim ? 'transparent' : 'var(--surface-raised)',
        color: dim ? 'var(--text-3)' : 'var(--text-1)',
        boxShadow: lit ? 'var(--ring-linked), var(--lift-1)' : dim ? 'none' : 'var(--lift-1)',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)',
        whiteSpace: 'nowrap', overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'inherit',
        opacity: dim ? 'var(--opacity-off-path)' : 1, transition: 'var(--transition-wash)',
      }}
    >
      {bordered ? null : (
        <span style={{ width: 7, height: 7, borderRadius: 'var(--radius-pill)', flexShrink: 0, background: hue }} />
      )}
      {index ? (
        <span style={{
          flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)',
          fontVariantNumeric: 'var(--tnum)', fontWeight: 'var(--fw-regular)',
          color: 'var(--text-3)', opacity: dim ? 0.8 : 1,
        }}>{index}</span>
      ) : null}
      <span style={{
        minWidth: 0, flex: onDelete ? 1 : '0 1 auto',
        overflow: 'hidden', textOverflow: 'ellipsis',
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
            alignSelf: 'center',
            transition: 'opacity var(--dur-fade) var(--ease-soft), var(--transition-wash)',
          }}>{'✕'}</button>
      ) : null}
    </span>
  )
}
