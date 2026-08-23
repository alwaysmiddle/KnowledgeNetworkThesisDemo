import { Fragment, useState } from 'react'
import type { ReactNode } from 'react'

import { wrapTip } from './IconButton'

/** One action in a toolbar group. Toolbar items are glyph-only by default; a
 *  `label` is the rare exception where a mark cannot carry the meaning. */
export interface ToolbarItemSpec {
  /** rare — use only where a mark cannot carry the meaning */
  label?: string
  /** a Unicode glyph from the house set, or a small drawn mark (an inline SVG) */
  glyph?: ReactNode
  /** names the action AND states the current truth: "optionals: on the road" */
  title?: string
  /** this toggle is currently on — draws a moss (or acorn) wash, never a hue swap */
  on?: boolean
  disabled?: boolean
  /** walk = acorn (movement through the corpus); primary = moss */
  tone?: 'quiet' | 'walk' | 'primary'
  onClick?: () => void
}

/** A docked strip of actions that sits directly under the app bar. Items are
 *  pills; groups are separated by a hairline rule, never by extra space alone.
 *  Typed port of the DS Toolbar.jsx (contract: Toolbar.d.ts). */
export interface ToolbarProps {
  /** left-to-right groups, divided by a hairline rule */
  groups?: Array<{ label?: string; items: ToolbarItemSpec[] }>
  /** right-aligned content — the live focus, counts, a session action */
  trailing?: ReactNode
  /** the wordmark in plain type — use when the toolbar is the topmost bar */
  brand?: string
  /** a decorative mark pinned to the trailing edge and CROPPED by the strip —
   *  pass `<LeafMark size={40} opacity={0.2} />`. Non-interactive; toolbar clips it. */
  motif?: ReactNode
  /** 24px items instead of 30px. Default true — dense is the standard weight
   *  everywhere this ships; pass `dense={false}` only for a deliberately larger,
   *  standalone bar. */
  dense?: boolean
}

export function Toolbar({ groups = [], trailing, dense = true, brand, motif }: ToolbarProps) {
  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: dense ? 'var(--space-15)' : 'var(--space-2)',
        padding: dense ? '5px var(--space-4)' : '7px var(--space-5)',
        background: 'var(--surface-paper)',
        borderBottom: '1px solid var(--border-hair)',
      }}
    >
      {motif ? <span style={{ position: 'absolute', right: 0, bottom: 0, pointerEvents: 'none', lineHeight: 0 }}>{motif}</span> : null}
      {brand ? (
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 'var(--fw-bold)',
            fontSize: 'var(--fs-title)',
            color: 'var(--moss-600)',
            letterSpacing: 'var(--ls-display)',
            flexShrink: 0,
            marginRight: 2,
          }}
        >
          {brand}
        </span>
      ) : null}
      {groups.map((g, gi) => (
        <Fragment key={gi}>
          {gi > 0 ? <span style={{ width: 1, height: 18, alignSelf: 'center', background: 'var(--border-frame)', flexShrink: 0 }} /> : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', minWidth: 0 }}>
            {g.label ? (
              <span
                style={{
                  fontSize: 'var(--fs-micro)',
                  textTransform: 'uppercase',
                  letterSpacing: 'var(--ls-caps)',
                  fontWeight: 'var(--fw-bold)',
                  color: 'var(--text-3)',
                  marginRight: 2,
                  flexShrink: 0,
                }}
              >
                {g.label}
              </span>
            ) : null}
            {g.items.map((it, i) => (
              <ToolbarItem key={i} {...it} dense={dense} />
            ))}
          </div>
        </Fragment>
      ))}
      <span style={{ flex: 1 }} />
      {trailing ? <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>{trailing}</div> : null}
    </div>
  )
}

function ToolbarItem({ label, glyph, title, on, disabled, tone, onClick, dense }: ToolbarItemSpec & { dense?: boolean }) {
  const [hot, setHot] = useState(false)
  const walk = tone === 'walk'
  const ink = disabled
    ? 'var(--text-3)'
    : on
      ? walk
        ? 'var(--text-walk)'
        : 'var(--accent-primary-ink)'
      : tone === 'primary'
        ? 'var(--accent-primary-ink)'
        : 'var(--text-2)'
  const bd = on ? (walk ? 'var(--border-walk)' : 'var(--moss-300)') : hot && !disabled ? 'var(--border-rule)' : 'transparent'
  const bg = on ? (walk ? 'var(--accent-walk-wash)' : 'var(--accent-primary-wash)') : hot && !disabled ? 'var(--surface-hover)' : 'transparent'
  const box = dense ? 24 : 30
  return (
    <button
      type="button"
      title={wrapTip(title || label)}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        flexShrink: 0,
        minHeight: box,
        height: box,
        padding: label ? (dense ? '3px 9px' : '5px 11px') : 0,
        width: label ? 'auto' : box,
        borderRadius: 'var(--radius-pill)',
        border: '1px solid ' + bd,
        background: bg,
        color: ink,
        fontFamily: 'var(--font-ui)',
        fontSize: label ? 'var(--fs-body)' : 'var(--fs-title)',
        fontWeight: on ? 'var(--fw-bold)' : 'var(--fw-semibold)',
        lineHeight: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 'var(--opacity-disabled)' : 1,
        transition: 'var(--transition-wash)',
        whiteSpace: 'nowrap',
      }}
    >
      {glyph ? <span style={{ opacity: 0.85 }}>{glyph}</span> : null}
      {label}
    </button>
  )
}
