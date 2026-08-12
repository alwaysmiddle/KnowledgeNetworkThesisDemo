import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { caretStyle } from '../nav/TreeRow'
import { bulletStyle } from '../sidebar/InstrumentRow'
import { NodeChain } from '../graph/NodeChain'

/** A nested subgroup that holds several versions of itself, exactly one of which
 *  is on screen. Port of DS components/group/VersionedGroup.jsx.
 *
 *  Four rows: the group's name with its tally and fold control, the group's one
 *  description, the version picker, then the contents chained by arrows.
 *  Open = recessed well (--surface-sunken + --sink-1). Folded = raised node at
 *  --lift-2, well tint stacked behind. No domain dot — contents can span domains. */

export interface GroupVersion {
  id: string
  /** the version's own name — authored text, verbatim. Wraps to two lines */
  name: string
  /** a short designation, e.g. "v2" — mono, tabular. Normally omitted */
  label?: string
}

export interface VersionedGroupProps {
  title: string
  index?: string
  numberSteps?: boolean
  onReorderNodes?: (from: number, to: number) => void
  maxWidth?: number | string
  bodyMaxHeight?: number | string
  menuMaxHeight?: number | string
  foldedMinWidth?: number | string
  resizable?: boolean
  minWidth?: number
  resizeMaxWidth?: number
  minBodyHeight?: number
  movable?: boolean
  onMove?: (offset: { x: number; y: number }) => void
  onResize?: (size: { width: number | null; height: number | null }) => void
  /** CONTROLLED SIZE, read like `folded`: omit and the group keeps whatever the
   *  user dragged it to; pass these and the caller's numbers win. The drag itself
   *  always runs on own state and `onResize` reports on pointer-up; at rest the
   *  prop is authoritative. `null` on an axis hands it back to automatic */
  width?: number | null
  bodyHeight?: number | null
  /** CONTROLLED POSITION, pairing with `onMove` on the same terms as `width` */
  offset?: { x: number; y: number } | null
  /** the tally drops to its own line below ~250px. Left undefined the group
   *  measures itself; pass this and the ResizeObserver is never installed */
  narrow?: boolean
  /** where to render the version menu. **Defaults to `document.body`** — the shell
   *  is position:relative + z-index:1 (the folded peek stacks behind it), so every
   *  group is a stacking context and an in-card listbox can never paint over
   *  anything outside its own card. Rendered out, the list is fixed and measured
   *  from the picker's rect: it opens where you clicked, matches the picker's
   *  width, and flips above when the viewport has no room below. Pass another node
   *  to send it elsewhere (it must be outside any transformed ancestor, or fixed
   *  resolves against that ancestor rather than the viewport); pass `null` for the
   *  old in-card behaviour, correct only when the group is topmost on screen */
  menuPortal?: Element | null
  description?: string
  emptyLabel?: string
  descPlaceholder?: string
  versions: GroupVersion[]
  activeId?: string
  count?: number
  countLabel?: string
  folded?: boolean
  defaultFolded?: boolean
  addLabel?: string
  defaultOpen?: boolean
  onRetitle?: (title: string) => void
  onDescribe?: (description: string) => void
  onSelect?: (id: string) => void
  onRename?: (id: string, name: string) => void
  onAddVersion?: () => void
  onDeleteVersion?: (id: string) => void
  ungroupBlockedLabel?: string
  confirmDelete?: boolean
  onToggleFold?: (folded: boolean) => void
  onClose?: (spill: { versionId: string; count: number }) => void
  children?: React.ReactNode
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function NameField({ value, onCommit, onCancel, size, weight, family, placeholder }: {
  value: string; onCommit: (v: string) => void; onCancel: () => void
  size?: string; weight?: string; family?: string; placeholder?: string
}) {
  const ref = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState(value)
  useEffect(() => { const el = ref.current; if (el) { el.focus(); el.select() } }, [])
  return (
    <input ref={ref} value={draft} spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') onCommit(draft.trim())
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => onCommit(draft.trim())}
      placeholder={placeholder}
      style={{
        flex: 1, minWidth: 0, padding: '2px 6px', margin: '-2px 0',
        borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-strong)',
        background: 'var(--surface-raised)', color: 'var(--text-1)',
        fontFamily: family || 'var(--font-ui)', fontSize: size || 'var(--fs-body)',
        fontWeight: weight || 'var(--fw-medium)',
        cursor: 'text', userSelect: 'text', WebkitUserSelect: 'text',
        outline: 'none', boxShadow: 'var(--ring-focus)',
      }} />
  )
}

