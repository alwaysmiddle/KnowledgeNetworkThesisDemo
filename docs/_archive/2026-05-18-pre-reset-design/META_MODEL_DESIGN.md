# META_MODEL_DESIGN

**Status:** Accepted (Stage 1 complete) — undergoing reconciliation to `VISION.md` + ADR-005
**Date:** 2026-04-21 (drafted 2026-04-20; reconciled 2026-04-25)
**Author:** Shizhong Yu, with Claude
**Depends on:** ADR-003 (Reflexivity as Architectural Foundation), ADR-005 (`kn:` Scope Under Reading A — supersedes ADR-004)
**Stage:** 1 of 7 in the ADR-003 build plan

> **Reconciliation note (2026-04-25; updated 2026-05-05).** This document originally referenced ADR-004's Tier A/B/C structure and treated visual styles as graph-native. ADR-005 supersedes ADR-004 and narrows `kn:` to (a) the 4+4 bootstrap kernel, (b) a small reflexivity-rendering vocabulary, and (c) inference-protocol predicates — 14 symbols total. Everything else (visual styles, lifecycle, document binding, property-descriptor machinery) leaves RDF in v1 and is supplied by app config. Sections marked **[DEFERRED — ADR-005]** below describe Reading B/C future work and are kept for historical/design continuity. The `meta.ttl` audit (Step 10 of reconciliation) is **complete**: shipped `kn:*` matches the 14-symbol kernel, with `rdfs:comment` / `rdfs:domain` / `rdfs:range` replacing the former `kn:description` / `kn:domain` / `kn:range`.

---

## Purpose

This document specifies the **meta-model**: the small, self-describing graph that sits at the root of the system. Every domain node, every domain edge, every type in the system is expressed in terms of the primitives defined here. The meta-model is the foundation on which all reflexivity stands.

If this document is wrong, every layer above it is wrong. We take our time here.

The meta-model must satisfy four properties:

1. **Self-describing.** The meta-model describes itself using its own vocabulary. There is no external schema file; the bootstrap is a graph that types itself.
2. **Minimal.** Fewer primitives is better. Each primitive must earn its place by making something else expressible that could not otherwise be expressed.
3. **RDF-compatible.** The meta-model is loaded into Jena as Turtle. Standard RDF reasoners must be able to reason about it. Achieved by declaring OWL equivalences between our vocabulary and RDF/OWL built-ins.
4. **Renderable.** The meta-model must be visualizable by the same frontend pipeline that renders domain data. Type nodes carry visual properties (label, color, icon).

---

## Design Decisions

### D1. Layered vocabulary

We define our own vocabulary under the namespace `kn:` and declare OWL equivalences to standard RDF/OWL vocabulary. Reasoners see standard RDF; users and visualizations see `kn:`.

Why: gives us clean, consistent, user-facing semantics (`kn:type_of` reads naturally; `rdf:type` is a specialist term) while preserving free OWL reasoning. A user never has to learn RDF to author a new type.

### D2. Single fixed point at the root

One self-referential statement is permitted at the root: `kn:NodeType kn:type_of kn:NodeType`. This is the bootstrap pin. Every other type flows from it.

Why: Russell-style paradox avoidance through a grounded fixed point. This is how Python (`type(type) is type`), Smalltalk (`Metaclass class`), and RDF itself (`rdfs:Class rdf:type rdfs:Class`) handle the same problem. We are not inventing; we are inheriting.

### D3. Four primitive node types, four primitive edge types

The meta-model bottoms out at exactly four node-type primitives and four edge-type primitives. Every other type (domain or meta) is authored on top.

The four edge primitives are `kn:type_of`, `kn:subtype_of`, `kn:source`, and `kn:target`. The first two carry the type hierarchy; the last two reify edges. Nothing else belongs in the kernel.

Why: empirically, fewer primitives leave more decisions to the user. More primitives bake more assumptions into the foundation. Keeping the bootstrap kernel brutally small is what makes the reflexivity claim defensible — if the kernel grows, the bootstrap becomes a hidden schema again, and "users author everything above the primitives" stops being true.

