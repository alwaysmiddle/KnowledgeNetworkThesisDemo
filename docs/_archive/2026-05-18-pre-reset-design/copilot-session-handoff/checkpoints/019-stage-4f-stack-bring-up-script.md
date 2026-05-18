<overview>
Working on **KnowledgeNetworkDemo** — thesis demo for "Reflexive Knowledge Graphs for Course Authoring" (ADR-003 pivot). Just completed **Stage 4f** (docker-compose stack) plus a companion interactive bring-up script. Stack is live and green. About to start **Stage 5** (meta-visualization / Claim 7: the engine visualizes itself using the same UI, styles, traversals, and inference as the domain content).
</overview>

<history>
1. User said "let's keep going" — resumed from compacted Stage 4d summary.
   - Wrote `FusekiRdfQueryClientTests.cs` (5 tests: POST method, URL, body, Accept, JSON parsing, error propagation) using stub HttpMessageHandler.
   - Wrote `FusekiModeWiringTests.cs` — `WebApplicationFactory` overrides `GraphData:Mode=Fuseki`, asserts `/api/graph` invokes a recording HTTP handler.
   - 38/38 tests green. Committed as `61dca29`.
   - Delivered Teaching Moment 4d with ASCII diagram on the interface seam paying off.

2. User: "let's test this first" (Stage 4f docker stack).
   - Wrote `backend/Dockerfile` (multi-stage net10.0 SDK→aspnet), `Dockerfile.frontend` (vite build + nginx), `infrastructure/frontend/nginx.conf` (SPA fallback + `/api` reverse proxy), `infrastructure/fuseki/{bootstrap.sh,Dockerfile}` (alpine+curl loader), rewrote `docker-compose.yml` (removed neo4j, added fuseki+bootstrap+api+frontend with dependency chain).
   - Committed as `1a1917e`.
   - Live bring-up hit four real-world issues — fixed them iteratively:
     * **CRLF in bootstrap.sh** → "exec format error" in alpine. Rewrote LF, added `.gitattributes`.
     * **Fuseki requires basic auth for writes** (HTTP 401). Added `-u admin:$FUSEKI_PASSWORD` to bootstrap.
     * **appsettings.json `Urls: http://localhost:5000` beat ASPNETCORE_URLS env**. Removed from appsettings.
     * **aspnet:10.0 has no wget/curl**. Added `apt-get install curl` + switched healthcheck.
   - Committed fixes as `3077ebb`. Final state: 4 containers healthy, 7429 triples / 569 nodes / 1144 edges, SPA + /api proxy working.

3. User: "let's write your experience into one interactive automatically script that spins up this process."
   - Created `scripts/start-stack.ps1` — PowerShell script with interactive menu + `-Action` flags (up, down, restart, build, rebuild, smoke, logs, status).
   - Encodes Docker Desktop readiness probe, compose build/up, health wait (inspects .State.Health.Status for fuseki/api, .State.Status for frontend), compact smoke tests printing per-endpoint summaries, auto-dumps last 25 log lines on failure.
   - Verified live via `-Action status`, `-Action smoke`, `-Action restart` — all green.
   - Committed as `3dd7610`.

4. User: "I was thinking of making this into linux and mac compatible, but I guess it's too early for that. Let's move to stage 5"
   - Listed design doc folder — identified relevant files for Stage 5 planning.
   - Paused here (compaction triggered).
</history>

<work_done>
Commits landed this session (on `main`):
- `61dca29` — Stage 4d: FusekiRdfQueryClient production path + tests
- `1a1917e` — Stage 4f: docker-compose stack
- `3077ebb` — Stage 4f smoke-fixes (CRLF, auth, URLS, curl)
- `3dd7610` — scripts/start-stack.ps1

Files created:
- `backend/tests/KnowledgeNetworkDemo.Api.Tests/FusekiRdfQueryClientTests.cs`
- `backend/tests/KnowledgeNetworkDemo.Api.Tests/FusekiModeWiringTests.cs`
- `backend/Dockerfile` + `backend/.dockerignore`
- `Dockerfile.frontend` + `.dockerignore` (root) + `.gitattributes`
- `infrastructure/frontend/nginx.conf`
- `infrastructure/fuseki/Dockerfile` + `bootstrap.sh`
- `scripts/start-stack.ps1`

Files modified:
- `docker-compose.yml` — full rewrite, neo4j removed
- `.env` — trimmed to `FUSEKI_ADMIN_PASSWORD=jenapass`
- `backend/appsettings.json` — removed `Urls` entry

Current state:
- Docker stack running: fuseki (healthy, 7429 triples) + api (healthy) + frontend (running on :3000)
- 38/38 backend tests green
- `scripts/start-stack.ps1` tested live, all actions work
- SQL todos: `stage-4d-controllers` done, `stage-4f-docker-compose` done, `stage-4f-script` done
- **Stage 5 pending** — not yet started

Untested:
- Linux/Mac portability of `start-stack.ps1` (user acknowledged deferred)
</work_done>

