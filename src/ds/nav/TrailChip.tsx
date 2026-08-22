import { useState } from 'react'

import type { DomainCode } from '../graph/vocab'
import { DOMAIN_TOKEN } from '../graph/vocab'
import { wrapTip } from '../chrome/IconButton'

/** One entry of the append-only trail: where a focus landed, and how it got
 *  there. A jump is accented so the divergence from the breadcrumb is visible.
 *  Typed port of the DS TrailChip.jsx. */
export interface TrailChipProps {
  title: string
  domain: DomainCode
  /** the three-letter writer tag: MAP TREE LNK TRL WLK GPH NAV */
  via?: string
  /** the focus crossed a typed link rather than stepping through containment */
  jump?: boolean
  onClick?: () => void
}

export function TrailChip({ title, domain, via, jump, onClick }: TrailChipProps) {
  const [hot, setHot] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      title={wrapTip(via ? via + ' · ' + title : title)}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 11px',
        borderRadius: 'var(--radius-pill)',
        border: '1px solid ' + (jump ? 'var(--acorn-300)' : 'var(--border-hair)'),
        background: jump ? 'var(--accent-walk-wash)' : hot ? 'var(--surface-hover)' : 'var(--surface-raised)',
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-body)',
        fontWeight: 'var(--fw-semibold)',
        color: 'var(--text-1)',
        cursor: 'pointer',
        transition: 'var(--transition-wash)',
        whiteSpace: 'nowrap',
      }}
    >
      {jump ? <span style={{ color: 'var(--accent-walk)', flexShrink: 0 }}>{'⤳'}</span> : null}
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 'var(--radius-pill)',
          flexShrink: 0,
          background: DOMAIN_TOKEN[domain] || 'var(--swatch-anchor-fallback)',
        }}
      />
      <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
      {via ? (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--fs-micro)',
            color: 'var(--text-3)',
            flexShrink: 0,
          }}
        >
          {via}
        </span>
      ) : null}
    </button>
  )
}
