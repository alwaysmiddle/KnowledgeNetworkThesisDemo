# Phase 5: Inference Backend Design

**Status:** Design intent preserved — implementation details need Stage 6 rewrite for Jena-primary architecture  
**Date:** 2026-04-19  
**Depends on:** Phase 1 (domain data), Phase 2 (type system), ADR-001 (architecture)  
**Thesis Claims:** Claim 2 (derived properties via OWL inference)

> **Guiding Principle: Design is direction, not contract.**  
> Implementation will reveal what's practical. Decisions here adapt to implementation reality.

Post-ADR-003 note: Neo4j conversion details in this document are superseded. Stage 6 should keep the inference intent and rules, but implement them directly against Jena/Fuseki and the current `kn:` / `knl:` / `cs:` model.

---

## What This Phase Covers

The inference backend enables Claim 2: a professor clicks "Run Inference" and the system reveals **logically implied relationships** that were never explicitly authored. This is the deductive closure of the authored graph under OWL ontology rules.

**Professor framing:** "The inference engine reveals implicit structure — studying Variable means studying all data type subtypes; a single test assessment implicitly covers 3 join types. Jena derives this automatically from my authored graph."

**Core insight:** Inference is a **logical mirror** — it shows the professor the full consequences of their authoring decisions. Inferred edges serve as both a display feature (dashed lines) and an authoring validation tool (revealing unintended implications).

**Inference catches authoring mistakes:** When the professor runs inference and sees unexpected results, that's a signal that the authored graph contains errors:
- *"My graph implies `Sorting Algorithm generalizes Heap Sort`... but Heap Sort is an instance of Sorting Algorithm, not a subtype. I used `generalizes` when I should have used `is_instance_of`."* → Wrong edge type.
- *"This assessment supposedly `assesses` 47 concepts through transitive closure... that can't be right."* → Prerequisite chain is too long or incorrectly connected.
- *"I see a symmetric `contradicts` edge I never authored — oh, I only drew it in one direction and forgot that contradiction is mutual."* → Symmetric expansion confirms or surprises.

The dashed inferred edges are feedback. If they look wrong, the authored graph has a problem.

---

## Architecture Overview

```
React Frontend                    C# ASP.NET Core Backend
┌───────────────┐                ┌──────────────────────────────────────┐
│               │ POST /api/infer│                                      │
│ "Run Inference"├──────────────►│  1. Clear previous inferred edges    │
│    button     │                │  2. Read all nodes + domain edges    │
│               │                │     from Neo4j                       │
│               │   Response:    │  3. Serialize to RDF Turtle format   │
│               │◄──────────────┤  4. Load TBox (.ttl ontology file)   │
│  { count: 42, │                │  5. Combine TBox + ABox             │
│    edges: [.] }│                │  6. PUT to Jena Fuseki              │
│               │                │  7. SPARQL query all triples         │
│  Add dashed   │                │  8. Diff: returned - sent = delta   │
│  edges to     │                │  9. Write inferred edges to Neo4j   │
│  live graph   │                │ 10. Return delta to frontend        │
└───────────────┘                └──────────┬──────────┬───────────────┘
                                            │          │
                                   Neo4j.Driver    HttpClient
                                            │          │
                                            ▼          ▼
                                      Neo4j :7687  Jena Fuseki :3030
                                      (graph DB)   (OWL reasoner)
```

---

## Resolved Design Decisions

### Q1: OWL Ontology Structure — Dynamic TBox + ABox

**Decision:** The TBox (ontology schema) is a premade `.ttl` file. The ABox (instance data) is dynamically converted from Neo4j at inference time.

**TBox file** (`course-ontology.ttl`) — version-controlled, rarely changes:
- Defines classes: `Concept`, `Principle`, `Example`, `Assessment`, `Reference`, `Analogy`, `Course`, `Professor`, `Program`
- Defines property rules: which edges are `TransitiveProperty`, `SymmetricProperty`, etc.
- Defines the `assesses` derived property rule

**ABox conversion** — C# serializes Neo4j data to RDF triples at runtime:
```
Neo4j:  (:Concept {id: "variable"}) -[:GENERALIZES]-> (:Concept {id: "data-type"})

RDF:    kn:variable   rdf:type        kn:Concept .
        kn:data-type  rdf:type        kn:Concept .
        kn:variable   kn:generalizes  kn:data-type .
```

