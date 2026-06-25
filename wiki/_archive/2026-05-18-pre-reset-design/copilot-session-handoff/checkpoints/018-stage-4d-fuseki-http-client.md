<overview>
Building **KnowledgeNetworkDemo** — thesis demo for "Reflexive Knowledge Graphs for Course Authoring" (ADR-003 pivot). Current phase is **Stage 4d** — adding a production-path Fuseki HTTP SPARQL client alongside the existing in-memory client, so the same repository code runs against either a local TripleStore (dev/tests) or a remote Apache Jena Fuseki endpoint. User prefers mid-stage teaching moments and ASCII diagrams.
</overview>

<history>
1. User said "let's continue" after 4e commit; requested an ASCII diagram of the architecture.
   - Drew a full-system ASCII showing Turtle → InMemoryFusekiAdapter → SparqlGraphRepository → endpoints → Zustand stores → components.
   - Committed 4c earlier (`d69f18b`), then 4e (`62ebad2`) — frontend Zustand stores consuming /api/types, /api/styles, /api/graph, /api/health. Deleted typeRegistry.ts, graphApi.ts, useGraphData.ts, edgeCategory() shim.
   - Delivered teaching moment 4e on "hardcoded palette is gone" — styling fully data-driven, subtypeOf chain merge, filterProperty variant matching.

2. User said "let's work on stage 4d".
   - Marked `stage-4d-controllers` in_progress in SQL.
   - Surveyed existing infrastructure: IRdfQueryClient (sync interface), InMemoryRdfQueryClient, SparqlGraphRepository, Program.cs (Mode="Fuseki" was a TODO), GraphDataSettings.
   - Changed IRdfQueryClient to async: `Task<SparqlResultSet> QuerySelectAsync(string sparql, CancellationToken ct)`.
   - Updated InMemoryRdfQueryClient to return Task.FromResult.
   - Created FusekiRdfQueryClient — posts SPARQL via HttpClient with `application/sparql-query` content type, accepts `application/sparql-results+json`, parses via SparqlJsonParser.
   - Converted SparqlGraphRepository's four public methods + LoadNodesAsync/LoadEdgesAsync to truly async (5 sequential edits).
   - Wired Mode-based client selection in Program.cs using IHttpClientFactory.CreateClient("Fuseki").
   - Cleaned up stale "stage 4d stub" comment in GraphDataSettings.
   - `dotnet build KnowledgeNetworkDemo.Api.csproj` → succeeded 0 warnings.
   - Was about to create Fuseki-mode integration test with stubbed HttpMessageHandler when compaction triggered.
</history>

<work_done>
Files created:
- `backend/Infrastructure/FusekiRdfQueryClient.cs` — HTTP-based SPARQL client targeting Fuseki. POST `application/sparql-query`, Accept `application/sparql-results+json`, parse with `SparqlJsonParser`. Throws with response body on non-2xx.

Files modified:
- `backend/Infrastructure/IRdfQueryClient.cs` — interface swapped from sync `SparqlResultSet QuerySelect(string)` → async `Task<SparqlResultSet> QuerySelectAsync(string, CancellationToken)`.
- `backend/Infrastructure/InMemoryRdfQueryClient.cs` — QuerySelect renamed to async, wraps sync LeviathanQueryProcessor with `Task.FromResult`.
- `backend/Repositories/SparqlGraphRepository.cs` — all four public methods (GetGraphAsync, GetTypesAsync, GetStylesAsync, GetHealthAsync) now truly async with `await ... ConfigureAwait(false)`. `LoadNodes()` → `LoadNodesAsync(CancellationToken)`, same for edges.
- `backend/Program.cs` — added `builder.Services.AddHttpClient("Fuseki")`, then Mode-based factory selection: `"Fuseki"` → `FusekiRdfQueryClient(factory.CreateClient("Fuseki"), settings.FusekiQueryUrl)`; default → `InMemoryRdfQueryClient(paths)`. Uses `StringComparison.OrdinalIgnoreCase` for mode check.
- `backend/Configuration/GraphDataSettings.cs` — doc comment tightened (removed "stage 4d stub" language).

Work completed:
- [x] IRdfQueryClient async swap
- [x] InMemoryRdfQueryClient async update
- [x] FusekiRdfQueryClient implementation
- [x] SparqlGraphRepository async conversion
- [x] Program.cs Mode-based selection with IHttpClientFactory
- [x] Build: `dotnet build KnowledgeNetworkDemo.Api.csproj` green, 0 warnings
- [ ] **Fuseki-mode integration test** (was about to create when compaction triggered)
- [ ] Verify in-memory path still works (32/32 test baseline after async swap)
- [ ] Commit Stage 4d
- [ ] Teaching moment 4d
- [ ] Optional: retire legacy /health endpoint + JenaService/PipelineService (noted but not required for 4d)
</work_done>

