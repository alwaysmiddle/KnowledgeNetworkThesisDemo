import { describe, expect, it } from 'vitest'

import { EdgeDash, EdgeEntry, EdgeLegend, Grip, IconButton, LeafMark, NodeRail, RailStop } from '@/ds'

// These components are exported from @/ds but have no direct importer outside
// src/ds/ — ported, but not yet adopted by the app. The list is explicit here
// so that consuming one, or adding a new unconsumed port, requires a deliberate
// edit rather than a quiet audit miss.
//
// To adopt one: import it from '@/ds' in app code and remove it from these
// imports. To add a new unconsumed port: import it here and note why it waits.
//
// Not listed (rendered, but only via a parent DS component):
//   NodeChain  — inside VersionedGroup (consumed by AuthorRoad)
//   BinMark    — inside PresetButton (consumed by StudioView)
//
// GRADUATED — kept here as history so nobody re-adds them:
//   NodeArrow  — was "inside NodeChain". It is now imported DIRECTLY by app code
//                (AuthorRoad.tsx:35), which passes it `joins` so each shaft takes
//                the border weight of what it connects. #109.
//
// A caveat on NodeChain worth having in writing, because the line above is true
// and still misleading. VersionedGroup does import and render it — but only in
// its DEFAULT body, and our only host renders the card in `bodySlot` mode, where
// the caller owns the contents. So that branch is reachable and never reached:
// nothing on any screen draws a NodeChain today. #109 decided to keep it anyway
// — the road applies the same connector rule from the same source (`chipBorder`,
// `shaftFor`, `VersionedGroup.joinBorder`) rather than duplicating its code, so
// the component is the statement of a rule the road is checked against, and the
// DS is still landing work in it. Retiring it stays cheap if that changes.
describe('ported but not adopted DS components', () => {
  it('EdgeLegend — waiting on #69 (strokes + key must re-tint together)', () => {
    expect(typeof EdgeLegend).toBe('function')
  })

  it('EdgeDash — waiting on #69 (used inside EdgeLegend only)', () => {
    expect(typeof EdgeDash).toBe('function')
  })

  // #87 is CLOSED — it asked for the port, and the port landed (#112 verified the
  // file exists). What is still open is ADOPTION: nothing renders it, and the
  // connections rail that would is the remaining half of #97.
  it('EdgeEntry — ported (#87 closed); no host yet, tracked on #97', () => {
    expect(typeof EdgeEntry).toBe('function')
  })

  // #127 shipped this port (OB-037 for NodeChip's disclosure mark, OB-038 for the rail
  // itself — which also folds in OB-019 and OB-020, both satisfied by construction).
  // What is still open is ADOPTION: nothing renders it, and the connections rail that
  // would is the remaining half of #97 — the same wait EdgeEntry is in, just above.
  it('NodeRail / RailStop — ported (#127); no host yet, tracked on #97', () => {
    expect(typeof NodeRail).toBe('function')
    expect(typeof RailStop).toBe('function')
  })

  // #89 is CLOSED — it was blocked on an asset channel for leaf-mask.png, and that
  // is resolved (the mask ships, and #112 verified LeafMark points at it). No
  // screen has chosen to draw the mark yet, which is a design call, not a blocker.
  it('LeafMark — ported and unblocked (#89 closed); no screen draws it yet', () => {
    expect(typeof LeafMark).toBe('function')
  })

  // OB-039 (#126) named both of these as exactly the gap this file exists to catch:
  // "Pane, PaneScroller and IconButton all became unconsumed exports the day after
  // this file was written and none was added." Pane/PaneScroller are adopted as of
  // #126 (StudioView, FloatingPanel, AuthorRoad, most instruments); IconButton is
  // still only rendered from inside other DS components (PaneHeader's close
  // control, VersionedGroup's fold/ungroup, NodeRail's expand/collapse acts) and
  // has no app-code importer of its own. Grip is new in #126 and in the same
  // position — Pane and PaneHeader place it, and no host file should render it
  // directly (its own docblock says so).
  it('IconButton — no app-code importer; rendered only from inside other DS components', () => {
    expect(typeof IconButton).toBe('function')
  })

  it('Grip — ported (#126); Pane/PaneHeader place it, no direct app importer', () => {
    expect(typeof Grip).toBe('function')
  })
})
