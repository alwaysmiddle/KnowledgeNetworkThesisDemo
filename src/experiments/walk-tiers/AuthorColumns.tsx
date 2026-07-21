// Authoring view 2 (round 4) — the tier lines turned VERTICAL. Each column
// is one tier, boxes connected by one-way down arrows (the walk's order).
// Clicking a ⊞ stage box opens the next column to its right, and an EDGE is
// drawn from that stage box to its column — the begat-relationship made
// visible, which the horizontal lines only implied with "↳ inside …" labels.
// Same drill-path semantics as TierLines: one open decomposition per tier,
// picking anything else truncates the columns below. A read-and-navigate
// view over the shared draft; the other two views do the editing.
//
// Everything is laid out arithmetically (fixed box/column sizes), so the
// SVG arrows and edges need no DOM measurement.

import { useState } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { visitCount } from './mockwalk'
import type { Stop, StageStop } from './mockwalk'
import type { Sync } from './sync'

const COLW = 148
const GAP = 56
const BOXH = 44
const VGAP = 22
const TOP = 40
const PAD = 14

interface Column {
  source: string
  stops: Stop[]
  /** position of the stage box (column index, row index) this column came from */
  from?: { col: number; row: number }
}

function columnsFor(stops: Stop[], path: string[]): Column[] {
  const cols: Column[] = [{ source: 'the draft', stops }]
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

const boxX = (col: number) => PAD + col * (COLW + GAP)
const boxY = (row: number) => TOP + row * (BOXH + VGAP)

export default function AuthorColumns({ stops, sync }: { stops: Stop[]; sync: Sync }) {
  const [path, setPath] = useState<string[]>([])
  const cols = columnsFor(stops, path)

  const pick = (col: number, s: Stop) => setPath(s.kind === 'stage' ? [...path.slice(0, col), s.key] : path.slice(0, col))

  const width = PAD + cols.length * (COLW + GAP)
  const height = TOP + Math.max(...cols.map((c) => c.stops.length), 1) * (BOXH + VGAP) + 20

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="relative" style={{ width, height }}>
        <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
          <defs>
            <marker id="wt-vdown" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#f59e0b" />
            </marker>
            <marker id="wt-vedge" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill="#d97706" />
            </marker>
          </defs>
          {/* one-way down arrows inside each column — the order of the walk */}
          {cols.flatMap((c, k) =>
            c.stops.slice(0, -1).map((_, i) => (
              <line
                key={`a-${k}-${i}`}
                data-varrow
                x1={boxX(k) + COLW / 2}
                y1={boxY(i) + BOXH}
                x2={boxX(k) + COLW / 2}
                y2={boxY(i + 1) - 3}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeOpacity="0.7"
                markerEnd="url(#wt-vdown)"
              />
            )),
          )}
          {/* the begat-edge: from the picked stage box to the column it opened */}
          {cols.map((c, k) => {
            if (!c.from) return null
            const x1 = boxX(c.from.col) + COLW
            const y1 = boxY(c.from.row) + BOXH / 2
            const x2 = boxX(k)
            const y2 = boxY(0) + BOXH / 2
            const mx = (x1 + x2) / 2
            return (
              <path
                key={`e-${k}`}
                data-vedge
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2 - 3} ${y2}`}
                fill="none"
                stroke="#d97706"
                strokeWidth="2"
                strokeDasharray="5 3"
                markerEnd="url(#wt-vedge)"
              />
            )
          })}
        </svg>

        {cols.map((c, k) => (
          <div key={`${k}-${c.source}`} data-vcol={k}>
            <div className="absolute text-[9.5px] font-bold text-slate-400 whitespace-nowrap" style={{ left: boxX(k), top: TOP - 24, width: COLW }}>
              tier {k} · {c.source}
            </div>
            {c.stops.map((s, i) => {
              if (s.kind === 'stage') {
                const picked = path[k] === s.key
                return (
                  <button
                    key={s.key}
                    data-vbox
                    data-vpick={s.key}
                    onClick={() => pick(k, s)}
                    className={[
                      'absolute rounded-lg border-2 px-2 text-left text-[10.5px] font-bold leading-tight',
                      picked ? 'border-amber-500 bg-amber-400/90 text-white shadow-sm' : 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100',
                    ].join(' ')}
                    style={{ left: boxX(k), top: boxY(i), width: COLW, height: BOXH }}
                  >
                    <span className="block truncate">{picked ? '▸' : '⊞'} {s.title}</span>
                    <span className={['block text-[9px] font-normal', picked ? 'text-amber-100' : 'text-amber-500'].join(' ')}>{visitCount(s)} stops inside</span>
                  </button>
                )
              }
              const color = DOMAIN_COLOR[domainOf(s.node)]
              return (
                <button
                  key={`${i}-${s.node}`}
                  {...sync.bind(s.node)}
                  data-vbox
                  data-node={s.node}
                  onClick={() => pick(k, s)}
                  className={[
                    'absolute rounded-lg border-2 bg-white px-2 text-left text-[10.5px] font-semibold leading-tight',
                    sync.lit(s.node) ? 'ring-2 ring-sky-300' : '',
                  ].join(' ')}
                  style={{ left: boxX(k), top: boxY(i), width: COLW, height: BOXH, borderColor: color, color }}
                >
                  <span className="block truncate">{byId.get(s.node)!.title}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
