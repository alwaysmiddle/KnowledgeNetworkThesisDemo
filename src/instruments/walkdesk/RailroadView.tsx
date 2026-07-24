// The Railroad as its own instrument (#21) — the surface you WRITE the plan on,
// pulled out of the Walk·Desk so it can stand as a tall narrow slice of its own.
// It is the only view in the Studio that ever sees a branch: forks fan out into
// labelled lanes that rejoin below, optionals wear a bypass rail, and the choice
// of which lane is "the road" lives here too, because it is an authoring
// decision until a presentation surface reads the result.
//
// It shares ONE draft with the palette (Walk·Desk) through the module-level
// stores in authordraft.ts — see the note there for why a singleton is the right
// shape. Everything downstream still receives resolveRoad()'s linear walk.

import AuthorRoad from './AuthorRoad'
import { useAuthorDraft, useRoad } from './authordraft'
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'

export default function RailroadView({ bus }: { bus: Bus }) {
  const sync = useHover(bus)
  const state = useAuthorDraft()
  const { choices, pickBranch, withOptionals, setWithOptionals } = useRoad()

  return (
    <div data-railroad className="h-full flex flex-col bg-slate-50/50">
      <div className="shrink-0 px-2 py-1.5 border-b border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 leading-tight">
          railroad — the road can fork and rejoin; ● picks the branch
        </div>
        <button
          data-opt-toggle
          onClick={() => setWithOptionals(!withOptionals)}
          className={[
            'mt-1 text-[10px] px-1.5 py-0.5 rounded border',
            withOptionals
              ? 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50'
              : 'border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100',
          ].join(' ')}
        >
          ◇ optionals: {withOptionals ? 'on the road' : 'bypassed'}
        </button>
      </div>
      <AuthorRoad
        state={state}
        sync={sync}
        choices={choices}
        pickBranch={pickBranch}
        withOptionals={withOptionals}
      />
    </div>
  )
}
