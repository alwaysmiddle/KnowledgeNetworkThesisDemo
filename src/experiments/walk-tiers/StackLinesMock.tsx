// Candidate E, round 3 — LAYER STACK + TIER LINES + NODE CANVAS, all on ONE
// selection state. Round 2 proved stack and lines are the same design at two
// altitudes; round 3 adds the desk the user asked for: an Obsidian-style
// canvas showing the OPEN tier (the deepest line) as cards you can drag
// around freely, with the visit order drawn as arrows between them. The
// arrangement is yours; the SEQUENCE is the walk's — rearranging cards never
// changes the route, which is route-as-projection made tactile. Clicking a
// stage card on the canvas drills into it, and stack, lines, canvas and
// fringe all follow, because there is only one TierPathState.

import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { fringe, PLAN, visitCount } from './mockwalk'
import type { Stop, TierLine } from './mockwalk'
import { FringeStrip } from './shared'
import type { Sync } from './sync'
import { TierLines } from './TierLines'
import { useTierPath } from './tierpath'
import type { TierPathState } from './tierpath'

const CARD_W = 148
const CARD_H = 46

const stopId = (s: Stop, i: number) => (s.kind === 'stage' ? s.key : `${i}.${s.node}`)

/** the open tier as an arrangeable map — positions are LOCAL decoration;
 * the arrows always draw the walk's order regardless of where cards sit */
