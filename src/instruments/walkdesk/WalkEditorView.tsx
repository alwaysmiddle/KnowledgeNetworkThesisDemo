// The WALK EDITOR (#21) — the surface you WRITE the plan on, and, parallel to it,
// the flat route that plan projects to.
//
// WAS `RailroadView.tsx`, instrument id `railroad`, until 2026-08-20. The old
// name was the DRAWING — a railroad diagram — and not the job. What this is, is
// where a walk gets written. The line is kept because two dated notes in
// `src/ds/PROVENANCE.json` cite the old filename, and a dated record is not a
// thing to rewrite — it would then lie about its own moment. This is what makes
// them resolve. `tools/walk-tiers-spike/RESULTS.md` is left alone for the same
// reason: it records what was decided in July, under July's name.
// The ROAD keeps its name throughout (`AuthorRoad`, `layoutRoad`,
// `data-road-root`): the road is the drawing this editor hosts, which is a
// different noun doing a different job.
//
// One view, two lanes:
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
// resolveRoad()'s linear walk, and it IS published on bus.route (#14, closed) —
// see the effect below. The Map draws it as a path across the territory and
// Connections highlights along it.

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'

import AuthorRoad from './AuthorRoad'
import { parsePath, redoDraft, saveDraftAsWalk, stopAt, undoDraft, useAuthorDraft, useRoad } from './authordraft'
import { listWalks, subscribeWalks } from '../../model/walkstore'
import { chosenIdx, isFork, leafIds, resolveRoad } from './mockwalk'
import WalkPreview from './WalkPreview'
import WalkToolbox from './WalkToolbox'
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'
import { wrapTip } from '../../ds/chrome/IconButton'

/** the slide-in preview pane (0005 D9). It OVERLAYS the road rather than splitting
 *  the pane, so it takes no width from the layout and the road never reflows. */
const PREVIEW_W = 344

