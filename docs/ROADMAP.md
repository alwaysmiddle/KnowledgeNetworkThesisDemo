# Roadmap

## Purpose

This is the project control surface for the thesis demo. It tracks the order of
implementation, the design status of each feature, and the verification needed
before moving on.

The repository itself is the source of truth. We are not using Jira, Azure
DevOps, or GitHub Projects yet.

## Working Rule

Each slice should follow this loop:

```text
design the smallest feature contract
implement the slice
verify the behavior
update this roadmap
commit
```

## Current Product Direction

Build a PowerPoint-to-knowledge-node authoring demo:

1. Import a PowerPoint deck.
2. Create one graph node per slide.
3. Let the user organize imported nodes on a canvas.
4. Let the user group and collapse nodes into higher-level nodes.
5. Let the user build and preview a presentation path through the graph.

Ontology, inference, RDF, SPARQL, external ontology alignment, and automatic
clustering are deferred.

## Milestones

| ID | Slice | Design | Build | Verify | Notes |
|---|---|---:|---:|---:|---|
| M0 | Reset docs and startup scope | Done | Done | Done | Old design archived; Neo4j-only startup. |
| M1 | Neo4j graph model | In progress | Not started | Not started | First feature spec: `features/001-neo4j-graph-model.md`. |
| M2 | Backend graph API | Not started | Not started | Not started | Read/write nodes, relationships, groups. |
| M3 | PPTX import | Not started | Not started | Not started | One slide maps to one node. |
| M4 | Canvas organization | Not started | Not started | Not started | User arranges imported slide nodes. |
| M5 | Group and collapse | Not started | Not started | Not started | Group nodes, containment, collapsed proxy edges. |
| M6 | Presentation path | Not started | Not started | Not started | Slide order first; user-editable path later. |
| M7 | Presentation preview | Not started | Not started | Not started | Walk selected nodes as presentation sequence. |

## Immediate Next Slice

Finish the Neo4j graph model contract:

- node labels and required properties;
- relationship types and required properties;
- containment rules;
- collapse rendering rules;
- basic constraints and indexes;
- verification queries.

Then implement only enough backend and seed data to prove that model.

## Definition Of Done For A Slice

- The user behavior is stated.
- The data model is explicit.
- The out-of-scope list is explicit.
- The implementation is committed.
- Relevant build/lint/test checks pass.
- This roadmap reflects the new status.
