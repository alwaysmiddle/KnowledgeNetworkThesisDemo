// The Walk Editor's pane-local actions (#144 — OB-036's "PaneActionBar replaces
// WalkToolbox's floating tray" half). Mounted through the Instrument registry's
// `actionBar` slot (src/studio/instruments.tsx → src/studio/StudioView.tsx's `pane()`),
// not through WalkEditorView's own render tree — that is what lets `Pane` clip the
// bar's top corners to the frame's own arc, which a plain child sitting inside the
// scroller cannot get (see PaneActionBar.prompt.md).
//
// Reads the SAME module-level draft/road stores WalkEditorView does — authordraft.ts's
// own note explains why a singleton is the right shape here — rather than receiving
// state as a prop. The two are siblings under one Pane, not parent/child.
//
// Replaces WalkToolbox.tsx (#54) whole: the FloatingPanel wrapper, its persisted rect
// and its 2-column icon-only grid are gone along with it — a docked, labelled bar has
// no drag/resize/auto-hide of its own to carry.

import { OptionalMark, PaneActionBar } from '@/ds'
import { parsePath, stopAt, useAuthorDraft, useRoad } from './authordraft'
import { chosenIdx, isFork } from './mockwalk'

export default function WalkActionBar() {
  const state = useAuthorDraft()
  const { choices, pickBranch } = useRoad()

  // #70 retired the drag-a-version-tab-out gesture that used to feed extractVariant.
  // This bar is its permanent home (#144, replacing the #70 stopgap note WalkToolbox
  // carried): with a single FORK selected, lift its ACTIVE version into its own group,
  // inserted right after the fork. `choices` (the road's view of "active") lives in
  // useRoad, not the draft, so the pick is resolved here and handed down ready.
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
    <PaneActionBar
      dense
      actions={[
        { glyph: '✦', label: 'New walk', title: 'start over with an empty slot', onClick: state.newWalk },
        { glyph: '⊙', label: 'Add node', title: 'add a node at the selection', onClick: state.addSelectionNode },
        { glyph: '⊞', label: 'Group', title: 'group the selected run', disabled: !state.canGroup, onClick: state.groupSelection },
        {
          glyph: <OptionalMark size={13} />,
          label: 'Optional',
          title: state.optionalActive ? 'make required' : 'make optional',
          selected: state.optionalActive,
          disabled: !state.canOptional,
          onClick: state.toggleOptionalSelection,
        },
        { glyph: '⏏', label: 'Extract', title: 'extract the active version into its own group', disabled: !canExtract, onClick: extractActive },
      ]}
    />
  )
}
