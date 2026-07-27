// The Railroad (#21) — the surface you WRITE the plan on, and, parallel to it,
// the flat route that plan projects to. One view, two lanes:
//
//   the ROAD is the only view in the Studio that ever sees a branch. Forks fan
//   out into labelled lanes that rejoin below, optionals wear a bypass rail, and
//   the choice of which lane is "the road" lives here too, because it is an
//   authoring decision until a presentation surface reads the result.
//
//   the RAIL beside it is the receipt — resolveRoad() with the branch picked and
//   the skipped optionals dropped, running top-down in the same direction as the
//   road. It used to be a wrapping strip along the bottom of the desk, where you
//   had to translate between a vertical drawing and a horizontal reading. Side by
//   side, a fork above and its surviving stops below line up by eye.
//
// The rail's side is a toggle rather than a constant: which side reads as
// "downstream" depends on where the pane sits in the composition, and that is
// the user's arrangement, not ours. `order` does the swap, so the DOM order is
// stable and the rail is never remounted by flipping it.
//
// It shares ONE draft with the palette (its own instrument since #21) through
// the module-level stores in authordraft.ts — see the note there for why a
// singleton is the right shape. Everything downstream still receives
// resolveRoad()'s linear walk; publishing it on bus.route is #14.

import { useEffect, useState } from 'react'

import AuthorRoad from './AuthorRoad'
import { allKeysOf, redoDraft, undoDraft, useAuthorDraft, useRoad } from './authordraft'
import { fringe, resolveRoad } from './mockwalk'
import { FringeRail } from './shared'
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'

/** wide enough for a chip plus its step number; the title truncates past that */
const RAIL_W = 186

export default function RailroadView({ bus }: { bus: Bus }) {
  const sync = useHover(bus)
  const state = useAuthorDraft()
  const { choices, pickBranch, withOptionals, setWithOptionals } = useRoad()
  const [railRight, setRailRight] = useState(true)

  // Undo / redo shortcuts (#34). Global so they work wherever focus sits ON the
  // road — but bail inside a text field so a rename keeps its own native undo,
  // and Cmd-Z there edits the word, not the whole tree. undo/redo are stable
  // module-level fns, so this binds once.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea, select') || t.isContentEditable)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault()
        undoDraft()
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault()
        redoDraft()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const resolved = resolveRoad(state.stops, choices, withOptionals)

  return (
    <div data-railroad className="h-full flex flex-col bg-slate-50/50">
      <div className="shrink-0 px-2 py-1.5 border-b border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 leading-tight">
          railroad — the road can fork and rejoin; ● picks the branch
        </div>
        <div className="mt-1 flex items-center gap-1">
          <button
            data-opt-toggle
            onClick={() => setWithOptionals(!withOptionals)}
            className={[
              'text-[10px] px-1.5 py-0.5 rounded border',
              withOptionals
                ? 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50'
                : 'border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100',
            ].join(' ')}
          >
            ◇ optionals: {withOptionals ? 'on the road' : 'bypassed'}
          </button>
          <button
            data-rail-side={railRight ? 'right' : 'left'}
            onClick={() => setRailRight(!railRight)}
            title="which side the projected route runs down"
            className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 bg-white hover:bg-slate-50"
          >
            route {railRight ? '→ right' : '← left'}
          </button>
          <div className="ml-auto flex items-center gap-1">
            <button
              data-undo
              disabled={!state.canUndo}
              onClick={state.undo}
              title="undo (Ctrl/Cmd+Z)"
              className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-30"
            >
              ↶ undo
            </button>
            <button
              data-redo
              disabled={!state.canRedo}
              onClick={state.redo}
              title="redo (Ctrl/Cmd+Shift+Z)"
              className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-30"
            >
              ↷ redo
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col" style={{ order: railRight ? 0 : 1 }}>
          <AuthorRoad
            state={state}
            sync={sync}
            choices={choices}
            pickBranch={pickBranch}
            withOptionals={withOptionals}
          />
        </div>
        <div
          data-fringe-rail
          className={[
            'shrink-0 min-h-0 border-slate-200',
            railRight ? 'border-l' : 'border-r',
          ].join(' ')}
          style={{ order: railRight ? 1 : 0, width: RAIL_W }}
        >
          <FringeRail entries={fringe(resolved, allKeysOf(resolved))} sync={sync} />
        </div>
      </div>
    </div>
  )
}
