// The vertical tier columns (round 5) — E's desk, replacing the horizontal
// TierLines. One column per tier, boxes joined by one-way DOWN arrows (the
// walk's order); picking a ⊞ stage box opens the next column to its right
// with a dashed BEGAT-EDGE drawn from that box to the column it spawned.
// CONTROLLED: the drill path and pick handler come from outside, so the
// layer stack and these columns render one TierPathState and cannot
// disagree — the same inversion that made TierLines E's desk in round 2.
// A stage's asides hang below its column as a dashed violet lane: related,
// visibly not on the arrowed order.
//
// Everything is laid out arithmetically (fixed box/column sizes), so the
// SVG arrows and edges need no DOM measurement.

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { columnsFor } from './columns'
import type { Column } from './columns'
import { visitCount } from './mockwalk'
import type { Stop } from './mockwalk'
import type { Sync } from './sync'

const COLW = 148
const GAP = 56
const BOXH = 44
const VGAP = 22
const TOP = 40
const PAD = 14

const boxX = (col: number) => PAD + col * (COLW + GAP)
const boxY = (row: number) => TOP + row * (BOXH + VGAP)

export default function WalkColumns({
  stops,
  path,
  pick,
  sync,
}: {
  stops: Stop[]
  path: string[]
  pick(col: number, s: Stop): void
  sync: Sync
}) {
  const cols = columnsFor(stops, path)

  const rowsOf = (c: Column) => c.stops.length + (c.asides?.length ?? 0)
  const width = PAD + cols.length * (COLW + GAP)
  const height = TOP + Math.max(...cols.map(rowsOf), 1) * (BOXH + VGAP) + 20

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
              // presentation receives RESOLVED trees — forks never reach here
              if (s.kind === 'fork') return null
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
                      s.optional ? 'border-dashed' : '',
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
                    s.optional ? 'border-dashed' : '',
                    sync.lit(s.node) ? 'ring-2 ring-sky-300' : '',
                  ].join(' ')}
                  style={{ left: boxX(k), top: boxY(i), width: COLW, height: BOXH, borderColor: color, color }}
                >
                  <span className="block truncate">{s.optional ? '◇ ' : ''}{byId.get(s.node)!.title}</span>
                </button>
              )
            })}
            {(c.asides ?? []).map((a, ai) => (
              <div
                key={a.title}
                data-vaside
                className="absolute rounded-lg border-2 border-dashed border-violet-300 bg-violet-50/60 px-2 py-1"
                style={{ left: boxX(k), top: boxY(c.stops.length + ai), width: COLW, height: BOXH }}
              >
                <span className="block truncate text-[9px] font-semibold text-violet-500">≀ {a.title}</span>
                <span className="flex items-center gap-1 pt-0.5">
                  {a.steps.map((st) => (
                    <span
                      key={st.node}
                      {...sync.bind(st.node)}
                      data-node={st.node}
                      title={byId.get(st.node)!.title}
                      className={['w-2 h-2 rounded-full inline-block', sync.lit(st.node) ? 'ring-2 ring-sky-300' : ''].join(' ')}
                      style={{ background: DOMAIN_COLOR[domainOf(st.node)] }}
                    />
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
