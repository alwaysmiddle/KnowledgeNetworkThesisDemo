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
import { HISTORY_EMPTY, isInSubtree, mark, parentOf, step, visit } from '../model/nav'
import type { ActiveWalkState, History, TrailEntry, TrailVia } from '../model/nav'
import type { InstrumentId } from './instruments'

export type { ActiveWalkState, History, TrailEntry, TrailVia }

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
  /** A LOOK — the one channel that MAY move a camera. Hover answers "recolour
   * what I'm pointing at"; a look asks "take me to WHERE this lives" — the map
   * flies to the node's territory at its tier and keeps it highlighted, with
   * the selection unchanged. Published by CLICKS in the Connections pane
   * (SelfNotes: hover must never pan the map), so there is no fly-home: a look
   * holds until the next look, a focus change, or the user grabbing the camera.
   * `seq` makes re-looking at the same id a fresh command — after panning away,
   * clicking the same row again must still fly. */
  peek: { id: string; seq: number } | null
  /** history steps available behind/ahead of the cursor — see back()/forward() */
  canBack: boolean
  canForward: boolean
  /** an ordered path — a built walk, or a generated curriculum */
  route: string[]
  /** the unified history engine's value (model/nav.ts) — ALL navigation-order
   * state in one dataset: the append-only log and the browsable stack+cursor
   * that back/forward walk. One writer (the bus), any number of readers. */
  history: History
  /** the log, by its familiar name — history.log, nothing more. The trail
   * strip and `visited` read provenance and don't care about the cursor. */
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
  /** clear the selection — WHERE you are, not where you have been. No trail
   * entry, and the nav history keeps its place, so back() restores exactly the
   * node you deselected. The map's water-click/Esc is the caller. */
  clearFocus(): void
  /** step the focus through the navigation history (model/nav.ts). A step IS a
   * focus write — it lands on the trail, tagged 'nav' — but unlike setFocus it
   * moves the history cursor instead of pushing. back() from a cleared focus
   * first restores the entry under the cursor. */
  back(): void
  forward(): void
  setHover(id: string | null): void
  /** the cursor LEFT this id. Guarded on purpose — moving between two elements
   * that carry the same id (a reciprocal pair lists one counterpart twice) fires
   * leave(X) then enter(X), and an unguarded leave would blank the id the enter
   * just set. Every hover participant needs this, so the bus owns it. */
  endHover(id: string): void
  /** publish a look at `id` — see BusState.peek. A click gesture, not a hover:
   * there is no end/leave counterpart. */
  peekAt(id: string): void
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
  const [peek, setPeekState] = useState<{ id: string; seq: number } | null>(null)
  const [route, setRouteState] = useState<string[]>([])
  // the unified history engine (model/nav.ts): the trail AND the back/forward
  // line are two readings of this one value
  const [hist, setHist] = useState(HISTORY_EMPTY)
  const [activeWalk, setActiveWalk] = useState<ActiveWalkState | null>(null)
  const [treeRoot, setTreeRoot] = useState(ROOT_ID)
  const [cycleNote, setCycleNote] = useState(false)

  const visited = useMemo(() => new Set(hist.log.filter((t) => byId.get(t.id)?.topic).map((t) => t.id)), [hist.log])

  /** provenance-only history write (the engine's mark), corpus-guarded */
  const markTrail = (id: string | null, via: TrailVia, jump = false) => {
    if (!id || !byId.get(id)) return
    setHist((h) => mark(h, id, via, jump))
  }

  const setFocus = (id: string, via: TrailVia, jump = false) => {
    setFocusState(id)
    setPeekState(null) // a selection supersedes any lingering look
    setHist((h) => visit(h, id, via, jump))
    // AUTO-RE-ROOT — the cockpit invariant: a focus outside the tree's current
    // root re-roots it to the node's parent. Reactive only, never on its own.
    setTreeRoot((root) => (isInSubtree(id, root) ? root : parentOf(id)))
  }

  /** land on a place the history already decided: everything setFocus does
   * EXCEPT writing history — the engine's step (or the deselect-restore's
   * mark) has done that */
  const land = (id: string) => {
    setFocusState(id)
    setTreeRoot((root) => (isInSubtree(id, root) ? root : parentOf(id)))
  }

  const back = () => {
    // a cleared focus (water-click, Esc) steps back onto the entry under the
    // cursor first — back restores what you deselected before going further
    if (focus === null && hist.cursor >= 0) {
      const id = hist.stack[hist.cursor]
      markTrail(id, 'nav')
      land(id)
      return
    }
    const s = step(hist, -1)
    if (!s) return
    setHist(s.hist)
    land(s.id)
  }

  const forward = () => {
    const s = step(hist, 1)
    if (!s) return
    setHist(s.hist)
    land(s.id)
  }

  const setRoute = (r: string[]) => {
    setRouteState(r)
    if (r.length > 0) markTrail(r[r.length - 1], 'walk')
  }

  const activateWalk = (walkId: string, stopIndex: number) => {
    const w = WALKS.find((x) => x.id === walkId)
    if (!w || stopIndex < 0 || stopIndex >= w.stops.length) return
    setActiveWalk({ walkId, cursor: stopIndex })
    reveal('trail') // the next-stop controls live there
    setRoute(w.stops.slice(0, stopIndex + 1).map((s) => s.id))
  }

  // the hover/peek writers are the only ones that must be REFERENTIALLY STABLE:
  // useHover memoizes its binding on them, and an unstable setter would rebuild
  // every element's handlers on every render. clearFocus joins them so the
  // map's Esc listener (deps-bound) never re-subscribes.
  const setHover = useCallback((id: string | null) => setHoverState(id), [])
  const endHover = useCallback((id: string) => setHoverState((h) => (h === id ? null : h)), [])
  const peekAt = useCallback((id: string) => setPeekState((p) => ({ id, seq: (p?.seq ?? 0) + 1 })), [])
  const clearFocus = useCallback(() => {
    setFocusState(null)
    setPeekState(null) // "stand nowhere" drops the look-highlight too
  }, [])

  return {
    focus,
    hover,
    peek,
    route,
    history: hist,
    trail: hist.log,
    visited,
    activeWalk,
    treeRoot,
    cycleNote,
    canBack: hist.cursor > 0 || (focus === null && hist.cursor >= 0),
    canForward: hist.cursor < hist.stack.length - 1,

    setFocus,
    clearFocus,
    back,
    forward,
    setHover,
    endHover,
    peekAt,
    setRoute,
    setTreeRoot,
    reveal,
    visit: markTrail,
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
      setPeekState(null)
      setRouteState([])
      setHist(HISTORY_EMPTY)
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
