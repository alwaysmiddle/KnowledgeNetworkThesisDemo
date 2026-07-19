// Children — the subtree GRAPH of where you're standing (2026-07-12: the
// in-map flip retired into this pane — the map stays territory at every
// depth, and this is the node-link reading of the focused region). ONE
// layout: the radial wheel (model/panegraph.ts; the 2026-07-12 nest
// containment mock was cut 2026-07-13 — it read as clutter, not containment).
//
// The pane is a CANVAS (2026-07-13): ring radius is fixed per depth and the
// svg pans by drag, so expanding a node only ADDS circles outward in the
// sector its parent always owned — nothing that was already on screen ever
// moves. Disclosure is hover-then-commit: the default view is the focused
// node plus its DIRECT children ("+n" badges for everything deeper);
// HOVERING a closed container previews its children as ghosts, CLICKING it
// makes the expansion permanent (clicking an open one closes it), and
// double-click re-roots via the bus. Children are ordered by their MAP
// bearing — same compass as the map.
//
// Typed relations are NOT drawn in the wheel (2026-07-12: rim satellites
// removed — two graphs in one picture read as clutter). 2026-07-13 they came
// back as a MODE instead: the pane toggles wheel ⇄ relations STAR — a one-hop
// ego graph, anchor topic pinned at the center, counterparts ringed at their
// TRUE map bearings (min-gap relaxed), one line per typed edge, arrowhead for
// direction. The bottom half is the LIST reading of whichever mode is up:
// internal → the contained children (moved here from the document page
// 2026-07-14, which now only reads), external → the grouped typed relations,
// one group per type with arrows for direction. Edges live at the topic grain;
// a focus BELOW one has none of its own, and the pane says so (2026-07-17: the
// old "via <topic>" lift, which drew the owning topic's star instead, made
// every deep selection look connected) — the empty state points at the topic.
//
// CLICK GRAMMAR (2026-07-16 audit): hover highlights, CLICK is a LOOK — the
// map flies to the node's territory and lights it, selection untouched — and
// DOUBLE-CLICK re-roots (a plain bus refocus, so map, tree and document
// follow). One grammar for every node and row in the pane; the wheel's
// containers ADD disclosure to the look (open/close AND fly) — the two answer
// different panes, so they compose, and neither selects anything. The pinned
// CENTRE speaks it too (2026-07-17, issue #6): clicking the node you are
// standing on pans the map to its territory. Breadcrumbs are the one
// exception — a crumb click has always meant "go there", so it re-roots AND
// flies the map in one gesture.
//
// HOVER BINDING (2026-07-14): the star and the list are two readings of the
// same edges, keyed by COUNTERPART topic — so hovering either lights the other,
// and the map lights that topic's territory. Note what this cannot be: edges
// are topic-to-topic (graph.ts throws otherwise) and the list is always the
// ANCHOR topic's edges, while every wheel node is a descendant of that anchor.
// So a wheel node can never BE a relationship row — the two never intersect,
// and pretending otherwise would be theatre. What the wheel gets instead is the
// cross-pane half: hover a node here, its cell lights up on the map.

// The two LAYOUTS this pane draws are model code now (2026-07-14): the wheel's
// nodes and label placement live in model/panegraph.ts, the star in
// model/star.ts. Both are pure functions of the corpus and one id, both have
// tests, and neither belongs inside a render function. What is left here is the
// pane's own business: which mode, what is open, what the cursor is on.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'

import { byId, childrenOf, EDGE_COLOR, EDGE_LABEL, pathTo, ROOT_ID } from '../corpus/graph'
import type { GEdge } from '../corpus/graph'
import { colorOf, fillOf } from '../model/color'
import { EDGE_TYPES } from '../model/nav'
import { paneGraph, placeLabels, RING, subtreeSize } from '../model/panegraph'
import { regionStarFor, starFor } from '../model/star'
import { useHover } from '../studio/bus'
import type { Bus } from '../studio/bus'

// half viewBox — wider than tall, because English titles are wide: labels
// near the horizontal extremes also flip to hang below/above their node
const VBX = 272
const VBY = 178
const HORIZ = 105 // |x| beyond this = "horizontal extreme", label goes under

// Parallel edges (one counterpart, several typed links) separate by BOWING
// apart, not by sliding sideways (2026-07-14). Two reasons: both ends stay
// anchored on the two nodes, so the arrowheads keep pointing AT them instead
// of drifting off their flanks; and the curves' MIDPOINTS — which is where the
// type words now sit — pull this far apart, which is the only thing that makes
// two labels on one spoke legible. MIN_GAP already spaces DIFFERENT
// counterparts; this spaces the links to the SAME one.
const BOW = 38
// the star's viewBox (544 units) is fitted into a pane a few hundred px wide,
// so viewBox units land at roughly 0.7 CSS px — 8.5 rendered as unreadable 6px
// type. Sized just under the node labels' 12: subordinate to them, still legible.
const EDGE_FS = 11

// ── The canvas shell (SelfNotes: both graphs pannable AND zoomable) ──────────
// One component wraps each of the pane's three svg canvases: drag pans, the
// mouse wheel zooms about the cursor, double-click on water resets, and a
// small chip reports the zoom (and the way back) whenever the view has moved.
// Zoom is GEOMETRIC — SVG scales the type with the picture, which is the
// "font size adjusts" the notes asked for — and the zoom-OUT floor is computed
// from what is actually rendering: the level where the pane's 12-unit labels
// would drop under ~8 CSS px, the edge of legibility. On a small pane that
// floor sits near ×1 (the type is already at the edge); a bigger pane earns
// real zoom-out room. A COMPONENT, not a hook: the drag refs stay inside one
// owner and never cross a boundary into anyone's render.
const Z_MAX = 8
const MIN_LEGIBLE_PX = 8
const LABEL_FS = 12 // the canvases' base label size — the legibility anchor