**Scope of "kernel" (per ADR-005 + 2026-04-28 addendum).** The 4+4 count is the **bootstrap kernel**. The `kn:` namespace also holds a small **reflexivity-rendering vocabulary** (`kn:edge_category`, `kn:contains`, `kn:body_ref`) required to make the substrate self-rendering and a small **inference-protocol vocabulary** (`kn:owl_semantics`, `kn:derived`, `kn:inverse_edge_type`) read by name in engine code to drive the Jena OWL 2 RL reasoner pass. **14 symbols total.** That is the entire `kn:` surface area in v1. Visual styles, lifecycle predicates, document-body binding, property-descriptor machinery, and rendering preferences are **not** in `kn:`; they are app-config in v1 (Reading A). The former `kn:description` / `kn:domain` / `kn:range` / `kn:data_type` predicates have been replaced by the W3C standards `rdfs:comment` / `rdfs:domain` / `rdfs:range` / `xsd:*` typed literals. See ADR-005 (Final `kn:` Kernel Surface) for the locked list.

### D4. Edges are reified from the start

We commit to Level 3 reification at the meta-model layer. The `kn:Edge` primitive exists from day one. Domain edges are instances of `kn:Edge`. Level 1 systems that stop at labeled edges are a strict subset of what we support.

Why: retrofitting reification later would require rewriting the rendering pipeline, every query, and all stored data. Committing upfront is cheaper than any staged migration.

### D5. Namespaces are real

The substrate uses a **four-layer namespace model** (kernel → engine standard library → external ontologies → user namespace), plus a synthesized `kne:` for projected type-view edges and the standard W3C prefixes for reasoning. This reflects ADR-005 + the namespace addendum + deferred-bucket resolutions (2026-04-28). The earlier `knm:` / `knd:` split has been collapsed: `knm:` was renamed to `knl:` and narrowed to engine-required edge types, and `knd:` is replaced by a user-chosen prefix that holds *both* domain types and instances.

| Prefix | URI (placeholder) | Contents |
|---|---|---|
| `kn:` | `http://knowledgenetwork.local/meta#` | Engine kernel namespace. **14 symbols, locked at v1:** bootstrap kernel (8 primitives — `kn:Node`, `kn:NodeType`, `kn:EdgeType`, `kn:Edge`, `kn:type_of`, `kn:subtype_of`, `kn:source`, `kn:target`), reflexivity-rendering vocabulary (`kn:edge_category`, `kn:contains`, `kn:body_ref`), inference protocol (`kn:owl_semantics`, `kn:derived`, `kn:inverse_edge_type`). Visual styles, lifecycle, document-body binding, and property-descriptor machinery live outside RDF in v1 (Reading A). Changes require an ADR. |
| `knl:` | `http://knowledgenetwork.local/standard-lib#` | Engine standard library. Holds the 5–7 edge types referenced by name in engine code (e.g. `knl:prerequisite_of`, `knl:demonstrates`, `knl:assesses`). Membership criterion (engine-feature test): deleting the symbol breaks a shipped engine feature such as Linear Traversal, Problem-First Traversal, or the OWL inference pass. Renamed from `knm:` per ADR-005 addendum. |
| User namespace (e.g. `cs:`) | Author chooses (e.g. `http://knowledgenetwork.local/cs#`) | Domain-specific types **and** all user-authored content. The demo curriculum uses `cs:` for both type nodes (`cs:Concept`, `cs:Professor`) and instance nodes (`cs:variable_001`). Replaces the old `knm:` (general meta-instances) and `knd:` (domain instances) split, which collapses under Reading A. |
| External ontologies (`skos:`, `schema:`, `foaf:`, `dcterms:`, `prov:`, …) | per W3C / community | Standard vocabularies imported as needed. SKOS shows up via ADR-007 (groupings typed `skos:Concept`, alignments via `skos:exactMatch` / `closeMatch` / `relatedMatch`). PROV-O marks pipeline-generated nodes. No alignment table is maintained between `knl:` and external symbols. |
| `kne:` | `http://knowledgenetwork.local/meta-edge#` | **Synthesized.** Stage 5 type-view edges minted at query time. Not authored, not stored — assembled in the SPARQL projection layer so the type-view uses the same edge-rendering pipeline as domain content. See `TYPE_VIEW_SPEC.md` for the projection contract (inclusion rule, projected predicates, edge ID synthesis). |
| `rdf:`, `rdfs:`, `owl:`, `xsd:` | standard | Used for equivalences and reasoning. `rdfs:comment` replaces the former `kn:description`; `rdfs:domain` / `rdfs:range` replace `kn:domain` / `kn:range`; `xsd:*` typed literals replace `kn:data_type`. SHACL (`sh:`) is reserved for value constraints if `kn:allowed_values` proves required (audit deferred to companion work). |

