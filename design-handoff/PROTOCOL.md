# Handoff to the design agent

A design agent works on this product's visual system inside a Claude Design
project. It is not reachable by a function call, so files are the whole
conversation. This folder is our side of it.

## Who can write where

| | this repo | the design project |
| --- | --- | --- |
| **Claude Code** | read + write | read any file; write only through an approved plan |
| **design agent** | read (any pushed ref, and a mounted working tree) | read + write |

Both agents can read both places. Only the repo is closed to one of them. So the
rule is **each agent writes only in its own home, and both read both**. No file
is ever authored twice, which is why there is no merge to resolve and no file to
carry by hand.

| Written by | Lives in | Arrives here as |
| --- | --- | --- |
| Claude Code | `design-handoff/` | — it is already here |
| design agent | `design/` inside the Claude Design project | `skills/knowledge-network-studio-design/design/`, on the next mirror pull |

`skills/knowledge-network-studio-design/` is a pull-only mirror — see its
`SYNC.md`. Do not hand-edit anything under it; the next pull overwrites it. That
is the reason our side lives at the repo root instead.

## What we write

| Path | Mutable | Holds |
| --- | --- | --- |
| `design-handoff/from-code.md` | yes — overwrite in place | the current state of the code: commit sha, what landed, what has gone stale, which of their messages are answered |
| `design-handoff/msg/NNNN-slug.md` | no — immutable once written | one message, one file |

Message numbering is a single sequence shared with the design agent. A collision
is harmless (`0007-a`, `0007-b`) and better than renumbering. Never edit a
message after writing it — a correction is a new message that names the old id.
Status belongs in `from-code.md`, never inside a message.

Front matter is required:

```yaml
---
id: 0004
from: code
to: design
date: 2026-07-28
subject: one line
needs: decision | answer | implementation | none
---
```

`needs:` is the only field that creates an obligation. Nothing in the mirror is
an instruction unless it arrived as a message marked `needs: implementation`.

## When to write

After a commit that changes `src/instruments/` or anything the design system
cites, rewrite `from-code.md`. Two fields earn their keep:

- **the commit sha**, from `git rev-parse HEAD`. The design agent's GitHub tools
  hand it a *tree* hash, which looks like a sha and cannot be used as a diff
  base. Without a real sha it re-reads every file to find what moved.
- **what went stale.** The design system is extracted from source, so a rename
  or a moved constant silently invalidates a specimen card and nothing announces
  it. One line here saves a full re-read.

Uncommitted work is invisible to them — they read pushed refs. If `from-code.md`
claims a sha, say which paths are dirty on top of it.

## Delivery

Committing and pushing is enough: they read the repo. If something is urgent
before a push, a file can be written straight into the design project instead —
that needs a plan the user approves, so ask rather than assume.

## The coupling that must not drift

`skills/knowledge-network-studio-design/tokens/spacing.css` `--road-*` are the
same numbers as the `const`s in `src/instruments/walkdesk/AuthorRoad.tsx`
(`NODEW`, `AGAP`, `PAD`, `HEAD`, `BAR_ONE_LINE_W`, …) plus `RAIL_W` from
`RailroadView.tsx`. The road's layout is measure-free arithmetic, so those
numbers *are* the layout — a token that disagrees is a wrong drawing of a right
screen.

Documented coupling drifts; tested coupling does not. `npm run verify` runs
typecheck, lint and vitest, so this can be an assertion rather than a promise.