**Rationale:**
- Single source of truth: Neo4j is the authoritative data store
- Professor edits the graph in Neo4j → inference reflects changes immediately
- Stronger thesis story: live system, not a pre-baked file
- The conversion is a direct 1:1 mapping — our edges have no properties that Jena needs, so the general property-graph ↔ RDF impedance mismatch does not apply

**Identity bridge:** Deterministic URI scheme `kn:{node-id}`. Node IDs are stable across both systems. Mapping is a string operation — strip the namespace prefix to get the Neo4j ID.

---

### Q2: API Contract — Delta Return

**Decision:** `POST /api/infer` returns only the newly inferred edges (delta), not the full graph.

```typescript
// Request
POST /api/infer
// No body needed — backend reads from Neo4j directly

// Response
{
  inferredCount: 42,
  inferredEdges: [
    { source: "variable", target: "integer", type: "generalizes" },
    { source: "quiz-var", target: "variable", type: "assesses" },
    ...
  ]
}
```

**Frontend merge:** Append inferred edges to the live graph state with `inferred: true`. No viewport reset, no layout recalculation, no re-fetch.

**Rationale:**
- Re-fetching the full graph resets viewport position and layout — bad UX
- Delta payload is small — only new edges
- Merge logic is trivial: append-only to a distinct partition (`inferred: true` edges never overlap with authored edges)
- Scales better than full graph replacement

---

### Q3: C# ↔ Jena Integration — Raw HttpClient

**Decision:** No RDF library (e.g., dotNetRDF). C# backend communicates with Jena Fuseki via raw `HttpClient`.

**Jena Fuseki HTTP API:**
```
PUT  /ds/data    ← upload combined TBox + ABox as Turtle
POST /ds/sparql  ← SPARQL query to retrieve all triples
```

**Implementation outline (~60 lines):**
1. **Turtle serializer** (~40 lines): `foreach` node → `kn:{id} rdf:type kn:{type} .` / `foreach` edge → `kn:{source} kn:{edgeType} kn:{target} .`
2. **SPARQL result parser** (~20 lines): parse JSON response from `SELECT ?s ?p ?o WHERE { ?s ?p ?o }`, strip URI prefixes, map back to node IDs

**Rationale:**
- Our data model is simple — no edge properties for RDF, no blank nodes, no reification needed
- ~60 lines of code vs. learning a library API
- Full visibility for thesis examiner — every line is explainable
- Library upgrade path exists for future scalability (dotNetRDF)

---

### Q4: Inference Timing — Manual Only

**Decision:** Inference runs only when the professor clicks "Run Inference." No auto-inference on graph change.

**Rationale:**
- Matches the thesis demo script exactly
- Professor controls when to see inferred edges — not distracting during authoring
- Auto-inference is a future consideration informed by actual usage
- Simpler implementation — no debouncing, no loading state management

---

### Q5: Inference Scope — Full Graph

**Decision:** Send the entire graph (all 559 nodes, all courses) to Jena each time.

**Rationale:**
- At 559 nodes, Jena processes this in milliseconds — no performance concern
- Catches cross-course inferences (e.g., shared principles linking CS101 and CS201)
- Simpler than tracking "what's in the current view"
- Scoped inference is a future optimization for larger graphs

---

## Five Inference Rules

These are the OWL property semantics defined in the TBox. Jena applies them automatically.

| # | Rule | OWL Type | Example |
|---|---|---|---|
| 1 | **Transitive closure of `generalizes`** | `TransitiveProperty` | Variable → Data Type → Integer ⟹ Variable → Integer |
| 2 | **Transitive closure of `prerequisite_of`** | `TransitiveProperty` | A prereq B prereq C ⟹ A prereq C |
| 3 | **Symmetric expansion of `contradicts`** | `SymmetricProperty` | A contradicts B ⟹ B contradicts A |
| 4 | **Symmetric expansion of `is_analogous_to`** | `SymmetricProperty` | Analogy ↔ Concept (both directions) |
| 5 | **Symmetric expansion of `commonly_conflated_with`** | `SymmetricProperty` | A conflated B ⟹ B conflated A |

