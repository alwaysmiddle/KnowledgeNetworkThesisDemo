<overview>
Shizhong Yu is building KnowledgeNetworkDemo, a thesis demo for "Reflexive Knowledge Graphs for Course Authoring" (ADR-003 pivot). Stage 3 (Turtle meta-model + OWL 2 RL verification) was completed and committed. The conversation is now entering **Stage 4 — Backend Rendering**: rewriting the C# ASP.NET Core backend and React/TypeScript frontend to consume the reflexive meta-model via a uniform JSON contract. User prefers mid-stage teaching moments; session is working through the impedance mismatch between RDF triples (open-world, graph) and C#/TS DTOs (closed-world, tree).
</overview>

<history>
1. User asked to commit Stage 3 before proceeding.
   - Staged `infrastructure/jena/` (3 ttl + 2 .py files). Committed as `3488675` on `main` with thorough message covering generation, verification results, and pivot context.
   - Noted `KnowledgeNetworkDemo-design/` is NOT a git repo (flagged for possible future `git init`).

2. User: "the next section seems pretty big to me, how are we going to tackle it?"
   - Surveyed existing backend (.NET 10, already has `JenaService.cs`, `Neo4jService.cs`, `Models/`) and design docs.
   - Proposed initial 5-phase split: 4a foundations → 4b Fuseki adapter → 4c SPARQL templates → 4d controllers → 4e Docker/Fuseki load. Used dotNetRDF in-memory as Jena stand-in to enable testing without Docker.

3. User: "how is the frontend going to consume a frozen shape though?"
   - Surveyed frontend: `src/types.ts`, `src/lib/graphApi.ts`, `src/components/KnowledgeNode.tsx`, `KnowledgeEdge.tsx`, etc.
   - Sonnet model took over mid-turn and framed answer as style-hardcoded vs style-as-data (A vs B).

4. User: "Ok, I think sonnet model's analysis is abit off, let's do that again"
   - Switched back to Opus. Re-examined and acknowledged Sonnet jumped to a sub-answer. Recognized the bigger issue: existing C# DTOs are type-specific (`AssessmentNode`, `CourseNode`, etc.) which doesn't scale for reflexivity.
   - Proposed uniform DTO: `KnowledgeNode { id, typeUri, label, properties: Record<string, unknown> }` plus `GraphEnvelope { contractVersion, nodes, edges }`. Versioned contract replaces "frozen."

5. User: "before we figure out what to do, how does the ontology types get translated into our react and C# techonologies, isn't relational data fundamentally different from RDF syntax?"
   - Explained four-layer stack: RDF → C# DTO → JSON → TS. Detailed lossy boundaries (open-worldness, multi-typing lost at RDF→DTO). Projection mechanics: SPARQL returns rows, C# folds rows into DTOs with `Properties` dict holding open-schema data in closed-schema language. dotNetRDF for tests, HttpClient+raw SPARQL for prod. No ORM. Frontend doesn't speak RDF.

6. User: "so you are saying basically the type properties will pass to typescript as strings"
   - Clarified three "types" in play: (a) URI identifiers = strings, (b) property values = preserve RDF datatype (bool stays bool, number stays number via xsd:* tags), (c) type metadata = separate `/api/types` lookup table. Walked through end-to-end example: `knd:cs101_as_05` Assessment node RDF → C# DTO → JSON → TS.

7. User: "yes now this make sense, what is our current plan for the next step?"
   - Presented refined Stage 4 plan (4a-4f) with teaching moments queued.

8. User: "let's go"
   - Began Stage 4a. Read remaining frontend files: `App.tsx`, `useGraphData.ts`, `NodeDetailPanel.tsx`, `KnowledgeGraphCanvas.tsx`, `backend/Data/MockGraphData.cs`, `Models/KnowledgeGraph.cs`.
   - **Compaction triggered here before writing any new code.**
</history>

