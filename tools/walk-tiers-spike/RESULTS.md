# Walk-Tiers Spike Results

## Round 2 — 2026-07-20 (verdicts applied)

User verdicts on round 1: **A out** (current form), **D deleted** (not worth
further effort), **B rethought** as multi-line, **C most useful** but needed a
real multi-tier answer, **E the money shot**, to be combined with refined B
or C. A/D/the round-1 B/C/E components are deleted; git history keeps them.

**The convergence.** Refined B ("each tier is one line; picking a node swaps
out every line below") turned out to be E's layer stack *flattened*: one
plane per line, one line per plane. So round 2's E is not a candidate beside
B — it IS B, with the stack mounted beside it on one shared state.

**The model change.** Round 1 was expansion-driven (a `Set` of open stages —
any number open per tier). Round 2's B/E are SELECTION-driven: a `path` of
stage keys, one per tier (`tierpath.ts`, `linesForPath`). Picking a stage on
line N truncates the path at N and descends; picking a leaf visit just
truncates (a visit has no inside). C keeps the expansion set — outlines want
many things open; drill-paths want one. That split is a real finding: the
two state shapes serve different instruments and both project to a route.

**Driver-verified** (`node tools/walk-tiers-spike/shots.mjs`, exit 0):
planes appear/disappear one-per-line as the path deepens and swaps
(2 → 4 → 2 across `e2-*`); the swap changes the projected route; picking a
visit truncates the lines below it (`b2-visit-truncate`); hover still lights
the doc pane, no tooltips anywhere; exactly ONE ↺ revisit mark at full
expansion in C — a StrictMode double-render had briefly marked every visit
(impure seen-set mutation during render, now precomputed purely and pinned
by assertion).

**Frames.** `e2-default/e2-deep/e2-swap`: the stack+lines combo reads
exactly as hoped — four planes mirroring four lines, picked stages glowing
on their planes, aside sitting on its line behind a dashed divider, route
strip following. `b2-*`: the lines alone are already a usable walk cockpit.
`c2-open/c2-hover`: the recursive timeline shows the ENTIRE plan as one
top-down story — branches indent right and rejoin, the aside lane hangs off
its branch — and is the strongest whole-plan reading we have; its outline
twin now looks redundant next to it (the timeline IS an outline with order
made visible). Candidate question for round 3: does C's left rail survive,
or does the timeline replace it as the authoring skeleton?

**Where this leaves the synthesis.** E (stack + lines) is the session
cockpit — navigate and drill. C's timeline is the document — read and
author. Both consume the same tiered walk; the route projection works from
either state shape. Round 3 should probably mock the AUTHORING gestures on
the timeline (add stop, group into stage, fork an aside) rather than more
viewing candidates.

---

# Round 1 — 2026-07-20

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
