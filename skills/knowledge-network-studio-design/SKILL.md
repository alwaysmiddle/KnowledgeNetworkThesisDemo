---
name: knowledge-network-studio-design
description: Use this skill to generate well-branded interfaces and assets for the Knowledge Network Studio (Graph Disclosure Lab) — either for production code or throwaway prototypes, mocks and specs. Contains the design guidelines, colour and type tokens, the node/group containment grammar, and UI kit components for the Railroad authoring pane.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

Start with README.md ▸ "The grammar" — the four rules there (containment is
depth not hue; fixed status/title/menu zones; one ring and one docked action
strip; editable things look editable and reading never mutates) are what this
system exists to enforce.

Token files live in `tokens/` and are reached from `styles.css`. Specimen cards in
`guidelines/` show each foundation. Components in `components/` are self-contained
React with props documented in the sibling `.d.ts`. `ui_kits/railroad/index.html`
is a working recreation of the authoring pane on the real plan data.

If creating visual artifacts (mocks, specs, throwaway prototypes), copy the
tokens out and write static HTML files linking `styles.css`. If working on
production code, read the rules here and apply them to the TSX in
`src/instruments/` — the `--road-*` spacing tokens are the same constants the
layout arithmetic uses, so they must change together.

If the user invokes this skill without any other guidance, ask them what they
want to build or design, ask some questions, and act as an expert designer who
outputs HTML artifacts or production code, depending on the need.