**Namespace decision (locked 2026-04-20):** We use non-resolvable placeholder URIs under `knowledgenetwork.local`. RDF treats URIs as globally unique identifiers, not URLs that must resolve. The base URI is stored as a backend config value so it can be changed later without rewriting data. Linked Data / dereferenceable URIs were considered and deferred — the per-install, desktop-oriented usage pattern doesn't need them, and shifting to real URIs later is a config change plus a one-time rewrite if we ever publish.

---

## Primitive Node Types

Four primitive classes. All are subclasses of `kn:Node`.

### `kn:Node`

The root of the type hierarchy. Everything in the system is a `kn:Node`. Has minimal properties:

- `rdfs:label` — display string
- `rdfs:comment` — optional longer text (W3C standard; replaces the former `kn:description` per ADR-005)

Declared equivalent to `owl:Thing` so standard OWL reasoning applies.

### `kn:NodeType`

A class of nodes. Instances of `kn:NodeType` are the things users author when they add a new category to the system. The demo curriculum's `cs:Concept`, `cs:Principle`, `cs:Course`, `cs:Professor` are all instances of `kn:NodeType`. (Per ADR-005 namespace addendum, education-specific types live in the user namespace `cs:`, not in an engine-shipped catalog.)

Properties:

- `rdfs:label`, `rdfs:comment` (inherited)

