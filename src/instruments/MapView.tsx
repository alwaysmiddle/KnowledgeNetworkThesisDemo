// Map — the "territory at every level" instrument, and the Studio's only map.
// It ABSORBED the flat MapView in 25734fa ("one map"), which is why this file
// carries that name again: same geography as that one (same embedding, same
// countries and provinces), but EVERY node owns
// a convex territory that its children tile exactly (model/nested.ts), so
// zooming discloses region tiers in place.
//
// SNAP-ONLY + NODE-AS-COUNTRY (2026-07-12): free zooming is gone — the wheel
// steps whole levels, double-click dives one, so every frame the user sees is
// one of the L0..maxTier canonical scales and each level is an AUTHORED style,
// not an interpolated in-between (this is what removed the mid-transition
// artifacts and the unreadable type of the free-zoom era). At level k the
// level-k nodes ARE the countries: pale tree-color fill (model/color.ts),
// own label — wrapped to fit inside the cell, or dropped when even the best
// two-line split overflows (2026-07-13: capital dots removed with the same
// stroke — fill + border + name already said "a node lives here" three ways)
// — and the ONLY hit targets: clicking a cell selects that node, never its
// ancestor. Ancestors follow ONE formal rule — the
// CONTEXT WINDOW (below): only the immediate parent grain (d = level − tier
// = 1) renders at all, as a full-emphasis border plus one watermark ghost;
// every grain above it disappears entirely. Branches
// that bottom out early persist as leaf countries at
// every deeper level, slightly muted ("no more depth here") — jagged
// hierarchies never leave holes in the map.
//
// Relations stay a SELECTION overlay, drawn AT THE SELECTED LEVEL
// (2026-07-13): edges live at the topic grain, so a selection above it (a
// domain or module) ROLLS ITS EDGES UP — every underlying topic edge maps to
// the counterpart's region at the same tier, and edges internal to the
// selection drop. Children's relationships are never drawn raw across a
// coarser map, and a selection BELOW the topic grain draws no roads at all
// (2026-07-17): a deep cell has no edges of its own, and borrowing the owning
// topic's made every relation-less child look connected — the selection tint
// is all it gets. The overlay is pinned until a re-click of the same cell, a
// water-click or Esc. All text and hairlines are sized in SCREEN pixels
// (pane-fit compensated) — at canonical scales the same style table renders
// identically at every level.
//
// ONE ROAD PER PAIR (2026-07-14): whatever the grain, every arrow between the
// same two cells COLLAPSES into a single line carrying a ×n traffic count.
// Before, four links between two topics were four curves fanned apart by a
// bulge index, and a reciprocal pair was two arrows bowed past each other —
// geometrically honest, cartographically unreadable. A map answers "is there a
// road here, and how busy is it"; one road, one number. A bundle of mixed types
// is drawn slate (no type color would be true), and a bundle running BOTH ways
// gets no arrowhead at all — which links, of which type, in which direction is
// the Connections star's question, and it is one pane away.

// The DERIVATION lives in model/atlas.ts (2026-07-14) — which roads a selection
// draws, how they roll up to a coarser grain, how parallel links collapse into
// one road. It is a pure function of the corpus and one id, it is the piece a
// walk route would reuse, and it has its own tests. What is left here is what a
// component should be: a camera, a hover, and a paint order.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { ARROW_METRICS, LevelPicker, MapFloatingButton, MapTooltip, NodeArrow, PaneCanvas, PIN_RING_WIDTH, StepDot, VisibilityMark, ZoomControl } from '@/ds'
import { byId, domainIds, EDGE_COLOR, EDGE_LABEL, MIXED_EDGE_COLOR, pathTo, ROOT_ID } from '../corpus/graph'
import { DT } from './walkdesk/authordnd'
import { FLAT_H, FLAT_W, leafPos, provinceIds } from '../model/flat'
import type { XY } from '../model/derive'
import { colorOf, inkStrongOf, labelInkOf, territoryFillOf } from '../model/color'
import { countryPath, countryRings, maxTier, provincePath, provinceRings, territories } from '../model/nested'
import { countryLabels, endpointAtTier, flightTargetOf, outlineOf, provinceLabels, ringsCrossT, roadsFor } from '../model/atlas'
import type { Bundle } from '../model/atlas'
import { fitLabel, fitRegionLabel } from '../model/labelfit'
import type { FitLine } from '../model/labelfit'
import { descendantCount, parentOf } from '../model/nav'
import type { Bus } from '../studio/bus'

const VB_X = -40
const VB_Y = -40
const VB_W = FLAT_W + 80
const VB_H = FLAT_H + 80
const U_CX = VB_X + VB_W / 2
const U_CY = VB_Y + VB_H / 2

/** the water behind every territory — exported so the shell can pass it as the
 *  Pane's own `face` (OB-066), rather than leaving it to the frame's default
 *  `--surface-paper` to show around the canvas's corners and its shorter-than-
 *  the-pane bottom edge. One value, read here and by the shell; a second typed
 *  copy is the staleness this item exists to close. */
export const MAP_WATER = '#eef4f8'

// Levels run L0..maxTier — the deepest stratum in the DATA decides how far
// the scale goes. Each level is a canonical scale; there is nothing between.
const L_MAX = maxTier
const BASE_S = [0.8, 1.6, 3.0, 5.5, 9.5, 14]
const LEVEL_S = Array.from({ length: L_MAX + 1 }, (_, i) => BASE_S[i] ?? BASE_S[BASE_S.length - 1] * Math.pow(1.5, i - (BASE_S.length - 1)))
/** the LevelPicker's labels, "L0".."L{maxTier}" — OB-096 */
const LEVEL_LABELS = Array.from({ length: L_MAX + 1 }, (_, i) => `L${i}`)
const FLY_MS = 260
// a LOOK's flight (a Connections click) can cross the whole map AND change
// level in one move — at the wheel-step 260ms it read as a cut, not a flight.
// Slow enough for the eye to keep the territory; wheel steps stay snappy.
const LOOK_FLY_MS = 750
const FADE = 'fill-opacity 350ms, stroke-opacity 350ms, stroke-width 350ms'

// ── THE CONTEXT WINDOW ───────────────────────────────────────────────────────
// One formal rule for ALL receded line-work and ghost text, keyed on
// d = level − tier (how many grains above the active stratum an ancestor is).
// Relevance is LOCAL: the immediate parent (d = 1) is the only ancestor that
// renders — full border emphasis plus one big faint watermark ghost. Every
// grain above it disappears ENTIRELY (a sharp window, not a decay): global
// orientation is already carried by the tree COLORS of every fill, so
// far-ancestor line-work and text were redundant noise. d < 1 (the active
// level and the pre-mounted next tier) is the fill layers' job, not the
// line-work's. Borders and labels both read from here, so the window cannot
// drift apart per layer.
// The window has exactly ONE local exception, and it is a reading exception,
// not a structural one: the single ghost the CURSOR is standing inside fades
// almost away (see ancLabelOAt, item 10). The rule below still decides which
// grains exist; that one only decides whether the ghost you are reading through
// gets out of your way.
const PARENT_BORDER_W = 2.6
const PARENT_LABEL_PX = 26
const ancBorderO = (d: number) => (d === 1 ? 0.6 : 0)
const ancLabelO = (d: number) => (d === 1 ? 0.15 : 0)

interface View {
  tx: number
  ty: number
  s: number
}

