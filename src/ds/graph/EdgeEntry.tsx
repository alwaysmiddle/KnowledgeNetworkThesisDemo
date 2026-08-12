import type { DomainCode, EdgeKind } from './vocab'
import { DOMAIN_TOKEN } from './vocab'

const EDGE: Record<EdgeKind, { color: string; label: string }> = {
  depends_on: { color: 'var(--edge-depends-on)', label: 'builds on' },
  uses: { color: 'var(--edge-uses)', label: 'uses' },
  see_also: { color: 'var(--edge-see-also)', label: 'see also' },
  implemented_with: { color: 'var(--edge-implemented-with)', label: 'implemented with' },
}

interface EntryNodeProps {
  title: string
  domain: DomainCode
  anchor?: boolean
  within?: string
  onClick?: () => void
}

/* A node inside an entry wears its domain as a BORDER on paper, not as a dot on a
   raised chip: an entry sits inside a recessed well, and raised means a node
   standing on a pane. break-word is the last resort — words wrap at spaces first —
   because a name whose min-content is wider than the well pushes its border out
   past the pane edge. */
/* A path deeper than one step is ELIDED, not wrapped: the node column is a third of
   a pane at best, and "Networking / Protocol Stack / TCP & UDP" set inline there hits
   break-word and comes apart mid-word — five stacked fragments in a pill five times
   the height of the connector beside it. The segment that earns its place is the
   FIRST: it is the focus node, the same bold name every row in the list opens on. The
   middle is what the reader already knows from having navigated there, so it goes to
   an ellipsis, and the whole path stays in the tooltip. */
