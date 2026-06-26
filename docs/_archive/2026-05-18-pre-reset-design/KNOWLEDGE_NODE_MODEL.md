# Knowledge Node Model

**Status:** Rewritten 2026-04-21 to align with [ADR-003](ADR-003-reflexivity-as-foundation.md) and [META_MODEL_DESIGN.md](META_MODEL_DESIGN.md). Reconciled 2026-05-05 to ADR-005 namespace addendum + deferred-bucket resolutions + ADR-006 (node-as-document binding).
**Scope:** Domain-layer node model. Specifies what a user-authored knowledge node looks like on top of the reflexive meta-model.
**Deciders:** Shizhong Yu

> **Before reading this doc, read [META_MODEL_DESIGN.md](META_MODEL_DESIGN.md).**
> That document defines the four primitive node types (`kn:Node`, `kn:NodeType`,
> `kn:EdgeType`, `kn:Edge`) and the bootstrap graph. This document describes the
> *domain layer* that sits on top of that foundation.

> **Reconciliation note (2026-05-05).** Namespaces and lifecycle predicates
> updated per ADR-005 addendum + deferred-bucket resolutions: `knm:` →
> `knl:` (engine standard library, narrowed to engine-required edges) +
> `cs:` (user namespace, demo curriculum); `knd:` → `cs:`. Per Reading A,
> lifecycle predicates (`kn:on_delete`, `kn:exclusive`, `kn:auto_created`,
> `kn:user_editable`) and the artifact-as-node-type design are out of the
> graph in v1 — ADR-006's `kn:body_ref` replaces document-binding
> predicates. Predicate swaps: `kn:description` → `rdfs:comment`;
> `kn:authored_by` / `kn:created_at` → `prov:wasAttributedTo` /
> `dcterms:created`.

---

## Relationship to the Meta-Model

The meta-model (Level 1 / `kn:*`) defines what a node is. This document
describes how *domain* nodes — the things a professor actually authors,
like "Merge Sort" or "Stability" — fit into that structure.

```
Level 1 (kernel)     : kn:Node, kn:NodeType, kn:EdgeType, kn:Edge           (in META_MODEL_DESIGN.md)
Engine std lib       : knl:prerequisite_of, knl:demonstrates, knl:assesses… (in standard-lib.ttl)
Level 2 (demo types) : cs:Concept, cs:Principle, cs:Course, cs:teaches…     (in TYPE_SYSTEM_DESIGN.md)
Level 3 (instances)  : cs:MergeSort, cs:Stability, cs:edge_0042…            (this document)
```

**A domain node is an `rdf:type` (equivalently `kn:type_of`) instance of a
demo-curriculum node type.** The demo node type is itself a node of type
`kn:NodeType`, which is itself a node of type `kn:NodeType` (the fixed
point). Three levels, one graph.

---

## Core Principle: Everything Is a Node

Every entity in the system — knowledge items, types, edges, edge types,
visual styles, property descriptors, artifacts — is a `kn:Node`. Structure
lives in edges, not in nested data structures.

Consequences:

- Types (e.g., `cs:Concept`) are nodes — they can be queried, annotated,
  versioned, and styled.
- Edges (e.g., "Merge Sort is a prerequisite of Quicksort") have
  identity — each is a `kn:Edge` node with `kn:source`, `kn:target`, and
  `kn:type_of` references. Annotations like authorship and confidence attach
  to the edge node.
- Edge types (e.g., `knl:prerequisite_of`) are nodes — they can declare OWL
  characteristics, visual styles, and category membership.

This is the reflexivity commitment. See [ADR-003](ADR-003-reflexivity-as-foundation.md).

---

## Hierarchy Is Computed, Not Stored

A knowledge node does **not** store a `parentId` or `childrenIds`.
Parent/child relationships are always **derived** from context:

| Context | How hierarchy is computed |
|---|---|
| Explicit authoring | Domain edges (`cs:generalizes`, `cs:is_component_of`) |
| Lifecycle / ownership | Kernel edge (`kn:contains`, per ADR-006) |
| Semantic similarity | Word embeddings → EVōC clustering |
| Traversal intent | Active strategy (Linear, Explore, Problem-First) |
| Complexity level | Node-type filter (Level 1–4 in the demo) |

