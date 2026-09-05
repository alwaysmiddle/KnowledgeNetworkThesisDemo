/** THE VISIBILITY EYE'S ONE RULE, as a function so it can be asserted (OB-134 clause 4,
 *  #252): the eye hides THE WALK THE MAP IS DRAWING — its pins and its arrows together —
 *  and that hiding belongs to that walk, not to the map.
 *
 *  It used to be one boolean on the map. Hide walk A, switch to walk B, and B arrived
 *  hidden with no click to explain it; the only thing on screen saying a walk was loaded
 *  was a slashed eye. The DS offered two shapes that both satisfy its clause — one flag
 *  that resets to shown whenever the walk changes, or per-walk state — and asked to be
 *  told which. THIS IS PER-WALK STATE: the set of walks the eye has hidden. Switching to
 *  any walk not in the set draws it, with no click; coming back to a walk that was hidden
 *  finds it hidden, because that is what was asked of it and nothing has been asked since.
 *  Seeking, playing, zooming and changing level touch none of this, so hidden survives all
 *  four by construction rather than by four exemptions.
 *
 *  THE DRAFT IS A WALK TOO. With no saved walk active the map draws the walk desk's draft
 *  route, and the eye must be able to hide that as well; it is keyed as `'draft'` so it has
 *  a seat in the same set. A saved walk is keyed by its id. */
export type WalkKey = string

export function walkKeyOf(activeWalk: { walkId: string } | null): WalkKey {
  return activeWalk ? activeWalk.walkId : 'draft'
}

/** true when the eye has not hidden this walk */
export function walkDrawn(hidden: ReadonlySet<WalkKey>, walk: WalkKey): boolean {
  return !hidden.has(walk)
}

/** the eye clicked with `walk` on screen: hidden becomes shown and shown becomes hidden,
 *  for that walk alone. Returns a new set — state, never mutated in place. */
export function toggleWalkHidden(hidden: ReadonlySet<WalkKey>, walk: WalkKey): ReadonlySet<WalkKey> {
  const next = new Set(hidden)
  if (next.has(walk)) next.delete(walk)
  else next.add(walk)
  return next
}
