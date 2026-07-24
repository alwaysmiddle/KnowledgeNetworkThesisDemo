// Map·Nested — the "territory at every level" instrument. Same geography as
// the Map (same embedding, same countries and provinces), but EVERY node owns
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

import { byId, domainIds, EDGE_COLOR, MIXED_EDGE_COLOR } from '../corpus/graph'
import type { EdgeType } from '../corpus/graph'
import { FLAT_H, FLAT_W, leafPos, provinceIds } from '../model/flat'
import type { XY } from '../model/derive'
import { colorOf, fillOf, inkOf, inkStrongOf } from '../model/color'
import { countryPath, countryRings, maxTier, nestedDots, provincePath, provinceRings, territories } from '../model/nested'
import { countryLabels, endpointAtTier, flightTargetOf, outlineOf, provinceLabels, ringsCrossT, roadsFor } from '../model/atlas'
import { fitLabel, fitRegionLabel } from '../model/labelfit'
import type { FitLine } from '../model/labelfit'
import { parentOf } from '../model/nav'
import type { Bus } from '../studio/bus'

const VB_X = -40
const VB_Y = -40
const VB_W = FLAT_W + 80
const VB_H = FLAT_H + 80
const U_CX = VB_X + VB_W / 2
const U_CY = VB_Y + VB_H / 2

// Levels run L0..maxTier — the deepest stratum in the DATA decides how far
// the scale goes. Each level is a canonical scale; there is nothing between.
const L_MAX = maxTier
const BASE_NAME = ['domains', 'modules', 'topics', 'subtopics', 'concepts', 'details', 'fine structure']
const BASE_S = [0.8, 1.6, 3.0, 5.5, 9.5, 14]
const LEVEL_NAME = Array.from({ length: L_MAX + 1 }, (_, i) => BASE_NAME[i] ?? `level ${i}`)
const LEVEL_S = Array.from({ length: L_MAX + 1 }, (_, i) => BASE_S[i] ?? BASE_S[BASE_S.length - 1] * Math.pow(1.5, i - (BASE_S.length - 1)))
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

const EDGE_ORDER: EdgeType[] = ['depends_on', 'uses', 'implemented_with', 'see_also']

interface View {
  tx: number
  ty: number
  s: number
}

