# System Model

## Purpose

This document names the core entities and relationships for the MVP before the
major features are implemented.

It is intentionally product-first and Neo4j-native. It does not model ontology,
RDF, SPARQL, OWL inference, or external vocabulary alignment.

## Core Principle

Everything the user can organize as knowledge is a node.

Groups are real nodes. Slides are real nodes. A collapsed group is still a real
node; collapse is a frontend view state, not a different persisted entity.

## Node Labels

All user-facing graph objects share the base label:

- `KnowledgeNode`

Specialized labels can be added when useful:

- `SlideNode` - created from one imported PowerPoint slide.
- `GroupNode` - created when the user groups nodes.

Initial implementation can multi-label nodes:

```cypher
(:KnowledgeNode:SlideNode)
(:KnowledgeNode:GroupNode)
```

## Node Properties

Common properties:

- `id` - stable application id.
- `title` - user-visible title.
- `content` - editable text/body content for the node.
- `positionX` - canvas x coordinate.
- `positionY` - canvas y coordinate.
- `createdAt` - creation timestamp.
- `updatedAt` - last update timestamp.

Slide-specific properties:

- `sourceType` - expected first value: `pptx`.
- `sourceDeck` - imported deck identifier or filename.
- `sourceSlideIndex` - original slide index.

Group-specific properties:

- `groupLabel` is not separate from `title`; the group title is the label.

Frontend-only view state:

- expanded/collapsed state;
- current selection;
- hover state;
- temporary drag state.

Collapse state may be persisted later if users expect saved views. It is not
part of the first durable model.

## Relationship Types

### `CONTAINS`

Group containment.

```text
(:GroupNode)-[:CONTAINS { order }]->(:KnowledgeNode)
```

Rules:

- A group may contain slide nodes.
- A group may contain other group nodes later.
- Containment cycles are not allowed.
- First implementation assumes one parent group per node.

### `FOLLOWS`

Presentation or imported slide order.

```text
(:KnowledgeNode)-[:FOLLOWS { pathId, orderSource }]->(:KnowledgeNode)
```

Initial `orderSource` values:

- `imported-slide-order`
- `user-edited`

### `RELATES_TO`

General manual graph connection.

```text
(:KnowledgeNode)-[:RELATES_TO { label }]->(:KnowledgeNode)
```

This is intentionally broad for the first MVP. More specific relationship
types can emerge after the core node-building experience is usable.

### `DERIVED_FROM`

Source provenance.

```text
(:KnowledgeNode)-[:DERIVED_FROM]->(:SourceSlide)
```

This may be deferred if we do not create source nodes in the first PPTX import.
For the smallest import, slide provenance can live as properties on `SlideNode`.

## Collapse Rendering

Collapse does not change the persisted graph.

When a group is expanded:

- render the group boundary or group node;
- render contained child nodes;
- render real child edges.

When a group is collapsed:

- hide contained child nodes;
- render the group node as the visible representative;
- render proxy edges from the collapsed group to outside nodes.

Proxy edges are computed in the frontend view model. They are not stored in
Neo4j.

Proxy edge rule:

- if hidden child edges share the same outside target and same relationship
  type, render one bundled edge with a count;
- if hidden child edges share the same outside target but have different
  relationship types, first try rendering separate proxy lines;
- if separate lines are too noisy, use a stacked or bundled visual fallback.

## Constraints To Enforce In App Code

- No `CONTAINS` cycles.
- No node can contain itself.
- First version: one parent group per child node.
- Deleting a group should not delete child nodes by default.
- Collapsing a group should not mutate graph data.

## Open Questions

- Should `FOLLOWS` represent one global presentation path or multiple named
  paths?
- Should source slides become separate `SourceSlide` nodes, or remain
  properties on `SlideNode` for v1?
- When should collapsed/expanded state become persisted user view state?
