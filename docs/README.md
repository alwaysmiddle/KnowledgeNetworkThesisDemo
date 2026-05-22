# KnowledgeNetworkThesisDemo Docs

## Active Direction

This repository has been reset around a thesis-first MVP:

1. Import PowerPoint material.
2. Convert slides into editable knowledge nodes.
3. Let the user build, merge, collapse, and arrange nodes on a graph canvas.
4. Let the user produce and rehearse a presentation path through the graph.

Ontology, RDF, SPARQL, Fuseki, OWL inference, EVOC, and CSO alignment are not
part of the starting implementation. They remain reference ideas for later,
after the core node-building and presentation experience works.

## Current Active Docs

- `DESIGN_SESSION_001_SCOPE_RESET.md` - the new starting decision.
- `MVP_SCOPE.md` - the current implementation slice.
- `ROADMAP.md` - implementation order and status.
- `SYSTEM_MODEL.md` - shared Neo4j-native model for nodes, groups, edges, collapse, and presentation paths.
- `features/` - short specs for build-ready slices.

## Working Loop

Use this loop for each MVP slice:

```text
roadmap -> system model -> feature spec -> implementation -> verification -> commit
```

Do not introduce external project-management tooling until the repo docs stop
being enough.

## Archived Reference

The previous design corpus is preserved at:

- `_archive/2026-05-18-pre-reset-design/`

Use the archive for ideas and historical reasoning, but do not treat it as the
active architecture.
