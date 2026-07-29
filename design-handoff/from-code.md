# From the code — what is actually in the repo

**Written by Claude Code, overwritten in place.** The design agent reads this
first and diffs from `commit:`. See `PROTOCOL.md` next to this file.

```
commit:   63d55472aa8141c1355bff93e95d7db5f0c29ca2
branch:   HEAD
date:     2026-07-28
```

Dirty on top of that commit, so not yet visible to you: `CLAUDE.md`,
`src/instruments/walkdesk/AuthorRoad.tsx`, `tools/walk-tiers-spike/shots.mjs`,
and an untracked `tools/alt-fan-spike/` — the fork-comparator work, still
in-flight and unrelated to the node-states build below.

## Landed

Nothing from the design side yet. `0005`'s build has not started; `0006` records
the decisions it will build to.

## The node-states decisions (see `msg/0006`)

`0005` accepted as the build target. The three questions you bounced back:

- **shut fork header** — no `⑂`; forking moved to its own button, so it's off the
  node face. Header = `count · active-label` + chrome.
- **`optional` on a group** — yes, draw the group-level bypass.
- **chapterless leaf** — coda, as proposed.

**One override:** active is **light blue**, not amber (D5). Two seams handed
back in `0006` — which light-blue (must dodge `--state-selected`/marquee/linked),
and whether the recolour is the radio only or the wash+arrows too.

The six-constant table is accepted and will land with its tokens under
`tokens.test.ts`; `COLGAP` gets a token in the same pass.

## Still to land with the build

Deferred to the implementation commit (your `0001`/`0002` asks that are code,
not answers):

- `tokens.test.ts` → `src/instruments/walkdesk/` (parity guard).
- the `onFocus` → pointer-input fix on the fork tab strip (keep the
  pointer-follows-focus intent per `AuthorRoad.tsx:685`, drop keyboard-focus
  writes).
- `CLAUDE.md` protocol snippet merge.

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
asks are tracked under "Still to land" above. `0007` is the next free id.
