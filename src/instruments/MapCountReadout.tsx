// OB-097 — the Map pane's title-bar readout, docked via `Pane.actions`. Plain
// text, no pill/background (tried and rejected as too loud next to the pane
// title): `--text-2` for the labels and the middot, `--text-1` + `--fw-semibold`
// for the numbers, numbers in `--font-mono` with tabular figures.
//
// `territories` is every node the map draws a cell for (one-to-one with the
// corpus's nodes); `edges` is the corpus's own authored relations — NOT
// `nestedDots.length`, which counts deep leaf dots with no territory of their
// own and is a different number entirely.

import { edges } from '../corpus/graph'
import { territories } from '../model/nested'

export default function MapCountReadout() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, fontSize: 'var(--fs-caption)', color: 'var(--text-2)' }}>
      <span>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-1)', fontWeight: 'var(--fw-semibold)' }}>{territories.length}</span> nodes
      </span>
      <span>·</span>
      <span>
        <span style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', color: 'var(--text-1)', fontWeight: 'var(--fw-semibold)' }}>{edges.length}</span> relations
      </span>
    </span>
  )
}
