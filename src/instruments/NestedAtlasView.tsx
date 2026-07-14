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
// coarser map. The overlay is pinned until a re-click of the same cell, a
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

import { useEffect, useMemo, useRef, useState } from 'react'

import { byId, domainIds, domainOf, EDGE_COLOR, topicIds, topicsUnder } from '../corpus/graph'
import type { EdgeType, GEdge } from '../corpus/graph'
import { edgesTouching, FLAT_H, FLAT_W, leafPos, provinceIds, provinceOf, spreadLabels, topicAnchorOf } from '../model/flat'
import type { XY } from '../model/derive'
import { colorOf, fillOf, inkOf } from '../model/color'
import { chordAt, countryPath, countryRings, maxTier, nestedDots, provincePath, provinceRings, territories, topicPoly } from '../model/nested'
import type { Territory } from '../model/nested'
import { parentOf } from '../model/nav'

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

// ghost labels, same construction as the Map
const centroidOf = (members: string[]) => ({
  x: members.reduce((s, id) => s + leafPos[id].x, 0) / members.length,
  y: members.reduce((s, id) => s + leafPos[id].y, 0) / members.length,
})
const countryLabels = spreadLabels(
  domainIds.map((d) => ({ ...centroidOf(topicIds.filter((t) => domainOf(t) === d)), label: byId.get(d)!.title, key: d })),
)
const provinceLabels = provinceIds.map((m) => ({
  ...centroidOf(topicIds.filter((t) => provinceOf(t) === m)),
  label: byId.get(m)!.title,
  key: m,
}))

// region anchor points for the rolled-up arrows (raw centroids, not the
// overlap-spread label positions)
const domainCenter = new Map(domainIds.map((d) => [d, centroidOf(topicIds.filter((t) => domainOf(t) === d))]))
const provinceCenter = new Map(provinceIds.map((m) => [m, centroidOf(topicIds.filter((t) => provinceOf(t) === m))]))

const terrD = new Map(territories.map((t) => [t.id, t.d]))
const EDGE_ORDER: EdgeType[] = ['depends_on', 'data_flow', 'implements', 'references']
/** a bundle whose links are not all the same type has no honest type color */
const MIXED_EDGE = '#64748b'

/** param t along a→b where the segment crosses the polygon boundary. Topic
 * cells are convex and the capitals sit inside them, so the line LEAVES the
 * source cell at the smallest crossing ('min') and ENTERS the target cell at
 * the largest ('max') — exactly the two border points the edge trim needs. */
function polyCrossT(a: XY, b: XY, poly: XY[] | undefined, pick: 'min' | 'max'): number | null {
  if (!poly) return null
  const dx = b.x - a.x
  const dy = b.y - a.y
  let best: number | null = null
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const ex = q.x - p.x
    const ey = q.y - p.y
    const den = dx * ey - dy * ex
    if (Math.abs(den) < 1e-9) continue
    const t = ((p.x - a.x) * ey - (p.y - a.y) * ex) / den
    const u = ((p.x - a.x) * dy - (p.y - a.y) * dx) / den
    if (t <= 0 || t >= 1 || u < 0 || u > 1) continue
    if (best === null || (pick === 'min' ? t < best : t > best)) best = t
  }
  return best
}

/** same, over a multi-ring region outline: first exit / last entry wins */
function ringsCrossT(a: XY, b: XY, rings: XY[][] | undefined, pick: 'min' | 'max'): number | null {
  if (!rings) return null
  let best: number | null = null
  for (const r of rings) {
    const t = polyCrossT(a, b, r, pick)
    if (t !== null && (best === null || (pick === 'min' ? t < best : t > best))) best = t
  }
  return best
}

