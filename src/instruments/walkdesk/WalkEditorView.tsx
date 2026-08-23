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
// One view, one lane that ever branches:
//
//   the ROAD is the only view in the Studio that ever sees a branch. Forks fan
//   out into labelled lanes that rejoin below, optionals wear a bypass rail, and
//   the choice of which lane is "the road" lives here too, because it is an
//   authoring decision until a presentation surface reads the result.
//
//   the road's RECEIPT — resolveRoad() with the branch picked and the skipped
//   optionals dropped — is not a permanent second lane. It is the WalkPreview
//   slide-in below (0005 D9): opened on demand, overlaying the road rather than
//   splitting the pane. An always-visible receipt beside the road was tried and
//   retired (`ce08f09`); whether one comes back, and in what shape, is #27.
//
// It shares ONE draft with the palette (its own instrument since #21) through
// the module-level stores in authordraft.ts — see the note there for why a
// singleton is the right shape. Everything downstream still receives
// resolveRoad()'s linear walk (now shared as presented.ts's usePresentedRoad,
// so Walk·Columns/Walk·Stack/Walk·Viewer resolve the same draft the same way),
// and it IS published on bus.route (#14, closed) via usePublishPresentedRoute.
// The Map draws it as a path across the territory and Connections highlights
// along it.

import { useEffect, useState, useSyncExternalStore } from 'react'

import AuthorRoad from './AuthorRoad'
import { redoDraft, saveDraftAsWalk, undoDraft, useAuthorDraft, useRoad } from './authordraft'
import { listWalks, subscribeWalks } from '../../model/walkstore'
import { usePresentedRoad, usePublishPresentedRoute } from './presented'
import WalkPreview from './WalkPreview'
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'
import { IconButton, Toolbar, wrapTip } from '@/ds'
import type { ToolbarItemSpec } from '@/ds'

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

  const resolved = usePresentedRoad()
  usePublishPresentedRoute(bus, resolved)

  // The road's own controls — DS Toolbar (#154's follow-up), replacing a
  // hand-rolled <button> row of the same four actions. Undo/redo dropped from
  // here: AppToolbar already wires them to the same undoDraft/redoDraft
  // (it's the sole undo/redo home now, app-level and always on screen), so a
  // second pair here was a duplicate control, not a second capability.
  const roadItems: ToolbarItemSpec[] = [
    {
      label: withOptionals ? 'optionals: on the road' : 'optionals: bypassed',
      on: !withOptionals,
      tone: 'walk',
      onClick: () => setWithOptionals(!withOptionals),
    },
    {
      glyph: '▶',
      label: 'read the walk',
      title: 'read the resolved walk as chapters',
      onClick: () => setPreviewOpen(true),
    },
    {
      glyph: '⤓',
      label: 'save as walk',
      title: 'save the resolved road as a walk the rest of the app can play',
      onClick: openNaming,
    },
    {
      glyph: '⤒',
      label: 'add a walk',
      title: 'drop an existing walk into the plan as one stage',
      on: picking,
      tone: 'walk',
      onClick: () => {
        setNaming(false)
        setPicking(!picking)
      },
    },
  ]

  return (
    // DS PaneHeader.d.ts rule 2: THE PANE BODY TAKES NO BACKGROUND OF ITS OWN — the
    // pane's --surface-paper shows through. Painting canopy here started the fill
    // INSIDE the pane's 20px corner arc with square corners, biting two square
    // notches of desk colour out of the rounded top where the content starts.
    <div data-walk-editor className="h-full flex flex-col">
      <div className="shrink-0">
        <div className="px-2 pt-1.5 pb-1 text-[var(--fs-caption)] font-bold leading-tight" style={{ color: 'var(--text-3)' }}>
          walk editor — the road can fork and rejoin; ● picks the branch
        </div>

        <Toolbar groups={[{ items: roadItems }]} />

        {naming && (
          <div data-name-walk className="px-2 py-1 flex items-center gap-1">
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
            <IconButton onClick={() => setNaming(false)} title="back to the road" />
          </div>
        )}

        {receipt && (
          <div data-walk-receipt className="px-2 py-1 text-[var(--fs-caption)]" style={{ color: 'var(--text-3)' }}>
            {receipt}
          </div>
        )}

        {picking && (
          <div data-walk-picker className="px-2 py-1 flex flex-wrap gap-1">
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
            <IconButton onClick={() => setPreviewOpen(false)} title="back to the road" />
          </div>
          <div className="flex-1 min-h-0">
            <WalkPreview walk={resolved} />
          </div>
        </div>
      </div>
    </div>
  )
}
