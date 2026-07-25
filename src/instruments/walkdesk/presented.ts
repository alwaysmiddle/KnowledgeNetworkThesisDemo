// What the PRESENTATION instruments read while they are unwired (#20).
//
// Columns and the layer stack used to be two zones inside the Walk·Desk, fed by
// the desk's own draft. #20 split them out into instruments the Studio composes
// like any other, on the reasoning that they do a different job: they PRESENT a
// resolved road — they never see a fork, never edit, and take no drop. A preview
// belongs beside an editor, not inside it.
//
// Wiring them to the desk's live route is #14's job, deliberately not this one.
// Until then they read the AUTHORED plan from mockwalk: a real four-tier walk
// with a sub-walk by reference and a deliberate revisit. That is better material
// than the desk's editing seed, and it makes the missing wire obvious — what you
// see here is A plan, not YOUR plan.

import { useState } from 'react'

import { isBox, PLAN, resolveRoad } from './mockwalk'
import type { Stop } from './mockwalk'

/** the authored plan, resolved: every container down to one variant, optionals
 * all on the road */
export const PRESENTED_ROAD: Stop[] = resolveRoad(PLAN.stops, {}, true)

/** The drill path a presentation view owns while it is unwired.
 *
 * Each instrument gets its OWN, so the columns and the stack can now disagree
 * about which tier is open — something they could not do inside the desk, which
 * handed both the same controlled stops/path/pick triple. That divergence is the
 * honest cost of splitting before wiring, and it is exactly what #14 closes: one
 * drill path on the bus, both views controlled by it again. */
export function useDrill() {
  const [path, setPath] = useState<string[]>([])
  const pick = (col: number, s: Stop) =>
    setPath(isBox(s) ? [...path.slice(0, col), s.key] : path.slice(0, col))
  return { path, pick }
}
