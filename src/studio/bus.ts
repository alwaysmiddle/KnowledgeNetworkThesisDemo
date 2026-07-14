// The Studio bus — the session state every instrument shares, as a DECLARED
// contract rather than a pile of hand-wired props.
//
// It used to be six useStates and eight closures inside StudioView, reaching
// each instrument through props that every pane spelled differently: "the
// focused node" was currentId, focus, or treeRootId depending on who you asked,
// and "focus this" was onSelect / onSelectChild / onFocus / onOpen / onJump /
// onSelectTrailEntry. Adding one channel (hover, 2026-07-14) therefore touched
// four files and copy-pasted the same guarded enter/leave three times.
//
// With the bus, a new channel is ONE field below plus its writer. An instrument
// that ignores it does not change. That is the whole point, and it is the thing
// that makes the next feature cheap instead of frightening.

import { useCallback, useMemo, useState } from 'react'

import { byId, ROOT_ID } from '../corpus/graph'
import { WALKS } from '../corpus/walks'
import { curriculum } from '../model/lens'
import { isInSubtree, parentOf } from '../model/nav'
import type { ActiveWalkState, TrailEntry, TrailVia } from '../model/nav'
import type { InstrumentId } from './instruments'

export type { ActiveWalkState, TrailEntry, TrailVia }

// ── What instruments may READ ───────────────────────────────────────────────
export interface BusState {
  /** the selected node — null only before the first click anywhere */
  focus: string | null
  /** TRANSIENT, display-only. An instrument may recolour on it and nothing
   * else: no trail entry, no re-root, no camera move.
   *
   * It carries NO source tag, unlike focus, and that is not an oversight. A
   * hover write is idempotent — an instrument that receives back the id it just
   * published lights up exactly the thing under its own cursor, which is what it
   * wanted anyway. There is no echo to suppress, so one id is the whole bus. */
  hover: string | null
  /** an ordered path — a built walk, or a generated curriculum */
  route: string[]
  /** append-only history, via-tagged, jumps accented */
  trail: TrailEntry[]
  /** DERIVED from the trail (topics only, matching the grain the header counts).
   * Never written — a channel with two writers is a channel with a bug. */
  visited: ReadonlySet<string>
  activeWalk: ActiveWalkState | null
  /** the tree instrument's root — auto-re-rooted, REACTIVELY, by setFocus */
  treeRoot: string
  /** the last generated curriculum had to break a cycle, so its order is
   * approximate and the header says so */
  cycleNote: boolean
}

// ── What instruments may WRITE ──────────────────────────────────────────────
export interface BusActions {
  /** focus + a trail entry tagged with where the click came from. `via` is
   * provenance, not routing: it colours the trail chip and nothing else. */
  setFocus(id: string, via: TrailVia, jump?: boolean): void
  setHover(id: string | null): void
  /** the cursor LEFT this id. Guarded on purpose — moving between two elements
   * that carry the same id (a reciprocal pair lists one counterpart twice) fires
   * leave(X) then enter(X), and an unguarded leave would blank the id the enter
   * just set. Every hover participant needs this, so the bus owns it. */
  endHover(id: string): void
  setRoute(r: string[]): void
  clearRoute(): void
  setTreeRoot(id: string): void
  /** a trail entry with NO focus change — Unfold·Graph places a node on its own
   * canvas without dragging the rest of the Studio there */
  visit(id: string, via: TrailVia): void
  activateWalk(walkId: string, stopIndex: number): void
  advanceWalk(): void
  deactivateWalk(): void
  /** generate a prerequisite curriculum over the focused topic and walk it */
  teach(): void
  /** clear WHERE you are, not WHAT you have on screen */
  reset(): void
  /** reveal a pane without disturbing an already-active composition */
  reveal(inst: InstrumentId): void
}

export type Bus = BusState & BusActions

