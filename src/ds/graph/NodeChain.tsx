import React, { useState, useRef, useMemo } from 'react'
import { NodeArrow } from './NodeArrow'
import type { NodeArrowProps } from './NodeArrow'

/** A chain of nodes and groups — the sequence, its arrows, and its owner of order.
 *  Port of DS components/graph/NodeChain.jsx.
 *
 *  Reordering lives here rather than in the nodes: a chip that dragged itself would
 *  need to know its siblings, their sizes and their order to know where it landed,
 *  and the chain knows all three. Motion is constrained to the chain's axis. */

export interface NodeChainProps {
  /** the nodes, in order — NodeChips, VersionedGroups, or both */
  children?: React.ReactNode
  /** 'down' (default) or 'right' */
  direction?: 'down' | 'right'
  /** extra space between slots, on top of the arrow. Default 0 */
  gap?: number
  /** draw a NodeArrow in every gap. Default true */
  arrow?: boolean
  /** props forwarded to each arrow — tone, length, dashed */
  arrowProps?: Partial<NodeArrowProps>
  /** drag to reorder. Default true */
  reorderable?: boolean
  /** hand each child its position as `index` — the chain renumbers on reorder */
  number?: boolean
  /** the parent's own number, so a nested chain numbers 2.1, 2.2 under "2." */
  prefix?: string
  /** positions, not ids: the slot the node came from and the slot it landed on.
   *  Pass this and the caller owns the order; omit it and the chain keeps its own */
  onReorder?: (from: number, to: number) => void
}

function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice()
  const [held] = next.splice(from, 1)
  next.splice(to, 0, held)
  return next
}

export function NodeChain({
  children, direction = 'down', gap = 0, arrow = true, arrowProps,
  reorderable = true, number: numberSteps = false, prefix = '', onReorder,
}: NodeChainProps) {
  const kids = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<Record<string, unknown>>[]
  const down = direction !== 'right'
  const [own, setOwn] = useState<string[] | null>(null)
  const [drag, setDrag] = useState<{ at: number; d: number; to: number; size: number } | null>(null)
  const slots = useRef<(HTMLDivElement | null)[]>([])
  const arrowRef = useRef<HTMLSpanElement | null>(null)

  const keys = kids.map((kid, i) => (kid.key != null ? String(kid.key) : 'i' + i))

  const view = useMemo(() => {
    if (!own) return kids.map((_, i) => i)
    const kept = own.filter((key) => keys.indexOf(key) !== -1)
    keys.forEach((key, i) => { if (kept.indexOf(key) === -1) kept.splice(Math.min(i, kept.length), 0, key) })
    return kept.map((key) => keys.indexOf(key))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [own, keys.join('\x00')])

  const base = prefix ? String(prefix).replace(/\.$/, '') + '.' : ''
  const dotted = prefix ? String(prefix).trim().endsWith('.') : true
  const stepOf = (i: number) => base + (i + 1) + (dotted ? '.' : '')

  const startDrag = (at: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (!reorderable || e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest && target.closest('button, input, textarea, select, a, [role="listbox"]')) return
    const boxes = slots.current.map((el) => el && el.getBoundingClientRect())
    if (!boxes[at]) return
    const centers = boxes.map((b) => (b ? (down ? b.top + b.height / 2 : b.left + b.width / 2) : 0))
    const arrowBox = arrowRef.current && arrowRef.current.getBoundingClientRect()
    const arrowSize = arrow ? (arrowBox ? (down ? arrowBox.height : arrowBox.width) : 22) : 0
    const box = boxes[at]!
    const size = (down ? box.height : box.width) + arrowSize + gap
    const start = down ? e.clientY : e.clientX
    const node = e.currentTarget
    let state = { at, d: 0, to: at, size }
    setDrag(state)
    try { node.setPointerCapture(e.pointerId) } catch { /* older pointer impls */ }
    const move = (ev: PointerEvent) => {
      const d = (down ? ev.clientY : ev.clientX) - start
      const mid = centers[at] + d
      let to = at
      let best = Infinity
      centers.forEach((c, i) => { const gapTo = Math.abs(c - mid); if (gapTo < best) { best = gapTo; to = i } })
      state = { at, d, to, size }
      setDrag(state)
    }
    const up = () => {
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', up)
      node.removeEventListener('pointercancel', up)
      if (state.to !== state.at) {
        if (onReorder) onReorder(state.at, state.to)
        else setOwn(reorder(view.map((n) => keys[n]), state.at, state.to))
      }
      setDrag(null)
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', up)
    node.addEventListener('pointercancel', up)
  }

  const shiftOf = (i: number) => {
    if (!drag || i === drag.at) return 0
    if (drag.at < drag.to && i > drag.at && i <= drag.to) return -drag.size
    if (drag.to < drag.at && i >= drag.to && i < drag.at) return drag.size
    return 0
  }

  return (
    <div style={{
      display: 'flex', flexDirection: down ? 'column' : 'row',
      alignItems: down ? 'stretch' : 'center', gap,
    }}>
      {view.map((k, i) => {
        const kid = kids[k]
        const held = drag && drag.at === i
        const off = held ? drag.d : shiftOf(i)
        const numbered = numberSteps && kid && typeof kid.type === 'function' && kid.props.index === undefined
          ? React.cloneElement(kid, { index: stepOf(i) })
          : kid
        return (
          <React.Fragment key={kid.key || k}>
            {arrow && i > 0 ? (
              <span ref={i === 1 ? arrowRef : undefined}
                style={{ display: 'flex', justifyContent: 'center', pointerEvents: 'none', flexShrink: 0 }}>
                <NodeArrow direction={down ? 'down' : 'right'} {...arrowProps} />
              </span>
            ) : null}
            <div
              ref={(el) => { slots.current[i] = el }}
              onPointerDown={startDrag(i)}
              style={{
                display: 'flex', flexDirection: down ? 'column' : 'row',
                alignItems: down ? 'stretch' : 'center',
                cursor: reorderable ? 'move' : undefined,
                transform: (down ? 'translateY(' : 'translateX(') + off + 'px)',
                transition: held ? 'none' : 'transform var(--dur-move) var(--ease-settle)',
                zIndex: held ? 30 : 1, position: 'relative',
                touchAction: reorderable ? 'none' : undefined,
              }}>
              {numbered}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}
