# Project Context

This file contains project references that may become stale. It is separated
from `CLAUDE.md` so durable agent guidance does not accumulate changing state.

Check `ROADMAP.md` before implementing from anything in this file.

## Active Source Files

Start with:

1. `wiki/Home.md` - wiki index and working loop.
2. `wiki/Roadmap.md` - current implementation order and status.
3. `wiki/specs/System-Model.md` - shared Neo4j-native system model.
4. `wiki/specs/Feature-Spec-Convention.md` - feature-spec convention.
5. The relevant feature spec under `wiki/specs/`.

Current first feature spec:

- `wiki/specs/001-Neo4j-Graph-Model.md`

## Current Product Direction

Build a PowerPoint-to-knowledge-node authoring demo:

- one PowerPoint slide maps to one graph node;
- slide order becomes the initial presentation path;
- users organize imported nodes on a ReactFlow canvas;
- users create manually labeled groups;
- groups are real Neo4j `GroupNode`s;
- containment is modeled with `CONTAINS` relationships;
- collapsed/expanded state stays in frontend state for now;
- collapsed groups render proxy edges to outside nodes.

## Explicitly Deferred

- Ontology-guided typing.
- RDF, SPARQL, Fuseki/Jena, OWL reasoning.
- EVOC/CSO alignment.
- Automatic clustering.
- Multi-format import.

## Archive Boundary

Old ontology/reflexivity-heavy design work is archived under:

- `wiki/_archive/2026-05-18-pre-reset-design/`

Use the archive only as reference or historical context. Do not treat
`KnowledgeNetworkDemo-design` or the archive as current architecture unless the
active docs explicitly pull something forward.
