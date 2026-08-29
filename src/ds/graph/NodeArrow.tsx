import { chipBorder } from './NodeChip'

/** The arrow between two nodes — sequence, not a typed relation. Port of DS
 *  components/graph/NodeArrow.jsx. Drawn in SVG so shapeRendering snaps the
 *  shaft to one device pixel, avoiding the antialiasing thickness variation that
 *  CSS box-based shafts produce at different fractional offsets.
 *
 *  IMPORTS ONE WAY: this file reads `chipBorder` from `NodeChip` and `NodeChip` never
 *  reads back. The weights travel from the chip that DRAWS the border to the line that
 *  ANSWERS it. */

/** THE RULE, AS A FUNCTION: A CONNECTOR IS DRAWN AT THE BORDER WEIGHT OF WHAT IT CONNECTS,
 *  NEVER ABOVE IT. The nodes are the objects; a line between them is a statement about them,
 *  so it is never the heaviest mark in the row. Hand it the `mark` of the chips at the ends
 *  and it returns the shaft weight that matches their border — so no caller ever types 1.5
 *  or 1.25, and a reviewer can grep for a stroke literal at a call site instead of eyeballing
 *  weights. Change a chip's form and the lines meeting it re-weight themselves.
 *
 *  ANYTHING THAT IS NOT ONE OF THE FOUR CHIP FORMS answers with a number, and there are two
 *  ways to get one without typing it. A component an arrow can meet DECLARES what its edge
 *  weighs as a static — `NodeChip.joinBorder`, `VersionedGroup.joinBorder` — and a container
 *  reads it. Everything else, a host's own box included, passes the width it renders.
 *
 *  A NODE WITH NO BORDER AT ALL passes 0 and gets 1.25 — the lightest step, never a
 *  zero-width line. There is no stroke to match, so the question becomes what a line beside
 *  the quietest thing in the system may weigh, and that is what a 1px border gets. An OPEN
 *  `VersionedGroup` card is exactly this case (its edge is transparent until folded) and
 *  lands on 1.25 either way. Do NOT read a missing border as "no constraint" and take the
 *  full-rank default: a borderless box is the LEAST able to carry a heavy line beside it.
 *
 *  IT TAKES A NUMBER — the border width, in px, of a node that is not one of our chips. That
 *  is still a MEASUREMENT and not a taste: you are reporting what sits at the ends of your
 *  line, exactly as a mark name does, and the same rule picks the weight. What it is NOT is a
 *  way to make one surface a little firmer than the rest. If the number you are about to pass
 *  is not the border width you render, it does not belong here.
 *
 *  WHY 1px IN BECOMES 1.25 OUT — MATCHING THE NUMBER IS NOT MATCHING THE MARK. A 1px CSS
 *  border takes the browser's own rounding; a 1px rect with `crispEdges` snaps to the device
 *  grid. At dpr 1.5 the steps are about 0.67 / 1.33 / 2.0 css px, so a flat 1 lands a step
 *  BELOW the border it is meant to match, reads as a divider, and fades
 *  `--edge-depends-on` — the quietest of the four relation hues — out from under
 *  `implemented_with`. This is the one place that correction lives. Keep the fraction. */
export function shaftFor(mark?: ChipForm | number): number {
  const w = typeof mark === 'number' ? mark : chipBorder(mark)
  return w <= 1 ? 1.25 : w
}

/** the four chip forms a line can meet, by name */
export type ChipForm = 'dot' | 'border' | 'border-2' | 'none'

/** THE SHAFT BETWEEN FULL-RANK `mark="border"` CHIPS — `--stroke-rule`, 1.5. A chain's and a
 *  road's case, which is why it is the default. `shaftFor` is the general answer; this is its
 *  common value, exported so a port cannot retype it. `EdgeEntry` joins the 1px `border-2`
 *  form and draws 1.25 (`EDGE_SHAFT_STROKE`) — a different weight for a different neighbour,
 *  not a lighter kind of arrow.
 *
 *  THE OPEN CASE: an arrow between two `border-2` chips would outweigh the 1px borders it
 *  joined. Nothing draws that today. If it appears the answer is a third constant chosen by
 *  the form — never a weight prop, which would make the heaviest mark in a row a call-site
 *  decision. */