<work_done>
**Files committed this session (in KnowledgeNetworkDemo repo):**
- Commit `3488675` on `main` — Stage 3 artifacts:
  - `infrastructure/jena/data/meta.ttl` (189 triples)
  - `infrastructure/jena/data/meta-instances.ttl` (272 triples)
  - `infrastructure/jena/data/domain.ttl` (6968 triples, 569 nodes + 1144 edges)
  - `infrastructure/jena/generate_domain.py`
  - `infrastructure/jena/verify_owl_rl.py`

**SQL state:**
- `stage-3-domain-reencoding`: done
- `stage-4-backend-rendering`: pending (about to start 4a)
- `block-5-docker-compose`: blocked (will be unblocked in 4f)
- Others unchanged.

**Work completed:**
- [x] Stage 3 committed to git
- [x] Stage 4 plan refined through 4 rounds of Q&A (frontend consumption, impedance mismatch, type representation)
- [x] Surveyed existing backend code (to understand what must be rewritten)
- [x] Surveyed existing frontend code (to understand what must be rewritten)
- [ ] **Stage 4a: Rewrite C# DTOs + TS types** — IN PROGRESS, compacted before any file edits

**Stage 4 sub-phases (agreed):**
- [ ] 4a — Reflexive contract (uniform DTOs + TS types)
- [ ] 4b — Fuseki adapter (dotNetRDF for testing, HttpClient for prod)
- [ ] 4c — Four SPARQL templates: graph.rq, types.rq, styles.rq, health.rq
- [ ] 4d — Controllers + integration tests
- [ ] 4e — Frontend integration (Zustand stores, component rewrites)
- [ ] 4f — Docker Compose + real Fuseki bootstrap (unblocks block-5)
</work_done>

<technical_details>

**The impedance mismatch (the core design insight this session unlocked):**
- RDF = triples (open-world, schema-as-data). C#/TS = objects (closed-world, compile-time schema).
- Translation is lossy at RDF→DTO: open-worldness, multi-typing, URI structure, inference-state all lost.
- Translation is cheap at DTO→JSON→TS: just serialization.
- **Single boundary that matters:** C# repository layer projecting SPARQL rows into DTOs.

**Uniform DTO shape (to be implemented in 4a):**
```csharp
KnowledgeNode  { Id, TypeUri, Label, Properties: Dictionary<string, JsonElement> }
KnowledgeEdge  { Id, Source, Target, TypeUri, Properties: Dictionary<string, JsonElement> }
GraphEnvelope  { ContractVersion, Nodes: List<KnowledgeNode>, Edges: List<KnowledgeEdge> }
```
TypeScript mirror:
```typescript
KnowledgeNode { id: string, typeUri: string, label: string, properties: Record<string, unknown> }
KnowledgeEdge { id: string, source: string, target: string, typeUri: string, properties: Record<string, unknown> }
GraphEnvelope { contractVersion: "1.0", nodes: KnowledgeNode[], edges: KnowledgeEdge[] }
```

**Three "types" in the system (important to keep distinct):**
1. **URI identifiers** (e.g., `"knm:Concept"`) — strings, opaque to TS.
2. **Property values** on node/edge — preserve RDF datatype: `xsd:string→string`, `xsd:boolean→bool`, `xsd:integer→number`, `xsd:dateTime→ISO string`.
3. **Type metadata** (OWL characteristics, parent type, visual style) — lives in separate `/api/types` lookup table, NOT embedded on each node.

**Contract versioning replaces "freezing":**
- `contractVersion: "1.0"` in envelope.
- Add fields → bump minor. Remove fields → bump major. Frontend ignores unknown fields.
- Handles the "shape will need to grow through Stages 5-7" concern.

**dotNetRDF = Python `owlrl`/`rdflib` equivalent for C#:**
- In-memory RDF store with SPARQL 1.1 engine.
- Same W3C-spec semantics as Jena → bit-identical inferences.
- Use for unit tests (load 3 ttl files, run SPARQL templates, assert rows) without spinning up Fuseki.
- Production: swap to `HttpClient` POST-ing SPARQL to Fuseki `/ds/query`.

