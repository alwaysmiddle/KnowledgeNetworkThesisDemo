# Handoff to the design agent

A design agent works on this product's visual system inside a Claude Design
project (**KnowledgeNetwork Design System**). It is not reachable by a function
call, so files are the whole conversation. This folder is our side of it.

The design system is now the **source of truth for style**. Code adopts it
through the `/design-sync` workflow — read the project's tokens and components,
write back component-by-component through an approved plan, never a wholesale
replace. This is issue #57 (roadmap #58).

## Who can write where

| | this repo | the design project |
| --- | --- | --- |
| **Claude Code** | read + write | read any file; write only through an approved `/design-sync` plan |
| **design agent** | read (any pushed ref, and a mounted working tree) | read + write |

Both agents read both places; only the repo is closed to one of them. Each agent
writes only in its own home, and both read both — so no file is ever authored
twice, and there is no merge to resolve.

`/design-sync` is how code reaches the project: `list_files` / `get_file` to read
the current tokens and components, then `finalize_plan` + `write_files` to push a
reviewed change. There is no local mirror any more — the pull-only
`skills/knowledge-network-studio-design/` folder and its `SYNC.md` were removed
with #44. Do not reintroduce a mirror; read the project directly.

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

`needs:` is the only field that creates an obligation. Nothing the design agent
authors is an instruction to us unless it arrived as a message marked
`needs: implementation`.

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
before a push, a file can be written straight into the design project through a
`/design-sync` plan the user approves — so ask rather than assume.

## The coupling that must not drift

The design project's `tokens/spacing.css` `--road-*` block records the same
numbers as the `const`s in `src/instruments/walkdesk/AuthorRoad.tsx` (`NODEW`,
`AGAP`, `PAD`, `HEAD`, `MARGIN`, …) plus `RAIL_W` from `RailroadView.tsx`. The
road's layout is measure-free arithmetic, so those numbers *are* the layout — a
token that disagrees is a wrong drawing of a right screen.

Documented coupling drifts; tested coupling does not. The old `tokens.test.ts`
value-for-value parity guard was removed with #44. Its discipline comes back as
the design system's own **adherence lint** (`_adherence.oxlintrc.json`), wired
into `npm run verify` — see #61. Until that lands, this coupling is documented,
not enforced; treat it as a promise to keep by hand.
