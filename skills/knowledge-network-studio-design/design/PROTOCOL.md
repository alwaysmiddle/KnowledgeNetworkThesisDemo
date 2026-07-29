# The highway — how the design agent and Claude Code talk

Two agents work on this product and cannot call each other. What each can reach:

| | reads repo | writes repo | reads design project | writes design project |
| --- | --- | --- | --- | --- |
| **Claude Code** (CC) | working tree | yes, commits | yes, `DesignSync list_files`/`get_file` | yes, `DesignSync` `finalize_plan` → `write_files` |
| **design agent** (DS) | GitHub at any ref, and the working tree when the user mounts the folder | **no** | yes | yes |

Neither direction needs the user to carry a file, and **both directions write to
the same place** — the design project. DS writes there because it lives there; CC
writes there through `DesignSync`. The repo mirror is a read-only shadow of it.

## DS → CC · the mirror

`skills/knowledge-network-studio-design/` is a **pull of the whole design
project**. DS writes there natively; CC runs `DesignSync` and the files appear.
The procedure and its include set are in that folder's `SYNC.md`.

So DS's outbound messages are just files in the design project. They ride the
mirror. Nothing to build, nothing to carry.

**The mirror is pull-only.** Hand-edits there are overwritten on the next sync.
Nothing CC needs to keep may live inside it.

## CC → DS · write into the project

**CC writes its replies into the design project itself**, with `DesignSync`
`finalize_plan` → `write_files` against project id
`5396a7eb-7744-4d60-9a08-69b2460b6dfe`. Two targets:

- **`design/msg/NNNN-slug.md`** — replies and questions, same numbering sequence
  as DS's, next free number wins.
- **`design/from-code.md`** — CC-owned status: current sha, what landed, what
  went stale, open-message table. Mutable; overwrite it each time.

This supersedes the earlier design, which parked `skills/design-from-code.md` in
the repo *outside* the mirror so a re-pull could not clobber it. That solved the
wrong problem. Writing into the project has no clobber problem at all — the
project is the source the mirror is pulled *from*, so a CC-authored file there
simply round-trips to itself on the next sync.

It also removes the courier. A file in the repo reaches DS only when the user
mounts the folder or it is pushed to GitHub; a file in the project is visible to
DS on its next turn, with nobody carrying anything.

`CLAUDE.md` says in-flight work lives in issues and PRs, which is the right house
convention — but DS's tooling cannot read issues. These files are the fallback for
the part of that conversation DS must see. If DS ever gets an issues reader,
retire them and use the thread.

## What travels

**DS → CC** — design decisions, token changes, specimen cards, rule
clarifications, questions about behaviour only the running app can answer.

**CC → DS** — what landed and what changed en route, questions where a spec is
underdetermined, and above all **anything that makes the design system stale**. The
design system is *extracted from source*: a rename or a moved constant silently
invalidates it, and DS finds out only by re-reading everything. One line in
`design/from-code.md` replaces a full re-read.

Include the commit sha (`git rev-parse HEAD`). DS's repo tooling surfaces tree
hashes, which look like shas and are not — `0ec5c7837a48` is a tree. Without a
real one, DS cannot `compare` and falls back to re-reading the screen map; last
sync that was ~90KB of source to find two changed numbers.

## Messages

Numbered files under `design/msg/NNNN-slug.md` in the design project, which the
mirror carries into the repo. Four-digit, never reused, never renumbered.

Both agents write here now, so the numbering is shared: take the next free
number, never reuse, never renumber.

**Immutable once written.** A message states what someone believed at a moment;
corrections are new messages citing the old id. Status never lives in a message —
it lives in `design/from-code.md` (CC's, mutable) and `design/STATE.md` (DS's).
Each agent writes only its own status file. That is what keeps two agents out of
each other's files now that they share a directory.

Front matter: `id`, `from`, `to`, `date`, `subject`, `needs`. Only `needs` creates
obligation — `decision`, `answer`, `implementation`, or `none`.

## Where this sits in the repo's own doctrine

`CLAUDE.md` says there is no single source of truth, deliberately, and that when a
document and the code disagree the code wins unless the document records a
decision not yet implemented. That applies here without exception. The design
system is a document. **When it disagrees with `src/`, the code is right and the
design system is stale** — say so in `design/from-code.md` and DS will fix it.

The one exception is the coupling below, which is not a document at all.

## The coupling that must not drift

`tokens/spacing.css` `--road-*` values are the *same numbers* as the top-level
constants in `AuthorRoad.tsx`, plus `RAIL_W` from `RailroadView.tsx`. The road's
layout is measure-free arithmetic — `measure → place`, no DOM reads — so those
numbers *are* the layout.

Prose coupling drifts; it already did twice in one round. `tokens.test.ts` (ships
with `msg/0001`) parses both files and asserts they agree, so `npm run verify`
catches it. If you add a layout constant, the test fails until you tokenise it.
That is deliberate.
