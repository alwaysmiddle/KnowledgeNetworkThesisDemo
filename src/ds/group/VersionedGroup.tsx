import React, { useState, useRef, useEffect, useContext, createContext } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { caretStyle } from '../nav/TreeRow'
import { bulletStyle } from '../sidebar/InstrumentRow'
import { NodeChain } from '../graph/NodeChain'

/* HOW DEEP AM I? Counted, not passed: a group cannot be told its depth by a caller that
   does not know how it is being composed, and every level has to step against its parent
   or nesting has no visible edge at all. Open, a group is a well — --surface-sunken with
   --sink-1 and no border — and a well inside a well of the same tint reads as one well
   with loose furniture in it, which is exactly how the three-deep specimen failed. So the
   tint alternates by depth: --surface-sunken at even levels, --surface-sunken-2 at odd.
   Still depth rather than hue, still no border and never a lift over a sink; what changes
   is that two consecutive wells are no longer the same colour. */
const Depth = createContext(0)

/** THE NUMBER IS LOCAL TO ITS OWN WELL, not a path from the root. "2.2.2.1." is four
 *  numbers to read before the name, it grows with every level, and it repeats what the
 *  nesting already shows — the reader can see which well they are in. So a group displays
 *  its own ordinal and numbers its children from that: "2." holding "2.1", "2.2", at
 *  whatever depth it sits. `numberScope="path"` keeps the full dotted path for a surface
 *  that genuinely needs a citable address. */
function localIndex(index?: string): string | undefined {
  const raw = String(index == null ? '' : index).trim()
  if (!raw) return index
  const dotted = raw.endsWith('.')
  const parts = raw.replace(/\.$/, '').split('.')
  const last = parts[parts.length - 1]
  return dotted ? last + '.' : last
}

/** a NOTE tells you something and dismisses itself; a QUESTION has answers and does not */
interface Refusal { confirm?: boolean; text: string }

/** A nested subgroup that holds several versions of itself, exactly one of which
 *  is on screen. Port of DS components/group/VersionedGroup.jsx as of 2026-08-16
 *  — the revision that added `bodySlot` (chrome-only hosting for a board that
 *  floats its own nodes), the published GroupGeometry, and `selected`.
 *  LOCAL, on top of the DS: the `optional` prop, and the measured corrections in
 *  the geometry, each marked and reported on drift-log #74.
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

/** where the body slot is, relative to the group's shell — see `bodySlot` */
export interface BodySlot { left: number; top: number; width: number; height: number }