**Hierarchy is a view.** The same node can appear as a child in one context
and a parent in another.

---

## Domain Node Shape

A domain node is an RDF resource with the following shape. Only the first
three are mandatory; everything else is optional.

| Property | RDF | Purpose |
|---|---|---|
| identity | URI (`cs:…`) | Globally-unique resource identifier |
| type | `kn:type_of` → `cs:<NodeType>` | What kind of thing it is |
| label | `rdfs:label` (literal) | Human-readable name |
| comment | `rdfs:comment` (literal) | Short description; also the embedding source for short-form nodes (W3C standard; replaces former `kn:description`) |
| body binding | `kn:body_ref` → `urn:knd-body:…` (opaque URN) | Link to external block-editor document body in the SQLite doc store (per ADR-006) |

Turtle example:

```turtle
cs:MergeSort
    a                    cs:Concept ;
    rdfs:label           "Merge Sort" ;
    rdfs:comment         "Divide-and-conquer sorting algorithm with O(n log n) time."@en ;
    kn:body_ref          <urn:knd-body:doc_ms_001> .
```

Type-specific extra properties (e.g., `cs:course_code` on Course nodes, `cs:format`
on Assessment nodes) are stored as plain RDF triples in v1 — values use typed
literals where appropriate (e.g., `cs:format "test"^^xsd:string`). The
graph-native `kn:PropertyDescriptor` machinery is in ADR-005's deferred
bucket; see TYPE_SYSTEM_DESIGN §3 for the v1 plain-triple catalog and the
preserved deferred design.

---

## Edges in the Domain

Every authored edge is a `kn:Edge` node. Reified form is the canonical
storage; classical form is derived by SPARQL CONSTRUCT at load time (see
META_MODEL_DESIGN §"Dual-form edges"). Authors and UIs interact with
classical form for simplicity; the reified form is available for annotation.

Turtle example (reified):

```turtle
cs:edge_0042
    a                    kn:Edge ;
    kn:type_of           knl:prerequisite_of ;
    kn:source            cs:MergeSort ;
    kn:target            cs:Quicksort ;
    prov:wasAttributedTo cs:ProfChen ;
    dcterms:created      "2026-03-15T09:22Z"^^xsd:dateTime .
```

Classical form (derived):

```turtle
cs:MergeSort knl:prerequisite_of cs:Quicksort .
```

Both coexist in the store. Authorship and timestamps use W3C standards
(`prov:wasAttributedTo`, `dcterms:created`) per ADR-005's preference for
community vocabularies over invented `kn:*` predicates.

---

## System vs Domain Edges

The conceptual distinction from [ADR-002](ADR-002-system-vs-domain-namespace.md)
still holds: **system edges manage lifecycle**, **domain edges carry meaning**.

With reflexivity, the distinction is no longer a URI prefix. Every edge type
is a `kn:EdgeType` node carrying an `kn:edge_category` property:

| `kn:edge_category` | Examples | Owner | UI visibility |
|---|---|---|---|
| `"system"` | `kn:contains`, `kn:type_of`, `kn:body_ref` | Engine | Hidden by default, power-user toggle |
| `"domain"` | `knl:prerequisite_of`, `cs:contains`, `cs:teaches` | Professor | Always visible |
| `"derived"` | `knl:assesses` (and other inferred edges) | Reasoner | Visible, visually distinct |

Both categories can coexist on the same node pair. A node might have both
`kn:contains` (kernel structural binding, per ADR-006) and `cs:is_component_of`
(semantic part-of) pointing at it from the same owner — these are
independent axes.

See TYPE_SYSTEM_DESIGN.md for the full edge-type catalog with categories.

---

## `kn:contains` — Lifecycle Ownership (Kernel Symbol)

The kernel structural parent-child edge from ADR-006. Defines subnode
ownership: the relationship where one node's lifecycle is bound to another
through document-internal containment (block → child node) or organizational
binding.

> **Naming history.** Pre-2026-04-28 this was called `knm:sys_contains` and
> was authored at meta-instance level. ADR-006 promoted it to a kernel symbol
> (`kn:contains`) as part of the node-as-document binding decision. The
> demo-curriculum organizational containment (Course → Concept) lives at a
> different URI, `cs:contains` (URI-distinct from `kn:contains`).

### Behavioral properties — out of graph in v1 (Reading A)

