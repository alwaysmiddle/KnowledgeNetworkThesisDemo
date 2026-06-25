# Type-View Edge Scope Specification

**Status:** Accepted
**Date:** 2026-04-28
**Related:** ADR-003 (reflexivity foundation), ADR-005 (`kn:` scope under Reading A; deferred-bucket resolutions), ADR-006 (node-as-document binding), VISION.md §4.8 (reflexive substrate), Claim 7
**Implements:** Step 8 of the post-Stage-5 reconciliation
**Audience:** Backend (SPARQL query authors, `SparqlGraphRepository` maintainers); frontend (graph-store consumers); thesis defense (Claim 7 evidence).

---

## Purpose

Stage 5 ships `/api/graph?view=type` as a live demonstration of Claim 7 (the substrate meta-model is held in the same RDF graph as user content and renders through the same engine). This document specifies, exactly, **what RDF triples are projected as type-view nodes and edges** so that:

1. The Stage 5 SPARQL queries (`nodes-meta.rq`, `edges-meta.rq`) are unambiguously aligned with the post-reconciliation substrate (`kn:` reduced to 14 symbols per ADR-005's deferred-bucket resolutions).
2. Future substrate changes have a single place to update the projection contract.
3. Thesis defense has a precise spec to point at when explaining what the type-view shows.

---

## 1. Inputs

The type-view projects against the live Fuseki triple store. Three kinds of triples are relevant:

- **Substrate triples** (`meta.ttl`): the 14-symbol `kn:` kernel and its self-typing fixed point.
- **Meta-instance triples** (`knl:`): engine-required edge types referenced by name in engine code (5–7 symbols per ADR-005 addendum).
- **User-namespace meta-instance triples** (e.g., `cs:`): NodeTypes and EdgeTypes the user authors for their domain.

User-content triples (M0 — domain instances like `cs:variable`) are **not** part of the type-view. They are rendered by `view=knowledge`, which is out of scope for this spec.

---

## 2. Type-View Nodes

### 2.1 Inclusion set

A node `n` belongs to the type-view if and only if at least one of the following holds:

| Condition | Examples |
|---|---|
| `n` is one of the four L1 primitives | `kn:Node`, `kn:Edge`, `kn:NodeType`, `kn:EdgeType` |
| `n` has `n a kn:NodeType` (or equivalently `n kn:type_of kn:NodeType`) | `knl:prerequisite_of` is *not* matched here (it's an EdgeType); `cs:Course` is matched |
| `n` has `n a kn:EdgeType` (or equivalently `n kn:type_of kn:EdgeType`) | `knl:prerequisite_of`, `knl:demonstrates`, `cs:teaches` |

The L1 primitives are included explicitly via a `VALUES` clause because their self-typing uses `kn:type_of` rather than `rdf:type`. (See `meta.ttl`: `kn:NodeType kn:type_of kn:NodeType` is the fixed point.)

### 2.2 Explicit exclusions

The type-view never contains:

- **Reified edge instances** (`?e a kn:Edge` style nodes). These are M0 — domain edges materialized as nodes for property-bearing. They render in `view=knowledge`, not the type-view.
- **User-content M0 nodes** (`cs:variable`, `cs:turing_test`, etc.). Domain instances render in `view=knowledge`.
- **Document-body URIs** (`urn:knd-body:*` opaque URNs from ADR-006). These are SQLite doc-store identifiers, not RDF nodes; they never appear as graph nodes.
- **Visual-style class nodes and instances** (any `kn:VisualStyle` / `kn:NodeVisualStyle` / `kn:EdgeVisualStyle` lineage). Per ADR-005 these have left the graph entirely.
- **Reference-ontology nodes** (`cso:*`, `skos:Concept`, `schema:Course`, etc.) when imported as named graphs. These are background vocabulary, not type-view content.

  *Exception note:* a user-authored NodeType that explicitly declares `owl:equivalentClass skos:Concept` is still a type-view node (because it's typed as `kn:NodeType` in the user's named graph). The reference-ontology side of the equivalence is not pulled in.

### 2.3 Node properties (rendered as property bag, not edges)

For each type-view node `n`, the following triples are projected as **node properties** (not edges) on the wire:

| Predicate | Source | Wire form |
|---|---|---|
| `rdfs:label` | substrate / user | string |
| `rdfs:comment` | substrate / user | string (replaces `kn:description` per ADR-005 deferred-bucket resolution) |
| `kn:edge_category` | substrate (on EdgeType nodes) | string literal: `"system"` or `"domain"` |
| `kn:owl_semantics` | substrate (on EdgeType nodes) | IRI: `owl:TransitiveProperty`, `owl:SymmetricProperty`, `owl:FunctionalProperty`, `owl:InverseFunctionalProperty` (one or more) |
| `kn:derived` | substrate (on EdgeType nodes) | boolean |
| `owl:equivalentClass`, `owl:equivalentProperty` | substrate / user | IRI of the aligned class/property; rendered as a property, not as a graph edge |

These are properties because they describe a single node's metadata. They are not edges between type-view nodes.

---

## 3. Type-View Edges

### 3.1 Inclusion rule

A triple `(s, p, o)` is projected as a type-view edge if and only if **all three** of:

1. `s` is a type-view node (per §2).
2. `o` is a type-view node (per §2).
3. `p` is one of the projection predicates listed in §3.2.

### 3.2 Projection predicates

The five predicates that project as edges in the type-view:

| Predicate | Direction | Endpoint constraint | Rationale |
|---|---|---|---|
| `kn:type_of` | instance → type | both endpoints are type-view nodes | The primary meta-relation. Includes the fixed point `kn:NodeType kn:type_of kn:NodeType`. |
| `kn:subtype_of` | subtype → supertype | NodeType→NodeType *or* EdgeType→EdgeType | Generalization between types. |
| `rdfs:domain` | EdgeType → NodeType | source is `a kn:EdgeType`; target is a NodeType | Source-role constraint on edges. Replaces `kn:domain` per ADR-005 deferred-bucket resolution. |
| `rdfs:range` | EdgeType → NodeType | source is `a kn:EdgeType`; target is a NodeType | Target-role constraint on edges. Replaces `kn:range` per ADR-005 deferred-bucket resolution. |
| `kn:inverse_edge_type` | EdgeType → EdgeType | both endpoints are EdgeTypes | Visualizes inverse pairing for inference (e.g., `knl:demonstrates ↔ knl:is_demonstrated_by`). |

### 3.3 Explicit exclusions

The type-view never projects edges for:

- **`kn:source` / `kn:target`** — these belong to reified `kn:Edge` instances at M0 level, not the meta-model. They render in `view=knowledge` after the M0-projection SPARQL CONSTRUCT.
- **`kn:edge_category`, `kn:owl_semantics`, `kn:derived`** — these are *node properties* per §2.3, not edges. They describe the EdgeType node, not relationships between nodes.
- **`rdfs:label` / `rdfs:comment`** — node properties, not edges.
- **`owl:equivalentClass` / `owl:equivalentProperty`** — node properties (identity assertions), not graph edges. (Future revision may project these as a distinct edge category if the type-view needs to render external-ontology alignments per ADR-007.)
- **`kn:contains`** — reflexivity-rendering vocab from ADR-005, but in v1 it is used only at M0 (sub-document containment per ADR-006), not between NodeTypes. Excluded by default. *Re-include if a future change introduces NodeType-level containment.*
- **`kn:body_ref`** — points from M0 nodes to opaque doc-store URNs. Never appears in the type-view.

### 3.4 Edge identity synthesis

Type-view edges are not stored. They are synthesized at query time. Each projected triple gets a stable, deterministic edge ID under the synthesized `kne:` namespace:

```
kne:{source-local}--{predicate-local}--{target-local}
```

where `{*-local}` is the trailing local name of the corresponding URI (everything after the last `#` or `/`).

The `kne:` namespace exists only on the wire and only for type-view edges. It is not authored and never appears as a stored triple.

---

## 4. Self-Loops and the Fixed Point

The substrate's self-typing fixed point is **always** present in the type-view as a self-loop edge:

```
kn:NodeType --kn:type_of--> kn:NodeType
```

This is intentional. Claim 7 rests on the visible self-reference. The frontend renders this as a loop edge on the `kn:NodeType` node.

Other potential self-loops (e.g., a hypothetical `kn:Node kn:subtype_of kn:Node`) do not exist in the substrate; primitives do not subtype themselves.

---

## 5. Excluded by Construction (Why the Spec Stays Small)

Several categories of triples that *could* exist in the graph are deliberately excluded from the type-view. Recording them here so future change-makers know not to add them back without an ADR:

- **Reified edge instances** (`?e a kn:Edge`): M0 content. Render in `view=knowledge` via the SPARQL CONSTRUCT projection rule.
- **PROV-O provenance triples** added by the EVōC + CSO pipeline (per ADR-007): describe minted M0 concepts. Not type-view material.
- **SHACL shapes** (per ADR-005 deferred-bucket resolution for `sh:in`): may exist in the graph if `kn:allowed_values` audit replaces with SHACL. Not projected — shapes describe constraints, which the type-view does not render in v1.
- **External reference ontologies** (CSO, SKOS core, schema.org) when loaded as named graphs: background context, not type-view nodes.

If any of these need to render in the type-view in a future version, that is an explicit spec change requiring an ADR (or this document's revision).

---

## 6. Wire Output Shape

The `/api/graph?view=type` endpoint returns the same `GraphEnvelope` DTO as `view=knowledge`. The output is a uniform graph shape regardless of view, which is what makes Claim 7's "rendered by the same engine" claim concrete.

```jsonc
{
  "nodes": [
    {
      "id":    "<URI of type-view node>",
      "type":  "<URI of kn:NodeType or kn:EdgeType>",
      "label": "<rdfs:label>",
      "properties": {
        "<predicateURI>": <jsonValue>,
        ...
      }
    },
    ...
  ],
  "edges": [
    {
      "id":     "<synthesized kne: URI>",
      "type":   "<projection predicate URI: kn:type_of, kn:subtype_of, rdfs:domain, rdfs:range, or kn:inverse_edge_type>",
      "source": "<URI of source type-view node>",
      "target": "<URI of target type-view node>"
    },
    ...
  ]
}
```

---

## 7. Migration Tasks

These align with the post-Stage-5 reconciliation Step 10 (`meta.ttl` audit) and follow directly from this spec:

1. **Update `nodes-meta.rq`:** no change required (current logic already matches §2). Verify after the `meta.ttl` audit removes visual-style nodes.
2. **Update `edges-meta.rq`:** replace `kn:domain` / `kn:range` in the `VALUES ?type` clause with `rdfs:domain` / `rdfs:range`. Add `kn:type_of` and `kn:inverse_edge_type` to the projected predicate set.
3. **Update `SparqlGraphRepository.cs`** `ExcludedNodePredicates`: replace `kn:domain` / `kn:range` with `rdfs:domain` / `rdfs:range`. Add `kn:inverse_edge_type` (now an edge, not a property). Remove visual-style entries that no longer apply.
4. **Update endpoint tests** (`GraphEndpointTests.cs`, `SparqlGraphRepositoryTests.cs`) to assert the new edge count (the inclusion of `kn:type_of` and `kn:inverse_edge_type` will change the expected number from the current Stage 5 count of 26 edges).

---

## 8. Acceptance Criteria

The type-view spec is correctly implemented when:

1. `/api/graph?view=type` returns a node for every URI typed as `kn:NodeType` or `kn:EdgeType`, plus the four L1 primitives.
2. Every returned edge has a predicate in `{kn:type_of, kn:subtype_of, rdfs:domain, rdfs:range, kn:inverse_edge_type}`.
3. The fixed-point self-loop `kn:NodeType --kn:type_of--> kn:NodeType` is present in the edge list.
4. No visual-style nodes appear (post-`meta.ttl` audit; Step 10).
5. No reified `kn:Edge` instances appear.
6. Frontend rendering of `view=type` and `view=knowledge` uses the same Cytoscape/Sigma rendering pipeline with no view-specific branches.

---

## 9. References

- `ADR-003-reflexivity-as-foundation.md`
- `ADR-005-kn-scope-under-reading-a.md` (especially the namespace addendum and deferred-bucket resolutions)
- `ADR-006-node-as-document-binding.md` (`kn:contains` and `kn:body_ref` semantics)
- `META_MODEL_DESIGN.md` (substrate primitives and meta-property declarations)
- `VISION.md` §4.8 (reflexive substrate), Claim 7
- `backend/Sparql/nodes-meta.rq`, `backend/Sparql/edges-meta.rq` (Stage 5 implementation)
