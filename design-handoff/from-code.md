# From the code — what is actually in the repo

**Written by Claude Code, overwritten in place.** The design agent reads this
first and diffs from `commit:`. See `PROTOCOL.md` next to this file.

```
commit:   8e90ffb
branch:   feat/fork-comparator
date:     2026-07-29
```

**Stale for your specimens (#15):** the amber walk-order step badge (`bg-amber-500`,
the round number on road leaves) is **retired** (`4eb5cca`) — every node now carries
a slate outline number (`1.`, `2.`, `2.1.`) left of its title, and a leaf's title is
**centre-aligned**. The always-on header `✎` and `⋮⋮` are **gone**: an item-count
circle, minimise/maximise and close live in a hover/select **browser bar** at each
node's top-right; the header still drags. Rename is **not** a browser-bar button.

**Newest — the #15 V2-NEAT version pass (`8e90ffb`), which supersedes several
notes further down:** each visible version now renders as a **light-blue
rounded-rectangle box** (all boxes equal height, aligned to the frame) wrapping
its steps; a fork's box carries a header of **green ● active toggle · vN title ·
item-count circle · ✕**, and inactive versions **fade** (box + contents).
**Active is GREEN now** — this supersedes #15's original "green" having been
overridden to light-blue in `0005` D5 / `4eb5cca`, *and* the `024adb2` note that
add-version stays a toolbar button. **Add-version is the round `⊕` namecard** at
the end of the bottom bar, which now shows for **every** open container (a plain
group shows `☑v1` + `⊕`); the `⑂ Version` toolbar button is **gone**. Version
names **default to v1/v2/v3**. The fork **"question" row is removed** (and its
`--road-question-h` token) — per-version titles name the versions; the node
**description** row under the title stays. **Deferred to its own pass:** the
bounded version viewport with side **scroll arrows** (and the namecard scroll ▶)
— it needs the board-level floating steps re-parented to clip inside a
fixed-width frame, so it is not in this commit.

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
pill), and the `g` / `Ctrl+G` group/ungroup shortcuts (hint badges after ~1s hover,
now dropping **below** their button on the horizontal bar).

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
- **D10 · optional-as-bypass** (`3417677`). The dashed border is gone; an
  optional stop is drawn exactly like any other. The ghost bypass rail (already
  tokenised, now the sole signal) + the ◇ gutter badge carry optionality.
  Optionals on → through-arrow live, bypass ghost-dashed; off → they swap and the
  stop dims 50%. Verified in both toggle states, and for optional groups.
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

- **D10 · 16px bypass clearance** — only bites when an optional stop is also the
  widest element (an optional *group*). The corpus has only an optional leaf,
  which never clips. Held until an optional group exists to reserve width for.

D2's silhouette stack is no longer here — it landed with the elevation pass
(`98d2ec7`), now that a shut group is neutral-raised and needs the fold cue to
read as a stack rather than a leaf.

## Still to build

`0005` is fully built (D1–D10) except the one deferred layout item above (D10
optional-group clearance), held for want of a manifestation in the corpus.

The remaining known work is one refactor, tracked as **#44**, now part-done:

- **Landed (`cfcb100`):** the containment surfaces — `--surface-well-*`,
  `--border-well*`, `--sink-well`, `--lift-node` — are wired to a `@theme` block in
  `index.css` and parity-tested against your `colors.css`/`elevation.css`.
- **Still documentation:** typography, motion, and the rest of `colors.css` (the
  domain ramp, road hues, state colors) are still reverse-engineered "as-built"
  notes, consumed as hardcoded Tailwind utility classes, not from a source. Wiring
  them is more of the same `@theme` + utility-migration + parity work.
- **Your call (msg `0007`, pending):** the wired block currently *copies* your
  token values (Approach A), with the test catching drift. The alternative is for
  `index.css` to `@import` your `tokens/*.css` mirror directly, making your files
  the literal source the app builds from (Approach B) — one copy, no parity test,
  but the app's build then rides the mirror pull. That inverts which file is
  authoritative — yours — so it is yours to decide. Approach A is a clean
  stepping-stone either way; nothing already landed is wasted if you pick B.

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

`0001`–`0003` are answered in substance by this file and `0006`; their code-side
asks have all landed (parity guard, `onFocus` fix, `CLAUDE.md` merge). `0005` is
built end to end (D1–D10) except the one deferred layout item (D10 optional-group
clearance); D2's stack landed with the elevation pass. `0007` is the next free id.