export interface VersionedGroupProps {
  /** the group's name — rank 4, editable on click. Wraps to two lines open, three
   *  folded. The number is NOT part of it */
  title: string
  /** the group's position among its siblings ("2."). Derived, mono, never editable.
   *  The children's own numbers come from it: 2. contains 2.1, 2.2, 2.3 */
  index?: string
  /** pass false to stop handing step numbers down to the children */
  numberSteps?: boolean
  /** 'local' (default) — a group shows its own ordinal and numbers its children from it,
   *  at whatever depth it sits, because the nesting already says which well you are in.
   *  'path' restores the full dotted address for a surface that needs a citable one */
  numberScope?: 'local' | 'path'
  /** ★ LOCAL: this well's nesting depth, which picks its tint — `--surface-sunken`
   *  at even levels, `--surface-sunken-2` at odd. The DS counts this through a React
   *  context and deliberately offers no prop, because "a group cannot be told its
   *  depth by a caller that does not know how it is being composed". True, and it
   *  inverts in `bodySlot` mode: a board that floats its cards as siblings (the case
   *  the DS built `bodySlot` FOR) is not a React ancestor of them, so the context
   *  cannot reach them and every card reads depth 0 — which is the one-tint failure
   *  the alternation exists to prevent. Such a board is also the only thing that DOES
   *  know the depth. Omit it and the context still wins, so ordinary nesting is
   *  untouched. Drift-log #74. */
  depth?: number
  /** the body is a `NodeChain`: pass this and the caller owns the order of the
   *  version's nodes; omit it and the chain keeps its own */
  onReorderNodes?: (from: number, to: number) => void
  /** how wide the group may grow. Default 300 */
  maxWidth?: number | string
  /** how tall the contents may grow before they scroll. Default 260.
   *  NB (drift-log #74, F2): `openHeight()` does not model this cap, so a `bodySlot`
   *  host that reserves from it must clear the cap itself or its floated steps hang
   *  out of the card's bottom while the body grows a scrollbar over nothing */
  bodyMaxHeight?: number | string
  /** how tall the version menu may grow before it scrolls. Default 240 */
  menuMaxHeight?: number | string
  /** floor width while folded, so the title cannot be squeezed to one word per
   *  line. Default 190 — below that the head's index and control cluster leave the
   *  title too little room to wrap */
  foldedMinWidth?: number | string
  /** drag the right edge, bottom edge or corner to resize. Default true; folded
   *  groups are not resizable */
  resizable?: boolean
  /** drag bounds: width floor 200, width ceiling 680, body-height floor 72 */
  minWidth?: number
  resizeMaxWidth?: number
  minBodyHeight?: number
  /** drag the group's own background to move it. Default true. The component
   *  applies a transform; pass `offset` to own the position yourself, or
   *  `movable={false}` if the container would rather run the drag itself */
  movable?: boolean
  /** fired on pointer-up with the offset the group was carried to */
  onMove?: (offset: { x: number; y: number }) => void
  /** fired on pointer-up with the size the user settled on, and on a double-click
   *  reset with `null` on the axis that went back to automatic */
  onResize?: (size: { width: number | null; height: number | null }) => void
  /** CONTROLLED SIZE, read like `folded`: omit and the group keeps whatever the
   *  user dragged it to; pass these and the caller's numbers win — which is what a
   *  canvas needs, since a size held in this component's own state cannot be saved
   *  across a reload, undone, or read by anything that aligns or packs cards. The
   *  drag itself always runs on own state (routing every pointermove out to a caller
   *  and back is what makes a controlled drag lag) and `onResize` reports on
   *  pointer-up; at rest the prop is authoritative, so a caller that ignores the
   *  report gets the snap-back a controlled input gives. `null` on an axis hands it
   *  back to automatic, the same as double-clicking that edge */
  width?: number | null
  bodyHeight?: number | null
  /** CONTROLLED POSITION, pairing with `onMove` on the same terms as `width` */
  offset?: { x: number; y: number } | null
  /** the tally drops to its own line below ~250px. Left undefined the group
   *  measures itself; pass this and the ResizeObserver is never installed. A caller
   *  that computes its own layout already knows the width, and one that must predict
   *  this head's height before rendering it cannot also wait on the head to measure
   *  itself */
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
  /** the group's description — one editable line under the title, true of every
   *  version. Optional; omit `onDescribe` to make it read-only, and both to drop
   *  the line entirely */
  description?: string
  /** what an empty version says. A new version starts with no nodes, so this is
   *  the common case, not an error state — a dashed placeholder awaiting a node */
  emptyLabel?: string
  /** the invitation shown while `description` is empty — italic, --text-3 */
  descPlaceholder?: string
  versions: GroupVersion[]
  /** the version on screen; falls back to the first */
  activeId?: string
  /** how many items are inside — defaults to the child count, override when the
   *  body renders something other than one element per item. REQUIRED in
   *  `bodySlot` mode: there are no children left to count */
  count?: number
  /** the word beside the tally, plural. Singular is derived. Default "nodes" */
  countLabel?: string
  /** controlled fold state; leave undefined and the fold button owns it. One
   *  component instance persists across fold and open (same key), so a host that
   *  controls one branch must control BOTH or the DS's own minimize flips state
   *  the host never hears about */
  folded?: boolean
  defaultFolded?: boolean
  /** PICKED. A `--stroke-ring` (2px) `--state-selected` outline at 2px offset around
   *  the CARD's own edge — head and body, open or folded: the whole group is what got
   *  picked. An outline rather than a border because it takes no layout, so picking a
   *  card cannot move it or its neighbours. A child that is itself selected wears its
   *  own outline inside this one. Drawn at VersionedGroup.tsx:1216.
   *
   *  This prop is CONTROLLED-ONLY here. The DS also ships `defaultSelected` and
   *  `onSelectedChange` so a group can keep its own state; neither is ported, because
   *  the road holds the selection for every card on the board and a second source of
   *  truth would fight it. Port them if a surface ever needs a self-selecting group.
   *
   *  NB this doc said "an outline round the HEAD only … at 1px" until 2026-08-17, which
   *  was the reading BEFORE the DS moved it to the whole card on 2026-08-16 — the code
   *  was re-ported that day and the comment above it was not. Our own contract lag, in
   *  the same file whose missing prose this pass was written to fill in. */
  selected?: boolean
  /** the HOST's "conditional" cue — LOCAL ADDITION (not in the DS source; drift-log
   *  #74): a dashed ring hugging the face in the host's own dashed recipe, in both
   *  states — a conditional container is conditional as a whole. Folded it yields
   *  to `selected`, which wants the same layer and is the more urgent signal */
  optional?: boolean
  /** CHROME-ONLY MODE: draw the card but not the body — the head, description,
   *  picker, menu, well, ancestry rail and empty-version zone are the group's; the
   *  body area is left EMPTY for the caller to position its own nodes into, and
   *  `onBodySlot` reports where it is.
   *
   *  For a board that CANNOT hand its nodes over as `children` — one that floats
   *  them as its own siblings so a click inside one never bubbles into a parent
   *  group, and lays every box out in one arithmetic pass. `AuthorRoad` is that
   *  board. Without this the only way for it to own the body was to redraw the head
   *  as well, which is what its ~230 hand-written lines were.
   *
   *  `count` becomes REQUIRED — there are no children left to count. Default false */
  bodySlot?: boolean
  /** how much room to leave for the caller's nodes, in px. Ignored once the user
   *  drags the bottom edge (`bodyHeight` wins, as it does anyway) */
  slotHeight?: number
  /** the slot's box, relative to the group's own box: `{ left, top, width, height }`.
   *  Called on mount, on the next frame, and on any size change of slot or shell.
   *  MEMOIZE IT — an inline arrow re-subscribes the observers every render.
   *
   *  GIVE WHAT YOU RENDER INTO THE SLOT A `z-index` ABOVE 1. The group's shell is
   *  `z-index: 1` — it has to be, so the folded peek plate can sit behind it — so a
   *  sibling at `auto` paints behind the card. This bites in a way that looks like
   *  anything but z-order: a `NodeChain` in the slot kept its chips (the chain gives
   *  its slots `z-index: 1`) and lost its ARROWS, so the body read as loose nodes */
  onBodySlot?: (slot: BodySlot) => void
  /** the last row of the menu; lower-case verb phrase, set in italic */
  addLabel?: string
  /** open the version menu on mount — for specimens and screenshots only */
  defaultOpen?: boolean
  onRetitle?: (title: string) => void
  onDescribe?: (description: string) => void
  onSelect?: (id: string) => void
  /** fired on Enter or blur after a double-click rename of the live version */
  onRename?: (id: string, name: string) => void
  /** create a version and select it — the picker then opens its rename field */
  onAddVersion?: () => void
  /** delete a version. The row's ✕ appears only while the group has more than one,
   *  and only when this is passed. If the deleted version was live, select another */
  onDeleteVersion?: (id: string) => void
  /** overrides the ungroup confirmation's wording. It is a QUESTION — whatever you
   *  pass has to read sensibly above a "keep" and an "ungroup" button */
  ungroupConfirmLabel?: string
  /** @deprecated the old name, from when the act was REFUSED while a group held more
   *  than one version. Still honoured, so no call site breaks — but text written for
   *  that refusal now sits above a button that ungroups, which is how it shipped here
   *  (DS 2026-08-17, found by looking at our screen). Re-word as a question and move */
  ungroupBlockedLabel?: string
  /** ask before deleting a version, in the row itself. Default true */
  confirmDelete?: boolean
  /** fired with the next fold state; the component folds itself regardless */
  onToggleFold?: (folded: boolean) => void
  /** ungroup — called with the version to spill and how many nodes it holds; replace
   *  the group with those nodes, in order, in the slot it occupied. With more than one
   *  version the component ASKS first, naming the cost in figures, and calls this only
   *  if the user answers "ungroup". (Until 2026-08-17 the contract still said the act
   *  was refused and this handler not called — our own port reported it.) */
  onClose?: (spill: { versionId: string; count: number }) => void
  /** the group's contents — one element per item; arrows are drawn between them.
   *  Ignored as a chain in `bodySlot` mode: a board that positions nodes itself
   *  owns their order and their arrows too */
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

/** The tick, drawn rather than set — two strokes of a rotated corner. */
function checkStyle(): CSSProperties {
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

/* ═══ PUBLISHED GEOMETRY ════════════════════════════════════════════════════
 *  How tall is this card, before it renders?
 *
 *  A board that lays its cards out arithmetically — AuthorRoad does, and must:
 *  it places every box in one pass before React commits anything — cannot ask a
 *  rendered group how big it is. So it either guesses or it is told. It guessed:
 *  `CHAR_W = 8`, `HEAD_LINE_H = 17.55`, `FOLD_CHROME = 44.85`, the last two
 *  read off SCREENSHOTS of this component. Numbers obtained that way are correct
 *  exactly once. Every padding change here silently misplaced their cards, and
 *  nothing on either side reported it.
 *
 *  These functions are the same numbers, exported from the file that draws them.
 *  The paddings below are not a copy of the component's — they are read by the
 *  component too (GROUP_METRICS), so a change lands in the drawing and in the
 *  prediction together or not at all.
 *
 *  Text is MEASURED, not estimated: an offscreen canvas at the same font
 *  shorthand the label uses. It needs no layout and no paint, so it is legal in
 *  the same pass that computes positions — which is what makes a monospace
 *  `CHAR_W` for a proportional display face unnecessary rather than merely
 *  wrong. Without a document (SSR, tests) it falls back to a 0.55em factor and
 *  says so via `measured: false`.
 *
 *  LOCAL CORRECTIONS (marked ★ below, reported on drift-log #74): the DS's
 *  functions as shipped on 2026-08-16 predict a few px short of what the DS
 *  component itself renders — the face's two 1px borders are not counted; the
 *  DescLine block is a 13px strut's line box (19.55 at one line, not 2 + 16.2);
 *  the picker floors at 30 (padding + borders + its 18px cells), not 28; and the
 *  narrow tally row is 18.84, not 14.85. Measured by tools/studio-spike/shot-foldab.mjs
 *  ("headRows() calibration" / bodySlot cases), which also checks these
 *  functions against the rendered card so a drift shows up as a number. */

export const GROUP_METRICS = {
  padX: 8, padTop: 8, padBottom: 12, rowGap: 4,       /* --space-2 / --space-3 / --space-1 */
  headPadLeft: 7, headPadRight: 2, headMinH: 22, titleMinW: 96,
  bodyLine: 17.55,                                     /* --fs-body 13 × --lh-snug 1.35 */
  capLine: 16.2,                                       /* --fs-caption 12 × 1.35 */
  microLine: 14.85,                                    /* --fs-micro 11 × 1.35 */
  titleClampOpen: 2, titleClampFolded: 3, versionClamp: 2,
  descPadY: 1, descPadX: 7,
  pickerMinH: 28, pickerPadY: 10, pickerPadX: 13,       /* --hit-min; 5+5; 7+6 */
  pickerCheck: 12, pickerCaret: 16, pickerGap: 6,
  narrowAt: 250, ctlCluster: 37,                       /* two 18px buttons + 1px */
  foldPadTop: 8, foldPadX: 8, foldPadBottom: 9, foldPeekX: 6, foldPeekY: 7,
  railIndent: 13, railPadLeft: 10, bodyPadTop: 6, bodyPadRight: 8,
  /* ★ LOCAL: what the DS's own numbers leave out, measured */
  faceBorder: 1,          /* the face's 1px border, top and bottom, open or folded */
  descStrut: 17.55,       /* the DescLine block's line box: the 13px strut wins over one 12px line */
  descLastDescent: 0.36,  /* wrapped, the last caption line sits on the block's baseline: 4.5 vs 4.14 */
  pickerCell: 18,         /* the picker's check cell and code are 18 tall — taller than one 17.55 line */
  tallyRow: 18.84,        /* the narrow tally's own row, a strut'd block round an 11px inline-block */
  emptyZone: 58,          /* the empty-version zone in a bodySlot: minHeight 34 + 11px padding twice + 1.5px borders, content-box */
  railStroke: 1.5,        /* the ancestry rail's border-left — between railIndent and railPadLeft, so a host can find the slot sideways */
}

/** what the geometry needs to know about a card — the same strings the component
 *  is given, plus the width it will be laid out at */
export interface GroupSpec {
  width?: number
  title?: string
  index?: string
  description?: string
  descPlaceholder?: string
  versionName?: string
  versionLabel?: string
  count?: number
  countLabel?: string
  narrow?: boolean
  /** open: the height the caller wants the body slot to be (== `slotHeight`) */
  bodyHeight?: number
  foldedMinWidth?: number
}

type FontKind = 'ui' | 'display' | 'mono'
const FONTS: Partial<Record<FontKind, string>> = {}
function fontOf(kind: FontKind): string {
  const cached = FONTS[kind]
  if (cached) return cached
  let fam = kind === 'mono' ? 'ui-monospace, monospace'
    : kind === 'display' ? 'Georgia, serif' : 'system-ui, sans-serif'
  if (typeof document !== 'undefined' && document.documentElement) {
    const v = getComputedStyle(document.documentElement)
      .getPropertyValue('--font-' + (kind === 'display' ? 'display' : kind === 'mono' ? 'mono' : 'ui')).trim()
    if (v) fam = v
  }
  FONTS[kind] = fam
  return fam
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

/** lines a label takes at a given width, honouring `overflow-wrap: anywhere` —
 *  a single unbreakable word longer than the column wraps INSIDE itself rather
 *  than overhanging, which is what the drawn label does. */
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
      const extra = Math.ceil(solo / width) - 1
      lines += extra
      cur = ''
    }
  }
  return clamp ? Math.min(lines, clamp) : lines
}