export const SHAFT_STROKE = shaftFor('border')

export interface NodeArrowProps {
  /** 'down' for a stacked chain (the default), 'right' for a row */
  direction?: 'down' | 'right'
  /** the shaft, in px, before the head. Default 14 */
  length?: number
  /** 'walk' (acorn — movement through the corpus, the default), 'quiet'
   *  (bark-400), 'hint' (bark-300). Never a --domain-* or --edge-* hue */
  tone?: 'walk' | 'quiet' | 'hint'
  /** conditional: an optional step, a gap awaiting a node. Dashed never decorates */
  dashed?: boolean
  /** an explicit paint, for the rare case a caller owns the colour */
  color?: string
  /** give the arrow a title and it stops being decorative to a screen reader */
  title?: string
  /** WHAT THIS LINE MEETS — and NOT a weight prop, however much it looks like one sitting
   *  beside `length` and `tone`. It names the chip FORM at the ends of the line, or gives the
   *  measured border width in px of a node that is not one of our chips. Either way it is a
   *  fact about the SURROUNDINGS rather than a preference, so it cannot be set for the wrong
   *  reason and no stroke number ever appears at a call site; `shaftFor` turns it into the
   *  weight. `NodeChain` fills it in from the chips it places, so a chain needs nothing.
   *  The test for any value passed here: is it the border you actually render? */
  joins?: ChipForm | number
  /** A SIGNED px OFFSET OF THE SHAFT'S OWN MIDPOINT, perpendicular to its axis — bows the
   *  line into a curve instead of drawing it straight, and the head follows the curve's own
   *  tangent at the tip rather than staying axis-aligned. Default 0: the straight `<line>`
   *  the DS's own cards read `stroke-width` and head bbox off, unchanged.
   *
   *  FOR A HOST ROUTING ARBITRARY LINES ONLY — the map's case (`direction="right"` plus its
   *  own rotate transform: the mark draws itself, the host owns position and angle). NOT for
   *  `NodeChain`'s fixed-gap arrows, which have nothing to route around; passing it there
   *  bows the resolved road for no reason.
   *
   *  Why the mark owns this rather than the host drawing its own bezier: a curved shaft still
   *  needs a head that reads as pointing where the line ARRIVES, so the head's angle has to
   *  track the tangent — the same reasoning `ARROW_METRICS` already applies to the head's
   *  size. One copy of that arithmetic, not two kept in step by hand.
   *
   *  A NEGATIVE BOW ALSO MOVES THE SHAFT inside the drawing (the box grows on the side the
   *  curve bulges toward), so a host placing arrows absolutely must offset by
   *  `shaftTailOffset` or the same magnitude bowed either way will not be symmetric about
   *  the line it is drawn on. */
  bow?: number
  /** THE HALO — `--surface-raised` behind the shaft and the head, so the arrow reads against
   *  ANY fill under it and not only against this system's own paper. FOR A HOST ROUTING
   *  ARBITRARY LINES OVER ARBITRARY FILLS ONLY, the same split as `bow`; a chain gap sits on
   *  `--surface-paper` already and never passes it. Fixes CONTRAST, NOT SIZE — head and shaft
   *  keep their own paint and dimensions — which is why it answers a SHORT arrow (two
   *  adjacent territories) as fully as a long one. Works with `bow`; the casing follows the
   *  curve too. Default false. */
  casing?: boolean
}

const TONE: Record<string, string> = {
  walk: 'var(--accent-walk)',
  quiet: 'var(--bark-400)',
  hint: 'var(--bark-300)',
}
const DASH = '4 4'

