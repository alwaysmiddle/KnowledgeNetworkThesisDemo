import { useState } from 'react'
import type { ReactNode } from 'react'

import { caretStyle } from '../nav/TreeRow'

/** A family of instruments in the palette. Collapsible, and it reports how many
 *  of its members are on screen so a folded group still tells you something.
 *  Uses the tree's grammar — the drawn caret in a 16px slot and a 16px indent on
 *  the children, matching TreeRow exactly — because the palette is a containment
 *  list too, and the system should not invent a second way to nest things.
 *
 *  The count sits BESIDE its label, not flush right: with several families open a
 *  right-hand column of numbers is a column of orphans — proximity is what binds
 *  a number to its name, not alignment. It still gets both, because the label
 *  runs in a 76px MINIMUM column; when a list holds a longer name, widen the
 *  column for the WHOLE list via FamilyColumn(labels) so the numbers move right
 *  together and stay a column.
 *
 *  A family label is a SUB-head: text-2 at medium, one step quieter than the
 *  pane's section head (SectionLabel, text-1 bold). An OPEN group says so in
 *  weight, not in ink — label and count medium → semibold, caret text-3 → text-2.
 *  Typed port of the DS InstrumentGroup.jsx (contract: InstrumentGroup.d.ts). */
export interface InstrumentGroupProps {
  /** the family name, lower case: "views", "walks", "lenses" */
  label: string
  /** expanded. An open family marks itself in weight, never in ink. */
  open?: boolean
  onToggle?: () => void
  /** how many members are on screen; sits immediately after the label. 0 hides it. */
  count?: number
  /** the shared label column for the whole list — pass FamilyColumn(labels), the
   *  same value to every group, so counts move right together. Default 76px. */
  labelWidth?: number | string
  /** the family's InstrumentRows */
  children?: ReactNode
}

/** The shared label column for a SET of families: the longest name, in ch, never
 *  under 76px, so every count in the list lands on the same x even when one
 *  family is called "reference views". Measure once in the consumer and pass the
 *  result to every InstrumentGroup in that list — a per-row width would re-orphan
 *  the numbers. */
export function FamilyColumn(labels: string[]): string {
  const longest = labels.reduce((n, l) => Math.max(n, String(l).length), 0)
  return 'max(76px, ' + (longest + 1) + 'ch)'
}

export function InstrumentGroup({ label, open = true, onToggle, count = 0, labelWidth = 76, children }: InstrumentGroupProps) {
  const [hot, setHot] = useState(false)
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        onMouseEnter={() => setHot(true)}
        onMouseLeave={() => setHot(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          minHeight: 24,
          padding: '3px 8px',
          textAlign: 'left',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid transparent',
          background: hot ? 'var(--surface-hover)' : 'transparent',
          color: 'var(--text-2)',
          cursor: 'pointer',
          transition: 'var(--transition-wash)',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            width: 16,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            color: open ? 'var(--text-2)' : 'var(--text-3)',
            transition: 'color var(--dur-hover) var(--ease-soft)',
          }}
        >
          <span style={caretStyle(open)} />
        </span>
        <span
          style={{
            flex: '0 1 auto',
            minWidth: labelWidth,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-caption)',
            fontWeight: open ? 'var(--fw-semibold)' : 'var(--fw-medium)',
          }}
        >
          {label}
        </span>
        {count > 0 ? (
          <span
            style={{
              flexShrink: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 'var(--fs-micro)',
              fontVariantNumeric: 'var(--tnum)',
              color: 'var(--accent-primary-ink)',
              // JetBrains Mono ships 400 and 500 only, so the count steps regular
              // → medium: 600 would synthesise back to 500 and the number would
              // sit unlit beside a label that had clearly moved.
              fontWeight: open ? 'var(--fw-medium)' : 'var(--fw-regular)',
              marginLeft: -2,
            }}
          >
            {count}
          </span>
        ) : null}
        <span style={{ flex: 1 }} />
      </button>
      {open ? <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</div> : null}
    </div>
  )
}
