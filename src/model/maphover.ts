// WHICH HOVER THE MAP DRAWS, AND HOW — the map has two hover sources, and they
// do not get the same treatment.
//
// One is the pointer physically over this pane. The other arrives on the bus: a
// row the user is pointing at in the tree, or in the connections pane, republished
// here as "the thing your cursor is on over there lives HERE". Both light a
// territory. Only the first one gets a card.
//
// OB-127 (#251) is the ruling that made that asymmetry a rule rather than an
// accident. We had asked the Design System whether `MapTooltip` anchors to the
// cursor or to the hovered element, and offered both. The answer was neither: the
// card is FOR a cursor hover, so the question dissolves. On a published hover the
// pointer is over the OTHER pane, which is already drawing its own treatment for a
// name the user is reading there; what they want from the map is where the thing
// is, and the lit territory answers that completely. A card would repeat a name
// they are already looking at, on a surface they are not looking at.
//
// It lives in its own file, out of the component, for the reason `walkpins.ts`
// does: this is a rule that keeps being re-decided. Three obligations have moved
// it already — OB-095 deleted the fixed top-left hover chip, OB-096 replaced it
// with the cursor-anchored card, OB-127 now takes that card away from half its
// inputs — and a fourth is queued: OB-131 (#246) mounts `WalkDock` on this same
// pane and adds a precedence rule between this card and the walk's preview. A rule
// that is a named function can be asserted; the same condition inline in a
// 1300-line render can only be argued from a screenshot.

/** What the map puts in a card, when it puts up a card at all. */
export type HoverCard =
  | { kind: 'relation' }
  | { kind: 'node'; id: string }

export type HoverMarks = {
  /** The cell drawn with the solid spotlight: lit, and never carrying a card. */
  spotlightId: string | null
  /** What `MapTooltip` reports, or null for no card at all. */
  card: HoverCard | null
}

export type HoverSources = {
  /** The cell this pane's own pointer is over. The only input that earns a card. */
  cursorCell: string | null
  /** The selected cell. It has its own treatment, so it is never also spotlit. */
  selectedCell: string | null
  /** The cell another pane's pointer is on, republished onto the bus. */
  publishedCell: string | null
  /** The last cell clicked in another pane, which stays lit after that pointer leaves. */
  lookedAtCell: string | null
  /** The pointer is on one of the selection's relation lines rather than on territory. */
  onRelation: boolean
}

/**
 * Resolve the map's hover state into the two things it draws: a spotlit cell and
 * a card. They take different inputs on purpose — see the note at the top.
 */
export function hoverMarks(from: HoverSources): HoverMarks {
  const { cursorCell, selectedCell, publishedCell, lookedAtCell, onRelation } = from

  // A published hover that is only our own cell echoing back is dropped: that cell
  // already carries the dashed preselect, and two outlines on one cell read as a
  // bug. The look is the fallback, and it stands aside for the selection for the
  // same reason.
  const spotlightId =
    publishedCell && publishedCell !== cursorCell
      ? publishedCell
      : lookedAtCell && lookedAtCell !== selectedCell
        ? lookedAtCell
        : null

  // THE RULE. `publishedCell` and `lookedAtCell` are deliberately absent from this
  // expression: they light the map, and they stop there. A relation hover wins over
  // territory beneath it, since the two can only coexist when the pointer sits
  // exactly on the boundary between a relation's stroke and the cell under it.
  const card: HoverCard | null = onRelation
    ? { kind: 'relation' }
    : cursorCell
      ? { kind: 'node', id: cursorCell }
      : null

  return { spotlightId, card }
}
