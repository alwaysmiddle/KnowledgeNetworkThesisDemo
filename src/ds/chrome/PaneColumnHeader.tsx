import type { ReactNode } from 'react'

/* Typed port of the DS components/chrome/PaneColumnHeader.jsx (contract: PaneColumnHeader.d.ts),
   pulled in for the notes pane (OB-145, #267) — the system's column head, extracted by the DS on
   2026-08-28 from the connections pane's private `ColumnHeader`. */

/** A COLUMN'S NAME, the display face, with a data NOTE under it in the same register the
 *  system's pill notes use ("Graph Theory" over "3 nodes") — so a multi-column pane's heads
 *  and its rows tell one typographic story instead of the head reading as caps furniture and
 *  the rows reading as content.
 *
 *  `minHeight` is for a pane whose columns must line up even when one head's note is empty —
 *  the connections pane passes it on the CONTAINS side so a filter input sits at the same y as
 *  the RELATIONSHIPS side's graph, whether or not a note came back that turn. Omit it and the
 *  head takes only the room its own two lines need. */
export interface PaneColumnHeaderProps {
  /** the column's name — display face, bold, `--text-1` */
  title: ReactNode
  /** a short data line under the title — counts, a summary. Omit and only the title draws;
   *  this is a NOTE (`--fs-caption`-scale, `--text-3`), not a second title */
  note?: ReactNode
  /** floor the head's own height — for a multi-column pane whose columns must line up even
   *  when one head's note is empty this turn. Omit and the head takes only what its own
   *  one or two lines need */
  minHeight?: number
}

export function PaneColumnHeader({ title, note, minHeight }: PaneColumnHeaderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '0 0 8px', minHeight, boxSizing: 'border-box' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 'var(--fw-bold)', color: 'var(--text-1)', lineHeight: 1.25 }}>{title}</span>
      {note ? <span style={{ fontSize: 10, color: 'var(--text-3)', lineHeight: 1.25 }}>{note}</span> : null}
    </div>
  )
}
