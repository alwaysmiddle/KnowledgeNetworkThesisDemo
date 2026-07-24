// The Walk·Desk — what is left once each job took its own pane, and now a wide
// bottom STRIP rather than a column (#21). It is the plan's supply and its
// receipt, stacked:
//
//   the PALETTE feeds the draft — search the corpus, drag or click a topic onto
//   the road. A stand-in for the map instrument: the whole feed contract is
//   `pal:<nodeId>` on text/plain, so the real map beside it is a dragstart
//   handler away, not a redesign. That map is now literally beside it in the
//   Authoring preset, which is the point of the google-maps framing on #20.
//
//   the FRINGE STRIP is the receipt — the flat route the bus would read at this
//   expansion. resolveRoad() is the seam it reads through: pick a branch per
//   fork, drop skipped optionals, and what comes out is a plain linear walk.
//
// A strip because both halves are WIDE and SHORT by nature — a wrapping tag
// cloud and a single row of chips. That is the same grain argument review 4
// made about the desk's zones; it just decides the pane's slot now instead of
// its internal layout.
//
// The history that led here: the walk-tiers spike (#11) produced ONE combined
// desk; #13/#17 fixed its editor; reviews 3–5 rebalanced and then simplified it
// (double-click groups, the aside cut); #20 moved the reading views out into
// Walk·Columns and Walk·Stack; #21 moved the railroad out too. resolveRoad()
// survived all of it unchanged — the clearest sign it was the right seam.
//
// Bus surface, deliberately minimal: this JOINS the hover channel (useHover) so
// its stops light up in any composed instrument, and nothing else. The draft
// itself lives in authordraft.ts's shared stores, which the railroad reads too;
// publishing the resolved route on bus.route is #14, and bridging the draft to
// walks.ts is #16.

import { allKeysOf, useAuthorDraft, useRoad } from './authordraft'
import { fringe, resolveRoad } from './mockwalk'
import Palette from './Palette'
import { FringeStrip } from './shared'
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'

export default function WalkDeskView({ bus }: { bus: Bus }) {
  const sync = useHover(bus)
  const state = useAuthorDraft()
  const { choices, withOptionals } = useRoad()

  const resolved = resolveRoad(state.stops, choices, withOptionals)

  return (
    <div className="h-full flex flex-col" data-desk>
      <Palette state={state} sync={sync} />
      <FringeStrip entries={fringe(resolved, allKeysOf(resolved))} sync={sync} />
    </div>
  )
}
