# Handoff to the design agent

A design agent works on this product's visual system inside a Claude Design
project (**KnowledgeNetwork Design System**). It is the **source of truth for
style**; code adopts it through `/design-sync`, component by component, never a
wholesale replace. This is issue #57 (roadmap #58).

This file is the contract for how code and that agent exchange work. As of **#75**
the code→design channel is **GitHub issues**, not the `design-handoff/msg/NNNN`
files and `from-code.md` that used to live beside this one — those are retired
(recoverable from git history). The move is a concurrency fix: three checkouts
of this repo run side by side, and both hand-minted message numbers and a single
overwrite-in-place status file collide across them. GitHub mints the number and
holds one store outside every checkout.

## Who writes where

| | this repo | the design project |
| --- | --- | --- |
| **Claude Code** | read + write | read any file; write only through an approved `/design-sync` plan |
| **design agent** | read (pushed refs, a mounted tree, **and this repo's issues**) | read + write |

Each agent writes only in its own home; both read both. No file is authored
twice, and there is no merge to resolve.

## code → design: GitHub issues

- **One issue per message or topic.** GitHub mints the number — no hand-minted
  sequence to collide across checkouts. A correction is a **new issue that names
  the old one**, never a silent rewrite; status never goes inside the message.
- **Port divergences** — where a vendored DS port (`src/ds/**`) differs from the
  DS source (a contract gap, a re-tint, a dropped affordance) — go to the
  standing **drift-log #74**, one comment per divergence, mirrored terse in
  `src/ds/PROVENANCE.json`.
- **Studies, decisions, questions** — each its own issue. Attachments (a
  wireframe jpg) attach to the issue.
- **Code state / diff base:** cite the **real commit sha** in the issue or PR.
  The design agent's GitHub tools hand it a *tree* hash, not a usable commit sha,
  so name the sha explicitly whenever a diff base matters. This is the job the
  old `from-code.md` did; naming a sha in an issue avoids its wart (a status file
  must name a sha, but committing it mints a new one, so the name was always one
  commit stale).
- **`needs:`** is the only field that creates an obligation — state it in the
  issue body (`needs: decision | answer | implementation | none`). Nothing the
  design agent authors is an instruction to us unless it arrived marked
  `needs: implementation`.

## design → code: unchanged

The design agent **cannot write this repo**. It authors in its Design System
project; code reads that through `/design-sync` (`list_files` / `get_file` to
read the current tokens and components, then `finalize_plan` + `write_files` to
push a reviewed change). There is no local mirror — read the project directly.
Whether the agent can also **comment on our issues** is the open question in #75;
until it answers, its replies reach us through the project exactly as before.

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
