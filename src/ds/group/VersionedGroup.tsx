import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useContext, createContext } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties } from 'react'
import { Caret } from '../nav/TreeRow'
import { Bullet } from '../sidebar/InstrumentRow'
import { NodeChain } from '../graph/NodeChain'
import { IconButton, RESIZE_TIP, useClipped, usePresence, useRecede, wrapTip } from '../chrome/IconButton'

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
 *  --lift-2, well tint stacked behind. No domain dot — contents can span domains.
 *
 *  WHAT THE HOST AROUND IT MUST KNOW (OB-047)
 *
 *  A DOUBLE-CLICK OVER THIS CARD IS THE CARD'S. TAKE YOURS IN THE CAPTURE PHASE. A host
 *  gesture bound the ordinary way — `onDoubleClick` on an ancestor, bubbling — never
 *  fires when the double-click lands on the title or description line, and fires
 *  everywhere else on the card: the worst shape a bug can have, since it reads as a dead
 *  spot rather than as a rule. React stops dispatching its synthetic `dblclick`
 *  somewhere inside this subtree; the native event still bubbles all the way (measured,
 *  not inferred — see the handler below). So a host that wants a double-click gesture
 *  over the card must bind it with `onDoubleClickCapture` (or a native listener with
 *  `{ capture: true }`), never the ordinary bubbling form — `AuthorRoad`'s folded-card
 *  reopen does exactly that. */

export interface GroupVersion {
  id: string
  /** the version's own name — authored text, verbatim. Wraps to two lines, and a name
   *  longer than that cap ends in "…" — same mechanism as `title`, cut against the
   *  column the picker row really leaves, never `headHeight()`'s published one (see
   *  `title`'s own doc for why the two columns differ) */
  name: string
  /** a short designation, e.g. "v2" — mono, tabular. Normally omitted */
  label?: string
}

/** where the body slot is, relative to the group's shell — see `bodySlot`. It is the
 *  slot's CONTENT area: `top` is where a node should begin and `height` is what can be
 *  filled, so it equals `openHeight(spec).bodyTop` and the prediction and the DOM place
 *  content in the same spot. */
export interface BodySlot {
  left: number
  top: number
  width: number
  height: number
  /** THE STACKING FLOOR, handed over rather than described. The card's shell is
   *  `position: relative; z-index: 1` so the folded peek plate can sit behind it, which
   *  means anything positioned into the slot at `auto` paints BEHIND the card. It does
   *  not present as a z-order problem: a `NodeChain` in the slot keeps its chips (the
   *  chain gives its own slots `z-index: 1`) and silently loses its ARROWS, so the body
   *  reads as loose nodes. Put this on the wrapper you position. */
  zIndex: number
  /** THE DEPTH A GROUP PLACED IN THIS SLOT SHOULD TAKE. The open well's tint steps by
   *  depth so two nested wells are never one colour, and the group counts depth through
   *  React context — which reaches a `children` group and never reaches one a board
   *  positions, since that card is this one's DOM SIBLING. Pass this straight back as
   *  `depth`. Skip it and the nested well paints the tint of the well it sits in: no
   *  error, no misplacement, just containment that has stopped being visible. */
  depth: number
  /** FALSE WHILE THE CARD IS FOLDED, and the box is zeroed with it. A folded card has no
   *  body, but the caller's content is the caller's own DOM and the group cannot hide it.
   *  Before this field the callback simply went quiet on fold, which leaves a caller
   *  holding the last box it was handed and drawing at it — a folded card with its nodes
   *  still stacked underneath.
   *
   *  NESTED CONTENT IS HIDDEN BY ITS ANCESTORS TOO: a group inside another group's slot
   *  goes on reporting `visible: true` when the card ABOVE it folds, because it is still
   *  open and nothing tells it. A caller drawing more than one level deep must AND its
   *  own box's `visible` with every ancestor slot's. Watch `visibility` in particular —
   *  it is inherited but re-declarable, so writing `visible` on the inner content
   *  overrides the `hidden` on the wrapper just hidden. */
  visible: boolean
}

/** The shell's own stacking level. It is `position: relative; z-index: 1` so the folded
 *  peek plate can sit behind it; `SHELL_Z + 1` is the floor handed to a slot's caller. */
const SHELL_Z = 1