**Existing frontend state (pre-rewrite baseline):**
- `src/types.ts` — closed-schema types with type-specific fields (`format?`, `courseCode?`, `url?`). Must be replaced.
- `src/components/KnowledgeNode.tsx` has hardcoded `TYPE_STYLES: Record<EducationNodeType, {...}>` at line 13. Must become store-driven.
- `src/components/NodeDetailPanel.tsx` reads `node.courseCode`, `node.url`, `node.format` directly (lines 54-75). Must become `node.properties[uri]` lookups.
- `src/components/KnowledgeGraphCanvas.tsx` has similar `TYPE_MINIMAP_COLORS` hardcoded at line 26. Must become store-driven.
- `src/lib/graphApi.ts` returns `KnowledgeGraph` directly; needs to return `GraphEnvelope`.
- `src/App.tsx` treats `graph` as `{nodes, edges}` — will work if envelope flattens on client side.
- `src/hooks/useGraphData.ts` — thin wrapper over fetchGraph; may need to handle three parallel stores.

**Existing backend state (pre-rewrite baseline):**
- `backend/Models/KnowledgeNode.cs` — has type-specific records (`AssessmentNode`, `CourseNode`, `ProfessorNode`, `ProgramNode`, `ReferenceNode`) inheriting from `KnowledgeNode`. ALL must be deleted and replaced with single uniform record.
- `backend/Models/KnowledgeEdge.cs` — has `EdgeCategory` enum, `OWLPropertyType` enum, `SystemEdgeProperties` record. These get absorbed into generic `Properties` dict.
- `backend/Models/KnowledgeGraph.cs` — simple `{Nodes, Edges}`. Rename to `GraphEnvelope`, add `ContractVersion`.
- `backend/Data/MockGraphData.cs` — hand-coded 22 nodes + 32 edges, used for current `/api/graph` endpoint. Will become obsolete once SPARQL-backed repository works. **Keep temporarily for fallback when Fuseki offline.**
- `backend/Services/JenaService.cs` — exists but wasn't examined in detail. Will be rewritten as `FusekiClient` in 4b.
- `backend/Services/Neo4jService.cs`, `PipelineService.cs` — must be deleted (ADR-003 removed Neo4j).
- `backend/tests/KnowledgeNetworkDemo.Api.Tests/` — exists; will host unit tests for SPARQL templates in 4c.

**Ports (from project config):** API :5000/:5001, Fuseki :3030, Frontend :5173.

**Unresolved questions:**
- Exact JSON datatype handling: `JsonElement` vs `object` in C# Properties dict? `System.Text.Json.JsonElement` is probably right for preserving source datatype through serialization.
- Property key format on the wire: full prefixed URI `"knm:format"` or stripped `"format"`? Leaning toward prefixed-compact (`knm:format`) for reflexivity — frontend can pattern-match across properties the same way it looks up types.
- Whether `typeUri` should be the primary type or all rdf:types as an array. Nodes have one `a knm:X`, so primary-type-as-string is fine; if OWL reasoner materializes `owl:Thing` etc., filter those out in SPARQL.
- Whether the NodeDetailPanel should render all `properties` reflectively (label-from-type-registry + value rendering) or keep curated fields. Reflective is the "Claim 7 purist" answer.

</technical_details>

