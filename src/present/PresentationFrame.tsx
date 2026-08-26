// THE DECK — the Studio with the furniture taken away, one walk stop at a time.
//
// WHAT A SLIDE IS HERE. A slide is a walk stop. A deck is a walk — the saved one
// if one is playing, otherwise the road currently open on the desk. There is no
// slide document, no per-slide layout, no second authoring surface: the walk
// editor already authors decks, and this only plays them. One frame serves every
// slide and only the focused node changes (#195).
//
// WHY IT IS A SIBLING BRANCH OF StudioView'S RETURN, NOT AN OVERLAY ON TOP OF IT.
// An overlay would leave the desk mounted underneath, which means TWO live
// MapViews and two DocumentPanels — two window Escape listeners, two camera
// flights racing each other, and duplicate aria-labels that turn every driver
// locator into a strict-mode violation. Rendering instead of, not over, keeps
// exactly one instance of everything. It also needs no modal primitive, which
// the DS does not have: App.tsx already gives us a full-height main.
//
// THE CHROME COMES OFF BY NOT PUTTING IT ON. StudioView's `pane()` is the only
// thing that wraps an instrument in a DS Pane with its title bar and ✕; calling
// `render(bus)` directly is all "chrome off" means. Every instrument here is the
// same component the Studio mounts, unchanged.
//
// KNOWN LIMITATION, SLICE 1. Instruments unmount on the way in and on the way
// out, so the map's camera and the unfold canvas reset each way. Everything that
// identifies WHERE YOU ARE — focus, route, trail, visited, the active walk, the
// composition you had — is on the shared bus and survives exactly. The camera is
// re-derived rather than preserved: on entry we peek at the current stop, which
// flies the map there. That is the honest reading of "continuous orientation" —
// the same place, not the same pixels.

import { useEffect, useRef } from 'react'

import { IconButton, PaneScroller, usePresence } from '@/ds'

import { useWalkPlayback } from '../instruments/walkdesk/playback'
import { platform } from '../platform'
import { byInstrument } from '../studio/instruments'
import type { InstrumentId } from '../studio/instruments'
import type { Bus } from '../studio/bus'
import { usePresentationKeys } from './session'

/** The three instruments a deck is made of, in the order the eye should take
 *  them. `as const satisfies` makes a typo here a COMPILE error rather than a
 *  runtime throw, since InstrumentId is derived from the registry itself — the
 *  same idiom instruments.tsx uses for VIEWS. */
const PRESENT_SLOTS = {
  document: 'document',
  map: 'map',
  sequence: 'walkviewer',
} as const satisfies Record<string, InstrumentId>

/** The map's share of the upper region. The DOCUMENT IS THE HERO — this is a
 *  ceiling on the reference material, not a target for it, which is why it is a
 *  max and not a fixed width: on a wide projector every pixel past 560 goes to
 *  the prose. The floor exists because MapView's own level bar wraps below it. */
const MAP_BASIS = '0 1 34%'
const MAP_MIN = 340
const MAP_MAX = 560