function IconButton({ label, glyph, size = 12, onClick, reachable = true }: {
  label: string; glyph: React.ReactNode; size?: number
  onClick?: () => void; reachable?: boolean
}) {
  const [hot, setHot] = useState(false)
  return (
    <button type="button" title={label} aria-label={label}
      tabIndex={reachable ? 0 : -1}
      onClick={(e) => { e.stopPropagation(); if (onClick) onClick() }}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{
        width: 18, height: 18, flexShrink: 0, display: 'grid', placeItems: 'center', padding: 0,
        boxSizing: 'border-box',
        borderRadius: 'var(--radius-pill)', border: '1px solid ' + (hot ? 'var(--border-rule)' : 'transparent'),
        background: hot ? 'var(--surface-hover)' : 'transparent',
        color: hot ? 'var(--text-1)' : 'var(--text-2)',
        fontFamily: 'var(--font-ui)', fontSize: size, lineHeight: 1,
        cursor: 'pointer', transition: 'var(--transition-wash)',
      }}>{glyph}</button>
  )
}

/** The tick, drawn rather than set — two strokes of a rotated corner. Exported
 *  for the same reason caretStyle is: the Railroad's container head is this same
 *  version picker laid out by its own engine, and the system draws a tick one
 *  way. (Upstream still keeps it private — see the drift log.) */
export function checkStyle(): CSSProperties {
  return {
    width: 9, height: 5, boxSizing: 'border-box',
    borderLeft: '1.75px solid currentColor', borderBottom: '1.75px solid currentColor',
    transform: 'rotate(-45deg) translate(0, -1px)',
  }
}

function RestoreMark() {
  return (
    <span style={{ position: 'relative', width: 10, height: 10, display: 'block' }}>
      <span style={{ position: 'absolute', top: 0, right: 0, width: 7, height: 7, boxSizing: 'border-box', borderTop: '1.25px solid currentColor', borderRight: '1.25px solid currentColor', borderTopRightRadius: 1.5 }} />
      <span style={{ position: 'absolute', bottom: 0, left: 0, width: 7, height: 7, boxSizing: 'border-box', border: '1.25px solid currentColor', borderRadius: 1.5 }} />
    </span>
  )
}

function DescLine({ text, placeholder, indent, onCommit }: {
  text?: string; placeholder?: string; indent?: number; onCommit?: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  if (!onCommit && !text) return null
  if (editing) {
    return (
      <div style={{ display: 'flex', padding: '1px 7px 1px ' + (7 + (indent || 0)) + 'px' }}>
        <NameField value={text || ''} size="var(--fs-caption)"
          onCommit={(v) => { setEditing(false); if (v !== (text || '') && onCommit) onCommit(v) }}
          onCancel={() => setEditing(false)} />
      </div>
    )
  }
  return (
    <div data-grab="" style={{ display: 'block', padding: '1px 7px 1px ' + (7 + (indent || 0)) + 'px', cursor: 'inherit' }}>
      <span title={onCommit ? 'click to edit' : undefined}
        onClick={(e) => { e.stopPropagation(); if (onCommit) setEditing(true) }}
        style={{
          display: 'inline-block', maxWidth: '100%',
          fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)',
          lineHeight: 'var(--lh-snug)', color: text ? 'var(--text-2)' : 'var(--text-3)',
          fontStyle: text ? 'normal' : 'italic', cursor: onCommit ? 'text' : 'inherit',
        }}>{text || placeholder}</span>
    </div>
  )
}

function ConfirmButton({ label, danger, onClick }: { label: string; danger?: boolean; onClick?: () => void }) {
  const [hot, setHot] = useState(false)
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); if (onClick) onClick() }}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{
        flexShrink: 0, padding: '3px 9px', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box',
        border: '1px solid ' + (hot ? (danger ? 'var(--state-danger)' : 'var(--border-rule)') : 'transparent'),
        background: hot ? (danger ? 'var(--berry-100)' : 'var(--surface-hover)') : 'transparent',
        color: danger ? 'var(--berry-600)' : 'var(--text-2)',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)',
        fontWeight: danger ? 'var(--fw-semibold)' : 'var(--fw-medium)',
        cursor: 'pointer', transition: 'var(--transition-wash)',
      }}>{label}</button>
  )
}

