import { describe, expect, it } from 'vitest'

import { Bullet, CARET_INK, Caret, CaretStack, CHIP_METRICS, Check, ChipGeometry, EdgeDash, EdgeEntry, EdgeLegend, Grip, IconButton, LeafMark, NESTING, NodeRail, OptionalSuffix, PlayToggle, RailStop, RestoreMark, StopTitle, WalkParts, WalkPinHover, chipSpec, segmentWalked, usedStroke, walkEase, walkHoverStyle } from '@/ds'

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

  // OB-041 (#129) turned four private style-getters into drawn components so a
  // caller has nothing left to spread (the border-longhand trap). Each mark's
  // only renderer is still inside src/ds itself — TreeRow places Caret,
  // InstrumentRow places Bullet, VersionedGroup places Check and RestoreMark —
  // so none has an app-code importer of its own, same position as Grip above.
  it('Caret / Bullet / Check / RestoreMark — drawn marks, placed only from inside src/ds', () => {
    expect(typeof Caret).toBe('function')
    expect(typeof Bullet).toBe('function')
    expect(typeof Check).toBe('function')
    expect(typeof RestoreMark).toBe('function')
  })

  // NESTING is a number, not a component — grouped here anyway since it crossed
  // the boundary in the same obligation and for the same reason: TreeRow is the
  // reference for nesting, and no app code needs the raw constant yet.
  it('NESTING — the system nesting step; TreeRow and InstrumentGroup are its only readers so far', () => {
    expect(NESTING).toBe(16)
  })

  // OB-052 (#141) — CARET_INK crossed the barrel for the same reason NESTING did:
  // NodeRail's `UP` needed the same ink offset TreeRow's `caretStyle` cancels, so
  // the number is now public rather than a second hand-typed literal. Both
  // consumers are inside src/ds; no app code needs the raw constant yet.
  it('CARET_INK — the caret glyph ink offset; TreeRow and NodeRail are its only readers so far', () => {
    expect(CARET_INK).toBe(0.964)
  })

  // OB-063 (#154's caret question, split into design-sync's OB-063): the nesting pair
  // as an element, replacing NodeRail's hand-rolled stack-of-two-Carets-plus-inline-UP —
  // exactly the shape that let CARET_INK above drift once already. NodeRail is its only
  // reader so far; no app code needs it directly yet.
  it('CaretStack — the expand-all/collapse-all nesting pair, drawn as one element', () => {
    expect(typeof CaretStack).toBe('function')
  })

  // OB-048 (#141) — chipSizeOf is the call a board actually wants and AuthorRoad's
  // leafSize now imports it from here. These four crossed the barrel alongside it
  // per the same obligation but have no direct app importer yet: CHIP_METRICS and
  // usedStroke are read from inside chipSize itself, chipSpec is chipSizeOf's own
  // first step, and ChipGeometry is the DS's bundled reachable-from-window form.
  it('CHIP_METRICS / chipSpec / usedStroke / ChipGeometry — exported with chipSizeOf; no direct app importer yet', () => {
    expect(typeof CHIP_METRICS).toBe('object')
    expect(typeof chipSpec).toBe('function')
    expect(typeof usedStroke).toBe('function')
    expect(typeof ChipGeometry).toBe('object')
  })

  // #246 (OB-130/131/133) — the walk dock arc. WalkDock, WalkPreview and
  // previewAnchor are adopted (MapView). #247 (OB-132) adopted the rest of the
  // band: `walkBand` (MapView's pins), `walkArrow` and WALK_ARROW_DEFAULTS
  // (model/walkarrow.ts), `walkAdvance` (walkdesk/playback.ts's clock). These
  // cross the barrel with them and have no app importer of their own: the
  // WalkParts pieces are read by WalkStrip and WalkDock from inside src/ds;
  // WalkPinHover is the DS's HTML-pin wrapper and our pins are SVG `<g>`s, which
  // bind the same two lines themselves; `segmentWalked` and `walkEase` are read by
  // `walkArrow` and `walkAdvance` from inside src/ds.
  it('WalkParts pieces — read by WalkStrip and WalkDock from inside src/ds; no app importer', () => {
    expect(typeof StopTitle).toBe('function')
    expect(typeof PlayToggle).toBe('function')
    expect(typeof OptionalSuffix).toBe('function')
    expect(typeof walkHoverStyle).toBe('function')
    expect(typeof WalkParts).toBe('object')
  })

  it('WalkPinHover — for HTML pins; the map binds the recipe on its SVG pins itself', () => {
    expect(typeof WalkPinHover).toBe('function')
  })

  it('segmentWalked / walkEase — read by walkArrow and walkAdvance from inside src/ds', () => {
    expect(typeof segmentWalked).toBe('function')
    expect(typeof walkEase).toBe('function')
  })

  // `nestedFamilyPaint` / `familySlots` / `FAMILY_SLOTS` are NOT listed here because
  // they are ADOPTED: src/model/color.ts feeds the map's territory fill through them
  // (OB-119, #250, 2026-09-05). History worth keeping: the OLD nestedFamilyPaint (a
  // per-node paint keyed on sibling index and depth, OB-086) was deleted by #221 on
  // 2026-08-28 for a measured reason — 94 distinct colours across 711 bordering
  // regions. The DS REWROTE it: the input is now a slot from familySlots(), which
  // the host feeds with real geometric adjacency, so the objection no longer holds.
})
