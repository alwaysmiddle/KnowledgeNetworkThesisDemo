# KnowledgeNetworkThesisDemo Orientation

This repository holds the **code** for the implementation-first thesis demo: the
React app under `src/` — the Graph Disclosure Lab, one Studio of composable
navigation instruments.

Its scope is the **teaching domain** of the knowledge network, iterated
independently of the coding and infrastructure projects. The coder-shaped
framing has been removed: there is no Coding preset and no architecture-map
generator. The corpus's four relations are pedagogical (`depends_on`, `uses`,
`see_also`, `implemented_with`), with `depends_on` — the prerequisite backbone —
as the spine of a generated curriculum.

## Where the knowledge lives

There is **no single source of truth**, deliberately. A knowledge network that
can only read one repository is not a knowledge network. Context for this
project is assembled from whichever sources actually hold it:

| Source | Holds |
| --- | --- |
| GitHub issues and PRs | in-flight work, why a change was made, what was tried and rejected |
| the code and its comments | the current model — the ops in `authordraft.ts`, the layout arithmetic in `AuthorRoad.tsx` |
| `tools/*-spike/RESULTS.md` | spike findings, next to the shots that produced them |
| `skills/` | packaged procedures, and material mirrored in from outside |

Read the sources the task actually touches. Do not assume any one of them is
complete, and do not treat a page as authoritative just because it is written
down — when a document and the code disagree, the code and the issue thread win
unless the document records a decision that has not been implemented yet.

## Session start

1. Skim the open issues covering the area you are about to touch.
2. Read the files the task names, plus their neighbours in the same folder.
3. If a spike covers the area, read its `RESULTS.md` before re-deriving it.

## This repo's role

- The app code (`src/`) and the spike tooling under `tools/`.
- Agents open PRs here.
- Verification is self-contained: `npm run verify` runs typecheck, lint, and
  tests, and reaches outside this repository for nothing.
