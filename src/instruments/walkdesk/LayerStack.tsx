// The isometric layer stack (round 5's "magical component"), restored in
// round 7b on the user's verdict. One rotated plane PER OPEN COLUMN, so the
// drill-path is visible as depth; picking a diamond here opens the same
// column the ⊞ box opens below — both sides render one controlled
// stops/path/pick triple (the round-5 inversion), so they cannot disagree.
// It reads the RESOLVED road like every presentation view: forks never
// reach it, skipped optionals are already gone.

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { columnsFor } from './columns'
import type { Stop } from './mockwalk'
import type { HoverBinding } from '../../studio/bus'

const PLANE_STEP = 92
const PLANE_TOP = 44

export default function LayerStack({
  stops,
  path,
  pick,
  sync,
}: {
  stops: Stop[]
  path: string[]
  pick(col: number, s: Stop): void
  sync: HoverBinding
}) {
  const cols = columnsFor(stops, path)
  const height = PLANE_TOP + cols.length * PLANE_STEP + 96

  return (
    <div className="shrink-0 relative overflow-hidden bg-slate-50/60 border-b border-slate-200" style={{ height }}>
      <div className="absolute left-3 top-2 text-[10px] font-bold text-slate-500">
        layer stack — one plane per open column; pick on either side, both follow
      </div>
      {cols.map((line, t) => {
        const spacing = line.stops.length > 1 ? 250 / (line.stops.length - 1) : 0
        return (
          <div key={`${t}-${line.source}`}>
            <div
              className="absolute left-3 text-left text-[10px] rounded px-1.5 py-0.5 border border-slate-200 bg-white text-slate-500"
              style={{ top: 74 + t * PLANE_STEP }}
              data-plane-label={t}
            >
              tier {t} · {line.stops.length}
            </div>
            <div
              data-plane={t}
              className="absolute rounded-lg border-2 border-slate-300 bg-white/70"
              style={{ left: 92, top: PLANE_TOP + t * PLANE_STEP, width: 300, height: 122, transform: 'rotateX(56deg) rotateZ(-42deg)' }}
            >
              <div className="absolute left-[20px] right-[22px] top-[57px] h-0.5 bg-amber-300/70 rounded" />
              {line.stops.map((s, i) => {
                const left = 18 + i * spacing
                // presentation receives RESOLVED trees — forks never reach here
                if (s.kind === 'fork') return null
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
  )
}
