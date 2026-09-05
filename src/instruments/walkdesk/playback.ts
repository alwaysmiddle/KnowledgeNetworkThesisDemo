// HOW A WALK IS PLAYED — one definition of "what are the steps, where is the
// cursor, and what happens when it moves", shared by every surface that walks a
// walk. `WalkViewer`'s strip and the presentation frame's keyboard are two
// gestures over this one model, not two models that happen to agree.
//
// It lives beside `presented.ts` because half of the dual source below IS the
// desk: the draft is `authordraft.ts`'s singleton. Not in `src/model/`, whose
// rule is "pure and synchronous, no React"; not in `src/present/`, which would
// make a plain instrument depend on the presentation shell and invert the seam.
//
// TWO SOURCES, ONE CURSOR. A saved walk (`bus.activeWalk`, started from Trail or
// the document panel) wins when one is playing; otherwise this plays the draft
// currently open on the walk desk, live. That branch was written twice before —
// once here and once in the keyboard player — which is exactly how a strip and a
// deck end up disagreeing about which stop is stop 4.
//
// THE FOCUS WRITE IS NEW, AND IT IS A FIX. `bus.activateWalk` sets `activeWalk`
// and the walked route prefix and NOTHING ELSE — it has never written
// `bus.focus` (bus.ts: activateWalk -> setRoute, neither touches focus). So
// until now, playing a SAVED walk moved the strip and the map pins but left the
// document sitting on whatever was last clicked. A navigator that does not
// navigate is the bug; `seek` writes the focus for both sources, once.

import { useEffect, useRef, useSyncExternalStore } from 'react'

import { WALK_PLAYBACK_DEFAULTS } from '@/ds'
import type { WalkStep } from '@/ds'

import { byId } from '../../corpus/graph'
import { walkById } from '../../model/walkstore'
import type { Walk } from '../../model/walkstore'
import { leafStops } from './mockwalk'
import type { Stop } from './mockwalk'
import { usePresentedRoad } from './presented'
import type { Bus } from '../../studio/bus'

/** ONE STEP of a walk being played. Extends the DS's own `WalkStep` — id, title,
 *  note, optional — so the player and the strip it feeds cannot drift apart
 *  about what a step is.
 *
 *  `stop` IS THE FORK DOOR (#195). It carries the resolved `Stop` this step came
 *  from rather than discarding it. Today that is only provenance: `resolveRoad`
 *  has already collapsed every fork at authoring time, so each one is a leaf.
 *  It is kept because of what it costs to add back later — a player handed a
 *  flat `string[]` has nothing to read when a fork should raise a chooser, and
 *  would need a second structure running in parallel with `steps`. With the stop
 *  carried, a present-time chooser is a local change: resolve the road lazily up
 *  to the first unresolved container, and the shell reads `variants.length > 1`
 *  on the step ahead of the cursor and offers the lanes instead of advancing.
 *  `steps`, `cursor` and `seek` keep their shapes; `WalkViewer` needs no edit. */
export interface PlayStep extends WalkStep {
  stop?: Stop
}

/** which of the two sources is playing. Exposed so a caller can preserve a
 *  source-dependent behaviour of its own (WalkViewer opts out of publishing the
 *  route while a saved walk owns it) without re-deriving the branch. */
export type PlaySource = 'saved' | 'draft'

export interface Playback {
  source: PlaySource
  /** what to call this walk on screen — the saved walk's title, or a stand-in
   *  line for the draft, which has no name until it is saved (#16). */
  title: string
  steps: PlayStep[]
  /** always within [0, steps.length - 1]; 0 for an empty walk */
  cursor: number
  atStart: boolean
  atEnd: boolean
  /** THE ONLY MUTATOR. next/prev/first/last are defined in terms of it, so a
   *  future chooser that must interpose a decision between i and i+1 changes one
   *  function rather than five call sites. Out of range is a silent no-op — the
   *  end of a walk is a fact, not an error, and a presenter pressing → once more
   *  than there are slides should get nothing, not a crash. */
  seek(i: number): void
  next(): void
  /** THE CLOCK (#246). True while the walk advances on its own, one stop per
   *  `WALK_PLAYBACK_DEFAULTS.step` milliseconds (the DS's 900), stopping by itself
   *  at the last stop. ONE clock for every surface: the viewer's strip, the map's
   *  dock and the presenter all read the same flag and any of them may toggle it,
   *  so pressing play on the map and pause on the strip is one gesture on one
   *  walk, not two players disagreeing. The clock moves the INTEGER cursor — the
   *  dock's fractional travel between stops (DS OB-130 clause 5) is not built;
   *  the knob steps. */
  playing: boolean
  toggle(): void
  prev(): void
  first(): void
  last(): void
}

// ── pure core ───────────────────────────────────────────────────────────────
// Split out because vitest here runs `environment: 'node'` with no DOM — hooks
// cannot be tested, but the arithmetic and the projection can, and they are the
// parts that would break silently. Same split as floatingPanelRect.ts.

/** the played steps, from whichever source is live. Saved walks are already flat
 *  ({id, note} — no containers, no optionals, no variants); a draft road is a
 *  resolved tree that still has to be walked down to its leaves. */
