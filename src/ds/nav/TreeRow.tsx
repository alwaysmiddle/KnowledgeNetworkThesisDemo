import { useState } from 'react'

import type { DomainCode } from '../graph/vocab'
import { DOMAIN_TOKEN } from '../graph/vocab'

/** One indented row of the containment tree — the literal list reading of the
 *  corpus. Single click selects, double click re-roots; a container draws the
 *  ▾/▸ disclosure. Presentation only: the consumer owns the bus wiring, the
 *  single/double-click disambiguation, and any drag source. Typed port of the
 *  DS TreeRow.jsx. */
export interface TreeRowProps {
  title: string
  domain: DomainCode
  /** indentation level; 16px per step */
  depth?: number
  /** has children — draws the ▾/▸ disclosure and answers to double-click */
  container?: boolean
  expanded?: boolean
  /** this row is the bus's focus */
  current?: boolean
  /** typed links touching this node; nonzero only at the topic level */
  linkCount?: number
  onSelect?: () => void
  onToggle?: () => void
  onZoom?: () => void
}

export function TreeRow({
  title,
  domain,
  depth = 0,
  container,
  expanded,
  current,
  linkCount,
  onSelect,
  onToggle,
  onZoom,
}: TreeRowProps) {
  const [hot, setHot] = useState(false)
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onZoom}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        minHeight: 'var(--hit-min)',
        padding: '4px 10px 4px ' + (10 + depth * 16) + 'px',
        marginInline: 6,
        borderRadius: 'var(--radius-sm)',
        cursor: 'pointer',
        background: current ? 'var(--accent-primary-wash)' : hot ? 'var(--surface-hover)' : 'transparent',
        transition: 'var(--transition-wash)',
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-body)',
      }}
    >
      {container ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle?.()
          }}
          style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--text-3)',
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {expanded ? '▾' : '▸'}
        </button>
      ) : (
        <span style={{ width: 16, flexShrink: 0 }} />
      )}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 'var(--radius-pill)',
          flexShrink: 0,
          background: DOMAIN_TOKEN[domain] || 'var(--swatch-anchor-fallback)',
        }}
      />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: current ? 'var(--fw-bold)' : 'var(--fw-medium)',
          color: current ? 'var(--accent-primary-ink)' : 'var(--text-1)',
        }}
      >
        {title}
      </span>
      {linkCount ? (
        <span
          style={{
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 'var(--fs-micro)',
            color: 'var(--text-3)',
            fontVariantNumeric: 'var(--tnum)',
          }}
        >
          {'⤳'} {linkCount}
        </span>
      ) : null}
    </div>
  )
}