function PanZoomCanvas({
  resetKey,
  svgProps,
  chrome,
  children,
}: {
  /** a new key is a new picture — the view snaps home */
  resetKey: string
  /** the canvas's data-* identity, spread onto the svg */
  svgProps?: Record<string, unknown>
  /** overlays that live on the canvas but outside the svg (the grain toggle) */
  chrome?: ReactNode
  children: ReactNode
}) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [view, setView] = useState({ x: 0, y: 0, z: 1 })
  const [dragging, setDragging] = useState(false)
  const gesture = useRef({ p: null as { x: number; y: number } | null, dist: 0 })

  // render-time adjust, the pane's own expandedFor pattern
  const [resetFor, setResetFor] = useState(resetKey)
  if (resetFor !== resetKey) {
    setResetFor(resetKey)
    setView({ x: 0, y: 0, z: 1 })
  }

  // the raw listener is non-passive on purpose — React's onWheel cannot
  // preventDefault, and a zooming canvas must not scroll the page behind it.
  // Deps []: each canvas mounts its own shell, so svg and listener share a life.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault()
      const rect = el.getBoundingClientRect()
      // meet-fit: rendered px per viewBox unit, and its inverse for pointer math
      const pxPerUnit = Math.min(rect.width / (2 * VBX), rect.height / (2 * VBY))
      const f = Math.max((2 * VBX) / rect.width, (2 * VBY) / rect.height)
      const legible = Math.min(1, MIN_LEGIBLE_PX / (pxPerUnit * LABEL_FS))
      // The floor RECEDES once the picture has outgrown the frame (SelfNotes:
      // "internal view stopped working at depth 2" — an opened ring past the
      // viewBox edge was unreachable, because this floor sat near ×1 on a
      // pane-sized canvas). Fitting what is actually drawn beats keeping its
      // letterforms readable; content that fits keeps the legibility floor.
      // getBBox is in the group's own units, so pan/zoom don't perturb it.
      let fitZ = Infinity
      const bb = (el.querySelector('[data-cvg]') as SVGGraphicsElement | null)?.getBBox()
      if (bb && (bb.width > 0 || bb.height > 0)) {
        const need = Math.max(
          Math.abs(bb.y) / VBY,
          Math.abs(bb.y + bb.height) / VBY,
          Math.abs(bb.x) / VBX,
          Math.abs(bb.x + bb.width) / VBX,
        )
        if (need > 0) fitZ = 1 / need
      }
      const zMin = Math.min(legible, fitZ)
      // cursor in viewBox coords — the point the zoom holds still
      const u = {
        x: -VBX + (ev.clientX - rect.left - (rect.width - (2 * VBX) / f) / 2) * f,
        y: -VBY + (ev.clientY - rect.top - (rect.height - (2 * VBY) / f) / 2) * f,
      }
      setView((v) => {
        const z = Math.min(Z_MAX, Math.max(zMin, v.z * Math.exp(-ev.deltaY * 0.0016)))
        if (z === v.z) return v
        const k = z / v.z
        return { z, x: u.x - (u.x - v.x) * k, y: u.y - (u.y - v.y) * k }
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const moved = view.z !== 1 || view.x !== 0 || view.y !== 0
  return (
    <div className="relative flex-1 min-h-0">
      <svg
        ref={svgRef}
        {...svgProps}
        data-cvz={view.z.toFixed(2)}
        viewBox={`${-VBX} ${-VBY} ${2 * VBX} ${2 * VBY}`}
        className="w-full h-full"
        style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        // drag-to-pan; the distance guard keeps a pan's pointer-up from firing
        // the node click underneath (same contract as the map)
        onPointerDown={(ev: ReactPointerEvent) => {
          gesture.current.p = { x: ev.clientX, y: ev.clientY }
          gesture.current.dist = 0
          setDragging(true)
          ;(ev.target as Element).setPointerCapture(ev.pointerId)
        }}
        onPointerMove={(ev: ReactPointerEvent) => {
          const g = gesture.current
          const el = svgRef.current
          if (!g.p || !el) return
          const rect = el.getBoundingClientRect()
          const f = Math.max((2 * VBX) / rect.width, (2 * VBY) / rect.height)
          const dx = (ev.clientX - g.p.x) * f
          const dy = (ev.clientY - g.p.y) * f
          g.p = { x: ev.clientX, y: ev.clientY }
          g.dist += Math.hypot(dx, dy)
          setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }))
        }}
        onPointerUp={() => {
          gesture.current.p = null
          setDragging(false)
        }}
        // a pan's pointer-up must not fire the node click underneath — the
        // capture phase sees the click before any node does and swallows it.
        // The distance survives until the NEXT pointer-down, so a genuine
        // click (down resets to 0, no travel) always passes.
        onClickCapture={(ev: ReactMouseEvent) => {
          if (gesture.current.dist > 4) ev.stopPropagation()
        }}
        onDoubleClick={(ev: ReactMouseEvent) => {
          // water only — a node's own double-click (re-root) must win
          if (ev.target === svgRef.current) setView({ x: 0, y: 0, z: 1 })
        }}
      >
        {/* mid-pan the content goes pointer-inert, so sweeping across nodes
            can neither arm hover previews nor light the bus */}
        <g data-cvg transform={`translate(${view.x} ${view.y}) scale(${view.z})`} pointerEvents={dragging ? 'none' : undefined}>
          {children}
        </g>
      </svg>
      {moved && (
        <div className="absolute bottom-2 left-2 z-10 rounded border border-slate-200 bg-white/90 px-1.5 py-0.5 text-[10px] text-slate-500 select-none pointer-events-none">
          ×{view.z.toFixed(2)} — double-click resets
        </div>
      )}
      {chrome}
    </div>
  )
}

