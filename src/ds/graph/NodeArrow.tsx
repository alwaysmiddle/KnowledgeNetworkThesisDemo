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
}

const TONE: Record<string, string> = {
  walk: 'var(--accent-walk)',
  quiet: 'var(--bark-400)',
  hint: 'var(--bark-300)',
}
const DASH = '4 4'

/** LOCAL DEVIATION (#113 H4) — the drawn geometry, published so a board that
 *  positions arrows ITSELF can align them without re-deriving these numbers.
 *  The DS does not export them, but it does not lay arrows out either: it puts
 *  one in each gap of a NodeChain, which owns both ends. A board like the road
 *  computes every box arithmetically in one pass and places each arrow absolutely,
 *  so it needs the head's length (to turn a gap into a `length`) and the cross-axis
 *  extent (to centre the shaft on the column). Same shape as NodeChip's `chipSize`
 *  and VersionedGroup's `GROUP_METRICS`. To report on #74. */
export const ARROW_METRICS = {
  /** the head's length along the shaft — an arrow's total span is `length + head` */
  head: 8,
  /** the head's half-width, either side of the shaft */
  halfWidth: 4.4,
  /** the shaft's stroke width for the COMMON case — the full-rank `border` chips a road
   *  and a chain join. Reads `SHAFT_STROKE` rather than repeating 1.5, so the literal this
   *  file used to carry is gone: a gap that meets something else asks `shaftFor` for its own
   *  weight and does not come here. */
  stroke: SHAFT_STROKE,
  /** the cross-axis extent of the whole drawing; the shaft sits at `across / 2` */
  across: 4.4 * 2 + 3,
} as const

export function NodeArrow({
  direction = 'down', length = 14, tone = 'walk', dashed, color, title, joins,
}: NodeArrowProps) {
  const paint = color || TONE[tone] || TONE.walk
  const HEAD = ARROW_METRICS.head
  const HALF = ARROW_METRICS.halfWidth
  /* the rule, applied — the neighbour's form decides, and the default is the full-rank
     chain that draws most of these */
  const T = joins !== undefined ? shaftFor(joins) : SHAFT_STROKE
  const span = length + HEAD
  const across = ARROW_METRICS.across
  const down = direction === 'down'
  const w = down ? across : span
  const h = down ? span : across
  const mid = across / 2
  return (
    <svg
      width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      style={{ display: 'block', flexShrink: 0, overflow: 'visible' }}
    >
      {title ? <title>{title}</title> : null}
      {down ? (
        <>
          <line x1={mid} y1="0" x2={mid} y2={length + 1} stroke={paint} strokeWidth={T}
            strokeDasharray={dashed ? DASH : undefined}
            shapeRendering={dashed ? undefined : 'crispEdges'} />
          <path d={`M${mid - HALF} ${length} L${mid} ${span} L${mid + HALF} ${length} Z`} fill={paint} />
        </>
      ) : (
        <>
          <line x1="0" y1={mid} x2={length + 1} y2={mid} stroke={paint} strokeWidth={T}
            strokeDasharray={dashed ? DASH : undefined}
            shapeRendering={dashed ? undefined : 'crispEdges'} />
          <path d={`M${length} ${mid - HALF} L${span} ${mid} L${length} ${mid + HALF} Z`} fill={paint} />
        </>
      )}
    </svg>
  )
}
