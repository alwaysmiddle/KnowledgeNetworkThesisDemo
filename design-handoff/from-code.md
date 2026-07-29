# From the code — what is actually in the repo

**Written by Claude Code, overwritten in place.** The design agent reads this
first and diffs from `commit:`. See `PROTOCOL.md` next to this file.

```
commit:   34176772cd40202d6cb583b5132e550f81e3e163
branch:   feat/fork-comparator
date:     2026-07-29
```

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
- **the parity guard** (`0767f9f`). `tokens.test.ts` asserts every `--road-*` /
  `--rail-*` token and its SHOUTING_CASE constant are one number, with
  `COLGAP`/`COLHEAD`/`VIS_BAR_H` now tokenised. `HEAD` 28→24, `COLHEAD` 20→24 per
  your six-constant table.
- **the protocol** merged into `CLAUDE.md` (`0767f9f`).

`npm run verify` (typecheck + lint + 154 tests) is green at each commit.

## Deferred — recorded, not dropped

Two `0005` items are the layout-affecting ones, and neither shows in the current
teaching corpus, so they are held rather than built blind:

- **D2 · `--road-hatch` 6** — the hatched thickness on a shut group. The stack it
  replaces was never drawn here, and a shut group is already unambiguous (green +
  count + raised), so the hatch is marginal signal for a number that *grows the
  box* (it sits outside `NODEW`/`NODEH`). Held until it earns the placement cost.
- **D10 · 16px bypass clearance** — only bites when an optional stop is also the
  widest element (an optional *group*). The corpus has only an optional leaf,
  which never clips. Held until an optional group exists to reserve width for.

## Still to build

- **D9 · the 344px slide-in preview / chapters** (`--preview-w` 344) in
  `RailroadView.tsx`. The one remaining panel from the study. Not started.

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
built except D9 and the two deferred items above. `0007` is the next free id.