function titleColumn(width: number, spec: GroupSpec, folded: boolean): { col: number; narrow: boolean } {
  const M = GROUP_METRICS
  const shellPad = folded ? M.foldPadX * 2 : M.padX * 2
  let col = width - shellPad - M.headPadLeft - M.headPadRight
  if (spec.index) col -= measure(spec.index, 500, 12, 'mono') + M.pickerGap - 2
  col -= M.ctlCluster + M.pickerGap
  const narrow = spec.narrow === undefined ? width < M.narrowAt : spec.narrow
  if (!narrow && !folded) {
    const t = (spec.count === undefined ? 0 : spec.count) + ' ' + (spec.countLabel || 'nodes')
    col -= measure(t, 400, 11, 'ui') + M.pickerGap
  }
  return { col: Math.max(M.titleMinW, col), narrow }
}

export interface HeadHeight { height: number; narrow: boolean; titleLines: number; versionLines: number; measured: boolean }

/** The head's height: everything above the body — the face's top border, the
 *  title row, the narrow tally line if the row is too tight to hold it, the
 *  description, the picker. Feed it the width the card will be laid out at. */
export function headHeight(spec?: GroupSpec): HeadHeight {
  const s = spec || {}
  const M = GROUP_METRICS
  const width = s.width || 300
  const c = titleColumn(width, s, false)
  const titleLines = Math.max(1, linesOf(s.title || 'untitled', c.col, 700, 13, 'display', M.titleClampOpen))
  /* ★ faceBorder: the head is measured from the card's outer edge, border included */
  let h = M.faceBorder + M.padTop + Math.max(M.headMinH, titleLines * M.bodyLine)
  if (c.narrow) h += M.rowGap + M.tallyRow /* ★ tallyRow, not microLine */
  const descText = s.description || s.descPlaceholder || ''
  if (descText) {
    const dcol = width - M.padX * 2 - M.descPadX * 2
    const dl = linesOf(descText, dcol, 400, 12, 'ui', 0)
    /* ★ the block's line box: one line is the 13px strut; wrapped, the lines win
       and the last one sits on the block's baseline (+0.36) */
    h += M.rowGap + M.descPadY * 2 + Math.max(M.descStrut, dl * M.capLine + M.descLastDescent)
  }
  let pcol = width - M.padX * 2 - M.pickerPadX - M.pickerCheck - M.pickerCaret - M.pickerGap * 3
  if (s.versionLabel) pcol -= measure(s.versionLabel, 500, 11, 'mono')
  const vLines = Math.max(1, linesOf(s.versionName || 'untitled', pcol, 600, 13, 'ui', M.versionClamp))
  /* ★ padding + its two 1px borders round the taller of the 18px cells and the lines: 30 at one line */
  h += M.rowGap + M.pickerPadY + 2 + Math.max(M.pickerCell, vLines * M.bodyLine)
  return { height: Math.round(h * 100) / 100, narrow: c.narrow, titleLines, versionLines: vLines, measured: !!ctx2d }
}

