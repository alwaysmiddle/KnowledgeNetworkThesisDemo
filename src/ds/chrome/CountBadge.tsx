/** A live count in the header: the number in mono/tabular figures, the noun
 *  beside it in lower case. Numbers are never dressed up — "12 visited", not
 *  "12 items". Typed port of the DS CountBadge.jsx (contract: CountBadge.d.ts). */
export interface CountBadgeProps {
  value: number | string
  /** lower case, no unit-noun padding — "visited", "route", "entries" */
  label: string
  tone?: 'quiet' | 'primary' | 'walk'
}

export function CountBadge({ value, label, tone = 'quiet' }: CountBadgeProps) {
  const ink = tone === 'walk' ? 'var(--text-walk)' : tone === 'primary' ? 'var(--accent-primary-ink)' : 'var(--text-2)'
  const bg = tone === 'walk' ? 'var(--accent-walk-wash)' : tone === 'primary' ? 'var(--accent-primary-wash)' : 'var(--bark-100)'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        background: bg,
        color: ink,
        fontFamily: 'var(--font-ui)',
        fontSize: 'var(--fs-caption)',
        fontWeight: 'var(--fw-semibold)',
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'var(--tnum)', fontSize: 'var(--fs-caption)' }}>{value}</span>
      <span style={{ opacity: 0.75, fontWeight: 'var(--fw-medium)' }}>{label}</span>
    </span>
  )
}
