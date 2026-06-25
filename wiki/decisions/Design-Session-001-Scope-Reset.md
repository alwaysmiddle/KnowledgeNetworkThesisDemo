# Design Session 001 - Scope Reset

## Decision

Restart the thesis demo design from a smaller implementation-first scope.

The previous ontology-centered direction is archived for reference. The active
demo will use Neo4j's property graph model directly and focus on the product
experience: turning imported course material into a usable node network and a
presentation path.

## Why This Reset Exists

The ontology direction may become valuable, but it creates a large conceptual
and implementation surface before the thesis demo has a finished core tool.

The priority is now to finish a defensible demo:

- a user can import PowerPoint slides;
- the system creates nodes from those slides;
- the user can inspect and reshape the node network;
- the user can collapse detailed nodes into higher-level nodes;
- the user can build a presentation sequence from the graph.

## Active Assumptions

- Neo4j is the authoritative graph store.
- The current ReactFlow canvas implementation is the starting UI.
- Node and relationship types are application-level labels, not ontology
  commitments.
- The first import path is PPTX.
- Slide order becomes the initial presentation order.
- Collapsing nodes is a user-facing authoring operation, not an inference rule.
- Presentation is a first-class output, not an afterthought.

## Non-Goals For This Slice

- RDF storage.
- SPARQL query templates.
- Fuseki/Jena services.
- OWL reasoning.
- EVOC clustering service.
- CSO or external ontology alignment.
- Fully automated course generation.

## Design Question For The Next Session

What is the smallest PowerPoint-to-node mapping that feels useful rather than
mechanical?

Candidate starting answer:

- one slide becomes one node;
- slide title becomes node title;
- slide body becomes node content;
- speaker notes become node notes;
- slide order becomes the first presentation path.