/** The whole open card, given the height the caller wants the body slot to be.
 *  `bodyHeight` is the same number passed to the component as `bodyHeight` /
 *  `slotHeight`, so the box the board reserves and the box the group draws are
 *  one number with one owner. `bodyTop` is where the slot's content begins,
 *  from the card's top edge — the slot's own --space-15 padding included. */
export function openHeight(spec?: GroupSpec): HeadHeight & { bodyTop: number } {
  const head = headHeight(spec)
  const s = spec || {}
  const M = GROUP_METRICS
  const asked = s.bodyHeight === undefined ? 0 : s.bodyHeight
  /* ★ an EMPTY version (count 0) draws the dashed zone in the slot, and the zone
     is taller than the slot it fills — its padding and borders sit outside the
     34px minimum under the DS's content-box. The board asks for slotHeight and
     gets the zone; the prediction has to say so. */
  const body = s.count === 0 ? Math.max(asked, M.emptyZone) : asked
  /* bodyPadTop: the slot's own --space-15 gap between the picker and the first
     node. It is part of the card whether the slot is filled or empty, so it is
     part of the prediction — and it is why a caller passing bodyHeight={0} still
     gets a taller card than the head alone. */
  const pad = body > 0 ? M.bodyPadTop : 0
  /* ★ rowGap: the face is a flex column with --space-1 between its rows, and the
     body is one of those rows — the gap between the picker and the slot */
  const top = head.height + M.rowGap + pad
  return {
    ...head,
    bodyTop: Math.round(top * 100) / 100,
    /* ★ faceBorder: the bottom border closes the card */
    height: Math.round((top + body + M.padBottom + M.faceBorder) * 100) / 100,
  }
}