// ── LABEL FITTING (2026-07-13: capitals dropped, names wrap instead) ─────────
// SVG text does not wrap, so wrapping is ours: split the title into ≤2 lines
// and center each line on the horizontal CHORD of the (convex) cell at that
// line's height — the exact room a horizontal line of text has there. A name
// whose best split still overflows is DROPPED: not every place is named at
// every scale — zooming in names it (the hover tooltip always has it).
// force=true (the parent watermark ghost) returns its best split regardless:
// orientation text may bleed, it must not vanish.
const CHAR_W = 0.58 // ≈ average glyph width / font-size of the UI sans
const FIT = 0.88 // fraction of the chord a line may fill
interface FitLine {
  x: number
  y: number
  text: string
}

function fitLabel(title: string, t: Territory, fs: number, force: boolean): FitLine[] | null {
  const lh = fs * 1.12
  const wOf = (s: string) => s.length * fs * CHAR_W
  const at = (y: number, text: string) => {
    const c = chordAt(t.poly, y)
    return {
      x: c ? (c[0] + c[1]) / 2 : t.cx,
      y: y + fs * 0.35,
      text,
      over: wOf(text) - (c ? (c[1] - c[0]) * FIT : 0),
    }
  }
  const one = at(t.cy, title)
  if (one.over <= 0) return [one]
  const words = title.split(' ')
  let best: { l1: FitLine; l2: FitLine; over: number } | null = null
  for (let k = 1; k < words.length; k++) {
    const l1 = at(t.cy - lh / 2, words.slice(0, k).join(' '))
    const l2 = at(t.cy + lh / 2, words.slice(k).join(' '))
    const over = Math.max(l1.over, l2.over)
    if (!best || over < best.over) best = { l1, l2, over }
  }
  if (best && best.over <= 0) return [best.l1, best.l2]
  return force ? (best ? [best.l1, best.l2] : [one]) : null
}

/** an overlay arrow — one raw edge at topic grain, or a rolled-up bundle at
 * the domain/module grain */
interface Arrow {
  key: string
  src: string
  tgt: string
  type: EdgeType
  /** raw edges bundled into this arrow (1 at the topic grain) */
  n: number
  a: XY
  b: XY
  srcRings: XY[][] | undefined
  tgtRings: XY[][] | undefined
}

/** every arrow between one PAIR of cells, collapsed into a single drawn line
 * (2026-07-14, item 7). Two topics wired by four links used to be four curves
 * fanned apart by a bulge index — legible as geometry, unreadable as a map. The
 * map's question is "is there a road here, and how busy", so one road is drawn
 * and its traffic is a number. WHICH links and WHICH WAY they run is the star's
 * and the list's question, and they are one pane away. */
interface Bundle {
  key: string
  src: string
  tgt: string
  /** raw edges collapsed in here — the ×n badge */
  n: number
  /** the one relation type, or null when the bundle mixes types */
  type: EdgeType | null
  /** all links run src→tgt, or the pair is reciprocal (then: no arrowheads —
   * a two-way road with one head drawn on it would be a lie) */
  dir: 'fwd' | 'both'
  a: XY
  b: XY
  srcRings: XY[][] | undefined
  tgtRings: XY[][] | undefined
}

interface View {
  tx: number
  ty: number
  s: number
}

export interface NestedAtlasViewProps {
  onFocus?: (id: string) => void
  /** the Studio hover channel — display-only, never moves the camera */
  hoverId?: string | null
  onHover?: (id: string | null) => void
}

