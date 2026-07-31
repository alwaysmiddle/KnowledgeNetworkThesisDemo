import type { EdgeKind } from './vocab'

const EDGE: Record<EdgeKind, { color: string; label: string }> = {
  depends_on: { color: 'var(--edge-depends-on)', label: 'builds on' },
  uses: { color: 'var(--edge-uses)', label: 'uses' },
  see_also: { color: 'var(--edge-see-also)', label: 'see also' },
  implemented_with: { color: 'var(--edge-implemented-with)', label: 'implemented with' },
}

/** The four authored relations, as a legend: one rounded rule per edge kind,
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
          <span
            style={{
              width: 18,
              height: 3,
              borderRadius: 'var(--radius-pill)',
              background: EDGE[t].color,
              flexShrink: 0,
            }}
          />
          {EDGE[t].label}
        </span>
      ))}
    </div>
  )
}
