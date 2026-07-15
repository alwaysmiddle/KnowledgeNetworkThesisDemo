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
// one group per type with arrows for direction. Click a row to re-root either way.
// Edges live at the topic grain, so a deep focus shows its OWNING topic's
// relations ("via …"). Every node click is a plain bus refocus, so map, tree
// and document follow.
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

import { useMemo, useRef, useState } from 'react'

import { byId, childrenOf, EDGE_COLOR, EDGE_LABEL, pathTo, ROOT_ID } from '../corpus/graph'
import type { GEdge } from '../corpus/graph'
import { colorOf, fillOf } from '../model/color'
import { EDGE_TYPES } from '../model/nav'
import { paneGraph, placeLabels, RING, subtreeSize } from '../model/panegraph'
import { R_STAR, starFor } from '../model/star'
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

export default function ChildrenPanel({ bus }: { bus: Bus }) {
  const currentId = bus.focus ?? ROOT_ID
  const onSelect = (id: string) => bus.setFocus(id, 'tree')
  // the guarded enter/leave that used to be hand-rolled here (and again in the
  // atlas, and again in the document pane) is the bus's job now
  const hover = useHover(bus)

  const node = byId.get(currentId)!
  const path = pathTo(currentId)
  // containment's LIST reading — the focus's direct children ([] for a leaf).
  // Moved out of the document pane 2026-07-14; the wheel above is the same
  // children as a graph, this is the scannable list. Shares the hover channel,
  // so a row lights its wheel node and its map territory in one hue.
  const containedKids = childrenOf.get(currentId) ?? []

  // interactive disclosure: which containers are OPEN. Starts all-closed on
  // every refocus — only the direct children ring shows until clicks open it
  // (render-time reset — the "adjust state when a prop changes" pattern)
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set())
  // hover preview — a closed container the pointer is on shows its children
  // as ghosts; the click that follows just makes what's already there solid
  const [hoverPrev, setHoverPrev] = useState<string | null>(null)
  // which reading the canvas shows: the containment wheel or the typed-
  // relations star. Sticky across refocus, so clicking a counterpart in star
  // mode hops the relation graph node to node.
  const [mode, setMode] = useState<'wheel' | 'relations'>('wheel')
  // canvas pan, in viewBox units
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [expandedFor, setExpandedFor] = useState(currentId)
  if (expandedFor !== currentId) {
    setExpandedFor(currentId)
    setExpanded(new Set())
    setHoverPrev(null)
    setPan({ x: 0, y: 0 })
  }
  const toggleOpen = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
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
    setExpanded(all)
  }
  // drag-to-pan; the distance guard keeps a pan's pointer-up from firing the
  // node click underneath (same contract as the map)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragP = useRef<{ x: number; y: number } | null>(null)
  const dragDist = useRef(0)
  const [dragging, setDragging] = useState(false)

  // the layout the pane DRAWS includes the hover preview; the base layout
  // (committed expansions only) tells preview ghosts from solid nodes.
  // Because rings are fixed and sectors ∝ full subtree weight, adding the
  // preview moves nothing — ghosts only appear, so hovering never jitters.
  const pgBase = useMemo(() => paneGraph(currentId, expanded), [currentId, expanded])
  const expandedEff = useMemo(
    () => (hoverPrev && !expanded.has(hoverPrev) ? new Set([...expanded, hoverPrev]) : expanded),
    [expanded, hoverPrev],
  )
  const pg = useMemo(() => (expandedEff === expanded ? pgBase : paneGraph(currentId, expandedEff)), [currentId, expandedEff, expanded, pgBase])
  const at = useMemo(() => new Map(pg.nodes.map((n) => [n.id, n])), [pg])
  const baseIds = useMemo(() => new Set(pgBase.nodes.map((n) => n.id)), [pgBase])

  // relations exist at the topic grain only: the focused topic itself, or —
  // below one — the topic on the containment path (listed as "via <topic>").
  // Containers ABOVE the topic tier honestly get no relationship section, which
  // is why starFor's anchor is nullable.
  const { anchor: anchorTopic, rels, nodes: star } = useMemo(() => starFor(currentId), [currentId])

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
  const anchorTitle = anchorTopic ? byId.get(anchorTopic)!.title : ''

  /** one relationship row — the outgoing and incoming lists differ only in
   * which end is the counterpart, so they share this */
  const relRow = (e: GEdge, cp: string, out: boolean) => {
    const lit = hover.lit(cp)
    return (
      <button
        key={e.id}
        data-relrow={e.id}
        {...hover.bind(cp)}
        onClick={() => onSelect(cp)}
        className={[
          'text-left px-2 py-1 rounded border text-[11.5px] flex items-center gap-1.5',
          lit ? 'border-slate-400 font-semibold' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
        ].join(' ')}
        // the lit tint is the counterpart's OWN tree color — the row, the star
        // node and the map territory all say the same thing in the same hue
        style={lit ? { borderColor: colorOf(cp), background: fillOf(cp) } : undefined}
        title={`${out ? anchorTitle : byId.get(cp)!.title} ${EDGE_LABEL[e.type]} ${out ? byId.get(cp)!.title : anchorTitle} — re-root there`}
      >
        <span className="text-slate-400 shrink-0">{out ? '→' : '←'}</span>
        <span className="truncate font-medium" style={{ color: colorOf(cp) }}>
          {byId.get(cp)!.title}
        </span>
      </button>
    )
  }

  return (
    <div aria-label="children-panel" className="h-full flex flex-col">
      <div className="shrink-0 px-3 pt-2">
        {/* breadcrumb — the containment path; every chip above the tip goes up */}
        <div className="flex flex-wrap items-center gap-1 text-[11px] mb-1">
          {path.map((id, i) => {
            const last = i === path.length - 1
            return (
              <span key={id} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-300">›</span>}
                {last ? (
                  <span className="font-bold" style={{ color: colorOf(id) }}>
                    {byId.get(id)!.title}
                  </span>
                ) : (
                  <button onClick={() => onSelect(id)} className="text-slate-500 hover:text-slate-800 hover:underline">
                    {byId.get(id)!.title}
                  </button>
                )}
              </span>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-slate-500 mb-1 select-none">
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
                  onClick={() => setExpanded(new Set())}
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
          {mode === 'relations' && (
            <span className="text-slate-400">
              {rels.length} typed link{rels.length === 1 ? '' : 's'}
              {anchorTopic && anchorTopic !== currentId ? ` · via ${byId.get(anchorTopic)!.title}` : ''}
            </span>
          )}
        </div>
      </div>

      {mode === 'relations' ? (
        !anchorTopic ? (
          <div className="text-[11px] text-slate-400 italic px-3 mt-2">
            relations live at the topic grain — focus a topic (or anything inside one) to see its star.
          </div>
        ) : star.length === 0 ? (
          <div className="text-[11px] text-slate-400 italic px-3 mt-2">
            no typed links touch {byId.get(anchorTopic)!.title}.
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            <svg data-relstar viewBox={`${-VBX} ${-VBY} ${2 * VBX} ${2 * VBY}`} className="w-full h-full">
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
                  // counterpart's. Only the middle moves.
                  const ax = ux * 19
                  const ay = uy * 19
                  const bx = ux * (R_STAR - 13)
                  const by = uy * (R_STAR - 13)
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
              {/* the anchor topic, pinned at the center */}
              <circle cx={0} cy={0} r={15} fill="#ffffff" stroke={colorOf(anchorTopic)} strokeWidth={3} />
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
                      {...hover.bind(sn.id)}
                      cx={sn.x}
                      cy={sn.y}
                      r={9}
                      fill={fillOf(sn.id)}
                      stroke={colorOf(sn.id)}
                      strokeWidth={lit ? 3.4 : 2}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onSelect(sn.id)}
                    >
                      <title>
                        {byId.get(sn.id)!.title} — {sn.edges.length} link{sn.edges.length === 1 ? '' : 's'} · click to re-root
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
            </svg>
          </div>
        )
      ) : pg.depthAvail === 0 ? (
        <div className="text-[11px] text-slate-400 italic px-3 mt-2">
          nothing inside — {node.title} is a leaf concept. Use the breadcrumb to step back up.
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <svg
            ref={svgRef}
            data-panegraph
            data-pgdepth={pg.shown}
            viewBox={`${-VBX} ${-VBY} ${2 * VBX} ${2 * VBY}`}
            className="w-full h-full"
            style={{ cursor: dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
            onPointerDown={(ev) => {
              dragP.current = { x: ev.clientX, y: ev.clientY }
              dragDist.current = 0
              setDragging(true)
              ;(ev.target as Element).setPointerCapture(ev.pointerId)
            }}
            onPointerMove={(ev) => {
              if (!dragP.current) return
              const rect = svgRef.current!.getBoundingClientRect()
              const f = Math.max((2 * VBX) / rect.width, (2 * VBY) / rect.height)
              const dx = (ev.clientX - dragP.current.x) * f
              const dy = (ev.clientY - dragP.current.y) * f
              dragP.current = { x: ev.clientX, y: ev.clientY }
              dragDist.current += Math.hypot(dx, dy)
              setPan((p) => ({ x: p.x + dx, y: p.y + dy }))
            }}
            onPointerUp={() => {
              dragP.current = null
              setDragging(false)
            }}
          >
            <g data-pgpan transform={`translate(${pan.x} ${pan.y})`}>
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
                        style={n.depth > 0 && !ghost ? { cursor: 'pointer' } : undefined}
                        // hover previews a closed container's children as
                        // ghosts; the click commits exactly what the preview
                        // showed (nothing else moves — fixed rings), so no
                        // deferred-click dance is needed any more.
                        // Every node — leaf or container — also publishes to
                        // the hover bus, which is what lights its territory on
                        // the map. Only containers preview.
                        onClick={
                          n.depth > 0 && !ghost
                            ? () => {
                                if (dragDist.current > 4) return
                                if (n.container) toggleOpen(n.id)
                                else onSelect(n.id)
                              }
                            : undefined
                        }
                        onDoubleClick={n.depth > 0 && !ghost && n.container ? () => onSelect(n.id) : undefined}
                        // this one cannot just spread hover.bind() — the pointer
                        // here does two jobs (publish to the bus AND arm the
                        // preview) and is suppressed mid-drag, so it calls the
                        // bus primitives that bind() is itself built from
                        onPointerEnter={
                          n.depth > 0 && !ghost
                            ? () => {
                                if (dragP.current) return
                                bus.setHover(n.id)
                                if (n.container) setHoverPrev(n.id)
                              }
                            : undefined
                        }
                        onPointerLeave={
                          n.depth > 0 && !ghost
                            ? () => {
                                bus.endHover(n.id)
                                if (n.container) setHoverPrev((h) => (h === n.id ? null : h))
                              }
                            : undefined
                        }
                      >
                        <title>
                          {byId.get(n.id)!.title}
                          {n.depth > 0 && n.container
                            ? open
                              ? ' — click to close · double-click to re-root'
                              : ` — +${n.clipped} inside: hover previews, click opens · double-click to re-root`
                            : ''}
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
            </g>
          </svg>
        </div>
      )}

      {/* The bottom half is the LIST reading, and it now MATCHES the mode above
          it: internal → the contained children (moved out of the document pane
          2026-07-14, which now only reads), external → the typed relations. Each
          mode is a graph reading (wheel / star) stacked over a list reading of
          the SAME thing. The border-t-2 is deliberately heavy — these are two
          distinct instruments sharing a pane, not one scrolling column — and it
          is the "visible border between the relationships view and the graph".
          The section is a FIXED 48% of the pane (item 6), not content-sized, so
          toggling internal ⇄ external never shifts the graph/list boundary — the
          window is static and the list scrolls inside it. Empty states still say
          so out loud rather than collapsing the frame to blank. */}
      {mode === 'wheel' ? (
        <div aria-label="children-contained" className="shrink-0 h-[48%] overflow-auto border-t-2 border-slate-300 px-3 pt-2 pb-1.5">
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
                    {...hover.bind(k.id)}
                    onClick={() => onSelect(k.id)}
                    className={[
                      'text-left px-2 py-1 rounded border text-[11.5px] flex items-center gap-1.5',
                      lit ? 'border-slate-400 font-semibold' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50',
                    ].join(' ')}
                    // lit tint is the child's OWN tree color — the row, its wheel
                    // node and its map territory all say it in the same hue
                    style={lit ? { borderColor: colorOf(k.id), background: fillOf(k.id) } : undefined}
                    title={`${byId.get(k.id)!.title} — re-root there`}
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
        <div aria-label="children-relationships" className="shrink-0 h-[48%] overflow-auto border-t-2 border-slate-300 px-3 pt-2 pb-1.5">
          <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">Relationships (0)</div>
          <div className="text-[11px] text-slate-400">no relationships to display</div>
          <div className="text-[10.5px] text-slate-400 italic mt-0.5">
            typed links live at the topic grain — focus a topic, or anything inside one
          </div>
        </div>
      ) : (
        <div aria-label="children-relationships" className="shrink-0 h-[48%] overflow-auto border-t-2 border-slate-300 px-3 pt-2 pb-1.5">
          <div className="text-[10.5px] font-bold text-slate-500 mb-1.5">
            Relationships ({rels.length})
            {anchorTopic !== currentId && (
              <span className="font-normal text-slate-400"> — via {byId.get(anchorTopic)!.title}</span>
            )}
          </div>
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
