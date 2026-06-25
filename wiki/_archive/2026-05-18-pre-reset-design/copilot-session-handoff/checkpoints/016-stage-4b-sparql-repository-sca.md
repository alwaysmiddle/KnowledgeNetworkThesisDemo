<overview>
Building KnowledgeNetworkDemo, a thesis demo for "Reflexive Knowledge Graphs for Course Authoring" (ADR-003 pivot from Neo4j curriculum viz → Jena reflexive meta-model). Stage 4 in progress: rewriting C# ASP.NET Core backend + React/TypeScript frontend to consume the reflexive meta-model via a versioned uniform-DTO contract. User prefers mid-stage teaching moments between sub-phases.
</overview>

<history>
1. User approved plan for Stage 4a (uniform DTO contract) and said "let's go"
   - Surveyed existing backend (5 type-specific record subclasses, Neo4j service, mock data) and frontend (hardcoded TYPE_STYLES, closed-schema fields)
   - Rewrote C# models: single `KnowledgeNode`/`KnowledgeEdge` records with `Properties: Dictionary<string, JsonElement>`; added `GraphEnvelope` with `ContractVersion = "1.0"`
   - Deleted `Neo4jService.cs`, `MockGraphData.cs`, `KnowledgeGraph.cs`, `MockDataContractTests.cs`, `UnitTest1.cs`; dropped `Neo4j.Driver` package
   - Added `StubGraphData.cs` (5 nodes, 5 edges) as temporary `/api/graph` source
   - Rewrote frontend `types.ts`, `graphApi.ts` (with version check), added `lib/typeRegistry.ts` (short-name-keyed styles as temporary bridge)
   - Updated 4 components: `KnowledgeNode`, `KnowledgeEdge`, `KnowledgeGraphCanvas`, `NodeDetailPanel` — all drive off `typeUri` + derive short name; `NodeDetailPanel` renders properties reflectively with datatype-aware value rendering
   - Verified: backend 11/11 tests pass, `npm run build` clean
   - Committed as "Stage 4a: uniform reflexive DTO contract"
   - Delivered teaching moment 4a — impedance mismatch dissolves at single boundary (SPARQL-row → C#-record), reflexivity becomes runtime-free

2. User said "let's continue" → started Stage 4b (Fuseki adapter)
   - Installed `dotNetRDF 3.3.0` package on Api project
   - Created `Configuration/GraphDataSettings.cs` (Mode: InMemory|Fuseki, TtlPaths, FusekiQueryUrl)
   - Created `Infrastructure/NamespacePrefixes.cs` — canonical URI↔prefix map + `Shorten()` + `SparqlPrefixes` preamble
   - Created `Infrastructure/IRdfQueryClient.cs` abstraction + `InMemoryRdfQueryClient.cs` (loads ttl files into `TripleStore`, wraps `LeviathanQueryProcessor`)
   - Created `Repositories/IGraphRepository.cs` interface
   - Created `Repositories/SparqlGraphRepository.cs` — runs 2 SPARQL queries (classical nodes scoped to `knd:` namespace + reified edges `?e a kn:Edge`), folds rows into envelope, preserves xsd datatypes via `ToJsonElement()`
   - **Compaction triggered here — BEFORE verifying build + wiring DI + writing tests**
</history>

<work_done>
**Stage 4a (committed on main):** Commit message "Stage 4a: uniform reflexive DTO contract (backend + frontend)". 22 files changed, +432/-881.

**Stage 4b (in progress, uncommitted):**

Files created:
- `backend/Configuration/GraphDataSettings.cs` — config for data source mode + ttl paths
- `backend/Infrastructure/NamespacePrefixes.cs` — URI shortening + SPARQL prefix preamble
- `backend/Infrastructure/IRdfQueryClient.cs` — query abstraction
- `backend/Infrastructure/InMemoryRdfQueryClient.cs` — dotNetRDF TripleStore-backed impl
- `backend/Repositories/IGraphRepository.cs` — repo contract
- `backend/Repositories/SparqlGraphRepository.cs` — SPARQL → GraphEnvelope projection

Files modified:
- `backend/KnowledgeNetworkDemo.Api.csproj` — added `dotNetRDF 3.3.0`

Work completed:
- [x] Stage 4a full: DTOs + frontend + tests + commit
- [x] 4b infrastructure scaffolding (repository + client + URI shortening)
- [ ] **4b: build verification of the new repository code (UNTESTED — compaction hit before `dotnet build`)**
- [ ] 4b: wire `IGraphRepository` into DI in `Program.cs`; replace `StubGraphData` in `/api/graph`
- [ ] 4b: update `appsettings.json` with `GraphData:TtlPaths` pointing at `infrastructure/jena/data/*.ttl`
- [ ] 4b: delete `StubGraphData.cs`
- [ ] 4b: add tests — `SparqlGraphRepositoryTests` against the real ttl files (verify node count ≈569, edge count ≈1144, property datatype preservation, prefixed-compact URI output)
- [ ] 4b: update `GraphEndpointTests.cs` — since `/api/graph` now returns real domain data (~569 nodes), existing assertions still hold but count expectations should broaden
- [ ] 4b: verify `dotnet test` passes
- [ ] 4b: commit + teaching moment (SPARQL-row projection = the one boundary that matters)

`SparqlGraphRepository` is the most recent file written, not yet compiled.
</work_done>

<technical_details>

**Architecture decisions locked this session:**
- Property values on the wire: `JsonElement` (C#) / `unknown` (TS), preserving xsd:boolean → JSON bool, xsd:integer/int/long → JSON number (int), xsd:decimal/double/float → JSON number (double), xsd:dateTime + plain strings → JSON string. URI values are shortened.
- Property keys on the wire: **prefixed-compact** (`"knm:format"`, `"kn:description"`). Chosen for reflexivity — frontend pattern-matches across properties same way it does types.
- URI identifiers throughout: prefixed-compact (`"knd:cs101"`, `"knm:Concept"`). `NamespacePrefixes.Shorten()` is the single point-of-truth.
- Repository scope for 4b: **domain layer only** — SPARQL filters `STRSTARTS(STR(?id), "http://knowledgenetwork.local/domain#")`. Meta/meta-instance layers come online when Claim 7 reflexivity is wired in stage 5.
- Multi-valued properties: **last-wins** for 4b (single JsonElement). To be revisited in 4c when property-descriptor cardinality arrives.
- Excluded predicates from `properties` dict (already first-class): `rdf:type`, `rdfs:label`, `kn:type_of`, `kn:source`, `kn:target`.
- Contract versioning: `contractVersion: "1.0"` in envelope. Frontend validates major in `graphApi.ts`. Minor bumps for added fields, major for breaking.
- Edge category derivation (frontend shim): `typeUri.startsWith('kn:sys_') ? 'System' : 'Domain'`. Real source is `kn:edge_category` metadata on edge-type node, exposed via `/api/types` in 4c.

**dotNetRDF idioms used:**
- `TripleStore` + `TurtleParser` for loading files
- `InMemoryDataset(store)` wrapping store
- `LeviathanQueryProcessor(dataset)` for SPARQL execution
- `SparqlQueryParser().ParseFromString(sparql)` → `ProcessQuery(query)` returns `object`; must cast to `SparqlResultSet` for SELECT
- Rows accessed via `SparqlResultSet.Results` (IEnumerable<SparqlResult>); `row["varname"]` returns `INode` (null if unbound)
- `row.HasBoundValue("var")` to check OPTIONAL variables
- `INode` subtypes: `IUriNode` (has `.Uri.AbsoluteUri`), `ILiteralNode` (has `.Value` + `.DataType`)

**Turtle data shape:**
- Nodes: `knd:X a knm:TYPE ; rdfs:label "..." ; kn:description "..." ; <other_props> .`
- Edges: fully reified as `knd:edge_NNNNN a kn:Edge ; kn:type_of knm:relation ; kn:source X ; kn:target Y .`
- 3 files under `infrastructure/jena/data/`: meta.ttl (189 triples, L1 primitives), meta-instances.ttl (272 triples, L2 types), domain.ttl (6968 triples, 569 nodes + 1144 edges)

**Frontend typeRegistry bridge:** `src/lib/typeRegistry.ts` hardcodes 9 type styles keyed by short name. Will be replaced by `/api/styles` Zustand store in 4e. Graceful fallback to neutral grey for unknown types.

**Open questions / risks for 4b not yet resolved:**
- `SparqlGraphRepository` is written but not compiled — may have dotNetRDF API mismatches (e.g. `row.HasBoundValue` method signature, `SparqlResultSet.Results` property name). Check at build.
- `TtlPaths` in appsettings are relative paths — resolution needs `IHostEnvironment.ContentRootPath` or absolute. Likely need `Path.Combine(env.ContentRootPath, "../infrastructure/jena/data/meta.ttl")` or similar. Decide in DI wire-up.
- `GraphEndpointTests` first-node assertion: real domain data's first node ordering depends on SPARQL + dictionary iteration, which is nondeterministic. Tests may need to switch to "any node matches" assertions.
- Fuseki HTTP client (`FusekiHttpQueryClient`) deferred to stage 4d when Docker Compose brings up Fuseki.
</technical_details>

<important_files>

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Repositories\SparqlGraphRepository.cs`
  - Most recent file; core of Stage 4b. Runs 2 SPARQL queries, folds into GraphEnvelope.
  - Not yet compiled — **needs `dotnet build` next**.
  - Key sections: `LoadNodes()` (SPARQL + row folding via `NodeAccumulator`), `LoadEdges()` (4 required bindings), `ToJsonElement()` (xsd datatype dispatch), `ExcludedPredicates` set (lines ~30-37).

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Infrastructure\InMemoryRdfQueryClient.cs`
  - Loads ttl files into TripleStore at construction; throws FileNotFoundException on missing files.
  - DI lifetime: **singleton** (one store per app instance).

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Infrastructure\NamespacePrefixes.cs`
  - Central URI↔prefix map (7 entries: kn, knm, knd, rdfs, rdf, owl, xsd).
  - `Shorten()` + `SparqlPrefixes` static property. Single source of truth.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Program.cs`
  - **Needs editing next.** Currently wires `StubGraphData` into `/api/graph`. Must swap to `IGraphRepository.GetGraphAsync()`.
  - Must register `IRdfQueryClient` (InMemory variant) + `IGraphRepository` (SparqlGraphRepository) in DI.
  - Must bind `GraphData` config section.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\appsettings.json` / `appsettings.Development.json`
  - Not yet viewed/edited. Need to add `"GraphData": { "Mode": "InMemory", "TtlPaths": [...] }`.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Data\StubGraphData.cs`
  - **Delete after `/api/graph` switches to repository.**

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\tests\KnowledgeNetworkDemo.Api.Tests\GraphEndpointTests.cs`
  - May need updates when `/api/graph` returns real domain data (~569 nodes) — specifically the "GetGraph_EdgeEndpoints_ReferenceExistingNodes" test will now iterate 1144 edges.
  - Tests project must add project ref / path to ttl files for integration.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\infrastructure\jena\data\{meta,meta-instances,domain}.ttl`
  - Ground truth source. Repository reads these directly. Already committed (commit 3488675).

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Models\{KnowledgeNode,KnowledgeEdge,GraphEnvelope}.cs`
  - Uniform DTO shape from 4a. Unchanged in 4b but central to projection target.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\lib\typeRegistry.ts`
  - Frontend temporary bridge. Remove in 4e when `/api/styles` arrives.

</important_files>

<next_steps>

**Immediate next actions (resume 4b):**

1. **Run `dotnet build` on `KnowledgeNetworkDemo.Api.csproj`** to catch dotNetRDF API mismatches in `SparqlGraphRepository` (particularly `row.HasBoundValue`, `SparqlResultSet.Results`, node type casts). Fix any compile errors.

2. **View `backend/appsettings.json` + `appsettings.Development.json`**; add:
   ```json
   "GraphData": {
     "Mode": "InMemory",
     "TtlPaths": [
       "../infrastructure/jena/data/meta.ttl",
       "../infrastructure/jena/data/meta-instances.ttl",
       "../infrastructure/jena/data/domain.ttl"
     ]
   }
   ```

3. **Edit `Program.cs`:**
   - Add `builder.Services.Configure<GraphDataSettings>(builder.Configuration.GetSection("GraphData"));`
   - Register `IRdfQueryClient` as singleton, resolving ttl paths relative to `ContentRootPath`
   - Register `IGraphRepository` → `SparqlGraphRepository` as singleton
   - Change `/api/graph` to `async (IGraphRepository repo) => Results.Ok(await repo.GetGraphAsync())`

4. **Delete `backend/Data/StubGraphData.cs`.**

5. **Write `SparqlGraphRepositoryTests`** (new file in tests project):
   - Construct `InMemoryRdfQueryClient` with the 3 ttl paths
   - Assert node count ≈ 569, edge count ≈ 1144
   - Assert a known node (e.g. `knd:cs101`) has `typeUri == "knm:Course"`, expected label, `"kn:course_code"` property with string value
   - Assert at least one edge has expected source/target/typeUri

6. **Update `GraphEndpointTests`** if count-sensitive assertions break.

7. **Run `dotnet test`** — target 15+ passing tests total.

8. **Commit Stage 4b** with message covering: SPARQL projection architecture, dotNetRDF in-memory strategy, Fuseki HTTP client deferred to 4d.

9. **Deliver Teaching Moment 4b**: "The single lossy boundary" — why the row-to-record fold is the only place where open-world → closed-world translation happens, and what that means for future features (inference, editing).

**Blockers:** None known. If dotNetRDF API surface differs from assumed, consult NuGet docs via `web_fetch` on nuget.org/packages/dotNetRDF.

**Remaining Stage 4 sub-phases after 4b:**
- 4c: four SPARQL templates (graph.rq, types.rq, styles.rq, health.rq) + `/api/types`, `/api/styles` endpoints
- 4d: `FusekiHttpQueryClient` (production path) + controllers cleanup
- 4e: frontend Zustand stores (useTypeStore, useStyleStore), remove `typeRegistry.ts`
- 4f: Docker Compose + Fuseki bootstrap (unblocks `block-5-docker-compose` todo)

</next_steps>