function TierCanvas({ line, depth, state, sync }: { line: TierLine; depth: number; state: TierPathState; sync: Sync }) {
  const [pos, setPos] = useState<Record<string, { x: number; y: number }>>({})
  const drag = useRef<{ key: string; offX: number; offY: number; startX: number; startY: number; moved: boolean } | null>(null)

  const at = (s: Stop, i: number) => pos[`${depth}:${stopId(s, i)}`] ?? { x: 24 + i * 172, y: i % 2 === 0 ? 42 : 152 }

  const down = (e: ReactPointerEvent, s: Stop, i: number) => {
    const p = at(s, i)
    drag.current = {
      key: `${depth}:${stopId(s, i)}`,
      offX: e.clientX - p.x,
      offY: e.clientY - p.y,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    // a stray 1px pointermove during a click must not eat the drill gesture
    if (!d.moved && Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) < 5) return
    d.moved = true
    setPos({ ...pos, [d.key]: { x: Math.max(4, e.clientX - d.offX), y: Math.max(4, e.clientY - d.offY) } })
  }
  const up = (s: Stop) => {
    const d = drag.current
    drag.current = null
    // a clean click (no drag) on a stage card drills into it
    if (d && !d.moved && s.kind === 'stage') state.pick(depth, s)
  }

  const centers = line.stops.map((s, i) => {
    const p = at(s, i)
    return { x: p.x + CARD_W / 2, y: p.y + CARD_H / 2 }
  })

  return (
    <div
      data-canvas
      className="h-[290px] shrink-0 border-t border-slate-200 relative overflow-hidden bg-white"
      style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '18px 18px' }}
    >
      <div className="absolute left-3 top-2 text-[10px] font-bold text-slate-500 bg-white/80 rounded px-1 z-20">
        canvas — the open tier (“{line.source}”) as cards you arrange; arrows are the walk’s order, drag changes nothing
        in the route · click a ⊞ card to drill
      </div>
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <marker id="wt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#f59e0b" />
          </marker>
        </defs>
        {centers.slice(0, -1).map((c, i) => {
          const n = centers[i + 1]
          const mx = (c.x + n.x) / 2
          return (
            <path
              key={i}
              d={`M ${c.x} ${c.y} Q ${mx} ${c.y}, ${mx} ${(c.y + n.y) / 2} T ${n.x} ${n.y}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeOpacity="0.65"
              markerEnd="url(#wt-arrow)"
            />
          )
        })}
      </svg>
      {line.stops.map((s, i) => {
        const p = at(s, i)
        const key = stopId(s, i)
        if (s.kind === 'stage') {
          const picked = state.path[depth] === s.key
          return (
            <div
              key={key}
              data-card={key}
              data-canvas-pick={s.key}
              onPointerDown={(e) => down(e, s, i)}
              onPointerMove={move}
              onPointerUp={() => up(s)}
              className={[
                'absolute z-10 rounded-xl border-2 px-2 py-1.5 shadow-sm cursor-grab select-none touch-none',
                picked ? 'border-amber-500 bg-amber-400/90 text-white' : 'border-amber-400 bg-amber-50 text-amber-800 hover:shadow-md',
              ].join(' ')}
              style={{ left: p.x, top: p.y, width: CARD_W }}
            >
              <div className="text-[10.5px] font-bold truncate">⊞ {s.title}</div>
              <div className={['text-[9.5px]', picked ? 'text-amber-100' : 'text-amber-500'].join(' ')}>{visitCount(s)} stops inside</div>
            </div>
          )
        }
        const color = DOMAIN_COLOR[domainOf(s.node)]
        return (
          <div
            key={key}
            data-card={key}
            {...sync.bind(s.node)}
            onPointerDown={(e) => down(e, s, i)}
            onPointerMove={move}
            onPointerUp={() => up(s)}
            className={[
              'absolute z-10 rounded-xl border-2 bg-white px-2 py-1.5 shadow-sm cursor-grab select-none touch-none hover:shadow-md',
              sync.lit(s.node) ? 'ring-2 ring-sky-300' : '',
            ].join(' ')}
            style={{ left: p.x, top: p.y, width: CARD_W, borderColor: color }}
          >
            <div className="text-[10.5px] font-bold truncate" style={{ color }}>
              {byId.get(s.node)!.title}
            </div>
            <div className="text-[9.5px] text-slate-400">step {i + 1} of {line.stops.length}</div>
          </div>
        )
      })}
    </div>
  )
}

export default function StackLinesMock({ sync }: { sync: Sync }) {
  const state = useTierPath(['serve'])
  const { lines, path, pick } = state

  return (
    <div className="h-full flex" data-cand="E">
      {/* the stack — one plane PER LINE, so the drill-path is visible as depth */}
      <div className="w-[430px] shrink-0 border-r border-slate-200 relative overflow-hidden bg-slate-50/60">
        <div className="absolute left-3 top-2 text-[10px] font-bold text-slate-500">
          layer stack — one plane per open line; pick on any side, all follow
        </div>
        {lines.map((line, t) => {
          const spacing = line.stops.length > 1 ? 250 / (line.stops.length - 1) : 0
          return (
            <div key={`${t}-${line.source}`}>
              <div
                className="absolute left-3 text-left text-[10px] rounded px-1.5 py-0.5 border border-slate-200 bg-white text-slate-500"
                style={{ top: 74 + t * 92 }}
                data-plane-label={t}
              >
                tier {t} · {line.stops.length}
              </div>
              <div
                data-plane={t}
                className="absolute rounded-lg border-2 border-slate-300 bg-white/70"
                style={{ left: 92, top: 44 + t * 92, width: 300, height: 122, transform: 'rotateX(56deg) rotateZ(-42deg)' }}
              >
                <div className="absolute left-[20px] right-[22px] top-[57px] h-0.5 bg-amber-300/70 rounded" />
                {line.stops.map((s, i) => {
                  const left = 18 + i * spacing
                  if (s.kind === 'stage') {
                    const picked = path[t] === s.key
                    return (
                      <button
                        key={s.key}
                        data-pick-stack={s.key}
                        onClick={() => pick(t, s)}
                        title={s.title}
                        className={['absolute w-3.5 h-3.5 border-2 rotate-45', picked ? 'bg-amber-400 border-amber-600 ring-2 ring-amber-300 scale-125' : 'bg-amber-200 border-amber-500 hover:scale-125'].join(' ')}
                        style={{ left, top: 50 }}
                      />
                    )
                  }
                  return (
                    <button
                      key={`${i}-${s.node}`}
                      {...sync.bind(s.node)}
                      onClick={() => pick(t, s)}
                      title={byId.get(s.node)!.title}
                      className={['absolute w-3 h-3 rounded-full border-2 border-white', sync.lit(s.node) ? 'ring-2 ring-sky-400 scale-150' : ''].join(' ')}
                      style={{ left, top: 51, background: DOMAIN_COLOR[domainOf(s.node)] }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* the desk — the same lines flat, and the open tier as an arrangeable canvas */}
      <div className="flex-1 min-w-0 flex flex-col">
        <TierLines state={state} sync={sync} />
        <TierCanvas line={lines[lines.length - 1]} depth={lines.length - 1} state={state} sync={sync} />
        <FringeStrip entries={fringe(PLAN.stops, new Set(path))} sync={sync} />
      </div>
    </div>
  )
}