> **Reading A status.** Per ADR-005, lifecycle behavioral properties
> (`kn:on_delete`, `kn:exclusive`, `kn:auto_created`, `kn:user_editable`)
> are **not** in the v1 graph. They are app-config or code constants
> attached to the kernel `kn:contains` semantics. The design below is
> preserved as candidate Reading B/C content if lifecycle properties are
> later promoted to graph-native data.

Candidate per-edge-instance properties (deferred):

| Property | Values | Meaning |
|---|---|---|
| (deferred) on-delete | `"cascade"`, `"detach"`, `"prevent"` | Action when owner is deleted |
| (deferred) exclusive | `true` / `false` | Can target have ≥2 ownership edges? |
| (deferred) auto-created | `true` / `false` | Did the tool create this? |
| (deferred) user-editable | `true` / `false` | Can the user modify? |

V1 defaults for `kn:contains` (in app config): `cascade`, `exclusive=true`,
`user_editable=false`.

### Exclusivity rule

A node can be the target of at most one `kn:contains` edge. To share,
detach first. Enforced in app code in v1; SHACL shape is the candidate
graph-native enforcement mechanism.

### SQL parallel

| Graph concept | SQL equivalent |
|---|---|
| `kn:contains` (exclusive) | Identifying relationship |
| (app-config) `on-delete "cascade"` | `ON DELETE CASCADE` |
| (app-config) `on-delete "detach"` | `ON DELETE SET NULL` |
| (app-config) `on-delete "prevent"` | `ON DELETE RESTRICT` |

---

## Decision Guide: `kn:contains` vs `cs:is_component_of`

| Criterion | `kn:contains` (kernel, system) | `cs:is_component_of` (domain) |
|---|---|---|
| Purpose | Lifecycle ownership | Semantic part-whole meaning |
| Axis | Structural | Semantic |
| Delete behavior | Cascade/detach/prevent (app-config in v1) | None — independent existence |
| Exclusivity | One owner only | Many-to-many |
| Auto-created | Yes (by tool actions) | No (explicitly authored) |
| UI visibility | Hidden by default | Always visible |
| Example | `cs:BubbleSort kn:contains cs:impl_bubble_sort` | `cs:DivideAndConquer cs:is_component_of cs:MergeSort` |

**Use `kn:contains`** when the child was created FOR the parent — its
content only makes sense in the parent's context; cascade on delete.

**Use `cs:is_component_of`** when the child is a conceptually independent
idea that happens to be part of the parent.

**Use both** when a node is both structurally owned and conceptually a part
of the parent.

---

## Promotion

Block-based editors allow "promoting" a content section into its own node.
The thesis demo does not implement the promotion UI, but the model supports it:

Promotion creates a new node + **two edges**:

1. **`kn:contains` edge** (tool-authored) — kernel structural lifecycle
   ownership (per ADR-006). App-config defaults: auto-created, exclusive,
   cascade-on-delete.
2. **Domain semantic edge** (author-supplied) — the author picks
   `cs:is_component_of`, `cs:applies_in`, or similar. Anchors the new
   node's semantic identity.

Example: promoting "Implement Bubble Sort" from within the Bubble Sort content:

- Tool creates: `cs:BubbleSort kn:contains cs:impl_bubble_sort` (lifecycle)
- Author creates: `cs:impl_bubble_sort cs:applies_in cs:BubbleSort` (semantic)

**Thesis demo scope:** Promotion UI is not implemented. The 559 nodes are
hand-authored; edge choices reflect what promotion would have produced.

---

## Artifacts — superseded by ADR-006

> **Status (2026-04-28).** The pre-addendum design treated file attachments
> as `knm:Artifact` graph nodes linked via `kn:has_artifact`. ADR-006 supersedes
> this: document body content is bound via the kernel symbol `kn:body_ref`
> to an opaque doc-store URN, and file attachments are managed by the
> SQLite doc store (or equivalent) — they are not RDF nodes in v1.

```turtle
cs:MergeSort
    a                cs:Concept ;
    rdfs:label       "Merge Sort" ;
    rdfs:comment     "Divide-and-conquer sorting algorithm with O(n log n) time." ;
    kn:body_ref      <urn:knd-body:ms-001> .
```

