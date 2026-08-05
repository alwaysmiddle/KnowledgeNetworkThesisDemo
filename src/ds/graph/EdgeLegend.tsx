import type { EdgeKind } from './vocab'

const EDGE: Record<EdgeKind, { color: string; label: string }> = {
  depends_on: { color: 'var(--edge-depends-on)', label: 'builds on' },
  uses: { color: 'var(--edge-uses)', label: 'uses' },
  see_also: { color: 'var(--edge-see-also)', label: 'see also' },
  implemented_with: { color: 'var(--edge-implemented-with)', label: 'implemented with' },
}

/** The relation dash, drawn as an SVG rect with `crispEdges` rather than a CSS
 *  box: a 3px CSS bar lands on a different subpixel offset in every row (the
 *  fractional line boxes above it shift it), so some dashes antialias across four
 *  device rows and read visibly thicker than their neighbours. crispEdges snaps
 *  every dash to the same device-pixel height, whatever its position. */
export interface EdgeDashProps {
  color: string
  /** px; the legend uses 18 */
  width?: number
}

export function EdgeDash({ color, width = 18 }: EdgeDashProps) {
  return (
    <svg width={width} height={3} viewBox={'0 0 ' + width + ' 3'} shapeRendering="crispEdges" style={{ display: 'block', flex: 'none' }} aria-hidden="true">
      <rect width={width} height={3} fill={color} />
    </svg>
  )
}

/** The four authored relations, as a legend: one crisp dash per edge kind,
 *  labelled with the corpus's own wording. Typed port of the DS EdgeLegend.jsx. */
export interface EdgeLegendProps {
  /** defaults to all four, in authoring order */
  types?: EdgeKind[]
  vertical?: boolean
}

export function EdgeLegend({
  types = ['depends_on', 'uses', 'see_also', 'implemented_with'],
  vertical,
}: EdgeLegendProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: vertical ? 6 : 'var(--space-3)',
        flexWrap: 'wrap',
      }}
    >
      {types.map((t) => (
        <span
          key={t}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 'var(--fs-caption)',
            color: 'var(--text-2)',
            fontWeight: 'var(--fw-medium)',
            whiteSpace: 'nowrap',
          }}
        >
          <EdgeDash color={EDGE[t].color} />
          {EDGE[t].label}
        </span>
      ))}
    </div>
  )
}