function AddRow({ label, onClick }: { label: string; onClick: () => void }) {
  const [hot, setHot] = useState(false)
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--space-15)', width: '100%',
        minHeight: 'var(--hit-min)', padding: '4px 8px', textAlign: 'left', boxSizing: 'border-box',
        borderRadius: 'var(--radius-sm)', border: '1px solid ' + (hot ? 'var(--border-rule)' : 'transparent'),
        background: hot ? 'var(--surface-hover-raised)' : 'transparent',
        color: hot ? 'var(--text-1)' : 'var(--text-2)',
        fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-medium)',
        fontStyle: 'italic', cursor: 'pointer', transition: 'var(--transition-wash)',
      }}>
      <span aria-hidden="true" style={{ width: 12, flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 13, lineHeight: 1, fontStyle: 'normal' }}>+</span>
      {label}
    </button>
  )
}

function VersionRow({ version, on, onPick, onDelete, confirming, onCancel }: {
  version: GroupVersion; on: boolean; onPick: () => void
  onDelete?: () => void; confirming?: boolean; onCancel?: () => void
}) {
  const [hot, setHot] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current) }, [])
  const show = () => { if (timer.current !== null) clearTimeout(timer.current); setHot(true) }
  const hide = () => {
    if (timer.current !== null) clearTimeout(timer.current)
    const LEAVE = ((window as unknown as { PKT_SB?: { LEAVE: number } }).PKT_SB?.LEAVE) ?? 500
    timer.current = window.setTimeout(() => setHot(false), LEAVE)
  }
  return (
    <div style={{ position: 'relative', display: 'flex' }}
      onMouseEnter={show} onMouseLeave={hide}
      onFocus={show} onBlur={hide}>
      {confirming ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-15)', width: '100%',
          minHeight: 'var(--hit-min)', padding: '4px 6px 4px 8px', boxSizing: 'border-box',
          borderRadius: 'var(--radius-sm)', background: 'var(--state-danger-wash)',
          fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)', color: 'var(--text-2)',
        }}>
          <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>delete this version?</span>
          <ConfirmButton label="keep" onClick={onCancel} />
          <ConfirmButton label="delete" danger onClick={onDelete} />
        </div>
      ) : (
        <>
          <button type="button" role="option" aria-selected={on} onClick={onPick}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-15)', width: '100%',
              minHeight: 'var(--hit-min)', padding: '4px 8px', textAlign: 'left', boxSizing: 'border-box',
              borderRadius: 'var(--radius-sm)', border: '1px solid ' + (hot ? 'var(--border-rule)' : 'transparent'),
              background: hot ? 'var(--surface-hover-raised)' : 'transparent',
              fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-body)',
              fontWeight: on ? 'var(--fw-semibold)' : 'var(--fw-medium)',
              color: on ? 'var(--accent-primary-ink)' : 'var(--text-1)',
              cursor: 'pointer', transition: 'var(--transition-wash)',
            }}>
            <span style={{ width: 12, display: 'grid', placeItems: 'center', flexShrink: 0, color: 'var(--accent-primary-ink)' }}>
              {on ? <span style={checkStyle()} /> : <span style={bulletStyle(false)} />}
            </span>
            {version.label ? (
              <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', fontVariantNumeric: 'var(--tnum)', color: on ? 'var(--accent-primary-ink)' : 'var(--text-2)' }}>{version.label}</span>
            ) : null}
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: onDelete ? 16 : 0 }}>{version.name}</span>
          </button>
          {onDelete ? (
            <button type="button" title="delete this version" aria-label="delete this version"
              tabIndex={hot ? 0 : -1}
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--state-danger-wash)'; e.currentTarget.style.borderColor = 'var(--state-danger)'; e.currentTarget.style.color = 'var(--berry-600)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--state-danger)' }}
              style={{
                position: 'absolute', top: 5, right: 5, width: 18, height: 18, padding: 0,
                display: 'grid', placeItems: 'center', boxSizing: 'border-box',
                borderRadius: 'var(--radius-pill)', border: '1px solid transparent', background: 'transparent',
                color: 'var(--state-danger)', fontFamily: 'var(--font-ui)', fontSize: 10, lineHeight: 1,
                cursor: 'pointer', opacity: hot ? 1 : 0, pointerEvents: hot ? 'auto' : 'none',
                transition: 'opacity var(--dur-fade) var(--ease-soft), var(--transition-wash)',
              }}>{'✕'}</button>
          ) : null}
        </>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function VersionedGroup({
  title = 'untitled', index, description, versions = [], activeId,
  folded, defaultFolded = false, count, addLabel = 'add new version', defaultOpen = false,
  descPlaceholder = 'enter description',
  emptyLabel = 'no nodes in this version — drag one in', numberSteps = true, countLabel = 'nodes',
  onReorderNodes,
  maxWidth = 300, bodyMaxHeight = 260, menuMaxHeight = 240, foldedMinWidth = 190,
  resizable = true, minWidth = 200, resizeMaxWidth = 680, minBodyHeight = 72, onResize,
  width, bodyHeight, offset, narrow, menuPortal,
  movable = true, onMove, onDeleteVersion, ungroupBlockedLabel, confirmDelete = true,
  onRetitle, onDescribe, onSelect, onRename, onAddVersion, onToggleFold, onClose, children,
}: VersionedGroupProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [editing, setEditing] = useState<'title' | 'version' | null>(null)
  const [ownFold, setOwnFold] = useState(defaultFolded)
  const [hot, setHot] = useState<string | null>(null)
  const [ownSize, setOwnSize] = useState<{ w: number | null; h: number | null } | null>(null)
  const [ownPos, setOwnPos] = useState<{ x: number; y: number } | null>(null)
  const [carrying, setCarrying] = useState(false)
  const [sizing, setSizing] = useState(false)
  const shell = useRef<HTMLDivElement | null>(null)
  const body = useRef<HTMLDivElement | null>(null)
  const pickerRef = useRef<HTMLDivElement | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [anchor, setAnchor] = useState<{ left: number; width: number; up: boolean; top?: number; bottom?: number } | null>(null)
  const [live, setLive] = useState(false)
  const [ownNarrow, setOwnNarrow] = useState(false)
  const [refusal, setRefusal] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)

  const isFolded = folded === undefined ? ownFold : folded
  /* CONTROLLED POSITION AND SIZE, read exactly like `folded` above: no prop, own
     state; prop, the caller's number. The DRAG always runs on own state — routing
     every pointermove out to a caller and back is what makes a controlled drag
     lag — so `carrying` and `sizing` hand the gesture back to the component for
     its duration. At rest the prop is authoritative: a caller that ignores the
     pointer-up report gets the snap-back a controlled input gives. */
  const at = offset === undefined || carrying ? ownPos : offset
  const curW = width === undefined || sizing ? (ownSize && ownSize.w) || null : width
  const curH = bodyHeight === undefined || sizing ? (ownSize && ownSize.h) || null : bodyHeight
  const isNarrow = narrow === undefined ? ownNarrow : narrow
  const active = versions.find((v) => v.id === activeId) || versions[0] || { id: null as unknown as string, name: 'untitled' }
  const kids = React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement[]
  const tally = count === undefined ? kids.length : count

  useEffect(() => {
    const el = shell.current
    /* told, never measured: a caller that predicts this head's height before it
       renders cannot also be waiting on it to measure itself */
    if (narrow !== undefined) return
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver((entries) => {
      const box = entries[0] && entries[0].contentRect
      if (box) setOwnNarrow(box.width < 250)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [narrow])

  useEffect(() => {
    const el = shell.current
    if (!el) return
    let t: number | undefined
    const LEAVE = ((window as unknown as { PKT_SB?: { LEAVE: number } }).PKT_SB?.LEAVE) ?? 500
    const on = () => { clearTimeout(t); setLive(true) }
    const off = () => { clearTimeout(t); t = window.setTimeout(() => setLive(false), LEAVE) }
    el.addEventListener('pointerenter', on); el.addEventListener('pointerleave', off)
    el.addEventListener('focusin', on); el.addEventListener('focusout', off)
    return () => {
      clearTimeout(t)
      el.removeEventListener('pointerenter', on); el.removeEventListener('pointerleave', off)
      el.removeEventListener('focusin', on); el.removeEventListener('focusout', off)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (shell.current && shell.current.contains(e.target as Node)) return
      /* a portaled menu is not inside the shell, so the shell test alone would
         close it on mousedown and unmount the row before its click landed */
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return
      setOpen(false); setConfirming(null)
    }
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setConfirming(null) } }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', key) }
  }, [open])

  const fold = () => {
    setOpen(false)
    if (folded === undefined) setOwnFold((f) => !f)
    if (onToggleFold) onToggleFold(!isFolded)
  }

  const askUngroup = () => {
    if (versions.length > 1) {
      setRefusal(ungroupBlockedLabel || ('cannot ungroup — ' + versions.length + ' versions live here; delete all but one first'))
      return
    }
    if (onClose) onClose({ versionId: active.id, count: kids.length })
  }

  useEffect(() => {
    if (!refusal) return
    const t = window.setTimeout(() => setRefusal(null), 4500)
    const away = () => setRefusal(null)
    document.addEventListener('pointerdown', away, true)
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', away, true) }
  }, [refusal])

  const stop = (e: React.MouseEvent) => e.stopPropagation()

  /* THE MENU LEAVES THE CARD BY DEFAULT. The shell below is position:relative +
     z-index:1 — a stacking context — so the in-card listbox's z-index only ranks
     against the group's own children: it can never paint over anything outside the
     card. Two groups near each other slice an open menu; no board, no z-index and
     no drag transform are needed, and spacing the cards apart does not help, since
     what overlaps the neighbour is the MENU hanging menuMaxHeight below the card's
     own edge. No number fixes it from in here, because the trap is a context rather
     than a value.

     So the list renders into document.body unless told otherwise. A DEFAULT rather
     than a prop to remember, because the bug is in every layout this component has
     ever been rendered in — an opt-in would leave every existing call site broken. */
  const portalTarget = menuPortal === null ? null
    : menuPortal || (typeof document !== 'undefined' ? document.body : null)
  useEffect(() => {
    if (!open || !portalTarget) return
    const place = () => {
      const el = pickerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const room = window.innerHeight - r.bottom - 8
      const cap = typeof menuMaxHeight === 'number' ? menuMaxHeight : 240
      /* flip above the picker when the list would run off the bottom — in the card
         the well's own scroll absorbed that, and at viewport level nothing does */
      const up = room < Math.min(cap, 160) && r.top > room
      const next = {
        left: Math.round(r.left), width: Math.round(r.width), up,
        top: up ? undefined : Math.round(r.bottom + 3),
        bottom: up ? Math.round(window.innerHeight - r.top + 3) : undefined,
      }
      /* same rect, same object: place() runs from an observer and from three event
         sources, and a fresh object every time would re-render on every scroll tick */
      setAnchor((prev) => (prev && prev.left === next.left && prev.width === next.width
        && prev.top === next.top && prev.bottom === next.bottom && prev.up === next.up) ? prev : next)
    }
    place()
    /* the first measurement lands while the card is still sizing — the group's own
       width is settling in the same commit that opens the menu — so it is taken
       again after paint. Without this the menu opens ~16px wide of the picker and
       stays there until something incidentally re-measures it. */
    const raf = requestAnimationFrame(place)
    /* and the picker keeps moving after that: this group resizes and is carried
       around, both of which change the rect with no scroll and no window resize */
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    if (ro && pickerRef.current) ro.observe(pickerRef.current)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      cancelAnimationFrame(raf)
      if (ro) ro.disconnect()
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open, portalTarget, menuMaxHeight, at, curW, curH, isNarrow])
  const portaled = !!(portalTarget && anchor)

  const startDrag = (axis: 'x' | 'y' | 'both') => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation()
    const box = shell.current && shell.current.getBoundingClientRect()
    if (!box) return
    const bodyBox = body.current && body.current.getBoundingClientRect()
    const from = { x: e.clientX, y: e.clientY, w: box.width, h: curH || (bodyBox && Math.round(bodyBox.height)) || (bodyMaxHeight as number) }
    const node = e.currentTarget as HTMLElement
    let last = { w: curW || Math.round(box.width), h: from.h }
    /* seed own state from what is on screen NOW, so a controlled group does not
       flash back to automatic between pointerdown and the first move */
    setSizing(true)
    setOwnSize(last)
    try { node.setPointerCapture(e.pointerId) } catch { /* older pointer impls */ }
    const move = (ev: PointerEvent) => {
      const w = axis === 'y' ? last.w : Math.round(Math.max(minWidth, Math.min(resizeMaxWidth, from.w + (ev.clientX - from.x))))
      const h = axis === 'x' ? last.h : Math.round(Math.max(minBodyHeight, from.h + (ev.clientY - from.y)))
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

  const resetAxis = (axis: 'x' | 'y' | 'both') => (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!curW && !curH) return
    const next = { w: axis === 'y' ? curW : null, h: axis === 'x' ? curH : null }
    setOwnSize(!next.w && !next.h ? null : next)
    if (onResize) onResize({ width: next.w, height: next.h })
  }

  const startMove = (e: React.PointerEvent) => {
    if (!movable || e.button !== 0) return
    const el = e.target as HTMLElement
    if (!(el && el.hasAttribute && el.hasAttribute('data-grab'))) return
    e.preventDefault()
    const from = { x: e.clientX, y: e.clientY, ox: (at && at.x) || 0, oy: (at && at.y) || 0 }
    const node = e.currentTarget as HTMLElement
    let last = { x: from.ox, y: from.oy }
    setCarrying(true)
    try { node.setPointerCapture(e.pointerId) } catch { /* older pointer impls */ }
    const move = (ev: PointerEvent) => {
      last = { x: Math.round(from.ox + (ev.clientX - from.x)), y: Math.round(from.oy + (ev.clientY - from.y)) }
      setOwnPos(last)
    }
    const up = () => {
      node.removeEventListener('pointermove', move)
      node.removeEventListener('pointerup', up)
      node.removeEventListener('pointercancel', up)
      setCarrying(false)
      if (onMove) onMove(last)
    }
    node.addEventListener('pointermove', move)
    node.addEventListener('pointerup', up)
    node.addEventListener('pointercancel', up)
  }

  const edge = (side: 'right' | 'bottom' | 'corner') => {
    const common: CSSProperties = { position: 'absolute', zIndex: 2, background: 'transparent', touchAction: 'none' }
    if (side === 'right') return <span aria-hidden="true" title="drag to resize · double-click to reset" onPointerDown={startDrag('x')} onDoubleClick={resetAxis('x')} style={{ ...common, top: 14, bottom: 14, right: -3, width: 8, cursor: 'ew-resize' }} />
    if (side === 'bottom') return <span aria-hidden="true" title="drag to resize · double-click to reset" onPointerDown={startDrag('y')} onDoubleClick={resetAxis('y')} style={{ ...common, left: 14, right: 14, bottom: -3, height: 8, cursor: 'ns-resize' }} />
    return <span aria-hidden="true" title="drag to resize · double-click to reset" onPointerDown={startDrag('both')} onDoubleClick={resetAxis('both')} style={{ ...common, right: -3, bottom: -3, width: 16, height: 16, cursor: 'nwse-resize' }} />
  }

  const word = tally === 1 ? String(countLabel).replace(/s$/, '') : countLabel
  const tallyLine = (
    <span title={tally + ' ' + word + ' inside this version'} style={{
      flexShrink: 0, display: 'inline-block', fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-micro)', lineHeight: 'var(--lh-snug)', color: 'var(--text-3)',
      fontWeight: 'var(--fw-regular)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'var(--tnum)', fontWeight: 'var(--fw-medium)' }}>{tally}</span>
      {' ' + word}
    </span>
  )

  const headRow = (
    <div data-grab="" style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-15)', minHeight: 22 }}>
      {index ? (
        <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontVariantNumeric: 'var(--tnum)', color: 'var(--text-2)', fontWeight: 'var(--fw-medium)', marginRight: -2, lineHeight: 'var(--lh-snug)' }}>{index}</span>
      ) : null}
      {editing === 'title' ? (
        <NameField value={title} family="var(--font-display)" weight="var(--fw-bold)"
          onCommit={(v) => { setEditing(null); if (v && v !== title && onRetitle) onRetitle(v) }}
          onCancel={() => setEditing(null)} />
      ) : (
        <span data-grab="" style={{ flex: '0 1 auto', minWidth: 96, display: 'block', cursor: 'inherit', marginRight: 2 }}>
          <span title={title} onClick={(e) => { stop(e); setEditing('title') }}
            style={{
              width: 'fit-content',
              maxWidth: '100%', lineHeight: 'var(--lh-snug)',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical', WebkitLineClamp: isFolded ? 3 : 2,
              whiteSpace: 'normal', overflowWrap: 'anywhere',
              overflow: 'hidden',
              fontFamily: 'var(--font-display)', fontSize: 'var(--fs-body)',
              fontWeight: 'var(--fw-bold)', color: 'var(--text-1)', cursor: 'text',
            }}>{title}</span>
        </span>
      )}
      <span style={{ flex: 1 }} />
      {isNarrow ? null : tallyLine}
      <span style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, height: 18, alignSelf: 'flex-start', marginTop: -1 }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 1,
          opacity: live || open ? 1 : 0, pointerEvents: live || open ? 'auto' : 'none',
          transition: 'opacity var(--dur-fade) var(--ease-soft)',
        }}>
          <IconButton label={isFolded ? 'maximize' : 'minimize'} glyph={isFolded ? <RestoreMark /> : '–'} onClick={fold} reachable={live || open} />
          {onClose ? <IconButton label="ungroup nodes" glyph={'✕'} size={10} onClick={askUngroup} reachable={live || open} /> : null}
        </span>
      </span>
    </div>
  )

  const menuList = (
    <div role="listbox" ref={menuRef} style={{
      /* the menu is exactly as wide as the picker it hangs off. In-card it is
         absolutely positioned against the picker row; portaled it is fixed at the
         picker's own rect, above every card (zIndex 60), flipping up when the
         viewport runs out below. */
      ...(portaled && anchor ? {
        position: 'fixed' as const, left: anchor.left, width: anchor.width,
        top: anchor.up ? undefined : anchor.top, bottom: anchor.up ? anchor.bottom : undefined,
        zIndex: 60,
      } : {
        position: 'absolute' as const, top: 'calc(100% + 3px)', left: 0, right: 0, zIndex: 30,
      }),
      maxHeight: menuMaxHeight, overflowY: 'auto', overflowX: 'hidden',
      /* the width is the picker's own, so the padding and border have to come out of
         it rather than sit outside it — in the card `left:0; right:0` resolved against
         the containing block and box-sizing never came into it */
      boxSizing: 'border-box',
      padding: 'var(--space-1)', borderRadius: 'var(--radius-md)',
      background: 'var(--surface-raised)', border: '1px solid var(--border-rule)', boxShadow: 'var(--lift-2)',
    }}>
      {versions.map((v) => (
        <VersionRow key={v.id} version={v} on={v.id === active.id}
          onPick={() => { setOpen(false); if (onSelect) onSelect(v.id) }}
          confirming={confirming === v.id}
          onCancel={() => setConfirming(null)}
          onDelete={onDeleteVersion && versions.length > 1 ? () => {
            if (confirmDelete && confirming !== v.id) { setConfirming(v.id); return }
            setConfirming(null)
            onDeleteVersion(v.id)
          } : undefined} />
      ))}
      <div style={{ height: 1, background: 'var(--border-hair)', margin: '4px 6px' }} />
      <AddRow label={addLabel} onClick={() => { setOpen(false); if (onAddVersion) onAddVersion(); setEditing('version') }} />
    </div>
  )

  const picker = (
    <div style={{ position: 'relative' }}>
      <div
        ref={pickerRef}
        role="button" tabIndex={0}
        onClick={() => { if (!editing) setOpen((o) => !o) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o) } }}
        onMouseEnter={() => setHot('picker')} onMouseLeave={() => setHot(null)}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-15)', minHeight: 'var(--hit-min)',
          padding: '5px 6px 5px 7px', borderRadius: 'var(--radius-sm)', boxSizing: 'border-box',
          border: '1px solid ' + (hot === 'picker' && !editing ? 'var(--border-rule)' : 'transparent'),
          background: hot === 'picker' && !editing ? 'var(--surface-sunken-2)' : 'transparent',
          cursor: editing ? 'default' : 'pointer', transition: 'var(--transition-wash)',
        }}>
        <span style={{ width: 12, display: 'grid', placeItems: 'center', flexShrink: 0, height: 18, color: 'var(--accent-primary-ink)' }}>
          <span style={checkStyle()} />
        </span>
        {active.label ? (
          <span style={{ flexShrink: 0, lineHeight: '18px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', fontVariantNumeric: 'var(--tnum)', color: 'var(--accent-primary-ink)', fontWeight: 'var(--fw-medium)' }}>{active.label}</span>
        ) : null}
        {editing === 'version' ? (
          <NameField value={active.name} weight="var(--fw-semibold)"
            onCommit={(v) => { setEditing(null); if (v && v !== active.name && onRename) onRename(active.id, v) }}
            onCancel={() => setEditing(null)} />
        ) : (
          <span style={{ flex: 1, minWidth: 0, display: 'block', cursor: 'inherit' }}>
            <span title={active.name} onClick={(e) => { stop(e); setOpen(false); setEditing('version') }}
              style={{
                width: 'fit-content',
                maxWidth: '100%', display: '-webkit-box', WebkitBoxOrient: 'vertical',
                WebkitLineClamp: 2, overflow: 'hidden', whiteSpace: 'normal',
                overflowWrap: 'anywhere', lineHeight: 'var(--lh-snug)',
                fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-body)',
                fontWeight: 'var(--fw-semibold)', color: 'var(--accent-primary-ink)', cursor: 'text',
              }}>{active.name}</span>
          </span>
        )}
        <span style={{ width: 16, height: 16, flexShrink: 0, display: 'grid', placeItems: 'center', marginTop: 1, color: open ? 'var(--text-2)' : 'var(--text-3)', transition: 'color var(--dur-hover) var(--ease-soft)' }}>
          <span style={caretStyle(open)} />
        </span>
      </div>
      {open ? (portalTarget ? createPortal(menuList, portalTarget) : menuList) : null}
    </div>
  )

  return (
    <div ref={shell} style={{
      position: 'relative',
      width: curW || undefined,
      maxWidth: curW ? undefined : maxWidth,
      minWidth: isFolded ? foldedMinWidth : undefined,
      paddingRight: isFolded ? 6 : undefined,
      paddingBottom: isFolded ? 7 : undefined,
      transform: at ? 'translate(' + at.x + 'px, ' + at.y + 'px)' : undefined,
      zIndex: carrying ? 40 : undefined,
    }}>
      {isFolded ? (
        <div aria-hidden="true" style={{ position: 'absolute', inset: '7px 0 0 7px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-sunken-2)', zIndex: 0 }} />
      ) : null}
      <div data-grab="" onPointerDown={startMove} style={{
        position: 'relative', zIndex: 1, borderRadius: 'var(--radius-lg)', boxSizing: 'border-box',
        padding: isFolded ? '8px 9px 9px' : 'var(--space-2) var(--space-2) var(--space-3)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
        background: isFolded ? 'var(--surface-raised)' : 'var(--surface-sunken)',
        border: '1px solid ' + (isFolded ? 'var(--border-rule)' : 'transparent'),
        boxShadow: carrying ? 'var(--lift-drag)' : isFolded ? 'var(--lift-2)' : 'var(--sink-1)',
        cursor: movable ? 'move' : 'inherit',
        userSelect: 'none', WebkitUserSelect: 'none',
        transition: carrying ? 'none' : 'var(--transition-wash)',
      }}>
        {refusal ? (
          <div role="status" style={{
            position: 'absolute', top: 28, right: 8, zIndex: 45, maxWidth: 216,
            padding: '8px 11px', borderRadius: 'var(--radius-md)',
            background: 'var(--surface-raised)', border: '1px solid var(--border-rule)',
            boxShadow: 'var(--lift-2)', fontFamily: 'var(--font-ui)',
            fontSize: 'var(--fs-caption)', lineHeight: 'var(--lh-snug)', color: 'var(--text-2)',
          }}>{refusal}</div>
        ) : null}
        {resizable ? edge('right') : null}
        {isFolded || !resizable ? null : edge('bottom')}
        {isFolded || !resizable ? null : edge('corner')}
        <div data-grab="" style={{ padding: '0 2px 0 7px' }}>{headRow}</div>
        {isNarrow ? <div data-grab="" style={{ padding: '0 2px 0 7px' }}>{tallyLine}</div> : null}
        {isFolded ? null : (
          <DescLine text={description} placeholder={descPlaceholder}
            onCommit={onDescribe ? (v) => onDescribe(v) : undefined} />
        )}
        {isFolded ? null : picker}
        {isFolded ? null : (
          <div ref={body} data-grab="" style={{
            marginLeft: 13, paddingLeft: 10, borderLeft: '1.5px solid var(--bark-300)',
            display: 'flex', flexDirection: 'column',
            ...(curH ? { height: curH, minHeight: 0 } : { maxHeight: bodyMaxHeight }),
            overflowY: 'auto', overflowX: 'hidden',
          }}>
            {kids.length === 0 ? (
              <div data-grab="" style={{
                flex: curH ? 1 : '0 0 auto', minHeight: 0,
                marginTop: 'var(--space-15)', marginRight: 'var(--space-1)',
                display: 'grid', placeItems: 'center',
                padding: '11px 12px', borderRadius: 'var(--radius-md)',
                border: '1.5px dashed var(--border-dashed)', background: 'transparent',
                fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)',
                lineHeight: 'var(--lh-snug)', color: 'var(--text-3)', textAlign: 'center',
              }}>{emptyLabel}</div>
            ) : (
              <div data-grab="" style={{ paddingTop: 'var(--space-15)', paddingRight: 'var(--space-1)' }}>
                <NodeChain number={numberSteps && !!index} prefix={index} onReorder={onReorderNodes}>
                  {kids}
                </NodeChain>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