> **[DEFERRED — ADR-005]** Earlier drafts also listed `kn:visual_style` (graph-native style binding) and `kn:default_properties` (property-name list) as `kn:NodeType` properties. Under Reading A (v1), visual style is supplied by app config keyed on the type URI; the renderer does not consult `kn:visual_style` triples. Property-name expectations are documented in code/docs, not in the graph (the `kn:PropertyDescriptor` machinery is in ADR-005's deferred bucket). The graph-native cascading style design is preserved below under "Visual Style — [DEFERRED]" as Reading B/C future work.

Declared equivalent to `owl:Class`. This means `kn:type_of` (below) becomes a class-membership predicate that reasoners understand.

### `kn:EdgeType`

A class of edges. Instances of `kn:EdgeType` are the things users author when they add a new kind of relationship. Engine-required edge types (those referenced by name in engine code — Linear Traversal, Problem-First Traversal, OWL inference) live in the standard library `knl:` (e.g. `knl:prerequisite_of`, `knl:demonstrates`, `knl:assesses`). Domain-specific or user-authored edge types live in the user namespace (e.g. `cs:teaches`). Note: `kn:subtype_of` is a *kernel* primitive — it lives in `kn:`, not `knl:`. Authored edge types extend the system above the kernel; they don't redeclare it.

Properties:

- `rdfs:label`, `rdfs:comment`
- `kn:edge_category` — `"system"` or `"domain"` (per ADR-002 amended)
- `rdfs:domain`, `rdfs:range` — references to permitted source/target `kn:NodeType`s (W3C standard; replaces the former `kn:domain` / `kn:range` per ADR-005)
- `kn:owl_semantics` — one or more of: `owl:TransitiveProperty`, `owl:SymmetricProperty`, `owl:FunctionalProperty`, `owl:InverseFunctionalProperty`. This is what drives inference.
- `kn:inverse_edge_type` — optional reference to another `kn:EdgeType`, used to derive the inverse direction.
- `kn:derived` — optional boolean flag marking the edge type as inference-produced (e.g. `knl:assesses`). Read by clear-and-recompute pass and validation exclusions.

> **[DEFERRED — ADR-005]** `kn:visual_style` is not a v1 property of `kn:EdgeType`. Edge styling is supplied by app config keyed on the edge-type URI.

Declared equivalent to `owl:ObjectProperty` (for the standard kind) or more specific OWL property classes.

**Edge types have two faces.** Every `kn:EdgeType` instance simultaneously plays two roles:

1. **As a node.** `knl:prerequisite_of` is a graph node. Users can inspect it, style it, attach descriptions, query its neighborhood, traverse it in the type-view. It has an id, a label, a type (`kn:EdgeType`), and properties.
2. **As a predicate.** `knl:prerequisite_of` is also an RDF property URI. It appears as the predicate in classical triples such as `cs:variable knl:prerequisite_of cs:function`. SPARQL patterns and OWL rules operate on it as a relationship, not a node.

Both readings are valid at the same time and on the same URI. RDF permits this because a URI can denote both a resource (node) and a predicate (edge label) without contradiction. This is the structural basis for Level 2 reflexivity: the type system is legible to the engine with the same machinery the domain content uses. A demo that shows the user clicking a `knl:prerequisite_of` node, reading its properties, then running a SPARQL query whose WHERE clause uses that same URI as a predicate, makes the point without any explanation.

### `kn:Edge`

A reified edge. An instance of `kn:Edge` is a single edge in the graph, represented as a node so it can carry properties and be the subject or object of other edges.

Properties:

- `kn:source` — points to the node at the tail of the edge
- `kn:target` — points to the node at the head of the edge
- `kn:type_of` — points to a `kn:EdgeType` node
- optional annotations: per ADR-005, prefer W3C-standard predicates over invented `kn:*` ones — `prov:wasAttributedTo` for authorship, `dcterms:created` for timestamps, `prov:wasDerivedFrom` for provenance chains. Confidence and other domain-specific annotations live in the user namespace (e.g. `cs:confidence`).

Reasoning: instances of `kn:Edge` project back to standard RDF triples via a SPARQL construct rule. See "OWL Reasoning" below.

---

## Primitive Edge Types

Four edge-type primitives. All are instances of `kn:EdgeType`.

### `kn:type_of`

Links any node to its type. The ubiquitous reflexive edge.

- Declared `owl:equivalentProperty rdf:type`.
- Used everywhere: `cs:some_concept kn:type_of cs:Concept`.

### `kn:subtype_of`

Links one `kn:NodeType` (or `kn:EdgeType`) to a more general one.

- Declared `owl:equivalentProperty rdfs:subClassOf` when between `kn:NodeType` nodes.
- Declared `owl:equivalentProperty rdfs:subPropertyOf` when between `kn:EdgeType` nodes. (SPARQL-level distinction enforced by the backend.)
- Transitive by OWL.

### `kn:source` and `kn:target`

Reification endpoints. Used only by `kn:Edge` instances. Collectively, these two edges reify a classical triple:

```
Classical:   cs:a  knl:prerequisite_of  cs:b
Reified:     cs:edge42  kn:source  cs:a
             cs:edge42  kn:target  cs:b
             cs:edge42  kn:type_of  knl:prerequisite_of
```

Both encodings coexist in the store. See "OWL Reasoning" for how they stay in sync.

*(Technically this is four edge-type primitives if you count `kn:source` and `kn:target` separately. They are paired semantically but distinct predicates.)*

---

## The Fixed Point

The meta-model types itself. Here are the self-referential statements, written in Turtle-ish pseudocode:

```
kn:Node        kn:type_of     kn:NodeType .
kn:NodeType    kn:type_of     kn:NodeType .      # the fixed point
kn:EdgeType    kn:type_of     kn:NodeType .
kn:Edge        kn:type_of     kn:NodeType .

kn:type_of     kn:type_of     kn:EdgeType .
kn:subtype_of  kn:type_of     kn:EdgeType .
kn:source      kn:type_of     kn:EdgeType .
kn:target      kn:type_of     kn:EdgeType .

kn:NodeType    kn:subtype_of  kn:Node .
kn:EdgeType    kn:subtype_of  kn:Node .
kn:Edge        kn:subtype_of  kn:Node .
```

Read aloud:

- Node is a type of node of type NodeType. NodeType is itself of type NodeType — this is the pin.
- EdgeType and Edge are also types of node.
- The four primitive edge types (`type_of`, `subtype_of`, `source`, `target`) are of type EdgeType.
- NodeType, EdgeType, and Edge are all subtypes of Node (because everything is a node).

This bootstrap is small enough to fit on one page, and every piece of it is expressible in our own vocabulary. This is the reflexive foundation.

---

## Worked Examples

**Authoring convention.** In the examples below, authored Turtle uses `kn:type_of` rather than the RDF shorthand `a` (`rdf:type`). They are equivalent under OWL — `kn:type_of owl:equivalentProperty rdf:type` is declared in the meta-model, and the reasoner bridges them — but the demo, the thesis, and user-facing tooling should speak the project's own vocabulary. SPARQL queries still use `a` where it reads more naturally; the reasoner handles the equivalence.

### Level 1: A domain Concept node

User adds the node "Variable" to CS101.

```turtle
cs:Concept  kn:type_of kn:NodeType ;
    rdfs:label "Concept" .

cs:variable  kn:type_of cs:Concept ;
    rdfs:label "Variable" ;
    rdfs:comment "A named storage location for a value." .
```

What the visualization pipeline does (v1, per ADR-005): fetches `cs:variable`, follows `kn:type_of` to `cs:Concept`, looks up `cs:Concept` in the renderer's app-config style map, renders the node. The style does not live in the graph in v1.

### Level 2: The edge-type `prerequisite_of` as a node

```turtle
knl:prerequisite_of  kn:type_of kn:EdgeType ;
    rdfs:label "prerequisite of" ;
    rdfs:comment "A must be understood before B can be taught." ;
    kn:edge_category "domain" ;
    kn:owl_semantics owl:TransitiveProperty .
```

`knl:prerequisite_of` is a node. It has properties. It can be the subject or object of other edges. If a user adds "this relationship was invented by John Dewey," they do that by attaching an edge *to this node*, not by changing code. (This particular edge type lives in `knl:` because Linear Traversal hardcodes it; user-authored edge types like `cs:teaches` follow the same pattern in the user namespace.)

### Level 3: An actual prerequisite edge

Say `cs:variable` is a prerequisite of `cs:function`.

Reified form (what we store):

```turtle
cs:edge_var_func  kn:type_of knl:prerequisite_of ;
    kn:source cs:variable ;
    kn:target cs:function ;
    prov:wasAttributedTo cs:prof_smith ;
    dcterms:created "2025-09-15"^^xsd:date ;
    cs:confidence 1.0 .
```

Classical form (what reasoners also see, via projection rule):

```turtle
cs:variable  knl:prerequisite_of  cs:function .
```

Both forms are present in the store. The classical form enables efficient SPARQL queries (`?x knl:prerequisite_of ?y`). The reified form enables annotations. (Provenance and timestamps use the W3C standard `prov:` and `dcterms:` predicates rather than invented `kn:authored_by` / `kn:created_at`, consistent with ADR-005's preference for community standards over engine-namespace growth.)

---

## OWL Reasoning

The backend invokes Jena's OWL reasoner on demand (per ADR-001 Phase 5 design, which carries forward). The reasoner needs two things from the meta-model to work:

**1. Equivalence declarations** connect our vocabulary to OWL's:

```turtle
kn:type_of       owl:equivalentProperty rdf:type .
kn:subtype_of    owl:equivalentProperty rdfs:subClassOf .
kn:NodeType      owl:equivalentClass   owl:Class .
kn:Node          owl:equivalentClass   owl:Thing .
```

**2. A projection rule** that materializes classical triples from reified edges:

```sparql
CONSTRUCT { ?s ?p ?o }
WHERE {
  ?edge kn:type_of ?p ;
        kn:source ?s ;
        kn:target ?o .
  ?p a kn:EdgeType .
}
```

Run once at startup and after every edit, the projection populates the classical form. From there, OWL semantics declared on `kn:EdgeType` instances (transitivity, symmetry, etc.) drive all downstream inference.

This is the bridge. Reflexive storage, classical reasoning. Both in the same store.

### OWL profile

We target **OWL 2 RL** (the rule-based profile). Every inference our design needs is rule-shaped:

- Transitivity (prerequisite_of chains)
- Symmetry (is_analogous_to)
- Inverse properties (demonstrates / is_demonstrated_by)
- Subtype propagation (through `kn:subtype_of` → `rdfs:subClassOf`)
- Equivalence assertions (`kn:type_of owl:equivalentProperty rdf:type`)
- The projection rule above

OWL 2 RL matches Jena's native rule engine. Stronger profiles (DL, Full) would add power we do not use and require bolting on external reasoners (Pellet, HermiT) with more moving parts and worse performance. Weaker profiles (EL, QL) don't cover our needs.

If a future requirement genuinely needs a stronger profile, we will document that in an ADR and evaluate the reasoner change then.

---

## Visual Style — [DEFERRED — ADR-005]

> **v1 reality (Reading A).** Visual style for node types and edge types is supplied by **app config** keyed on the type URI (e.g., `cs:Concept`). The graph does not store style triples; the renderer does not query for them. This keeps `kn:` small and removes a class of "config in graph" awkwardness.
>
> **The design below is preserved as Reading B/C future work.** It describes how a graph-native, cascading style system would look if v1's "structure earned, not imposed" philosophy is later relaxed to admit user-authored theming as first-class graph content. None of it is built in v1; none of the `kn:VisualStyle` / `kn:NodeVisualStyle` / `kn:EdgeVisualStyle` classes ship in `meta.ttl` after the Step 10 audit.

Visual style is itself a subgraph, not an opaque blob. This preserves reflexivity (the styling system is inspectable and visualizable by the same pipeline) and unlocks cascading via `kn:subtype_of`.

### Style classes

Abstract parent plus two concrete subclasses, all `kn:NodeType` instances:

- `kn:VisualStyle` (abstract)
- `kn:NodeVisualStyle` — subtype of `kn:VisualStyle`. Properties: `kn:color`, `kn:icon`, `kn:size`, `kn:border_style`, `kn:label_position`.
- `kn:EdgeVisualStyle` — subtype of `kn:VisualStyle`. Properties: `kn:color`, `kn:line_style`, `kn:arrow_head`, `kn:width`, `kn:label_position`.

A `kn:NodeType` references a `kn:NodeVisualStyle` instance. A `kn:EdgeType` references a `kn:EdgeVisualStyle` instance. Type mismatch (an edge type pointing at a node style) is a validation error.

### Cascading resolution

Style nodes themselves form a `kn:subtype_of` hierarchy. To resolve the effective style for a given type, the frontend (or backend, before serializing) walks from the most specific style node upward through `kn:subtype_of`, taking the first defined value for each property. This is CSS-style cascading, expressed in RDF.

Example:

```turtle
knm:default_node_style  a kn:NodeVisualStyle ;
    kn:color "#888888" ;
    kn:icon "circle" ;
    kn:size 30 .

knm:concept_style  a kn:NodeVisualStyle ;
    kn:subtype_of knm:default_node_style ;
    kn:color "#4A90E2" .

knm:principle_style  a kn:NodeVisualStyle ;
    kn:subtype_of knm:concept_style ;
    kn:icon "diamond" .

knm:Concept    kn:visual_style knm:concept_style .
knm:Principle  kn:visual_style knm:principle_style .
```

Resolution for `knm:Principle` yields: `color=#4A90E2` (from concept_style), `icon=diamond` (from principle_style), `size=30` (from default_node_style).

### What this unlocks

- **Theming.** Swap `knm:default_node_style` for `knm:dark_mode_style`; every type re-skins.
- **Shared visual grammars.** All assessment types inherit from a common style parent.
- **User overrides.** A user-authored theme subtypes the default.
- **Self-visualizing style tree.** The style subgraph is itself renderable by the same pipeline.

---

## Property Representation — [PARTIALLY DEFERRED — ADR-005]

> **v1 reality (Reading A).** Plain RDF triples for property values, and RDF-star where per-value reification is genuinely needed, **are in v1**. The `knm:PropertyDescriptor` class — graph-native definitions of what each property *means*, what types it *applies to*, what data type it *carries* — is in ADR-005's **deferred bucket**. v1 ships without it; property semantics are documented in code/docs, not in the graph. A follow-up ADR will decide whether to promote `PropertyDescriptor` back to substrate-level once the v1 demo exposes the actual pain. The descriptor design below is preserved as the candidate solution for that ADR.

We follow the convergent design pattern of reflexive systems (Smalltalk, Python, MOF-in-practice, RDF/OWL native): **property definitions are graph-native; property values are plain RDF literals; per-value reification is available on demand via RDF-star.**

### The three layers

**1. Property definitions are bubbles.** Every property the system uses has a descriptor node under `knm:`. The descriptor carries what the property means, what values it accepts, what it applies to. Users can inspect, author, and extend these through the graph.

```turtle
knm:color  a knm:PropertyDescriptor ;
    rdfs:label "color" ;
    kn:description "hex color used for rendering" ;
    kn:data_type  xsd:string ;
    kn:applies_to kn:NodeVisualStyle , kn:EdgeVisualStyle .

knm:size  a knm:PropertyDescriptor ;
    rdfs:label "size" ;
    kn:data_type  xsd:integer ;
    kn:applies_to kn:NodeVisualStyle .
```

`knm:PropertyDescriptor` is itself a `kn:NodeType`. Descriptors are ordinary graph data, reachable, renderable, and authorable.

**2. Property values are simple triples.** The actual values stored on domain nodes use the property URI as an ordinary RDF predicate.

```turtle
knm:concept_style  kn:color "#4A90E2" ;
                   kn:size  30 .
```

One triple per fact. No reification. Efficient storage. Standard SPARQL queries work without traversal.

**3. Per-value reification is available on demand** via RDF-star, when a specific value needs metadata (provenance, confidence, authorship):

```turtle
<< knm:concept_style kn:color "#4A90E2" >>
    kn:authored_by knd:prof_smith ;
    kn:created_at "2025-09-15"^^xsd:date ;
    kn:justified_by knd:color_blind_guide .
```

Only the specific statement being annotated pays the reification cost. Unannotated values remain simple triples.

### Why this split

Making every value a reified node breaks performance: on 559 domain nodes with ~5 properties each, full reification costs thousands of extra bubbles the graph has to traverse for every read. Making nothing reifiable breaks reflexivity: the system can't describe its own vocabulary.

Property descriptors at the definition level give the system full self-describing power without paying the reification tax on every data value. RDF-star gives us the escape hatch for cases that genuinely have metadata worth attaching.

### What this gives up

- Users cannot (yet) add new property *kinds* purely through the graph without touching the property descriptor bootstrap. Adding `knm:accessibility_rating` as a new property means adding a descriptor (data) and then using it (more data) — no code change, but there's still a privileged bootstrap step.
- Formal cardinality enforcement (e.g., "a Concept must have exactly one `label`") is not enforced by this structure; it's enforced by validation rules elsewhere (Phase 6).

If these bite in practice, we promote `PropertyDescriptor` to a full `kn:Property` primitive in a future ADR. The migration is mechanical.

---

## Loading Story

On first startup, the C# backend:

1. Checks whether the Jena dataset contains the meta-model (queries for `kn:NodeType kn:type_of kn:NodeType`).
2. If absent, loads `meta.ttl` — the kernel: 14 `kn:*` symbols (4 node-type primitives, 4 edge-type primitives, 3 reflexivity-rendering, 3 inference-protocol).
3. Loads the engine standard library (`knl:*` edge types — `prerequisite_of`, `demonstrates`, `is_demonstrated_by`, `assesses`, etc.) — the 5–7 edge types referenced by name in engine code. These are *data*, not primitives; they ship with the engine because traversal and inference code reads them by URI.
4. Loads the demo curriculum: user-namespace types (e.g. `cs:Concept`, `cs:Course`, `cs:Professor`) plus the 559-node instance graph (produced in Stage 3).
5. Runs the projection rule to materialize classical triples.
6. Runs OWL reasoning to derive inferences (prerequisite transitivity, `knl:assesses` derivation, etc.).
7. Marks `/api/health` as `ready`.

Subsequent startups skip step 2 if the kernel is already persisted.

(Naming note: pre-2026-04-28, the engine-shipped types were called `knm:*` and instances were `knd:*`. The namespace addendum to ADR-005 renamed `knm:` → `knl:` (narrowed to engine-required edges only) and dropped `knd:` in favor of a user-chosen prefix that holds *both* domain types and instances. Education-specific types like `Concept` / `Course` / `Professor` now live in the user namespace, not in the engine catalog.)

---

## Set-Valued Edges — [DEFERRED — ADR-005 deferred bucket]

*Added 2026-04-21 per metagraph discussion. See `RELATED_WORK.md` (parked in `Thesis/Draft 2/`) §"Metagraphs". Status updated 2026-05-05: `kn:NodeSet` and friends (`kn:source_set`, `kn:target_set`, `kn:members`) are in ADR-005's deferred bucket — not in the v1 14-symbol kernel. The design below is preserved as candidate future-ADR content if set-valued edges become a v2 requirement.*

The primitive model defines each `kn:Edge` as having a single `kn:source` and
a single `kn:target`. This covers every binary edge type in the thesis demo.

**Optional extension (deferred):** a `kn:Edge` could instead declare `kn:source_set` and/or
`kn:target_set`, pointing to `kn:NodeSet` nodes that enumerate multiple
endpoints. This matches the metagraph formalism of Basu & Blanning (2003),
where an edge is `(A, B)` with A and B subsets of vertices.

```turtle
cs:combined_prereq
    kn:type_of      kn:Edge ;
    kn:type_of      knl:prerequisite_of ;
    kn:source_set   cs:nodeset_algo_trio ;   # MergeSort + Quicksort + HeapSort
    kn:target       cs:Dijkstra .

cs:nodeset_algo_trio
    kn:type_of      kn:NodeSet ;
    kn:members      cs:MergeSort , cs:Quicksort , cs:HeapSort .
```

**Status for thesis demo:** Not used. All demo edges are binary.
**v1 status:** `kn:NodeSet`, `kn:source_set`, `kn:target_set`, `kn:members` are **not** in the locked 14-symbol kernel; admitting them is a future-ADR call.
**Rendering (proposed):** A set-valued edge would visualize as a *combinator node* that fans
out to the set members. Classical-form projection: the edge expands to the
Cartesian product of source and target members (authored edge-type rules
decide which, if any, combinator semantics apply).

This is preserved here to keep the door open; the 2003 metagraph work shows
hyperedges are compatible with typed, reified graphs and carry useful
reachability algebra. The v1 demo reserves set-valued edges as future work.

---

## Non-Goals and Deferred Decisions

This document does not cover:

- **Authoring UI for meta-types.** The fact that a user *can* add a new `kn:NodeType` through the same graph API as they add domain nodes is a design constraint, but the concrete authoring UX is a separate ADR.
- **Versioning of meta-types.** If a professor changes `cs:Concept`'s visual style, do we version? Out of scope for Stage 1; tracked as a future decision.
- **Access control.** Who can edit meta-model instances vs. who can edit domain data? Future ADR.
- **Distributed / federated meta-models.** Importing someone else's `knl:*` or user-namespace vocabulary. Conceptually supported by RDF, but no design work yet.
- **Performance optimization of the projection rule.** If the edge count grows, incremental projection beats full rebuild. Deferred until we measure actual performance.

---

## Validation Checklist

Before this document is marked Stage 1 complete, we verify:

- [ ] Every domain type from prior work (9 node types, 13+1+1 edges) is expressible as instances of the primitives defined here. Walk through each explicitly in Stage 2.
- [ ] The fixed-point bootstrap loads into Jena without circularity errors. Tested with a scratch Fuseki instance before Stage 3.
- [ ] OWL reasoning over equivalences produces expected transitive closures on sample data. Sanity check: load 3 prerequisite edges in a chain, verify derived transitive edge appears.
- [ ] SPARQL queries work against both reified and classical forms. `SELECT ?x WHERE { ?x knl:prerequisite_of ?y }` returns results even though the stored form is reified.
- [ ] A proposed domain type change (e.g., "add `cs:Misconception` as a new NodeType") can be added by writing Turtle, with no code changes in backend or frontend. Confirmed as an integration test in Stage 4.

---

## Resolved Decisions (Historical)

1. ~~Namespace URIs — resolved 2026-04-20: local placeholder, config-driven.~~
2. ~~Visual style representation — resolved 2026-04-20 as graph-native cascading subgraph; **reopened and deferred to Reading B/C by ADR-005 (2026-04-25).** v1 styles live in app config.~~
3. ~~`kn:Property` primitive — resolved 2026-04-21: Option B (middle path). Property definitions are graph data; values are plain literals; per-value reification available via RDF-star when needed.~~ **PropertyDescriptor partially reopened by ADR-005 (2026-04-25)** — graph-native descriptors are in the deferred bucket; plain triples + RDF-star remain in v1.
4. ~~OWL profile — resolved 2026-04-21: OWL 2 RL. Matches Jena's native rule engine, covers all required inferences (transitivity, symmetry, inverse, subtype propagation, equivalence, projection), and avoids the complexity tax of stronger profiles we wouldn't use.~~
5. ~~Tiered `kn:` namespace (ADR-004 Tier A/B/C) — superseded 2026-04-25 by ADR-005's small `kn:` (kernel + reflexivity-rendering vocab only).~~

---

## Status

Stages 1–5 of the ADR-003 build plan are complete. Stage 5 is what made reflexivity (Claim 7) demonstrable: `/api/graph?view=type` returns the substrate live from Fuseki and renders through the same pipeline as domain content. Reconciliation of older docs to `VISION.md` + ADR-005 has produced the namespace addendum (ADR-005), the deferred-bucket resolutions (ADR-005), the node-as-document binding (ADR-006), the categorization pipeline (ADR-007), and `TYPE_VIEW_SPEC.md`. The `meta.ttl` audit (Step 10) is **complete (2026-05-05)**: shipped `kn:*` matches the locked 14-symbol kernel. Pending companion work: rebuild `meta-instances.ttl` against the `knl:` rename + engine-feature reclassification, and migrate the demo curriculum (`knd:*` → `cs:*`).