export default function PresentationFrame({
  bus,
  onExit,
  fullscreen = false,
}: {
  bus: Bus
  onExit: () => void
  /** the HOST window's fullscreen bit — carried here only so a driver can read
   *  it. The deck does not care: it looks and behaves identically either way,
   *  which is the point of keeping the two flags apart. */
  fullscreen?: boolean
}) {
  const play = useWalkPlayback(bus)
  const rootRef = useRef<HTMLDivElement>(null)
  const exitShown = usePresence(rootRef)

  /** move the deck. `play.seek` owns the walk (cursor, focus, route); this adds
   *  the ONE thing that is true only in a deck — the map follows.
   *
   *  peekAt lives here rather than inside useWalkPlayback on purpose. In the
   *  Studio, dragging the Walk·Viewer's seek bar must NOT yank the map's camera:
   *  a pane that flies somewhere because you clicked a different pane is a
   *  surprise, and MapView's own comments already argue that case. In a deck the
   *  opposite is true — a map that does not follow the walk is decoration. Same
   *  hook, two gestures, and the difference belongs to the gesture. */
  const go = (i: number) => {
    const step = play.steps[i]
    if (!step) return
    play.seek(i)
    bus.peekAt(step.id)
  }

  usePresentationKeys(true, {
    next: () => go(play.cursor + 1),
    prev: () => go(play.cursor - 1),
    first: () => go(0),
    last: () => go(play.steps.length - 1),
    exit: onExit,
  })

  // Land on the current stop when the deck opens, so the map arrives where the
  // walk is rather than wherever it was left. In a rAF frame because writing bus
  // state synchronously in an effect body is what react-hooks/set-state-in-effect
  // forbids — the same shape MapView uses for its own arrival writes.
  useEffect(() => {
    const f = requestAnimationFrame(() => go(play.cursor))
    return () => cancelAnimationFrame(f)
    // once, on open — re-running this on every cursor change would fight the
    // presenter for control of the camera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Mount one instrument with no chrome, applying the SAME body rule Pane does
   *  — read off the registry rather than remembered here, so an instrument that
   *  changes shape cannot silently break the deck. `actionBar` is dropped on
   *  purpose: it is chrome, and a deck has none. */
  const mount = (id: InstrumentId) => {
    const inst = byInstrument.get(id)!
    return inst.body === 'none' ? inst.render(bus) : <PaneScroller>{inst.render(bus)}</PaneScroller>
  }

  const empty = play.steps.length === 0

  return (
    <div ref={rootRef} aria-label="presentation" className="relative h-full min-h-0 flex flex-col bg-canopy">
      {/* THE UPPER REGION — prose first, territory beside it. Stacks on a narrow
          window, and the map is never above the document in either arrangement. */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 p-3">
        {/* No overflow-hidden: the DS forbids a rounded clip wrapped around a
            scroller, and PaneScroller clips itself. */}
        <div
          aria-label="present-document"
          className="flex-1 min-w-0 min-h-0 flex flex-col rounded-lg border border-frame bg-paper"
        >
          {mount(PRESENT_SLOTS.document)}
        </div>

        {/* MapView's root is a PaneCanvas with flex:1, which resolves against
            nothing in a plain block and collapses the SVG — hence flex-col plus a
            definite height here. The rounding is load-bearing too: PaneCanvas
            looks up its own corner radius from a rounded ancestor and falls back
            to a hard 20px arc if it finds none. */}
        <div
          aria-label="present-map"
          className="min-w-0 min-h-0 flex flex-col overflow-hidden rounded-lg border border-frame h-[34vh] min-h-[220px] lg:h-auto"
          style={{ flex: MAP_BASIS, minWidth: MAP_MIN, maxWidth: MAP_MAX }}
        >
          {mount(PRESENT_SLOTS.map)}
        </div>
      </div>

      {/* THE SEQUENCE — where the deck says how far along it is. Height comes
          from the registry's own number for this instrument rather than a second
          copy of it here. */}
      <div
        aria-label="present-sequence"
        className="shrink-0 mx-3 mb-3 flex flex-col min-w-0 rounded-lg border border-frame bg-paper"
        style={{ height: byInstrument.get(PRESENT_SLOTS.sequence)!.height }}
      >
        {mount(PRESENT_SLOTS.sequence)}
      </div>

      {empty && (
        <div
          aria-label="present-empty"
          className="absolute inset-x-0 top-1/2 text-center text-[var(--fs-caption)]"
          style={{ color: 'var(--text-3)' }}
        >
          nothing to present — the road is empty, or every stop is still an unbound slot
        </div>
      )}

      {/* Arrives with the pointer and recedes on its own clock, the same manners
          as a pane's ✕ — a presenter should not be presenting a close button.
          `title` is also the accessible name, which is what a driver locates. */}
      <div aria-label="present-exit" className="absolute top-2 right-2 z-10">
        <IconButton reveal={exitShown} onClick={onExit} title="exit presentation (Esc)" />
      </div>

      {/* Machine-readable readout for the spike drivers. The studio header's own
          data-focus twin is unmounted while presenting, and this must NOT reuse
          that attribute name — two elements publishing it would make every
          existing locator ambiguous.

          `data-present-host` is a READOUT of which implementation answered the
          platform seam, and the only way a driver can tell a real desktop host
          from `webPlatform` quietly winning (#202). Reading `platform.name` is
          the sanctioned use of it; the #211 host-shape ban in eslint.config.js
          forbids COMPARING it, which is the thing that would throw capability
          away. */}
      <span
        data-present-step={play.cursor}
        data-present-count={play.steps.length}
        data-present-focus={bus.focus ?? ''}
        data-present-fullscreen={fullscreen ? 1 : 0}
        data-present-host={platform.name}
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}
      />
    </div>
  )
}
