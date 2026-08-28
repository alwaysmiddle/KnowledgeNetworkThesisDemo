import type { CSSProperties, ReactNode } from 'react'

function Dot({ hue }: { hue: string }) {
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: hue, flexShrink: 0 }} />
}

function Arrow() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 12" width={20} height={12} style={{ flexShrink: 0 }}>
      <path d="M1 6h15" stroke="var(--text-2)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M11 1l6 5-6 5" fill="none" stroke="var(--text-2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, color: 'var(--text-2)', fontSize: 'var(--fs-caption)' }}>
      <span>{label}</span>
      <b style={{ color: 'var(--text-1)', fontWeight: 'var(--fw-semibold)' }}>{value}</b>
    </div>
  )
}

/**
 * The map's hover tooltip, in its two shapes: `kind="node"` (what is this, how does it
 * connect, what's its parent) and `kind="relation"` (which two things this line joins).
 * Two shapes rather than one card with fields blanked out per kind — an edge has no node
 * count to hide, and forcing one shape to cover both invites dead rows.
 *
 * CURSOR-ANCHORED, NOT A FIXED CORNER. The caller positions it via `style` beside whatever
 * is under the pointer — never pin this to a corner of the pane. Reading a tooltip that
 * sits away from what you're pointing at means looking away from your own cursor, which is
 * the whole reason a fixed-corner version was rejected this session.
 *
 * Drawn on the system's own raised card face (`--surface-raised`, `--border-rule`) — never
 * inverted/dark. A dark chip was tried first and read as foreign chrome next to the rest of
 * the product, which is entirely on `--surface-paper`/`--surface-raised`.
 */
export interface MapTooltipProps {
  kind?: 'node' | 'relation'
  /** the title's dot colour — a ring hue (`var(--hue-cobalt)`) for a node, an edge hue
   *  (`var(--edge-uses)`) for a relation. Never a raw hex; resolve through the ring/edge
   *  tokens the way `EdgeLegend`'s `edgeHue()` does. */
  hue?: string
  /** node: the node's name. relation: the relation kind's label (e.g. "uses"). */
  title?: ReactNode
  /** node only — "territory" / "node" / whatever the corpus's own vocabulary calls it */
  typeLabel?: string
  /** node only — how many nodes/territories this one contains, if it's a container */
  nodeCount?: number
  /** node only — both required together; rendered as one line, "N in · M out" */
  relationsIn?: number
  relationsOut?: number
  /** node only — the containing node's name, if any */
  parent?: string
  /** relation only — the source node's name */
  from?: ReactNode
  /** relation only — the target node's name */
  to?: ReactNode
  /** POSITION ONLY — left/top beside the hovered element. Do not restyle the card face from
   *  a caller; that is what this component owns. */
  style?: CSSProperties
}

export function MapTooltip({ kind = 'node', hue = 'var(--bark-500)', title, typeLabel, nodeCount, relationsIn, relationsOut, parent, from, to, style }: MapTooltipProps) {
  return (
    <div
      style={{
        background: 'var(--surface-raised)',
        color: 'var(--text-1)',
        border: '1px solid var(--border-rule)',
        borderRadius: 'var(--radius-md)',
        padding: '9px 11px',
        boxShadow: 'var(--lift-2)',
        minWidth: kind === 'relation' ? 210 : 180,
        maxWidth: kind === 'relation' ? 260 : undefined,
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-caption)',
        lineHeight: 'var(--lh-snug)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-body)', marginBottom: kind === 'relation' ? 6 : 4 }}>
        <Dot hue={hue} />
        {title}
      </div>
      {kind === 'relation' ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 'var(--fw-semibold)' }}>
          <span>{from}</span>
          <Arrow />
          <span>{to}</span>
        </div>
      ) : (
        <>
          {typeLabel != null ? <Row label="type" value={typeLabel} /> : null}
          {nodeCount != null ? <Row label="nodes" value={nodeCount} /> : null}
          {relationsIn != null || relationsOut != null ? <Row label="relations" value={`${relationsIn} in · ${relationsOut} out`} /> : null}
          {parent != null ? <Row label="parent" value={parent} /> : null}
        </>
      )}
    </div>
  )
}
