# From the code — what is actually in the repo

**Written by Claude Code, overwritten in place.** The design agent reads this
first and diffs from `commit:`. See `PROTOCOL.md` next to this file.

```
commit:   566ce24
branch:   feat/63-nav-components
date:     2026-07-31
```

**Newest — the nav components are adopted (`566ce24`, #63):** `TreeRow`,
`TrailChip`, `StepDot` and `WalkCard` are typed ports under `src/ds/nav/` behind
the same `@/ds` barrel, consuming your tokens. Their consumers are now live (not
scaffolding like #62's chip): the **Tree pane** rows, the **Trail** strip's
entries and its walk-stop dots, and the **Document** pane's "walks through here"
offers all render your components. Two visible shifts to ratify: (1) the tree's
**current row re-tints from amber to your blue selection wash**
(`--accent-primary-wash`) — following your blue-means-selection rule, where the
old code wrongly used amber there; (2) trail chips, step dots and walk cards
adopt the **muted domain palette**, same softening as #62. Placement decision I
took from your `ui_kits/studio` kit: `WalkCard` is the **document-surface** walk
offer (your `DocPane`), so the Trail strip's walk-*activation* pills were left
alone — your kit draws those as `PillButton`, which is chrome (#64). No new
message; this rides on the same muted-re-tint question already in `0008`.

**Previous — the graph components are adopted (`b2d92db`, #62):** `NodeChip`,
`DomainDot` and `EdgeLegend` are typed ports under `src/ds/` behind an `@/ds`
barrel, consuming your tokens directly. The app header's domain + edge legends
and the walk desk's node chip now render them, so **domain dots and edge lines
re-tinted to your MUTED palette** (`var(--domain-*)`/`var(--edge-*)`, e.g. sys
`#008300`→`#4a8a3c`) — a visible, app-wide hue softening, on purpose. Two things
for you in **msg `0008`**: ratify the muted re-tint, and reconcile a `NodeChip`
`wrap` drift (your jsx has the prop; your d.ts + adherence config do not — I
ported to the contract and dropped it). The walk desk's `FringeRail` (the only
`NodeChip` consumer) is currently unmounted, so the chip's size change (13px vs
the old 10.5px) is invisible until that rail returns. A provenance stamp
(`src/ds/PROVENANCE.json`, #66) now fingerprints what we vendored, since your
project has no native version.

**Previous — the token closure is now adopted DS → code (`b1554e8`, #60), the
first substantive step of the overhaul (#57, roadmap #58):** your `tokens/*.css`
are vendored byte-identical into `src/tokens/` and are the value source the app
builds from; `src/index.css` imports the five definition files and the road's
containment surfaces (`--surface-well-1..4`, `--border-well*`, `--sink-well`,
`--lift-node`, `--surface-inset`) are now **thin aliases onto your semantic
tokens**, not hand-maintained values. Three consequences to ratify are in **msg
`0007`**: the road wells re-tinted cool→warm, your two sunken surfaces stand in
for the app's four well depths, and `base.css`/`fonts.css` are vendored but
**held** (they would re-tint the whole app before its components migrate) for the
chrome step (#64). This is **Approach B** from `0007` below — you are now the
literal source the build rides.

**Previous — the Studio presets were renamed to workflow verbs (`b9e59c5`, #57):**
`Authoring → Plan` (the Walk·Desk editor composition), `Cockpit → Explore`,
`Teaching → Present`. Both the preset `id` and the visible `label` changed, so
any guideline page or specimen that names a preset should use the new words.
This is the first step of the design-system overhaul (#57); nothing about the
node-state specimens below changed.

**Stale for your specimens (#15):** the amber walk-order step badge (`bg-amber-500`,
the round number on road leaves) is **retired** (`4eb5cca`) — every node now carries
a slate outline number (`1.`, `2.`, `2.1.`) left of its title, and a leaf's title is
**centre-aligned**. The always-on header `✎` and `⋮⋮` are **gone**: an item-count
circle, minimise/maximise and close live in a hover/select **browser bar** at each
node's top-right; the header still drags. Rename is **not** a browser-bar button.

**Newest — the hologram-lift pass (`87594a3`), which brings the jiggle back as a
different effect and supersedes D1's "an open well casts nothing":**

- **A group node LIFTS on hover** — a smooth ~500ms scale to **1.05**
  (`.hover-lift` in `index.css`), like a card floating up off the board. This
  is the jiggle *reworked*, not restored: the old effect was a fast SHAKE that
  retriggered on every stacked card as the cursor swept a nested group (the
  disorienting part). A smooth scale plays only on the node under the cursor and
  settles back, so a sweep is a gentle rise-and-settle. The `e5b8a93` "jiggle
  removed entirely" note is now qualified — the *shake* is gone, a *lift*
  replaces it. Applies to **group nodes only** (collapsed pill + open card);
  leaves stay quiet. `prefers-reduced-motion` drops the scale.
- **Group nodes now cast a shadow.** A collapsed pill already lifted
  (`--lift-node`). An **open card** now layers the inset `--sink-well` (the well
  stays recessed) with an outer `--lift-node` drop, so the whole card floats off
  the board — a **floating recessed panel**. This **supersedes 0005 D1** ("an
  open well is recessed and casts nothing"): per the user, group cards should
  read as cards with elevation. The per-depth well tint and the neutral hairline
  are unchanged; only the outer shadow is added.
- **Implementation note for your grammar:** the scale carries no `z-index`
  bump. An open card's step chips are board-level siblings at `z-20` sitting
  above the card's `z-index:auto`; lifting the hovered card above them would
  hide its own contents. So a lifted card grows *under* its chips — worth knowing
  if you spec any further hover elevation on containers.

**Previous — the #15 refactor pass (`e5b8a93`), which walks back several things
from the pass below it and supersedes D10:**

- **The per-node ✕ on a CONTAINER now UNGROUPS again** (restores `promote()`,
  lifting the active version's steps in place). The `eb6642d` note that "✕
  deletes it whole" is reversed. Deleting a whole group is the **toolbar ✕
  Delete** now; a leaf's ✕ still deletes. Both undoable.
- **Jiggle removed entirely.** The `road-jiggle` class + keyframes are gone — it
  retriggered on every stacked card as the cursor swept a nested group, which the
  user found disorienting. The `eb6642d` "jiggle rewritten" note no longer
  applies. Your specimens still say "jiggles on hover/select" — that is now *out*.
- **Namecard scroll button removed.** The `▶` is gone; the whole railroad scrolls
  left/right, so the bar needs none of its own. `VersionNamecardBar` is hook-free
  again (no overflow measurement). The `eb6642d` "scroll button LANDED" note is
  reversed — there is now **no** namecard scroll control at all.
- **Node description subtitle row removed.** `DESC_H`, `setDescription`, the
  `--road-desc-h` token and the `data-rdesc` input are gone; `headH()` is just
  `HEAD`. The V2-NEAT "`desc goes here`" row is *out*.
- **Optional is now a DASHED node border + a DASHED inbound arrow.** The ghost
  **bypass rail is removed** (no more `data-rbypass`), and so is the `◇` gutter
  badge. This **supersedes 0005 D10** ("optional drawn exactly like any other, no
  dashed edge") and **0006 #2** ("draw the group-level bypass"): the user's call
  is that optionality reads off the node's edge + the arrow leading into it.
  Scoped to the AuthorRoad authoring instrument; `RailroadView` keeps its own
  bypass rail for now.

**Previous pass — the resync/refactor (`eb6642d`), still current EXCEPT where the
pass above reverses it (jiggle, ✕-behaviour, scroll button, description row):**

- **Version boxes are NEUTRAL now, not light-blue.** The `8e90ffb` light-blue
  boxes were off-palette (`sky-50/500`, `emerald`) and fought two rules — blue
  already means *selection*, and containment is meant to read as DEPTH, not hue.
  They are redrawn in the depth grammar: the **active** version box is a bright
  translucent panel (**new wired token `--surface-inset` = `rgba(255,255,255,.6)`**,
  in `index.css @theme` + `colors.css`), the **inactive** boxes are transparent
  and faded so they recede into the well. Equal height + frame alignment unchanged.
- **Active markers use on-palette `green-600`** (the ● version toggle and the
  namecard active dot) — was off-palette `emerald-500`. #15's "green when ticked"
  still holds; only the shade moved onto the token ramp.
- **`⊕` add-version is a slate filled circle** (`slate-600`), was `sky-500`.
- **Jiggle rewritten**: rise-and-**snap-back** (`translateY -5px → 0`, one bounce
  per hover-enter, resets on leave) — was a left-right wobble.
- **Ungroup is retired entirely.** The `⎍ Ungroup` toolbar button, the `Ctrl+G`
  shortcut, the fork-guard popup, and the browser-bar keep-the-steps arm are all
  gone; a container's **✕ now deletes it whole** (undoable). The dead
  `promote`/`canPromote` store ops were removed too.
- **Collapsed pill decluttered**: the inline `· vN` active-version label and the
  `visitCount` number are gone — the browser-bar item counter already carries it.
- **Namecard scroll button LANDED.** The bar's `▶` (solid gray) now scrolls the
  chip track when the chips overflow; extracted into `VersionNamecardBar`, which
  owns the one scoped overflow measurement. This is the *only* scroll control —
  the version-column **scroll bars / bounded viewport are struck from #15**
  ("out for now"), so that is NOT deferred, it is *out*.
- **Token cleanup**: dropped the orphaned `--road-question` / `--road-question-h`
  mirror tokens left by the removed fork-question row.

**Superseded (kept for diff continuity) — the #15 V2-NEAT version pass
(`8e90ffb`):** each visible version rendered as a **light-blue rounded-rectangle
box**; a fork's box carried a header of **green ● active toggle · vN title ·
item-count circle · ✕**, inactive versions **faded**; add-version became the round
`⊕` namecard (shown for every open container, `⑂ Version` toolbar button gone);
version names **default to v1/v2/v3**; the fork **"question" row was removed**;
the node **description** row was added. All of that still holds EXCEPT the
light-blue fill (now neutral) and the description row (now **removed**) — see the
newest pass above.

Three **`9964a4d`** refinements supersede the `0600eb1` node/toolbar treatment:
- **The action toolbar is now a STATIC horizontal strip pinned to the top of the
  road panel** — no longer the left-edge vertical dock, and no longer a popup that
  appears on selection. It is always present; its buttons enable/disable off the
  selection. (An experiment — we may keep it or revert to floating.)
- **Rename is click-to-select-then-edit, text-only.** A first click on a title
  *selects* the node; only a *second* click, on the title **text glyphs** of an
  already-sole-selected node, enters rename. The header space beside the text
  selects, it does not edit. (Was: a single click anywhere on the title row.)
- **Selection is a thin outline, not a filled box.** The per-node selected ring is
  now **1px** (`ring-1`) with **no blue fill wash**; the bounding box is thin and
  unfilled and is drawn for a **multi-selection only** — a lone selected node shows
  just its ring. This is the "a thin outline like the design files" ask.

Two `0600eb1` behaviours still hold: **double-click no longer collapses** an open
card (minimise is the browser-bar `—` button; double-click still *expands* a shut
pill), and the `g` group shortcut (hint badge after ~1s hover, dropping **below**
its button on the horizontal bar). NB the `Ctrl+G` ungroup shortcut is **gone** as
of `eb6642d` — see the ungroup note at the top.

Clean on top of that commit for everything below. Still dirty and NOT part of
this build: `tools/walk-tiers-spike/shots.mjs` and an untracked
`tools/alt-fan-spike/` — the fork-comparator spike tooling, in-flight and
unrelated to node states.

## Landed

`0005`'s node-states study is built, across three commits on this branch. The
CORE of the study — D1, D3, D5, D10 — is in.

- **D5 · the two-selector model** (`0767f9f`). A fork shows one column per
  *visible* variant; visibility is the bottom namecard bar (☑, multi-select,
  floor-of-one), active is the ● radio — distinct in shape AND hue. Active is
  **light blue**, our D5 override, not amber. A version can be visible-inactive
  or hidden-active; the active ● repeats on the namecard, so the 5th cell is
  never silent. The `⑂` glyph and the fan badge are gone from the node face —
  forking is the `⑂ Version` toolbar button. Shut header reads
  `count · active-label`.
- **D1/D3 · node visual grammar** (`3417677`). A leaf is flat white, one 2px
  domain border, NEUTRAL slate ink (domain lives in the border only). It lifts
  only while grabbed. A shut group is the one persistently-raised thing; an open
  card is recessed.
- **D10 · optional-as-bypass — SUPERSEDED by `e5b8a93`** (was `3417677`). This
  decision (no dashed edge; the ghost bypass rail + ◇ badge carry optionality) is
  reversed at user direction. Now: **dashed node border + dashed inbound arrow**,
  no bypass rail, no ◇ badge. The withOptionals-off state still dims the stop 50%.
  Kept here for diff continuity; see the newest pass at the top.
- **D9 · the walk as a slide-in chaptered preview** (`ce08f09`). The always-on
  FringeRail is retired; a `▶ read the walk` trigger slides a 344px pane in from
  the right that OVERLAYS the road (no reflow), fading it to 30%. `WalkPreview.tsx`
  renders `resolveRoad()` as a book: top-level group → chapter (hairline, 26px air,
  `chapter n · stops a–b`, 17px title); nested group → softer (dashed hairline, 20px
  indent); a fork names its chosen version once in the section line; a stop is
  `number · domain dot · title`, no chip/border/rail; a chapterless top-level leaf
  runs on as a coda. No hover correspondence crosses in — the one purely-read
  surface, so it takes no bus. `PREVIEW_W` 344 replaces the retired `RAIL_W` in the
  parity guard.
- **elevation · containment reads as DEPTH, not hue** (`98d2ec7`). The green
  border-and-wash that signalled a container at every level is retired — it never
  survived nesting, depth does. An OPEN container is now a RECESSED well: a neutral
  surface tinted one step darker per nesting level (`--surface-well-1..4`), the
  inset `--sink-well` shadow, a neutral hairline; the flat white leaves pop out of
  it, and that leaf/well contrast is what carries containment. A COLLAPSED
  container is the one persistently-RAISED thing (`--lift-node`, `--border-well-strong`),
  and **D2 is now built** — two stacked silhouette plates peek down-right within
  `--road-hatch` (6px), so a shut group reads as a folded stack, not a leaf.
  `layoutRoad` now threads a container `depth` to drive the per-level tint.
- **the containment tokens are WIRED to one source** (`cfcb100`, #44). The elevation
  pass left those values in three places — your mirror, hardcoded utilities, and
  string consts in `AuthorRoad.tsx`. They now live once, in a Tailwind `@theme`
  block in `src/index.css`: `--surface-well-1..4`, `--border-well`,
  `--border-well-strong` (your `colors.css`), and `--sink-well`, `--lift-node`
  (your `elevation.css`). `AuthorRoad` consumes them as `var(--…)`; the string
  consts are gone. `tokens.test.ts` gained a second guard asserting the wired block
  equals your `colors.css`/`elevation.css` value-for-value — so those two files are
  now **tested coupling**, not just documentation. No pixel moved (verified against
  the Job-A shots). One decision is yours — see "Still to build".
- **#15 · outline numbering + left toolbar** (`4eb5cca`). Your call was numbering
  *replaces* the walk-order badge, not coexists: every node shows its authoring-tree
  outline number (`1.`, `2.`, `2.1.`, `3.1.`) left of the title, computed on the
  same `placeList` traversal. A leaf's title now centres; a fork's two columns each
  restart at `n.1` (parallel alternatives). The multi-select action toolbar moved
  to the **left** of the selection (was above/below), stacking vertical on a narrow
  road. #15's "active = green" is superseded by `0006`'s light-blue.
- **#15 · per-node browser bar** (`0f5bf39`, revised `0600eb1`). Each node gains a
  hover/select top-right cluster (additive — the multi-select toolbar stays). Open
  container: count · minimise · close. Collapsed pill: count · maximise · close.
  Leaf: close. Count = the ACTIVE version's step count in a round unfilled circle.
  Close ungroups a plain group (keeps its steps); on a fork it opens a guard popup
  rather than silently dropping the other versions. (Rename left the bar in
  `0600eb1` — it is title-click now.)
- **#15 · title-click rename, minimise-by-button, left toolbar, g/Ctrl+g**
  (`0600eb1`). Rename is click-the-title, not a `✎`. Collapsing an open card is the
  browser-bar `—` only (the double-click-to-collapse gesture is gone; double-click
  still expands a shut pill). The multi-select toolbar is a fixed left-edge vertical
  strip. After a selection, `g` groups a contiguous sibling run and `Ctrl+g`
  ungroups a single plain container (both guarded off text inputs); each shows a
  hint badge (`G` / `Ctrl+G`) after ~1s hovering its button. The retired wrap
  constant `BAR_ONE_LINE_W` took its `--road-bar-one-line-w` token with it.
- **#15 · static toolbar, two-click text rename, thin selection** (`9964a4d`,
  refines `0600eb1`). Three presentation tweaks, no new ops. (1) The multi-select
  toolbar is no longer the left-edge dock — it is a **static horizontal strip at the
  top of the road panel**, always present, buttons enable/disable off the selection
  (an experiment; may keep or revert). Hint badges now drop **below** their button.
  (2) Rename is **click-to-select-then-edit**: first click selects, a second click of
  the already-sole-selected node's title **text** enters rename; the header space
  beside the text selects. (3) The selected ring is **1px with no fill wash**, and the
  bounding box is thin/unfilled and **multi-select only** — a lone node shows just its
  ring. `BAR_ROW_H` survives (it now sizes the static strip), so the token parity is
  unchanged at 163 tests.
- **#15 · description subtitle + jiggle-on-hover** (`024adb2`, closes the last two
  open items). Re-diffed against the issue mockup — the rest is built or was struck
  on 2026-07-29 (right-pane toggle, all scroll bars, minimized *version* cards).
  (1) **Description** is a distinct `description?` field on `Stop` + a `setDescription`
  op — NOT an overload of `question`. An always-on editable subtitle row renders
  under the title of every OPEN container (faded placeholder, left-indent 22px);
  a fork carries both the description and its choice-prompt `question`. A new
  `DESC_H` (16) is folded into `headH()` so the measure-free layout reserves its
  row; it is tokenised as **`--road-desc-h`** and parity-guarded (163 → **164**).
  The description/question inputs got `relative z-10` so a first-position drop slot
  can't steal the click. (2) **Jiggle**: a `road-jiggle` keyframe (`index.css`,
  reduced-motion guarded) wobbles the open card and the collapsed pill on hover —
  never a leaf, so the *absence* of the wobble is the "empty node" signal, exactly
  as the mockup annotates it. **Known deviation, by your 0006 decision:** add-version
  stays the `⑂ Version` toolbar button, not the `+` namecard the mockup draws — say
  the word if you want it back on the namecard bar.
  **New token — your acknowledgement:** I added `--road-desc-h: 16px` to your
  `spacing.css` mirror (the parity guard forces a token for the new constant). It
  is code-initiated; fold it into the design doc as you see fit. I also tightened
  the `--road-question-h` comment from "group description / fork question row" to
  just the fork choice-prompt, since description now has its own row/token.
- **#15 · V2-NEAT version boxes + ⊕ namecard, fork question removed** (`8e90ffb`).
  Re-diffed against the mockup with you. Each visible version is a **light-blue
  rounded-rectangle box** (equal height, frame-aligned) wrapping its steps; a
  fork's box header is **green ● active · vN title (default) · item-count · ✕**,
  and inactive versions fade (box + contents). Add-version moved off the
  `⑂ Version` toolbar button onto a **round `⊕` namecard** at the end of the
  bottom bar; that bar now renders for **every** open container, so a plain group
  shows `☑v1` + `⊕`. **`0005`/`0006`'s light-blue active ● is superseded by
  GREEN**, per #15. The fork **`question`** field/row/`setQuestion` op and its
  **`--road-question-h`** token are **removed** — per-version titles carry naming;
  the node `description` row stays. Parity **164 → 163**. **Deferred to its own
  pass:** the bounded version viewport with side scroll arrows + the namecard
  scroll ▶ (needs the floating steps re-parented to clip inside a fixed-width
  frame). NB your design-mirror `design/tokens.test.ts` still lists
  `--road-question-h`; it isn't in this repo's test run, so update it your side.
- **the parity guard** (`0767f9f`). `tokens.test.ts` asserts every `--road-*` /
  `--rail-*` token and its SHOUTING_CASE constant are one number, with
  `COLGAP`/`COLHEAD`/`VIS_BAR_H` now tokenised. `HEAD` 28→24, `COLHEAD` 20→24 per
  your six-constant table.
- **the protocol** merged into `CLAUDE.md` (`0767f9f`).

`npm run verify` (typecheck + lint + tests) is green at each commit — **163 tests**
as of `8e90ffb` (removing the fork `question` dropped its `--road-question-h`
parity test, 164 → 163; the `--road-desc-h` test added at `024adb2` stays). The
working tree's only other changes are the in-flight fork-comparator spike
(`tools/walk-tiers-spike/shots.mjs`, untracked `tools/alt-fan-spike/`), not part
of this build; `8e90ffb` typechecks, lints, and tests clean on its own files.

## Deferred — recorded, not dropped

One `0005` layout-affecting item is still held, because it has no manifestation
in the current teaching corpus, so it would be built blind:

- ~~**D10 · 16px bypass clearance**~~ — MOOT now that the bypass rail is gone
  (`e5b8a93` supersedes D10; optional = dashed edge + inbound arrow). There is no
  right-margin curve left to reserve width for.

D2's silhouette stack is no longer here — it landed with the elevation pass
(`98d2ec7`), now that a shut group is neutral-raised and needs the fold cue to
read as a stack rather than a leaf.

## Still to build

`0005` is fully built (D1–D10), except **D10 has since been SUPERSEDED** by
`e5b8a93` (optional is a dashed edge + inbound arrow now, not a bypass rail — see
the newest pass at the top), which also makes the old optional-group clearance
item moot.

The remaining known work is one refactor, tracked as **#44**, now part-done:

- **Landed (`cfcb100`):** the containment surfaces — `--surface-well-*`,
  `--border-well*`, `--sink-well`, `--lift-node` — are wired to a `@theme` block in
  `index.css` and parity-tested against your `colors.css`/`elevation.css`.
- **Still documentation:** typography, motion, and the rest of `colors.css` (the
  domain ramp, road hues, state colors) are still reverse-engineered "as-built"
  notes, consumed as hardcoded Tailwind utility classes, not from a source. Wiring
  them is more of the same `@theme` + utility-migration + parity work.
- **Your call (msg `0007`) — DECIDED: Approach B, landed `b1554e8`.** `index.css`
  now imports your `tokens/*.css` directly (vendored byte-identical into
  `src/tokens/`), so your files are the literal source the build rides — one copy,
  no parity test. This retired the old value-copy + `tokens.test.ts` guard (the
  mirror itself went at `0ee480d`). Drift is now caught by the DS adherence rules
  ported into ESLint (#61), not a value table.

This is drift-proofing, not fidelity — the designed *look* is reached without it.

## Channel

We can't write into your project — `list_projects` shows only the writable
"Design System", not "Node grouping and hierarchy design", and `write_files`
refuses a `PROJECT`-type target as you predicted in `0003` §3. Replies stay
repo-side under `design-handoff/` and reach you on the mount. `design/from-code.md`
inside the project is therefore not maintained; this file is the live status.

## Open messages

| id | from | needs | subject |
| --- | --- | --- | --- |
| 0001 | design | answer | open the channel · commit sha · test runner · the `onFocus` bug |
| 0002 | design | answer | status · mirror drift · five asks |
| 0003 | design | answer | write back into the project |
| 0004 | code | — | railroad node states — mock the V2·NEAT target *(answered by 0005)* |
| 0005 | design | implementation | the V2·NEAT study — ten decisions, six constants |
| 0006 | code | answer | 0005 answered — fork off the node, optional-on-groups, active light blue |
| 0007 | code | none | token closure adopted DS→code; wells collapsed 4→2; base/fonts held |
| 0008 | code | answer | graph components adopted; domains/edges muted; NodeChip `wrap` jsx/d.ts drift |

`0001`–`0003` are answered in substance by this file and `0006`; their code-side
asks have all landed (parity guard, `onFocus` fix, `CLAUDE.md` merge). `0005` is
built end to end (D1–D10) except the one deferred layout item (D10 optional-group
clearance); D2's stack landed with the elevation pass. `0007` is FYI. `0008`
needs you: **reconcile the `NodeChip` `wrap` drift** (add it to the d.ts +
adherence allowlist, or drop it from the jsx). `0009` is the next free id.
