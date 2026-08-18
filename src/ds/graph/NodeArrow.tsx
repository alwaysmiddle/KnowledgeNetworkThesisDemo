/** The arrow between two nodes — sequence, not a typed relation. Port of DS
 *  components/graph/NodeArrow.jsx. Drawn in SVG so shapeRendering snaps the
 *  shaft to one device pixel, avoiding the antialiasing thickness variation that
 *  CSS box-based shafts produce at different fractional offsets. */

export interface NodeArrowProps {
  /** 'down' for a stacked chain (the default), 'right' for a row */
  direction?: 'down' | 'right'
  /** the shaft, in px, before the head. Default 14 */
  length?: number
  /** 'walk' (acorn — on the authored path, the default), 'quiet' (bark-400),
   *  'hint' (bark-300). Never a --domain-* or --edge-* hue */
  tone?: 'walk' | 'quiet' | 'hint'
  /** conditional: an optional step, a gap awaiting a node. Dashed never decorates */
  dashed?: boolean
  /** an explicit paint, for the rare case a caller owns the colour */
  color?: string
  /** give the arrow a title and it stops being decorative to a screen reader */
  title?: string
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
  /** the shaft's stroke width */
  stroke: 1.5,
  /** the cross-axis extent of the whole drawing; the shaft sits at `across / 2` */
  across: 4.4 * 2 + 3,
} as const

export function NodeArrow({
  direction = 'down', length = 14, tone = 'walk', dashed, color, title,
}: NodeArrowProps) {
  const paint = color || TONE[tone] || TONE.walk
  const HEAD = ARROW_METRICS.head
  const HALF = ARROW_METRICS.halfWidth
  const T = ARROW_METRICS.stroke
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
