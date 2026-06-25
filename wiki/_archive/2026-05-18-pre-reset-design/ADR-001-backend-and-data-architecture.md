# ADR-001: Backend and Data Architecture

**Status:** Superseded in part by [ADR-003](ADR-003-reflexivity-as-foundation.md) (2026-04-20)
**Original Status:** Accepted (Option B)
**Date:** 2026-04-09
**Deciders:** Shizhong Yu
**Context area:** Cross-cutting — affects all build phases

---

## ⚠️ Amendment — 2026-04-20 (ADR-003 Reflexivity Pivot)

**What still holds:**
- Three-tier architecture: React frontend + C# ASP.NET Core backend + triple store
- `docker-compose` packaging for data layer
- Backend is thin; frontend is pure view
- C# is the backend language
- Jena Fuseki is the inference engine and OWL reasoner

**What has changed:**
- **Neo4j is removed.** The project no longer uses a property graph database.
  All graph data lives in Apache Jena Fuseki as RDF triples. The `Neo4j.Driver`
  NuGet dependency is dropped.
- **Jena becomes primary storage, not just the inference backend.** The ABox
  is authored directly as RDF; there is no Neo4j → RDF conversion step.
- **The data model is reflexive** — types, edge types, and edges themselves
  are nodes in the same graph. See [META_MODEL_DESIGN.md](META_MODEL_DESIGN.md)
  for the bootstrap vocabulary.
- **Cypher disappears.** Traversal strategies become SPARQL queries.
- **The Neo4j schema section below is deprecated.** Retained only as historical
  context for the decision trail.

**Why the pivot:**
ADR-003 commits to reflexivity as the thesis contribution. A property graph
cannot represent edge types as first-class nodes without heavy workarounds;
RDF + OWL handles this natively. See ADR-003 for the full rationale.

**Port assignments still valid:** React 5173, C# backend 5000/5001, Jena 3030.
Neo4j ports (7474, 7687) no longer in use.

---

---

## Context

The current demo is a pure React/Vite frontend with all graph data hardcoded in
`src/data/mockGraph.ts`. There is no backend. The thesis demo must support:

- Live graph data (9 node types, 14 domain edge types + 1 system edge, 559 nodes across 6 courses)
- Three traversal strategies (graph query logic)
- OWL inference via Apache Jena (Claim 2 — derived `assesses` property)
- A validation engine (Claim 3)
- Layered complexity views (graph filter logic)

The question is: **where does data live, how does the frontend query it,
and where does inference happen?**

### One constraint to state upfront

Neo4j **cannot be accessed directly from a browser**. The Neo4j Bolt protocol
(its native binary protocol) requires a server-side driver. Exposing database
credentials in browser JavaScript is also a security anti-pattern even for a
demo. So "use Neo4j directly" always means "use Neo4j via a backend layer" —
the only question is how thin or thick that layer is.

---

## Options Considered

### Option A — Keep mock data, add Jena only (current trajectory)

**Architecture:**
```
React (Vite) ──── in-memory mockGraph.ts
                └── HTTP ──► Jena Fuseki (Docker)  [inference only]
```

All graph data stays as a TypeScript object. Traversal strategies, layer
filtering, and validation all run in the browser as pure functions.
Jena is the only external service — called only when "Run Inference" is clicked.

| Dimension | Assessment |
|---|---|
| Complexity | Low — one external service (Jena), everything else in-browser |
| Demo stability | High — fewer moving parts, less to break during a defense |
| Thesis credibility | Medium — data is a TypeScript file, not a real graph store |
| Cypher / graph query | None — traversal is hand-written TypeScript |
| Setup for examiner | `vite dev` + `docker run jena` |
| Inference claim | ✓ Real OWL reasoning via Jena |

**Pros:**
- Simplest possible setup — already partially built
- Zero risk of DB connection issues during demo
- Traversal logic is visible and teachable (pure TypeScript functions)
- Jena still provides genuine OWL reasoning for the inference claim

**Cons:**
- Data is not in a real graph database — weaker academic story
- Traversal is in-browser imperative code, not declarative graph queries
- Harder to extend beyond demo scale
- The thesis claims "knowledge graph" but the storage is a JavaScript object

---

### Option B — Neo4j + thin backend + Jena (recommended, selected — now C# ASP.NET Core)

**Architecture:**
```
React (Vite) ──── HTTP/REST ──► C# ASP.NET Core Web API (.NET 8)
                                   ├── Neo4j.Driver ──► Neo4j  (graph storage + Cypher queries)
                                   └── HttpClient   ──► Jena Fuseki (Docker)  [OWL inference]
```