export default function NestedAtlasView({ bus }: { bus: Bus }) {
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
  // bus.reveal('children'), delayed because a newly-mounting pane reflowed the
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

  // ── the selection overlay, whole: which topics the selection resolves to,
  // which of their edges survive the roll-up to this grain, and how those
  // collapse into one road per pair. All of it is model/atlas.ts's job now.
  const { tier: selTier, arrows, bundles } = useMemo(() => roadsFor(sel), [sel])
  // a selection below the topic grain gets empty roads from roadsFor — the
  // chip needs to say "of its own", not just "none", or the map looks broken
  const selBelowTopic = sel != null && selTier === 2 && !byId.get(sel)!.topic

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

  // item 2: the styled, IMMEDIATE title readout — whichever cell is highlighted
  // on the map right now, be it my own cursor's (hover) or a cross-pane hover's
  // spotlight (spotId). Not the native <title>, which lags ~half a second and is
  // OS-styled; this reads the moment the pointer lands.
  const hoverChip = hover ?? spotId

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
    <div aria-label="nested-atlas" className="relative h-full" style={{ background: '#eef4f8' }}>
      <svg
        ref={svgRef}
        data-nested
        viewBox={`${VB_X} ${VB_Y} ${VB_W} ${VB_H}`}
        className="w-full h-full"
        data-zoom={view.s.toFixed(2)}
        data-level={level}
        data-sel={sel ?? undefined}
        data-peek={peek?.id}
        style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onPointerDown={(ev) => {
          cancelFlight()
          drag.current = { x: ev.clientX, y: ev.clientY }
          dragDist.current = 0
          setDragging(true)
          ;(ev.target as Element).setPointerCapture(ev.pointerId)
        }}
        onPointerMove={(ev) => {
          if (!drag.current) return
          const rect = svgRef.current!.getBoundingClientRect()
          const ff = Math.max(VB_W / rect.width, VB_H / rect.height)
          const dx = (ev.clientX - drag.current.x) * ff
          const dy = (ev.clientY - drag.current.y) * ff
          drag.current = { x: ev.clientX, y: ev.clientY }
          dragDist.current += Math.hypot(dx, dy)
          setView((v) => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }))
        }}
        onPointerUp={() => {
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
                fill={fillOf(d)}
                fillOpacity={level === 0 ? 0.95 : 0}
                stroke="#ffffff"
                strokeOpacity={level === 0 ? 0.9 : 0}
                strokeWidth={px(1.2)}
                pointerEvents={level === 0 ? 'auto' : 'none'}
                style={{ cursor: 'pointer', transition: FADE }}
                onClick={() => regionClick(d)}
                onPointerEnter={() => enterCell(d)}
                onPointerLeave={() => leaveCell(d)}
              >
                <title>{byId.get(d)!.title}</title>
              </path>
            ))}
          </g>
          <g>
            {provinceIds.map((m) => (
              <path
                key={m}
                d={provincePath[m]}
                data-region={m}
                data-rtier={1}
                fill={fillOf(m)}
                fillOpacity={level === 1 ? 0.95 : 0}
                stroke="#ffffff"
                strokeOpacity={level === 1 ? 0.95 : 0}
                strokeWidth={px(1.1)}
                pointerEvents={level === 1 ? 'auto' : 'none'}
                style={{ cursor: 'pointer', transition: FADE }}
                onClick={() => regionClick(m)}
                onPointerEnter={() => enterCell(m)}
                onPointerLeave={() => leaveCell(m)}
              >
                <title>{byId.get(m)!.title}</title>
              </path>
            ))}
          </g>
          <g>
            {mounted.map((t) => (
              <path
                key={t.id}
                d={t.d}
                data-terr={t.id}
                data-tier={t.tier}
                fill={fillOf(t.id)}
                fillOpacity={isActive(t) ? (isMuted(t) ? 0.6 : 0.95) : 0}
                stroke="#ffffff"
                strokeOpacity={isActive(t) ? 0.95 : 0}
                strokeWidth={px(1.05)}
                pointerEvents={isActive(t) ? 'auto' : 'none'}
                style={{ cursor: 'pointer', transition: FADE }}
                onClick={() => regionClick(t.id)}
                onPointerEnter={() => enterCell(t.id)}
                onPointerLeave={() => leaveCell(t.id)}
              >
                <title>{byId.get(t.id)!.title}</title>
              </path>
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
                  fill={level === 1 ? inkOf(m.key) : colorOf(m.key)}
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
                      fill={isSel ? inkStrongOf(t.id) : inkOf(t.id)}
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

      {/* item 2: immediate title readout for the hovered (or cross-pane spotlit)
          cell — tinted by its tree color, the same hue its territory and any
          road to it carry. pointer-events-none so it never eats a click. */}
      {hoverChip && (
        <div
          data-hoverchip={hoverChip}
          className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-2.5 py-1 text-[12px] select-none pointer-events-none"
        >
          <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: colorOf(hoverChip) }} />
          <span className="font-semibold truncate max-w-[240px]" style={{ color: colorOf(hoverChip) }}>
            {byId.get(hoverChip)!.title}
          </span>
          <span className="text-slate-400 shrink-0">{byId.get(hoverChip)!.topic ? 'topic' : byId.get(hoverChip)!.kind}</span>
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 max-w-[calc(100%-24px)] rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 text-[12px] text-slate-600 select-none">
        <span className="text-slate-400">level</span>
        <div className="flex rounded border border-slate-300 overflow-hidden">
          {LEVEL_NAME.map((name, l) => (
            <button
              key={l}
              aria-label={`nested-level-${l}`}
              onClick={() => flyToLevel(l)}
              className={`px-2 py-0.5 ${level === l ? 'bg-slate-700 text-white font-semibold' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              title={`L${l} · ${name}`}
            >
              L{l}
            </button>
          ))}
        </div>
        <span className="text-slate-400">×{view.s.toFixed(2)}</span>
        <span className="w-px h-4 bg-slate-200" />
        <span className="text-slate-400" title="every frame is a designed level — there is no in-between zoom">
          wheel steps levels · double-click dives
        </span>
        {sel ? (
          <span data-selchip className="flex items-center gap-2 text-slate-700">
            <span>
              ▣ <span className="font-semibold">{byId.get(sel)!.title}</span>
            </span>
            {arrows.length > 0 ? (
              EDGE_ORDER.map((t) => {
                const n = arrows.filter((a) => a.type === t).reduce((s, a) => s + a.n, 0)
                return n > 0 ? (
                  <span key={t} style={{ color: EDGE_COLOR[t] }} className="font-semibold">
                    ● {n}
                  </span>
                ) : null
              })
            ) : (
              <span className="text-slate-400">
                {selTier < 2 ? 'no outward links at this level' : selBelowTopic ? 'no typed links of its own — relations live at the topic grain' : 'no typed links'}
              </span>
            )}
            <span className="text-slate-400">· click again, water or Esc to clear</span>
          </span>
        ) : (
          <span className="text-slate-400">
            {territories.length} territories · {nestedDots.length} places
          </span>
        )}
      </div>
    </div>
  )
}
