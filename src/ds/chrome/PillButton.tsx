import { useState } from 'react'
import type { ReactNode } from 'react'

import { wrapTip } from './IconButton'

/** The five tones. Each is a {background, border, ink, hover-background} quad;
 *  `selected` overrides all of them with the moss ring wash, so a toggled pill
 *  reads the same regardless of its resting tone. */
type Tone = 'quiet' | 'primary' | 'walk' | 'danger' | 'ghost'

const TONES: Record<Tone, { bg: string; bd: string; ink: string; hoverBg: string }> = {
  quiet: { bg: 'transparent', bd: 'var(--border-rule)', ink: 'var(--text-2)', hoverBg: 'var(--surface-hover)' },
  primary: { bg: 'var(--accent-primary-wash)', bd: 'var(--moss-300)', ink: 'var(--accent-primary-ink)', hoverBg: 'var(--moss-100)' },
  walk: { bg: 'var(--accent-walk-wash)', bd: 'var(--acorn-300)', ink: 'var(--text-walk)', hoverBg: 'var(--acorn-100)' },
  danger: { bg: 'var(--state-danger-wash)', bd: 'var(--berry-100)', ink: 'var(--state-danger)', hoverBg: 'var(--berry-100)' },
  ghost: { bg: 'transparent', bd: 'transparent', ink: 'var(--text-2)', hoverBg: 'var(--surface-hover)' },
}

/** A small round-cornered action. Labels name a STATE or an action in lower
 *  case. Typed port of the DS PillButton.jsx (contract: PillButton.d.ts). */
export interface PillButtonProps {
  /** quiet = the default bordered pill; primary = moss; walk = acorn
   *  (movement — a walk, a stop, a jump); danger = berry; ghost = no resting
   *  border */
  tone?: Tone
  size?: 'sm' | 'md'
  /** a Unicode glyph from the house set (e.g. '▶' or '✦'), or one of the DS's drawn
   *  marks (`<OptionalMark />`). Never an emoji. Widened from the DS's `string` to
   *  `ReactNode` — `PaneActionBar` passes a drawn mark through this same slot. */
  glyph?: ReactNode
  disabled?: boolean
  /** on/toggled — draws the moss ring wash rather than a separate colour */
  selected?: boolean
  title?: string
  onClick?: () => void
  /** e.g. preventDefault so a toolbar press does not steal focus from the field
   *  the action applies to */
  onMouseDown?: React.MouseEventHandler<HTMLButtonElement>
  children?: ReactNode
}

export function PillButton({ tone = 'quiet', size = 'md', glyph, disabled, selected, onClick, onMouseDown, title, children }: PillButtonProps) {
  const t = TONES[tone] ?? TONES.quiet
  const [hot, setHot] = useState(false)
  const pad = size === 'sm' ? '3px 9px' : '6px 13px'
  return (
    <button
      type="button"
      title={wrapTip(title)}
      disabled={disabled}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-15)',
        minHeight: size === 'sm' ? 24 : 'var(--hit-min)',
        padding: pad,
        borderRadius: 'var(--radius-pill)',
        border: '1px solid ' + (selected ? 'var(--moss-400)' : t.bd),
        background: hot && !disabled ? t.hoverBg : selected ? 'var(--accent-primary-wash)' : t.bg,
        color: selected ? 'var(--accent-primary-ink)' : t.ink,
        fontFamily: 'var(--font-ui)',
        fontSize: size === 'sm' ? 'var(--fs-caption)' : 'var(--fs-body)',
        fontWeight: 'var(--fw-semibold)',
        lineHeight: 'var(--lh-snug)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 'var(--opacity-disabled)' : 1,
        transition: 'var(--transition-wash)',
        whiteSpace: 'nowrap',
      }}
    >
      {glyph ? <span style={{ fontSize: 'var(--fs-body)', opacity: 0.85 }}>{glyph}</span> : null}
      {children}
    </button>
  )
}