export default function WalkEditorView({ bus }: { bus: Bus }) {
  const sync = useHover(bus)
  const state = useAuthorDraft()
  const { choices, pickBranch, withOptionals, setWithOptionals } = useRoad()
  const [previewOpen, setPreviewOpen] = useState(false)

  // The walks.ts bridge (#16). Two one-row drawers under the button strip
  // rather than two floating menus: the header is `shrink-0`, so a row that
  // opens simply takes its own height and the road below reflows once — no
  // z-index, no click-outside, and nothing overlapping the plan you are naming.
  const walks = useSyncExternalStore(subscribeWalks, listWalks)
  const [naming, setNaming] = useState(false)
  const [walkName, setWalkName] = useState('')
  const [picking, setPicking] = useState(false)
  /** what the last save did, shown until the next one is started. No timer:
   *  a receipt that erases itself is a receipt you can miss. */
  const [receipt, setReceipt] = useState<string | null>(null)

  const openNaming = () => {
    setReceipt(null)
    setWalkName('')
    setPicking(false)
    setNaming(true)
  }

  const commitWalk = () => {
    const w = saveDraftAsWalk(walkName)
    setNaming(false)
    setWalkName('')
    setReceipt(
      w
        ? `saved “${w.title}” — ${w.stops.length} stops. The Trail can play it now.`
        : 'nothing on the road to save — the plan is empty, or every stop is still an unbound slot.',
    )
  }

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

  const resolved = useMemo(
    () => resolveRoad(state.stops, choices, withOptionals),
    [state.stops, choices, withOptionals],
  )

  // publish the desk's resolved walk on the bus route so the Map and
  // Connections instruments can highlight it (#14). bus.setRoute/clearRoute are
  // recreated each render, so we key the effect on the data sources directly.
  useEffect(() => {
    bus.setRoute(leafIds(resolved))
    return () => bus.clearRoute()
  }, [state.stops, choices, withOptionals]) // eslint-disable-line react-hooks/exhaustive-deps

  // #70 retired the drag-a-version-tab-out gesture that used to feed
  // extractVariant. Until it finds a real home in the UI, the Toolbox carries
  // it: with a single FORK selected, lift its ACTIVE version into its own group,
  // inserted right after the fork. `choices` (the road's view of "active") lives
  // here, not in the draft, so the pick is resolved here and handed down ready.
  const selPath = state.selected.size === 1 ? parsePath([...state.selected][0]) : null
  const selStop = selPath ? stopAt(state.stops, selPath) : undefined
  const canExtract = !!selPath && !!selStop && isFork(selStop)
  const extractActive = () => {
    if (!selPath || !selStop || !isFork(selStop)) return
    const idx = chosenIdx(selStop, choices)
    const after = [...selPath.slice(0, -1), selPath[selPath.length - 1] + 1]
    state.extractVariant(selPath, idx, after)
    // trimmed container falls back to its first remaining version (#92: by id)
    const firstRemaining = selStop.variants.filter((_, k) => k !== idx)[0]
    if (firstRemaining) pickBranch(selStop.key!, firstRemaining.id)
  }

  return (
    // DS PaneHeader.d.ts rule 2: THE PANE BODY TAKES NO BACKGROUND OF ITS OWN — the
    // pane's --surface-paper shows through. Painting canopy here started the fill
    // INSIDE the pane's 20px corner arc with square corners, biting two square
    // notches of desk colour out of the rounded top where the content starts.
    <div data-walk-editor className="h-full flex flex-col">
      <div className="shrink-0 px-2 py-1.5 border-b border-[var(--border-hair)]">
        <div className="text-[var(--fs-caption)] font-bold leading-tight" style={{ color: 'var(--text-3)' }}>
          walk editor — the road can fork and rejoin; ● picks the branch
        </div>
        {/* wraps rather than squeezes: with six controls in a pane this narrow,
            a no-wrap row shrank every button until its label broke in half. */}
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <button
            data-opt-toggle
            onClick={() => setWithOptionals(!withOptionals)}
            className="text-[var(--fs-caption)] px-1.5 py-0.5 rounded border"
            style={withOptionals
              ? { borderColor: 'var(--border-rule)', color: 'var(--text-2)', background: 'var(--surface-raised)' }
              : { borderColor: 'var(--state-optional)', color: 'var(--text-walk)', background: 'var(--accent-walk-wash)' }}
          >
            {/* NO GLYPH — `◇` is on the list of typed marks this system does not use. The
                button already says the word, so the diamond was decoration on a label that
                is explicit without it. */}
            optionals: {withOptionals ? 'on the road' : 'bypassed'}
          </button>
          <button
            data-read-walk
            onClick={() => setPreviewOpen(true)}
            title={wrapTip('read the resolved walk as chapters')}
            className="text-[var(--fs-caption)] px-1.5 py-0.5 rounded border border-[var(--border-rule)]"
            style={{ color: 'var(--text-2)', background: 'var(--surface-raised)' }}
          >
            ▶ read the walk
          </button>
          {/* #16, the two directions of the walks.ts bridge. Saving PROJECTS:
              a Walk is a flat reading order, so the road you are looking at is
              what is stored and the tiers are not. Loading COPIES a walk in as
              one stage, which is the inverse at the only grain that survives. */}
          <button
            data-save-walk
            onClick={openNaming}
            title={wrapTip('save the resolved road as a walk the rest of the app can play')}
            className="text-[var(--fs-caption)] px-1.5 py-0.5 rounded border border-[var(--border-rule)]"
            style={{ color: 'var(--text-2)', background: 'var(--surface-raised)' }}
          >
            ⤓ save as walk
          </button>
          <button
            data-add-walk
            onClick={() => {
              setNaming(false)
              setPicking(!picking)
            }}
            title={wrapTip('drop an existing walk into the plan as one stage')}
            className="text-[var(--fs-caption)] px-1.5 py-0.5 rounded border"
            style={picking
              ? { borderColor: 'var(--border-rule)', color: 'var(--text-1)', background: 'var(--surface-sunken)' }
              : { borderColor: 'var(--border-rule)', color: 'var(--text-2)', background: 'var(--surface-raised)' }}
          >
            ⤒ add a walk
          </button>
          <div className="ml-auto flex items-center gap-1">
            <button
              data-undo
              disabled={!state.canUndo}
              onClick={state.undo}
              title={wrapTip('undo (Ctrl/Cmd+Z)')}
              className="text-[var(--fs-caption)] px-1.5 py-0.5 rounded border border-[var(--border-rule)] disabled:opacity-30"
              style={{ color: 'var(--text-2)', background: 'var(--surface-raised)' }}
            >
              ↶ undo
            </button>
            <button
              data-redo
              disabled={!state.canRedo}
              onClick={state.redo}
              title={wrapTip('redo (Ctrl/Cmd+Shift+Z)')}
              className="text-[var(--fs-caption)] px-1.5 py-0.5 rounded border border-[var(--border-rule)] disabled:opacity-30"
              style={{ color: 'var(--text-2)', background: 'var(--surface-raised)' }}
            >
              ↷ redo
            </button>
          </div>
        </div>

        {naming && (
          <div data-name-walk className="mt-1 flex items-center gap-1">
            <input
              autoFocus
              value={walkName}
              placeholder="name this walk"
              onChange={(e) => setWalkName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitWalk()
                if (e.key === 'Escape') setNaming(false)
              }}
              className="flex-1 min-w-0 text-[var(--fs-caption)] px-1.5 py-0.5 rounded border border-[var(--border-rule)]"
              style={{ color: 'var(--text-1)', background: 'var(--surface-paper)' }}
            />
            <button
              data-name-walk-save
              onClick={commitWalk}
              className="text-[var(--fs-caption)] px-1.5 py-0.5 rounded border border-[var(--border-rule)]"
              style={{ color: 'var(--text-2)', background: 'var(--surface-raised)' }}
            >
              save
            </button>
            <button
              onClick={() => setNaming(false)}
              title={wrapTip('back to the road')}
              className="text-[var(--fs-caption)] px-1.5 py-0.5"
              style={{ color: 'var(--text-3)' }}
            >
              ✕
            </button>
          </div>
        )}

        {receipt && (
          <div data-walk-receipt className="mt-1 text-[var(--fs-caption)]" style={{ color: 'var(--text-3)' }}>
            {receipt}
          </div>
        )}

        {picking && (
          <div data-walk-picker className="mt-1 flex flex-wrap gap-1">
            {walks.map((w) => (
              <button
                key={w.id}
                onClick={() => {
                  state.insertWalkAsStage(w.id)
                  setPicking(false)
                }}
                title={wrapTip(w.description || `${w.stops.length} stops`)}
                className="text-[var(--fs-caption)] px-1.5 py-0.5 rounded border border-[var(--border-rule)] max-w-full truncate"
                style={{ color: 'var(--text-2)', background: 'var(--surface-raised)' }}
              >
                {w.title}
                <span className="ml-1" style={{ color: 'var(--text-3)' }}>{w.stops.length}</span>
              </button>
            ))}
          </div>
        )}
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
            onLeafFocus={(id) => bus.setFocus(id, 'desk')}
          />
        </div>

        {/* The floating toolbox (#54) rides ON the road: absolute inside this
            relative host, after the road so it paints above it, before the
            preview so reading the walk (z-20) covers it. */}
        <WalkToolbox state={state} canExtract={canExtract} onExtract={extractActive} />

        {/* clicking the faded road dismisses the preview */}
        {previewOpen && <div className="absolute inset-0 z-10" onClick={() => setPreviewOpen(false)} />}

        <div
          data-walk-preview
          className="absolute inset-y-0 right-0 z-20 flex flex-col border-l transition-transform ease-out"
          style={{
            background: 'var(--surface-paper)',
            borderColor: 'var(--border-rule)',
            boxShadow: 'var(--lift-3)',
            width: PREVIEW_W,
            transform: previewOpen ? 'translateX(0)' : `translateX(${PREVIEW_W}px)`,
            transitionDuration: previewOpen ? '280ms' : '200ms',
          }}
        >
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-[var(--border-hair)]">
            <span className="text-[var(--fs-caption)] font-bold uppercase tracking-wide" style={{ color: 'var(--text-3)', letterSpacing: 'var(--ls-caps)' }}>the walk</span>
            <button
              data-preview-close
              onClick={() => setPreviewOpen(false)}
              title={wrapTip('back to the road')}
              className="text-[var(--fs-body)] leading-none"
              style={{ color: 'var(--text-3)' }}
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