export function playSteps(saved: Walk | null, road: Stop[]): PlayStep[] {
  return saved
    ? saved.stops.map((s) => ({ id: s.id, title: byId.get(s.id)!.title, note: s.note }))
    : leafStops(road).map((s) => ({ id: s.node, title: byId.get(s.node)!.title, note: s.note, optional: s.optional, stop: s }))
}

/** a cursor that is always a valid index, or 0 when there is nothing to index.
 *  The raw value outlives the list it points into — deleting stops in the editor
 *  leaves `draftCursor` past the end, and it must not be allowed to reach a
 *  consumer that way. */
export function clampCursor(raw: number, len: number): number {
  if (len <= 0) return 0
  return Math.min(Math.max(raw, 0), len - 1)
}

/** whether the route the map draws IS the walk being played — the dock's mount
 *  condition (#246). `bus.route` has three writers: `activateWalk` publishes the
 *  played PREFIX of a saved walk, `presented.ts` publishes the desk draft's leaf
 *  ids whole, and `bus.teach` publishes a curriculum that is no walk at all. The
 *  first two are a prefix of the played steps (the whole list counts as a
 *  prefix); the third is not, and an empty route is nothing to dock onto. */
export function routeIsWalk(route: readonly string[], steps: readonly { id: string }[]): boolean {
  return route.length > 0 && route.length <= steps.length && route.every((id, i) => steps[i].id === id)
}

/** where one tick of the clock moves the cursor, or null when the walk is at
 *  its end and the clock should stop instead. */
export function nextOnTick(cursor: number, len: number): number | null {
  return cursor + 1 < len ? cursor + 1 : null
}

// ── the clock ───────────────────────────────────────────────────────────────
// Module-level on purpose: `playing` is a fact about THE walk, not about any one
// pane, and three panes mount this hook. Each mounted instance registers its
// own ticker; the interval fires the FIRST one only, and since every instance
// derives the same steps and cursor from the same bus, which one advances the
// walk does not matter. When the last instance unmounts the next tick finds no
// ticker and stops the clock.

let playing = false
const watchers = new Set<() => void>()
const tickers = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function tick() {
  const first = tickers.values().next().value
  if (first) first()
  else setPlaying(false)
}

function setPlaying(next: boolean) {
  if (next === playing) return
  playing = next
  if (playing) timer = setInterval(tick, WALK_PLAYBACK_DEFAULTS.step)
  else if (timer) { clearInterval(timer); timer = null }
  for (const w of watchers) w()
}

const subscribe = (w: () => void) => { watchers.add(w); return () => { watchers.delete(w) } }
const snapshot = () => playing

// ── the hook ────────────────────────────────────────────────────────────────

export function useWalkPlayback(bus: Bus): Playback {
  const road = usePresentedRoad()
  const saved = bus.activeWalk ? (walkById(bus.activeWalk.walkId) ?? null) : null

  // No useMemo: usePresentedRoad already memoizes the expensive half
  // (resolveRoad), and mapping a walk's worth of stops per render is nothing.
  // Adding a hand-written memo here is what react-hooks/preserve-manual-
  // memoization exists to reject.
  const steps = playSteps(saved, road)
  const cursor = clampCursor(saved ? bus.activeWalk!.cursor : bus.draftCursor, steps.length)

  const seek = (i: number) => {
    const s = steps[i]
    if (!s) return
    if (saved) bus.activateWalk(saved.id, i)
    else bus.setDraftCursor(i)
    // both sources, one focus write — see the header. 'walk' is the via-tag that
    // colours the trail chip and tells every listening pane where the move came
    // from.
    bus.setFocus(s.id, 'walk')
  }

  const isPlaying = useSyncExternalStore(subscribe, snapshot)
  // the ticker must read THIS render's cursor, steps and seek. They land in a ref
  // from an effect after every render (a ref written during render is what
  // react-hooks/refs forbids; an effect keyed on `seek`, a fresh closure per
  // render, is what exhaustive-deps warns about), and the ticker itself is
  // registered once and reads the ref when the clock fires.
  const latest = useRef({ cursor, len: steps.length, seek })
  useEffect(() => { latest.current = { cursor, len: steps.length, seek } })
  useEffect(() => {
    const t = () => {
      const now = latest.current
      const to = nextOnTick(now.cursor, now.len)
      if (to === null) setPlaying(false)
      else now.seek(to)
    }
    tickers.add(t)
    return () => { tickers.delete(t) }
  }, [])

  return {
    source: saved ? 'saved' : 'draft',
    title: saved ? saved.title : 'the road you are authoring',
    steps,
    cursor,
    atStart: cursor <= 0,
    atEnd: cursor >= steps.length - 1,
    seek,
    next: () => seek(cursor + 1),
    prev: () => seek(cursor - 1),
    first: () => seek(0),
    last: () => seek(steps.length - 1),
    playing: isPlaying,
    // play at the end restarts from the first stop, the way every player does
    toggle: () => {
      if (isPlaying) { setPlaying(false); return }
      if (steps.length === 0) return
      if (cursor >= steps.length - 1) seek(0)
      setPlaying(true)
    },
  }
}
