# KnowledgeNetworkThesisDemo Orientation

This repository holds the **code** for the implementation-first thesis demo (the
React app under `src/` — the Graph Disclosure Lab, one Studio of composable
navigation instruments — and the deterministic `npm run map` architecture
generator).

**The knowledge base is NOT in this repo — it lives in the DocHub project.**
DocHub (`D:\ShiZhong\MyCode\DocHub`, a Docusaurus site) is the single source of
truth for goals, problems, ideas, decisions, specs, the roadmap, and the
orchestration design, under `docs/knowledge-network-thesis-demo/`. The `wiki/`
folder in THIS repo is **deprecated** — its content was migrated into DocHub and
it should not be edited. When this file or the old `wiki/` disagree with DocHub,
trust DocHub.

## Session Start

Read, in the DocHub project (`docs/knowledge-network-thesis-demo/`):

1. `index.md` — wiki index and the document pipeline.
2. `goals/Goal-Map.md` — the root Goal and its decomposition (the entry point).
3. `Roadmap.md` — product milestone slices (docs-reset → presentation-preview) and infrastructure phases.
4. `Orchestration.md` — how LangGraph + the agents drive the loop (current MVP).
5. The relevant page under `goals/`, `problems/`, `ideas/`, `decisions/`, or
   `specs/` for the slice being worked.

DocHub enforces its own conventions: `scripts/validate-docs.mjs` is the
verifier (run it before declaring any doc change done), and the `write-goal-page`
skill is the authoring guide. Author knowledge docs there, not here.

## This repo's role

- The app code (`src/`) and the deterministic architecture generator
  (`npm run map`).
- Agents open PRs here; the orchestration's `reconcile` step runs `npm run map`
  and writes the generated diagram back into DocHub.
- Do **not** author knowledge/design docs in this repo.

## Deprecated

- `wiki/` — migrated into DocHub. Retained only for history; do not edit.
