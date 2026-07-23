// The one drill-path → columns computation, shared by BOTH presentation
// views (WalkColumns and the isometric LayerStack) so they can never
// disagree about which tiers are open. Kept out of the component files —
// react-refresh wants those to export only components.

import type { Stop, StageStop } from './mockwalk'

export interface Column {
  source: string
  stops: Stop[]
  /** position of the stage box (column index, row index) this column came from */
  from?: { col: number; row: number }
}

export function columnsFor(stops: Stop[], path: string[]): Column[] {
  const cols: Column[] = [{ source: 'the plan', stops }]
  let cur = stops
  let colIdx = 0
  for (const key of path) {
    const row = cur.findIndex((x) => x.kind === 'stage' && x.key === key)
    if (row < 0) break
    const s = cur[row] as StageStop
    cols.push({ source: s.title, stops: s.steps, from: { col: colIdx, row } })
    cur = s.steps
    colIdx++
  }
  return cols
}
