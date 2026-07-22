# Walk-Tiers Spike Results

## Round 7 — 2026-07-21 (branching: the railroad, on ONE combined desk)

The round-6 verdict discussion stepped back to a bigger question: what if
the author needs a **branching decision**? Design the branching-capable
visual first — trimming to a single lane is then the degenerate case. The
chosen notation is the **railroad diagram** (top-down road, forks that fan
out into labelled branch lanes, every branch REJOINS below — well-nested
fork/rejoin, never a free canvas: every position stays computed). And per
the follow-up verdict, the candidate tabs are gone: **one combined desk** —
palette | railroad | columns — replaces C and E.

Model (the load-bearing part):

- `ForkStop { key, question, branches: [{label, steps}] }` joins the Stop
  union; `optional?: boolean` joins visit and stage. Both live ONLY in the
  authoring tree.
- **`resolveRoad(stops, choices, withOptionals)`** is the seam: pick a
  branch per fork (branch 0 = the default road), splice it inline, drop
  skipped optionals — out comes a plain linear walk. The columns, the
  fringe strip, and eventually the bus never learn that forks exist; the
  round-5 presentation stack is byte-for-byte unchanged. A draft with zero
  forks resolves to itself, which IS the trim-down argument.
- The path grammar grows exactly one rule: a fork consumes TWO segments
  (`[forkIdx, branchIdx, stepIdx…]`), all funneled through
  `rebuildListAt` — so insert/remove/move/group work inside a branch with
  no new op types. New ops: `forkSelection` (selection becomes the
  main-path branch, an empty alternative opens beside it), `addBranch`,
  `relabelBranch`, `setForkQuestion`, `toggleOptionalSelection`.

