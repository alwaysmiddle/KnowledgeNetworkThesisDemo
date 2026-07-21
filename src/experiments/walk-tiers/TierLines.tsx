// Candidate B, round 2 — TIER LINES: each tier is ONE horizontal line. Line 0
// is the plan; selecting a stage on line N reveals line N+1 (its steps), and
// selecting anything else on line N swaps out every line below. At most one
// decomposition is open per tier — the cascade always reads as a single
// drill-path, which is what makes it the flat rendering of the layer stack:
// one plane per line, one line per plane. Candidate E mounts this same
// component beside the stack, on the same state.

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import { tierCount, visitCount } from './mockwalk'
import type { Stop } from './mockwalk'
import { NodeChip } from './shared'
import type { Sync } from './sync'
import type { TierPathState } from './tierpath'

function StopCard({ stop, picked, onPick, sync }: { stop: Stop; picked: boolean; onPick(): void; sync: Sync }) {
  if (stop.kind === 'stage') {
    return (
      <button
        data-pick={stop.key}
        onClick={onPick}
        className={[
          'shrink-0 px-2.5 py-1.5 rounded-lg border-2 text-left text-[11px] font-semibold',
          picked
            ? 'border-amber-500 bg-amber-400/90 text-white shadow-sm'
            : 'border-amber-400 bg-amber-50 text-amber-800 hover:bg-amber-100',
        ].join(' ')}
      >
        {picked ? '▾' : '⊞'} {stop.title}
        <span className={['font-normal ml-1', picked ? 'text-amber-100' : 'text-amber-500'].join(' ')}>
          {visitCount(stop)} stops · {tierCount(stop)} tiers
        </span>
      </button>
    )
  }
  const color = DOMAIN_COLOR[domainOf(stop.node)]
  return (
    <button
      {...sync.bind(stop.node)}
      data-node={stop.node}
      onClick={onPick}
      title={stop.note ?? byId.get(stop.node)!.title}
      className={['shrink-0 px-2.5 py-1.5 rounded-lg border-2 bg-white text-[11px] font-semibold', sync.lit(stop.node) ? 'ring-2 ring-sky-300' : ''].join(' ')}
      style={{ borderColor: color, color }}
    >
      {byId.get(stop.node)!.title}
    </button>
  )
}

export function TierLines({ state, sync }: { state: TierPathState; sync: Sync }) {
  const { lines, path, pick } = state
  return (
    <div className="flex-1 min-h-0 overflow-auto p-3 flex flex-col gap-2.5">
      {lines.map((line, i) => (
        <div key={`${i}-${line.source}`} data-line={i} className="rounded-xl border border-slate-200 bg-white/70">
          <div className="px-2.5 pt-1.5 flex items-baseline gap-2 text-[10px]">
            <span className="font-bold text-slate-500">tier {line.tier}</span>
            <span className="text-slate-400">{i === 0 ? line.source : `↳ inside ${line.source}`}</span>
            <span className="text-slate-300">{line.stops.length} stops on this line</span>
          </div>
          <div className="px-2.5 py-2 flex items-center gap-1.5 overflow-x-auto">
            {line.stops.map((s, j) => (
              <StopCard
                key={s.kind === 'stage' ? s.key : `${j}-${s.node}`}
                stop={s}
                picked={s.kind === 'stage' && path[i] === s.key}
                onPick={() => pick(i, s)}
                sync={sync}
              />
            ))}
            {(line.asides ?? []).map((a) => (
              <span key={a.title} className="shrink-0 flex items-center gap-1.5 pl-2.5 ml-1 border-l-2 border-dashed border-violet-300">
                <span className="text-[9.5px] font-semibold text-violet-500 whitespace-nowrap">≀ {a.title} — related, not a step</span>
                {a.steps.map((st) => (
                  <NodeChip key={st.node} id={st.node} sync={sync} note={st.note} dim />
                ))}
              </span>
            ))}
          </div>
        </div>
      ))}
      {lines[lines.length - 1].stops.some((s) => s.kind === 'stage') && (
        <div className="text-[10px] text-slate-400 px-1">pick a ⊞ stage on the last line to open the next tier — picking anything else swaps the lines below it</div>
      )}
    </div>
  )
}
