import type { DomainCode } from './vocab'
import { DOMAIN_TOKEN } from './vocab'

/** A corpus node as a compact chip: a domain dot, a truncating title, raised on
 *  paper (the face stays white so elevation reads). Typed port of the DS
 *  NodeChip.jsx.
 *
 *  The jsx's undocumented `wrap` prop is intentionally dropped here: it is
 *  absent from NodeChip.d.ts and the adherence allowlist, and the one repo
 *  consumer only ever truncates. Flagged to design as a jsx/d.ts drift. */
export interface NodeChipProps {
  title: string
  domain: DomainCode
  /** off the resolved path: no lift, no fill, --opacity-off-path */
  dim?: boolean
  /** cross-pane hover correspondence — the pond ring, and nothing else */
  lit?: boolean
  /** tooltip; the stop's note when there is one */
  note?: string
  onClick?: () => void
}

export function NodeChip({ title, domain, dim, lit, note, onClick }: NodeChipProps) {
  return (
    <span
      title={note || title}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        maxWidth: '100%',
        padding: '4px 11px 4px 9px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid ' + (dim ? 'var(--border-hair)' : 'var(--border-rule)'),
        background: dim ? 'transparent' : 'var(--surface-raised)',
        color: dim ? 'var(--text-3)' : 'var(--text-1)',
        boxShadow: lit ? 'var(--ring-linked), var(--lift-1)' : dim ? 'none' : 'var(--lift-1)',
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-body)',
        fontWeight: 'var(--fw-semibold)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        opacity: dim ? 'var(--opacity-off-path)' : 1,
        transition: 'var(--transition-wash)',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 'var(--radius-pill)',
          flexShrink: 0,
          background: DOMAIN_TOKEN[domain] || 'var(--swatch-anchor-fallback)',
        }}
      />
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
    </span>
  )
}
