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

export function NodeArrow({
  direction = 'down', length = 14, tone = 'walk', dashed, color, title,
}: NodeArrowProps) {
  const paint = color || TONE[tone] || TONE.walk
  const HEAD = 8
  const HALF = 4.4
  const T = 1.5
  const span = length + HEAD
  const across = HALF * 2 + 3
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
