// The Walk Editor Toolbox (#54) — a floating tray of the authoring actions
// that don't belong to any one node: start a walk, drop a node, group a run,
// mark it optional, and (temporarily, #70) extract a version. It is the visible,
// keyboard-free twin of the road's shortcuts and its sticky selection strip.
//
// The ⏏ EXTRACT button is a stopgap home (#70): retiring the comparator columns
// removed the drag-a-version-tab-out gesture that fed extractVariant, so the
// capability rides here until it earns a real place in the card UI. It needs the
// ACTIVE version, which is the road's `choices` — resolved in RailroadView and
// passed down as onExtract/canExtract, so this tray stays choices-free.
//
// Every bit of panel BEHAVIOUR — drag by the title or the bottom move-grip,
// resize from any edge, fade when the pointer leaves the road or goes idle,
// remember where you left it, wear its "Toolbox" title as a legend in its top
// border — comes from FloatingPanel (#76); this file only fills the tray. So
// #54's visibility / repositioning / resizing / last-state / title-on-border
// checkboxes are all satisfied by MOUNTING the panel, not by code here.
//
// The buttons are DS PillButtons (#64): hover highlight and `title` alt tags for
// free, and `selected` gives "make optional" its pressed look when the selection
// is already optional. Two of the four map to existing draft ops (groupSelection,
// toggleOptionalSelection); newWalk and addSelectionNode were added for this tray.

import { PillButton } from '@/ds'
import { FloatingPanel } from '@/ui/FloatingPanel'

import type { AuthorState } from './authordraft'

/** top-left by default (#54), a hair in from the road's edge — but BELOW the
 *  road's own sticky selection strip (AuthorRoad, `sticky top-0 z-40`, ~30px),
 *  so the toolbox's legend title clears it instead of hiding under it. The strip
 *  is sticky, so it owns the top ~30px at every scroll offset; 40 sits clear. */
const DEFAULT_RECT = { x: 8, y: 40, w: 152, h: 150 }

export default function WalkToolbox({
  state,
  canExtract,
  onExtract,
}: {
  state: AuthorState
  canExtract: boolean
  onExtract(): void
}) {
  return (
    <FloatingPanel id="walk-toolbox" title="Toolbox" defaultRect={DEFAULT_RECT} minWidth={132} minHeight={120} autoHide>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 'var(--space-2)',
          padding: 'var(--space-2)',
        }}
      >
        {/* top-left → bottom-right, in the order #54 lists them */}
        <PillButton size="sm" glyph="✦" title="new walk — start over with an empty slot" onClick={state.newWalk} />
        <PillButton size="sm" glyph="⊙" title="add a node at the selection" onClick={state.addSelectionNode} />
        <PillButton size="sm" glyph="⊞" title="group the selected run" disabled={!state.canGroup} onClick={state.groupSelection} />
        <PillButton
          size="sm"
          glyph="◇"
          title={state.optionalActive ? 'make required' : 'make optional'}
          selected={state.optionalActive}
          disabled={!state.canOptional}
          onClick={state.toggleOptionalSelection}
        />
        {/* #70 stopgap: lift the selected fork's active version into its own
            group. Enabled only when a single fork is selected. */}
        <PillButton
          size="sm"
          glyph="⏏"
          title="extract the active version into its own group"
          disabled={!canExtract}
          onClick={onExtract}
        />
      </div>
    </FloatingPanel>
  )
}
