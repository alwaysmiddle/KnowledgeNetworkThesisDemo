# `src/tokens/` — vendored Design-System token closure

These CSS files are a **vendored snapshot** of the `tokens/` folder in the
**KnowledgeNetwork Design System** (a Claude Design project), which is the
source of truth for style. They are kept **byte-identical** to the project so a
future `/design-sync` `get_file` can diff cleanly against them.

The recorded fingerprint of this snapshot — DS project id, per-file `sha256`
hashes, and sync date — lives in [`../ds/PROVENANCE.json`](../ds/PROVENANCE.json).
The DS has no native version; that stamp is the diffable marker. Re-hash and
compare against it to detect drift. Publishing the DS as a real versioned
dependency is tracked in issue #66.

**Do not hand-edit these files.** A value here is wrong the moment it disagrees
with the design project. To change one, change it in the design project and
re-vendor via `/design-sync`. This is issue #57 (roadmap #58); the drift guard
that enforces "code only reaches these through `var(--token)`" is the DS
adherence lint (`_adherence.oxlintrc.json`), wired in #61.

## What is imported, and what is held

`src/index.css` imports the files that only **declare** `:root` variables:

- `colors.css`, `elevation.css`, `spacing.css`, `typography.css`, `motion.css`

Two files are **vendored but not yet imported**, because they *apply* the tokens
globally and would re-tint the whole app before its components are migrated:

- `base.css` — the element reset. Sets `body` font-family/background/color and
  the scrollbar styling. Held for the chrome/global adoption step (#64).
- `fonts.css` — the Quicksand/Nunito/JetBrains Mono webfont loader. Held until
  something actually applies `var(--font-*)`; imported alongside `base.css`.

Until then, only the road-well containment surfaces re-tint (via the aliases in
`index.css @theme`); the rest of the app keeps its current look and migrates
component by component (#62–#64).