/** The folded card, peek plate included — the number their FOLD_CHROME and
 *  FOLD_BASELINE_SLACK were approximating. Height covers the stacked tint the
 *  shell reserves below and right of itself, so a chain's arrow lands clear of it. */
export function foldedSize(spec?: GroupSpec): { width: number; height: number; titleLines: number; narrow: boolean; measured: boolean } {
  const s = spec || {}
  const M = GROUP_METRICS
  const width = Math.max(s.width || 190, s.foldedMinWidth || 190)
  const c = titleColumn(width, s, true)
  const titleLines = Math.max(1, linesOf(s.title || 'untitled', c.col, 700, 13, 'display', M.titleClampFolded))
  const tally = M.rowGap + M.tallyRow /* ★ tallyRow, not microLine */
  const h = M.faceBorder * 2 /* ★ */ + M.foldPadTop + Math.max(M.headMinH, titleLines * M.bodyLine)
    + (c.narrow ? tally : 0) + M.foldPadBottom + M.foldPeekY
  return { width: width + M.foldPeekX, height: Math.round(h * 100) / 100, titleLines, narrow: c.narrow, measured: !!ctx2d }
}

/** Reachable from the DS window namespace, where a bare lowercase export is not. */
export const GroupGeometry = { GROUP_METRICS, headHeight, openHeight, foldedSize }

