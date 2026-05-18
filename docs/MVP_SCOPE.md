# MVP Scope

## Product Slice

The MVP is a course-authoring and presentation tool built around a graph of
knowledge nodes.

The first useful workflow is:

1. Import a PowerPoint deck.
2. Create one node per slide.
3. Show the imported nodes on the canvas.
4. Let the user edit node labels and content.
5. Let the user connect nodes manually.
6. Let the user collapse related sub-nodes into a higher-level node.
7. Let the user build a presentation path through selected nodes.
8. Let the user present or preview that path.

## Data Model, First Pass

Neo4j stores the graph directly.

Node labels:

- `KnowledgeNode`
- optional secondary labels such as `SlideNode`, `ConceptNode`, `GroupNode`

Core node properties:

- `id`
- `title`
- `content`
- `sourceType`
- `sourceDeck`
- `sourceSlideIndex`
- `positionX`
- `positionY`
- `collapsed`
- `createdAt`
- `updatedAt`

Relationship types:

- `FOLLOWS` - imported or user-edited presentation order
- `CONTAINS` - group or higher-level node contains child nodes
- `RELATES_TO` - general manual graph connection
- `DERIVED_FROM` - node came from a source slide or source block

## Implementation Order

1. Remove ontology-era services from startup.
2. Keep the current ReactFlow prototype running.
3. Add a backend boundary for graph read/write.
4. Add Neo4j seed and health checks.
5. Add PPTX parsing.
6. Convert PPTX slides to nodes.
7. Render imported nodes on the canvas.
8. Add node editing.
9. Add grouping and collapse.
10. Add presentation path editing.
11. Add presentation preview.

## What Would Make The MVP Defensible

- Import is concrete: a real `.pptx` produces graph nodes.
- The graph is not just decorative: users can reshape it.
- Collapse changes the working representation, not only the visual style.
- Presentation path is derived from or edited against graph nodes.
- Neo4j contains the durable state shown on the canvas.

## Deferred

- Ontology-guided typing.
- Inference.
- Validation rules beyond simple app checks.
- Automatic clustering.
- External ontology mapping.
- Multi-format import.