export interface VersionedGroupProps {
  /** the group's name — rank 4, editable on click. Wraps to two lines open, three
   *  folded. The number is NOT part of it.
   *  A NAME LONGER THAN ITS CAP ENDS IN "…", cut in the STRING by `clampToLines`
   *  rather than by CSS — `-webkit-line-clamp` computes `flow-root` on this box and
   *  draws no ellipsis at all. THE CUT IS MADE AGAINST THE COLUMN THE TITLE ROW
   *  REALLY LEAVES, measured off the title box while the full string is on screen —
   *  never `titleColumn()`'s own column, which is computed for the head's HEIGHT and
   *  runs wider than the room the row actually hands over, so a name the arithmetic
   *  thinks fits in two lines can draw three and the cap then clips the third with no
   *  ellipsis at all. (Corrected on the DS's own side 2026-08-21: their contract used
   *  to describe this as "read at the shell's own measured width", which is the
   *  wording a faithful port would have implemented, sitting beside code that already
   *  measured the row instead — reported in receipts/b319861.md.) */
  title: string
  /** the invitation shown — an italic overlay, never real text — when `title` is
   *  empty. Default 'untitled'. Pass an empty `title` and this instead of seeding
   *  new data with literal placeholder text: a caller that bakes "name this stage"
   *  into `title` itself cannot tell an unnamed card from one somebody actually
   *  named that (OB-081). `GroupGeometry.headHeight()`/`foldedSize()` measure this
   *  in place of `title` when it is empty, so the predicted height matches. */
  titlePlaceholder?: string
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
  /** the invitation shown — an italic overlay, never real text — when the active
   *  version's `name` is empty. Default 'untitled', same terms as
   *  `titlePlaceholder`: pass an empty `name` on an unnamed version rather than
   *  seeding it with literal text, and this instead (OB-081). Also reaches the
   *  version-picker menu's own rows for a version that isn't the active one. */
  versionNamePlaceholder?: string
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

/** THE CARET GOES WHERE THE POINTER WAS. Opening a line used to select all of it,
 *  which is right for a field whose contents you are replacing and wrong for a line
 *  you are correcting: a click halfway through a sentence means "here", and
 *  select-all answers "start again", one keystroke from losing the text.
 *
 *  The click point is a viewport coordinate and it maps cleanly because NOTHING
 *  MOVES between the click and the caret — a property of editing in place, not luck.
 *  A field would have re-laid the text out first, which is why this could not have
 *  been done with one.
 *
 *  `caretRangeFromPoint` is the Chrome spelling and `caretPositionFromPoint` the
 *  standard one; if neither lands inside the element (an empty line, a click in its
 *  trailing space) the caret goes to the END, never back to select-all. */
function caretAt(el: HTMLElement, point: { x: number; y: number } | null): void {
  const sel = window.getSelection()
  if (!sel) return
  const doc = document as Document & {
    caretRangeFromPoint?: (x: number, y: number) => Range | null
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  }
  let range: Range | null = null
  if (point) {
    if (doc.caretRangeFromPoint) {
      range = doc.caretRangeFromPoint(point.x, point.y)
    } else if (doc.caretPositionFromPoint) {
      const p = doc.caretPositionFromPoint(point.x, point.y)
      if (p) { range = document.createRange(); range.setStart(p.offsetNode, p.offset) }
    }
    if (range && !el.contains(range.startContainer)) range = null
  }
  if (range) {
    range.collapse(true)
  } else {
    range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
  }
  sel.removeAllRanges()
  sel.addRange(range)
}

/** WHAT EDITING ADDS TO A LINE: a blue edge around the words, and almost nothing
 *  else. No fill, no change of type or position — a caret in the accent, the clamp
 *  released so the whole string is legible while it is being changed, and text
 *  selection turned back on (the well disables it so dragging a label never paints
 *  a selection).
 *
 *  THE EDGE IS AN OUTLINE, NOT A BORDER, and that distinction is why this can exist
 *  at all. An outline paints outside the box without joining the layout: it cannot
 *  grow the row, cannot shift the picker under it, and has no used border width to
 *  cancel — which is exactly what three passes at a bordered `<input>` failed on
 *  (a `1px` rule resolves to 0.667px on a scaled board, so the counter-margin was a
 *  sub-pixel bet). A background would be the other half of a field and is
 *  deliberately absent: the words stay on the surface they were read on.
 *
 *  Exported so a port reads what an open line differs by rather than reconstructing
 *  it from prose — the same move as `RECEDE_LEAVE_MS`. Read it; do not spread it. */
export const INLINE_EDIT_STYLE: React.CSSProperties = {
  /* BLUE, ONE STEP BRIGHTER THAN SELECTION. `--state-editing` is `--pond-vivid` —
     pond already means "the thing I am acting on", and the vivid step exists for
     this one edge, because a transient outline has to be found at a glance where a
     selection wash is read past. A named token rather than a reach into
     `--state-selected`, whose name would then be lying on a line being typed into.
     What keeps the two apart on screen is the step and the object: selection
     outlines a chip or a card at 2px, this outlines a run of TEXT at 1px. */
  outline: '1px solid var(--state-editing)', outlineOffset: 3,
  /* THE ROOM AT THE ENDS IS ASYMMETRIC, because the row is. The head leaves exactly
     4px between the index's last glyph and the title's first, so the whole left
     inset has to fit inside it — the outline's own 3px offset is that inset, 1px
     clear of the number, and there is no left padding at all. The right end takes
     4px of padding handed straight back as an equal negative margin, so the wrap
     width and the row's height are untouched. Widening the head's index gap to
     balance the two ends is refused: that gap is published geometry
     (`titleColumn`, and the description's indent reads the same expression), so a
     transient editing state would be reshaping the resting card for every caller. */
  boxSizing: 'content-box',
  padding: '0 4px 0 0', margin: '0 -4px 0 0',
  /* AND THE ROOM IS TAKEN OUTSIDE THE WRAP WIDTH, NOT OUT OF IT. `base.css` puts
     everything in `border-box` and all three of these lines are capped at
     `maxWidth: 100%`, so in border-box that 4px comes off the width the TEXT wraps
     in: a name ending within 4px of the wrap point gained a line on the click that
     opened it — and where the clamp already allowed two lines the card's height did
     not change at all, so nothing reported it. `content-box` makes `maxWidth: 100%`
     mean the text's 100% again. The rule: an in-place editor may not change the box
     the text wraps in, and `box-sizing` is part of that box. */
  borderRadius: 'var(--radius-xs)',
  caretColor: 'var(--accent-primary)',
  /* AND NOT THE FOCUS RING. `base.css` rings every `:focus-visible` element with
     `--ring-focus` at a `--radius-sm` corner, and Chrome counts an editable element
     as focus-visible even when a CLICK opened it — so an open line wore a second
     edge from a global rule rather than from this file. A port hits this too: it
     comes from the theme, so reading the component's own styles and concluding
     there is no box is exactly the wrong check. */
  boxShadow: 'none',
  background: 'transparent',
  cursor: 'text', userSelect: 'text', WebkitUserSelect: 'text',
  /* pre-wrap so a trailing space under the caret does not collapse as it is typed */
  whiteSpace: 'pre-wrap',
  /* an emptied line is still one line tall, and still has to hold a caret */
  minHeight: '1lh', minWidth: 8,
  /* THE CLAMP COMES OFF WHILE EDITING. A display compromise has no business hiding
     characters from the person typing them — the same rule that releases the height
     clamp. This can grow the head for a name longer than its cap, which is the
     TEXT's own doing and the one movement here that earns itself. */
  maxHeight: 'none', overflow: 'visible',
}

interface InlineTextProps {
  /** the true string — what an OPEN line always shows, and what commit compares against */
  value: string
  /** the resting, ellipsised form when the cap cut it (OB-033). Never shown while editing */
  display?: string
  /** the invitation drawn while the line is blank — an overlay, never text in the element */
  placeholder?: string
  editing: boolean
  onOpen?: () => void
  onCommit: (v: string) => void
  onCancel: () => void
  tooltip?: string
  style: React.CSSProperties
  /** what the OPEN line adds on top of `style` and the shared recipe */
  editStyle?: React.CSSProperties
  /** a caller whose open line fills its ROW writes the click point here instead */
  pointRef?: React.MutableRefObject<{ x: number; y: number } | null>
  /** Shift+Enter breaks the line. Prose only — a hand-typed break in a NAME is a
   *  layout decision taken in the wrong place */
  multiline?: boolean
}

/** EVERY EDITABLE STRING IN THE GROUP IS THIS: the line itself, made editable in
 *  place. No field, no box — see `INLINE_EDIT_STYLE` for the whole of what changes.
 *
 *  The short version of why the `<input>` this replaces could not be saved: a
 *  field's box cannot be made to match the line it replaces (its border resolves
 *  sub-pixel, so the counter-margin is a bet), and NO SINGLE-LINE FIELD CAN HOLD A
 *  STRING THAT WRAPS — which the description, the title and a version name all do.
 *  Clicking a wrapped description collapsed its row by 14.46px and jumped back on
 *  blur. The length of the value, not the tidiness of the row, is what decides
 *  whether a field is admissible at all.
 *
 *  Controlled, because two of the three live in the group's own `editing` state
 *  (one line open at a time, and opening the version name also closes the picker).
 *  Commit sends the text whitespace-normalised and trimmed; the caller decides what
 *  an empty string means — it clears a description and is refused for a name. */
function InlineText({
  value, display, placeholder, editing, onOpen, onCommit, onCancel,
  tooltip, style, editStyle, pointRef, multiline,
}: InlineTextProps) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const ownPoint = useRef<{ x: number; y: number } | null>(null)
  /* WHERE THE POINTER WAS. Usually this element's own click writes it — but a
     caller whose open line FILLS ITS ROW (the description) opens the editor from
     the row as well and hands the same ref in, so a click on the empty part of the
     row places the caret exactly as a click on the words does. */
  const point = pointRef || ownPoint
  /* IS THE LINE BLANK RIGHT NOW? Tracked rather than derived from `value`, because
     it changes as the user types and `value` cannot: the DOM text is deliberately
     uncontrolled here (React must not patch the words under the caret). This is the
     only state that follows the typing, it holds a boolean rather than the text, and
     a re-render from it leaves the DOM alone — the rendered child is still `value`,
     so there is nothing for React to patch. */
  const [blank, setBlank] = useState(!value)
  useEffect(() => {
    if (!editing) return
    const el = ref.current
    if (!el) return
    setBlank(!el.textContent?.trim())
    el.focus()
    caretAt(el, point.current)
    point.current = null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing])
  /* READ BACK WHAT IS DRAWN, NOT WHAT IS IN THE NODES. A Shift+Enter break is a
     `<br>` and `textContent` cannot see one, so the line the user typed would
     arrive as if it were never there. `innerText` is the rendered text, breaks
     included. Single-line strings keep `textContent`, which is cheaper and cannot
     surprise: a name has no breaks to preserve.
     Normalisation differs too — every line has its runs of spaces collapsed and its
     ends trimmed; a multiline value keeps single breaks and collapses blank runs, a
     single-line value loses breaks entirely. */
  const readBack = (): string => {
    const el = ref.current
    if (!el) return ''
    if (!multiline) return (el.textContent || '').replace(/\s+/g, ' ').trim()
    return el.innerText.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ')
      .split('\n').map((l) => l.trim()).join('\n').replace(/\n{2,}/g, '\n').trim()
  }
  const commit = () => onCommit(readBack())
  const line = (
    <span ref={ref}
      /* REMOUNTED ON EVERY OPEN AND CLOSE. React renders the same string either side
         of the transition, so it would see nothing to patch — and the words typed
         into the DOM would survive an Escape. The key makes each state its own
         element, so closing rebuilds the line from the prop, which is the only copy
         that is true. */
      key={editing ? 'edit' : 'rest'}
      contentEditable={editing || undefined}
      suppressContentEditableWarning={editing || undefined}
      /* nothing while editing: a tooltip over a line you are typing into is noise,
         and it would sit on top of the caret */
      title={editing ? undefined : wrapTip(tooltip)}
      onClick={(e) => {
        e.stopPropagation()
        if (editing || !onOpen) return
        point.current = { x: e.clientX, y: e.clientY }
        onOpen()
      }}
      /* SELECT ALL, NOT ONE WORD (OB-081). A double-click's native default is word-select
         — right for reading, wrong for a field you are about to retype: a whole-field
         double-click is the universal "replace everything" gesture (a URL bar, a
         spreadsheet cell), and word-select instead makes the caller manually extend the
         selection before typing over it. Only while editing — at rest a double-click still
         does nothing of ours, so it falls back to whatever selecting read-only text means
         to the platform. This ALSO stops the event reaching whatever the card is sitting
         in, same as before — see "WHAT THE HOST AROUND IT MUST KNOW" above the file's
         props, and take a host gesture in the CAPTURE phase instead. */
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation()
        if (!editing) return
        e.preventDefault()
        const el = ref.current
        const sel = el && window.getSelection()
        if (!el || !sel) return
        const range = document.createRange()
        range.selectNodeContents(el)
        sel.removeAllRanges()
        sel.addRange(range)
      }}
      /* the words are a drag surface at rest and a text surface while editing: without
         this a select-drag across them picks the CARD up instead of the sentence.
         `onPointerDown` is the OTHER half of the guard (OB-081) — `VersionedGroup`'s own
         card-move starts on `onPointerDown` via `data-grab`, which this element never
         carries, so it was already safe here — but `NodeChain` ALSO starts its reorder
         drag on `onPointerDown`, one level further up, for any chip it is handed,
         including a card sitting inside a chain. Its own exclusion list didn't know this
         field existed, so a press-and-drag meant to select text inside an editing title,
         description or version name read as the start of a reorder instead — stopped
         here, at the source, so every host this component is dropped into is protected
         rather than each one having to learn about contentEditable itself. */
      onPointerDown={editing ? (e: React.PointerEvent) => e.stopPropagation() : undefined}
      onMouseDown={editing ? (e: React.MouseEvent) => e.stopPropagation() : undefined}
      onInput={editing && placeholder ? (e: React.FormEvent<HTMLSpanElement>) => setBlank(!e.currentTarget.textContent?.trim()) : undefined}
      onKeyDown={editing ? (e: React.KeyboardEvent) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          /* SHIFT+ENTER BREAKS THE LINE, ENTER COMMITS IT — and only where breaks
             are legal. On a NAME both spellings commit. `insertLineBreak` gives a
             real `<br>` rather than a paragraph, which is why the read-back uses
             innerText. */
          if (multiline && e.shiftKey) {
            e.preventDefault()
            document.execCommand('insertLineBreak')
            return
          }
          e.preventDefault()
          commit()
        }
        /* Escape reverts, and the remount above is what restores the words */
        if (e.key === 'Escape') { e.preventDefault(); onCancel() }
      } : undefined}
      onBlur={editing ? commit : undefined}
      /* a line takes WORDS from the clipboard, never markup — and never more
         structure than it can hold: a pasted newline is a break where breaks are
         legal and a space where they are not */
      onPaste={editing ? (e: React.ClipboardEvent) => {
        e.preventDefault()
        const raw = (e.clipboardData.getData('text/plain') || '').replace(/\r\n?/g, '\n')
        document.execCommand('insertText', false,
          multiline ? raw.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n') : raw.replace(/\s+/g, ' '))
      } : undefined}
      /* THE OPEN LINE IS ALWAYS THE WHOLE STRING — `display` is the resting,
         ellipsised form of a name too long for its cap. */
      style={editing ? { ...style, ...INLINE_EDIT_STYLE, ...editStyle } : style}>
      {editing ? value : (display || value || placeholder)}
    </span>
  )
  /* NO PLACEHOLDER, NO WRAPPER. The title and a version name always have text, so
     they get the bare line and their layout is untouched — both sit in tuned flex
     rows where an extra box is a risk for nothing. */
  if (!placeholder) return line
  /* THE INVITATION HAS TO SURVIVE THE CLICK. "enter description" IS the empty line's
     only content, so opening the editor replaced the one thing on screen with an
     empty 8px box and a caret in blank space — reported as the click bugging out.
     It stays, as a real placeholder: drawn BEHIND the caret, never as text in the
     editable element, where it would be selectable and committable ("enter
     description" is the last thing anyone means to save). It takes no pointer
     events, so a click still lands on the line under it.

     The wrapper is present in BOTH states, deliberately. If it only appeared while
     editing, the editable span would change parents on the first character typed,
     remount, and lose focus and caret mid-word. Only the overlay is conditional. */
  return (
    <span style={{ position: 'relative', display: 'block', maxWidth: '100%' }}>
      {line}
      {editing && blank ? (
        <span aria-hidden="true" style={{
          position: 'absolute', left: 0, top: 0, pointerEvents: 'none',
          fontFamily: style.fontFamily, fontSize: style.fontSize, lineHeight: style.lineHeight,
          /* the same italic --text-3 it wears at rest: still an invitation, not content */
          fontStyle: 'italic', color: 'var(--text-3)', whiteSpace: 'nowrap',
        }}>{placeholder}</span>
      ) : null}
    </span>
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

/** The tick itself, drawn — never a style object handed to a caller. */
export function Check() {
  return <span style={checkStyle()} />
}

export function RestoreMark() {
  return (
    <span style={{ position: 'relative', width: 10, height: 10, display: 'block' }}>
      <span style={{ position: 'absolute', top: 0, right: 0, width: 7, height: 7, boxSizing: 'border-box', borderTop: '1.25px solid currentColor', borderRight: '1.25px solid currentColor', borderTopRightRadius: 1.5 }} />
      <span style={{ position: 'absolute', bottom: 0, left: 0, width: 7, height: 7, boxSizing: 'border-box', border: '1.25px solid currentColor', borderRadius: 1.5 }} />
    </span>
  )
}

/** An optional description line, edited IN PLACE. Empty, it is the invitation —
 *  italic --text-3, the same register as "add new version": an action sitting among
 *  names. Filled, it is prose at --text-2 and stops being italic, because italic is
 *  the mark of a thing that isn't there yet. Committing an empty line clears it back
 *  to the invitation; a description is optional both ways.
 *
 *  THERE IS ONE ROW, NOT TWO. Editing does not swap the row for a differently-built
 *  one: same element, same type, same wrapping, with the words made editable in
 *  place. Nothing about the box can change on the click because nothing about the
 *  box is re-decided — which is what three passes at cancelling a field's chrome
 *  could not achieve, and what no amount of cancelling could achieve for a WRAPPED
 *  description, since a single-line input cannot be two lines tall.
 *
 *  THE ROW'S METRICS ARE OURS, NOT THE DS's, AND THAT IS DELIBERATE (OB-028 is not
 *  in this batch). Upstream this row is set tighter than every other — `--lh-tight`,
 *  no vertical padding, and it absorbs 4px of the head's row gap above and 2px
 *  below — and it is indented to the title rather than to the card. All of that is
 *  one 10.4px move on every card, with a shot re-baseline behind it, so it lands on
 *  its own. What is ported here is the EDITING; the padding and line-height below
 *  are unchanged from before this run to the pixel. */
function DescLine({ text, placeholder, indent, onCommit, rowOpens = false, multiline = false }: {
  text?: string; placeholder?: string; indent?: number; onCommit?: (v: string) => void
  /** the whole row opens the line, and the I-beam runs the whole row with it */
  rowOpens?: boolean
  /** Shift+Enter breaks the line; Enter still commits */
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const point = useRef<{ x: number; y: number } | null>(null)
  if (!onCommit && !text) return null
  return (
    <div style={{
      display: 'block',
      marginTop: -GROUP_METRICS.descPullUp, marginBottom: -GROUP_METRICS.descPullUnder,
      padding: '0 7px 0 ' + (7 + (indent || 0)) + 'px',
      /* THE WHOLE ROW OPENS THE EDITOR, and the I-beam runs the whole row with it.
         This used to be the group's drag surface with the text carrying the only
         caret, on the rule that a caret over empty background promises a field that
         is not there. The rule was right and its boundary moved: the open line FILLS
         this row now, so the empty stretch to the right of the words is exactly
         where the edit box will be — clicking it and getting a drag was the promise
         being broken the other way round.
         It applies HERE and not to the title or a version name, whose open lines are
         sized to their own text: the rule is still "the I-beam belongs wherever the
         editor will be", which is not always the whole row.
         THE ROW LOSES `data-grab` IN EXCHANGE — this strip is no longer part of the
         card's drag surface. The head row, the picker and the card's own padding
         still are. */
      cursor: rowOpens && onCommit && !editing ? 'text' : 'inherit',
      /* THE ROW CARRIES THE SAME TYPE AS ITS TEXT. Without this the block's strut comes
         from the card (--fs-body at --lh-snug = 17.55) and the line box is 17.55 tall
         around a 16.2 line, so the row draws taller than every published number says and
         `headHeight()` runs light on every card. A line box is set by the containing
         block's font, not by the inline that happens to sit in it.
         AND IT IS THE ONE ROW SET TIGHTER THAN SNUG: --lh-tight, no vertical padding, and
         it absorbs the head's 4px row gap above it and 2px of the gap below — see
         `descLine`, `descPullUp` and `descPullUnder` in GROUP_METRICS for why. A
         description is one line under the name it describes, not a paragraph. */
      fontSize: 'var(--fs-caption)', lineHeight: 'var(--lh-tight)',
    }}
      /* a click anywhere on the row opens the line and puts the caret where the
         pointer was — past the last word that is the end of the line clicked, which
         for the usual one-line description is the end of the text. The words' own
         click gets there first and stops propagating, so this handles exactly the
         empty stretch. */
      onClick={rowOpens && onCommit && !editing ? (e: React.MouseEvent) => {
        e.stopPropagation()
        point.current = { x: e.clientX, y: e.clientY }
        setEditing(true)
      } : undefined}>
      <InlineText value={text || ''} placeholder={placeholder} pointRef={point} multiline={multiline}
        editing={editing}
        onOpen={onCommit ? () => setEditing(true) : undefined}
        /* an empty commit is meaningful here and only here: it clears the line back
           to its invitation. A description is optional both ways. */
        onCommit={(v) => { setEditing(false); if (v !== (text || '') && onCommit) onCommit(v) }}
        onCancel={() => setEditing(false)}
        tooltip={onCommit ? 'click to edit' : undefined}
        style={{
          display: 'inline-block', maxWidth: '100%',
          fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)',
          lineHeight: 'var(--lh-tight)', color: text ? 'var(--text-2)' : 'var(--text-3)',
          /* italic is the mark of a thing that is not there yet, so it goes the
             moment there is something to read — including while an empty line is
             being typed into */
          fontStyle: text ? 'normal' : 'italic', cursor: onCommit ? 'text' : 'inherit',
          overflowWrap: 'break-word',
          /* THE RESTING LINE HONOURS THE BREAKS IT WAS GIVEN. `pre-wrap` is what
             draws a committed Shift+Enter — without it a two-line description
             collapses back to one the moment it is committed, and `headHeight()`,
             which counts the breaks, predicts a row taller than the one drawn. */
          whiteSpace: 'pre-wrap',
        }}
        /* WHILE OPEN, THE LINE IS THE WHOLE ROW. At rest it is sized to its own
           words; an OPEN line 8px wide would leave the invitation drawn over ground
           that does not belong to it, so a click on the words it is showing would
           land on the card and drag it. Full width while editing costs nothing
           visually — there is no box to see — and makes the whole line clickable,
           which is what an open editor should be. */
        editStyle={{ color: 'var(--text-1)', fontStyle: 'normal', width: '100%' }} />
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

function VersionRow({ version, on, onPick, onDelete, confirming, onCancel, namePlaceholder }: {
  version: GroupVersion; on: boolean; onPick: () => void
  onDelete?: () => void; confirming?: boolean; onCancel?: () => void
  /** OB-081: the menu shows every OTHER version too, not just the active one InlineText
   *  edits — an unnamed one among them needs the same invitation rather than a blank row */
  namePlaceholder?: string
}) {
  const [hot, show, hide] = useRecede()
  const shownName = version.name || namePlaceholder
  /* the worst clip in the system: the listbox is 220px and a version name can be a
     whole sentence */
  const nameClip = useClipped<HTMLSpanElement>(shownName)
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
              {on ? <Check /> : <Bullet />}
            </span>
            {version.label ? (
              <span style={{ flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', fontVariantNumeric: 'var(--tnum)', color: on ? 'var(--accent-primary-ink)' : 'var(--text-2)' }}>{version.label}</span>
            ) : null}
            <span {...nameClip} style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: onDelete ? 16 : 0 }}>{shownName}</span>
          </button>
          {onDelete ? (
            <button type="button" title={wrapTip('delete this version')} aria-label="delete this version"
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
 *  component itself renders — the picker floors at 30 (padding + borders + its
 *  18px cells), not 28; and the narrow tally row is 18.84, not 14.85. Two more
 *  corrections that used to be listed here are GONE, fixed at the source rather
 *  than patched: the card's two side edges are now asked of the display by
 *  `hairline()` in the layout pass (OB-024, no `faceBorder` constant survives
 *  it), and the description row carries its own font-size and line-height, so
 *  its line box is exactly `lines × descLine` with no strut to compensate for
 *  (OB-028). Measured by tools/studio-spike/shot-foldab.mjs
 *  ("headRows() calibration" / bodySlot cases), which also checks these
 *  functions against the rendered card so a drift shows up as a number. */

export const GROUP_METRICS = {
  padX: 8, padTop: 8, padBottom: 12, rowGap: 4,       /* --space-2 / --space-3 / --space-1 */
  headPadLeft: 7, headPadRight: 2, headMinH: 22, titleMinW: 96,
  bodyLine: 17.55,                                     /* --fs-body 13 × --lh-snug 1.35 */
  microLine: 14.85,                                    /* --fs-micro 11 × 1.35 */
  titleClampOpen: 2, titleClampFolded: 3, versionClamp: 2,
  descPadY: 0, descPadX: 7,
  /* THE DESCRIPTION IS THE ONE ROW SET TIGHTER THAN --lh-snug, and it carries the head's
     only two negative numbers. The head is a 4px-gap column; this row absorbs that gap on
     BOTH sides — `descPullUp` takes all 4 above, `descPullUnder` 2 of the 4 below — and
     drops to --lh-tight with no padding of its own. A description is one line under the
     name it describes, so the space around it is distance from its subject rather than
     readability. Empty, that space was the whole problem: 22.2px of reserved void between
     the title and the picker, as tall as the title row itself. The row now contributes
     11.8px whether it is filled or empty, so nothing moves on hover and a board can still
     predict a card it has not pointed at.
     `descLine` is this row's ONLY line metric, and three older names went out with it —
     the snug caption line it replaces, and the two struts that used to patch the row at
     one line and at the last wrapped one. Those two were a COMPENSATION, not a
     measurement: the row took the card's 13px strut, so its line box was 17.55 round a
     12px line and the patch made up the difference. Giving the row its own font-size and
     line-height removes the defect they patched, so the row is exactly `lines × descLine`
     with nothing to make up — and a port that carried the patch forward anyway would
     double-count it. A line box is set by the containing block's font, not by the inline
     that happens to sit in it. Do not reintroduce a second line metric here. */
  descLine: 13.8,                                      /* --fs-caption 12 × --lh-tight 1.15 */
  descPullUp: 4, descPullUnder: 2,
  pickerMinH: 28, pickerPadY: 10, pickerPadX: 13,       /* --hit-min; 5+5; 7+6 */
  pickerCheck: 12, pickerCaret: 16, pickerGap: 6,
  narrowAt: 250, ctlCluster: 37,                       /* two 18px buttons + 1px */
  foldPadTop: 8, foldPadX: 8, foldPadBottom: 9, foldPeekX: 4, foldPeekY: 4,
  railIndent: 13, railPadLeft: 10, bodyPadTop: 6, bodyPadRight: 8,
  /* ★ LOCAL: what the DS's own numbers leave out, measured.
     THERE IS NO HORIZONTAL CONSTANT HERE, and that is the point. `faceBorder: 1` used to
     be, holding the card's authored 1px side edge for AuthorRoad's SLOT_LEFT / SLOT_RIGHT.
     It is gone with OB-024: devicePixelRatio is not fixed for the life of a page — a window
     moved to a second display, or a browser zoom, changes it — so a number computed once at
     module load is right for whatever was attached at import time and silently wrong
     afterwards. That is the whole reason `hairline()` asks instead of assuming, and it has
     to be asked inside the layout pass. Never hoist an edge back into this table. */
  pickerMarkLine: 18,     /* the picker row's SHORTEST content, and it is not a line of text:
                             the state light and the version label are 18px boxes, taller than
                             --fs-body at --lh-snug (17.55). Was `pickerCell` here — a LOCAL
                             correction that the DS reached independently and named
                             `pickerMarkLine` upstream; renamed to theirs, same 18. */
  tallyRow: 18.84,        /* the narrow tally's own row, a strut'd block round an 11px inline-block */
  emptyZone: 58,          /* the empty-version zone in a bodySlot: minHeight 34 + 11px padding twice + 1.5px borders, content-box */
  railStroke: 1.5,        /* the ancestry rail's border-left — between railIndent and railPadLeft, so a host can find the slot sideways */
  foldedMinWidth: 190,    /* published OB-051 — was only the component's own prop default; a caller
                             reserving a fold and the component drawing one now read one table */
  emptySlotMin: 34,       /* published OB-051 — the empty placeholder's bare minHeight, before its
                             own padding/border; `emptyZone` above is what those inflate it to */
  bodyMaxHeight: 260,     /* published OB-050 — the well's default ceiling; the component's prop
                             default reads it from here so the two cannot drift apart */
}

/** A 1px border is not 1px. The browser lays borders out in whole DEVICE pixels, so at
 *  dpr 1.5 the card's own 1px edge is USED as 0.667 CSS px, and at dpr 2 as 1. Three such
 *  edges sit in this card's height — its own top and bottom, and the picker row's two — so
 *  a prediction that assumes the authored 1 is out by up to 1.33px per card: invisible on
 *  one, cumulative down a column of them. Measured rather than assumed, like the text: the
 *  browser doing the laying out is the one being asked.
 *
 *  Predict with this, never with 1. */
export function hairline(): number {
  const r = typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1
  return r >= 1 ? Math.floor(r) / r : 1
}

/** what a scrollbar takes out of a scrolling box — MEASURED once from an offscreen box,
 *  because it is a real number on one machine, 0 where the platform draws overlay
 *  scrollbars, and something else again under a custom scrollbar stylesheet. Not a token. */
let scrollbarPx: number | null = null
export function scrollbarWidth(): number {
  if (scrollbarPx !== null) return scrollbarPx
  if (typeof document === 'undefined' || !document.body) return 0
  const box = document.createElement('div')
  box.style.cssText = 'position:absolute;top:-9999px;width:100px;height:100px;overflow:scroll'
  document.body.appendChild(box)
  scrollbarPx = box.offsetWidth - box.clientWidth
  document.body.removeChild(box)
  return scrollbarPx
}

/** published OB-051: where the body slot sits SIDEWAYS — `{ left, right, axisOffset }`,
 *  relative to the width the card is laid out at. This is the number `AuthorRoad` used to
 *  compute itself from four `GROUP_METRICS` fields plus `hairline()` (its own `slotLeft` /
 *  `slotRight`) — including `railStroke`, which this table did not publish before today, so
 *  that term was measured off our drawing and typed into the caller's file with nothing
 *  keeping the two in step.
 *
 *  `axisOffset` is how far the card's own centre sits left of the slot's — the ancestry
 *  rail hangs on the left, so the slot is inset further that side — and it is the same at
 *  every width, which is what lets two cards of one width share their edges.
 *
 *  PASS `scrolls` WHEN THE WELL SCROLLS: a scrolling well gives up its scrollbar's width
 *  from the right inset, so a caller that reserved the unscrolled number floats content
 *  wider than the room it has. `openHeight().bodyScrolls` answers this for a slot whose
 *  contents are ASKED for; a told height that turns out too small for its own content is
 *  the caller's own arithmetic to see, since no prediction can look inside it.
 *
 *  A function, never a constant, because `hairline()` is a term in it — call it inside the
 *  layout pass, same as `hairline()` itself. */
export function slotInsets(scrolls?: boolean): { left: number; right: number; axisOffset: number } {
  const M = GROUP_METRICS
  const edge = hairline()
  const left = edge + M.padX + M.railIndent + M.railStroke + M.railPadLeft
  const right = M.bodyPadRight + M.padX + edge + (scrolls ? scrollbarWidth() : 0)
  return { left, right, axisOffset: (left - right) / 2 }
}

/** what the geometry needs to know about a card — the same strings the component
 *  is given, plus the width it will be laid out at */
export interface GroupSpec {
  width?: number
  title?: string
  /** the invitation `headHeight()`/`foldedSize()` measure in place of `title` when
   *  it is empty, so an unnamed card's predicted height matches what it draws */
  titlePlaceholder?: string
  index?: string
  description?: string
  descPlaceholder?: string
  /** whether the description line CAN BE EDITED — the spec's half of `onDescribe`.
   *  Defaults to TRUE, matching the component: `DescLine` drops the row for one
   *  case only, a card that is both undescribed AND read-only, and
   *  `descPlaceholder` itself defaults to 'enter description', so an ordinary
   *  editable card with an empty description still draws a one-line row.
   *  Pass `false` for a read-only card and the prediction drops the row exactly
   *  as the drawing does. */
  describable?: boolean
  versionName?: string
  /** the invitation measured in place of `versionName` when it is empty, same terms
   *  as `titlePlaceholder` */
  versionNamePlaceholder?: string
  versionLabel?: string
  count?: number
  countLabel?: string
  narrow?: boolean
  /** `openHeight` only: a TOLD body height — the `bodyHeight` prop. The well takes it as a
   *  `height` with `minHeight: 0`, so NO CEILING APPLIES; this is what an arithmetic board
   *  passes when it has already decided the box. */
  bodyHeight?: number
  /** `openHeight` only: how much room the CONTENTS ask for — the `slotHeight` prop. Sits
   *  inside the well under `bodyPadTop`, and the well caps the pair at `bodyMaxHeight`.
   *  Pass one, never both; `bodyHeight` wins if both are set, matching the component. */
  slotHeight?: number
  /** `openHeight` only: the well's ceiling. Defaults to `GROUP_METRICS.bodyMaxHeight`;
   *  `null` for no ceiling — the component's `bodyMaxHeight="none"` maps to this. */
  bodyMaxHeight?: number | null
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
/** the wrapping half of `linesOf`, for one run of text with no breaks in it */
function wrappedLines(text: unknown, width: number, weight: number, size: number, kind: FontKind): number {
  const str = String(text == null ? '' : text).trim()
  if (!str) return 1
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
  return lines
}

/** lines a label takes at a given width, honouring `overflow-wrap: anywhere` — a
 *  single unbreakable word longer than the column wraps INSIDE itself rather than
 *  overhanging, which is what the drawn label does.
 *
 *  EXPLICIT LINE BREAKS COUNT AS LINES. A description may hold them (Shift+Enter),
 *  and the drawn row honours them through `white-space: pre-wrap` — so a prediction
 *  that only measured WRAPPING runs one whole line light per break, which on a
 *  board is a card overlapping the next one. Each segment between breaks takes at
 *  least one line even when empty: a blank line the user typed is a line they can
 *  see. */
function linesOf(text: unknown, width: number, weight: number, size: number, kind: FontKind, clamp: number): number {
  const whole = String(text == null ? '' : text).trim()
  if (!whole) return 0
  if (!(width > 0)) return clamp || 1
  let lines = 0
  for (const segment of whole.split('\n')) lines += wrappedLines(segment, width, weight, size, kind)
  return clamp ? Math.min(lines, clamp) : lines
}

/** THE ELLIPSIS IS DRAWN INTO THE TEXT, because the CSS that would draw it does not
 *  work here. A title cut by its cap has to show that it was cut — and the obvious
 *  mechanism is the one this file already abandoned once: `display: -webkit-box`
 *  computes `flow-root` in this nesting, so `-webkit-line-clamp` goes inert,
 *  silently and font-dependently. All three routes were re-measured in Chrome 148 on
 *  2026-08-19: the box still computes `flow-root`, `-webkit-line-clamp` on a plain
 *  block draws no ellipsis, and standard `line-clamp` is unsupported. None of them
 *  draws a "…". So a port must not "simplify" this back to CSS.
 *
 *  The string is cut where the TEXT will be cut, and the "…" is a character like any
 *  other. It measures with `wrappedLines` — the same canvas measurement the published
 *  geometry wraps with — so the drawn text and `headHeight()`'s line count come from
 *  one expression rather than two that agree by luck. The CSS cap stays exactly as it
 *  was: this decides what to DRAW and never how tall the box is, which is the only
 *  reason a measured cut is safe in a component whose geometry is published — a
 *  measurement one word out cannot move a card.
 *
 *  Binary search over the prefix rather than a per-character walk: a title is short,
 *  but this runs on every card of a board on every resize. */
function clampToLines(text: unknown, lines: number, col: number, weight: number, size: number, kind: FontKind): string {
  const whole = String(text == null ? '' : text)
  if (!whole || !col || !lines) return whole
  if (wrappedLines(whole, col, weight, size, kind) <= lines) return whole
  let lo = 0
  let hi = whole.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (wrappedLines(whole.slice(0, mid).replace(/\s+$/, '') + '\u2026', col, weight, size, kind) <= lines) lo = mid
    else hi = mid - 1
  }
  /* one word is better than half a word: back up to the last space when trimming to
     it costs little, so the line ends "…" after a whole word rather than mid-run */
  const cut = whole.slice(0, lo).replace(/\s+$/, '')
  const lastSpace = cut.lastIndexOf(' ')
  const tidy = lastSpace > cut.length - 12 && lastSpace > 0 ? cut.slice(0, lastSpace) : cut
  return tidy.replace(/[\s,;:]+$/, '') + '\u2026'
}

function titleColumn(width: number, spec: GroupSpec, folded: boolean): { col: number; narrow: boolean } {
  const M = GROUP_METRICS
  const shellPad = folded ? M.foldPadX * 2 : M.padX * 2
  /* THE CARD'S OWN TWO SIDE EDGES, asked of the display rather than assumed — the
     horizontal half of what `hairline()` already fixes vertically, and for a long time the
     term that was simply missing. The shell is `box-sizing: border-box` with a 1px edge in
     both states (--border-rule folded, transparent open, and a transparent border still
     takes layout), so a column computed from `width` without it is ~2px wider than the one
     the browser wraps in. Harmless until a title sits inside that 2px, and then `linesOf()`
     counts one line where the card draws two, `openHeight()` runs a whole `bodyLine`
     (17.55px) light, and a board stacking arithmetically overlaps the next card by that
     much. Never hoist this into a module constant — see `faceBorder` in GROUP_METRICS. */
  /* OB-049: the peek strip is reserved in both states — the shell's own paddingRight never
     changes with fold — so it comes off the column unconditionally too, not only folded. */
  let col = width - hairline() * 2 - M.foldPeekX - shellPad - M.headPadLeft - M.headPadRight
  if (spec.index) col -= measure(spec.index, 500, 12, 'mono') + M.pickerGap - 2
  col -= M.ctlCluster + M.pickerGap
  const narrow = spec.narrow === undefined ? width < M.narrowAt : spec.narrow
  /* OB-049: gated on `narrow` alone — the row that draws the tally (`isNarrow ? null :
     tallyLine`) never tests fold state either, so a wide-but-folded head still shows it. */
  if (!narrow) {
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
  const titleLines = Math.max(1, linesOf(s.title || s.titlePlaceholder || 'untitled', c.col, 700, 13, 'display', M.titleClampOpen))
  /* the head is measured from the card's outer edge, border included — and the border
     is what the browser laid out, not the authored 1 */
  const hair = hairline()
  let h = hair + M.padTop + Math.max(M.headMinH, titleLines * M.bodyLine)
  if (c.narrow) h += M.rowGap + M.tallyRow /* ★ tallyRow, not microLine */
  /* OB-031 — THE ROW EXISTS WHENEVER THE LINE CAN BE EDITED, not only when the spec
     carries something to read. This branch used to key on `s.description ||
     s.descPlaceholder`, which is not the condition the component draws on: `DescLine`
     drops out for one case only (both undescribed AND read-only) and `descPlaceholder`
     defaults to 'enter description', so an ordinary editable card with an empty
     description still draws a one-line row. A spec carrying neither string is the
     NATURAL spec for an undescribed card, and it was predicted 11.79px short — which an
     arithmetically stacked board turns into 11.79px of overlap on every card nobody has
     described.
     The default is TRUE rather than false because the two errors are not equal:
     over-reserving leaves a gap, under-reserving puts the next card inside this one.
     INERT ON THIS BOARD, and recorded so nobody deletes it as dead code: AuthorRoad's
     `groupSpec` sets `descPlaceholder: 'enter description'` unconditionally
     (AuthorRoad.tsx:148), so `descText` was never empty here and every road card already
     reserved the row. This makes the prediction correct BY CONSTRUCTION instead of by a
     caller happening to pass a placeholder. Proven by shot-cardhead: no number moves. */
  const describable = s.describable === undefined ? true : !!s.describable
  const descText = s.description
    || (describable ? (s.descPlaceholder === undefined ? 'enter description' : s.descPlaceholder) : '')
  if (s.description || describable) {
    /* the shell's two side edges come off every column inside it — see titleColumn — and so
       does the indent that aligns this line with the TITLE rather than the card edge: the
       same index-width expression titleColumn subtracts, so a wrapped description wraps
       where it draws. No index, no indent. */
    const dIndent = s.index ? measure(s.index, 500, 12, 'mono') + M.pickerGap - 2 : 0
    const dcol = width - hair * 2 - M.padX * 2 - M.descPadX * 2 - dIndent
    /* at least one line: an empty editable row is one line tall, and `linesOf('')` is 0 */
    const dl = Math.max(1, linesOf(descText, dcol, 400, 12, 'ui', 0))
    /* the row is exactly its own lines, with nothing to patch: it carries its own font-size
       and line-height, so its line box no longer takes the card's 13px strut. It absorbs the
       head's row gap on both sides — all 4 above, 2 of the 4 below. */
    h += M.rowGap - M.descPullUp + M.descPadY * 2 + dl * M.descLine - M.descPullUnder
  }
  /* the shell's two side edges, and the picker row's own two: the row is border-box and
     carries a 1px border in every state (transparent at rest, and transparent still takes
     layout), so FOUR edges sit between the card's width and the version name's column. */
  let pcol = width - hair * 4 - M.padX * 2 - M.pickerPadX - M.pickerCheck - M.pickerCaret - M.pickerGap * 3
  if (s.versionLabel) pcol -= measure(s.versionLabel, 500, 11, 'mono')
  const vLines = Math.max(1, linesOf(s.versionName || s.versionNamePlaceholder || 'untitled', pcol, 600, 13, 'ui', M.versionClamp))
  /* the row is border-box, so its 1px edge is inside the --hit-min floor and on top of
     its own padding — and its content is the taller of the text and the 18px marks. The
     --hit-min floor is the DS's and was missing here; it only bites below dpr 1, so this
     is identical at dpr 1 to the `+ 2` it replaces and correct where that was not. */
  h += M.rowGap + Math.max(M.pickerMinH, hair * 2 + M.pickerPadY + Math.max(M.pickerMarkLine, vLines * M.bodyLine))
  return { height: Math.round(h * 100) / 100, narrow: c.narrow, titleLines, versionLines: vLines, measured: !!ctx2d }
}

/** The whole open card, given the height the caller wants the body slot to be.
 *  `bodyHeight` is the same number passed to the component as `bodyHeight` /
 *  `slotHeight`, so the box the board reserves and the box the group draws are
 *  one number with one owner. `bodyTop` is where the slot's content begins,
 *  from the card's top edge — the slot's own --space-15 padding included. */
export function openHeight(spec?: GroupSpec): HeadHeight & { bodyTop: number; bodyBox: number; bodyScrolls: boolean } {
  const head = headHeight(spec)
  const s = spec || {}
  const M = GROUP_METRICS
  /* OB-050: `bodyHeight` (TOLD, no ceiling) and `slotHeight` (ASKED, capped at
     `bodyMaxHeight`) were one field until this landed, which is the trap the DS warned
     of: a caller could render the component with `slotHeight` while telling THIS function
     `bodyHeight` — the same number under two names — and never see the drift, because the
     old function added the lead the same way regardless. Now the two mean different
     things, so a caller has to say which it has; `bodyHeight` wins if both are set,
     matching the component. */
  const told = s.bodyHeight === undefined ? null : s.bodyHeight
  const asked = s.slotHeight === undefined ? 0 : s.slotHeight
  const ceiling = s.bodyMaxHeight === undefined ? M.bodyMaxHeight
    : typeof s.bodyMaxHeight === 'number' ? s.bodyMaxHeight : null
  /* ★ LOCAL, not the DS's: an EMPTY version (count 0) draws the dashed placeholder in the
     slot, and under this host's content-box regime the placeholder's own minimum + padding
     + border (`emptyZone`) render taller than the bare ask (`emptySlotMin`) — the DS's own
     function carries no `count` term at all, so it cannot see this. Floor the ask so the
     reservation still covers the zone it fills; the told path is untouched, since nothing
     here tells a count-0 card its height rather than asking. */
  const floored = s.count === 0 ? Math.max(asked, M.emptyZone) : asked
  const wellBox = told !== null ? told
    : floored > 0 ? Math.min(M.bodyPadTop + floored, ceiling === null ? Infinity : ceiling)
    : 0
  const capped = told === null && floored > 0 && ceiling !== null && M.bodyPadTop + floored > ceiling
  /* the lead is `rowGap` (this row's place in the head's gap-4 column) plus `bodyPadTop`
     (the slot's own --space-15 above its first node) — ONCE, whether the box that follows
     is told or asked, since `wellBox` already folds `bodyPadTop` into the asked case and a
     told number is final as given. */
  const lead = wellBox > 0 ? M.rowGap + M.bodyPadTop : 0
  const bodyTop = Math.round((head.height + lead) * 100) / 100
  return {
    ...head,
    bodyTop,
    /* the well's own drawn height */
    bodyBox: Math.round(wellBox * 100) / 100,
    /* true only on the asked path, and only once the ceiling actually bit — read this
       rather than inferring a clip from a height that looks wrong */
    bodyScrolls: capped,
    /* the bottom edge closes the card — again as laid out, not as authored */
    height: Math.round((head.height + (wellBox > 0 ? M.rowGap : 0) + wellBox + M.padBottom + hairline()) * 100) / 100,
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
  const titleLines = Math.max(1, linesOf(s.title || s.titlePlaceholder || 'untitled', c.col, 700, 13, 'display', M.titleClampFolded))
  const tally = M.rowGap + M.tallyRow /* ★ tallyRow, not microLine */
  const h = hairline() * 2 + M.foldPadTop + Math.max(M.headMinH, titleLines * M.bodyLine)
    + (c.narrow ? tally : 0) + M.foldPadBottom + M.foldPeekY
  return { width: width + M.foldPeekX, height: Math.round(h * 100) / 100, titleLines, narrow: c.narrow, measured: !!ctx2d }
}

/** THE SPEC, DERIVED FROM THE PROPS YOU ALREADY HAVE (OB-050) — pass the same object you
 *  spread onto `<VersionedGroup>`. Retires the caller rules a hand-built spec has to
 *  restate: an undescribed EDITABLE card still reserves its row, from `onDescribe` alone;
 *  whichever of `bodyHeight` / `slotHeight` the caller is really passing is the one that
 *  lands in the spec, so the two can never be crossed — the crossing this obligation
 *  exists to close; and a raised `bodyMaxHeight` carries itself into the prediction,
 *  `'none'` included, which maps to the spec's `null`. Build a spec by hand only for a box
 *  you are not drawing. */
export function groupSpec(props: VersionedGroupProps): GroupSpec {
  const p = props || {}
  const vs = p.versions || []
  const live = vs.find((v) => v.id === p.activeId) || vs[0] || ({} as Partial<GroupVersion>)
  const spec: GroupSpec = {
    title: p.title,
    titlePlaceholder: p.titlePlaceholder,
    index: p.index,
    description: p.description,
    descPlaceholder: p.descPlaceholder,
    describable: !!p.onDescribe,
    versionName: live.name,
    versionNamePlaceholder: p.versionNamePlaceholder,
    versionLabel: live.label,
    count: p.count === undefined ? vs.length : p.count,
    countLabel: p.countLabel,
  }
  if (typeof p.width === 'number') spec.width = p.width
  if (p.narrow !== undefined) spec.narrow = p.narrow
  if (typeof p.foldedMinWidth === 'number') spec.foldedMinWidth = p.foldedMinWidth
  /* TOLD BEATS ASKED, exactly as it does in the component: `bodyHeight` is a height the
     caller has answered and the well takes it as a `height`, so the ceiling has nothing
     left to cap. */
  if (p.bodyHeight !== undefined && p.bodyHeight !== null) spec.bodyHeight = p.bodyHeight
  else if (p.slotHeight !== undefined) spec.slotHeight = p.slotHeight
  if (p.bodyMaxHeight !== undefined) spec.bodyMaxHeight = typeof p.bodyMaxHeight === 'number' ? p.bodyMaxHeight : null
  return spec
}

/** `openHeight(groupSpec(props))`, or `foldedSize(...)` when the props say folded — the box
 *  THIS card will be, given the props it is handed. Reads `folded`, else `defaultFolded`,
 *  exactly as the component does. */
export function groupSizeOf(props: VersionedGroupProps): ReturnType<typeof openHeight> | ReturnType<typeof foldedSize> {
  const folded = props.folded === undefined ? !!props.defaultFolded : !!props.folded
  const spec = groupSpec(props)
  return folded ? foldedSize(spec) : openHeight(spec)
}

/** Reachable from the DS window namespace, where a bare lowercase export is not. */
export const GroupGeometry = {
  GROUP_METRICS, headHeight, openHeight, foldedSize, hairline, scrollbarWidth, slotInsets, groupSpec, groupSizeOf,
}

export function VersionedGroup({
  title, titlePlaceholder = 'untitled', index, description, versions = [], activeId,
  folded, defaultFolded = false, selected = false, optional = false, count, addLabel = 'add new version', defaultOpen = false,
  descPlaceholder = 'enter description', versionNamePlaceholder = 'untitled',
  emptyLabel = 'no nodes in this version — drag one in', numberSteps = true, countLabel = 'nodes',
  onReorderNodes,
  maxWidth = 300, bodyMaxHeight = GROUP_METRICS.bodyMaxHeight, menuMaxHeight = 240, foldedMinWidth = 190,
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
  // ONE grace period, from IconButton — the head controls recede with the scrollbar
  const live = usePresence(shell)
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

  /* THE WIDTH THE TITLE IS ACTUALLY LAID OUT AT, which is not `curW`: a card left to
     size itself has no `curW` at all. Measured, so the ellipsis is decided against
     the column the browser wraps in. No feedback loop — a card only clips a title
     once it is at a fixed or maxed width, and at that width a shorter title cannot
     make the shell narrower. */
  const [shellW, setShellW] = useState(0)
  useEffect(() => {
    const el = shell.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined
    const read = () => setShellW(Math.round(el.getBoundingClientRect().width))
    read()
    const ro = new ResizeObserver(read)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* THE TITLE'S COLUMN IS ASKED OF THE ROW, NOT COMPUTED FROM THE CARD. The obvious
     move is `titleColumn(shellW, …)` — the published expression, so that the drawn
     cut and the predicted line count come from one place. Measured on the card, that
     is wrong: the arithmetic column is WIDER than the room the flex row actually
     leaves (a 300px card leaves ~159px of real column), so a title the arithmetic
     thinks fits in two lines can draw three, and the CSS cap then clips the third
     with no ellipsis at all — the exact defect the ellipsis exists to remove. The
     published column is right for the HEIGHT it is used for and wrong for this;
     where the two disagree, what the browser laid out wins.

     TWO PASSES, AND THEY CANNOT OSCILLATE. The measurement is only ever taken while
     the FULL string is shown: the title box is `width: fit-content`, so with an
     over-long name it sits at the available width (what we want) and with a short
     one at its own max-content width (which cannot make a fitting title be cut —
     `wrappedLines` of a string at its own natural width is one line). Cutting the
     string narrows the box, which is exactly why the measurement is not repeated
     until the name, the card's width or the fold state changes. */
  const titleBox = useRef<HTMLSpanElement | null>(null)
  const [titleCol, setTitleCol] = useState(0)
  const colKey = title + '|' + shellW + '|' + (isFolded ? 'f' : 'o') + '|' + (isNarrow ? 'n' : 'w')
  const colKeyRef = useRef<string | null>(null)
  /* THE CASCADE IS THE MECHANISM, so react-hooks/set-state-in-effect is switched off
     for this effect alone. The rule is right in general and wrong here: the cut can
     only be decided from a measurement, the measurement is only valid while the FULL
     string is on screen, and showing the full string is itself a render. So it is two
     passes by construction, not by an accidental dependency — and it is BOUNDED: the
     second pass sets a column and stops, and nothing runs again until `colKey` (the
     name, the shell width, the fold or narrow state) actually changes. */
  useLayoutEffect(() => {
    const el = titleBox.current
    if (!el) return
    /* WHEN THE NAME OR THE CARD CHANGES, drop the cut and let the next pass measure
       the full string. The reset only re-renders if there was a cut to drop —
       `setTitleCol(0)` on a column already 0 renders nothing, so returning here
       meant the measurement never ran at all and every over-long title drew clipped
       with no ellipsis. Fall through instead. */
    if (colKeyRef.current !== colKey) {
      colKeyRef.current = colKey
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see the note above
      if (titleCol !== 0) { setTitleCol(0); return }
    }
    /* `titleCol === 0` means the FULL string is on screen, which is the only state
       this may be measured in — see the note above. */
    if (titleCol === 0) {
      const w = Math.round(el.getBoundingClientRect().width)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see the note above
      if (w > 0) setTitleCol(w)
    }
  }, [colKey, titleCol])

  /* THE PICKER'S NAME CLIPS THE SAME WAY, and needs none of the two-pass care: its
     wrapper is `flex: 1`, so its width is the room the row leaves whatever the text
     says, and cutting the string cannot change it. (The title's wrapper is
     `flex: 0 1 auto` — it shrinks to its content, which is the whole reason that one
     has to be measured while the full string is showing.) One observer, read
     straight. */
  const verRO = useRef<ResizeObserver | null>(null)
  const [verCol, setVerCol] = useState(0)
  const verBox = useCallback((el: HTMLSpanElement | null) => {
    if (verRO.current) { verRO.current.disconnect(); verRO.current = null }
    if (!el) return
    const read = () => setVerCol(Math.round(el.getBoundingClientRect().width))
    read()
    if (typeof ResizeObserver === 'undefined') return
    verRO.current = new ResizeObserver(read)
    verRO.current.observe(el)
  }, [])

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
    if (!bodySlot || !onBodySlot) return
    /* FOLDING IS REPORTED, NOT IMPLIED. The slot does not exist while folded, and this
       effect used to just stop calling back — which leaves the caller holding the last
       box it was handed, at which it happily goes on drawing: a folded card with its
       nodes still stacked underneath it. "Stop drawing while folded" was a rule in the
       contract, and a rule a caller can forget in silence is one the component should
       hand over as a value. */
    if (isFolded) {
      onBodySlot({ left: 0, top: 0, width: 0, height: 0, zIndex: SHELL_Z + 1, depth: depth + 1, visible: false })
      return
    }
    const el = slot.current
    const sh = shell.current
    if (!el || !sh) return
    const report = () => {
      const a = el.getBoundingClientRect()
      const b = sh.getBoundingClientRect()
      onBodySlot({
        left: Math.round(a.left - b.left), top: Math.round(a.top - b.top),
        width: Math.round(a.width), height: Math.round(a.height),
        /* THE NUMBER, not the rule — see BodySlot.zIndex and .depth for why each of
           these is handed over rather than written down somewhere a caller must recall. */
        zIndex: SHELL_Z + 1,
        depth: depth + 1,
        visible: true,
      })
    }
    report()
    const raf = requestAnimationFrame(report)
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null
    if (ro) { ro.observe(el); ro.observe(sh) }
    return () => { cancelAnimationFrame(raf); if (ro) ro.disconnect() }
  }, [bodySlot, onBodySlot, isFolded, curW, curH, isNarrow, slotHeight, depth])

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
    if (side === 'right') return <span aria-hidden="true" title={wrapTip(RESIZE_TIP)} onPointerDown={startDrag('x')} onDoubleClick={resetAxis('x')} style={{ ...common, top: 14, bottom: 14, right: -3, width: 8, cursor: 'ew-resize' }} />
    if (side === 'bottom') return <span aria-hidden="true" title={wrapTip(RESIZE_TIP)} onPointerDown={startDrag('y')} onDoubleClick={resetAxis('y')} style={{ ...common, left: 14, right: 14, bottom: -3, height: 8, cursor: 'ns-resize' }} />
    return <span aria-hidden="true" title={wrapTip(RESIZE_TIP)} onPointerDown={startDrag('both')} onDoubleClick={resetAxis('both')} style={{ ...common, right: -3, bottom: -3, width: 16, height: 16, cursor: 'nwse-resize' }} />
  }

  const word = tally === 1 ? String(countLabel).replace(/s$/, '') : countLabel
  const tallyLine = (
    <span title={wrapTip(tally + ' ' + word + ' inside this version')} style={{
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
      <span data-grab="" ref={titleBox} style={{
        /* a floor, not a share: the head's fixed furniture is what shrinks when the
           group is narrow, never the name. The control cluster keeps its width even
           while receded, so the title never jumps — and never has controls land on
           its tail — when they appear */
        flex: '0 1 auto', minWidth: 96, display: 'block', cursor: 'inherit', marginRight: 2,
      }}>
        {/* THE TITLE IS EDITED IN PLACE, for a second reason beyond the
            description's: it WRAPS to two lines (three folded), and the field it
            used to open was a single line, so clicking a two-line name collapsed the
            head row under the pointer. Same instrument as the description now — the
            words themselves, a caret, no box. */}
        <InlineText value={title} placeholder={titlePlaceholder}
          /* AND THE RESTING TITLE ENDS IN "…" WHEN ITS CAP CUT IT (OB-033). Cut
             against `titleCol`, the column the row really leaves — never
             `titleColumn()`'s arithmetic, which is computed for the HEIGHT and runs
             wider than the room the row hands over. Before the box has been measured
             there is nothing to decide against, so the full string stands: a card's
             first paint shows a clipped title without its "…" for one frame, which
             is the right way round — inventing an ellipsis from a guessed column
             would put one on a title that fits. NO DISPLAY AT ALL WHILE `title` IS
             EMPTY (OB-081) — the placeholder overlay draws the invitation instead,
             and `clampToLines('')` would return '' anyway, but the conditional says
             so rather than relying on that being true. */
          display={title ? clampToLines(title, isFolded ? GROUP_METRICS.titleClampFolded : GROUP_METRICS.titleClampOpen,
            titleCol, 700, 13, 'display') : undefined}
          editing={editing === 'title'}
          onOpen={() => setEditing('title')}
          /* a group must have a name: an empty commit is refused and the old one
             stands — including a placeholder "name", which simply stays a
             placeholder */
          onCommit={(v) => { setEditing(null); if (v && v !== title && onRetitle) onRetitle(v) }}
          onCancel={() => setEditing(null)}
          tooltip={wrapTip(title || titlePlaceholder)}
          style={{
            /* NO -webkit-box AND NO -webkit-line-clamp. The wrapper was made a block
               to stop the label being blockified and it STILL computed to flow-root
               in the shipped card, which leaves the clamp inert: the box stayed one
               line tall and `overflow: hidden` ate the rest, so a long title read
               "Reach the" with nothing to say it had been cut. Worse, it was
               font-dependent — with the fallback face the string fitted the column
               and looked correct, and only with Quicksand actually loaded did it
               clip. A legacy display value three different ancestors can silently
               cancel is not a mechanism to depend on.
               A line CAP does the same job with none of that: the text wraps
               normally and the box is at most N lines tall. What CSS gives up is the
               ellipsis, and `clampToLines` above is what puts it back — in the
               string, where no ancestor can cancel it. N × the body line is read
               from GROUP_METRICS, so the height the geometry predicts and the height
               the title takes cannot diverge. */
            width: 'fit-content',
            maxWidth: '100%', lineHeight: 'var(--lh-snug)',
            display: 'block',
            maxHeight: (isFolded ? GROUP_METRICS.titleClampFolded : GROUP_METRICS.titleClampOpen) * GROUP_METRICS.bodyLine,
            whiteSpace: 'normal', overflowWrap: 'anywhere',
            overflow: 'hidden',
            fontFamily: 'var(--font-display)', fontSize: 'var(--fs-body)',
            fontWeight: 'var(--fw-bold)', color: 'var(--text-1)', cursor: 'text',
          }} />
      </span>
      <span style={{ flex: 1 }} />
      {isNarrow ? null : tallyLine}
      <span style={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, height: 18, alignSelf: 'flex-start', marginTop: -1 }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 1,
          opacity: live || open ? 1 : 0, pointerEvents: live || open ? 'auto' : 'none',
          transition: 'opacity var(--dur-fade) var(--ease-soft)',
        }}>
          {/* glyphSize is explicit on both: the shared component derives 10px at this
              box, which is right for the ✕ but leaves – and the restore mark a step
              light beside it. Optical sizing, and the DS states the same pair. */}
          <IconButton label={isFolded ? 'maximize' : 'minimize'} glyphSize={12} onClick={fold} reachable={live || open}>
            {isFolded ? <RestoreMark /> : '–'}
          </IconButton>
          {/* tone stays chrome: ungrouping is a SPILL, not a delete — the nodes are
              spliced back onto the board — so this is a neutral act wearing no stake.
              The delete case is count: 0, and the component asks first. */}
          {onClose ? <IconButton label="ungroup nodes" onClick={askUngroup} reachable={live || open} /> : null}
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
        <VersionRow key={v.id} version={v} on={v.id === active.id} namePlaceholder={versionNamePlaceholder}
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
          <Check />
        </span>
        {active.label ? (
          <span style={{ flexShrink: 0, lineHeight: '18px', fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-micro)', fontVariantNumeric: 'var(--tnum)', color: 'var(--accent-primary-ink)', fontWeight: 'var(--fw-medium)' }}>{active.label}</span>
        ) : null}
        <span ref={verBox} style={{ flex: 1, minWidth: 0, display: 'block', cursor: 'inherit' }}>
          {/* the live version's name, edited in place like the other two. It wraps to
              two lines, so the single-line field it used to open had the same
              collapse the title's did. */}
          <InlineText value={active.name} placeholder={versionNamePlaceholder}
            /* AND IT ENDS IN "…" WHEN ITS CAP CUT IT, for the same reason the title
               does: a name stopping mid-sentence with nothing to say so is
               indistinguishable from a short name. This row is where it matters most
               — a version name is often the only thing telling two versions apart.
               Cut against `verCol`, the column the row really leaves, never the
               `pcol` arithmetic inside `headHeight()`. NO DISPLAY AT ALL WHILE
               `active.name` IS EMPTY (OB-081) — the placeholder overlay carries it. */
            display={active.name ? clampToLines(active.name, GROUP_METRICS.versionClamp, verCol, 600, 13, 'ui') : undefined}
            editing={editing === 'version'}
            onOpen={() => { setOpen(false); setEditing('version') }}
            /* a version must keep a name: an empty commit is refused — including a
               placeholder "name", which simply stays a placeholder */
            onCommit={(v) => { setEditing(null); if (v && v !== active.name && onRename) onRename(active.id, v) }}
            onCancel={() => setEditing(null)}
            tooltip={wrapTip(active.name || versionNamePlaceholder)}
            style={{
              width: 'fit-content',
              /* A version name is authored text and can run long, so it WRAPS — to
                 two lines, then the tail is clipped. Truncating at one line hid the
                 end of every descriptive name, which is the only thing distinguishing
                 one version from another; wrapping without a limit let a paragraph
                 pushed into the line shove the whole body down the pane. */
              maxWidth: '100%', display: 'block',
              maxHeight: GROUP_METRICS.versionClamp * GROUP_METRICS.bodyLine,
              overflow: 'hidden', whiteSpace: 'normal',
              overflowWrap: 'anywhere', lineHeight: 'var(--lh-snug)',
              fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-body)',
              fontWeight: 'var(--fw-semibold)', color: 'var(--accent-primary-ink)', cursor: 'text',
            }} />
        </span>
        <span style={{ width: 16, height: 16, flexShrink: 0, display: 'grid', placeItems: 'center', marginTop: 1, color: open ? 'var(--text-2)' : 'var(--text-3)', transition: 'color var(--dur-hover) var(--ease-soft)' }}>
          <Caret open={open} />
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
         card 4px narrower folded — and the fold's padding was 1px wider a side on top —
         so a one-line name wrapped to two the moment you collapsed it, which reads as
         the fold rewriting the title. Open, the 4px is simply empty. The bottom strip
         stays folded-only: nothing sits below an open card for the peek to overlap, and
         height is not what a title wraps against. */
      paddingRight: GROUP_METRICS.foldPeekX,
      paddingBottom: isFolded ? GROUP_METRICS.foldPeekY : undefined,
      transform: at ? 'translate(' + at.x + 'px, ' + at.y + 'px)' : undefined,
      zIndex: carrying ? 40 : undefined,
    }}>
      {isFolded || depth > 0 ? (
        <div aria-hidden="true" style={{ position: 'absolute', inset: '4px 0 0 4px', borderRadius: 'var(--radius-lg)', background: depth % 2 ? 'var(--surface-sunken-2)' : 'var(--surface-sunken)', zIndex: 0 }} />
      ) : null}
      <div data-grab="" onPointerDown={startMove} style={{
        position: 'relative', zIndex: 1, borderRadius: 'var(--radius-lg)', boxSizing: 'border-box',
        /* the horizontal padding is --space-2 in BOTH states, so the head row is the
           same width either way; only the vertical padding differs, which the title
           does not wrap against */
        padding: isFolded ? '8px var(--space-2) 9px' : 'var(--space-2) var(--space-2) var(--space-3)',
        display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-rule)',
        boxShadow: carrying ? 'var(--lift-drag)' : '0 1px 2px rgba(53,49,42,0.06), 0 3px 6px -4px rgba(53,49,42,0.20)',
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
            /* THE ROW OPENS THE LINE, and the caller is what knows it should: the
               rule is that the I-beam belongs wherever the editor will be, and only
               the caller knows this line's editor fills its row. `multiline` is the
               same shape of decision — only the caller knows a description is prose
               and a name is not. */
            rowOpens multiline
            /* INDENTED TO THE TITLE, NOT TO THE CARD. The description describes the NAME,
               so it starts where the name starts — past the derived index in the head row
               above it. Left at the card's own padding it lined up under the number
               instead, which reads as a second thing in the head rather than as a line
               belonging to the title. The offset is measured from the same string the head
               draws and with the same expression `titleColumn()` already subtracts for it,
               so the two cannot drift. No index, no indent. */
            indent={shownIndex ? measure(shownIndex, 500, 12, 'mono') + GROUP_METRICS.pickerGap - 2 : 0}
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
/** WHAT A LINE MEETING THIS CARD HAS TO MATCH — 1px, NOT the full-rank 1.5. A connector is
 *  drawn at the border weight of what it connects and never above it, and a `NodeChain` reads
 *  this static off any child that is not one of our chips. Without it a chain of group cards
 *  falls through to `shaftFor`'s full-rank fallback and draws a 1.5 shaft against 1px edges —
 *  the same fault the 3px `EdgeEntry` shaft was, one component over.
 *  THE OPEN CARD'S EDGE IS TRANSPARENT rather than absent, and it still takes layout, so 1 is
 *  the honest number in both states. `shaftFor` maps it to 1.25 either way: a borderless box
 *  is the LEAST able to carry a heavy line beside it, so "no border" is never read as "no
 *  constraint". */
VersionedGroup.joinBorder = 1