**Derived property:**

| # | Rule | Mechanism | Example |
|---|---|---|---|
| 6 | **`assesses` derived from `applies_in`** | OWL property chain or SPARQL CONSTRUCT | Assessment `applies_in` Concept ⟹ Assessment `assesses` Concept |

**Note:** Rules 3-5 (symmetric) generate the reverse direction if only one direction was authored. Rules 1-2 (transitive) generate indirect chains. Rule 6 derives a new relationship type from an existing one.

---

## Idempotency: Clear-and-Recompute

When the professor clicks "Run Inference" (including repeat clicks):

```
1. DELETE all edges in Neo4j WHERE inferred = true    ← wipe previous results
2. Run full inference pipeline                         ← fresh computation
3. Write new inferred edges with inferred = true       ← clean slate
4. Return delta to frontend
```

**Rationale:** Simple, correct, no stale edges. At 559 nodes the full recompute is instant. Incremental reasoning is a future optimization for larger graphs.

---

## Inferred Edge Handling

### Partition invariant

```
Neo4j edges at any point in time:

  authored (inferred = false):  professor created these
  inferred (inferred = true):   Jena derived these
  ─────────────────────────────
  These two sets NEVER overlap.
```

An authored edge is never marked as inferred. If the professor explicitly authors an edge that Jena would also infer, the authored version takes precedence (the diff step skips it).

### Frontend rendering

- **Authored edges:** solid lines (existing behavior)
- **Inferred edges:** dashed lines with `inferred: true` flag
- **Count toast:** "42 edges inferred" after inference completes

### Decision table for each triple in Jena's response

| Neo4j state | Action |
|---|---|
| Edge exists with `inferred = false` (authored) | **SKIP** — professor's edge takes precedence |
| Edge exists with `inferred = true` (previous run) | N/A — cleared in step 1 |
| Edge does NOT exist | **CREATE** with `inferred = true` |
| Node ID not found in Neo4j | **ERROR** — URI mapping mismatch, should never happen |

---

## TBox Ontology File Outline

`course-ontology.ttl` — loaded from disk at inference time:

```turtle
@prefix kn:   <http://knowledgenetwork.demo/> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .

# === Classes ===
kn:Concept     rdf:type  owl:Class .
kn:Principle   rdf:type  owl:Class .
kn:Example     rdf:type  owl:Class .
kn:Assessment  rdf:type  owl:Class .
kn:Reference   rdf:type  owl:Class .
kn:Analogy     rdf:type  owl:Class .
kn:Course      rdf:type  owl:Class .
kn:Professor   rdf:type  owl:Class .
kn:Program     rdf:type  owl:Class .

# === Transitive Properties ===
kn:generalizes     rdf:type  owl:TransitiveProperty .
kn:prerequisite_of rdf:type  owl:TransitiveProperty .

# === Symmetric Properties ===
kn:contradicts              rdf:type  owl:SymmetricProperty .
kn:is_analogous_to          rdf:type  owl:SymmetricProperty .
kn:commonly_conflated_with  rdf:type  owl:SymmetricProperty .

# === Object Properties ===
kn:is_instance_of   rdf:type  owl:ObjectProperty .
kn:is_component_of  rdf:type  owl:ObjectProperty .
kn:builds_on        rdf:type  owl:ObjectProperty .
kn:applies_in       rdf:type  owl:ObjectProperty .
kn:demonstrates     rdf:type  owl:ObjectProperty .
kn:teaches          rdf:type  owl:ObjectProperty .

# === Organizational Property (not subject to OWL inference) ===
# Domain 'contains' is omitted from the TBox because it is an organizational
# grouping edge with no OWL inference semantics. It is not transitive,
# symmetric, or involved in any derived property rule.

# === Inverse Properties ===
kn:is_demonstrated_by  owl:inverseOf  kn:demonstrates .

# === Derived Property Rule ===
# assesses: if Assessment applies_in Concept, then Assessment assesses Concept
# (Implemented as SPARQL CONSTRUCT if OWL property chains are insufficient)
kn:assesses  rdf:type  owl:ObjectProperty .
```

