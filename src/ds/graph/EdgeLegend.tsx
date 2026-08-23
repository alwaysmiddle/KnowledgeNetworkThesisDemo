import type { EdgeKind } from './vocab'
import { HUE_RING, relationHue } from './DomainDot'

/** THE SHIPPED EXAMPLE relation kinds — the four this system was built for.
 *  An example of a corpus's own vocabulary, not the product's: a corpus of
 *  recipes or legal cases has no `implemented_with`. A general corpus passes
 *  its kinds to `EdgeLegend` as `RelationKindSpec` objects and never touches
 *  this map. Kept local (matches the DS module) rather than sourced from
 *  vocab.ts's `EDGE_TOKEN` — those are two different concerns pointing at
 *  the same tokens: this map also carries the label, and this file is what
 *  resolves an arbitrary corpus's own kinds, not just the four examples'. */
const EDGE: Record<EdgeKind, { color: string; label: string }> = {
  depends_on: { color: 'var(--edge-depends-on)', label: 'builds on' },
  uses: { color: 'var(--edge-uses)', label: 'uses' },
  see_also: { color: 'var(--edge-see-also)', label: 'see also' },
  implemented_with: { color: 'var(--edge-implemented-with)', label: 'implemented with' },
}

/** a relation kind a general corpus supplies — its own key and wording, and
 *  optionally the hue it should take */
export interface RelationKindSpec {
  key: string
  /** the corpus's own wording. THE LABEL IS NOT DECORATION: hue alone
   *  carries the kind (2026-08-21j) and hue at 1.5px runs out well before
   *  sixteen, so the label beside the dash is what a reader falls back on. */
  label: string
  /** a ring hue name, or a ring SLOT number. Omit and the entry takes its
   *  position in the list as its slot. */
  hue?: string | number
}

/** THE RELATION HUE. Resolution order: the shipped example map, then a RING
 *  hue name (`edgeHue('teal')` — what a general corpus passes, answered in
 *  the STROKE role because a relation is a line), then a ring SLOT number
 *  (`edgeHue(3)` — the nth relation kind off `TOPIC_WALK` read backward),
 *  then `--edge-mixed`.
 *  IT NO LONGER ASSEMBLES A TOKEN NAME FROM THE KEY, and that is the point of
 *  the function. The corpus authors kinds in snake_case while custom
 *  properties are kebab-case, and `var()` on an undefined property fails
 *  SILENTLY to transparent — so the old fallback turned any unrecognised
 *  kind into a blank swatch rather than a visible colour. */
export function edgeHue(type: string | number): string {
  if (typeof type === 'string' && EDGE[type as EdgeKind]) return EDGE[type as EdgeKind].color
  if (typeof type === 'string' && HUE_RING.includes(type)) return `var(--hue-${type}-stroke)`
  if (typeof type === 'number' && Number.isFinite(type)) return `var(--hue-${relationHue(type)}-stroke)`
  return 'var(--edge-mixed)'
}

/** THE PAINT FOR A RELATION KIND — `{ stroke, label }`, so no call site
 *  chooses a role. `kind` is one of the example keys, a ring hue name, or a
 *  ring slot number; `label` is the example's own wording where there is
 *  one, and null otherwise, because a corpus's wording is the corpus's own
 *  and this function will not invent it.
 *
 *  ONE FIELD, ON PURPOSE. A relation is a LINE, so the stroke role is the
 *  only role it has. Anything wanting a relation's colour as a FILL (a
 *  legend chip, a filter pill) is naming the kind rather than drawing the
 *  edge, and should take a topic wash role or a neutral instead. */
export function relationPaint(kind: string | number): { stroke: string; label: string | null } {
  const spec = typeof kind === 'string' ? EDGE[kind as EdgeKind] : undefined
  return { stroke: edgeHue(kind), label: spec ? spec.label : null }
}

/** The relation dash, drawn as an SVG rect with `crispEdges` rather than a
 *  CSS box: a CSS bar lands on a different subpixel offset in every row (the
 *  fractional line boxes above it shift it), so some dashes antialias across
 *  four device rows and read visibly thicker than their neighbours.
 *  crispEdges snaps every dash to the same device-pixel height, whatever its
 *  position. */
export interface EdgeDashProps {
  /** the edge kind's colour, e.g. `var(--edge-uses)`. Prefer `type`. */
  color?: string
  /** px; the legend uses 18 */
  width?: number
  /** what the dash should be coloured BY, resolved through `edgeHue()`: one
   *  of the shipped example keys, a ring hue name, or a ring slot number.
   *  Prefer this over `color` — it maps through the palette instead of
   *  naming a value. */
  type?: string | number
}

export function EdgeDash({ type, color, width = 18 }: EdgeDashProps) {
  const paint = color || (type !== undefined ? edgeHue(type) : 'var(--border-rule)')
  return (
    <svg width={width} height={3} viewBox={'0 0 ' + width + ' 3'} shapeRendering="crispEdges" style={{ display: 'block', flex: 'none' }} aria-hidden="true">
      <rect width={width} height={3} fill={paint} />
    </svg>
  )
}

/** A corpus's relation kinds, as a legend. Typed port of the DS
 *  EdgeLegend.jsx. Each entry is either one of the example map's keys, or a
 *  `RelationKindSpec` a general corpus supplies — `hue` omitted means the
 *  entry takes its position in this list as its slot, so a corpus that has
 *  only ever named its kinds still gets sixteen distinguishable colours in a
 *  stable order.
 *  THE LABEL IS NOT DECORATION. Hue alone carries the kind (the owner's
 *  call, 2026-08-21j), and hue at 1.5px runs out well before sixteen, so the
 *  label beside every dash is what a reader falls back on. */
export interface EdgeLegendProps {
  /** defaults to all four examples, in authoring order */
  types?: Array<EdgeKind | RelationKindSpec>
  vertical?: boolean
}

export function EdgeLegend({ types = ['depends_on', 'uses', 'see_also', 'implemented_with'], vertical }: EdgeLegendProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: vertical ? 6 : 'var(--space-3)',
        flexWrap: 'wrap',
      }}
    >
      {types.map((t, i) => {
        const spec: RelationKindSpec = typeof t === 'string' ? { key: t, label: EDGE[t]?.label || t, hue: t } : { ...t, hue: t.hue !== undefined ? t.hue : i }
        return (
          <span
            key={spec.key}
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
            <EdgeDash type={spec.hue} />
            {spec.label}
          </span>
        )
      })}
    </div>
  )
}
