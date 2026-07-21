# Walk-Tiers Spike Results — 2026-07-20

Issue: alwaysmiddle/KnowledgeNetworkDemo#11 (multi-tiered walk view).

**Environment.** Windows 11. `tsc -b` clean, `eslint .` clean.
`node tools/walk-tiers-spike/shots.mjs` (spawns its own vite on :5201) — exit 0,
all assertions green, no `pageerror`/console-error events. Frames in `out/`.

**What was built**, all under `src/experiments/walk-tiers/` plus a spike gate
in `main.tsx` (`?spike=walk-tiers` renders the gallery INSTEAD of the app —
the Studio, the bus, WalkView, walks.ts are untouched):

| file | purpose |
|---|---|
| `mockwalk.ts` | the tiered walk model + ONE mock plan packing every hard case: 4 tiers, a sub-walk by reference (stage built from the authored `transistor-to-program` walk), a revisit (`stk-tcp-udp` twice), an aside lane, mixed grain. Plus `fringe()` — the route-as-projection helper |
| `sync.ts` | local stand-in for the bus hover channel, same `bind()`/`data-lit` contract |
| `shared.tsx` | node chip, projected-route strip, KnowledgePanel stand-in |
| `ColumnsMock.tsx` | A — expanding columns + 3-tier altitude window + dive |
| `RibbonMock.tsx` | B — tiered ribbon (icicle) + same window/dive |
| `OutlineFringeMock.tsx` | C — outline rail + fringe lane |
| `MetroMock.tsx` | D — metro line as elevation profile over tier strata |
| `IsoStackMock.tsx` | E — isometric layer stack (navigator) + flat desk |

## Verified by the driver

- Expanding a stage **changes the projected route** (`data-fringe-count` moves) —
  route-as-projection works; the data never changes.
- Opening a 4th-tier stage in A and B **dives with a breadcrumb** instead of
  expanding inline — the altitude window holds.
- Hover lights the **doc pane stand-in** (`data-doc`), not a tooltip — no
  candidate has a private preview.
- Hovering one occurrence of the revisited node in D lights **both** stations —
  the id-keyed hover contract gives revisit linking for free.

## Per-candidate observations (from the frames)

**A · Expanding columns** (`a-open`, `a-dive`). Familiar grammar, and the
nested group borders read well at 2 tiers. But one opened stage dominates the
row and pushes tier-0 siblings off-screen — the columns' horizontal appetite
is the weakness the window can't fix. The aside as an in-group side rail works.

**B · Tiered ribbon** (`b-open`, `b-dive`). The strongest single frame: stage
bar spanning exactly its children, the collapsed `⊞ The primitives underneath`
sitting inline at tier 2, the aside as a dashed annex row, and the bottom edge
visibly matching the projected-route strip below it — the "collapse is a
summary, not a deletion" reading lands. Flaw: collapsed tier-0 stages render as
full-height columns rather than shallow bars, so "unopened" reads heavier than
it should; leaf cells are mostly empty tint below their label.

**C · Outline + fringe** (`c-open`, `c-hover`). Most legible overall and needs
no altitude window — depth is indent, the lane is the exact WalkView-shaped
projection (23 entries with ↺ revisits numbered), and the aside is cleanly
"present but not in the route". Cost as predicted: structure and order sit in
two panes the eye must join. Clearly the authoring view's skeleton.

**D · Metro line** (`d-dips`, `d-revisit-hover`). The surprise. The
elevation-profile reading — one line dipping a stratum wherever a stage is
open — shows the WHOLE tier story in one compact picture, and depth is an
axis, not a window: tier 3 just dips lower. Named stations work. Flaws:
rotated labels collide near dips, and the aside line floats ambiguously
between strata instead of hugging its stage's level.

**E · Layer stack** (`e-tier0`, `e-tier1`). Works exactly as scoped: the iso
planes are a good *navigator* (tier populations visible at a glance, active
plane lit) and useless as a desk — which is the finding. Labels must live on
the flat side. Missing: any visual tie between a stage diamond and its
children's span on the plane below; asides don't appear in the stack.

## Synthesis direction (for the issue thread)

B and D are the two keepers pulling in different directions: B is the working
surface (spatial, clickable, projection-faithful), D is the compact overview
(the whole plan's shape in one glance). C's outline is the authoring skeleton
regardless of which surface wins. E survives only as a possible minimap. A is
dominated by B on every axis except familiarity.

Open questions carried forward: where the aside lane lives spatially (B's
annex row vs D's parallel line, neither fully right yet); whether expansion
state is bus-level or per-instrument; stage anchors (still leaning: authored
title, no corpus anchor, focus only lands on leaves).