export function useStudioBus(reveal: (inst: InstrumentId) => void): Bus {
  const [focus, setFocusState] = useState<string | null>(null)
  const [hover, setHoverState] = useState<string | null>(null)
  const [route, setRouteState] = useState<string[]>([])
  const [trail, setTrail] = useState<TrailEntry[]>([])
  const [activeWalk, setActiveWalk] = useState<ActiveWalkState | null>(null)
  const [treeRoot, setTreeRoot] = useState(ROOT_ID)
  const [cycleNote, setCycleNote] = useState(false)

  const visited = useMemo(() => new Set(trail.filter((t) => byId.get(t.id)?.topic).map((t) => t.id)), [trail])

  // append-only, but a write identical to the tip is dropped — one click fans
  // out to several writers on this bus, and re-clicking a pin should not spam
  // the strip with duplicate chips
  const appendTrail = (id: string | null, via: TrailVia, jump = false) => {
    if (!id || !byId.get(id)) return
    setTrail((t) => (t.length > 0 && t[t.length - 1].id === id ? t : [...t, { id, via, jump }]))
  }

  const setFocus = (id: string, via: TrailVia, jump = false) => {
    setFocusState(id)
    appendTrail(id, via, jump)
    // AUTO-RE-ROOT — the cockpit invariant: a focus outside the tree's current
    // root re-roots it to the node's parent. Reactive only, never on its own.
    setTreeRoot((root) => (isInSubtree(id, root) ? root : parentOf(id)))
  }

  const setRoute = (r: string[]) => {
    setRouteState(r)
    if (r.length > 0) appendTrail(r[r.length - 1], 'walk')
  }

  const activateWalk = (walkId: string, stopIndex: number) => {
    const w = WALKS.find((x) => x.id === walkId)
    if (!w || stopIndex < 0 || stopIndex >= w.stops.length) return
    setActiveWalk({ walkId, cursor: stopIndex })
    reveal('trail') // the next-stop controls live there
    setRoute(w.stops.slice(0, stopIndex + 1).map((s) => s.id))
  }

  // the hover writers are the only ones that must be REFERENTIALLY STABLE:
  // useHover memoizes its binding on them, and an unstable setter would rebuild
  // every element's handlers on every render
  const setHover = useCallback((id: string | null) => setHoverState(id), [])
  const endHover = useCallback((id: string) => setHoverState((h) => (h === id ? null : h)), [])

  return {
    focus,
    hover,
    route,
    trail,
    visited,
    activeWalk,
    treeRoot,
    cycleNote,

    setFocus,
    setHover,
    endHover,
    setRoute,
    setTreeRoot,
    reveal,
    visit: appendTrail,
    activateWalk,
    advanceWalk: () => activeWalk && activateWalk(activeWalk.walkId, activeWalk.cursor + 1),
    deactivateWalk: () => setActiveWalk(null),
    clearRoute: () => {
      setRouteState([])
      setActiveWalk(null)
      setCycleNote(false)
    },
    teach: () => {
      if (!focus) return
      const c = curriculum(focus, 'depends_on', 3)
      setRoute(c.order)
      setCycleNote(c.hadCycle)
      reveal('walk')
      reveal('nested')
    },
    reset: () => {
      // deliberately does NOT touch the unfold canvas or the composition —
      // "reset session" clears WHERE you are, not WHAT you have on screen
      setFocusState(null)
      setHoverState(null)
      setRouteState([])
      setTrail([])
      setActiveWalk(null)
      setCycleNote(false)
    },
  }
}

// ── The hover binding ───────────────────────────────────────────────────────
export interface HoverBinding {
  lit(id: string): boolean
  /** Spread onto any element to join the hover channel.
   *
   * The `data-lit` attribute comes free, and that is deliberate: the screenshot
   * driver asserts on `[data-lit="1"]`, so an instrument that joins the channel
   * is covered by the assertion that already exists, without anyone remembering
   * to hand-write the test hook. Hooks should be structural, not remembered. */
  bind(id: string): {
    onPointerEnter: () => void
    onPointerLeave: () => void
    'data-lit': 0 | 1
  }
}

export function useHover(bus: Bus): HoverBinding {
  const { hover, setHover, endHover } = bus
  return useMemo(
    () => ({
      lit: (id: string) => hover === id,
      bind: (id: string) => ({
        onPointerEnter: () => setHover(id),
        onPointerLeave: () => endHover(id),
        'data-lit': (hover === id ? 1 : 0) as 0 | 1,
      }),
    }),
    [hover, setHover, endHover],
  )
}