The railroad (`AuthorRoad`, from `AuthorFlow`'s arithmetic layout):

- fork = amber diamond + italic question + labelled branch chips (●/○ picks
  the road); the CHOSEN lane is the road — bold amber rails, walk-order
  badges — other lanes ride along ghosted (dashed grey, dimmed, unbadged).
- optional = dashed border + ◇ + a bypass rail arcing beside the node;
  toggle "optionals: bypassed" and the bypass BECOMES the road while the
  node dims and loses its badge.
- an empty branch is a visible drop lane ("drop steps here"); contextual
  fly tools gain ⑂ fork and ◇ optional next to ⊞ ≀ ✕.

Driver proof (`shots.mjs`, rewritten): branch pick re-projects fringe
(7→10), badges, and columns without editing the draft (node count
constant); optional bypass shrinks all three (10→9) and restores; ⑂ on a
2-visit selection splits the road in place, route unchanged (the selection
IS the main branch); a palette drop lands inside the empty alternative
lane and picking that lane swaps http+ws for ci (10→9); contextual group
and column drilling still work; hover still feeds the doc pane. Frames:
`s7-default`, `s7-branchB`, `s7-bypass`, `s7-forked`, `s7-desk-final` —
all eyeballed, the bypass-becomes-the-road frame is the money shot.

Retired (git keeps them): `AuthorMock`, `AuthorNest` (nested boxes),
`AuthorFlow` (round-6 flow), `StackLinesMock` (iso stack), `tierpath`.
That records the metaphor verdict implicitly: the railroad — a structured
node chart — is the authoring view; the columns are the presentation view;
one desk holds both. Palette extracted to `Palette.tsx` unchanged.

Open questions for the next verdict: does the desk feel right as ONE
surface (vs. authoring and presenting as separate modes)? Should branch
choice live with the presenter at present-time (a chooser when the walk
reaches the diamond) rather than as an authoring-side radio? Do forks need
to be groupable/collapsible once plans grow?

## Round 6 — 2026-07-21 (reopened: boxes vs NODES)

Round-5 feedback reopened #11 on the authoring metaphor: nested boxes are
good, but why not nested NODES, like a flow chart? Round 6 answers with a
live comparison — C splits into two panes rendering **one shared
AuthorState** (`useAuthorDraft` lifted to `AuthorMock`): the round-5
nested-box editor on the left (toolbar controls kept, as the control), the
new **`AuthorFlow`** nested-node flow chart on the right. Edit either side;
the other follows on the same render.

The flow side trials three ideas from the feedback:

- **Nested nodes**: a visit is a pill node on a vertical spine; a stage is a
  COMPOUND node that expands in place into a container holding its own
  arrowed mini-flow (view-local `collapsed` set, all open by default — a
  fold changes neither the nest nor the projected route). Layout is
  arithmetic (measure → place, the WalkColumns pattern): no DOM
  measurement, one SVG underlay for arrows.
- **Strong direction emphasis**: bold amber arrows (2.5px + arrowhead)
  between every pair of consecutive stops, and every visit wears its
  walk-order badge — its position in the projected route — so the flat
  order stays readable through the nesting.
- **Contextual controls**: group / aside / remove live in a floating
  toolbar that appears BESIDE the node the user just clicks, not in a
  header toolbar. It retires itself when the selection clears (every
  structural op clears selection, so the tools vanish after acting).

Shared-contract cleanup: `bandFor` (the visual twin of `gapFor`) moved from
`AuthorNest` into `authordnd.ts`; both editors now band drops identically,
and the flow reuses `gapFor`/`handleDrop`/`pal:`/`blk:` wholesale — a drop
means the same thing in both metaphors.

Driver proof (`shots.mjs`): a palette drop into the NEST appears in the
FLOW and vice versa (one draft); contextual group via the floating tools
wraps dns + the whole seed-net subtree (containment asserted, not just
counts); a flow fold hides nodes but moves neither the nest nor the fringe;
contextual aside pulls two visits out of the route in BOTH editors at once;
order badges renumber. One UX finding, caught by eyeballing the frames
(counts alone were blind to it): a stage header's middle is the retitle
input, which rightly eats clicks — the GRIP (`⋮⋮`, `data-fgrab`) is the
honest select-the-stage affordance. E is unchanged from round 5.

Open question for the verdict: which metaphor authors better — boxes
(denser, reads like an outline, coarse "drop into the box" target) or
nodes (order is louder, compound expand-in-place, controls at the hand)?
And should contextual controls replace the toolbar in whichever wins?

## Round 5 — 2026-07-21 (FINAL: two modes, spike concluded)

User verdicts on round 4: **nested boxes win authoring** (containment makes
structure and editing the same gesture); **vertical columns are confusing
for authoring but great for reading**; **the timeline is out** (surprising —
but once the nest owns the block gestures, density was all it had left);
**stack + lines are presentation aids** — park them for a presentation mode;
and the palette should be **swappable with the map instrument**. Applied,
the spike settles into exactly two modes:

**C · authoring** = palette + the nested-box editor ALONE. The nest was
promoted from drop-target to full editor: every box (visit, collapsed
stage, or an open stage's HEADER row — the stage-as-block) click-selects,
drags with the `blk:` payload, and takes banded drops (top = before,
bottom = after, a closed stage's middle = inside, marked by an amber bar);
an open box stays one COARSE drop target that appends. Collapse state is
INVERTED (`collapsed` set, default all open) so a stage born from "group"
arrives open and ready to fill — with an `expanded` set every new stage
would be born shut. Retitle is inline in the open header; asides render as
a violet lane inside their stage's box; Delete/Tab still work. The palette
notes what it is: a stand-in for the map instrument — the whole feed
contract is `pal:<nodeId>` on text/plain, so the atlas map becomes the
palette with a dragstart handler, not a redesign.

**E · presentation** = layer stack + the vertical columns, which REPLACE
the horizontal TierLines as the desk. `WalkColumns` is the round-4
`AuthorColumns` inverted into a CONTROLLED component: path and pick come
from outside, so stack and columns render one `TierPathState` and cannot
disagree (the same inversion that made TierLines the desk in round 2).
Begat-edges now do what the lines' "↳ inside" labels only said; a stage's
asides hang below its column as a dashed violet lane. `TierLines.tsx` and
`AuthorColumns.tsx` are deleted — git history keeps them.

**Driver-verified** (exit 0). C's chain proves the nest owns every gesture
the retired timeline had: collapse hides blocks but NEVER changes the
projection (authoring projects all-open); drop INTO the sec box appends
(fringe 6→7); a top-half banded drop lands BEFORE block b.0; moving an
existing block into an open box changes no counts; grouping two selected
blocks makes a third OPEN stage (3 retitle inputs, fringe unchanged);
asiding the grouped visits removes them from the route (fringe 8→6) while
an aside lane appears. E's chain proves one shared state by driving the
stack FROM the columns (vpick secure/primitives: 2→3→4 planes) and the
columns FROM the stack (pick-stack machine: back to 2 columns, route
changed). Hover still lights the doc pane; palette search still narrows.

**Frames.** `c5-default/c5-group/c5-aside`, `e5-default/e5-deep/e5-swap`.

**Spike conclusion — what graduates to the Studio.** (1) The tiered-walk
data model (`Stop`/`StageStop`/`Aside`) with `fringe()` as the bus
contract: the flat `route` is a PROJECTION of a tier tree at an expansion
state — proven across all three state shapes (drill-path, expansion set,
draft tree). (2) The authoring instrument: nested-box editor fed by the
map instrument via the `pal:`/`blk:` drop contract, toolbar gestures
(group / aside / remove), inverted collapse. (3) The presentation
instrument: layer stack + begat-edge columns on one drill path. (4) The
old linear WalkView is a retirement candidate — a linear walk is just a
tiered walk with no stages, so the presentation instrument subsumes it.
Not built here, deliberately: draft↔walks.ts persistence ("save as walk" /
"load walk as stage"), bus wiring, and all polish — that work happens in
the Studio, not the spike.

---

## Round 4 — 2026-07-21 (canvas dropped; three authoring views)

User verdicts on round 3: the canvas is OUT — free spatial arrangement isn't
needed for walks — so E reverts to stack + lines (round-2 shape, git history
keeps the canvas). C becomes a three-way comparison: the SAME seeded draft
rendered by three parallel views, edits anywhere landing everywhere.

**1 · timeline blocks** — unchanged from round 3 (select, group, aside,
delete, Tab-indent, caret drops). Still the only view with the full gesture
set; the shared toolbar acts on its selection.

**2 · vertical columns** (`AuthorColumns.tsx`) — the tier lines rotated
vertical: one column per tier, boxes joined by one-way DOWN arrows (the
walk's order), and clicking a ⊞ stage box opens the next column with a
dashed BEGAT-EDGE drawn from that box to the column it spawned — the
containment relation the horizontal lines only implied with "↳ inside"
labels. Drill-path semantics identical to TierLines (its own local path over
the shared draft). Laid out arithmetically, so the SVG needs no measurement.
Read-and-navigate only in this round.

**3 · nested boxes** (`AuthorNest.tsx`) — the same boxed flow but a stage
expands IN PLACE: steps render inside the grown box, tiers as containment.
This is the drag-INTO surface: an open stage box is one big drop target
(glows on hover, appends to that stage), which is a far coarser — and
easier — target than the timeline's before/after/inside bands.

**Driver-verified** (exit 0). Seed = 8 blocks / 2 stages / fringe 6.
Columns: 1 → 2 → 3 columns with 1 → 2 begat-edges as stages are picked;
3 root boxes carry exactly 2 down-arrows. The cross-view assertion:
expanding the sec box in view 3 and dropping `web-sockets-apis` INTO it
makes 9 blocks, fringe 7, and the COLUMNS view's tier-2 column shows 3
boxes without being touched — one draft, three projections. Timeline still
appends and groups (fringe unchanged by grouping), hover still lights the
doc pane, palette search still narrows.

**Frames.** `e4-default/e4-deep/e4-swap`, `c4-default/c4-columns/
c4-nest-drop/c4-group`.

**Observations for the verdict.** The three-pane comparison makes the
trade visible: columns give the clearest begat/order reading but eat
horizontal space fast (three open tiers already scroll inside a third of
the page — a real instrument would give them the full pane); nested boxes
are the friendliest drop target but deep nesting shrinks the innermost
boxes; the timeline stays the densest and the only one with block gestures.
Asides currently render only in the timeline. Likely synthesis question for
round 5: which ONE of 2/3 joins the timeline as the authoring pair, and
does the columns view replace TierLines as E's desk?

---

## Round 3 — 2026-07-20 (authoring + canvas)

User verdicts on round 2: the tier lines COMBINED with the stack are the
keeper, so the standalone B tab is gone (the `TierLines` component survives
inside E); C is "more of an authoring page — pick from a list of nodes, then
draw the node map"; and E gains an Obsidian-style node canvas. On the
drag-and-drop-vs-block-editor question the answer built here is BOTH ON ONE
SURFACE: they are two gestures over the same tree, not two designs.

**C · the authoring page** (`AuthorMock.tsx` + `authordraft.ts`). Left: a
palette of every corpus topic, grouped by domain, searchable. Right: the
round-2 timeline turned editable — rows ARE blocks. Drag a palette chip onto
the timeline and an amber caret shows the landing gap (top half = before,
bottom half = after; a stage header's middle band = INSIDE the stage). Click
a chip instead and it inserts at the selection — the keyboard-flavoured twin.
Blocks click-select, drag-move, group into a stage (which gets an editable
title), fork into an aside, delete, and Tab-indent into the stage above.
The draft is a third state shape: viewing wanted a drill-path (E) or an
expansion set (old C); authoring holds the TREE ITSELF plus a selection and
a caret. All three project to a route through the same `fringe()` — the
strongest evidence yet for route-as-projection as the bus contract.

**E · stack + lines + canvas** (`StackLinesMock.tsx`). Below the lines, the
OPEN tier (the deepest line) renders as cards on a dotted canvas — drag them
anywhere, the arrangement is yours; the amber arrows keep drawing the walk's
order, so rearranging never touches the route (projection made tactile).
A clean click on a ⊞ stage card drills into it; stack, lines, canvas and
fringe all follow because there is still exactly one `TierPathState`.

**Driver-verified** (`node tools/walk-tiers-spike/shots.mjs`, exit 0).
HTML5 dnd is driven by dispatching dragstart/dragover/drop with one shared
DataTransfer handle — deterministic, no native drag emulation. Asserted:
canvas card count follows the open tier (4 → 3 → 2 across the drill);
dragging a card moves it without changing `data-fringe-count`; canvas-click
drills (2 → 3 planes); the authoring flow builds a real plan from an empty
draft — palette click inserts, palette drop lands after the target block,
group makes stage + children, a mid-header drop lands inside the stage,
Tab indents a root block into the stage, an aside REMOVES its visits from
the projected route (fringe 4 → 3), hover still lights the doc pane, and
the palette search narrows the chip list.

**Frames.** `e3-default/e3-canvas-drag/e3-drill/e3-deep`,
`c3-built/c3-aside/c3-hover`.

**Open for the next round.** The authoring draft and the corpus walks don't
meet yet — "save as walk"/"load walk as stage" is the missing bridge (walks
as sub-walks by reference already exist in the data model). The canvas only
shows the open tier; whether stage cards should preview their children's
cards (a mini next-plane) is untested. And nothing yet persists: draft and
card positions are session-local by design.

---

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