<important_files>

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Models\KnowledgeNode.cs`
  - Will be rewritten in 4a. Currently has 5 type-specific record classes.
  - Replace with single `KnowledgeNode { Id, TypeUri, Label, Properties: Dictionary<string, JsonElement> }`.
  - ~45 lines, simple replacement.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Models\KnowledgeEdge.cs`
  - Will be rewritten in 4a. Currently has `EdgeCategory`, `OWLPropertyType` enums, `SystemEdgeProperties` record.
  - Replace with `KnowledgeEdge { Id, Source, Target, TypeUri, Properties: Dictionary<string, JsonElement> }`. Category/OWL moved into Properties dict or derived from type registry.
  - ~40 lines, simple replacement.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Models\KnowledgeGraph.cs`
  - Rename to `GraphEnvelope`, add `ContractVersion = "1.0"` field.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Data\MockGraphData.cs`
  - Currently the data source for `/api/graph`. Will become incompatible with new DTO shape.
  - Options: delete (rely on Fuseki from 4b onwards) OR rewrite to emit new uniform shape. Probably **delete** — we have real Turtle data now.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Services\JenaService.cs` / `Neo4jService.cs` / `PipelineService.cs`
  - `Neo4jService` and `PipelineService` → delete (ADR-003).
  - `JenaService` → rewrite as `FusekiClient` in 4b.
  - Not yet read in this session; read before editing.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\types.ts`
  - Lines 1-68. Replace entire file with uniform DTOs + contract envelope. Drop `EducationNodeType` union (types are data, not compile-time constants).

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\components\KnowledgeNode.tsx`
  - Line 13 `TYPE_STYLES` hardcoded map must die. Replace with Zustand `useStyleStore` lookup by `typeUri`.
  - Line 27 fallback to Concept must die — unknown types render neutral grey until type registry refreshes.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\components\KnowledgeGraphCanvas.tsx`
  - Line 26 `TYPE_MINIMAP_COLORS` hardcoded map, line 38 `ALL_TYPES` enum. Both replaced with store-driven lookups.
  - Line 87 `nodeType: n.type` → `typeUri: n.typeUri`.
  - Line 105-106 reads `e.relationship`, `e.category` → must compute from `e.typeUri` + type-registry lookup.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\components\NodeDetailPanel.tsx`
  - Line 11 `TYPE_COLORS` hardcoded map — store-driven.
  - Lines 54-75 reads `node.courseCode`, `node.url`, `node.format` directly — must become generic property iteration OR curated-with-fallback.
  - Line 85/108 `e.relationship` → derive from `e.typeUri` + type registry.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\lib\graphApi.ts`
  - Simple rewrite: return `GraphEnvelope`, unwrap to `{nodes, edges}` for backward compat OR update callers.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\hooks\useGraphData.ts`
  - Will expand to three parallel fetches (graph, types, styles) with Zustand stores. Possibly split into `useTypeStore`, `useStyleStore`, `useGraphStore` bootstraps.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\App.tsx`
  - Minor: handle `GraphEnvelope` vs raw `KnowledgeGraph`. May need loading state for 3 parallel fetches.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\infrastructure\jena\data\*.ttl` (3 files)
  - The ground truth. All SPARQL in 4c queries these. Already committed and OWL 2 RL verified.

</important_files>

<next_steps>

**Immediate next step (Stage 4a — where compaction hit):**

1. Rewrite `backend/Models/KnowledgeNode.cs`, `KnowledgeEdge.cs`, `KnowledgeGraph.cs` to uniform shape with `Properties: Dictionary<string, JsonElement>` and `ContractVersion`. Delete all type-specific records.

2. Delete `backend/Services/Neo4jService.cs`, `backend/Services/PipelineService.cs`, `backend/Data/MockGraphData.cs` (per ADR-003 + new SPARQL-backed flow).

3. Rewrite `src/types.ts` to mirror the uniform shape. Drop `EducationNodeType` union.

4. Update 4 frontend components to compile against new types — temporarily hardcode a small type registry map inline so compile succeeds; real registry comes from `/api/types` in 4e.

5. Update `src/lib/graphApi.ts` to unwrap `GraphEnvelope`.

6. Run `dotnet build` and `npm run build` to verify both still compile. Run existing tests to see baseline.

7. Commit 4a. Deliver **Teaching Moment 4a** — "Why uniform DTOs dissolve the impedance mismatch."

**Then proceed to:**
- 4b — Fuseki adapter with dotNetRDF for testing
- 4c — SPARQL templates (graph.rq, types.rq, styles.rq, health.rq) with unit tests
- 4d — Controllers + integration tests
- 4e — Frontend stores and component rewrites
- 4f — Docker Compose + Fuseki bootstrap

**Open design questions to resolve during 4a:**
- Use `System.Text.Json.JsonElement` for Properties values? (Probably yes.)
- Property key format: `"knm:format"` prefixed-compact OR `"format"` stripped? (Leaning prefixed for reflexivity.)
- Delete `MockGraphData.cs` outright OR keep an offline-demo fallback? (Suggest delete; ttl files are now canonical.)

</next_steps>