export default function ChildrenPanel({ bus }: { bus: Bus }) {
  const onSelect = (id: string) => bus.setFocus(id, 'tree')
  // the guarded enter/leave that used to be hand-rolled here (and again in the
  // atlas, and again in the document pane) is the bus's job now
  const hover = useHover(bus)

  // which id OUR OWN cursor published — the atlas's local-mirror trick. The
  // hover PREVIEW below must fire only for FOREIGN cursors: hovering one of
  // our own rows must not re-target the very pane the cursor stands in. State,
  // not a ref, so the preview derivation may read it during render; it batches
  // with the bus write, so it costs no extra render.
  const [own, setOwn] = useState<string | null>(null)
  /** join the hover channel AND remember the id as ours. Hover only ever
   * recolours (SelfNotes: it must never pan the map) — moving the camera is
   * the CLICK's job, via lookAt below. */
  const bindOwn = (id: string) => {
    const b = hover.bind(id)
    return {
      ...b,
      onPointerEnter: () => {
        setOwn(id)
        b.onPointerEnter()
      },
      onPointerLeave: () => {
        setOwn((o) => (o === id ? null : o))
        b.onPointerLeave()
      },
    }
  }

  // ── the pane's click grammar (SelfNotes audit) ────────────────────────────
  // hover = highlight · CLICK = show me where it lives (the map flies to its
  // territory at the right depth and keeps it lit — the selection does NOT
  // change) · DOUBLE-CLICK = commit, i.e. re-root the session there. The wheel
  // already spoke this way (click discloses, double-click re-roots); now every
  // node and row in the pane does.
  const lookAt = (id: string) => bus.peekAt(id)

  // ── the hover preview (SelfNotes) ─────────────────────────────────────────
  // A selection pins the pane exactly as before. With NOTHING selected (before
  // the first click, or after the map's water-click/Esc), a foreign hover
  // previews that node here — whole pane, in whichever mode is already up —
  // and snaps back to the RESTING reading when the cursor moves off. That
  // resting place is the node the nav cursor still stands on (issue #6:
  // de-selecting used to yank the pane to the whole-map root while you were
  // exploring; now the view stays around the node you deselected, and ◀ back
  // restores it as the selection). Root only before anything was selected.
  const restId = bus.history.cursor >= 0 ? bus.history.stack[bus.history.cursor] : ROOT_ID
  const focusId = bus.focus ?? (byId.has(restId) ? restId : ROOT_ID)
  const previewId = bus.focus == null && bus.hover != null && bus.hover !== own && byId.has(bus.hover) ? bus.hover : null
  const currentId = previewId ?? focusId

  const node = byId.get(currentId)!
  const path = pathTo(currentId)
  // the breadcrumb renders as ONE fixed-height line; a deep path overflows to
  // the left so its TIP stays in view — scrolled, never wrapped, so the header
  // is the same height in every state (root, preview, deep selection)
  const crumbRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = crumbRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [currentId])
  // containment's LIST reading — the focus's direct children ([] for a leaf).
  // Moved out of the document pane 2026-07-14; the wheel above is the same
  // children as a graph, this is the scannable list. Shares the hover channel,
  // so a row lights its wheel node and its map territory in one hue.
  const containedKids = childrenOf.get(currentId) ?? []

  // interactive disclosure: which containers are OPEN. Starts all-closed on
  // every refocus — only the direct children ring shows until clicks open it
  // (render-time reset — the "adjust state when a prop changes" pattern)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  // #9: the expansion is REMEMBERED per focus, so back/forward (and any return
  // to a node) restores the graph you had open there — not just the bare node
  // with its immediate children. Keyed by focus id, because the nav stack
  // mutates (a fresh selection truncates the forward entries) and a positional
  // key would go stale. Held in STATE, not a ref: the restore below reads it
  // during render (the no-flash "adjust state on change" pattern), and reading
  // a ref during render is both unsafe and lint-forbidden.
  const [expandMemo, setExpandMemo] = useState<ReadonlyMap<string, ReadonlySet<string>>>(() => new Map())
  // hover preview — a closed container the pointer is on shows its children
  // as ghosts; the click that follows just makes what's already there solid
  const [hoverPrev, setHoverPrev] = useState<string | null>(null)
  // #10: a container just clicked (its children toggled) must NOT re-assert the
  // hover ghost-preview while the pointer still sits on it — otherwise
  // de-selecting (click-to-collapse) instantly re-shows the faded children. The
  // suppression holds until the pointer LEAVES the node; re-hovering it then
  // previews again as normal.
  const [suppressPrev, setSuppressPrev] = useState<string | null>(null)
  // which reading the canvas shows: the containment wheel or the typed-
  // relations star. Sticky across refocus, so clicking a counterpart in star
  // mode hops the relation graph node to node.
  const [mode, setMode] = useState<'wheel' | 'relations'>('wheel')
  // external counterpart grain, chosen by the on-graph toggle (SelfNotes A):
  // 'summary' rings other REGIONS with ×n bundles (the map's roads); 'detailed'
  // rings the individual outside topics. Only bites when a whole region is
  // focused — a topic's star has nothing to roll up. Sticky across refocus.
  const [extMode, setExtMode] = useState<'summary' | 'detailed'>('summary')
  const [expandedFor, setExpandedFor] = useState(currentId)
  if (expandedFor !== currentId) {
    setExpandedFor(currentId)
    // #9: restore what was open here last (this is what makes back/forward
    // remember the view); all-closed the first time a focus is ever seen
    setExpanded(expandMemo.get(currentId) ?? new Set())
    setHoverPrev(null)
    setSuppressPrev(null)
  }
  // #9: set the open set AND remember it for THIS focus, so back/forward (and
  // any return here) restores exactly this graph, not the bare node. Every
  // caller is an event handler, so reading `expanded`/`currentId` from the
  // render closure is the committed value — and writing the memo here, not in
  // an effect, keeps both react-hooks rules happy (no ref-read, no set-in-effect).
  const setOpen = (next: ReadonlySet<string>) => {
    setExpanded(next)
    setExpandMemo((m) => new Map(m).set(currentId, next))
  }
  const toggleOpen = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setOpen(next)
  }
  const openAll = () => {
    const all = new Set<string>()
    const walk = (id: string) => {
      for (const k of childrenOf.get(id) ?? []) {
        if ((childrenOf.get(k.id) ?? []).length > 0) {
          all.add(k.id)
          walk(k.id)
        }
      }
    }
    walk(currentId)
    setOpen(all)
  }
  // the layout the pane DRAWS includes the hover preview; the base layout
  // (committed expansions only) tells preview ghosts from solid nodes.
  // Because rings are fixed and sectors ∝ full subtree weight, adding the
  // preview moves nothing — ghosts only appear, so hovering never jitters.
  const pgBase = useMemo(() => paneGraph(currentId, expanded), [currentId, expanded])
  const expandedEff = useMemo(
    () => (hoverPrev && hoverPrev !== suppressPrev && !expanded.has(hoverPrev) ? new Set([...expanded, hoverPrev]) : expanded),
    [expanded, hoverPrev, suppressPrev],
  )
  const pg = useMemo(() => (expandedEff === expanded ? pgBase : paneGraph(currentId, expandedEff)), [currentId, expandedEff, expanded, pgBase])
  const at = useMemo(() => new Map(pg.nodes.map((n) => [n.id, n])), [pg])
  const baseIds = useMemo(() => new Set(pgBase.nodes.map((n) => n.id)), [pgBase])

  // relations exist at the topic grain only: the focused topic itself, or —
  // below one — the topic on the containment path. Containers ABOVE the topic
  // tier honestly get no relationship section, which is why starFor's anchor
  // is nullable.
  const { anchor: anchorTopic, rels, nodes: star } = useMemo(() => starFor(currentId), [currentId])
  // …but the pane REFUSES the lift (2026-07-17): a deep node has no typed links
  // of its own, and drawing its owning topic's star here made every deep
  // selection look connected. The model still names the owner (viaTopic) so the
  // empty state can point at where the relations actually live.
  const viaTopic = anchorTopic !== null && anchorTopic !== currentId ? anchorTopic : null

  // A whole REGION (domain/module) has no topic anchor, so starFor is empty —
  // but the map draws its rolled-up roads, so external here reads the region as
  // the centre and rings its EXTERNAL counterparts. The extMode toggle picks the
  // counterpart grain. null for topics (the star above) and the root. SelfNotes A.
  const regionStar = useMemo(() => (anchorTopic ? null : regionStarFor(currentId, extMode)), [anchorTopic, currentId, extMode])

  // committed labels place first, ghosts fit around them — the no-jitter
  // contract applied to typography
  const labels = useMemo(() => placeLabels(pg, baseIds), [pg, baseIds])

  // ── hover binding (2026-07-14, item 4) ──────────────────────────────────
  // The star and the list are two readings of the SAME edge set, keyed by
  // counterpart topic — so ONE hovered id lights both, whichever one the
  // cursor is actually over (and the map can light them too, or be lit).
  // starLit is what licenses the dim: only when the hovered id really is one
  // of this star's counterparts do the others recede. Hovering a wheel node or
  // an unrelated map cell must not gray out a star it has nothing to say about.
  const starLit = star.some((s) => hover.lit(s.id))
  // same dim contract for the region star: only recede the others once the
  // hovered id really is one of THIS star's counterparts
  const regionLit = regionStar ? regionStar.nodes.some((s) => hover.lit(s.id)) : false
  const anchorTitle = anchorTopic ? byId.get(anchorTopic)!.title : ''

  /** one relationship row — the outgoing and incoming lists differ only in
   * which end is the counterpart, so they share this */
  const relRow = (e: GEdge, cp: string, out: boolean) => {
    const lit = hover.lit(cp)
    return (
      <button
        key={e.id}
        data-relrow={e.id}
        {...bindOwn(cp)}
        onClick={() => lookAt(cp)}
        onDoubleClick={() => onSelect(cp)}
        className={[
          'text-left px-2 py-1 rounded border text-[11.5px] flex items-center gap-1.5',
          lit ? 'border-slate-400 font-semibold' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
        ].join(' ')}
        // the lit tint is the counterpart's OWN tree color — the row, the star
        // node and the map territory all say the same thing in the same hue
        style={lit ? { borderColor: colorOf(cp), background: fillOf(cp) } : undefined}
        title={`${out ? anchorTitle : byId.get(cp)!.title} ${EDGE_LABEL[e.type]} ${out ? byId.get(cp)!.title : anchorTitle} — click to show on the map · double-click to re-root`}
      >
        <span className="text-slate-400 shrink-0">{out ? '→' : '←'}</span>
        <span className="truncate font-medium" style={{ color: colorOf(cp) }}>
          {byId.get(cp)!.title}
        </span>
      </button>
    )
  }

  return (
    <div aria-label="children-panel" data-focus={bus.focus ?? undefined} className="h-full flex flex-col">
      <div className="shrink-0 px-3 pt-2">
        {/* breadcrumb — the containment path; every chip above the tip goes up.
            ONE line, never wraps (SelfNotes audit: a preview sweeping across
            deep nodes used to grow this to two/three lines and bounce the whole
            pane) — long paths slide left so the TIP always shows. */}
        <div
          ref={crumbRef}
          className="flex flex-nowrap items-center gap-1 text-[11px] mb-1 h-5 overflow-x-hidden whitespace-nowrap"
        >
          {path.map((id, i) => {
            const last = i === path.length - 1
            return (
              <span key={id} className="flex items-center gap-1 shrink-0">
                {i > 0 && <span className="text-slate-300">›</span>}
                {last ? (
                  // the tip is where you already stand — clicking it is a LOOK,
                  // the map pans to its territory (issue #6, with the centres)
                  <button
                    data-crumb={id}
                    onClick={() => lookAt(id)}
                    className="font-bold hover:underline"
                    style={{ color: colorOf(id) }}
                    title={`${byId.get(id)!.title} — click to show on the map`}
                  >
                    {byId.get(id)!.title}
                  </button>
                ) : (
                  // a crumb click has always meant "go there"; the map now goes
                  // there TOO (issue #6) — re-root and flight in one gesture
                  <button
                    data-crumb={id}
                    onClick={() => {
                      onSelect(id)
                      lookAt(id)
                    }}
                    className="text-slate-500 hover:text-slate-800 hover:underline"
                    title={`${byId.get(id)!.title} — re-root here; the map follows`}
                  >
                    {byId.get(id)!.title}
                  </button>
                )}
              </span>
            )
          })}
        </div>

        {/* SelfNotes: previewing, not standing — a foreign cursor is showing us
            around while nothing is selected. The chip is the pane saying so.
            The SLOT is always there (fixed height) so a preview appearing or
            leaving never reflows what is below it. */}
        <div className="h-5 flex items-center gap-1.5 text-[10px] mb-0.5 select-none">
          {previewId && (
            <>
              <span data-childpreview={previewId} className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 font-bold uppercase tracking-wide">
                preview
              </span>
              <span className="text-slate-500 truncate">
                hovering <span className="font-semibold" style={{ color: colorOf(previewId) }}>{byId.get(previewId)!.title}</span> — click to select it
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-500 mb-1 select-none">
          {/* SelfNotes: browser-style history over the focus — every hop made
              anywhere (star node, map cell, tree row) can be walked back */}
          <div className="flex rounded border border-slate-300 overflow-hidden">
            <button
              aria-label="children-nav-back"
              disabled={!bus.canBack}
              onClick={bus.back}
              className="px-1.5 py-0.5 bg-white text-slate-600 enabled:hover:bg-slate-100 disabled:text-slate-300"
              title="back — the previous focus"
            >
              ◀
            </button>
            <button
              aria-label="children-nav-forward"
              disabled={!bus.canForward}
              onClick={bus.forward}
              className="px-1.5 py-0.5 bg-white text-slate-600 enabled:hover:bg-slate-100 disabled:text-slate-300 border-l border-slate-200"
              title="forward — the focus you stepped back from"
            >
              ▶
            </button>
          </div>
          <div className="flex rounded border border-slate-300 overflow-hidden">
            {(['wheel', 'relations'] as const).map((m) => (
              <button
                key={m}
                aria-label={`children-mode-${m}`}
                onClick={() => setMode(m)}
                className={`px-1.5 py-0.5 ${mode === m ? 'bg-slate-700 text-white font-semibold' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                title={
                  m === 'wheel'
                    ? 'internal — the containment wheel: what is INSIDE this node'
                    : "external — the topic's typed relations OUT to other topics, at their map bearings"
                }
              >
                {m === 'wheel' ? 'internal' : 'external'}
              </button>
            ))}
          </div>
          {mode === 'wheel' && pg.depthAvail > 1 && (
            <span className="flex items-center gap-1">
              <button
                aria-label="children-open-all"
                onClick={openAll}
                className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                title="open every container in the subtree"
              >
                open all
              </button>
              {expanded.size > 0 && (
                <button
                  aria-label="children-close-all"
                  onClick={() => setOpen(new Set())}
                  className="px-1.5 py-0.5 rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                  title="back to direct children only"
                >
                  close all
                </button>
              )}
            </span>
          )}
          {mode === 'wheel' && pg.depthAvail > 0 && (
            <span className="text-slate-400">
              {pgBase.nodes.length - 1} of {subtreeSize(currentId)} beneath · rings {pgBase.shown}/{pg.depthAvail}
            </span>
          )}
          {mode === 'relations' &&
            (viaTopic ? (
              <span className="text-slate-400">no typed links of its own</span>
            ) : anchorTopic ? (
              <span className="text-slate-400">
                {rels.length} typed link{rels.length === 1 ? '' : 's'}
              </span>
            ) : regionStar && regionStar.nodes.length > 0 ? (
              <span className="text-slate-400">
                {regionStar.edges.length} external link{regionStar.edges.length === 1 ? '' : 's'} · {regionStar.nodes.length}{' '}
                {extMode === 'summary' ? 'area' : 'topic'}
                {regionStar.nodes.length === 1 ? '' : 's'}
              </span>
            ) : null)}
        </div>
      </div>

      {mode === 'relations' ? (
        viaTopic ? (
          <div className="text-[11px] text-slate-400 italic px-3 mt-2">
            {node.title} has no typed links of its own — relations live at the topic grain. See{' '}
            <button
              onClick={() => onSelect(viaTopic)}
              className="not-italic font-semibold hover:underline"
              style={{ color: colorOf(viaTopic) }}
              title={`re-root on ${byId.get(viaTopic)!.title}`}
            >
              {byId.get(viaTopic)!.title}
            </button>
            , the topic it belongs to.
          </div>
        ) : !anchorTopic ? (
          regionStar && regionStar.nodes.length > 0 ? (
            <PanZoomCanvas
              resetKey={`${currentId}|${extMode}`}
              svgProps={{ 'data-regionstar': true }}
              chrome={
                /* the settings toggle the notes asked for: on the graph, bottom
                   right. Flips the external counterpart grain (summary ⇄ detailed). */
                <div className="absolute bottom-2 right-2 z-10 flex rounded border border-slate-300 overflow-hidden bg-white/90 shadow-sm text-[10px] select-none">
                  {(['summary', 'detailed'] as const).map((m) => (
                    <button
                      key={m}
                      aria-label={`ext-grain-${m}`}
                      onClick={() => setExtMode(m)}
                      className={`px-1.5 py-0.5 ${extMode === m ? 'bg-slate-700 text-white font-semibold' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
                      title={
                        m === 'summary'
                          ? 'summary — one bundled arrow per other area, with an ×n count (matches the map)'
                          : 'detailed — every outside topic, one line per real link'
                      }
                    >
                      {m}
                    </button>
                  ))}
                </div>
              }
            >
                {/* spokes: one per strand — a single edge (detailed) or a
                    bundled type (summary, ×n). Same visual language as the topic
                    star: color = type, arrowhead = direction, bow spreads
                    parallel strands so their type words stay legible. */}
                <g pointerEvents="none">
                  {regionStar.nodes.map((sn) => {
                    const len = Math.hypot(sn.x, sn.y) || 1
                    const ux = sn.x / len
                    const uy = sn.y / len
                    const lit = hover.lit(sn.id)
                    const dim = regionLit && !lit
                    const n = sn.strands.length
                    const ax = ux * 19
                    const ay = uy * 19
                    // the ring is an ellipse, so the spoke's reach is this
                    // node's OWN distance, not a shared radius
                    const bx = ux * (len - 13)
                    const by = uy * (len - 13)
                    return sn.strands.map((s, i) => {
                      const bow = n === 1 ? 0 : (i - (n - 1) / 2) * BOW
                      const cx = (ax + bx) / 2 - uy * bow
                      const cy = (ay + by) / 2 + ux * bow
                      const mx = 0.25 * ax + 0.5 * cx + 0.25 * bx
                      const my = 0.25 * ay + 0.5 * cy + 0.25 * by
                      // 'out' heads at the counterpart, 'in' back at the region,
                      // 'both' draws no head (a two-way road with one would lie)
                      const head = s.dir === 'both' ? null : s.dir === 'out' ? { x: bx, y: by } : { x: ax, y: ay }
                      const deg = head ? (Math.atan2(head.y - cy, head.x - cx) * 180) / Math.PI : 0
                      let rot = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
                      if (rot > 90 || rot < -90) rot += 180
                      return (
                        <g key={s.key} data-regionstrand={s.key} opacity={dim ? 0.2 : 1} style={{ transition: 'opacity 120ms' }}>
                          <path d={`M${ax},${ay} Q${cx},${cy} ${bx},${by}`} fill="none" stroke="#ffffff" strokeWidth={3.6} strokeOpacity={0.8} />
                          <path d={`M${ax},${ay} Q${cx},${cy} ${bx},${by}`} fill="none" stroke={EDGE_COLOR[s.type]} strokeWidth={lit ? 2.8 : 1.8} strokeOpacity={0.92} />
                          {head && <path d="M0,0 L-6,3 L-6,-3 Z" transform={`translate(${head.x} ${head.y}) rotate(${deg})`} fill={EDGE_COLOR[s.type]} />}
                          <text
                            data-regionstrandlabel={s.key}
                            x={mx}
                            y={my}
                            transform={`rotate(${rot} ${mx} ${my})`}
                            textAnchor="middle"
                            fontSize={EDGE_FS}
                            fontWeight={700}
                            fill={EDGE_COLOR[s.type]}
                            stroke="#ffffff"
                            strokeWidth={3}
                            paintOrder="stroke"
                            style={{ userSelect: 'none' }}
                          >
                            {EDGE_LABEL[s.type]}
                            {s.n > 1 ? ` ×${s.n}` : ''}
                          </text>
                        </g>
                      )
                    })
                  })}
                </g>
                {/* the region itself, pinned at the centre — clickable (issue
                    #6): a look, the map pans to the region's territory */}
                <circle
                  data-regioncenter={regionStar.center}
                  cx={0}
                  cy={0}
                  r={15}
                  fill="#ffffff"
                  stroke={colorOf(regionStar.center)}
                  strokeWidth={3}
                  style={{ cursor: 'pointer' }}
                  onClick={() => lookAt(regionStar.center)}
                >
                  <title>{byId.get(regionStar.center)!.title} — click to show on the map</title>
                </circle>
                <text x={0} y={-26} textAnchor="middle" fontSize={13.5} fontWeight={700} fill="#1e293b" stroke="#ffffff" strokeWidth={3.4} paintOrder="stroke" style={{ userSelect: 'none' }}>
                  {byId.get(regionStar.center)!.title}
                </text>
                {/* counterparts — other areas (summary) or outside topics
                    (detailed) — at their true map bearings */}
                {regionStar.nodes.map((sn) => {
                  const horiz = Math.abs(sn.x) > HORIZ
                  const lit = hover.lit(sn.id)
                  const dim = regionLit && !lit
                  return (
                    <g key={sn.id} opacity={dim ? 0.25 : 1} style={{ transition: 'opacity 120ms' }}>
                      {lit && <circle cx={sn.x} cy={sn.y} r={15} fill={colorOf(sn.id)} fillOpacity={0.18} pointerEvents="none" />}
                      <circle
                        data-regionnode={sn.id}
                        {...bindOwn(sn.id)}
                        cx={sn.x}
                        cy={sn.y}
                        r={9}
                        fill={fillOf(sn.id)}
                        stroke={colorOf(sn.id)}
                        strokeWidth={lit ? 3.4 : 2}
                        style={{ cursor: 'pointer' }}
                        onClick={() => lookAt(sn.id)}
                        onDoubleClick={() => onSelect(sn.id)}
                      >
                        <title>
                          {byId.get(sn.id)!.title} — {sn.n} link{sn.n === 1 ? '' : 's'} · click to show on the map · double-click to re-root
                        </title>
                      </circle>
                      <text
                        x={horiz ? sn.x : sn.x + (sn.x >= 0 ? 13 : -13)}
                        y={horiz ? (sn.y >= 0 ? sn.y + 22 : sn.y - 16) : sn.y + 4}
                        textAnchor={horiz ? 'middle' : sn.x >= 0 ? 'start' : 'end'}
                        fontSize={12}
                        fontWeight={lit ? 700 : 600}
                        fill={lit ? colorOf(sn.id) : '#334155'}
                        stroke="#ffffff"
                        strokeWidth={3}
                        paintOrder="stroke"
                        pointerEvents="none"
                        style={{ userSelect: 'none' }}
                      >
                        {byId.get(sn.id)!.title}
                      </text>
                    </g>
                  )
                })}
            </PanZoomCanvas>
          ) : (
            <div className="text-[11px] text-slate-400 italic px-3 mt-2">
              {regionStar
                ? `${node.title} links only within itself — nothing here reaches out to other areas.`
                : `${node.title} is the whole map — every link is internal.`}
            </div>
          )
        ) : star.length === 0 ? (
          <div className="text-[11px] text-slate-400 italic px-3 mt-2">
            no typed links touch {byId.get(anchorTopic)!.title}.
          </div>
        ) : (
          <PanZoomCanvas resetKey={currentId} svgProps={{ 'data-relstar': true }}>
              {/* edges: one line per typed link — color = type, arrowhead = direction */}
              <g pointerEvents="none">
                {star.map((sn) => {
                  const len = Math.hypot(sn.x, sn.y) || 1
                  const ux = sn.x / len
                  const uy = sn.y / len
                  const lit = hover.lit(sn.id)
                  const dim = starLit && !lit
                  const n = sn.edges.length
                  // both ends anchored: tail at the anchor's rim, head at the
                  // counterpart's. Only the middle moves. The ring is an
                  // ellipse, so the reach is this node's OWN distance.
                  const ax = ux * 19
                  const ay = uy * 19
                  const bx = ux * (len - 13)
                  const by = uy * (len - 13)
                  return sn.edges.map((e, i) => {
                    // bow this link off the straight line; n === 1 stays straight
                    const bow = n === 1 ? 0 : (i - (n - 1) / 2) * BOW
                    const cx = (ax + bx) / 2 - uy * bow
                    const cy = (ay + by) / 2 + ux * bow
                    // the quadratic's own midpoint (t = 0.5) — where the type
                    // word goes, and the reason the bow exists
                    const mx = 0.25 * ax + 0.5 * cx + 0.25 * bx
                    const my = 0.25 * ay + 0.5 * cy + 0.25 * by
                    const outward = e.source === anchorTopic
                    // the head sits at whichever end the edge points to, angled
                    // along the curve's TANGENT there (b − c at the far end,
                    // a − c at the near one) — not along the straight chord
                    const hx = outward ? bx : ax
                    const hy = outward ? by : ay
                    const deg = (Math.atan2(outward ? by - cy : ay - cy, outward ? bx - cx : ax - cx) * 180) / Math.PI
                    // the word reads along the spoke, flipped upright on the
                    // left half so it is never upside-down
                    let rot = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
                    if (rot > 90 || rot < -90) rot += 180
                    return (
                      <g key={e.id} data-staredge={e.id} opacity={dim ? 0.2 : 1} style={{ transition: 'opacity 120ms' }}>
                        <path d={`M${ax},${ay} Q${cx},${cy} ${bx},${by}`} fill="none" stroke="#ffffff" strokeWidth={3.6} strokeOpacity={0.8} />
                        <path
                          d={`M${ax},${ay} Q${cx},${cy} ${bx},${by}`}
                          fill="none"
                          stroke={EDGE_COLOR[e.type]}
                          strokeWidth={lit ? 2.8 : 1.8}
                          strokeOpacity={0.92}
                        />
                        <path d="M0,0 L-6,3 L-6,-3 Z" transform={`translate(${hx} ${hy}) rotate(${deg})`} fill={EDGE_COLOR[e.type]} />
                        {/* the type word, white-cased so it punches through the
                            line it sits on — item 5: the star says WHICH relation */}
                        <text
                          data-staredgelabel={e.id}
                          x={mx}
                          y={my}
                          transform={`rotate(${rot} ${mx} ${my})`}
                          textAnchor="middle"
                          fontSize={EDGE_FS}
                          fontWeight={700}
                          fill={EDGE_COLOR[e.type]}
                          stroke="#ffffff"
                          strokeWidth={3}
                          paintOrder="stroke"
                          style={{ userSelect: 'none' }}
                        >
                          {EDGE_LABEL[e.type]}
                        </text>
                      </g>
                    )
                  })
                })}
              </g>
              {/* the anchor topic, pinned at the center — clickable (issue #6):
                  a look, the map pans to the topic's territory */}
              <circle
                data-starcenter={anchorTopic}
                cx={0}
                cy={0}
                r={15}
                fill="#ffffff"
                stroke={colorOf(anchorTopic)}
                strokeWidth={3}
                style={{ cursor: 'pointer' }}
                onClick={() => lookAt(anchorTopic)}
              >
                <title>{byId.get(anchorTopic)!.title} — click to show on the map</title>
              </circle>
              <text
                x={0}
                y={-26}
                textAnchor="middle"
                fontSize={13.5}
                fontWeight={700}
                fill="#1e293b"
                stroke="#ffffff"
                strokeWidth={3.4}
                paintOrder="stroke"
                style={{ userSelect: 'none' }}
              >
                {byId.get(anchorTopic)!.title}
              </text>
              {/* counterpart topics, at their true map bearings. A lit node
                  keeps full ink and grows a halo; the rest recede — the dim is
                  what turns "one of these is hovered" into "THIS one is". */}
              {star.map((sn) => {
                const horiz = Math.abs(sn.x) > HORIZ
                const lit = hover.lit(sn.id)
                const dim = starLit && !lit
                return (
                  <g key={sn.id} opacity={dim ? 0.25 : 1} style={{ transition: 'opacity 120ms' }}>
                    {lit && <circle cx={sn.x} cy={sn.y} r={15} fill={colorOf(sn.id)} fillOpacity={0.18} pointerEvents="none" />}
                    <circle
                      data-starnode={sn.id}
                      {...bindOwn(sn.id)}
                      cx={sn.x}
                      cy={sn.y}
                      r={9}
                      fill={fillOf(sn.id)}
                      stroke={colorOf(sn.id)}
                      strokeWidth={lit ? 3.4 : 2}
                      style={{ cursor: 'pointer' }}
                      onClick={() => lookAt(sn.id)}
                      onDoubleClick={() => onSelect(sn.id)}
                    >
                      <title>
                        {byId.get(sn.id)!.title} — {sn.edges.length} link{sn.edges.length === 1 ? '' : 's'} · click to show on the map · double-click to re-root
                      </title>
                    </circle>
                    <text
                      x={horiz ? sn.x : sn.x + (sn.x >= 0 ? 13 : -13)}
                      y={horiz ? (sn.y >= 0 ? sn.y + 22 : sn.y - 16) : sn.y + 4}
                      textAnchor={horiz ? 'middle' : sn.x >= 0 ? 'start' : 'end'}
                      fontSize={12}
                      fontWeight={lit ? 700 : 600}
                      fill={lit ? colorOf(sn.id) : '#334155'}
                      stroke="#ffffff"
                      strokeWidth={3}
                      paintOrder="stroke"
                      pointerEvents="none"
                      style={{ userSelect: 'none' }}
                    >
                      {byId.get(sn.id)!.title}
                    </text>
                  </g>
                )
              })}
          </PanZoomCanvas>
        )
      ) : pg.depthAvail === 0 ? (
        <div className="text-[11px] text-slate-400 italic px-3 mt-2">
          nothing inside — {node.title} is a leaf concept. Use the breadcrumb to step back up.
        </div>
      ) : (
        <PanZoomCanvas resetKey={currentId} svgProps={{ 'data-panegraph': true, 'data-pgdepth': pg.shown }}>
              {/* containment skeleton — dashed spokes to preview ghosts */}
              <g pointerEvents="none">
                {pg.nodes
                  .filter((n) => n.parent)
                  .map((n) => {
                    const p = at.get(n.parent!)!
                    const ghost = !baseIds.has(n.id)
                    return (
                      <line
                        key={n.id}
                        x1={p.x * RING}
                        y1={p.y * RING}
                        x2={n.x * RING}
                        y2={n.y * RING}
                        stroke="#94a3b8"
                        strokeOpacity={ghost ? 0.35 : 0.55}
                        strokeWidth={1.4}
                        strokeDasharray={ghost ? '4 3' : undefined}
                      />
                    )
                  })}
              </g>

              {/* the subtree — root at the center; hover ghosts are inert
                  (pointer events off) so sweeping toward them can't flicker
                  the preview through its own children */}
              <g>
                {pg.nodes.map((n) => {
                  const c = colorOf(n.id)
                  const ghost = !baseIds.has(n.id)
                  const open = n.depth > 0 && n.container && expanded.has(n.id)
                  // lit from the bus — either this pane's own cursor, or the
                  // map telling us the pointer is standing on this territory
                  const lit = !ghost && n.depth > 0 && hover.lit(n.id)
                  const r = n.depth === 0 ? 15 : n.container ? 10.5 : 7
                  return (
                    <g key={n.id} opacity={ghost ? 0.55 : 1}>
                      {lit && <circle cx={n.x * RING} cy={n.y * RING} r={r + 6} fill={c} fillOpacity={0.18} pointerEvents="none" />}
                      <circle
                        data-pgnode={n.id}
                        data-kind={n.container ? 'container' : 'leaf'}
                        data-open={open ? 1 : 0}
                        data-preview={ghost ? 1 : 0}
                        data-lit={lit ? 1 : 0}
                        cx={n.x * RING}
                        cy={n.y * RING}
                        r={r}
                        fill={n.container ? '#ffffff' : fillOf(n.id)}
                        stroke={c}
                        strokeWidth={n.depth === 0 ? 3 : lit ? 3.4 : n.container ? 2.2 : 1.4}
                        strokeDasharray={ghost ? '3 2' : undefined}
                        pointerEvents={ghost ? 'none' : undefined}
                        style={!ghost ? { cursor: 'pointer' } : undefined}
                        // hover previews a closed container's children as
                        // ghosts; the click commits exactly what the preview
                        // showed (nothing else moves — fixed rings), so no
                        // deferred-click dance is needed any more.
                        // Every node — leaf or container — also publishes to
                        // the hover bus, which is what lights its territory on
                        // the map. Only containers preview.
                        // The click grammar: EVERY click is a LOOK (the map
                        // flies to the node's territory); a container's click
                        // is ALSO disclosure (open/close) — the two answer
                        // different panes, so they compose instead of
                        // competing. Double-click commits — re-root — on both.
                        // the CENTRE too (issue #6): clicking the node you are
                        // standing on is a plain look — the map pans to it
                        onClick={
                          n.depth === 0
                            ? () => lookAt(n.id)
                            : !ghost
                              ? () => {
                                  if (n.container) {
                                    toggleOpen(n.id)
                                    setSuppressPrev(n.id) // #10: no hover re-preview until the pointer leaves
                                  }
                                  lookAt(n.id)
                                }
                              : undefined
                        }
                        onDoubleClick={n.depth > 0 && !ghost ? () => onSelect(n.id) : undefined}
                        // this one cannot just spread the bind — the pointer
                        // here does one extra job (mark the id as our own, arm
                        // the container preview) beyond publishing to the bus.
                        // Mid-drag suppression and post-drag click-swallowing
                        // are the canvas shell's job now.
                        onPointerEnter={
                          n.depth > 0 && !ghost
                            ? () => {
                                setOwn(n.id)
                                bus.setHover(n.id)
                                if (n.container) setHoverPrev(n.id)
                              }
                            : undefined
                        }
                        onPointerLeave={
                          n.depth > 0 && !ghost
                            ? () => {
                                setOwn((o) => (o === n.id ? null : o))
                                bus.endHover(n.id)
                                if (n.container) {
                                  setHoverPrev((h) => (h === n.id ? null : h))
                                  setSuppressPrev((s) => (s === n.id ? null : s)) // #10: leaving re-arms the preview
                                }
                              }
                            : undefined
                        }
                      >
                        <title>
                          {byId.get(n.id)!.title}
                          {n.depth > 0
                            ? n.container
                              ? open
                                ? ' — click to close & show on the map · double-click to re-root'
                                : ` — +${n.clipped} inside: hover previews, click opens & shows on the map · double-click to re-root`
                              : ' — click to show on the map · double-click to re-root'
                            : ' — click to show on the map'}
                        </title>
                      </circle>
                      {n.clipped > 0 && (
                        <text x={n.x * RING} y={n.y * RING + 3.4} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={c} pointerEvents="none" style={{ userSelect: 'none' }}>
                          +{n.clipped}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>

              {/* names — kept at their node's angle, staggered outward on
                  collision; a leader line marks each displaced label */}
              <g pointerEvents="none">
                {labels.map((l) => {
                  const n = at.get(l.id)!
                  return (
                    <g key={l.id} opacity={l.ghost ? 0.55 : 1}>
                      {l.leader && (
                        <line
                          x1={l.leader.x1}
                          y1={l.leader.y1}
                          x2={l.leader.x2}
                          y2={l.leader.y2}
                          stroke="#94a3b8"
                          strokeWidth={0.9}
                          strokeOpacity={0.6}
                        />
                      )}
                      <text
                        x={l.x}
                        y={l.y}
                        textAnchor={l.anchor}
                        fontSize={12}
                        fontWeight={n.container ? 600 : 500}
                        fill={n.container ? '#334155' : '#475569'}
                        stroke="#ffffff"
                        strokeWidth={3}
                        paintOrder="stroke"
                        style={{ userSelect: 'none' }}
                      >
                        {byId.get(l.id)!.title}
                      </text>
                    </g>
                  )
                })}
                <text x={0} y={-26} textAnchor="middle" fontSize={13.5} fontWeight={700} fill="#1e293b" stroke="#ffffff" strokeWidth={3.4} paintOrder="stroke" style={{ userSelect: 'none' }}>
                  {node.title}
                </text>
              </g>
        </PanZoomCanvas>
      )}

      {/* The bottom half is the LIST reading, and it now MATCHES the mode above
          it: internal → the contained children (moved out of the document pane
          2026-07-14, which now only reads), external → the typed relations. Each
          mode is a graph reading (wheel / star) stacked over a list reading of
          the SAME thing. The border-t-2 is deliberately heavy — these are two
          distinct instruments sharing a pane, not one scrolling column — and it
          is the "visible border between the relationships view and the graph".
          The section is a FIXED fraction of the pane (item 6), not content-
          sized, so toggling internal ⇄ external never shifts the graph/list
          boundary — the window is static and the list scrolls inside it.
          24% since the 2026-07-16 audit (half its old height — the graph is
          the pane's main reading and gets the room). Empty states still say
          so out loud rather than collapsing the frame to blank. */}
      {mode === 'wheel' ? (
        <div aria-label="children-contained" className="shrink-0 h-[24%] overflow-y-auto border-t-2 border-slate-300 px-3 pt-2 pb-1.5">
          <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">Contained ({containedKids.length})</div>
          {containedKids.length === 0 ? (
            <div className="text-[11px] text-slate-400">no children — {node.title} is a leaf</div>
          ) : (
            <div className="flex flex-col gap-1">
              {containedKids.map((k) => {
                const lit = hover.lit(k.id)
                return (
                  <button
                    key={k.id}
                    data-containedrow={k.id}
                    {...bindOwn(k.id)}
                    onClick={() => lookAt(k.id)}
                    onDoubleClick={() => onSelect(k.id)}
                    className={[
                      'text-left px-2 py-1 rounded border text-[11.5px] flex items-center gap-1.5',
                      lit ? 'border-slate-400 font-semibold' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
                    ].join(' ')}
                    // lit tint is the child's OWN tree color — the row, its wheel
                    // node and its map territory all say it in the same hue
                    style={lit ? { borderColor: colorOf(k.id), background: fillOf(k.id) } : undefined}
                    title={`${byId.get(k.id)!.title} — click to show on the map · double-click to re-root`}
                  >
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: colorOf(k.id) }} />
                    <span className="truncate font-medium" style={{ color: colorOf(k.id) }}>
                      {byId.get(k.id)!.title}
                    </span>
                    <span className="text-slate-400 ml-auto shrink-0">{byId.get(k.id)!.kind}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : !anchorTopic ? (
        <div aria-label="children-relationships" className="shrink-0 h-[24%] overflow-y-auto border-t-2 border-slate-300 px-3 pt-2 pb-1.5">
          <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">
            Relationships ({regionStar ? regionStar.edges.length : 0})
            {regionStar && regionStar.nodes.length > 0 && (
              <span className="font-normal text-slate-400">
                {' '}
                — {regionStar.nodes.length} {extMode === 'summary' ? 'area' : 'topic'}
                {regionStar.nodes.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          {!regionStar || regionStar.nodes.length === 0 ? (
            <>
              <div className="text-[11px] text-slate-400">no relationships to display</div>
              <div className="text-[10.5px] text-slate-400 italic mt-0.5">
                {regionStar ? 'everything this region connects to is inside it' : 'this is the whole map — every link is internal'}
              </div>
            </>
          ) : (
            // one row per counterpart, its strands shown as type chips (×n and a
            // direction glyph) — the list reading of the same star above it
            <div className="flex flex-col gap-1">
              {regionStar.nodes.map((sn) => {
                const lit = hover.lit(sn.id)
                return (
                  <button
                    key={sn.id}
                    data-regionrow={sn.id}
                    {...bindOwn(sn.id)}
                    onClick={() => lookAt(sn.id)}
                    onDoubleClick={() => onSelect(sn.id)}
                    className={[
                      'text-left px-2 py-1 rounded border text-[11.5px] flex items-center gap-1.5',
                      lit ? 'border-slate-400 font-semibold' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
                    ].join(' ')}
                    style={lit ? { borderColor: colorOf(sn.id), background: fillOf(sn.id) } : undefined}
                    title={`${byId.get(sn.id)!.title} — ${sn.n} link${sn.n === 1 ? '' : 's'} · click to show on the map · double-click to re-root`}
                  >
                    <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: colorOf(sn.id) }} />
                    <span className="truncate font-medium" style={{ color: colorOf(sn.id) }}>
                      {byId.get(sn.id)!.title}
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 shrink-0">
                      {sn.strands.map((s) => (
                        <span
                          key={s.key}
                          className="flex items-center gap-0.5 text-[10px] text-slate-500"
                          title={`${EDGE_LABEL[s.type]}${s.n > 1 ? ` ×${s.n}` : ''} · ${s.dir === 'out' ? 'outgoing' : s.dir === 'in' ? 'incoming' : 'both ways'}`}
                        >
                          <span className="w-2 h-2 rounded-sm inline-block" style={{ background: EDGE_COLOR[s.type] }} />
                          {s.n > 1 && <span className="font-semibold">×{s.n}</span>}
                          <span className="text-slate-400">{s.dir === 'out' ? '→' : s.dir === 'in' ? '←' : '↔'}</span>
                        </span>
                      ))}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : viaTopic ? (
        <div aria-label="children-relationships" className="shrink-0 h-[24%] overflow-y-auto border-t-2 border-slate-300 px-3 pt-2 pb-1.5">
          <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">Relationships (0)</div>
          <div className="text-[11px] text-slate-400">no relationships to display</div>
          <div className="text-[10.5px] text-slate-400 italic mt-0.5">
            relations live at the topic grain — see {byId.get(viaTopic)!.title}
          </div>
        </div>
      ) : (
        <div aria-label="children-relationships" className="shrink-0 h-[24%] overflow-y-auto border-t-2 border-slate-300 px-3 pt-2 pb-1.5">
          <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">Relationships ({rels.length})</div>
          {rels.length === 0 ? (
            <div className="text-[11px] text-slate-400">no relationships to display</div>
          ) : (
            <div className="flex flex-col gap-2">
              {EDGE_TYPES.map((type) => {
                const outs = rels.filter((e) => e.type === type && e.source === anchorTopic)
                const ins = rels.filter((e) => e.type === type && e.target === anchorTopic)
                if (outs.length + ins.length === 0) return null
                return (
                  <div key={type}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: EDGE_COLOR[type] }} />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{EDGE_LABEL[type]}</span>
                      <span className="text-[10px] text-slate-400">({outs.length + ins.length})</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {outs.map((e) => relRow(e, e.target, true))}
                      {ins.map((e) => relRow(e, e.source, false))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