export function VersionedGroup({
  title = 'untitled', index, description, versions = [], activeId,
  folded, defaultFolded = false, selected = false, optional = false, count, addLabel = 'add new version', defaultOpen = false,
  descPlaceholder = 'enter description',
  emptyLabel = 'no nodes in this version — drag one in', numberSteps = true, countLabel = 'nodes',
  onReorderNodes,
  maxWidth = 300, bodyMaxHeight = 260, menuMaxHeight = 240, foldedMinWidth = 190,
  resizable = true, minWidth = 200, resizeMaxWidth = 680, minBodyHeight = 72, onResize,
  width, bodyHeight, offset, narrow, menuPortal,
  movable = true, onMove, onDeleteVersion, ungroupConfirmLabel, ungroupBlockedLabel, confirmDelete = true,
  onRetitle, onDescribe, onSelect, onRename, onAddVersion, onToggleFold, onClose, children,
  bodySlot = false, slotHeight, onBodySlot, numberScope = 'local', depth: depthProp,
}: VersionedGroupProps) {
  /* the context is still the default, so a group nested the ordinary way counts
     itself exactly as the DS intends; the prop only answers for a caller that has
     broken the tree on purpose and therefore has to supply what the tree cannot */
  const contextDepth = useContext(Depth)
  const depth = depthProp === undefined ? contextDepth : depthProp
  const shownIndex = numberScope === 'path' ? index : localIndex(index)
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
  const slot = useRef<HTMLDivElement | null>(null)
  const [anchor, setAnchor] = useState<{ left: number; width: number; up: boolean; top?: number; bottom?: number } | null>(null)
  const [live, setLive] = useState(false)
  const [ownNarrow, setOwnNarrow] = useState(false)
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const [refusalAt, setRefusalAt] = useState<{ top: number; right: number } | null>(null)
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

  /* CHROME-ONLY MODE: the caller draws the body, we draw everything else.
     A board that floats its step nodes as its OWN siblings — so that a click
     inside one can never bubble into a parent group, and so one arithmetic pass
     can place them all — cannot hand those nodes to us as `children`. That was
     the wall: this component drew a body or nothing, so a board that needed to
     own the body had to redraw the head, the picker, the menu and the well by
     hand, and ~230 lines of AuthorRoad are exactly that.
     `bodySlot` leaves the body area empty and reports where it is, relative to
     the group's own box, so the caller can position nodes into it. What it does
     NOT give up is the rail and the empty-version zone: those decorate the body
     AREA rather than the nodes, so they stay ours and come back on a road that
     has never had them. The tally must come from `count` in this mode — there
     are no children to count. `onBodySlot` is called on mount and on any size
     change; memoize it, or it re-subscribes every render. */
  useEffect(() => {
    if (!bodySlot || !onBodySlot || isFolded) return
    const el = slot.current
    const sh = shell.current
    if (!el || !sh) return
    const report = () => {
      const a = el.getBoundingClientRect()
      const b = sh.getBoundingClientRect()
      onBodySlot({
        left: Math.round(a.left - b.left), top: Math.round(a.top - b.top),
        width: Math.round(a.width), height: Math.round(a.height),
      })
    }
    report()
    const raf = requestAnimationFrame(report)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null
    if (ro) { ro.observe(el); ro.observe(sh) }
    return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect() }
  }, [bodySlot, onBodySlot, isFolded, curW, curH, isNarrow, slotHeight])

  const fold = () => {
    setOpen(false)
    if (folded === undefined) setOwnFold((f) => !f)
    if (onToggleFold) onToggleFold(!isFolded)
  }

  /* UNGROUPING WITH SEVERAL VERSIONS IS CONFIRMED, NOT REFUSED — changed by the DS on
     2026-08-16, and the earlier reasoning is worth keeping because it was half right.
     Ungrouping spills ONE version's nodes into the parent, so the others go with the
     group; the old behaviour blocked the act outright on the grounds that a confirmation
     would be asking the user to approve losing work they cannot see. What that missed is
     that refusing does not save the work — it only makes the user delete the versions one
     at a time first, which is the same loss with more steps and no summary. A user who
     has decided a fork was a mistake is entitled to say so once. */
  const askUngroup = () => {
    if (versions.length > 1) {
      setRefusal({
        confirm: true,
        text: ungroupConfirmLabel || ungroupBlockedLabel || ('This node has ' + versions.length
          + ' versions currently. Confirm ungrouping of this node and deleting the unselected versions?'),
      })
      return
    }
    if (onClose) onClose({ versionId: active.id, count: kids.length })
  }

  /* a NOTE dismisses itself — it is telling you something. A QUESTION does not: a
     confirmation that vanishes on a timer or on the next click either answers itself or
     makes the user re-open it, and this one is destructive. Escape and "keep" close it. */
  useEffect(() => {
    if (!refusal) return
    if (refusal.confirm) {
      const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setRefusal(null) }
      document.addEventListener('keydown', key)
      return () => document.removeEventListener('keydown', key)
    }
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

  /* THE CONFIRMATION LEAVES THE CARD, for the reason the menu does — and it matters more
     here, because this one has buttons. The panel sits inside the card div, which is
     position:relative + z-index:1 for the folded peek, so its own z-index of 45 is scoped
     to that context. On a board the caller's slot content is a SIBLING at z-index 2 (it
     has to be, or a chain in the slot loses its arrows), so the whole card subtree loses
     to it: the panel's lower half — where the keep/ungroup pair sits — is painted over by
     the first nodes in the body, and the user can read the question and not be able to
     answer it. No z-index inside the card fixes that; the trap is the context. Same
     portalTarget the menu uses, so `menuPortal={null}` still opts out. */
  useEffect(() => {
    if (!refusal || !portalTarget) return
    const place = () => {
      const el = shell.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const next = { top: Math.round(r.top + 28), right: Math.round(window.innerWidth - r.right + 8) }
      setRefusalAt((prev) => (prev && prev.top === next.top && prev.right === next.right) ? prev : next)
    }
    place()
    const raf = requestAnimationFrame(place)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    if (ro && shell.current) ro.observe(shell.current)
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      cancelAnimationFrame(raf)
      if (ro) ro.disconnect()
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [refusal, portalTarget])

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
      {shownIndex ? (
        <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-caption)', fontVariantNumeric: 'var(--tnum)', color: 'var(--text-2)', fontWeight: 'var(--fw-medium)', marginRight: -2, lineHeight: 'var(--lh-snug)' }}>{shownIndex}</span>
      ) : null}
      {editing === 'title' ? (
        <NameField value={title} family="var(--font-display)" weight="var(--fw-bold)"
          onCommit={(v) => { setEditing(null); if (v && v !== title && onRetitle) onRetitle(v) }}
          onCancel={() => setEditing(null)} />
      ) : (
        <span data-grab="" style={{
          /* a floor, not a share: the head's fixed furniture is what shrinks when the
             group is narrow, never the name. The control cluster keeps its width even
             while receded, so the title never jumps — and never has controls land on
             its tail — when they appear */
          flex: '0 1 auto', minWidth: 96, display: 'block', cursor: 'inherit', marginRight: 2,
        }}>
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

  const portaledRefusal = !!(portalTarget && refusalAt)
  const refusalPanel = refusal ? (
    <div role={refusal.confirm ? 'dialog' : 'status'} style={{
      ...(portaledRefusal && refusalAt
        ? { position: 'fixed' as const, top: refusalAt.top, right: refusalAt.right, zIndex: 60 }
        : { position: 'absolute' as const, top: 28, right: 8, zIndex: 45 }),
      maxWidth: 232,
      padding: '9px 11px', borderRadius: 'var(--radius-md)',
      background: 'var(--surface-raised)', border: '1px solid var(--border-rule)',
      boxShadow: 'var(--lift-2)', fontFamily: 'var(--font-ui)',
      fontSize: 'var(--fs-caption)', lineHeight: 'var(--lh-snug)', color: 'var(--text-2)',
    }}>
      <div>{refusal.text}</div>
      {refusal.confirm ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-1)', marginTop: 'var(--space-15)' }}>
          <ConfirmButton label="keep" onClick={() => setRefusal(null)} />
          <ConfirmButton label="ungroup" danger onClick={() => {
            setRefusal(null)
            if (onClose) onClose({ versionId: active.id, count: kids.length })
          }} />
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <Depth.Provider value={depth + 1}>
    <div ref={shell} style={{
      position: 'relative',
      width: curW || undefined,
      maxWidth: curW ? undefined : maxWidth,
      minWidth: isFolded ? foldedMinWidth : undefined,
      /* THE PEEK'S STRIP IS RESERVED IN BOTH STATES, and that is what keeps the title's
         column the same width folded and open. Reserving it only when folded made the
         card 6px narrower folded — and the fold's padding was 1px wider a side on top —
         so a one-line name wrapped to two the moment you collapsed it, which reads as
         the fold rewriting the title. Open, the 6px is simply empty. The bottom strip
         stays folded-only: nothing sits below an open card for the peek to overlap, and
         height is not what a title wraps against. */
      paddingRight: 6,
      paddingBottom: isFolded ? 7 : undefined,
      transform: at ? 'translate(' + at.x + 'px, ' + at.y + 'px)' : undefined,
      zIndex: carrying ? 40 : undefined,
    }}>
      {isFolded ? (
        <div aria-hidden="true" style={{ position: 'absolute', inset: '7px 0 0 7px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-sunken-2)', zIndex: 0 }} />
      ) : null}
      <div data-grab="" onPointerDown={startMove} style={{
        position: 'relative', zIndex: 1, borderRadius: 'var(--radius-lg)', boxSizing: 'border-box',
        /* the horizontal padding is --space-2 in BOTH states, so the head row is the
           same width either way; only the vertical padding differs, which the title
           does not wrap against */
        padding: isFolded ? '8px var(--space-2) 9px' : 'var(--space-2) var(--space-2) var(--space-3)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
        background: isFolded ? 'var(--surface-raised)' : (depth % 2 ? 'var(--surface-sunken-2)' : 'var(--surface-sunken)'),
        border: '1px solid ' + (isFolded ? 'var(--border-rule)' : 'transparent'),
        boxShadow: carrying ? 'var(--lift-drag)' : isFolded ? 'var(--lift-2)' : 'var(--sink-1)',
        /* SELECTED: the outline is the CARD's own edge, open or folded — the whole group
           is what got picked, so the whole group is what is drawn round. It was briefly
           the head only, on the reasoning that a group's nodes are selectable in their
           own right and a ring round the well claims them; in use that reads as a stray
           box inside a card rather than as a card that is picked, and the board's own
           multi-select box already encloses whole cards. A child that is itself selected
           wears its own outline inside this one. 2px offset, the same gap NodeChip
           leaves, so a selected group and a selected chip read as the same act.
           LOCAL: `optional` is the host's dashed cue on the face in both states,
           yielding to selection — an OUTLINE either way, so it follows the radius and
           paints above the lift shadow without taking its slot */
        outline: selected ? 'var(--stroke-ring) solid var(--state-selected)'
          : optional ? '1.5px dashed var(--border-dashed)' : undefined,
        outlineOffset: selected || optional ? 2 : undefined,
        cursor: movable ? 'move' : 'inherit',
        userSelect: 'none', WebkitUserSelect: 'none',
        transition: carrying ? 'none' : 'var(--transition-wash)',
      }}>
        {refusal ? (portaledRefusal && portalTarget ? createPortal(refusalPanel, portalTarget) : refusalPanel) : null}
        {/* folded, only the WIDTH edge exists: a folded group has no body to make
            taller, and the height it does have is its own title wrapping. */}
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
            {bodySlot ? (
              /* the slot. Empty on purpose: the caller's nodes land here, and it
                 holds `slotHeight` of space for them. `children` still render if
                 any are passed, so a caller can mix — but they are NOT chained,
                 because a board that positions nodes itself owns their order and
                 their arrows too. */
              <div ref={slot} data-grab="" style={{
                position: 'relative', flex: curH ? 1 : '0 0 auto',
                minHeight: curH ? 0 : (slotHeight || 0),
                paddingTop: 'var(--space-15)', paddingRight: 'var(--space-1)',
              }}>
                {tally === 0 ? (
                  <div data-grab="" style={{
                    height: '100%', minHeight: 34, display: 'grid', placeItems: 'center',
                    padding: '11px 12px', borderRadius: 'var(--radius-md)',
                    border: '1.5px dashed var(--border-dashed)', background: 'transparent',
                    fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)',
                    lineHeight: 'var(--lh-snug)', color: 'var(--text-3)', textAlign: 'center',
                  }}>{emptyLabel}</div>
                ) : kids}
              </div>
            ) : kids.length === 0 ? (
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
                <NodeChain number={numberSteps} prefix={numberScope === 'path' ? shownIndex : ''} onReorder={onReorderNodes}>
                  {kids}
                </NodeChain>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </Depth.Provider>
  )
}
