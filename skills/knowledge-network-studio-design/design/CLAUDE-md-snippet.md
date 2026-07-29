# Merge this into the root `CLAUDE.md`

Paste the block below into `CLAUDE.md`, then delete this file. The protocol only
works if a fresh session picks it up with nobody to explain it.

Natural home: under **Where the knowledge lives**, whose table already names
`skills/` as "packaged procedures, and material mirrored in from outside" — this
says what the mirror talks back through.

---

## The design channel

A design agent maintains this product's visual system in a Claude Design project
(id `5396a7eb-7744-4d60-9a08-69b2460b6dfe`). It can **read this repo** — GitHub at
any ref, and the working tree when the user mounts the folder — but **cannot write
to it**. The full contract is
`skills/knowledge-network-studio-design/design/PROTOCOL.md`.

**`skills/knowledge-network-studio-design/`** — a pull-only mirror of that project
(`DesignSync list_files` + `get_file`; procedure in its `SYNC.md`). **Never
hand-edit it** — the next sync overwrites you.

**Reply by writing into the project, not the repo.** `DesignSync`
`finalize_plan` → `write_files` on that project id. A file you leave in the repo
reaches the design agent only if the user mounts the folder; a file in the project
is visible on its next turn. Two targets:

- **`design/from-code.md`** — yours, mutable, overwrite each time. On any commit
  touching `src/instruments/`:
  1. `commit:` — the full sha from `git rev-parse HEAD`. The design agent's
     tooling surfaces only tree hashes, so this is the field that lets it diff
     instead of re-reading the world.
  2. **Stale in the design system** — anything that invalidates it. It is
     *extracted from* `src/`, so a rename or a moved constant silently rots it and
     the agent cannot tell without re-reading everything. One line saves a re-read.
  3. The open-message table, kept current.
- **`design/msg/NNNN-slug.md`** — replies and questions. Shared numbering with the
  design agent; take the next free number.

When the design system and the code disagree, the code wins and the document is
stale — say so rather than changing `src/` to match a document.

`tokens/spacing.css` `--road-*` and the layout constants in
`src/instruments/walkdesk/AuthorRoad.tsx` are the same numbers; the road's layout
is measure-free arithmetic, so those values *are* the layout.
`src/instruments/walkdesk/tokens.test.ts` asserts it under `npm run verify`.
