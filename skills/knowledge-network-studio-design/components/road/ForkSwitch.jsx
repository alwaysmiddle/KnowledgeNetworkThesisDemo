import React from 'react'

/** The branch decision, as an explicit switch. Tabs carry step counts so the
 *  cost of a branch is visible without switching to it, and a ghost line keeps
 *  the unchosen variants on the page.
 *
 *  A tab's label is an input; focusing it must NOT change the choice — only a
 *  click on the tab does. */
export function ForkSwitch({ question, variants, chosen, onPick, onQuestion, onRelabel }) {
  const hidden = variants.filter((v, i) => i !== chosen)
  const hiddenNote = hidden.length
    ? hidden.map((v) => (v.label || 'unnamed') + ' holds ' + v.count + (v.count === 1 ? ' stop' : ' stops')).join(' \u00b7 ') + ', not shown'
    : null
  return (
    <div style={{ marginTop: 'var(--space-1)' }}>
      <input
        value={question ?? ''}
        placeholder="what does this fork decide?"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onQuestion && onQuestion(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 'var(--road-question-h)',
          padding: '2px 4px',
          fontFamily: 'inherit',
          fontSize: 'var(--fs-meta)',
          fontStyle: 'italic',
          color: 'var(--road-question)',
          background: 'var(--surface-inset)',
          border: 'var(--stroke-hair) solid var(--border-well)',
          borderRadius: 'var(--radius-xs)',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-1)' }}>
        {variants.map((v, i) => {
          const on = i === chosen
          return (
            <div
              key={i}
              onClick={(e) => {
                e.stopPropagation()
                onPick && onPick(i)
              }}
              role="radio"
              aria-checked={on}
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-1)',
                minHeight: 'var(--road-hit-min)',
                padding: '0 var(--space-15)',
                borderRadius: 'var(--radius-sm)',
                background: on ? 'var(--amber-100)' : 'var(--surface-card)',
                border: 'var(--stroke-hair) solid ' + (on ? 'var(--amber-500)' : 'var(--border-card)'),
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 'var(--fs-micro)', color: on ? 'var(--amber-600)' : 'var(--text-3)' }}>
                {on ? '\u25cf' : '\u25cb'}
              </span>
              <input
                value={v.label}
                placeholder="name this branch"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onRelabel && onRelabel(i, e.target.value)}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 0,
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'inherit',
                  fontSize: 'var(--fs-micro)',
                  fontWeight: on ? 'var(--fw-bold)' : 'var(--fw-normal)',
                  color: on ? 'var(--amber-700)' : 'var(--text-2)',
                }}
              />
              <span
                style={{
                  fontSize: 'var(--fs-micro)',
                  fontVariantNumeric: 'tabular-nums',
                  color: on ? 'var(--amber-600)' : 'var(--text-3)',
                }}
              >
                {v.count}
              </span>
            </div>
          )
        })}
      </div>
      {hiddenNote && (
        <div
          style={{
            marginTop: 'var(--space-1)',
            paddingTop: 'var(--space-1)',
            borderTop: 'var(--stroke-hair) dashed var(--border-dashed-optional)',
            fontSize: 'var(--fs-micro)',
            color: 'var(--text-3)',
          }}
        >
          {hiddenNote}
        </div>
      )}
    </div>
  )
}
