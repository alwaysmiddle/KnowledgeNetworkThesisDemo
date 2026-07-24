// The Palette as its own instrument (#21) — where stops come FROM. Search the
// corpus, then drag or click a topic onto the road.
//
// It is a stand-in for the map: the whole feed contract is `pal:<nodeId>` on
// text/plain, so the real map beside it is a dragstart handler away, not a
// redesign. The Authoring preset now literally puts the two side by side, which
// is what the google-maps framing on #20 was asking for — the territory you can
// see, and the filtered list of what is in it.
//
// This wrapper exists to JOIN the bus (hover) and the shared draft; Palette
// itself is presentation plus two callbacks, and stays reusable.

import { useAuthorDraft } from './authordraft'
import Palette from './Palette'
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'

export default function PaletteView({ bus }: { bus: Bus }) {
  const sync = useHover(bus)
  const state = useAuthorDraft()

  return (
    <div data-palette className="h-full flex flex-col">
      <Palette state={state} sync={sync} />
    </div>
  )
}
