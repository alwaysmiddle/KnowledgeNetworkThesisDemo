# Phase 2 — Type System Design

**Status:** Rewritten 2026-04-21 to align with [ADR-003](../ADR-003-reflexivity-as-foundation.md) and [META_MODEL_DESIGN.md](../META_MODEL_DESIGN.md). Reconciled 2026-05-05 to ADR-005 namespace addendum + deferred-bucket resolutions: declared types split between engine standard library (`knl:`) and the demo's user namespace (`cs:`) per the engine-feature test.
**Scope:** Declares the demo curriculum's user-namespace types (`cs:*`) and the demo's usage constraints on engine-shipped edge types (`knl:*`).
**Depends on:** META_MODEL_DESIGN.md, ADR-005, ADR-006, KNOWLEDGE_NODE_MODEL.md

> **This phase is no longer primarily about `types.ts`.** With the reflexive
> foundation, the type system lives in the graph as Turtle. The frontend
> TypeScript file is a *derived view*. This doc specifies the canonical
> graph-native declarations; frontend shape is provided at the end for
> reference only.

> **Reconciliation note (2026-05-05).** The pre-addendum draft declared
> everything under a single `knm:` (meta-instances) namespace. ADR-005's
> namespace addendum applied the **engine-feature test** ("does deleting
> this symbol break a shipped engine feature?") and split the result:
> - **`knl:` (engine standard library, ~5 symbols):** edges referenced by
>   name in engine code — `knl:prerequisite_of`, `knl:demonstrates`,
>   `knl:is_demonstrated_by`, `knl:assesses` (derived).
> - **`cs:` (user namespace, demo curriculum):** the 9 education-specific
>   node types and the remaining edge types. The engine treats these
>   generically.
>
> The old `knm:sys_contains` is dropped — its role is taken by the kernel
> symbol `kn:contains` (per ADR-006). The old user-authored `knm:contains`
> (organizational Course→Concept membership) becomes `cs:contains`,
> URI-distinct from `kn:contains`.

---

## What This Phase Covers

Declaring the nine demo node types and ~14 demo/engine edge types as
meta-instances of the Level-1 primitives defined in META_MODEL_DESIGN.

Everything in this phase is authored as RDF Turtle and loaded into Jena.
Engine-required edges (`knl:*`) are shipped by the engine; the demo curriculum
adds usage constraints (domain/range) on them. Education-specific types and
edges are declared by the demo in its own `cs:` namespace.

The result is a self-describing type system: the types are themselves nodes
that the engine can query, visualize, and reason over.

---

## Prefixes

```turtle
@prefix kn:     <http://knowledgenetwork.local/meta#> .
@prefix knl:    <http://knowledgenetwork.local/standard-lib#> .
@prefix cs:     <http://knowledgenetwork.local/cs#> .
@prefix owl:    <http://www.w3.org/2002/07/owl#> .
@prefix rdfs:   <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd:    <http://www.w3.org/2001/XMLSchema#> .
```

---

## 1. Node Types (9, all in `cs:`)

All node types are `kn:NodeType` instances. Per ADR-005 addendum, none of
them pass the engine-feature test (the engine treats all nodes generically
via `kn:type_of kn:NodeType`), so they live in the demo's user namespace.

```turtle
cs:Concept
    a              kn:NodeType ;
    rdfs:label     "Concept" ;
    rdfs:comment   "A unit of knowledge — an idea, algorithm, data structure, or technique." .

cs:Principle
    a              kn:NodeType ;
    rdfs:label     "Principle" ;
    rdfs:comment   "A cross-cutting invariant or rule (e.g., Stability, In-Place, Idempotence)." .

cs:Example
    a              kn:NodeType ;
    rdfs:label     "Example" ;
    rdfs:comment   "A specific instance of a concept — a worked case." .

cs:Assessment
    a              kn:NodeType ;
    rdfs:label     "Assessment" ;
    rdfs:comment   "A test, quiz, or exercise that validates concept understanding." .

cs:Reference
    a              kn:NodeType ;
    rdfs:label     "Reference" ;
    rdfs:comment   "An external resource — paper, book chapter, URL." .

cs:Analogy
    a              kn:NodeType ;
    rdfs:label     "Analogy" ;
    rdfs:comment   "A metaphor connecting a concept to an everyday experience." .

cs:Program
    a              kn:NodeType ;
    rdfs:label     "Program" ;
    rdfs:comment   "A degree program (e.g., CS undergraduate)." .

cs:Course
    a              kn:NodeType ;
    rdfs:label     "Course" ;
    rdfs:comment   "A course within a program (e.g., CS101)." .

cs:Professor
    a              kn:NodeType ;
    rdfs:label     "Professor" ;
    rdfs:comment   "A teaching staff member." .
```

> **Removed:** `cs:Artifact` (was `knm:Artifact`). Artifact-as-node-type was
> a v1 design used for file attachments. Per ADR-006 (node-as-document
> binding), document body content is now bound via `kn:body_ref` to an
> opaque doc-store URN — a binding, not a node type. File attachments at
> the body-store level no longer need a `cs:Artifact` graph type.

> **Removed:** the `kn:category` property (`"knowledge"` / `"organizational"` /
> `"supporting"`). Per ADR-005 deferred-bucket resolution this is dropped
> entirely — the engine doesn't read it. If the UI needs to group node
> types in pickers it does so via app config keyed on the type URI.

---

## 2. Edge Types

Splits per ADR-005 addendum:
- **§2.1 Engine-shipped (`knl:*`):** declared elsewhere (canonical declarations
  ship with the engine). The demo *augments* these with usage constraints
  (`rdfs:domain` / `rdfs:range`) pointing at `cs:` types.
- **§2.2 Demo-authored (`cs:*`):** declared here in full.

### 2.1 Engine-shipped edges (constraint augmentation only)

```turtle
# Linear Traversal hardcodes knl:prerequisite_of.
knl:prerequisite_of
    rdfs:domain          cs:Concept ;
    rdfs:range           cs:Concept .

# Problem-First Traversal hardcodes knl:demonstrates / knl:is_demonstrated_by.
knl:demonstrates
    rdfs:domain          cs:Concept ;
    rdfs:range           cs:Principle .

knl:is_demonstrated_by
    rdfs:domain          cs:Principle ;
    rdfs:range           cs:Concept .

# OWL inference rule produces knl:assesses (derived).
knl:assesses
    rdfs:domain          cs:Assessment ;
    rdfs:range           cs:Concept .
```

The label, `kn:edge_category`, OWL semantics (transitive / symmetric /
inverse), and `kn:derived` flag for these are declared in the engine-shipped
`standard-lib.ttl` (or equivalent) — not duplicated here. The demo adds only
domain/range constraints to bind these engine edges to the demo's type
vocabulary.

(Per ADR-005 addendum, RDF's open-world model permits the demo, as a user of
the engine, to add triples about engine-shipped URIs. The engine ships the
edges with no type-binding so they remain reusable across curriculum domains.)

### 2.2 Demo-authored domain edges (`cs:*`)

```turtle
cs:generalizes
    a                    kn:EdgeType , owl:TransitiveProperty ;
    rdfs:label           "generalizes" ;
    rdfs:comment         "Source is a more general form of target." ;
    kn:edge_category     "domain" ;
    rdfs:domain          cs:Concept ;
    rdfs:range           cs:Concept .

cs:is_instance_of
    a                    kn:EdgeType ;
    rdfs:label           "is instance of" ;
    rdfs:comment         "Source is a specific occurrence of target." ;
    kn:edge_category     "domain" ;
    rdfs:domain          cs:Example ;
    rdfs:range           cs:Concept .

cs:is_component_of
    a                    kn:EdgeType ;
    rdfs:label           "is component of" ;
    rdfs:comment         "Source is a conceptual part of target (semantic, not lifecycle)." ;
    kn:edge_category     "domain" ;
    rdfs:domain          cs:Concept ;
    rdfs:range           cs:Concept .

cs:builds_on
    a                    kn:EdgeType ;
    rdfs:label           "builds on" ;
    rdfs:comment         "Source extends or refines target." ;
    kn:edge_category     "domain" ;
    rdfs:domain          cs:Concept ;
    rdfs:range           cs:Concept .

cs:contradicts
    a                    kn:EdgeType , owl:SymmetricProperty ;
    rdfs:label           "contradicts" ;
    rdfs:comment         "Source and target are in logical tension." ;
    kn:edge_category     "domain" .

cs:is_analogous_to
    a                    kn:EdgeType , owl:SymmetricProperty ;
    rdfs:label           "is analogous to" ;
    rdfs:comment         "Source and target share structural similarity." ;
    kn:edge_category     "domain" ;
    rdfs:domain          cs:Analogy ;
    rdfs:range           cs:Concept .

cs:applies_in
    a                    kn:EdgeType ;
    rdfs:label           "applies in" ;
    rdfs:comment         "Source is used in the context of target." ;
    kn:edge_category     "domain" .

cs:commonly_conflated_with
    a                    kn:EdgeType , owl:SymmetricProperty ;
    rdfs:label           "commonly conflated with" ;
    rdfs:comment         "Source and target are frequently but incorrectly treated as the same." ;
    kn:edge_category     "domain" ;
    rdfs:domain          cs:Concept ;
    rdfs:range           cs:Concept .

cs:teaches
    a                    kn:EdgeType ;
    rdfs:label           "teaches" ;
    rdfs:comment         "Professor teaches a course." ;
    kn:edge_category     "domain" ;
    rdfs:domain          cs:Professor ;
    rdfs:range           cs:Course .

cs:contains
    a                    kn:EdgeType ;
    rdfs:label           "contains" ;
    rdfs:comment         "Organizational membership — Course contains Concept, Program contains Course. Distinct from kn:contains (kernel symbol for document-internal structural parent-child per ADR-006)." ;
    kn:edge_category     "domain" .
```

> **Removed:** `knm:sys_contains`. Its role (system-level cascade containment)
> is now handled by the kernel symbol `kn:contains` directly — no
> meta-instance declaration needed. The lifecycle defaults (`kn:default_on_delete`,
> `kn:default_exclusive`, `kn:user_editable`) and per-instance overrides
> (`kn:on_delete`, `kn:exclusive`, `kn:auto_created`) are out of the graph
> in v1 (Reading A) — they live in app config or as code constants.

---

## 3. Property Descriptors — [DEFERRED — ADR-005]

> **v1 reality (Reading A).** The graph-native `kn:PropertyDescriptor`
> machinery is in ADR-005's deferred bucket. v1 stores property values as
> plain RDF triples on instances; what each property *means* / *applies to*
> / *carries as a data type* is documented in code or this design doc, not
> in the graph. The descriptor design below is preserved as candidate
> content for a future v2 ADR.

### v1 reality: plain triples

```turtle
cs:test_001
    a                    cs:Assessment ;
    rdfs:label           "Sorting Quiz #1" ;
    cs:format            "test" ;          # plain xsd:string literal
    cs:applies_in        cs:MergeSort .

cs:CLRS_chapter_2
    a                    cs:Reference ;
    rdfs:label           "CLRS Ch. 2 — Getting Started" ;
    cs:url               "https://example.org/clrs/ch2"^^xsd:anyURI ;
    cs:citation          "Cormen et al., 2009, Ch. 2" .
```

The `cs:format`, `cs:url`, `cs:citation`, `cs:course_code`, `cs:department`
predicates are plain `kn:EdgeType` instances or `owl:DatatypeProperty`
declarations in the demo's curriculum file, with their data types implied
by typed RDF literals. No descriptor objects are authored.

### Allowed values (e.g. format ∈ {test, quiz, exercise})

Documented in this design doc and enforced by the validation engine
(Phase 6). A SHACL shape under `sh:in` is the candidate v1+ enforcement
mechanism if validation needs to be graph-driven, but the v1 demo enforces
this at the application layer.

### Deferred (preserved future work)

```turtle
# DEFERRED — proposed graph-native machinery, not in v1.
# kn:PropertyDescriptor would be a kernel symbol if reopened.

cs:format
    a                    kn:PropertyDescriptor ;     # deferred class
    rdfs:label           "format" ;
    rdfs:comment         "Assessment format — distinguishes test/quiz/exercise." ;
    sh:datatype          xsd:string ;                # SHACL datatype (deferred)
    sh:in                ( "test" "quiz" "exercise" ) ;   # SHACL enumeration (deferred)
    sh:targetClass       cs:Assessment .             # SHACL targeting (deferred)
```

If the deferred bucket is reopened, the implementation would use SHACL
predicates (`sh:datatype`, `sh:in`, `sh:targetClass`) rather than invented
`kn:data_type` / `kn:allowed_values` / `kn:applies_to` predicates.

---

## 4. Visual Styles — [DEFERRED — ADR-005]

> **v1 reality (Reading A).** Visual style for each type is supplied by
> **app config** keyed on the type URI (e.g., `cs:Concept` →
> `{ color: "#DBEAFE", borderColor: "#60A5FA", … }`). The graph stores no
> style triples; the renderer consults a TypeScript constants file or
> JSON config. The `kn:VisualStyle` / `kn:NodeVisualStyle` / `kn:EdgeVisualStyle`
> classes are not in `meta.ttl` after the Step 10 audit.
>
> The cascading style design below is preserved as Reading B/C future work.
> See META_MODEL_DESIGN §"Visual Style — [DEFERRED — ADR-005]" for the
> rationale.

### v1 app-config shape (illustrative)

```typescript
// frontend/src/config/typeStyles.ts (or equivalent)
export const NODE_TYPE_STYLES: Record<string, NodeStyle> = {
  'cs:Concept':      { color: '#DBEAFE', border: '#60A5FA' },
  'cs:Principle':    { color: '#EDE9FE', border: '#A78BFA' },
  'cs:Example':      { color: '#D1FAE5', border: '#34D399', badge: 'eg' },
  'cs:Assessment':   { color: '#FEE2E2', border: '#F87171', badge: { byProperty: 'cs:format', map: { test: '✓', quiz: '?', exercise: 'ex' }}},
  'cs:Reference':    { color: '#F1F5F9', border: '#94A3B8', badge: '📄' },
  'cs:Analogy':      { color: '#FCE7F3', border: '#F472B6', badge: '≈' },
  'cs:Program':      { color: '#E0E7FF', border: '#818CF8', badge: '🎓', size: 'large' },
  'cs:Course':       { color: '#CFFAFE', border: '#22D3EE', badge: '📘' },
  'cs:Professor':    { color: '#CCFBF1', border: '#2DD4BF', badge: '👤' },
};

export const EDGE_TYPE_STYLES: Record<string, EdgeStyle> = {
  // selectors keyed on edge_category + OWL characteristic + derived flag
  domain:            { color: '#475569', lineStyle: 'solid', width: 1.5 },
  domainSymmetric:   { arrowHead: 'double' },
  derived:           { lineStyle: 'dashed', color: '#A855F7' },
  system:            { color: '#CBD5E1', lineStyle: 'dotted', width: 1, opacity: 0.4, hiddenByDefault: true },
};
```

### Deferred graph-native cascading design (preserved)

The earlier draft modeled styles as a `kn:VisualStyle` subgraph with
`kn:subtype_of` cascading, filter properties (`kn:filter_property` /
`kn:filter_value`), and category-scoping (`kn:applies_to_category`). This
delivered theming, shared visual grammars, and self-visualizing style trees
— but failed the engine-feature test (the renderer is the only consumer)
and was reclassified as app config in ADR-005. The full graph-native design
is preserved in the pre-2026-04-25 revision of this doc and in
META_MODEL_DESIGN §"Visual Style — [DEFERRED]".

---

## 5. Frontend TypeScript View

The backend queries Jena and projects results into these TypeScript shapes
for the React UI. These types are **derived** — the canonical source is the
Turtle above.

```typescript
// derived from cs:* (and knl:*) declarations; regenerated when the type system changes
export type EducationNodeType =
  | 'Concept'
  | 'Principle'
  | 'Example'
  | 'Assessment'
  | 'Reference'
  | 'Analogy'
  | 'Program'
  | 'Course'
  | 'Professor'

export type EngineEdgeType =
  | 'prerequisite_of'         // knl:
  | 'demonstrates'            // knl:
  | 'is_demonstrated_by'      // knl:
  | 'assesses'                // knl: (derived)

export type DemoEdgeType =
  | 'generalizes'             // cs:
  | 'is_instance_of'
  | 'is_component_of'
  | 'builds_on'
  | 'contradicts'
  | 'is_analogous_to'
  | 'applies_in'
  | 'commonly_conflated_with'
  | 'teaches'
  | 'contains'                // cs: organizational; distinct from kn:contains

export type DomainEdgeType = EngineEdgeType | DemoEdgeType

export interface KnowledgeNode {
  id: string
  label: string
  type: EducationNodeType
  comment?: string                           // rdfs:comment
  bodyRef?: string                           // kn:body_ref → opaque urn:knd-body:* (per ADR-006)
  // type-specific properties (plain triples in v1)
  format?: 'test' | 'quiz' | 'exercise'      // Assessment
  url?: string                               // Reference
  citation?: string                          // Reference
  courseCode?: string                        // Course
  department?: string                        // Professor
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  type: DomainEdgeType
  category: 'system' | 'domain' | 'derived'
  inferred?: boolean
}
```

Generation strategy (deferred to implementation): either hand-maintain this
file in sync with Turtle declarations, or generate it from a SPARQL query
over `cs:*` and `knl:*` at build time. For the thesis demo, hand-maintained
is fine.

---

## 6. Loading Order

Turtle files load into Jena in this order (each layer depends on the
previous):

1. `meta.ttl` — Level 1 primitives, the 14-symbol kernel (see META_MODEL_DESIGN).
2. **Engine standard library** (`standard-lib.ttl` or equivalent) — canonical
   declarations of `knl:*` edge types: label, `kn:edge_category`, OWL
   semantics, `kn:derived` flag where applicable. Shipped with the engine.
3. **Demo curriculum types and constraints** (`meta-instances.ttl` rebuilt
   for the demo): the 9 `cs:` NodeTypes (§1), the ~10 `cs:` EdgeTypes (§2.2),
   and the demo's `rdfs:domain` / `rdfs:range` augmentations on `knl:`
   edges (§2.1).
4. **Demo instances** (`domain.ttl` or `cs-curriculum.ttl`): Level 3 — the
   559 demo nodes and their edges, all under `cs:`.
5. `rules.ttl` — projection rules (reified ↔ classical) + OWL 2 RL rule set.
6. **Inference pass** — Jena computes transitive closures, symmetric pairs,
   and `knl:assesses` derivations.

---

## 7. Validation Checklist

- [ ] All nine `cs:` node types load and query back as `kn:NodeType` instances
- [ ] All ~10 `cs:` edge types load with correct `kn:edge_category`
- [ ] The 4 `knl:` edge types load from the engine standard library
- [ ] Demo's `rdfs:domain` / `rdfs:range` augmentations on `knl:` edges resolve correctly
- [ ] OWL characteristics (`owl:TransitiveProperty`, `owl:SymmetricProperty`,
      `owl:inverseOf`) propagate through the reasoner
- [ ] `knl:assesses` edges appear after inference runs on sample domain data
- [ ] `kn:edge_category` query correctly separates system from domain edges
- [ ] Frontend-derived TypeScript types compile and render styled nodes via app-config style map

---

## 8. Changed from Pre-Pivot Version

- TypeScript unions are no longer authoritative — Turtle declarations are.
- Edge category is a property of the edge type node, not a URI prefix.
- Visual styles are app config (per ADR-005), not a graph-native subgraph.
- Assessment format is a plain RDF triple, not a property-descriptor object (per ADR-005).
- OWL characteristics (`TransitiveProperty`, `SymmetricProperty`) are declared
  on the edge type directly in OWL, not mirrored as a `owlType` string on
  individual edges.
- `cs:Artifact` is removed — body content uses `kn:body_ref` to a doc-store URN (per ADR-006).

## 9. Changed from Pre-Addendum Version (2026-05-05)

- Single `knm:` namespace split into `knl:` (engine standard library, 4 symbols
  in this domain) and `cs:` (user namespace, 9 node types + ~10 edge types) per
  ADR-005's engine-feature test.
- Education-specific types (`Concept`, `Course`, `Professor`, etc.) moved
  from engine-shipped catalog to demo's `cs:` namespace.
- `knm:sys_contains` removed — kernel `kn:contains` (per ADR-006) takes over.
- `knm:contains` (organizational) renamed to `cs:contains` — URI-distinct
  from `kn:contains`.
- Predicate swaps: `kn:description` → `rdfs:comment`, `kn:domain`/`kn:range`
  → `rdfs:domain`/`rdfs:range`.
- `kn:category` (knowledge/organizational/supporting) dropped — UI concern, not substrate.
- Property descriptors marked deferred — v1 uses plain triples.
- Visual styles marked deferred — v1 uses app config.

## 10. Files to Change in Implementation

| File | Change |
|---|---|
| `infrastructure/jena/data/meta.ttl` | **Done (Step 10):** 14 `kn:*` symbols only. |
| `infrastructure/jena/data/standard-lib.ttl` (new) | Canonical `knl:*` edge declarations: prerequisite_of, demonstrates, is_demonstrated_by, assesses (with `kn:derived true`). |
| `infrastructure/jena/data/meta-instances.ttl` | **Rebuild:** §1 `cs:` node types + §2.2 `cs:` edge types + §2.1 augmentation triples on `knl:` edges. |
| `infrastructure/jena/data/domain.ttl` (or `cs-curriculum.ttl`) | **Migrate `knd:*` → `cs:*`.** 559 demo nodes and their edges. |
| `infrastructure/jena/data/rules.ttl` | Projection + OWL 2 RL rules, including `knl:assesses` derivation. |
| `src/types.ts` | Rewrite per §5. |
| `src/config/typeStyles.ts` (or equivalent) | New — app-config style map keyed on `cs:`/`knl:` URIs (per §4). |
| `src/components/KGNode.tsx` | Read style from `typeStyles.ts` constants. |
| `src/components/KGEdge.tsx` | Read style from `typeStyles.ts` constants. |
