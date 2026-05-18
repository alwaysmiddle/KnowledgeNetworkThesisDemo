<overview>
Building KnowledgeNetworkDemo — a thesis demo for "Reflexive Knowledge Graphs for Course Authoring" (ADR-003 pivot). Stage 4 is rewriting the C# ASP.NET Core backend + React frontend to consume a reflexive meta-model via a versioned uniform-DTO contract over SPARQL. Current sub-phase: **Stage 4c** — moving SPARQL into embedded `.rq` template files and exposing self-description endpoints (`/api/types`, `/api/styles`, `/api/health`). User prefers mid-stage teaching moments between sub-phases.
</overview>

<history>
1. User said "let's move on" (from Stage 4b committed on main).
   - Checked session state, updated SQL todos: marked `stage-4b-fuseki-adapter` + `block-3-graph-response` done, `stage-4c-sparql-templates` in_progress.
   - Surveyed existing repo shape: `SparqlGraphRepository` (2 inline queries), `IGraphRepository` (1 method), meta-instances.ttl for style/type structure.

2. Built Stage 4c:
   - Created five `.rq` SPARQL template files under `backend/Sparql/` with `__PREFIXES__` placeholder for the canonical PREFIX preamble.
   - Added `Infrastructure/SparqlQueries.cs` — loads embedded resources, substitutes `__PREFIXES__`.
   - Configured csproj `<EmbeddedResource Include="Sparql\*.rq" />`.
   - Added three new DTOs: `TypeCatalog` + `TypeDescriptor`, `StyleCatalog` + `VisualStyle`, `HealthStatus`.
   - Extended `IGraphRepository` with `GetTypesAsync`, `GetStylesAsync`, `GetHealthAsync`.
   - Rewrote `SparqlGraphRepository` to use embedded queries + implement three new fold methods.
   - Added endpoints `/api/types`, `/api/styles`, `/api/health` in `Program.cs` (kept existing `/health` for upstream Jena/Pipeline services).
   - Wrote `TypesStylesHealthEndpointTests.cs` with 10 contract tests.

3. Fixed three build/test failures:
   - Compile: dotNetRDF result type is `ISparqlResult` not `SparqlResult` → changed helper method signatures.
   - `GetTypes_IncludesCanonicalNodeTypes` failed: L2 types (knm:Concept etc.) declare membership with `a` (rdf:type), not `kn:type_of`. Rewrote `types.rq` to use `?id a kn:NodeType` / `?id a kn:EdgeType`.
   - `GetApiHealth` returned 500: nested sub-SELECT-with-AS SPARQL syntax brittle in dotNetRDF. Rewrote `health.rq` to use flat UNION + GROUP BY (`SELECT ?kind (COUNT(*) AS ?c) ... GROUP BY ?kind`), updated fold to pivot rows by kind.

4. Verified and ready to commit:
   - `dotnet test` → 32/32 green.
   - Smoke tested all three endpoints on :5000: 11 nodeTypes, 15 edgeTypes, 12 nodeStyles, 5 edgeStyles, health=healthy (7429 triples / 569 nodes / 1144 edges).
   - Staged all changes; **commit NOT yet made**.
</history>

<work_done>
Files created:
- `backend/Sparql/nodes.rq`, `edges.rq`, `types.rq`, `styles.rq`, `health.rq` — embedded SPARQL templates with `__PREFIXES__` token.
- `backend/Infrastructure/SparqlQueries.cs` — loads embedded resources, substitutes prefix preamble.
- `backend/Models/TypeCatalog.cs` — `TypeCatalog` + `TypeDescriptor` records.
- `backend/Models/StyleCatalog.cs` — `StyleCatalog` + `VisualStyle` records (open-ended `Properties` dict).
- `backend/Models/HealthStatus.cs` — health payload (contractVersion, status, tripleCount, nodeCount, edgeCount).
- `backend/tests/KnowledgeNetworkDemo.Api.Tests/TypesStylesHealthEndpointTests.cs` — 10 tests covering all three new endpoints.

Files modified:
- `backend/KnowledgeNetworkDemo.Api.csproj` — added `<EmbeddedResource Include="Sparql\*.rq" />`.
- `backend/Repositories/IGraphRepository.cs` — added 3 new methods.
- `backend/Repositories/SparqlGraphRepository.cs` — rewritten: reads from `SparqlQueries` constants; added `GetTypesAsync`, `GetStylesAsync`, `GetHealthAsync`; added `TypeAccumulator`/`StyleAccumulator`; helpers now take `ISparqlResult`.
- `backend/Program.cs` — added 3 new endpoint mappings.

Work completed:
- [x] Stage 4a (uniform DTO) — committed
- [x] Stage 4b (SPARQL repository) — committed
- [x] 4c: SPARQL templates as embedded resources
- [x] 4c: Types/Styles/Health DTOs
- [x] 4c: /api/types, /api/styles, /api/health endpoints
- [x] 4c: 10 new tests; 32/32 total passing
- [x] 4c: Smoke-tested on live server
- [ ] **4c: Commit changes (staged but not committed)**
- [ ] 4c: Deliver teaching moment 4c (embedded-resource + reflexive self-description theme)
- [ ] 4d: FusekiHttpQueryClient (production path)
- [ ] 4e: Frontend Zustand stores (useTypeStore, useStyleStore), remove typeRegistry.ts shim
- [ ] 4f: docker-compose + Fuseki bootstrap
</work_done>

