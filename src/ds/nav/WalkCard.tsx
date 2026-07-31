import { useState } from 'react'

/** An authored walk, offered from a node it passes through — walks-as-content,
 *  not history. Typed port of the DS WalkCard.jsx. */
export interface WalkCardProps {
  /** the walk's authored title, sentence case: "From transistor to running program" */
  title: string
  /** where this node sits in it: "stop 4 of 12 — <the stop's note>" */
  meta?: string
  active?: boolean
  onClick?: () => void
}

export function WalkCard({ title, meta, active, onClick }: WalkCardProps) {
  const [hot, setHot] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--acorn-200)',
        background: active || hot ? 'var(--acorn-100)' : 'var(--accent-walk-wash)',
        boxShadow: active ? 'var(--lift-1)' : 'none',
        cursor: 'pointer',
        transition: 'var(--transition-wash)',
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={{ color: 'var(--accent-walk)', fontSize: 'var(--fs-caption)' }}>{'▶'}</span>
        <span style={{ fontSize: 'var(--fs-body)', fontWeight: 'var(--fw-bold)', color: 'var(--text-walk)' }}>{title}</span>
      </div>
      {meta ? (
        <div
          style={{
            fontSize: 'var(--fs-caption)',
            color: 'var(--text-2)',
            marginTop: 3,
            lineHeight: 'var(--lh-snug)',
          }}
        >
          {meta}
        </div>
      ) : null}
    </button>
  )
}
