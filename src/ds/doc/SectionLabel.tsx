import type { ReactNode } from 'react'

/** A small heading inside a pane: lower case, a bare count when there is one, and
 *  an optional action pushed to the trailing edge. The action slot exists so a
 *  head with a button beside it is not hand-rolled — every rank-inversion in this
 *  system came from a head written inline. Typed port of the DS SectionLabel.jsx
 *  (contract: SectionLabel.d.ts). */
export interface SectionLabelProps {
  children: ReactNode
  /** a bare number — never "(3 items)" */
  count?: number
  /** an action (usually a button) pinned to the trailing edge */
  action?: ReactNode
}

export function SectionLabel({ children, count, action }: SectionLabelProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 6,
        width: '100%',
        marginBottom: 'var(--space-2)',
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--fs-caption)',
        fontWeight: 'var(--fw-bold)',
        color: 'var(--text-1)',
      }}
    >
      <span>{children}</span>
      {count != null ? (
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)', fontWeight: 'var(--fw-medium)', fontVariantNumeric: 'var(--tnum)' }}>{count}</span>
      ) : null}
      {action ? (
        <>
          <span style={{ flex: 1 }} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{action}</span>
        </>
      ) : null}
    </div>
  )
}