<technical_details>
- **dotNetRDF JSON parsing**: `SparqlJsonParser.Load(SparqlResultSet, TextReader)` is the right entry point for parsing `application/sparql-results+json` response body.
- **HttpClientFactory pattern**: Named client `"Fuseki"` registered with `AddHttpClient("Fuseki")`. Factory resolved in the IRdfQueryClient factory lambda; client lifetime managed by DI so DNS rotation + socket reuse work correctly.
- **Why we changed interface to async instead of sync-over-async**: `.GetAwaiter().GetResult()` on HttpClient calls risks deadlocks on some sync contexts, and ASP.NET Core minimal API endpoints are async anyway. Cleaner to propagate async.
- **SPARQL POST content type**: Must be `application/sparql-query` (query in request body as raw text). Alternative is form-encoded POST with `query=...` param, but raw body is simpler and Fuseki supports both.
- **Mode detection**: `StringComparison.OrdinalIgnoreCase` so `"Fuseki"`, `"fuseki"`, `"FUSEKI"` all work.
- **Assembly build quirk**: `backend/` directory contains both Api.csproj and tests folder with its own csproj → `dotnet build` alone fails with MSB1011. Must specify `KnowledgeNetworkDemo.Api.csproj` or use a solution file.
- **dotNetRDF result row type**: `ISparqlResult` (interface), not `SparqlResult` (discovered earlier in 4c but still relevant here).
- **L2 type declaration convention** (from prior work): User types declare with `a kn:NodeType` (rdf:type); L1 primitives self-type with `kn:type_of`. Types.rq uses `a` pattern.
- **Test baseline before 4d**: 32/32 green. After async swap, need to re-run to confirm no regression from the interface change.
- **Open question**: Should FusekiRdfQueryClient log query text on error? Current implementation includes response body but not the SPARQL that was sent. Probably fine for thesis demo; production would add logging.
- **Open question for test design**: Need a way to inject a stubbed HttpMessageHandler for the named client "Fuseki" in WebApplicationFactory. Typical pattern: override `ConfigureServices` in a `WebApplicationFactory<Program>` and call `services.AddHttpClient("Fuseki").ConfigurePrimaryHttpMessageHandler(() => stub)`.
</technical_details>

<important_files>
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Infrastructure\FusekiRdfQueryClient.cs`
  - NEW. Production SPARQL path. 2110 chars, ~60 lines.
  - Key method `QuerySelectAsync`: builds POST with application/sparql-query content, reads JSON results. Throws `HttpRequestException` with status + body on non-2xx.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Infrastructure\IRdfQueryClient.cs`
  - Interface changed to async. Only one method: `QuerySelectAsync`.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Infrastructure\InMemoryRdfQueryClient.cs`
  - Still loads Turtle files at ctor. `QuerySelectAsync` wraps sync processor with `Task.FromResult`.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Repositories\SparqlGraphRepository.cs`
  - Four public fold methods now truly async; LoadNodesAsync/LoadEdgesAsync private helpers.
  - All SPARQL calls use `await _client.QuerySelectAsync(query, ct).ConfigureAwait(false)`.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Program.cs`
  - Lines ~18-31: added `AddHttpClient("Fuseki")` and Mode-based factory in AddSingleton.
  - When Mode=Fuseki: `new FusekiRdfQueryClient(factory.CreateClient("Fuseki"), settings.FusekiQueryUrl)`.
  - Otherwise: InMemory as before.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Configuration\GraphDataSettings.cs`
  - `Mode` ("InMemory" | "Fuseki"), `TtlPaths` (for InMemory), `FusekiQueryUrl` (for Fuseki).

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\tests\KnowledgeNetworkDemo.Api.Tests\` (not yet modified)
  - Contains GraphEndpointTests, ModelSerializationTests, SparqlGraphRepositoryTests, TypesStylesHealthEndpointTests.
  - Need to add FusekiModeTests or similar for stubbed HTTP path.

- `C:\Users\ysz10\.copilot\session-state\692e80fb-990b-4a68-bac5-84e472c1c35c\plan.md`
  - STALE (pre-pivot). Low priority to refresh.
</important_files>

<next_steps>
Immediate next steps (resume at testing):

1. **Run full test baseline** to confirm async swap didn't break anything:
   `dotnet test` from repo root (should still be 32/32 green).

2. **Create FusekiModeTests.cs** under `backend/tests/KnowledgeNetworkDemo.Api.Tests/`:
   - Use `WebApplicationFactory<Program>` with custom `ConfigureServices` that:
     - Overrides `GraphData:Mode` to `"Fuseki"` via in-memory config
     - Replaces the "Fuseki" named HttpClient's primary handler with a stubbed `HttpMessageHandler` that returns canned `application/sparql-results+json` responses
   - Test cases:
     - `/api/health` happy path — stub returns triple/node/edge counts, assert HealthStatus DTO populated
     - `/api/types` — stub returns small type catalog, assert DTO shape
     - Error path — stub returns 500, assert endpoint surfaces failure (probably 500 to client)
     - Optional: assert POST body contains SPARQL keywords + correct Content-Type header

3. **Smoke test live** — set Mode=Fuseki, FusekiQueryUrl=http://localhost:3030/knowledgenetwork/sparql, start a local Fuseki (if available) or just verify it fails gracefully when unreachable.

4. **Commit Stage 4d** with Co-authored-by trailer covering:
   - Async interface swap (why, risk assessment)
   - FusekiRdfQueryClient implementation details (POST shape, JSON parser)
   - IHttpClientFactory usage for lifetime management
   - Mode-based client selection
   - New test file

5. **Deliver Teaching Moment 4d** — theme: "the interface boundary lets two very different execution models share identical downstream code." Talk about why the abstraction was worth having from Stage 4b (the in-memory path can eventually go away, but the repository + endpoint layers never needed to know).

6. **Update SQL**: `stage-4d-controllers` → done.

Remaining Stage 4 sub-phases:
- 4f: docker-compose + Fuseki bootstrap — would actually test the production path end-to-end with a real Fuseki container.

Then Stage 5 (meta-visualization / Claim 7) awaits user direction.

No blockers. Build green. All changes are additive — InMemory path untouched behaviorally.
</next_steps>