# ADR-003: Reflexivity as Architectural Foundation

**Status:** Accepted
**Date:** 2026-04-20
**Deciders:** Shizhong Yu
**Supersedes (in part):** ADR-001 storage decision, KNOWLEDGE_NODE_MODEL.md schema, phase-2 TYPE_SYSTEM_DESIGN.md
**Context area:** Foundational — affects every layer of the system

---

## Context

Prior design work (Sessions 1–7) built toward a thesis titled *Knowledge Graph Based Course Visualization.* The architecture settled on Neo4j as primary store, dual-label node typing (`:KnowledgeNode:Concept`), fixed TypeScript-union node types (9 types), and fixed Neo4j relationship types (15 edges). Types were structural commitments of the schema. Labels were optimizations. The design was internally consistent and buildable.

During Session 7's final review, a tension surfaced. The user's founding principle — stated by him and his wife in Session 2, and carried forward in KNOWLEDGE_NODE_MODEL.md — is that **everything is a node, and hierarchy is a view, not a storage artifact**. The dual-label strategy silently violated this principle. Types were baked into structure; the type system was invisible to the graph that was supposed to describe everything.

On 2026-04-20, the user confronted this contradiction directly and made the architectural commitment this ADR records.

> *"The system is extensible in the utmost sense, when everything is a node. The theoretical purity here isn't just a gimmick, it's the whole point of the system. The visual system should be able to display all information stored in itself as its own recursive graph, with the pipeline visualizing all aspects of itself."*

This is not a feature addition. It is a reframe of what the thesis contributes. The system is no longer "a course visualizer." It is **a reflexive knowledge authoring system, in which the model is data and the visualization pipeline can render its own structure**. The course curriculum is the demonstration case.

---

## Decision

**We commit to full reflexivity across three levels.** The knowledge graph engine represents its own type system, its own relationship vocabulary, and its own relationship instances as first-class nodes. There is no schema layer hidden from the graph. There is no privileged meta-layer inaccessible to the user. The system can visualize, query, reason about, and author every aspect of itself using the same primitives it uses for domain data.

### The Three Levels of Reflexivity

**Level 1 — Node types are nodes.**
Every domain node has an outgoing `type_of` edge to a type node. Type nodes are ordinary nodes with their own properties (label, description, visual style, provenance). Type nodes participate in a subtype hierarchy via `subtype_of` edges. Adding a new node type is an authoring act, not a schema migration.

**Level 2 — Edge types are nodes.**
Every edge carries a `type_of` reference to an edge-type node. Edge-type nodes are first-class: they have properties (e.g., OWL semantic class — transitive, symmetric, functional), descriptions, visual styling, and their own edges (e.g., `inverse_of` between `demonstrates` and `is_demonstrated_by`). Adding a new edge type is an authoring act. The vocabulary of relationships is itself a subgraph.

**Level 3 — Edges themselves are nodes (reification).**
Every edge is represented as a node with `source` and `target` references, plus a `type_of` reference to its edge-type node. This unlocks:

- **Annotations on edges** (provenance, confidence, authorship, timestamps)
- **Edges about edges** (e.g., "this prerequisite edge was derived from that other edge")
- **Versioning and history** (edges can be marked as deprecated, replaced, retracted)
- **Uniform traversal** (the same query can walk domain edges and meta-edges)

### The Meta-Model Layer

To support reflexivity, a small bootstrap graph exists before any domain data. It defines the primitive node types, primitive edge types, and the `type_of` / `subtype_of` edges that form the reflexive closure.

The meta-model is itself expressed in the same node/edge primitives. The `type_of` edge is itself an edge-type node. `Node` is itself a type node. The bootstrap contains a fixed point — a small set of nodes that describe themselves — and every other type in the system is authored on top of it.

This bootstrap graph is described in detail in `META_MODEL_DESIGN.md` (to be written after this ADR is accepted).

### Storage Decision

**Apache Jena Fuseki becomes the primary and sole graph store.** Neo4j is removed from the architecture.

Rationale:

- RDF is natively reflexive. Resources can be subjects, predicates, or objects. Classes are resources. Properties are resources. The stack (data / schema / meta-schema) lives in one homogeneous model.
- RDF-star (supported in Jena 4.x) provides native edge reification, eliminating the need for a separate reification pattern.
- OWL reasoning — already required for the `assesses` derivation — becomes first-class instead of a separate subsystem. Inference runs over the same store that holds data.
- One less service to orchestrate, one less sync problem, one less source of truth.
- SPARQL queries can express reflexive patterns (e.g., "give me every edge type and all its instances") that are awkward in Cypher.

The cost is tooling maturity. Neo4j Browser is more polished than Fuseki's UI. We absorb this cost. The visualization we build will render the graph — including the meta-model — using the same React-based pipeline regardless of store.

### Backend Role

The C# backend becomes a thin adapter. It:

- Translates SPARQL query results into rendering-friendly JSON for the frontend
- Exposes REST endpoints that map to SPARQL templates
- Manages the bootstrap (loads the meta-model on first startup)
- Hosts the inference trigger (runs OWL reasoning, writes derived triples back)

