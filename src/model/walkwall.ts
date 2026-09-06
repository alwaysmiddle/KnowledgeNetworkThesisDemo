// THE WALK ON THE WALL — how the map draws a lecture's walk when the professor holds
// the map up to the room (#267, DS OB-139 rule 4). A still picture: every stop a
// pin, the covered stops and the stop on the wall joined by the walk line, that stop
// lit, and NO recency band — the room is looking to see where it has been and where
// it is going, and a band with nothing moving would hide the past for no reason.
//
// Pure, so MapView's wall mode and the projector window read one rule. A map pin can
// stand for a RUN of stops at a coarse level (walkpins.ts: `step`..`stepEnd`, 1-based);
// the wall's facts are 0-based stop indices, the presenter's own.

/** what the wall knows: the stop the room is looking at, and the stops actually presented */
export interface WallView {
  /** the stop on the wall — the active stop, or the roam — 0-based */
  lit: number
  /** the stops the record has left behind, 0-based; a skip is a gap */
  covered: readonly number[]
}

/** a pin's face on the wall: `current` when the lit stop is inside its run, `done` when
 *  every stop of its run was covered, `ahead` otherwise */
export function wallPinState(pin: { step: number; stepEnd: number }, wall: WallView): 'current' | 'done' | 'ahead' {
  const lit = wall.lit + 1
  if (lit >= pin.step && lit <= pin.stepEnd) return 'current'
  for (let s = pin.step; s <= pin.stepEnd; s++) if (!wall.covered.includes(s - 1)) return 'ahead'
  return 'done'
}

/** the walk line joins the covered stops and the lit one, in walk order: the arrow from
 *  one pin to the next is drawn only when BOTH pins are on that line */
export function wallArrowShown(from: { step: number; stepEnd: number }, to: { step: number; stepEnd: number }, wall: WallView): boolean {
  return wallPinState(from, wall) !== 'ahead' && wallPinState(to, wall) !== 'ahead'
}
