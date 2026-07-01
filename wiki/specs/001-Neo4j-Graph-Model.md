---
node: spec-001-neo4j
type: spec
title: Neo4j Graph Model
status: in-progress
edges:
  - rel: refines
    to: spec-system-model
  - rel: implements
    to: roadmap
  - rel: builds
    to: architecture
---

# Feature 001 - Neo4j Graph Model

## Status

Design in progress. Implementation not started.

## User Behavior

The app needs a durable graph model before PPTX import can land anywhere real.

This feature enables the app to store and retrieve:

- slide nodes;
- group nodes;
- containment relationships;
- simple manual relationships;
- imported or user-edited presentation order.

## Data Model

Node labels:

- `KnowledgeNode`
- `SlideNode`
- `GroupNode`

Relationship types:

- `CONTAINS`
- `FOLLOWS`
- `RELATES_TO`

Optional later relationship:

- `DERIVED_FROM`

Required node properties:

- `id`
- `title`
- `content`
- `positionX`
- `positionY`
- `createdAt`
- `updatedAt`

Slide properties:

- `sourceType`
- `sourceDeck`
- `sourceSlideIndex`

Relationship properties:

- `CONTAINS.order`
- `FOLLOWS.pathId`
- `FOLLOWS.orderSource`
- `RELATES_TO.label`

## Constraints

Neo4j should enforce what it can:

```cypher
CREATE CONSTRAINT knowledge_node_id IF NOT EXISTS
FOR (n:KnowledgeNode)
REQUIRE n.id IS UNIQUE;

CREATE INDEX knowledge_node_title IF NOT EXISTS
FOR (n:KnowledgeNode)
ON (n.title);
```

The app must enforce:

- no containment cycles;
- no self-containment;
- first version has one parent group per child node.

## Out Of Scope

- PPTX parsing.
- Ontology or RDF modeling.
- Inference.
- Automatic grouping.
- Persisted collapsed/expanded view state.
- Multiple presentation paths.

## Verification

Manual verification queries:

```cypher
MATCH (n:KnowledgeNode)
RETURN count(n);
```

```cypher
MATCH (g:GroupNode)-[:CONTAINS]->(child:KnowledgeNode)
RETURN g.title, collect(child.title);
```

```cypher
MATCH path = (a:KnowledgeNode)-[:FOLLOWS*]->(b:KnowledgeNode)
RETURN path
LIMIT 5;
```

Implementation verification should prove:

- constraints can be applied to an empty Neo4j database;
- seed slide and group nodes can be created;
- grouped children can be queried;
- presentation order can be queried;
- no ontology-era services are required.