Graph data lives in Neo4j. The backend exposes REST endpoints for:
- Fetching the full graph (`GET /api/graph`)
- Running traversal strategies (`GET /api/traverse?strategy=linear&from=variable`)
- Running validation (`GET /api/validate`)
- Triggering inference (`POST /api/infer`) — calls Jena, returns delta of inferred edges

| Dimension | Assessment |
|---|---|
| Complexity | Medium — three services (React, C# backend, Neo4j), plus Jena Docker |
| Demo stability | Medium — more moving parts, but Neo4j is very stable |
| Thesis credibility | High — real property graph DB with Cypher queries |
| Cypher / graph query | ✓ Traversal strategies become Cypher queries |
| Setup for examiner | `vite dev` + `docker-compose up` (Neo4j + Jena together) |
| Inference claim | ✓ Real OWL reasoning via Jena |

**Pros:**
- Real graph database — the thesis claim "knowledge graph" is backed by actual graph storage
- Traversal strategies become Cypher queries — declarative, academically cleaner
- Backend is the right place for Jena integration (server-to-server, no CORS issues)
- `docker-compose` bundles Neo4j + Jena into one command — demo setup is clean
- C# backend is familiar territory as a software developer
- Cypher experience is directly relevant to knowledge graph research

**Cons:**
- Three services instead of one
- Requires designing a REST API between frontend and backend
- Neo4j schema design adds a step before coding (but we need this anyway — see schema section below)
- Slightly more demo setup risk

---

### Option C — Neo4j + backend, programmatic inference (no Jena)

**Architecture:**
```
React (Vite) ──── HTTP/REST ──► Node.js backend
                                   └── Bolt ──► Neo4j
                                   (inference via Cypher rules, no Jena)
```

Instead of Jena, inference rules are implemented as Cypher queries in the backend.
For example: "find all (a)-[:GENERALIZES*]->(b)" gives the transitive closure.

| Dimension | Assessment |
|---|---|
| Complexity | Low-Medium — two services only |
| Demo stability | High |
| Thesis credibility | Medium — inference exists but is not formally OWL |
| Inference claim | ✗ Weakens the claim — it's programmatic traversal, not OWL reasoning |

**Why this is not recommended:**
The thesis specifically argues for OWL-typed formal properties
(TransitiveProperty, SymmetricProperty, derived properties). Replacing Jena
with Cypher traversal means the inference is no longer formally grounded.
A thesis examiner familiar with knowledge representation will ask
"is this OWL inference or just a graph query?" — and the answer would be
"just a graph query." Claim 2 specifically requires a formal reasoner.

---

## Trade-off Analysis

The core tension is **simplicity vs. academic credibility**.

Option A is faster to build and more stable to demo, but the storage layer
is a lie — the thesis claims a knowledge graph, but the data is a JavaScript
object. For a visualization thesis this may be acceptable, but for a thesis
in knowledge representation or graph systems it weakens the argument.

Option B takes more time to build but makes every layer of the system honest:
the data is in a graph database, the queries are graph queries, the inference
is formal OWL reasoning. During the thesis defence, every component can be
pointed to and named correctly.

Option C is a false economy — it removes Jena to save complexity, but Jena
is exactly the component that justifies the inference claim. Removing it
silently degrades the academic contribution.

**The decision hinges on one question:**
Does the thesis examiner expect graph database storage, or is a prototype
visualization with hardcoded data sufficient to validate the claims?

---

## Recommendation

**Option B — Neo4j + thin backend + Jena** (implemented as C# ASP.NET Core).

Reasoning:
1. The backend is needed anyway once Jena is in the picture (server-to-server
   is cleaner than browser-to-Jena)
2. Neo4j adds the graph storage layer the thesis title implies
3. `docker-compose` makes the three-service setup a single command
4. Cypher queries for traversal strategies are academically cleaner than
   hand-written TypeScript graph walks
5. The backend is thin — its only job is to translate REST calls
   into Cypher queries and Jena API calls

---

## Consequences if Option B is accepted

**What becomes easier:**
- Traversal strategies are Cypher queries — readable, testable, and directly
  citable in the thesis
- Adding new data is a Cypher `CREATE` statement, not a TypeScript edit
- The inference pipeline is backend-contained and clean

**What becomes harder:**
- Need to design a REST API (small, but needs to be done)
- Need to learn basic Cypher (see prerequisite reading in the build guide)
- Demo requires `docker-compose up` before presenting

**What we need before writing any code:**
1. ✅ Data schema (node labels, relationship types, properties) — see below
2. ☐ Cypher schema (`CREATE CONSTRAINT`, `CREATE INDEX`)
3. ☐ REST API endpoint list
4. ☐ `docker-compose.yml` outline

---

## Decision

☐ **Option A** — Keep mock data, Jena only  
☒ **Option B** — Neo4j + thin backend + Jena *(selected)*  
☐ **Option C** — Neo4j + backend, no Jena  

**Decided:** Option B, with C# ASP.NET Core Web API replacing the Node.js backend  
**Date:** 2026-04-10

### Amendment: Backend Language

The backend is **C# ASP.NET Core Web API (.NET 8)**, not Node.js/Express.

**Rationale:**
- Developer familiarity with C# exceeds Node.js
- Neo4j has an official `Neo4j.Driver` NuGet package with full parity to the JS driver
- Jena Fuseki communication is HTTP/JSON — language-agnostic
- ASP.NET Core has excellent built-in CORS, DI, and JSON serialization
- From the React frontend's perspective, the REST API is identical regardless of backend language

**Revised architecture:**
```
React (Vite) ──── HTTP/REST ──► ASP.NET Core Web API (.NET 8)
                                  ├── Neo4j.Driver ──► Neo4j (Docker, port 7687)
                                  └── HttpClient   ──► Jena Fuseki (Docker, port 3030)
```

### Amendment: Jena Fuseki Setup

**Decision:** Fuseki + in-memory dataset (no TDB persistent store)

**Rationale:** 559 nodes do not require persistent triple storage. The OWL ontology file (TBox) is loaded from disk at inference time; ABox data is dynamically converted from Neo4j. This simplifies Docker configuration and eliminates disk volume management. See Phase 5 INFERENCE_BACKEND_DESIGN.md for full pipeline details.

### Port Assignments

| Service | Port | Protocol |
|---|---|---|
| React frontend (Vite) | 5173 | HTTP |
| ASP.NET Core backend | 5000 (HTTP) / 5001 (HTTPS) | HTTP |
| Neo4j Browser UI | 7474 | HTTP |
| Neo4j Bolt | 7687 | Bolt |
| Jena Fuseki | 3030 | HTTP |

---

## What Comes Next (Schema Design)

Regardless of which option is chosen, the graph schema is the same.
The only difference is where it lives (TypeScript object vs. Neo4j labels).

### Neo4j node labels (Option B)
Each node type becomes a Neo4j label:

```
(:Concept    { id, label, description? })
(:Principle  { id, label, description? })
(:Example    { id, label, description? })
(:Exercise   { id, label, difficulty? })
(:Assessment { id, label, description? })
(:Reference  { id, label, url?, citation? })
(:Analogy    { id, label, description? })
```

### Neo4j relationship types (Option B)
Each edge type becomes a Neo4j relationship:

```
(:Concept)-[:GENERALIZES]->(:Concept)
(:Concept)-[:PREREQUISITE_OF]->(:Concept)
(:Example)-[:IS_INSTANCE_OF]->(:Concept)
(:Concept)-[:IS_COMPONENT_OF]->(:Concept)
(:Concept)-[:BUILDS_ON]->(:Concept)
(:Concept)-[:CONTRADICTS]->(:Principle)
(:Analogy)-[:IS_ANALOGOUS_TO]->(:Concept)
(:Assessment|:Reference)-[:APPLIES_IN]->(:Concept|:Principle)
(:Concept)-[:COMMONLY_CONFLATED_WITH]->(:Concept)

-- Derived (written by backend after Jena inference, flagged with property)
(:Assessment)-[:ASSESSES { inferred: true }]->(:Concept)
```

### Cypher examples for traversal strategies

**Linear traversal** (follow PREREQUISITE_OF chain from a start node):
```cypher
MATCH path = (start:Concept { id: $startId })-[:PREREQUISITE_OF*]->(end)
RETURN nodes(path), relationships(path)
```

**Explore traversal** (all edges from a node):
```cypher
MATCH (n { id: $nodeId })-[r]-(neighbour)
RETURN n, r, neighbour
```

**Problem-First traversal** (backward from Assessment):
```cypher
MATCH path = (a:Assessment { id: $assessmentId })-[:APPLIES_IN]->
             (:Concept)<-[:PREREQUISITE_OF*]-(prereq)
RETURN nodes(path), relationships(path)
```

These replace the hand-written TypeScript traversal logic in `filterLayer.ts`
and the new `traversalStrategies.ts` — they move to the backend as Cypher.

---

## References

- Neo4j property graph model: https://neo4j.com/docs/getting-started/graph-database/
- Cypher query language: https://neo4j.com/docs/cypher-manual/current/
- Apache Jena Fuseki: https://jena.apache.org/documentation/fuseki2/
- OWL property types (TransitiveProperty, SymmetricProperty): https://www.w3.org/TR/owl-guide/#Properties