It holds **no hardcoded type knowledge**. Types come from the graph. The backend is type-agnostic.

### Frontend Role

The React frontend renders what the backend gives it. It:

- Operates on a uniform `{nodes: [...], edges: [...]}` shape
- Styles nodes and edges based on properties read from their type nodes (the style is data, not hardcoded)
- Has no hardcoded type list, no TypeScript union of fixed types
- Can render the meta-model itself with the same components that render domain data

---

## Rationale

### Why Full Reflexivity, Not Level 1 Alone

Level 1 is comprehensible to anyone trained in object-oriented type systems. Level 2 and Level 3 are harder. The temptation is to commit only to Level 1 and treat Levels 2 and 3 as "future work."

We reject this. Three reasons:

**1. The levels are philosophically connected.** If types are data, then edge types should also be data. If edge types are data, then edge instances should be uniform with node instances. Stopping at Level 1 preserves a privileged layer for edges — which violates the principle that every structural element of the system is authorable and inspectable.

**2. The thesis contribution requires all three.** A "reflexive system" with a hidden edge layer is not a reflexive system. The novelty is uniform self-description. Level 1 alone is insufficient to make that claim.

**3. Level 3 unlocks the visualization goal.** The user's vision — "the pipeline visualizing all aspects of itself" — requires edges to be visualizable as nodes. You cannot visualize the authorship history of a prerequisite relationship if the edge is just a typed link. You can visualize it if the edge is a node with its own edges to authors, timestamps, and supporting evidence.

### Why Jena Over Neo4j

Neo4j's property graph model has a structural ceiling: edges are not first-class entities. Supporting Level 3 in Neo4j requires edge reification — representing each edge as a node with explicit source/target pointer edges. This works but is ergonomically adversarial. Every query must account for the reification.

RDF and SPARQL handle this natively. RDF-star (a W3C community extension, now standardized in RDF 1.2) makes edge annotation a first-class operation: `<< :a :knows :b >> :confidence 0.9` is a single statement asserting a triple and an annotation about it. SPARQL-star extends querying symmetrically.

Choosing Jena is choosing a tool whose semantic model matches our commitment. We stop fighting the tool.

### Why Now, Not Later

The thesis demo is still pre-implementation. No code has been written that would be invalidated. Design artifacts will be invalidated — measured in documents, not in working systems. The cost of pivoting now is measured in days of design work. The cost of pivoting after implementation would be measured in weeks or months.

This is the last moment where the pivot is cheap.

---

## Consequences

### What This Invalidates

**Fully invalidated:**

- `NEO4J_SCHEMA_DDL.md` — entire document. Neo4j is not used.
- `ADR-001` storage decision — superseded.
- Dual-label strategy and fixed relationship types.
- TypeScript union of 9 node types as a closed set.

**Requires significant rework:**

- `KNOWLEDGE_NODE_MODEL.md` — base node becomes minimal. Type information moves to `type_of` edges. Most of the schema section is replaced.
- `phase-2-type-system/TYPE_SYSTEM_DESIGN.md` — TypeScript types become a reflection of the *current* graph contents, not the fixed schema. The meta-model becomes the authoritative type source.
- `phase-1-domain-data/DOMAIN_DATA_DESIGN.md` — the 559-node inventory is preserved, but the encoding changes from labeled nodes to `type_of`-linked nodes.
- `ADR-002 (sys vs domain edges)` — the principle holds, but the implementation shifts. Both system and domain edges are edge-type nodes. The `sys:` prefix becomes a property of the edge-type node, not a namespace in the edge identifier.
- `phase-5-inference-backend/INFERENCE_BACKEND_DESIGN.md` — mostly carries over. Jena was already the inference engine. The change is that Jena is now primary, not secondary.

**Carries forward:**

- Phase 3 layered views — still works. Filtering by type means filtering by `type_of` target; the logic is unchanged.
- Phase 4 traversal strategies — the three strategies (Linear, Explore, Problem-First) are queries. They work on any graph.
- Phase 6 validation — Cypher queries become SPARQL queries. The rules themselves are unchanged.
- Phase 7 EVōC — unchanged. Clustering operates on embeddings, not on the storage model.

### What This Enables

- **User-authored type systems.** A professor can define new node types, new edge types, new OWL semantics — as authoring acts. No code changes, no schema migrations.
- **Inspectable semantics.** The question "what does this edge type mean?" is answered by walking edges from the edge-type node. No separate documentation layer.
- **Cross-domain portability.** Because types are data, importing a different domain (law school, medicine) means loading a different meta-model. Same code, same visualization, different data.
- **Recursive visualization.** "Show me the type system" is the same kind of query as "show me CS101." The visualization pipeline treats them identically.
- **Provenance and reasoning.** With Level 3, every edge can carry its derivation history. Inference becomes auditable. The user can ask "why does the system think this assessment covers this concept?" and walk the reasoning chain as a graph.

### New Risks

