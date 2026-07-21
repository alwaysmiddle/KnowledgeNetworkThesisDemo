// Candidate D — METRO LINE, drawn as an elevation profile over tier strata:
// one continuous line visits every station in walk order, and where a stage
// is expanded the line DIPS one stratum down and runs local through its
// stops; collapse it and the line pops flat again, the whole stage one
// interchange diamond. Stations are labelled corpus nodes (the user's tweak
// to the research metaphor — named stations, no anonymous dots). Depth is an
// AXIS here, not a window: a 4th tier just dips lower and the map scrolls,
// which is this candidate's distinguishing trait. Asides run as a dashed
// violet line floating beside their stage's span — parallel, never joined.

import { useState } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { PLAN, visitCount } from './mockwalk'
import type { Aside, Stop } from './mockwalk'
import type { Sync } from './sync'

const XSTEP = 108
const X0 = 84
const YSTEP = 64
const Y0 = 64
const x = (i: number) => X0 + i * XSTEP
const y = (tier: number) => Y0 + tier * YSTEP

interface Slot {
  tier: number
  entry: { kind: 'node'; id: string; note?: string } | { kind: 'stage'; key: string; title: string; visits: number }
}
interface Span {
  key: string
  title: string
  tier: number // the tier its children run on
  from: number
  to: number
  asides?: Aside[]
}

function build(stops: Stop[], expanded: ReadonlySet<string>, tier: number, slots: Slot[], spans: Span[]) {
  for (const s of stops) {
    if (s.kind === 'visit') slots.push({ tier, entry: { kind: 'node', id: s.node, note: s.note } })
    else if (!expanded.has(s.key)) slots.push({ tier, entry: { kind: 'stage', key: s.key, title: s.title, visits: visitCount(s) } })
    else {
      const from = slots.length
      build(s.steps, expanded, tier + 1, slots, spans)
      spans.push({ key: s.key, title: s.title, tier: tier + 1, from, to: slots.length - 1, asides: s.asides })
    }
  }
}

export default function MetroMock({ sync }: { sync: Sync }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(['serve']))
  const toggle = (key: string) => {
    const next = new Set(expanded)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpanded(next)
  }

  const slots: Slot[] = []
  const spans: Span[] = []
  build(PLAN.stops, expanded, 0, slots, spans)
  const maxTier = Math.max(...slots.map((s) => s.tier))
  const width = x(slots.length - 1) + 140
  const height = y(maxTier) + 96
  const seen = new Set<string>()

  return (
    <div className="h-full flex flex-col" data-cand="D">
      <div className="flex-1 min-h-0 overflow-auto">
        <svg width={width} height={height} className="block">
          {/* tier strata — the same vertical-semantic-zoom reading as the atlas */}
          {Array.from({ length: maxTier + 1 }, (_, t) => (
            <g key={t}>
              <rect x={0} y={y(t) - 22} width={width} height={44} fill={t % 2 ? '#f1f5f9' : '#f8fafc'} />
              <text x={10} y={y(t) + 4} fontSize={10} fontWeight={700} fill="#94a3b8">
                tier {t}
              </text>
            </g>
          ))}

          {/* the line — one route, dipping a stratum wherever a stage is open */}
          <polyline
            points={slots.map((s, i) => `${x(i)},${y(s.tier)}`).join(' ')}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={3.5}
            strokeLinejoin="round"
          />

          {/* expanded-stage flags + aside lines */}
          {spans.map((sp) => (
            <g key={sp.key}>
              <g data-collapse={sp.key} className="cursor-pointer" onClick={() => toggle(sp.key)}>
                <text x={x(sp.from) - 14} y={y(sp.tier) - 30} fontSize={10} fontWeight={700} fill="#b45309">
                  ⊟ {sp.title}
                </text>
              </g>
              {(sp.asides ?? []).map((a) => {
                const ax0 = x(sp.from)
                const ay = y(sp.tier) + 38
                return (
                  <g key={a.title}>
                    <line x1={ax0} y1={ay} x2={x(sp.to)} y2={ay} stroke="#c4b5fd" strokeWidth={2} strokeDasharray="6 4" />
                    <text x={ax0} y={ay + 16} fontSize={9} fontWeight={600} fill="#8b5cf6">
                      ≀ {a.title} — related, runs beside, never joins
                    </text>
                    {a.steps.map((st, j) => {
                      const ax = ax0 + ((j + 1) * (x(sp.to) - ax0)) / (a.steps.length + 1)
                      return (
                        <g key={st.node} {...sync.bind(st.node)} data-node={st.node}>
                          <circle cx={ax} cy={ay} r={4.5} fill="#fff" stroke="#8b5cf6" strokeWidth={2} />
                          {sync.lit(st.node) && <circle cx={ax} cy={ay} r={8.5} fill="none" stroke="#38bdf8" strokeWidth={2} />}
                          <text x={ax + 7} y={ay - 6} fontSize={8.5} fill="#8b5cf6">
                            {byId.get(st.node)!.title}
                          </text>
                        </g>
                      )
                    })}
                  </g>
                )
              })}
            </g>
          ))}

          {/* stations */}
          {slots.map((s, i) => {
            const px = x(i)
            const py = y(s.tier)
            if (s.entry.kind === 'stage') {
              const e = s.entry
              return (
                <g key={`${i}-${e.key}`} data-expand={e.key} className="cursor-pointer" onClick={() => toggle(e.key)}>
                  <rect x={px - 7} y={py - 7} width={14} height={14} transform={`rotate(45 ${px} ${py})`} fill="#fef3c7" stroke="#f59e0b" strokeWidth={2.5} />
                  <text x={px + 6} y={py - 14} fontSize={9.5} fontWeight={700} fill="#b45309" transform={`rotate(-33 ${px + 6} ${py - 14})`}>
                    ⊞ {e.title} ({e.visits})
                  </text>
                </g>
              )
            }
            const e = s.entry
            const revisit = seen.has(e.id)
            seen.add(e.id)
            const color = DOMAIN_COLOR[domainOf(e.id)]
            return (
              <g key={`${i}-${e.id}`} {...sync.bind(e.id)} data-node={e.id}>
                <circle cx={px} cy={py} r={6} fill="#fff" stroke={color} strokeWidth={2.5} />
                {revisit && <circle cx={px} cy={py} r={10} fill="none" stroke={color} strokeWidth={1.2} strokeDasharray="3 2" />}
                {sync.lit(e.id) && <circle cx={px} cy={py} r={12} fill="none" stroke="#38bdf8" strokeWidth={2.5} />}
                <text x={px + 6} y={py - 12} fontSize={9.5} fontWeight={600} fill={color} transform={`rotate(-33 ${px + 6} ${py - 12})`}>
                  {byId.get(e.id)!.title}
                  {revisit ? ' ↺' : ''}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-3 py-1 text-[10px] text-slate-400">
        {slots.length} stations on the line · diamond = collapsed stage (click to dip the line through it) · ↺ ring = revisit
        — hovering either occurrence lights both
      </div>
    </div>
  )
}