The doc-store URN resolves to a structured document (block-editor format)
that may contain file references, but those references are not graph nodes.
This collapses two prior predicates (`kn:document_id` for the body link,
`kn:has_artifact` for attachments) into the single kernel symbol
`kn:body_ref`.

The `knm:Artifact` node type is removed from the v1 catalog (see
TYPE_SYSTEM_DESIGN §1).

---

## Domain Specialization: 6-Course CS Program

The thesis demo is a specialization of the base schema for a 6-course CS
undergraduate program knowledge graph, used as a professor-facing course
management and authoring tool.

- **Primary user:** Professor — authors the graph, validates structure, inspects learning paths
- **Scale:** 559 nodes across 6 courses (CS101–CS402) with 22 shared cross-course principles
- **Node type count:** 9 (6 knowledge types + 3 organizational types) — all `cs:`
- **Edge type count:** ~14 — 4 engine-shipped (`knl:prerequisite_of`, `knl:demonstrates`, `knl:is_demonstrated_by`, `knl:assesses` derived) + ~10 demo-authored (`cs:`)

Full type catalog: [TYPE_SYSTEM_DESIGN.md](phase-2-type-system/TYPE_SYSTEM_DESIGN.md).

### Multi-Course Containment

```
cs:Program
├── kn:contains → cs:Course (×6)
├── kn:contains → cs:Professor (×3)
└── each cs:Course
    └── cs:contains → knowledge nodes (Concepts, Examples, Assessments, References, Analogies)
        └── some Concepts → cs:contains → sub-concepts
```

(Distinction: `kn:contains` is the kernel structural symbol per ADR-006 used
for top-level Program ownership; `cs:contains` is the demo's organizational
membership edge for curricular Course→Concept binding. URI-distinct, different
intents.)

Shared Principles (22) are NOT contained by any course — they connect via
`knl:demonstrates` domain edges across courses.

### Hierarchy in the Education Domain

| View/Context | How hierarchy is computed |
|---|---|
| Level 1–4 complexity filter | Node-type inclusion rules (Concept+Principle → +Example → +Assessment:exercise → all six) |
| Compound graph nesting | `cs:generalizes` and `cs:is_component_of` edges define visual containment |
| Linear traversal | Follow `knl:prerequisite_of` chain from a start Concept |
| Explore traversal | All domain edge types from a selected node |
| Problem-First traversal | Backward reachability over `knl:prerequisite_of` from an Assessment |
| EVōC cluster view | Computed from `rdfs:comment` embeddings (primary layout) |

---

## Implications for the Frontend (`types.ts`)

The frontend still renders typed data — React components need TypeScript
interfaces. These are **derived views** of the RDF store: SPARQL results
projected into typed objects. They are *not* the source of truth.

The frontend types mirror the classical (projected) form of the graph:

```typescript
interface KnowledgeNode {
  id: string                  // URI or local identifier (cs:* in v1)
  label: string               // rdfs:label
  type: string                // URI of the cs: NodeType
  comment?: string            // rdfs:comment
  bodyRef?: string            // kn:body_ref → urn:knd-body:* (per ADR-006)
}

interface KnowledgeEdge {
  id: string                  // URI of the kn:Edge node (reified form)
  source: string              // source node URI
  target: string              // target node URI
  type: string                // URI of the EdgeType (knl:* or cs:*)
  category: 'system' | 'domain' | 'derived'   // from the edge type's kn:edge_category
  inferred?: boolean          // true = derived by Jena (kn:derived true on edge type)
}
```

(Removed in v1: `properties` bag on edges. Lifecycle properties like
`on_delete` are out of the graph per Reading A — they are app-config
attached to `kn:contains` semantics. Per-instance edge metadata uses
W3C standards: `prov:wasAttributedTo`, `dcterms:created`, etc.)

The backend is responsible for producing these shapes from SPARQL queries.
Concrete endpoint contracts should be specified in the Stage 6 implementation docs.

---

## Resolved Decisions (Historical)

### Session 1 (2026-04-10)

| Question | Resolution |
|---|---|
| How do `Stability` and `In-Place Sorting` principles connect to sort concepts? | **`demonstrates` edge** — Concept → Principle; inverse `is_demonstrated_by` |
| How do Exercise nodes connect? | **Exercise merged into Assessment** — `format: 'exercise'`; same `applies_in` connection |
| EVōC embedding source | **Deferred** until rest of system is built |

