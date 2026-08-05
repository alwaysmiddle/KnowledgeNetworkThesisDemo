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
import { redoDraft, undoDraft, useAuthorDraft, useRoad } from './authordraft'
import { resolveRoad } from './mockwalk'
import WalkPreview from './WalkPreview'
import WalkToolbox from './WalkToolbox'
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'

/** the slide-in preview pane (0005 D9). It OVERLAYS the road rather than splitting
 *  the pane, so it takes no width from the layout and the road never reflows. */
const PREVIEW_W = 344

export default function RailroadView({ bus }: { bus: Bus }) {
  const sync = useHover(bus)
  const state = useAuthorDraft()
  const { choices, pickBranch, withOptionals, setWithOptionals } = useRoad()
  const [previewOpen, setPreviewOpen] = useState(false)

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
            data-read-walk
            onClick={() => setPreviewOpen(true)}
            title="read the resolved walk as chapters"
            className="text-[10px] px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 bg-white hover:bg-slate-50"
          >
            ▶ read the walk
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

      {/* The road, and the walk you slide in over it. The preview OVERLAYS rather
          than splits (D9): the road keeps its full width and never reflows, it only
          fades to 30% behind the pane. Dismiss and you are back on exactly the road
          you left. overflow-hidden clips the pane while it sits off to the right. */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div
          className="h-full flex flex-col transition-opacity ease-out"
          style={{ opacity: previewOpen ? 0.3 : 1, transitionDuration: previewOpen ? '280ms' : '200ms' }}
        >
          <AuthorRoad
            state={state}
            sync={sync}
            choices={choices}
            pickBranch={pickBranch}
            withOptionals={withOptionals}
          />
        </div>

        {/* The floating toolbox (#54) rides ON the road: absolute inside this
            relative host, after the road so it paints above it, before the
            preview so reading the walk (z-20) covers it. */}
        <WalkToolbox state={state} />

        {/* clicking the faded road dismisses the preview */}
        {previewOpen && <div className="absolute inset-0 z-10" onClick={() => setPreviewOpen(false)} />}

        <div
          data-walk-preview
          className="absolute inset-y-0 right-0 z-20 flex flex-col bg-white border-l border-slate-200 shadow-xl transition-transform ease-out"
          style={{
            width: PREVIEW_W,
            transform: previewOpen ? 'translateX(0)' : `translateX(${PREVIEW_W}px)`,
            transitionDuration: previewOpen ? '280ms' : '200ms',
          }}
        >
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-100">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">the walk</span>
            <button
              data-preview-close
              onClick={() => setPreviewOpen(false)}
              title="back to the road"
              className="text-[13px] leading-none text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 min-h-0">
            <WalkPreview walk={resolved} />
          </div>
        </div>
      </div>
    </div>
  )
}