/** THE DRAWN GEOMETRY, published so a board that positions arrows ITSELF can align them
 *  without re-deriving these numbers. The DS does not lay arrows out either — it puts one
 *  in each gap of a NodeChain, which owns both ends — but it now exports this (OB-053): the
 *  same four keys and the same values this file already carried, so the port is a docblock
 *  change rather than a rewrite. A board like the road computes every box arithmetically in
 *  one pass and places each arrow absolutely, so it needs the head's length (to turn a gap
 *  into a `length`) and the cross-axis extent (to centre the shaft on the column). Same
 *  shape as NodeChip's `chipSize` and VersionedGroup's `GROUP_METRICS`. */
export const ARROW_METRICS = {
  /** the head's length along the shaft at the full-rank shaft weight — an arrow's total
   *  span is `length + head`. The RESERVED value: a lighter `joins` draws a smaller head
   *  (OB-067), never a larger one, so a board sizing off this constant always has room. */
  head: 8,
  /** the head's half-width at the full-rank shaft weight, either side of the shaft — the
   *  same reservation as `head`. */
  halfWidth: 4.4,
  /** the shaft's stroke width for the COMMON case — the full-rank `border` chips a road
   *  and a chain join. Reads `SHAFT_STROKE` rather than repeating 1.5, so the literal this
   *  file used to carry is gone: a gap that meets something else asks `shaftFor` for its own
   *  weight and does not come here. */
  stroke: SHAFT_STROKE,
  /** the cross-axis extent of the whole drawing; the shaft sits at `across / 2` */
  across: 4.4 * 2 + 3,
} as const

/** THE HALO (OB-116) — a caller-drawn line's own casing: `--surface-raised` behind the shaft
 *  AND the head, so the arrow reads against any fill under it rather than only against the
 *  paper this system's own cards draw on. FOR A HOST ROUTING ARBITRARY LINES OVER ARBITRARY
 *  FILLS ONLY — the map's case, the same split `bow` makes; a chain gap already sits on
 *  `--surface-paper`, which is why `NodeChain` never passes it.
 *
 *  IT FIXES CONTRAST, NOT SIZE. The head and the shaft keep their own paint and their own
 *  dimensions — which is also why it answers the SHORT arrow (two adjacent territories) as
 *  well as the long one: a stub was never hard to see because its head was small, it was hard
 *  to see because it weighed the same as everything under it. */
const CASING_EXTRA = 3
const CASING_COLOR = 'var(--surface-raised)'
const CASING_OPACITY = 0.92

/** WHERE THE SHAFT'S TAIL SITS INSIDE THE DRAWING, in the drawing's own px — `along` the
 *  shaft's axis, `across` it — measured from the `<svg>`'s own origin.
 *
 *  LOCAL ADDITION, not in the DS's `.jsx` or `.d.ts`, and pure arithmetic over the constants
 *  three lines up rather than a design decision of ours. It exists because THE SHAFT IS NOT
 *  DRAWN AT THE DRAWING'S ORIGIN: it sits at `across / 2` down the cross-axis, and both
 *  `casing` (which adds `PAD` on every side) and `bow` (which grows the box on the side it
 *  bulges toward) move it again. A host that places a chain's arrow inside a reserved GAP
 *  never notices — the box is the gap. A host that rotates an arrow onto a line between two
 *  points, which is exactly what `bow` and `casing` are documented for, is placing the
 *  DRAWING when it means to place the SHAFT, and lands the line beside the two points it
 *  joins instead of on them.
 *
 *  `ARROW_METRICS.across` is the DS's published answer to this and is not enough on its own:
 *  it is the FULL-RANK value, while the drawn `across` scales with `joins`, and it says
 *  nothing about `casing`'s pad or `bow`'s sign — under a negative `bow` the tail moves and a
 *  positive one leaves it where it was, so the same magnitude bowed either way would not be
 *  symmetric about the line. Reported for the DS to publish; delete this when it does. */