### Session 2 (2026-04-11)

| Question | Resolution |
|---|---|
| How are subnodes distinguished from peer nodes? | **`sys:contains` system edge** — lifecycle ownership with behavioral properties |
| Should system and domain edges share a schema? | **Orthogonal axes** — both coexist on same node pairs |
| Edge naming convention | **Colon-separated qualified names** (later replaced by `kn:edge_category` property in ADR-003) |
| Subnode exclusivity | **One owner** via `sys:contains`; sharing requires promotion to independent node first |
| System edge visual treatment | **Muted/dotted/toggle-able** |
| Artifacts as nodes | **Adopted** in the rewrite — `knm:Artifact` is a node type |

### Session 3 (2026-04-11)

| Question | Resolution |
|---|---|
| Demo domain | **Python 101** — replaced sorting algorithms |
| Primary user persona | **Professor as course author** |
| Org layer (students, TAs, departments) | **Deferred** |

### Session 5 (2026-04-16)

| Question | Resolution |
|---|---|
| Scale expansion | **26 → 559 nodes** across 6 courses |
| Organizational node types | **3 new types: Program, Course, Professor** — always visible |
| `teaches` edge | **Domain edge** — Professor → Course (ADR-002) |
| Assessment format | **`'test' \| 'exercise' \| 'quiz'`** — dropped `'exam'` |
| Shared principles | **22 principles NOT contained by courses** — cross-cutting |

### Reflexivity Pivot (2026-04-20, ADR-003)

| Question | Resolution |
|---|---|
| Storage layer | Neo4j removed. Apache Jena Fuseki is primary. |
| Node model | Reflexive — types, edge types, edges are all nodes. |
| Edge representation | Reified (canonical) + classical (derived). Both coexist. |
| Namespace encoding | `sys:`/`domain:` prefix → `kn:edge_category` property on edge-type nodes. |
| Frontend types | Remain as derived view; backend projects SPARQL results into them. |

### Namespace Addendum + Deferred-Bucket Resolutions (2026-04-28, ADR-005)

| Question | Resolution |
|---|---|
| `kn:` kernel size | Locked at 14 symbols (8 bootstrap + 3 reflexivity-rendering + 3 inference protocol). |
| `knm:` namespace | Renamed to `knl:` (engine standard library); narrowed to engine-required edges (~5 symbols) per engine-feature test. |
| Education-specific types (`Concept`, `Course`, `Professor`, etc.) | Moved to demo's user namespace `cs:`. Engine ships no node-type catalog. |
| `knd:` (domain instances) | Replaced by user namespace `cs:` — both types and instances live there. |
| `kn:description` / `kn:domain` / `kn:range` / `kn:data_type` | Replaced by W3C standards `rdfs:comment` / `rdfs:domain` / `rdfs:range` / `xsd:*` typed literals. |
| `kn:authored_by` / `kn:created_at` | Replaced by W3C standards `prov:wasAttributedTo` / `dcterms:created`. |
| Visual styles | Out of graph in v1 (Reading A app config). Cascading style design preserved as deferred future work. |
| Lifecycle properties (`kn:on_delete`, `kn:exclusive`, etc.) | Out of graph in v1. App config attached to `kn:contains` semantics. |
| `knm:Artifact` / `kn:has_artifact` | Removed. ADR-006 supersedes with `kn:body_ref` to opaque doc-store URN. |
| `knm:sys_contains` | Renamed to kernel symbol `kn:contains` (per ADR-006). |
| `knm:contains` (organizational) | Renamed to `cs:contains` (URI-distinct from `kn:contains`). |

---

## Open Items

- Demo-specific properties for type fields (`cs:format`, `cs:url`, `cs:citation`,
  `cs:course_code`, `cs:department`) are stored as plain RDF literal triples
  in v1; `kn:PropertyDescriptor` machinery is in ADR-005's deferred bucket.
- SHACL shapes for closed-set value constraints (e.g. `cs:format` ∈ {test, quiz, exercise})
  are deferred — v1 enforces in app code per Phase 6 validation.
- Lifecycle property bag for `kn:contains` instances may be promoted to
  graph-native data in a future ADR if Reading A's app-config approach
  proves insufficient.