export default function NestedAtlasView({ onFocus, hoverId = null, onHover }: NestedAtlasViewProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [view, setView] = useState<View>({ tx: 0, ty: 0, s: LEVEL_S[0] })
  const [level, setLevel] = useState(0)
  const [clientBox, setClientBox] = useState<{ w: number; h: number } | null>(null)
  /** selected region — its topics' typed edges stay drawn until click-off */
  const [sel, setSel] = useState<string | null>(null)
  /** hover preselection — outline + tint on the cell a click would pick */
  const [hover, setHover] = useState<string | null>(null)

  // The pointer does two jobs at once: it preselects LOCALLY (the dashed
  // outline) and it publishes to the Studio hover bus, which lights the same
  // node's row/star/wheel entry over in Connections. onHover is an unmemoized
  // parent callback, so it rides a ref — putting it in an effect's deps would
  // re-run that effect every render.
  const onHoverRef = useRef(onHover)
  useEffect(() => {
    onHoverRef.current = onHover
  })
  const enterCell = (id: string) => {
    setHover(id)
    onHover?.(id)
  }
  const leaveCell = (id: string) => {
    setHover((h) => (h === id ? null : h))
    if (hoverId === id) onHover?.(null)
  }
  // a level change swaps which paths are hit targets mid-hover, so no
  // pointerleave ever fires on the old one — clear it explicitly, on the bus
  // too, or a spotlight stays lit on a cell the cursor already left
  useEffect(() => {
    setHover(null)
    onHoverRef.current?.(null)
  }, [level])

  // refs mirror state for the raw wheel listener (deps [])
  const viewRef = useRef(view)
  const levelRef = useRef(level)
  useEffect(() => {
    viewRef.current = view
    levelRef.current = level
  })

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const ro = new ResizeObserver(() => {
      const r = svg.getBoundingClientRect()
      setClientBox({ w: r.width, h: r.height })
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

  const flyTween = (target: View) => {
    cancelFlight()
    const from = viewRef.current
    const c0 = { x: (U_CX - from.tx) / from.s, y: (U_CY - from.ty) / from.s }
    const c1 = { x: (U_CX - target.tx) / target.s, y: (U_CY - target.ty) / target.s }
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / FLY_MS)
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
   * `about` (user coords) fixed under the cursor */
  const flyToLevel = (l: number, about?: XY) => {
    setLevel(l)
    levelRef.current = l
    const s = LEVEL_S[l]
    const v = viewRef.current
    const a = about ?? { x: U_CX, y: U_CY }
    flyTween({ s, tx: a.x - ((a.x - v.tx) / v.s) * s, ty: a.y - ((a.y - v.ty) / v.s) * s })
  }

  // Esc clears the selection overlay without touching the camera
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') setSel(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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

  const regionClick = (id: string) => {
    if (dragDist.current > 4) return
    // clicking the selected cell again DESELECTS it (2026-07-13)
    if (sel === id) {
      setSel(null)
      return
    }
    setSel(id)
    onFocus?.(id)
  }

  // ── the selection's edges: relations live at the topic grain, so any
  // selection resolves to topics first (itself, everything under it, or its
  // owning topic for deep nodes) and the overlay draws THEIR typed edges
  const selTopics = useMemo(() => {
    if (!sel) return []
    const under = topicsUnder(sel)
    return under.length ? under : [topicAnchorOf(sel)]
  }, [sel])
  const selEdges = useMemo(() => {
    const seen = new Map<string, GEdge>()
    for (const t of selTopics) for (const e of edgesTouching(t)) seen.set(e.id, e)
    return [...seen.values()]
  }, [selTopics])

  // ── roll the edges up to the SELECTED LEVEL: a domain/module selection
  // draws region↔region arrows (one per counterpart+type+direction, ×n for
  // the bundle, internal edges dropped); topic and deeper keep raw edges
  const selTier = sel ? (countryPath[sel] ? 0 : provincePath[sel] ? 1 : 2) : -1
  const arrows = useMemo<Arrow[]>(() => {
    if (!sel) return []
    if (selTier >= 2)
      return selEdges.map((e) => ({
        key: e.id,
        src: e.source,
        tgt: e.target,
        type: e.type,
        n: 1,
        a: leafPos[e.source],
        b: leafPos[e.target],
        srcRings: topicPoly.has(e.source) ? [topicPoly.get(e.source)!] : undefined,
        tgtRings: topicPoly.has(e.target) ? [topicPoly.get(e.target)!] : undefined,
      }))
    const regionOf = (t: string) => (selTier === 0 ? domainOf(t) : provinceOf(t))
    const center = selTier === 0 ? domainCenter : provinceCenter
    const rings = selTier === 0 ? countryRings : provinceRings
    const groups = new Map<string, { src: string; tgt: string; type: EdgeType; n: number }>()
    for (const e of selEdges) {
      const rs = regionOf(e.source)
      const rt = regionOf(e.target)
      if (rs === rt) continue // internal — the children's affair, not the region's
      const k = `${rs}>${rt}|${e.type}`
      const g = groups.get(k)
      if (g) g.n++
      else groups.set(k, { src: rs, tgt: rt, type: e.type, n: 1 })
    }
    return [...groups.entries()].map(([key, g]) => ({
      key,
      ...g,
      a: center.get(g.src)!,
      b: center.get(g.tgt)!,
      srcRings: rings[g.src],
      tgtRings: rings[g.tgt],
    }))
  }, [sel, selTier, selEdges])

  // ── collapse every arrow between the same PAIR of cells into one line
  // (item 7). Grouping is by UNORDERED pair, so a reciprocal A→B / B→A becomes
  // one two-way road, not two curves bowed past each other. Geometry comes from
  // the first arrow in the group, which fixes the drawn orientation; the rest
  // are compared against it to decide whether the road is one-way.
  const bundles = useMemo<Bundle[]>(() => {
    const by = new Map<string, Arrow[]>()
    for (const ar of arrows) {
      const k = ar.src < ar.tgt ? `${ar.src}|${ar.tgt}` : `${ar.tgt}|${ar.src}`
      const g = by.get(k)
      if (g) g.push(ar)
      else by.set(k, [ar])
    }
    return [...by.entries()].map(([key, group]) => {
      const head = group[0]
      const types = new Set(group.map((ar) => ar.type))
      return {
        key,
        src: head.src,
        tgt: head.tgt,
        n: group.reduce((s, ar) => s + ar.n, 0),
        type: types.size === 1 ? head.type : null,
        // head defines the drawn direction, so "every arrow agrees with head"
        // is exactly "one-way"
        dir: group.every((ar) => ar.src === head.src) ? ('fwd' as const) : ('both' as const),
        a: head.a,
        b: head.b,
        srcRings: head.srcRings,
        tgtRings: head.tgtRings,
      }
    })
  }, [arrows])

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
    if (level < 2) return { active, ghost }
    const world = (v: number) => (v * f) / LEVEL_S[level]
    for (const t of territories) {
      if (t.tier === level || (t.leaf && t.tier < level)) {
        const fit = fitLabel(byId.get(t.id)!.title, t, world(t.tier === level ? 12.5 : 11.5), false)
        if (fit) active.set(t.id, fit)
      } else if (level >= 3 && !t.leaf && t.tier === level - 1) {
        ghost.set(t.id, fitLabel(byId.get(t.id)!.title, t, world(PARENT_LABEL_PX), true)!)
      }
    }
    return { active, ghost }
  }, [level, f])

  // territories in play: everything up to one tier below the stratum (so the
  // next level fades IN instead of popping), viewport-culled by owning topic
  const mounted = territories.filter((t) => t.tier <= level + 1 && (t.tier === 2 || onScreen(leafPos[t.topic], 90)))
  /** the level-k countries: this tier's nodes plus every leaf that bottomed
   * out above — leaf persistence keeps jagged branches on the map */
  const isActive = (t: { tier: number; leaf: boolean }) => t.tier === level || (t.leaf && t.tier < level)
  const isMuted = (t: { tier: number; leaf: boolean }) => t.leaf && t.tier < level

  const selOutline = sel ? countryPath[sel] ?? provincePath[sel] ?? terrD.get(sel) : undefined
  const hoverOutline = hover && hover !== sel && !dragging ? countryPath[hover] ?? provincePath[hover] ?? terrD.get(hover) : undefined

  // SPOTLIGHT — a hover published by ANOTHER instrument: "the thing your cursor
  // is on over there lives HERE". Suppressed when it is just our own preselected
  // cell echoing back (that already has the dashed outline). Any node can be
  // spotlit, at any level: a deep concept lights its own small cell inside its
  // topic, which is exactly the "where does this sit?" answer. Display only —
  // the camera never moves, so a hover can never steal the view.
  const spotId = hoverId && hoverId !== hover ? hoverId : null
  const spotOutline = spotId ? countryPath[spotId] ?? provincePath[spotId] ?? terrD.get(spotId) : undefined

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
          // click on water (the svg itself, no active cell under the cursor) clears
          if (dragDist.current > 4) return
          if (ev.target === svgRef.current) setSel(null)
        }}
        onDoubleClick={(ev) => {
          const u = toUser(ev.clientX, ev.clientY)
          if (levelRef.current < L_MAX) flyToLevel(levelRef.current + 1, u)
        }}
      >
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
            {countryLabels.map((c) => (
              <text
                key={c.key}
                x={c.x}
                y={c.y}
                textAnchor="middle"
                fontSize={px(level === 0 ? 24 : PARENT_LABEL_PX)}
                fontWeight={800}
                fill={colorOf(c.key)}
                opacity={level === 0 ? 0.55 : ancLabelOAt(level, c.key)}
                style={{ userSelect: 'none', transition: 'opacity 350ms' }}
              >
                {c.label}
              </text>
            ))}
            {provinceLabels.map((m) => (
              <text
                key={m.key}
                x={m.x}
                y={m.y}
                textAnchor="middle"
                fontSize={px(level === 1 ? 15 : PARENT_LABEL_PX)}
                fontWeight={level === 1 ? 700 : 800}
                fill={level === 1 ? inkOf(m.key) : colorOf(m.key)}
                opacity={level === 1 ? 0.9 : ancLabelOAt(level - 1, m.key)}
                style={{ userSelect: 'none', transition: 'opacity 350ms' }}
              >
                {m.label}
              </text>
            ))}
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
                .map((t) => (
                  <text
                    key={t.id}
                    textAnchor="middle"
                    fontSize={px(t.tier === level ? 12.5 : 11.5)}
                    fontWeight={600}
                    fill={inkOf(t.id)}
                    stroke="#ffffff"
                    strokeWidth={px(2.4)}
                    strokeOpacity={0.85}
                    paintOrder="stroke"
                    opacity={isMuted(t) ? 0.7 : 0.92}
                    style={{ userSelect: 'none' }}
                  >
                    {labelFit.active.get(t.id)!.map((ln, i) => (
                      <tspan key={i} x={ln.x} y={ln.y}>
                        {ln.text}
                      </tspan>
                    ))}
                  </text>
                ))}
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
              {/* item 9: the selected cell used to be a hairline outline and
                  nothing else — far too quiet once the capital dots went. It now
                  also TINTS, in its own tree color: a saturated cell among pale
                  ones reads as selected at a glance, from across the pane, with
                  no hunting for a thin border. */}
              {selOutline && (
                <>
                  <path d={selOutline} fill={colorOf(sel)} fillOpacity={0.2} stroke="#ffffff" strokeWidth={px(5)} strokeOpacity={0.95} />
                  <path data-seloutline d={selOutline} fill="none" stroke={colorOf(sel)} strokeWidth={px(3)} />
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
                const col = bd.type ? EDGE_COLOR[bd.type] : MIXED_EDGE
                return (
                  <g key={bd.key} data-seledge={`${bd.src}>${bd.tgt}`} data-en={bd.n} data-dir={bd.dir}>
                    <path d={d} fill="none" stroke="#ffffff" strokeWidth={px(3.6)} strokeOpacity={0.75} />
                    <path d={d} fill="none" stroke={col} strokeWidth={px(bd.n > 1 ? 2.4 : 1.8)} strokeOpacity={0.92} />
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
              <span className="text-slate-400">{selTier < 2 ? 'no outward links at this level' : 'no typed links'}</span>
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