<technical_details>
- **Docker Desktop readiness pattern**: `docker info --format '{{.ServerVersion}}'` as probe, Start-Process `Docker Desktop.exe`, poll up to 3 min.
- **Fuseki Shiro config requires basic auth for POST/DELETE** on data endpoints. GET/SPARQL reads are anonymous. `stain/jena-fuseki` image default user: `admin` / password from `ADMIN_PASSWORD` env.
- **Graph Store Protocol load**: `POST http://fuseki:3030/<dataset>/data?default` with `Content-Type: text/turtle`. `DELETE ...?default` to clear. Idempotent bootstrap pattern.
- **ASP.NET config precedence quirk**: appsettings.json `"Urls"` key was winning over `ASPNETCORE_URLS` env in .NET 10 container. Resolution: remove `Urls` from appsettings entirely; let env / Kestrel defaults drive binding. `ASPNETCORE_URLS=http://+:5000` must be set.
- **Windows CRLF vs alpine**: shell scripts authored on Windows need `.gitattributes` with `text=auto eol=lf` AND explicit LF rewrite in-place (git may not convert existing working-tree files).
- **aspnet:10.0 image has no wget or curl** — must `apt-get install curl` in runtime stage for healthcheck.
- **dotNetRDF JSON parsing**: `SparqlJsonParser.Load(SparqlResultSet, TextReader)` for `application/sparql-results+json`.
- **SPARQL POST shape**: `Content-Type: application/sparql-query`, query as raw body. Simpler than form-encoded.
- **Compose dependency chain that actually works**: `fuseki: service_healthy` → `fuseki-bootstrap: service_completed_successfully` → `api: service_healthy` → `frontend`. Prevents all race conditions.
- **Data counts reference**: 7429 triples = 6968 domain + 272 meta-instances + 189 meta. Projects to 569 nodes + 1144 edges in the uniform reflexive shape.
- **Types API shape**: returns `{nodeTypes: [...], edgeTypes: [...]}` — 11 node types + 15 edge types from meta-instances.ttl.
- **Orphan containers warning** in compose comes from pre-pivot kn-demo-pipeline/kn-demo-neo4j/kn-demo-jena. Script uses `--remove-orphans` to clean up.

Stage 5 design context (from checkpoints 011-012):
- **Claim 7**: reflexivity demonstrated by rendering the meta-model (types + edge types + edges themselves as nodes) using the same pipeline as domain content.
- All three levels: L1 primitives (kn:Node, kn:NodeType, kn:EdgeType, kn:Edge), L2 meta-instances (9 node types, 13+2 edge types), L3 domain instances.
- Currently `/api/graph` returns domain-only or everything? Need to verify: the SPARQL templates need review for whether they include `knm:*` / `kn:*` nodes when requested.
</technical_details>

<important_files>
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\docker-compose.yml`
  - Production stack definition. 4 services + health chain.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\scripts\start-stack.ps1`
  - 269 lines. Entry point for dev bring-up. Menu + `-Action` flags. Tested live.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Dockerfile`
  - Multi-stage net10.0. Runtime stage installs curl, copies ttl + publish output.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\infrastructure\fuseki\bootstrap.sh`
  - LF-encoded. Waits on `/$/ping`, `DELETE` default graph, POSTs each ttl with basic auth.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Sparql\*.rq`
  - SPARQL templates for /api/graph, /api/types, /api/styles, /api/health. **Relevant for Stage 5** — need to understand how they filter (domain vs meta scope).
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Repositories\SparqlGraphRepository.cs`
  - Four async fold methods. Uses IRdfQueryClient. **Relevant for Stage 5** — may need a scope/layer parameter.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\` (frontend)
  - Zustand stores (graphStore, typesStore, stylesStore, healthStore), components. **Central to Stage 5** — need a toggle or route to switch between domain and meta views.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\META_MODEL_DESIGN.md`
  - Meta-model primitives. **Read first for Stage 5**.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-2-type-system\TYPE_SYSTEM_DESIGN.md`
  - 9 node types + 13+2 edge types. **Reference for Stage 5**.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\THESIS_DEMO_GAP_ANALYSIS.md`
  - Living status doc. Should be updated after Stage 5.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\infrastructure\jena\data\{meta,meta-instances,domain}.ttl`
  - 189 + 272 + 6968 triples. The data Stage 5 needs to surface at the meta level.
</important_files>

<next_steps>
**Stage 5 — Meta-visualization (Claim 7)**. Not started.

Immediate plan:
1. Read key design docs to understand scope:
   - `META_MODEL_DESIGN.md` (reflexive primitives)
   - `phase-2-type-system/TYPE_SYSTEM_DESIGN.md` (meta-instances)
   - `THESIS_DEMO_GAP_ANALYSIS.md` (current status + blocking gaps)
2. Audit current SPARQL templates — do they already return meta nodes/edges, or do they filter to domain only? Likely they filter. Need to decide: one endpoint with a scope parameter, or separate endpoints (`/api/graph?scope=meta`, `/api/graph?scope=domain`, `/api/graph?scope=all`).
3. Decide on frontend UX: toggle button, route switch, or overlay — probably a `?scope=` query param passed from frontend to backend, surfaced as a radio/toggle in the UI.
4. Validate the meta graph renders with the same styling pipeline (Claim 7). May need to ensure `knm:NodeType` / `kn:Node` have visual styles declared, or style cascading handles them.
5. Write tests for the scope parameter in both SPARQL repository and endpoint contract.
6. Teaching moment focus: the fact that the frontend doesn't need to know it's rendering "meta" — same contract, same components, just different content.

Open questions to resolve with user before starting:
- Scope parameter shape: `?scope=domain|meta|all` or separate endpoints?
- Should meta-visualization be a separate page/route, or a toggle within the same canvas?
- Does meta scope include L1 primitives (kn:Node, kn:NodeType...) or just L2 meta-instances (knm:Concept, knm:prerequisite_of...)?

Stack is still running (kn-demo-fuseki + api healthy, frontend up). Don't tear down before Stage 5 work — it's the test target.
</next_steps>