export default function MapView({ bus }: { bus: Bus }) {
  const onFocus = (id: string) => bus.setFocus(id, 'map')

  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ tx: 0, ty: 0, s: LEVEL_S[0] })
  const [level, setLevel] = useState(0)
  const [clientBox, setClientBox] = useState<{ w: number; h: number } | null>(null)
  /** selected region — its topics' typed edges stay drawn until click-off */
  const [sel, setSel] = useState<string | null>(null)

  // TWO HOVERS, and they are genuinely different questions.
  //   `hover` (local) — the cell MY cursor is on. Draws the dashed preselect.
  //   `bus.hover`     — the cell ANYONE's cursor is on, this pane included.
  // The bus channel deliberately carries no source tag, so the only way this
  // pane can tell "someone else is pointing at that" from "I am pointing at
  // that" is to remember what it published. Hence the local copy: the spotlight
  // below fires only when the two DISAGREE.
  //
  // The writers are pulled out by name because they are the STABLE part of the
  // bus (useCallback'd for exactly this) — `bus` itself is a fresh object every
  // render, so an effect depending on it would fire every render.
  const { setHover: busSetHover, endHover: busEndHover, clearFocus: busClearFocus } = bus
  const [hover, setHover] = useState<string | null>(null)
  const hoverId = bus.hover

  // OB-096 — the map's own floating chrome. `pointerPos` anchors MapTooltip
  // beside the cursor (screen-relative to the svg, not a fixed corner);
  // `hoverEdge` is which selection-overlay road, if any, the cursor is on
  // (a relation tooltip only ever has something to show while a selection's
  // roads are drawn); `walkVisible` gates the walk-route pins the visibility
  // toggle hides.
  const [pointerPos, setPointerPos] = useState<XY | null>(null)
  const [hoverEdge, setHoverEdge] = useState<Bundle | null>(null)
  const [walkVisible, setWalkVisible] = useState(true)

  const enterCell = (id: string) => {
    setHover(id)
    busSetHover(id)
  }
  const leaveCell = (id: string) => {
    setHover((h) => (h === id ? null : h))
    busEndHover(id)
  }
  // refs mirror state for the raw wheel listener (deps []) — hoverRef feeds the
  // level-change clear below, which must read the CURRENT local hover without
  // re-running on every hover move
  const viewRef = useRef(view)
  const levelRef = useRef(level)
  const hoverRef = useRef(hover)
  useEffect(() => {
    viewRef.current = view
    levelRef.current = level
    hoverRef.current = hover
  })

  // a level change swaps which paths are hit targets mid-hover, so no
  // pointerleave ever fires on the old one — clear it explicitly, on the bus
  // too, or a spotlight stays lit on a cell the cursor already left. But end
  // only OUR OWN published id (endHover is guarded on it): a look flight also
  // changes level, and blanking the whole channel would kill the foreign hover
  // standing on the very row that asked for the flight.
  useEffect(() => {
    const h = hoverRef.current
    if (h) busEndHover(h)
    setHover(null)
  }, [level, busEndHover])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const ro = new ResizeObserver(() => {
      const r = svg.getBoundingClientRect()
      // a BENCHED pane (display:none) measures 0×0 — that box carries no
      // layout information and would drive the zoom factor to Infinity, so
      // keep the last real one until the pane is shown again
      if (r.width > 0 && r.height > 0) setClientBox({ w: r.width, h: r.height })
    })
    ro.observe(svg)
    return () => ro.disconnect()
  }, [])

  // ── camera: level is the single source of truth, the tween just follows ───
  const anim = useRef<number | null>(null)
  const cancelFlight = () => {
    if (anim.current != null) cancelAnimationFrame(anim.current)
    anim.current = null
  }
  useEffect(() => cancelFlight, [])

  const flyTween = (target: View, ms = FLY_MS) => {
    cancelFlight()
    const from = viewRef.current
    const c0 = { x: (U_CX - from.tx) / from.s, y: (U_CY - from.ty) / from.s }
    const c1 = { x: (U_CX - target.tx) / target.s, y: (U_CY - target.ty) / target.s }
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / ms)
      const e = 1 - Math.pow(1 - t, 3)
      const sNow = from.s * Math.pow(target.s / from.s, e)
      const cx = c0.x + (c1.x - c0.x) * e
      const cy = c0.y + (c1.y - c0.y) * e
      setView({ s: sNow, tx: U_CX - cx * sNow, ty: U_CY - cy * sNow })
      anim.current = t < 1 ? requestAnimationFrame(tick) : null
    }
    anim.current = requestAnimationFrame(tick)
  }

  /** step to a level: set the stratum, fly to its canonical scale, keeping
   * `about` (user coords) fixed under the cursor. Always a USER gesture (wheel
   * step, double-click, level button). */
  const flyToLevel = (l: number, about?: XY) => {
    setLevel(l)
    levelRef.current = l
    const s = LEVEL_S[l]
    const v = viewRef.current
    const a = about ?? { x: U_CX, y: U_CY }
    flyTween({ s, tx: a.x - ((a.x - v.tx) / v.s) * s, ty: a.y - ((a.y - v.ty) / v.s) * s })
  }

  // ── LOOK (SelfNotes audit): a CLICK in the Connections pane flies the camera
  // — a hover never does, it only highlights. The pane stamps bus.peek with a
  // fresh seq per click, so re-looking at the same node after panning away is a
  // fresh command. The map answers by flying to the node's territory at its
  // tier's canonical scale and KEEPING it lit (the spotlight below). No
  // fly-home: a look is navigation, not a glance — the camera is simply the
  // user's again the moment they grab it (drag, wheel, level buttons).
  const peek = bus.peek
  useEffect(() => {
    if (!peek) return
    const t = flightTargetOf(peek.id)
    if (!t) return
    setLevel(t.tier)
    levelRef.current = t.tier
    const s = LEVEL_S[t.tier]
    flyTween({ s, tx: U_CX - t.c.x * s, ty: U_CY - t.c.y * s }, LOOK_FLY_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peek])

  // Esc clears the selection overlay without touching the camera. It also
  // clears the FOCUS — "nothing selected" has to be a real, reachable state
  // for the Connections pane's hover preview to have anywhere to live.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        setSel(null)
        busClearFocus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busClearFocus])

  // A selection made ANYWHERE is the map's selection too. The map used to
  // reflect only a click that landed ON the map (local `sel`) and read bus.focus
  // for nothing — so a Connections-pane double-click set the focus to the child
  // but left the previously-selected PARENT outlined here (issue #7). Mirroring
  // focus is idempotent for the map's own clicks (they set focus to the same id)
  // and clears on Esc / water-click alike (focus goes null).
  useEffect(() => setSel(bus.focus), [bus.focus])

  const toUser = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const f = Math.max(VB_W / rect.width, VB_H / rect.height)
    return {
      x: VB_X + (clientX - rect.left - (rect.width - VB_W / f) / 2) * f,
      y: VB_Y + (clientY - rect.top - (rect.height - VB_H / f) / 2) * f,
    }
  }

  // wheel: whole-level steps, nothing else — no free zoom, no in-betweens
  const wheelAccum = useRef(0)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      if (anim.current != null) return // mid-flight: swallow, don't queue
      wheelAccum.current += ev.deltaY
      if (wheelAccum.current <= -50) {
        wheelAccum.current = 0
        if (levelRef.current < L_MAX) flyToLevel(levelRef.current + 1, toUser(ev.clientX, ev.clientY))
      } else if (wheelAccum.current >= 50) {
        wheelAccum.current = 0
        if (levelRef.current > 0) flyToLevel(levelRef.current - 1, toUser(ev.clientX, ev.clientY))
      }
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── pan + the drag/click guard (same contract as the Map) ─────────────────
  const drag = useRef<{ x: number; y: number } | null>(null)
  const dragDist = useRef(0)
  const [dragging, setDragging] = useState(false)

  // Selecting a container used to OPEN the Connections pane — a 350ms-delayed
  // bus.reveal('connections'), delayed because a newly-mounting pane reflowed the
  // grid mid-gesture and the second click of a zoom double-click would land on
  // a map that had moved. Cut (#21): the map now only publishes focus, and what
  // is on screen stays the composition's business. A pane that appears under
  // your cursor because you clicked somewhere else is a surprise, and with the
  // authoring preset the map is one of several things that can move the focus —
  // so "who opens Connections" needs an answer that isn't "whoever moved last".
  // Cutting the reveal also retires the timer that only existed to survive it.
  const regionClick = (id: string) => {
    if (dragDist.current > 4) return
    // clicking the selected cell again DESELECTS it (2026-07-13) — and clears
    // the focus with it, so the Studio agrees nothing is selected
    if (sel === id) {
      setSel(null)
      busClearFocus()
      return
    }
    setSel(id)
    onFocus(id)
  }

  // ── #24 — DRAG THE SELECTED CELL ONTO THE ROAD ────────────────────────────
  // A CUSTOM POINTER DRAG, not native HTML5 DnD, for two reasons the ticket's
  // "just add draggable" plan couldn't survive: Chromium ignores the draggable
  // attribute on SVG shapes, and a native drag image is a frozen snapshot — it
  // can't MORPH. So we drive the whole gesture by hand: a portal ghost follows
  // the cursor, showing the cell's own outline while over the map and crossfading
  // into a node pill once it leaves the map (the "shape becomes a node" ask). On
  // as it moves we feed the road a stream of synthetic HTML5 `dragover`/`dragleave`
  // events at the cursor, and a `drop` on release — so the road's OWN handlers do
  // both the live preview caret AND the precise insertion (gaps, stages, branches)
  // verbatim, no reimplementation and no road refactor. A container id rides the
  // same path and lands as a plain visit (everything is a node). Only the SELECTED
  // cell arms this (see the pointerdown gate), so pan is untouched everywhere else.
  type Box = { x: number; y: number; width: number; height: number }
  const nodeDown = useRef<{ id: string; x: number; y: number; bbox: Box } | null>(null)
  const ndActive = useRef(false)
  // the element the last synthetic dragover went to — so we can dragleave it the
  // moment the cursor moves to a new target (or off the road), which is what
  // clears its caret. Mirrors the enter/leave a native drag would produce.
  const lastOver = useRef<Element | null>(null)
  const [ghost, setGhost] = useState<{ id: string; x: number; y: number; outside: boolean; bbox: Box } | null>(null)

  /** a DnD event carrying the palette payload. Dispatched by hand, these fire the
   * road's real onDragOver / onDragLeave / onDrop exactly as a browser drag would
   * — no browser DnD state machine to satisfy, so a `drop` needs no prior
   * handshake, and dragover/leave drive the road's existing caret. */
  const dndEvent = (type: 'dragover' | 'dragleave' | 'drop', x: number, y: number, id: string) => {
    const dt = new DataTransfer()
    dt.setData(DT, 'pal:' + id)
    return new DragEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: dt })
  }
  /** point the road's preview caret at the cursor: leave the old target, hover
   * the new one. Called on every move while a node drag is in flight. */
  const dragOverAt = (x: number, y: number, id: string) => {
    const el = document.elementFromPoint(x, y)
    if (el !== lastOver.current) {
      if (lastOver.current) lastOver.current.dispatchEvent(dndEvent('dragleave', x, y, id))
      lastOver.current = el
    }
    if (el) el.dispatchEvent(dndEvent('dragover', x, y, id))
  }

  // ── the selection overlay, whole: which topics the selection resolves to,
  // which of their edges survive the roll-up to this grain, and how those
  // collapse into one road per pair. All of it is model/atlas.ts's job now.
  const { tier: selTier, bundles } = useMemo(() => roadsFor(sel), [sel])
  // a changed (or cleared) selection unmounts the old roads outright — no
  // pointerleave ever fires on them — so a stale hoverEdge would otherwise
  // survive pointing at a bundle object from the previous selection
  useEffect(() => setHoverEdge(null), [sel])

  // viewport in world coords, for culling the deep tiers
  const f = clientBox ? Math.max(VB_W / clientBox.w, VB_H / clientBox.h) : 1
  const worldRect = {
    x: (VB_X - (clientBox ? (clientBox.w * f - VB_W) / 2 : 0) - view.tx) / view.s,
    y: (VB_Y - (clientBox ? (clientBox.h * f - VB_H) / 2 : 0) - view.ty) / view.s,
    w: (clientBox ? clientBox.w * f : VB_W) / view.s,
    h: (clientBox ? clientBox.h * f : VB_H) / view.s,
  }
  const onScreen = (p: XY, margin: number) =>
    p.x > worldRect.x - margin && p.x < worldRect.x + worldRect.w + margin && p.y > worldRect.y - margin && p.y < worldRect.y + worldRect.h + margin

  /** SCREEN pixels → world units at the current zoom AND pane size, so every
   * level renders the same authored style at its canonical scale */
  const px = (v: number) => (v * f) / view.s

  // ── SEARCH MATCHES (#25) — the supply pane's live hit set, lit on the map ──
  // A match deep in a subtree owns no cell at this stratum, so it ROLLS UP to
  // its VISIBLE ANCESTOR: pathTo(m)[level+1] is the containment ancestor sitting
  // exactly on the current level (or m itself when its own tier is this level).
  // Tally per ancestor → a count, so "3 matches under Systems Programming" reads
  // as one badge on that domain instead of three invisible deep hits. Matches
  // shallower than the level (an ancestor of the whole stratum) have no single
  // cell here and are dropped. Cheap (≤ MAX_HITS) so it runs each render — it
  // must, since onScreen culling moves with the pan.
  const matchPins: { id: string; c: XY; n: number }[] = []
  if (bus.matches.size > 0) {
    const tally = new Map<string, number>()
    for (const m of bus.matches) {
      const anc = pathTo(m)[level + 1]
      if (anc) tally.set(anc, (tally.get(anc) ?? 0) + 1)
    }
    for (const [id, n] of tally) {
      const ft = flightTargetOf(id)
      if (ft && ft.tier === level && onScreen(ft.c, 60)) matchPins.push({ id, c: ft.c, n })
    }
  }

  // ── ROUTE PATH (#26) — ordered walk positions for the current map level ──────
  // For each stop in bus.route, roll up to the visible ancestor at `level` using
  // the same pathTo(id)[level + 1] idiom the match pins use. `seen` tracks the
  // 1-based step of each stop's first appearance so a later return to the same
  // visible ancestor can be told apart from its primary visit (routeStops below
  // turns that into an offset second pin, OB-069).
  const routeVis = useMemo(() => {
    if (bus.route.length === 0) return []
    const seen = new Map<string, number>() // visId → 1-based step of first occurrence
    const out: Array<{ visId: string; c: XY; step: number; revisit: boolean }> = []
    for (let i = 0; i < bus.route.length; i++) {
      const id = bus.route[i]
      const visId = pathTo(id)[level + 1]
      if (!visId) continue
      const ft = flightTargetOf(visId)
      if (!ft || ft.tier !== level) continue
      const step = i + 1
      const revisit = seen.has(visId)
      if (!revisit) seen.set(visId, step)
      out.push({ visId, c: ft.c, step, revisit })
    }
    return out
  }, [bus.route, level])

  // ── ROUTE PINS (OB-069) — routeVis collapsed into what actually gets drawn.
  // Two things routeVis does NOT tell apart, both settled by the design system
  // after a pill, a corner badge and an inline digit all failed legibility on a
  // 24px mark (2026-08-22): a CONTIGUOUS run of steps sharing a visible ancestor
  // (three stops on the same territory back to back) is ONE pin with a range
  // label ("1-3"), never three stacked circles at the same point; a NON-adjacent
  // repeat — the walk leaves and later comes back — is always a SECOND StepDot,
  // offset clear of the first, never a merged mark. `routeVis`'s own `revisit`
  // flag can't distinguish these (it only asks "seen before, anywhere"), so this
  // groups by ADJACENCY instead and treats the first repeat of a visId, whenever
  // it happens, as a revisit.
  const routeStops = useMemo(() => {
    if (routeVis.length === 0) return []
    type Group = { visId: string; c: XY; steps: number[] }
    const groups: Group[] = []
    for (const s of routeVis) {
      const last = groups[groups.length - 1]
      if (last && last.visId === s.visId) last.steps.push(s.step)
      else groups.push({ visId: s.visId, c: s.c, steps: [s.step] })
    }
    // bus.route is truncated to the played prefix while a SAVED walk is active
    // (bus.ts's activateWalk), so the cursor is always the LAST raw step. With
    // no saved walk, the route may instead be the DRAFT open on the desk
    // (walkdesk/presented.ts publishes it live) — bus.draftCursor is that
    // road's own cursor, moved by Walk·Viewer's seek bar or the walk editor.
    const cursorStep = bus.activeWalk ? bus.activeWalk.cursor + 1 : bus.draftCursor + 1
    const stateOf = (steps: number[]): 'done' | 'current' | 'ahead' => {
      const last = steps[steps.length - 1]
      return last < cursorStep ? 'done' : last === cursorStep ? 'current' : 'ahead'
    }
    // OB-087 — a territory visited more than once (a non-adjacent revisit)
    // gets one pin per visit, all sharing `visId`; `count` is how many. Sizing
    // and placement both key off it, replacing the old fixed 24/34px-by-range
    // constant: a lone pin stays full-size, each pin sharing a territory
    // shrinks further (floored), matching the DS's own sizeFor formula
    // (components/nav/nav.card.html).
    const countByVisId = new Map<string, number>()
    for (const g of groups) countByVisId.set(g.visId, (countByVisId.get(g.visId) ?? 0) + 1)
    const indexByVisId = new Map<string, number>() // visId → how many placed so far
    return groups.map((g) => {
      const label: number | string = g.steps.length > 1 ? `${g.steps[0]}-${g.steps[g.steps.length - 1]}` : g.steps[0]
      const count = countByVisId.get(g.visId)!
      const size = Math.max(16, 22 - (count - 1) * 3)
      const idx = indexByVisId.get(g.visId) ?? 0
      indexByVisId.set(g.visId, idx + 1)
      // a revisit: spread around the territory's own centroid instead of
      // stacking along the direction of arrival — the old geometry cleared
      // each pin from the one before it, which reads as a line of discs
      // marching away from the shared point rather than "several stops here".
      // An evenly-spaced arc uses different parts of the territory's shape
      // (DS: "corners, an arc, a simple grid" are all fine; the requirement is
      // just not stacking them) and, as a side effect, spaces the arrows that
      // meet each of these pins apart too (OB-090).
      let c = g.c
      if (count > 1) {
        const angle = (2 * Math.PI * idx) / count - Math.PI / 2
        const radius = px(size * 1.3 + 6) // clears a same-size neighbour at this shrunk size, plus a gap
        c = { x: g.c.x + Math.cos(angle) * radius, y: g.c.y + Math.sin(angle) * radius }
      }
      return { key: `${g.visId}-${g.steps[0]}`, visId: g.visId, step: g.steps[0], c, label, state: stateOf(g.steps), size }
    })
    // px closes over f/view.s, both already deps; a fresh px reference every
    // render would otherwise recompute this memo every render regardless
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeVis, bus.activeWalk, bus.draftCursor, f, view.s])

  // wrapped labels, fitted at the level's CANONICAL scale — not the mid-flight
  // zoom — so a name's line breaks are decided once per level, not per frame
  const labelFit = useMemo(() => {
    const active = new Map<string, FitLine[]>()
    const ghost = new Map<string, FitLine[]>()
    // REGION names (SelfNotes: "labels overlap / region text not wrapped"):
    // the L0/L1 names go through the same wrap-into-the-cell mechanic as the
    // deep tiers now, against the honest region chord — with fitRegionLabel's
    // shrink instead of a drop, because they are the only names their level
    // has. Computed one level past their visibility window so the 350ms
    // opacity fades keep an element to fade.
    const region = new Map<string, { lines: FitLine[]; fs: number }>()
    const world = (v: number) => (v * f) / LEVEL_S[level]
    if (level <= 2)
      for (const c of countryLabels) {
        const size = level === 0 ? 24 : PARENT_LABEL_PX
        const fit = fitRegionLabel(c.label, countryRings[c.key], c.x, c.y, world(size))
        region.set(c.key, { lines: fit.lines, fs: size * fit.shrink })
      }
    if (level <= 3)
      for (const m of provinceLabels) {
        const size = level <= 1 ? 15 : PARENT_LABEL_PX
        const fit = fitRegionLabel(m.label, provinceRings[m.key], m.x, m.y, world(size))
        region.set(m.key, { lines: fit.lines, fs: size * fit.shrink })
      }
    if (level < 2) return { active, ghost, region }
    for (const t of territories) {
      if (t.tier === level || (t.leaf && t.tier < level)) {
        const fit = fitLabel(byId.get(t.id)!.title, t, world(t.tier === level ? 12.5 : 11.5), false)
        if (fit) active.set(t.id, fit)
      } else if (level >= 3 && !t.leaf && t.tier === level - 1) {
        ghost.set(t.id, fitLabel(byId.get(t.id)!.title, t, world(PARENT_LABEL_PX), true)!)
      }
    }
    return { active, ghost, region }
  }, [level, f])

  // territories in play: everything up to one tier below the stratum (so the
  // next level fades IN instead of popping), viewport-culled by owning topic
  const mounted = territories.filter((t) => t.tier <= level + 1 && (t.tier === 2 || onScreen(leafPos[t.topic], 90)))
  /** the level-k countries: this tier's nodes plus every leaf that bottomed
   * out above — leaf persistence keeps jagged branches on the map */
  const isActive = (t: { tier: number; leaf: boolean }) => t.tier === level || (t.leaf && t.tier < level)
  const isMuted = (t: { tier: number; leaf: boolean }) => t.leaf && t.tier < level

  const selOutline = sel ? outlineOf(sel) : undefined
  const hoverOutline = hover && hover !== sel && !dragging ? outlineOf(hover) : undefined

  // SPOTLIGHT — a hover published by ANOTHER instrument: "the thing your cursor
  // is on over there lives HERE". Suppressed when it is just our own preselected
  // cell echoing back (that already has the dashed outline). Any node can be
  // spotlit, at any level: a deep concept lights its own small cell inside its
  // topic, which is exactly the "where does this sit?" answer. Display only —
  // the camera never moves, so a hover can never steal the view.
  //
  // The spotlight also carries the LOOK: the last clicked Connections node
  // stays lit — lifted to its owning topic when it has no cell of its own —
  // until the look is superseded (next look, any focus change). "Highlight" is
  // half of what the click asked for; the flight above is the other half.
  const lookId = peek ? (outlineOf(peek.id) ? peek.id : endpointAtTier(peek.id, 2)) : null
  const spotId = hoverId && hoverId !== hover ? hoverId : lookId && lookId !== sel ? lookId : null
  const spotOutline = spotId ? outlineOf(spotId) : undefined

  // item 2: THE HIGHLIGHTED CELL — whichever one is lit on the map right now, be it my
  // own cursor's (hover) or a cross-pane hover's spotlight (spotId). It feeds
  // MapTooltip's immediate title readout, rather than the native <title>, which
  // lags ~half a second and is OS-styled; this reads the moment the pointer
  // lands. Named `hoverChip` until 2026-08-28 (#221), after the fixed top-left
  // hover chip it used to feed — OB-095 deleted that surface at 1e530af and
  // OB-096 put a cursor-anchored tooltip in its place; the name outlived it.
  const hoverNode = hover ?? spotId

  // OB-096 — the hovered node's OWN roads, for MapTooltip's relations row. A
  // fresh call rather than reusing the selection's `bundles`/`arrows` above:
  // the hovered node is rarely the selected one, and roadsFor is cheap
  // enough at this corpus's scale (memoised on the id, so cursor movement
  // that stays inside one cell recomputes nothing).
  const { arrows: hoverArrows } = useMemo(() => roadsFor(hoverNode), [hoverNode])
  const hoverRelIn = hoverNode ? hoverArrows.filter((a) => a.tgt === hoverNode).reduce((s, a) => s + a.n, 0) : 0
  const hoverRelOut = hoverNode ? hoverArrows.filter((a) => a.src === hoverNode).reduce((s, a) => s + a.n, 0) : 0

  // item 3: a hovered counterpart lights the ROAD to it, not just its territory.
  // The bus hover arrives as a topic id (a Connections relationship row) or a map
  // cell; lift it to the road's grain (selTier) and the bundle whose end it
  // matches is the connection to the selected node. The rest dim, the same way
  // the star dims its other spokes one pane over.
  const litRoad = hoverId && bundles.length ? endpointAtTier(hoverId, selTier) : null
  const anyRoadLit = litRoad != null && bundles.some((b) => b.src === litRoad || b.tgt === litRoad)

  // ── item 10: "labels blocking when zoomed in" ────────────────────────────
  // The watermark never blocked a CLICK — every label layer is pointerEvents:
  // none. What it blocked was READING: 26px of parent name lying across the
  // small active names underneath. The cure is one rule, the same shape as the
  // context window itself — the ghost you are STANDING INSIDE steps aside,
  // because that is exactly the cell whose contents you are trying to read.
  // Move the cursor away and it returns; orientation costs nothing the moment
  // you stop needing the detail. Since the territories tile their parent
  // exactly, the ghost under the cursor is just the parent of the hovered cell
  // — true at every level, so countries, provinces and deep ghosts share it.
  const ghostUnderCursor = hover ? parentOf(hover) : null
  const ancLabelOAt = (d: number, id: string) => (id === ghostUnderCursor ? 0.03 : ancLabelO(d))

  return (
    <PaneCanvas aria-label="map-view" face="none" style={{ background: MAP_WATER }}>
      <svg
        ref={svgRef}
        data-nested
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        className="w-full h-full"
        data-zoom={view.s.toFixed(2)}
        data-level={level}
        data-sel={sel ?? undefined}
        data-peek={peek?.id}
        data-match-cells={matchPins.length || undefined}
        style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={(ev) => {
          cancelFlight()
          dragDist.current = 0
          // #24 — the SELECTED cell is the road's drag handle. A press on it must
          // let the native HTML5 drag own the gesture, so DON'T arm a pan and
          // DON'T capture the pointer (capture would suppress dragstart). A press
          // anywhere else — another cell, water — pans exactly as before. Because
          // selection is the gate, pan and drag never share a target and never
          // race for the same movement. A plain click on the selected cell still
          // deselects: drag.current stays null so no pan runs, dragDist is 0, and
          // regionClick fires on click-up.
          const t = ev.target as Element
          const downId = t.getAttribute('data-terr') ?? t.getAttribute('data-region')
          if (downId && downId === sel) {
            // ARM a node drag on the selected cell (see the block above). Don't
            // capture yet — a pure click must still reach onClick to deselect;
            // capture happens in pointermove once movement confirms a drag. Grab
            // the cell's geometry NOW, while we hold its path element, so the
            // ghost can draw the outline (getBBox is in the same user space as
            // outlineOf's `d`).
            drag.current = null
            nodeDown.current = { id: sel, x: ev.clientX, y: ev.clientY, bbox: (t as SVGGraphicsElement).getBBox() }
            return
          }
          drag.current = { x: ev.clientX, y: ev.clientY }
          setDragging(true)
          t.setPointerCapture(ev.pointerId)
        }}
        onPointerMove={(ev) => {
          // OB-096 — MapTooltip is cursor-anchored, so every move (not just
          // drag moves) updates where it sits, relative to this svg's own box.
          const svgBox = svgRef.current!.getBoundingClientRect()
          setPointerPos({ x: ev.clientX - svgBox.left, y: ev.clientY - svgBox.top })
          // ── node drag (arming or in flight) takes priority over pan ──────
          const nd = nodeDown.current
          if (nd) {
            const dist = Math.hypot(ev.clientX - nd.x, ev.clientY - nd.y)
            if (!ndActive.current && dist > 5) {
              // confirmed a drag: capture so moves over the ROAD still reach us
              ndActive.current = true
              ;(ev.currentTarget as Element).setPointerCapture(ev.pointerId)
            }
            if (ndActive.current) {
              const r = svgRef.current!.getBoundingClientRect()
              const outside = ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom
              setGhost({ id: nd.id, x: ev.clientX, y: ev.clientY, outside, bbox: nd.bbox })
              // drive the road's live preview caret at the cursor
              dragOverAt(ev.clientX, ev.clientY, nd.id)
            }
            return
          }
          if (!drag.current) return
          const rect = svgRef.current!.getBoundingClientRect()
          const ff = Math.max(VB_W / rect.width, VB_H / rect.height)
          const dx = (ev.clientX - drag.current.x) * ff
          const dy = (ev.clientY - drag.current.y) * ff
          drag.current = { x: ev.clientX, y: ev.clientY }
          dragDist.current += Math.hypot(dx, dy)
          setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }))
        }}
        onPointerUp={(ev) => {
          if (nodeDown.current) {
            if (ndActive.current) {
              const { clientX: x, clientY: y } = ev
              const id = nodeDown.current.id
              // clear whatever caret we're leaving, THEN drop on the target under
              // the cursor (handleDrop reads the pointer position, not the caret,
              // so the insertion is right either way). Swallow the click this
              // press would fire so a completed drag never also deselects the cell.
              if (lastOver.current) lastOver.current.dispatchEvent(dndEvent('dragleave', x, y, id))
              lastOver.current = null
              const el = document.elementFromPoint(x, y)
              if (el) el.dispatchEvent(dndEvent('drop', x, y, id))
              dragDist.current = 999
              try {
                ;(ev.currentTarget as Element).releasePointerCapture(ev.pointerId)
              } catch {
                /* capture may not have been taken (a click, no drag) */
              }
            }
            nodeDown.current = null
            ndActive.current = false
            setGhost(null)
            setDragging(false)
            return
          }
          drag.current = null
          setDragging(false)
        }}
        onClick={(ev) => {
          // click on water (the svg itself, no active cell under the cursor)
          // clears — selection AND focus, the map's "stand nowhere" gesture
          if (dragDist.current > 4) return
          if (ev.target === svgRef.current) {
            setSel(null)
            busClearFocus()
          }
        }}
        onDoubleClick={(ev) => {
          const u = toUser(ev.clientX, ev.clientY)
          if (levelRef.current < L_MAX) flyToLevel(levelRef.current + 1, u)
        }}
      >
        <defs>
          {/* soft selection glow (#8): a real gaussian bloom, keyed to the
              selected cell's tree color and zoom-stable via px(). Lives in the
              luminance channel the flat tree-color fills never use, so the
              selection reads as "lit" even beside a same-hue sibling. The wide
              region keeps the blur from clipping at the filter's default box. */}
          <filter id="sel-glow" x="-80%" y="-80%" width="260%" height="260%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={px(7.5)} />
          </filter>
        </defs>
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.s})`}>
          {/* ── FILLS, painted shallow → deep. Only the active level carries
              paint (pale tree colors) and pointer events; everything else is
              mounted transparent so level changes FADE. ─────────────────── */}
          <g>
            {domainIds.map((d) => (
              <path
                key={d}
                d={countryPath[d]}
                data-region={d}
                data-rtier={0}
                fill={territoryFillOf(d)}
                fillOpacity={level === 0 ? 0.95 : 0}
                stroke="#ffffff"
                strokeOpacity={level === 0 ? 0.9 : 0}
                strokeWidth={px(1.2)}
                pointerEvents={level === 0 ? 'auto' : 'none'}
                style={{ cursor: sel === d ? 'grab' : 'pointer', transition: FADE }}
                onClick={() => regionClick(d)}
                onPointerEnter={() => enterCell(d)}
                onPointerLeave={() => leaveCell(d)}
              />
            ))}
          </g>
          <g>
            {provinceIds.map((m) => (
              <path
                key={m}
                d={provincePath[m]}
                data-region={m}
                data-rtier={1}
                fill={territoryFillOf(m)}
                fillOpacity={level === 1 ? 0.95 : 0}
                stroke="#ffffff"
                strokeOpacity={level === 1 ? 0.95 : 0}
                strokeWidth={px(1.1)}
                pointerEvents={level === 1 ? 'auto' : 'none'}
                style={{ cursor: sel === m ? 'grab' : 'pointer', transition: FADE }}
                onClick={() => regionClick(m)}
                onPointerEnter={() => enterCell(m)}
                onPointerLeave={() => leaveCell(m)}
              />
            ))}
          </g>
          <g>
            {mounted.map((t) => (
              <path
                key={t.id}
                d={t.d}
                data-terr={t.id}
                data-tier={t.tier}
                fill={territoryFillOf(t.id)}
                fillOpacity={isActive(t) ? (isMuted(t) ? 0.6 : 0.95) : 0}
                stroke="#ffffff"
                strokeOpacity={isActive(t) ? 0.95 : 0}
                strokeWidth={px(1.05)}
                pointerEvents={isActive(t) ? 'auto' : 'none'}
                style={{ cursor: sel === t.id ? 'grab' : 'pointer', transition: FADE }}
                onClick={() => regionClick(t.id)}
                onPointerEnter={() => enterCell(t.id)}
                onPointerLeave={() => leaveCell(t.id)}
              />
            ))}
          </g>

          {/* ── LINE-WORK: under the context window at most ONE of these
              layers is visible at a time — the immediate parent grain. The
              active level owns the whole color budget. ──────────────────── */}
          <g pointerEvents="none">
            {domainIds.map((d) => (
              <path
                key={d}
                d={countryPath[d]}
                data-border={d}
                data-btier={0}
                fill="none"
                stroke={colorOf(d)}
                strokeOpacity={ancBorderO(level)}
                strokeWidth={px(PARENT_BORDER_W)}
                style={{ transition: FADE }}
              />
            ))}
            {provinceIds.map((m) => (
              <path
                key={m}
                d={provincePath[m]}
                data-border={m}
                data-btier={1}
                fill="none"
                stroke={colorOf(m)}
                strokeOpacity={ancBorderO(level - 1)}
                strokeWidth={px(PARENT_BORDER_W)}
                style={{ transition: FADE }}
              />
            ))}
            {[...mounted]
              .filter((t) => !t.leaf)
              .sort((a, b) => a.tier - b.tier)
              .map((t) => (
                <path
                  key={t.id}
                  d={t.d}
                  data-border={t.id}
                  data-btier={t.tier}
                  fill="none"
                  stroke={colorOf(t.id)}
                  strokeOpacity={ancBorderO(level - t.tier)}
                  strokeWidth={px(PARENT_BORDER_W)}
                  style={{ transition: FADE }}
                />
              ))}
          </g>

          {/* ── labels: the active grain in full ink, ONE ghost above it.
              No capital dots (2026-07-13) — the fill, border and name already
              say "a node lives here"; the wrapped name IS the place marker. */}
          {/* PAINT ORDER IS THE POINT (2026-07-14, item 10): every ghost paints
              BEFORE the active names, never after. The deep ghost layer used to
              come last and so laid its 26px parent name ON TOP of the very
              labels the reader was zooming in to read. Ghosts are background;
              they go in the background. */}
          <g pointerEvents="none">
            {countryLabels.map((c) => {
              const fit = labelFit.region.get(c.key)
              if (!fit) return null
              return (
                <text
                  key={c.key}
                  data-regionlabel={c.key}
                  textAnchor="middle"
                  fontSize={px(fit.fs)}
                  fontWeight={800}
                  fill={colorOf(c.key)}
                  opacity={level === 0 ? 0.55 : ancLabelOAt(level, c.key)}
                  style={{ userSelect: 'none', transition: 'opacity 350ms' }}
                >
                  {fit.lines.map((ln, i) => (
                    <tspan key={i} x={ln.x} y={ln.y}>
                      {ln.text}
                    </tspan>
                  ))}
                </text>
              )
            })}
            {provinceLabels.map((m) => {
              const fit = labelFit.region.get(m.key)
              if (!fit) return null
              return (
                <text
                  key={m.key}
                  data-regionlabel={m.key}
                  textAnchor="middle"
                  fontSize={px(fit.fs)}
                  fontWeight={level === 1 ? 700 : 800}
                  fill={level === 1 ? labelInkOf(m.key) : colorOf(m.key)}
                  opacity={level === 1 ? 0.9 : ancLabelOAt(level - 1, m.key)}
                  style={{ userSelect: 'none', transition: 'opacity 350ms' }}
                >
                  {fit.lines.map((ln, i) => (
                    <tspan key={i} x={ln.x} y={ln.y}>
                      {ln.text}
                    </tspan>
                  ))}
                </text>
              )
            })}
            {level >= 3 &&
              mounted
                // the window admits ONE territory-grain ghost: the parent
                .filter((t) => !t.leaf && t.tier === level - 1 && onScreen({ x: t.cx, y: t.cy }, 60) && labelFit.ghost.has(t.id))
                .map((t) => (
                  <text
                    key={`ghost-${t.id}`}
                    data-ghostlabel={t.id}
                    textAnchor="middle"
                    fontSize={px(PARENT_LABEL_PX)}
                    fontWeight={800}
                    fill={colorOf(t.id)}
                    opacity={ancLabelOAt(1, t.id)}
                    style={{ userSelect: 'none', transition: 'opacity 200ms' }}
                  >
                    {labelFit.ghost.get(t.id)!.map((ln, i) => (
                      <tspan key={i} x={ln.x} y={ln.y}>
                        {ln.text}
                      </tspan>
                    ))}
                  </text>
                ))}
            {/* the active grain, LAST and white-cased: a name on the stratum you
                are reading punches cleanly through whatever ghost lies under it,
                instead of muddying into it */}
            {level >= 2 &&
              mounted
                .filter((t) => isActive(t) && onScreen({ x: t.cx, y: t.cy }, 60) && labelFit.active.has(t.id))
                .map((t) => {
                  // The selected cell's name is CALMED, not shouted (the glow
                  // and heavy border already mark the cell): a crisp near-black
                  // emphasis ink instead of the muddy dark tint, weight 700, and
                  // a THIN soft white case rather than a fat opaque one — clean
                  // type over an outlined-sticker look. Full opacity keeps it the
                  // clearest label even as the glow tints the body beneath it.
                  const isSel = t.id === sel
                  return (
                    <text
                      key={t.id}
                      textAnchor="middle"
                      fontSize={px(t.tier === level ? 12.5 : 11.5)}
                      fontWeight={isSel ? 700 : 600}
                      fill={isSel ? inkStrongOf(t.id) : labelInkOf(t.id)}
                      stroke="#ffffff"
                      strokeWidth={px(isSel ? 2.2 : 2.4)}
                      strokeOpacity={isSel ? 0.7 : 0.85}
                      paintOrder="stroke"
                      opacity={isSel ? 1 : isMuted(t) ? 0.7 : 0.92}
                      style={{ userSelect: 'none' }}
                    >
                      {labelFit.active.get(t.id)!.map((ln, i) => (
                        <tspan key={i} x={ln.x} y={ln.y}>
                          {ln.text}
                        </tspan>
                      ))}
                    </text>
                  )
                })}
          </g>

          {/* ── SEARCH MATCH PINS (#25): the live hit set, lit on the territory
              on a DIFFERENT visual axis than selection (glow) or hover (dashed)
              — an amber count pin, so three highlight states never fight over
              the ring. A deep hit rolls up to its visible ancestor and the pin
              carries how many landed there. pointer-events none: a pin never
              eats a click meant for the cell under it. ──────────────────── */}
          {matchPins.length > 0 && (
            <g data-matches pointerEvents="none">
              {matchPins.map((p) => (
                <g key={p.id} data-match={p.id} data-mn={p.n} transform={`translate(${p.c.x} ${p.c.y})`}>
                  <circle r={px(8.5)} fill="#f59e0b" stroke="#ffffff" strokeWidth={px(2)} />
                  <text
                    textAnchor="middle"
                    y={px(3.4)}
                    fontSize={px(10)}
                    fontWeight={800}
                    fill="#ffffff"
                    style={{ userSelect: 'none' }}
                  >
                    {p.n}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* ── ROUTE PATH (#26): the walk's resolved order drawn over the territory,
              on the shared vocabulary instead of a hand-drawn circle+number+line
              (OB-069) — StepDot for "step N of the walk", NodeArrow for the line
              between two steps, the same two marks a chain or the road itself
              draws with. Deep stops still roll up to their visible ancestor
              (routeVis); routeStops turns that into what actually gets a pin — a
              contiguous run collapses into one range pin, a later return to an
              already-pinned territory offsets clear of it rather than drawing a
              second number into the same mark.

              Both StepDot and NodeArrow are built assuming 1 unit is 1 real
              screen px — true for the road's authoring board, false here, where
              `view.s` is a live pan/zoom the rest of this map counter-scales
              away per-element via `px()`. Neither component takes a pre-scaled
              prop for that, so the correction moves to the wrapping transform
              instead: `scale(f / view.s)` cancels the ambient `scale(view.s)`
              this whole layer sits inside (see the outer <g> a few hundred
              lines up), leaving raw numbers inside behave exactly like real
              CSS px — which is what both components already assume.

              pointer-events none on the group so a pin or an arrow never
              intercepts a click meant for the cell fill below it. ──────── */}
          {walkVisible && routeStops.length > 0 && (
            <g data-routepath data-step-count={bus.route.length} pointerEvents="none">
              {routeStops.slice(1).map((to, i) => {
                const from = routeStops[i]
                const dx = to.c.x - from.c.x
                const dy = to.c.y - from.c.y
                const worldDist = Math.hypot(dx, dy) || 1
                const dist = (worldDist * view.s) / f // world units -> real px
                if (dist < 1) return null
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI
                // OB-090 — anchor the TAIL at the source pin's own edge (toward
                // the target), not its centre. A centred tail is the SAME point
                // for every arrow leaving a pin, however many attach there —
                // exactly the "one shared anchor" the fix asks to stop. The
                // head already anchored this way (short of `to`'s own radius,
                // toward `from`); the tail now does the same in reverse, so
                // every arrow's anchor is angled toward the end it actually
                // connects to rather than a shared centre point.
                const tailOffset = px(from.size / 2)
                const tailX = from.c.x + (dx / worldDist) * tailOffset
                const tailY = from.c.y + (dy / worldDist) * tailOffset
                const length = Math.max(1, dist - to.size / 2 - ARROW_METRICS.head - from.size / 2)
                return (
                  <g key={`ra-${to.key}`} transform={`translate(${tailX} ${tailY}) rotate(${angle}) scale(${f / view.s})`}>
                    <NodeArrow direction="right" length={length} joins={PIN_RING_WIDTH} />
                  </g>
                )
              })}
              {routeStops.map((s) => (
                <g
                  key={s.key}
                  data-routestop={s.visId}
                  data-step={s.step}
                  transform={`translate(${s.c.x} ${s.c.y}) scale(${f / view.s})`}
                >
                  <foreignObject x={-s.size / 2} y={-s.size / 2} width={s.size} height={s.size} style={{ overflow: 'visible' }}>
                    <StepDot n={s.label} state={s.state} variant="pin" size={s.size} />
                  </foreignObject>
                </g>
              ))}
            </g>
          )}

          {/* ── HOVER PRESELECTION: outline + light tint on the cell a click
              would pick — kills the "which region am I over?" guess ─────── */}
          {hoverOutline && (
            <g data-hover={hover} pointerEvents="none">
              <path d={hoverOutline} fill={colorOf(hover!)} fillOpacity={0.1} stroke="#ffffff" strokeWidth={px(3)} strokeOpacity={0.9} />
              <path d={hoverOutline} fill="none" stroke={colorOf(hover!)} strokeWidth={px(1.5)} strokeOpacity={0.9} strokeDasharray={`${px(5)} ${px(3)}`} />
            </g>
          )}

          {/* ── SPOTLIGHT: something hovered in ANOTHER pane lives here ──── */}
          {spotOutline && (
            <g data-spot={spotId} pointerEvents="none">
              <path d={spotOutline} fill={colorOf(spotId!)} fillOpacity={0.25} stroke="#ffffff" strokeWidth={px(4.5)} strokeOpacity={0.95} />
              <path d={spotOutline} fill="none" stroke={colorOf(spotId!)} strokeWidth={px(2.4)} strokeOpacity={0.95} />
            </g>
          )}

          {/* ── SELECTION OVERLAY: the selected region's typed edges, pinned
              until click-off. Edges live at the topic grain but run BORDER to
              BORDER along the capital-to-capital line: each end dips px(11)
              past its cell's border, so the arrows point INTO territories
              instead of converging on the city dots. White-cased for
              readability, arrowhead at the target. ─────────────────────── */}
          {sel && (
            <g data-seloverlay pointerEvents="none">
              {/* the selection's NEIGHBOURHOOD (2026-07-17): every cell a road
                  reaches gets a wash of its own color too — "what is this
                  connected to" reads from the fills, not just the arrows.
                  Deliberately quieter than the selected cell on every axis
                  (0.1 vs 0.2 fill, hairline vs 3px border), and painted FIRST
                  so the primary stays the loudest thing in the overlay. It
                  follows the roads' hover dim, so pointing at one counterpart
                  recedes the rest of the neighbourhood with its roads. */}
              {[...new Set(bundles.flatMap((bd) => [bd.src, bd.tgt]))]
                .filter((id) => id !== sel && id !== endpointAtTier(sel, selTier))
                .map((cp) => {
                  const o = outlineOf(cp)
                  if (!o) return null
                  const dim = anyRoadLit && litRoad !== cp
                  return (
                    <g key={cp} data-selconn={cp} opacity={dim ? 0.25 : 1} style={{ transition: 'opacity 120ms' }}>
                      <path d={o} fill={colorOf(cp)} fillOpacity={0.1} stroke="#ffffff" strokeWidth={px(2.5)} strokeOpacity={0.9} />
                      <path d={o} fill="none" stroke={colorOf(cp)} strokeWidth={px(1.3)} strokeOpacity={0.6} />
                    </g>
                  )
                })}
              {/* The selected cell is the LOUDEST thing on the map (issue #8: a
                  hairline + faint tint was still easy to lose, especially once
                  the neighbourhood wash tinted its connections at 0.1). Three
                  layers, back to front: a real GAUSSIAN GLOW (feGaussianBlur)
                  in the cell's tree color that leaks light past the border, a
                  white separator that also tints the cell body, and a crisp
                  heavy border. The glow lives in the luminance channel the flat
                  fills never touch, so it reads as "lit" even next to a same-hue
                  sibling — a haloed cell among pale ones is selected at a glance. */}
              {selOutline && (
                <>
                  <path d={selOutline} fill={colorOf(sel)} fillOpacity={0.16} stroke={colorOf(sel)} strokeWidth={px(7)} strokeOpacity={0.5} strokeLinejoin="round" filter="url(#sel-glow)" />
                  <path d={selOutline} fill={colorOf(sel)} fillOpacity={0.22} stroke="#ffffff" strokeWidth={px(6)} strokeOpacity={0.98} strokeLinejoin="round" />
                  <path data-seloutline d={selOutline} fill="none" stroke={colorOf(sel)} strokeWidth={px(4)} strokeLinejoin="round" />
                </>
              )}
              {bundles.map((bd) => {
                const a = bd.a
                const b = bd.b
                const dx = b.x - a.x
                const dy = b.y - a.y
                const len = Math.hypot(dx, dy) || 1
                const nx = -dy / len
                const ny = dx / len
                // trim to the BORDERS of the SELECTED grain: the tail starts
                // just inside the source region, the head lands just over the
                // target's border — nothing converges on the capitals
                const dip = px(11) / len
                const exitT = ringsCrossT(a, b, bd.srcRings, 'min') ?? px(6) / len
                const entryT = ringsCrossT(a, b, bd.tgtRings, 'max') ?? 1 - px(9) / len
                const t0 = Math.max(0, exitT - dip)
                const t1 = Math.min(1, entryT + dip)
                // one line per pair now, so the bow no longer has to fan
                // parallels apart — it only keeps the road off the dead-straight
                // centroid axis. Sign is pair-deterministic, so it never flips.
                const bulge = (bd.src < bd.tgt ? 1 : -1) * px(14)
                const ax = a.x + dx * t0
                const ay = a.y + dy * t0
                const bx = a.x + dx * t1
                const by = a.y + dy * t1
                const cx = (ax + bx) / 2 + nx * bulge
                const cy = (ay + by) / 2 + ny * bulge
                const ang = (Math.atan2(by - cy, bx - cx) * 180) / Math.PI
                const d = `M${ax},${ay} Q${cx},${cy} ${bx},${by}`
                // the curve's midpoint (t = 0.5 on the quadratic) — where the
                // traffic count sits
                const mx = 0.25 * ax + 0.5 * cx + 0.25 * bx
                const my = 0.25 * ay + 0.5 * cy + 0.25 * by
                const col = bd.type ? EDGE_COLOR[bd.type] : MIXED_EDGE_COLOR
                // item 3: this road lights when the hovered counterpart is its end
                const lit = litRoad != null && (bd.src === litRoad || bd.tgt === litRoad)
                const dim = anyRoadLit && !lit
                return (
                  <g
                    key={bd.key}
                    data-seledge={`${bd.src}>${bd.tgt}`}
                    data-en={bd.n}
                    data-dir={bd.dir}
                    data-elit={lit ? 1 : 0}
                    opacity={dim ? 0.22 : 1}
                    // OB-096 — MapTooltip's relation shape, on hover. `stroke`
                    // rather than `auto`: only the drawn line (including its
                    // wider white halo, a real hit target) responds, not the
                    // curve's whole invisible fill-none bounding box.
                    pointerEvents="stroke"
                    onPointerEnter={() => setHoverEdge(bd)}
                    onPointerLeave={() => setHoverEdge((h) => (h === bd ? null : h))}
                    style={{ transition: 'opacity 120ms' }}
                  >
                    <path d={d} fill="none" stroke="#ffffff" strokeWidth={px(lit ? 4.6 : 3.6)} strokeOpacity={0.75} />
                    <path d={d} fill="none" stroke={col} strokeWidth={px(lit ? 3.4 : bd.n > 1 ? 2.4 : 1.8)} strokeOpacity={0.92} />
                    {bd.dir === 'fwd' && (
                      <path
                        d={`M0,0 L${-px(5.5)},${px(2.8)} L${-px(5.5)},${-px(2.8)} Z`}
                        transform={`translate(${bx} ${by}) rotate(${ang})`}
                        fill={col}
                      />
                    )}
                    {bd.n > 1 && (
                      <text
                        x={mx}
                        y={my - px(4)}
                        textAnchor="middle"
                        fontSize={px(10)}
                        fontWeight={700}
                        fill={col}
                        stroke="#ffffff"
                        strokeWidth={px(2.6)}
                        paintOrder="stroke"
                        style={{ userSelect: 'none' }}
                      >
                        ×{bd.n}
                      </text>
                    )}
                  </g>
                )
              })}
            </g>
          )}
        </g>
      </svg>

      {/* ── #24 THE DRAG GHOST — the cell you are carrying to the road ────────
          A portal to <body> so it floats above every pane regardless of their
          overflow. Two layers crossfade on the `outside` flag: the cell's own
          OUTLINE (drawn from outlineOf in the same user space getBBox reports,
          so any size works) while the pointer is over the map, and a NODE PILL
          once it leaves — the "shape becomes a node" morph. pointer-events:none
          so it never blocks elementFromPoint at the drop. */}
      {ghost &&
        createPortal(
          <div
            data-dragghost={ghost.id}
            style={{
              position: 'fixed',
              left: ghost.x,
              top: ghost.y,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) scale(${ghost.outside ? 0.55 : 1})`,
                opacity: ghost.outside ? 0 : 1,
                transition: 'opacity 180ms ease, transform 180ms ease',
              }}
            >
              <svg
                width={78}
                height={78}
                viewBox={`${ghost.bbox.x} ${ghost.bbox.y} ${ghost.bbox.width} ${ghost.bbox.height}`}
                style={{ overflow: 'visible', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }}
              >
                <path
                  d={outlineOf(ghost.id)}
                  fill={colorOf(ghost.id)}
                  fillOpacity={0.85}
                  stroke="#ffffff"
                  strokeWidth={Math.max(ghost.bbox.width, ghost.bbox.height) / 32}
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) scale(${ghost.outside ? 1 : 0.55})`,
                opacity: ghost.outside ? 1 : 0,
                transition: 'opacity 180ms ease, transform 180ms ease',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 9999,
                background: '#ffffff',
                border: `2px solid ${colorOf(ghost.id)}`,
                color: colorOf(ghost.id),
                fontSize: 10.5,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 9999, background: colorOf(ghost.id), flexShrink: 0 }} />
              {byId.get(ghost.id)!.title}
            </div>
          </div>,
          document.body,
        )}

      {/* ── OB-096: MapTooltip, cursor-anchored, replacing the old fixed
          top-left hover chip (OB-095) — a relation hover (an edge of the
          current selection) wins over a node hover, since the two can only
          coexist when the pointer sits exactly on the boundary between an
          edge's stroke and the territory under it. pointer-events-none so
          the card itself never steals the hover it is reporting on. ────── */}
      {pointerPos && (hoverEdge || hoverNode) && (
        <div className="absolute z-10 pointer-events-none" style={{ left: pointerPos.x + 14, top: pointerPos.y + 14 }}>
          {hoverEdge ? (
            <MapTooltip
              kind="relation"
              hue={hoverEdge.type ? EDGE_COLOR[hoverEdge.type] : MIXED_EDGE_COLOR}
              title={hoverEdge.type ? EDGE_LABEL[hoverEdge.type] : 'mixed'}
              from={byId.get(hoverEdge.src)!.title}
              to={byId.get(hoverEdge.tgt)!.title}
            />
          ) : (
            <MapTooltip
              kind="node"
              hue={colorOf(hoverNode!)}
              title={byId.get(hoverNode!)!.title}
              typeLabel={byId.get(hoverNode!)!.topic ? 'topic' : byId.get(hoverNode!)!.kind}
              nodeCount={byId.get(hoverNode!)!.kind === 'container' ? descendantCount(hoverNode!) : undefined}
              relationsIn={hoverRelIn}
              relationsOut={hoverRelOut}
              parent={parentOf(hoverNode!) !== ROOT_ID ? byId.get(parentOf(hoverNode!))?.title : undefined}
            />
          )}
        </div>
      )}

      {/* ── OB-096/097: the map's own floating chrome, all built on
          MapFloatingButton. Levels bottom-left (changes WHAT you're looking
          at — depth into the corpus); zoom + visibility bottom-right
          (changes HOW you're looking — the viewport). Replaces the deleted
          bottom info bar (OB-094): levels move here, zoom % and the wheel/
          double-click hint aren't worth the space once real zoom buttons
          exist, and the selection summary folds into MapTooltip above. ── */}
      <LevelPicker style={{ position: 'absolute', left: 12, bottom: 12, zIndex: 10 }} levels={LEVEL_LABELS} level={`L${level}`} onSelect={(l) => flyToLevel(Number(l.slice(1)))} />
      <div style={{ position: 'absolute', right: 12, bottom: 12, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <MapFloatingButton size={36} title={walkVisible ? 'hide walk nodes' : 'show walk nodes'} onClick={() => setWalkVisible((v) => !v)}>
          <VisibilityMark open={walkVisible} style={walkVisible ? undefined : { color: 'var(--bark-400)' }} />
        </MapFloatingButton>
        <ZoomControl onZoomIn={() => flyToLevel(level + 1)} onZoomOut={() => flyToLevel(level - 1)} zoomInDisabled={level >= L_MAX} zoomOutDisabled={level <= 0} />
      </div>
    </PaneCanvas>
  )
}
