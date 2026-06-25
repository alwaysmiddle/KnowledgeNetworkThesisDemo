# Infrastructure Roadmap

This page scopes the rough work for building the SDLC knowledge infrastructure on top of the thesis demo. It is organized into phases that layer infrastructure on top of each other.

See [Vision](Vision) for the full picture of what we are targeting.

---

## Phase 0 — Foundation (Current)

Goal: prove the core loop works end-to-end with minimal automation.

| # | Item | Status |
|---|------|--------|
| 0.1 | ADO project + wiki created | Done |
| 0.2 | GitHub repo linked to ADO Boards | Done |
| 0.3 | Wiki home, Vision, and Roadmap pages written | Done |
| 0.4 | Architecture diagram (Mermaid) manually added to wiki | Pending |
| 0.5 | ADO Board work items created for M1–M7 milestones | Pending |

---

## Phase 1 — Generated Diagram Pipeline

Goal: replace the manually maintained architecture diagram with a pipeline-generated one.

| # | Item | Status |
|---|------|--------|
| 1.1 | `npm run map` generates a Mermaid file from code | Pending |
| 1.2 | ADO pipeline triggers on merge to `master` | Pending |
| 1.3 | Pipeline runs `npm run map` and pushes output to wiki | Pending |
| 1.4 | Wiki `Architecture` page always shows the live diagram | Pending |

**Key constraint:** the generator is deterministic. AI can annotate or group nodes, but the structural shape comes from the code.

---

## Phase 2 — Spec Gate Pipeline

Goal: no Board item moves to "Active" without a matching feature spec in `docs/features/`.

| # | Item | Status |
|---|------|--------|
| 2.1 | Convention: `docs/features/NNN-<slug>.md` naming | Done (existing) |
| 2.2 | Pipeline script: for each "Active" Board item, check spec file exists | Pending |
| 2.3 | PR gate fails if Active item lacks spec | Pending |
| 2.4 | Wiki page listing spec-to-Board-item linkage | Pending |

---

## Phase 3 — Refactor Health Loop

Goal: code health is tracked and fed back into requirements automatically.

| # | Item | Status |
|---|------|--------|
| 3.1 | Identify health metrics to track (complexity, coverage, dead code) | Pending |
| 3.2 | Pipeline step that measures metrics on each merge | Pending |
| 3.3 | Auto-create Board item when threshold is crossed | Pending |
| 3.4 | Wiki page showing current health snapshot | Pending |

---

## Phase 4 — Unified Knowledge View

Goal: one page in the wiki that shows the full knowledge graph — requirements, specs, code nodes, and their relationships — as a navigable Mermaid diagram.

| # | Item | Status |
|---|------|--------|
| 4.1 | Define schema: how requirements link to specs link to code modules | Pending |
| 4.2 | Generator that reads Board items + spec files + code map and emits one combined diagram | Pending |
| 4.3 | Pipeline pushes combined diagram to wiki on merge | Pending |
| 4.4 | Clickable nodes: requirements → Board item, specs → GitHub file, code → GitHub file | Pending |

---

## Deferred

- Semantic querying of the knowledge graph (SPARQL, graph DB).
- External ontology alignment (EVOC, CSO).
- Multi-repo or cross-project knowledge linking.
- AI-driven requirement generation or spec drafting as pipeline steps.

These are valid future directions but out of scope for the skeleton prototype.

---

## Thesis Claim This Roadmap Supports

By the end of Phase 4, the development process of this project is itself a navigable knowledge graph. The thesis demo (PPTX → knowledge nodes) and the infrastructure that builds it share the same structural pattern — proving that the KnowledgeNetwork model applies at the process level, not just the content level.