<technical_details>
**Stage 4c key decisions:**
- **SPARQL templates as embedded resources**: `.rq` files in `backend/Sparql/`, loaded at static init by `SparqlQueries`, `__PREFIXES__` token substituted with `NamespacePrefixes.SparqlPrefixes`. Means queries are diffable/editable with SPARQL tooling while shipping in the assembly — no runtime file I/O, no content-root assumptions.
- **Types query scope**: Only user-authored types (things declared with `a kn:NodeType` / `a kn:EdgeType`). Excludes L1 primitives (which self-type with `kn:type_of`). This gives 11 node types (9 canonical + knm:PropertyDescriptor + one more) + 15 edge types. Meta-layer self-visualization (Claim 7) will come via a separate endpoint in Stage 5.
- **Style projection**: anchor fields (`appliesTo`, `subtypeOf`, `filterProperty`, `filterValue`) are first-class; everything else (color, border_color, shape, badge, line_style, arrow_head, width, size, label_position) lands in open `Properties` dict. Same reflexive pattern as `KnowledgeNode.Properties`.
- **Health SPARQL**: single query with `UNION` branches + `GROUP BY ?kind` producing 3 rows (triple/node/edge). dotNetRDF's parser is brittle with nested sub-SELECT-as-projection — flat GROUP BY is safer.
- **Status values** in `HealthStatus`: `"empty"` (0 triples) → 503, `"degraded"` (0 nodes) → 200, `"healthy"` → 200.

**dotNetRDF gotchas discovered:**
- Result row type is `ISparqlResult`, NOT `SparqlResult` (compile error otherwise).
- Nested sub-SELECTs in projection with `AS` — brittle; use UNION + GROUP BY.
- `store.Add(graph, mergeIfExists: true)` + `InMemoryDataset(store, unionDefaultGraph: true)` pattern from Stage 4b still in place for named-graph handling across 3 ttl files.

**Meta-model convention clarified:**
- L1 primitives (kn:NodeType, kn:Edge, etc.) declare type with `kn:type_of` (this is the reflexive self-reference — `kn:NodeType kn:type_of kn:NodeType` is the fixed point).
- L2 user types (knm:Concept, knm:prerequisite_of, etc.) declare type with `a` (rdf:type).
- Choose appropriate predicate when querying based on which layer you want.

**Co-authored-by trailer** required on all commits per user instructions.
</technical_details>

<important_files>
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Repositories\SparqlGraphRepository.cs`
  - Core of Stages 4b/4c. Four fold methods (Graph, Types, Styles, Health) all project SPARQL rows → DTOs. **This is the single lossy boundary.**
  - Key sections: `ExcludedNodePredicates` + `ExcludedStylePredicates` sets, fold methods ~L60-170, helpers ~L230+.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Sparql\*.rq`
  - Five SPARQL templates. `__PREFIXES__` substitution point. `health.rq` uses UNION+GROUP BY pattern; `types.rq` uses `a` (not `kn:type_of`) to capture L2 user types.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Infrastructure\SparqlQueries.cs`
  - Static loader for embedded resources. Resource name convention: `<AssemblyName>.Sparql.<filename>`.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Program.cs`
  - 4 endpoints: `/api/graph`, `/api/types`, `/api/styles`, `/api/health` + legacy `/health` (upstream Jena+Pipeline — still present, may retire in 4d).
  - `ResolveDefaultTtlPaths` walks up from ContentRoot to find `infrastructure/jena/data/*.ttl`.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Models\{TypeCatalog,StyleCatalog,HealthStatus}.cs`
  - New 4c DTOs. All have `ContractVersion = "1.0"`. `VisualStyle.Properties` is open-ended `Dictionary<string, JsonElement>`.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\tests\KnowledgeNetworkDemo.Api.Tests\TypesStylesHealthEndpointTests.cs`
  - 10 tests covering catalog shape, canonical types presence, `sys_contains` edge_category=system, ConceptStyle palette, AssessmentTestStyle filter rule, health counts + status.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\infrastructure\jena\data\{meta,meta-instances,domain}.ttl`
  - Ground truth. Styles live in meta-instances.ttl §4 (L270-400). L2 types at §1.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\lib\typeRegistry.ts`
  - Frontend temporary bridge. Will be replaced in 4e by Zustand stores consuming `/api/types` + `/api/styles`.

- `C:\Users\ysz10\.copilot\session-state\692e80fb-990b-4a68-bac5-84e472c1c35c\plan.md`
  - **Stale — reflects pre-pivot Neo4j design.** Should be updated before next major phase but low priority for 4c commit.
</important_files>

<next_steps>
Immediate next steps (resume at commit):

1. **Commit Stage 4c** — changes are fully staged. Commit message should cover:
   - SPARQL templates as embedded resources (diffable, shippable)
   - New `/api/types`, `/api/styles`, `/api/health` endpoints  
   - Three new DTOs with open-ended properties bag on styles
   - dotNetRDF gotchas fixed (ISparqlResult, flat GROUP BY for health)
   - L2 type convention (`a` not `kn:type_of`)
   - 32/32 tests green; smoke tested live
   - Include `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer

2. **Deliver Teaching Moment 4c**: theme is "the reflexive payoff — the server describes itself via the same SPARQL projection pipeline used for domain data." Why embedding SPARQL as resources matters; how `/api/types` + `/api/styles` enable the frontend to stop hardcoding type knowledge.

3. **Update SQL todos**: mark `stage-4c-sparql-templates` done.

4. Then await user direction for Stage 4d (FusekiHttpQueryClient) or 4e (frontend stores).

Remaining Stage 4 sub-phases:
- 4d: FusekiHttpQueryClient (production path); possibly retire legacy `/health` + JenaService/PipelineService if not needed.
- 4e: Frontend Zustand stores consuming new endpoints; remove `typeRegistry.ts` hardcoded shim.
- 4f: docker-compose + Fuseki bootstrap.

No blockers known. Build + tests clean. Server runs on :5000.
</next_steps>