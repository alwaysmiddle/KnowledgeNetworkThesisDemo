---
node: roadmap
type: reference
title: Roadmap
status: living
edges: []
---

# Roadmap

Two parallel tracks: **Product** (what the demo builds) and **Infrastructure** (the SDLC pipeline skeleton we are proving). Both progress together — the product is the thing we run the infrastructure against.

---

## Product Milestones

Building a PowerPoint-to-knowledge-node authoring demo.

| ID | Slice | Design | Build | Verify | Notes |
|----|-------|--------|-------|--------|-------|
| M0 | Reset docs and startup scope | Done | Done | Done | Old design archived; Neo4j-only startup. |
| M1 | Neo4j graph model | In progress | Not started | Not started | First feature spec: [001 Neo4j Graph Model](specs/001-Neo4j-Graph-Model). |
| M2 | Backend graph API | Not started | Not started | Not started | Read/write nodes, relationships, groups. |
| M3 | PPTX import | Not started | Not started | Not started | One slide maps to one node. |
| M4 | Canvas organization | Not started | Not started | Not started | User arranges imported slide nodes. |
| M5 | Group and collapse | Not started | Not started | Not started | Group nodes, containment, collapsed proxy edges. |
| M6 | Presentation path | Not started | Not started | Not started | Slide order first; user-editable path later. |
| M7 | Presentation preview | Not started | Not started | Not started | Walk selected nodes as presentation sequence. |

### Working Rule

Each slice follows this loop:

```
design the smallest feature contract → implement → verify → update roadmap → commit
```

### Definition of Done for a Slice

- User behavior stated.
- Data model explicit.
- Out-of-scope list explicit.
- Implementation committed.
- Build/lint/test checks pass.
- This roadmap updated.

---

## Infrastructure Phases

Building the SDLC pipeline skeleton that connects requirements → spec → implementation → refactor. See [Vision](Vision) for the full picture.

### Phase 0 — Foundation (Current)

Goal: prove the core loop works end-to-end with minimal automation.

| # | Item | Status |
|---|------|--------|
| 0.1 | ADO project + wiki created | Done |
| 0.2 | GitHub repo linked to ADO Boards | Done |
| 0.3 | Wiki home, Vision, and Roadmap pages written | Done |
| 0.4 | All docs migrated into wiki sections | Done |
| 0.5 | Architecture diagram (Mermaid) manually added to wiki | Pending |
| 0.6 | ADO Board work items created for M1–M7 milestones | Pending |

### Phase 1 — Generated Diagram Pipeline

Goal: replace the manually maintained architecture diagram with a pipeline-generated one.

| # | Item | Status |
|---|------|--------|
| 1.1 | `npm run map` generates a Mermaid file from code | Pending |
| 1.2 | ADO pipeline triggers on merge to `master` | Pending |
| 1.3 | Pipeline runs `npm run map` and pushes output to wiki | Pending |
| 1.4 | Wiki Architecture page always shows the live diagram | Pending |

### Phase 2 — Spec Gate Pipeline

Goal: no Board item moves to "Active" without a matching feature spec.

| # | Item | Status |
|---|------|--------|
| 2.1 | Spec naming convention established | Done |
| 2.2 | Pipeline script: Active Board items must have a spec file | Pending |
| 2.3 | PR gate fails if Active item lacks spec | Pending |
| 2.4 | Wiki page listing spec-to-Board-item linkage | Pending |

### Phase 3 — Refactor Health Loop

Goal: code health is tracked and fed back into requirements automatically.

| # | Item | Status |
|---|------|--------|
| 3.1 | Identify health metrics (complexity, coverage, dead code) | Pending |
| 3.2 | Pipeline step that measures metrics on each merge | Pending |
| 3.3 | Auto-create Board item when threshold is crossed | Pending |
| 3.4 | Wiki page showing current health snapshot | Pending |

### Phase 4 — Unified Knowledge View

Goal: one wiki page showing the full knowledge graph — requirements, specs, code nodes — as a navigable Mermaid diagram.

| # | Item | Status |
|---|------|--------|
| 4.1 | Define schema: requirements → specs → code modules | Pending |
| 4.2 | Generator emits one combined diagram from all three sources | Pending |
| 4.3 | Pipeline pushes combined diagram to wiki on merge | Pending |
| 4.4 | Clickable nodes link to Board items, GitHub files, spec pages | Pending |

---

## Deferred

- Semantic querying (SPARQL, graph DB).
- External ontology alignment (EVOC, CSO).
- Multi-repo knowledge linking.
- AI-driven requirement generation or spec drafting as pipeline steps.