function EntryNode({ title, domain, anchor, within, onClick }: EntryNodeProps) {
  const segs = within ? String(within).split(' / ') : []
  const lead = segs.length > 1 ? segs[0] + ' / …' : within
  return (
    <span onClick={onClick} title={segs.length ? segs.join(' / ') + ' / ' + title : title}
      style={{ display: 'inline-flex', alignItems: 'center', minWidth: 0, maxWidth: '100%', padding: '2px 9px', borderRadius: 'var(--radius-md)', border: '1px solid ' + (DOMAIN_TOKEN[domain] || 'var(--swatch-anchor-fallback)'), background: 'transparent', cursor: onClick ? 'pointer' : 'inherit' }}>
      {/* Whichever way the end was reached, the ANCHOR is what carries the emphasis:
          direct, that is the node itself; through a descendant, it is the ancestry
          prefix, in the system's slash grammar (DocHeader), with the child that
          actually holds the link set beside it at ordinary weight. So every entry in
          a list opens on the same bold name — the one at the head of the rail — and
          the eye reads down the column instead of re-parsing each row. */}
      <span style={{ minWidth: 0, textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)', fontWeight: anchor && !within ? 'var(--fw-bold)' : 'var(--fw-medium)', color: anchor && !within ? 'var(--text-1)' : 'var(--text-2)', lineHeight: 'var(--lh-snug)', overflowWrap: 'break-word' }}>
        {within ? <span style={{ fontWeight: anchor ? 'var(--fw-bold)' : 'var(--fw-medium)', color: anchor ? 'var(--text-1)' : 'var(--text-3)' }}>{lead}{' / '}</span> : null}{title}</span>
    </span>
  )
}

/** One relationship, drawn: two nodes and the typed edge between them. The RELATION
 *  is what gets the emphasis — body weight over a 3px rule in the edge's own colour
 *  — and the two nodes recede to caption weight with a domain border and no fill.
 *  An entry is a sentence, and both ends are usually already known from whatever it
 *  sits inside; the relation is the only new word.
 *
 *  Typed port of the DS EdgeEntry.jsx (contract: EdgeEntry.d.ts).
 *
 *  Deviations from DS source:
 *  - Uses DOMAIN_TOKEN from ./vocab instead of an inline DOMAIN map (single source).
 *    The edge map stays local, as it is in the DS module and in EdgeLegend. */
export interface EdgeEntryProps {
  from: string
  fromDomain: DomainCode
  /** this end is the view's focus node, so it carries the entry's emphasis. Never
   *  mark both ends: an entry with two anchors has no subject */
  fromAnchor?: boolean
  /** the ancestry prefix in the slash grammar DocHeader uses, when the link is held
   *  by a descendant rather than by the focus itself. With a prefix present the bold
   *  weight goes to the PREFIX, not to the node beside it */
  fromWithin?: string
  to: string
  toDomain: DomainCode
  toAnchor?: boolean
  toWithin?: string
  type: EdgeKind
  /** override the corpus wording for this relation */
  relation?: string
  /** override the edge's colour */
  color?: string
  /** which end receives the arrowhead. 'both' is a symmetric relation */
  direction?: 'out' | 'in' | 'both'
  onFrom?: () => void
  onTo?: () => void
  /** the connector column's preferred width; it takes its room before the nodes do.
   *  Default 96 */
  connectorWidth?: number
}

export function EdgeEntry({
  from, fromDomain, fromAnchor, fromWithin, to, toDomain, toAnchor, toWithin,
  type, relation, color, direction = 'out', onFrom, onTo, connectorWidth = 96,
}: EdgeEntryProps) {
  const spec = EDGE[type]
  const hue = color || (spec && spec.color) || 'var(--border-rule)'
  const label = relation !== undefined ? relation : spec && spec.label
  return (
    <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, padding: '14px 0 10px' }}>
      <span style={{ minWidth: 0, flex: '1 1 0', display: 'flex', justifyContent: 'flex-end' }}><EntryNode title={from} domain={fromDomain} anchor={fromAnchor} within={fromWithin} onClick={onFrom} /></span>
      {/* The connector takes its room FIRST — it carries the string the entry
          exists for — and the two nodes share what is left. The line is this
          column's only in-flow child, so it lands on the row's centre line
          whatever height the names wrap to; the label floats above it, closer to
          its own line than to the entry above, so a wrapped name is never
          orphaned between two connectors. Clearance is MARGIN, not padding:
          padding lives inside the box, so a label wider than its column still
          ran over the node beside it. */}
      <span style={{ position: 'relative', flex: '0 1 ' + connectorWidth + 'px', minWidth: 64, marginInline: 3, alignSelf: 'center', display: 'flex', alignItems: 'center' }}>
        <span style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, paddingBottom: 1, boxSizing: 'border-box', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-semibold)', color: 'var(--text-1)', textAlign: 'center', lineHeight: 'var(--lh-snug)', overflowWrap: 'break-word' }}>{label}</span>
        {/* the head goes on the end that RECEIVES */}
        <span style={{ width: '100%', display: 'flex', alignItems: 'center', color: hue, lineHeight: 0.7 }}>
          {direction !== 'out' ? <span style={{ fontSize: 9, flex: 'none' }}>{'◀'}</span> : null}
          {/* the shaft is SVG with crispEdges, never a 3px CSS box — EdgeDash's rule.
              Down a list the line boxes above each entry are fractional, so a CSS bar
              lands on a different subpixel offset in every row and some antialias
              across four device rows, reading visibly thicker than their neighbours.
              crispEdges snaps every shaft to the same device-pixel height. */}
          <svg height="3" preserveAspectRatio="none" shapeRendering="crispEdges" style={{ flex: 1, minWidth: 0, display: 'block' }} aria-hidden="true"><rect width="100%" height="3" fill={hue} /></svg>
          {direction !== 'in' ? <span style={{ fontSize: 9, flex: 'none' }}>{'▶'}</span> : null}
        </span>
      </span>
      <span style={{ minWidth: 0, flex: '1 1 0', display: 'flex', justifyContent: 'flex-start' }}><EntryNode title={to} domain={toDomain} anchor={toAnchor} within={toWithin} onClick={onTo} /></span>
    </div>
  )
}