- **Performance.** SPARQL over a reflexive graph is slower than label-scoped Cypher. At 559 domain nodes + ~30 meta-model nodes + ~15 edge-type nodes + reified domain edges (~thousands), we are still well within Jena's in-memory performance envelope. Scale beyond 10K+ nodes will require reconsideration. This is an acceptable limit for the thesis demo.
- **Tooling.** Jena's development tooling is less polished than Neo4j's. We build our own visualization, so this matters less than it might. Where we need introspection during development, we will lean on Fuseki's query interface.
- **Learning curve.** SPARQL is less familiar to most developers than Cypher. The primary developer has not used SPARQL extensively. This is a learnable cost.
- **Meta-model design is genuinely hard.** The bootstrap — the small set of nodes that describe themselves — must be gotten right. Errors in the bootstrap propagate everywhere. We will dedicate a full design document to it before any implementation.

---

## Thesis Reframing

The thesis title and framing change.

**Before:** *Knowledge Graph Based Course Visualization.*
The course graph is the contribution. Visualization is the demonstration.

**After:** *A Reflexive Knowledge Authoring System, Demonstrated Through Course Curriculum Visualization.*
The reflexive system is the contribution. The curriculum is the demonstration.

The thesis claims change accordingly. A new claims table will be written, but the direction is:

1. **Reflexivity claim.** The system represents its own type system, edge vocabulary, and edge instances as first-class graph elements. Demonstrated by rendering the meta-model using the same pipeline that renders domain data.
2. **Extensibility claim.** The user can author new node types, edge types, and domain instances through a uniform interface. Demonstrated by introducing a previously-unseen node type (e.g., "Misconception") mid-demo and showing the system adapts without code changes.
3. **Reasoning claim.** The system performs OWL reasoning over its own semantics and data. Demonstrated by inference-derived edges with walkable provenance.
4. **Curriculum visualization claim.** The system supports three complexity levels, three traversal strategies, and layered views as previously designed. Retained from prior thesis framing, now understood as demonstrations of the underlying reflexive engine.
5. **Validation claim.** The system supports user-defined structural validation rules (e.g., "no prerequisite cycles"). Retained.
6. **Pedagogical claim.** The resulting tool supports curriculum authoring in a way that makes knowledge structure inspectable and reasoning transparent. Retained.

The defense becomes far stronger. The question "why not just use a labeled graph database?" now has a thesis-level answer: because the system must be able to describe, reason about, and visualize its own structure as data.

---

## Implementation Path

The pivot is staged. Each stage produces a coherent artifact that is defensible on its own.

### Stage 0 — Accept this ADR

Accepted 2026-04-20 by Shizhong Yu.

### Stage 1 — Meta-Model Design

Write `META_MODEL_DESIGN.md`. This is the most foundational document in the project. It specifies:

- The bootstrap graph (the minimal set of self-describing nodes)
- Primitive node types and their properties
- Primitive edge types and their OWL semantics
- How the meta-model loads into Jena at system startup
- How the reflexive closure is achieved (the fixed-point construction)

### Stage 2 — Invalidate and Rewrite Foundational Docs

- Replace `KNOWLEDGE_NODE_MODEL.md` with reflexive schema
- Rewrite `phase-2-type-system/TYPE_SYSTEM_DESIGN.md` as a meta-model reflection layer
- Amend `ADR-001` with a pointer to this ADR and the Jena-primary decision
- Update `ADR-002` to reflect that system vs domain is a property of edge-type nodes
- Redo `THESIS_DEMO_GAP_ANALYSIS.md` with new blocking gaps

### Stage 3 — Domain Data Re-Encoding

Rewrite the 559-node inventory in the reflexive encoding:

- Each node has `type_of` edges to meta-model type nodes
- Each domain edge is a reified edge node
- The full graph loads into Jena as Turtle (`.ttl`) files

### Stage 4 — Backend and Rendering

- C# backend with SPARQL query templates
- `GET /api/graph` returns rendering-ready JSON
- React renders uniformly, styled by meta-model properties

### Stage 5 — Visualization of the Meta-Model

Demonstrate reflexivity explicitly: a view in the system that renders the type system itself, using the same visualization pipeline.

### Stage 6 — Authoring, Traversal, Inference, Validation

All prior phases (3–7) are implemented on top of the reflexive foundation. Most of their design carries forward with minor encoding adjustments.

### Stage 7 — Thesis Demo

The demonstrable prototype that defends the full thesis. Target: December.

---

## Acceptance

Accepted 2026-04-20 by Shizhong Yu. Three-level reflexivity, Jena-primary, thesis reframe, and December timeline confirmed.

This ADR is now the binding reference. All subsequent design work conforms to it. Future deviations from the commitment require a new ADR that supersedes this one — not a quiet drift in implementation.

---

## Note on the Decision Process

This pivot was not planned. It emerged from a direct confrontation on 2026-04-20 between the user's founding principle and the accumulated pragmatism of the design. The previous design was not wrong; it was a local optimum reached by small, individually-justified trade-offs. The confrontation revealed that the local optimum had drifted from the global intent.

This is recorded not for sentiment but as methodological evidence: architectural principles must be re-examined periodically against implementation artifacts. Design review is not optional. When the principle and the artifact diverge, one of them is wrong, and the question of which must be answered.

Here, the principle held. The artifact was revised.