**Note on `assesses` derivation:** OWL property chains (`owl:propertyChainAxiom`) can express this if `assesses` is defined as a sub-property of the chain. If Jena's OWL reasoner doesn't support the specific chain needed, fall back to a SPARQL CONSTRUCT query run after OWL reasoning:

```sparql
CONSTRUCT { ?a kn:assesses ?c }
WHERE { ?a kn:applies_in ?c . ?a rdf:type kn:Assessment . }
```

This is a design-time note — the exact mechanism will be determined during implementation.

---

## C# Backend Pipeline (Pseudocode)

```csharp
[HttpPost("api/infer")]
public async Task<InferenceResult> RunInference()
{
    // Step 1: Clear previous inferred edges
    await neo4j.RunAsync("MATCH ()-[r {inferred: true}]->() DELETE r");

    // Step 2: Read all nodes and domain edges from Neo4j
    var nodes = await neo4j.RunAsync("MATCH (n) RETURN n.id, labels(n)[0]");
    var edges = await neo4j.RunAsync(
        "MATCH (a)-[r]->(b) WHERE NOT r.inferred RETURN a.id, type(r), b.id");

    // Step 3: Serialize to Turtle
    var abox = SerializeToTurtle(nodes, edges);

    // Step 4: Load TBox from disk
    var tbox = File.ReadAllText("course-ontology.ttl");

    // Step 5: Combine and upload to Jena
    var combined = tbox + "\n" + abox;
    await http.PutAsync("http://localhost:3030/ds/data",
        new StringContent(combined, Encoding.UTF8, "text/turtle"));

    // Step 6: Query all triples from Jena (includes inferred)
    var allTriples = await SparqlQuery("SELECT ?s ?p ?o WHERE { ?s ?p ?o }");

    // Step 7: Diff — subtract what we sent
    var sentSet = BuildTripleSet(nodes, edges);
    var inferred = allTriples.Except(sentSet);

    // Step 8: Write inferred edges to Neo4j
    foreach (var (src, pred, tgt) in inferred)
    {
        await neo4j.RunAsync(
            "MATCH (a {id: $src}), (b {id: $tgt}) " +
            "CREATE (a)-[r:$pred {inferred: true}]->(b)",
            new { src, tgt, pred });
    }

    // Step 9: Return delta to frontend
    return new InferenceResult
    {
        InferredCount = inferred.Count(),
        InferredEdges = inferred.Select(t => new EdgeDto(t)).ToList()
    };
}
```

---

## Demo Script Reference

From DOMAIN_DATA_DESIGN.md — the exact thesis walkthrough sequence:

1. Graph loads — only authored edges visible
2. Professor clicks **Run Inference**
3. Jena processes the OWL ontology + authored triples
4. New edges appear dashed:
   - `Variable generalizes Integer` (transitive: Variable → Data Type → Integer)
   - `Variable generalizes String` (transitive)
   - `Variable generalizes Boolean` (transitive)
   - `Variable generalizes List` (transitive)
   - `Sorting Algorithm generalizes Heap Sort` (transitive: via CS301 hierarchy)
   - `Normalization generalizes Third Normal Form` (transitive: 1NF → 2NF → 3NF)
   - `Quiz: Variable Basics assesses Variable` (derived from applies_in)
   - `Test: Types and Conversion assesses Data Type` (derived)
   - `Test: Types and Conversion assesses Type Conversion` (derived)
   - `Test: JOIN Types assesses Inner Join` (derived, CS401)
   - `Test: JOIN Types assesses Outer Join` (derived, CS401)
   - ... (all 148 assessments generate `assesses` edges)
5. UI shows count: "N edges inferred"

---

## Future Considerations (Not In Thesis Demo)

- **Auto-inference on graph change** — with debouncing, triggered by edits
- **Scoped inference** — per-course or per-view reasoning for larger graphs
- **dotNetRDF library** — for scalable RDF handling when graph grows beyond 1000+ nodes
- **Incremental reasoning** — only recompute affected inferences when a single edge changes
- **RDF-star** — if edge properties (weights, confidence) become reasoning-relevant
- **Inference provenance** — showing *why* an edge was inferred (which rule, which chain)