export function shaftTailOffset(
  opts: { joins?: ChipForm | number; bow?: number; casing?: boolean } = {},
): { along: number; across: number } {
  const { joins, bow = 0, casing = false } = opts
  const T = joins !== undefined ? shaftFor(joins) : SHAFT_STROKE
  const scaledHalf = Math.round(ARROW_METRICS.halfWidth * (T / SHAFT_STROKE) * 100) / 100
  const across = scaledHalf * 2 + 3
  const pad = casing ? Math.ceil(CASING_EXTRA / 2) + 1 : 0
  return { along: pad, across: pad + (bow >= 0 ? across / 2 : across / 2 + Math.abs(bow)) }
}

export function NodeArrow({
  direction = 'down', length = 14, tone = 'walk', dashed, color, title, joins, bow = 0, casing = false,
}: NodeArrowProps) {
  const paint = color || TONE[tone] || TONE.walk
  /* the rule, applied — the neighbour's form decides, and the default is the full-rank
     chain that draws most of these */
  const T = joins !== undefined ? shaftFor(joins) : SHAFT_STROKE
  // the head scales with the shaft it sits on (OB-067) — 1 at the full-rank case, so the
  // common chain/road draw is untouched; ARROW_METRICS stays the reservation, never exceeded.
  const scale = T / SHAFT_STROKE
  const scaledHead = Math.round(ARROW_METRICS.head * scale * 100) / 100
  const scaledHalf = Math.round(ARROW_METRICS.halfWidth * scale * 100) / 100
  const span = length + scaledHead
  const across = scaledHalf * 2 + 3
  const down = direction === 'down'
  // the casing's own numbers, derived from the shaft it hides behind rather than typed:
  // `casingT` is the shaft plus a half-extra either side, `casingHalf` the head's half-width
  // grown to match, and `casingBack` how far the halo overhangs each end of the drawn mark.
  const PAD = casing ? Math.ceil(CASING_EXTRA / 2) + 1 : 0
  const casingT = T + CASING_EXTRA
  const casingHalf = scaledHalf + CASING_EXTRA / 2 + 0.6
  const casingBack = CASING_EXTRA / 2 + 0.6
  if (bow) {
    /* ROUTING ONLY (OB-107) — for a host drawing an arbitrary line between two points that
       needs to separate it from another line running close beside it for part of its length
       (the map's case: two walk steps whose lines converge on one pin from close angles and
       read as a single doubled shaft right up to the head). `bow` offsets the shaft's own
       midpoint perpendicular to its axis; the head follows the CURVE's tangent at the tip,
       for the reason ARROW_METRICS' scaling already tracks the shaft's weight — a head left
       axis-aligned beside a bowed shaft stops pointing where the line actually arrives.
       KEPT AS A SEPARATE DRAWING from the straight case below rather than folded in as its
       `bow === 0` special case: the straight shaft is a real <line>, and the DS's own cards
       read stroke-width and head bbox off exactly that element, so there is no reason to move
       the common, tested case onto a <path>. */
    const extra = Math.abs(bow)
    const acrossB = across + extra
    const mid = bow >= 0 ? across / 2 : across / 2 + extra
    const ctrl = mid + bow
    const du = length / 2
    const dv = mid - ctrl
    const ang = Math.atan2(dv, du)
    const tipU = length + scaledHead * Math.cos(ang)
    const tipV = mid + scaledHead * Math.sin(ang)
    const perpU = -Math.sin(ang) * scaledHalf
    const perpV = Math.cos(ang) * scaledHalf
    const toXY = (u: number, v: number): [number, number] => (down ? [v, u] : [u, v])
    const w = (down ? acrossB : span) + PAD * 2
    const h = (down ? span : acrossB) + PAD * 2
    const [sx, sy] = toXY(0, mid)
    const [cx, cy] = toXY(length / 2, ctrl)
    const [ex, ey] = toXY(length, mid)
    const [p1x, p1y] = toXY(length + perpU, mid + perpV)
    const [tx, ty] = toXY(tipU, tipV)
    const [p3x, p3y] = toXY(length - perpU, mid - perpV)
    const casingPerpU = -Math.sin(ang) * casingHalf
    const casingPerpV = Math.cos(ang) * casingHalf
    const cTipU = length + (scaledHead + casingBack) * Math.cos(ang)
    const cTipV = mid + (scaledHead + casingBack) * Math.sin(ang)
    const [cp1x, cp1y] = toXY(length - casingBack * Math.cos(ang) + casingPerpU, mid - casingBack * Math.sin(ang) + casingPerpV)
    const [ctx, cty] = toXY(cTipU, cTipV)
    const [cp3x, cp3y] = toXY(length - casingBack * Math.cos(ang) - casingPerpU, mid - casingBack * Math.sin(ang) - casingPerpV)
    const curve = `M${sx} ${sy} Q${cx} ${cy} ${ex} ${ey}`
    return (
      <svg
        width={w} height={h} viewBox={`0 0 ${w} ${h}`}
        aria-hidden={title ? undefined : 'true'}
        role={title ? 'img' : undefined}
        style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
      >
        {title ? <title>{title}</title> : null}
        <g transform={`translate(${PAD},${PAD})`}>
          {casing ? (
            <path d={curve} fill="none" stroke={CASING_COLOR} strokeOpacity={CASING_OPACITY}
              strokeWidth={casingT} strokeLinecap="round" strokeDasharray={dashed ? DASH : undefined} />
          ) : null}
          {casing ? (
            <path d={`M${cp1x} ${cp1y} L${ctx} ${cty} L${cp3x} ${cp3y} Z`} fill={CASING_COLOR} fillOpacity={CASING_OPACITY} />
          ) : null}
          <path d={curve} fill="none" stroke={paint} strokeWidth={T} strokeDasharray={dashed ? DASH : undefined} />
          <path d={`M${p1x} ${p1y} L${tx} ${ty} L${p3x} ${p3y} Z`} fill={paint} />
        </g>
      </svg>
    )
  }
  const w = (down ? across : span) + PAD * 2
  const h = (down ? span : across) + PAD * 2
  const mid = across / 2
  return (
    <svg
      width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
    >
      {title ? <title>{title}</title> : null}
      <g transform={`translate(${PAD},${PAD})`}>
        {down ? (
          <>
            {casing ? (
              <line x1={mid} y1={-casingBack} x2={mid} y2={length + 1} stroke={CASING_COLOR} strokeOpacity={CASING_OPACITY}
                strokeWidth={casingT} strokeLinecap="round" strokeDasharray={dashed ? DASH : undefined} />
            ) : null}
            {casing ? (
              <path d={`M${mid - casingHalf} ${length} L${mid} ${span + casingBack} L${mid + casingHalf} ${length} Z`}
                fill={CASING_COLOR} fillOpacity={CASING_OPACITY} />
            ) : null}
            <line x1={mid} y1="0" x2={mid} y2={length + 1} stroke={paint} strokeWidth={T}
              strokeDasharray={dashed ? DASH : undefined}
              shapeRendering={dashed ? undefined : 'crispEdges'} />
            <path d={`M${mid - scaledHalf} ${length} L${mid} ${span} L${mid + scaledHalf} ${length} Z`} fill={paint} />
          </>
        ) : (
          <>
            {casing ? (
              <line x1={-casingBack} y1={mid} x2={length + 1} y2={mid} stroke={CASING_COLOR} strokeOpacity={CASING_OPACITY}
                strokeWidth={casingT} strokeLinecap="round" strokeDasharray={dashed ? DASH : undefined} />
            ) : null}
            {casing ? (
              <path d={`M${length} ${mid - casingHalf} L${span + casingBack} ${mid} L${length} ${mid + casingHalf} Z`}
                fill={CASING_COLOR} fillOpacity={CASING_OPACITY} />
            ) : null}
            <line x1="0" y1={mid} x2={length + 1} y2={mid} stroke={paint} strokeWidth={T}
              strokeDasharray={dashed ? DASH : undefined}
              shapeRendering={dashed ? undefined : 'crispEdges'} />
            <path d={`M${length} ${mid - scaledHalf} L${span} ${mid} L${length} ${mid + scaledHalf} Z`} fill={paint} />
          </>
        )}
      </g>
    </svg>
  )
}
