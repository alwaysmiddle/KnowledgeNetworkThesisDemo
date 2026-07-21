// Candidate E — LAYER STACK (the AutoCAD/Photoshop reading): every tier is a
// plane, drawn isometrically with the walk's stops sitting on its surface,
// and the ACTIVE layer is highlighted. Deliberately split into stack + desk:
// you don't edit in Photoshop's layers panel, you select there and work on
// the flat canvas — so the iso stack is the navigator (where am I in the
// tiers?) and the desk beside it is the legible working surface for the
// selected tier. The stack shows STRUCTURE (all stages open), not expansion
// state; that's its job as an orientation widget.

import { useState } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { entriesAtTier, PLAN, tierCount, visitCount } from './mockwalk'
import type { Sync } from './sync'

export default function IsoStackMock({ sync }: { sync: Sync }) {
  const tiers = Math.max(...PLAN.stops.map(tierCount))
  const [active, setActive] = useState(0)
  const rows = Array.from({ length: tiers }, (_, t) => entriesAtTier(PLAN.stops, t))

  return (
    <div className="h-full flex" data-cand="E">
      {/* the stack — tier planes in isometric projection, click to select */}
      <div className="w-[440px] shrink-0 border-r border-slate-200 relative overflow-hidden bg-slate-50/60">
        <div className="absolute left-3 top-2 text-[10px] font-bold text-slate-500">layer stack — tiers as planes, active one lit</div>
        {rows.map((entries, t) => {
          const isActive = t === active
          const spacing = entries.length > 1 ? 250 / (entries.length - 1) : 0
          return (
            <div key={t}>
              <button
                data-plane-label={t}
                onClick={() => setActive(t)}
                className={['absolute left-3 text-left text-[10px] rounded px-1.5 py-0.5 border', isActive ? 'border-sky-400 bg-sky-50 text-sky-700 font-bold' : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-100'].join(' ')}
                style={{ top: 64 + t * 86 }}
              >
                tier {t} · {entries.length}
              </button>
              <div
                data-plane={t}
                onClick={() => setActive(t)}
                className={['absolute cursor-pointer rounded-lg border-2', isActive ? 'border-sky-400 bg-white/90 shadow-lg' : 'border-slate-300 bg-white/40 opacity-60 hover:opacity-90'].join(' ')}
                style={{
                  left: 90,
                  top: 34 + t * 86,
                  width: 300,
                  height: 120,
                  transform: 'rotateX(56deg) rotateZ(-42deg)',
                }}
              >
                {/* the walk's order as a faint rail across the surface */}
                <div className="absolute left-[22px] right-[24px] top-[56px] h-0.5 bg-amber-300/70 rounded" />
                {entries.map((e, i) => {
                  const left = 20 + i * spacing
                  if (e.kind === 'stage')
                    return (
                      <div
                        key={e.key}
                        title={`${e.title} — decomposes into tier ${t + 1}`}
                        className="absolute w-3 h-3 bg-amber-300 border-2 border-amber-500 rotate-45"
                        style={{ left, top: 50 }}
                      />
                    )
                  return (
                    <div
                      key={`${i}-${e.node}`}
                      {...sync.bind(e.node)}
                      title={byId.get(e.node)!.title}
                      className={['absolute w-3 h-3 rounded-full border-2 border-white', sync.lit(e.node) ? 'ring-2 ring-sky-400 scale-150' : ''].join(' ')}
                      style={{ left, top: 50, background: DOMAIN_COLOR[domainOf(e.node)] }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* the desk — the active tier, flat and legible */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="shrink-0 px-3 py-1.5 text-[10px] font-bold text-slate-500 border-b border-slate-100" data-desk-tier={active}>
          the desk — tier {active} in walk order (labels live here, flat; the planes keep only dots)
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-3">
          <div className="flex flex-col gap-1.5 max-w-[380px]">
            {rows[active].map((e, i) => {
              if (e.kind === 'stage')
                return (
                  <button
                    key={e.key}
                    data-desk-stage={e.key}
                    onClick={() => setActive(Math.min(active + 1, tiers - 1))}
                    className="text-left px-2.5 py-1.5 rounded-lg border-2 border-amber-300 bg-amber-50 text-[11px] hover:bg-amber-100"
                  >
                    <span className="font-bold text-amber-800">◇ {e.title}</span>
                    <span className="text-amber-500"> — {visitCount(e)} stops on tier {active + 1} ↓</span>
                  </button>
                )
              const color = DOMAIN_COLOR[domainOf(e.node)]
              return (
                <div
                  key={`${i}-${e.node}`}
                  {...sync.bind(e.node)}
                  data-node={e.node}
                  className={['px-2.5 py-1.5 rounded-lg border-2 bg-white text-[11px]', sync.lit(e.node) ? 'ring-2 ring-sky-300' : ''].join(' ')}
                  style={{ borderColor: color }}
                >
                  <span className="font-semibold" style={{ color }}>
                    {byId.get(e.node)!.title}
                  </span>
                  {e.note && <div className="text-[10px] text-slate-400 mt-0.5">{e.note}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
