import { useState } from 'react'
import type { CSSProperties } from 'react'

import type { DomainCode } from '../graph/vocab'
import { DOMAIN_TOKEN } from '../graph/vocab'
import { useClipped } from '../chrome/IconButton'

/** The disclosure mark, drawn rather than set: two 1.5px strokes meeting at a
 *  right angle, rotated −45° closed and +45° open. Font chevrons and triangles
 *  both failed here — a fill out-inks the labels, and every hollow or angle-quote
 *  glyph is too small and too oddly proportioned at 15px to read as a shape.
 *  Exported because the instrument palette (InstrumentGroup) is a containment
 *  list too and reuses this exact mark — the system draws nesting one way.
 *
 *  IF YOU REPEAT THE RECIPE, REPEAT THE LONGHANDS. This sets `borderRight` and
 *  `borderBottom` and nothing else. Writing it as `border` plus `borderTop: 'none'`
 *  looks equivalent and is not: React diffs style objects key by key, so a re-render
 *  that changes only the shorthand's colour re-sets `border` and never re-sets the two
 *  sides that were switched off — the mark fills in and the caret becomes a diamond the
 *  first time it is hovered. (DS 2026-08-17, contracted at last.) */
export function caretStyle(open?: boolean): CSSProperties {
  return {
    width: 6,
    height: 6,
    boxSizing: 'border-box',
    borderRight: '1.5px solid currentColor',
    borderBottom: '1.5px solid currentColor',
    borderRadius: 1,
    transform: open ? 'rotate(45deg) translate(-1px, -1px)' : 'rotate(-45deg) translate(-1px, 1px)',
    transition: 'transform var(--dur-hover) var(--ease-soft)',
  }
}

/** One indented row of the containment tree — the literal list reading of the
 *  corpus. Single click selects, double click re-roots; a container draws the
 *  ▾/▸ disclosure. Presentation only: the consumer owns the bus wiring, the
 *  single/double-click disambiguation, and any drag source. Typed port of the
 *  DS TreeRow.jsx. */
export interface TreeRowProps {
  title: string
  domain: DomainCode
  /** indentation level; 16px per step. This component is the REFERENCE for nesting
   *  anywhere in the system — a 16px caret slot plus 16px of indent per level. Anything
   *  else that nests matches those two numbers rather than picking its own step */
  depth?: number
  /** has children — draws the disclosure caret (`caretStyle`, rotated when open)
   *  and answers to double-click. Never a typed ▾/▸, never an SVG chevron */
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
  /* a tree row's title is clipped by depth: the deeper the row, the less width is
     left for it, so the same title clips in one place and not in another */
  const titleClip = useClipped<HTMLSpanElement>(title)
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
            lineHeight: 1,
          }}
        >
          <span style={caretStyle(expanded)} />
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
        {...titleClip}
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
