<overview>
Working on **KnowledgeNetworkDemo** — thesis demo for "Reflexive Knowledge Graphs for Course Authoring" (post-ADR-003 pivot). Just completed **Stage 5 meta-visualization (Claim 7)** end-to-end: live `/api/graph?view=meta` returns 30 nodes / 26 edges of the engine's own type grammar, rendered by the same UI pipeline as domain content. User then pivoted to a **review session** of an external feedback doc from ChatGPT (`SCHEMA_REVIEW_HANDOFF.md`), and chose to act on the cheap wins (#2 doc bug, #3 kn:type_of normalization, #4 "two faces" thesis-defense paragraph) via ~20-min doc-only edits to `META_MODEL_DESIGN.md`.
</overview>

<history>
1. User: "let's move to stage 5"
   - Read THESIS_DEMO_GAP_ANALYSIS.md (Stage 5 spec, GAP 10), ADR-003, key docs
   - Asked user to choose between Reflexive / Grammar-only / Both shape
   - User chose **Reflexive**: every NodeType AND EdgeType is a node (~24), edges = kn:domain / kn:range / kn:subtype_of triples
   - Implemented backend: new SPARQL files (`nodes-meta.rq`, `edges-meta.rq`), repo signature `GetGraphAsync(string view)`, endpoint reads `?view=`, kne: prefix added, expanded `ExcludedNodePredicates` to strip kn:domain/range/subtype_of from properties bag
   - Implemented frontend: `useGraphStore` accepts view param, App.tsx Domain/Meta toggle in header
   - TDD cycle: 8 new repo tests + 3 endpoint tests; all 49 backend tests green
   - Frontend `npm run build` passed
   - Rebuilt docker stack — first live smoke showed `nodes=30 edges=0`. Diagnosed via direct Fuseki SPARQL: `BIND(IRI(CONCAT(...)))` returned no `?id` because separator string `-->` contains `>` which Fuseki's strict IRI() validator rejects (dotNetRDF in-memory accepted it — green tests, red live). Switched separator to `--`. Live re-smoke: 30n/26e green
   - Committed as `f294998`
   - Provided ASCII diagram + teaching moment on the IRI-strictness gap

2. User: "let's do a review session for now, what do you think of this review by ChatGPT? D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\SCHEMA_REVIEW_HANDOFF.md"
   - Read the review (7 numbered points)
   - Delivered point-by-point verdict in caveman mode: high signal, zero noise, 5 actionable items
   - Flagged what ChatGPT missed: ignores mid-Stage-5 cost/benefit; doesn't notice classical projection isn't built yet; can't know about the IRI bug we just hit
   - Sharpened #4 ("two faces") as thesis-defense critical, not just doc polish
   - Asked user to scope the review session (3 choices)

3. User chose: **"Apply cheap wins now (#2, #3, #4): doc edits to META_MODEL_DESIGN.md + normalize Turtle examples to kn:type_of. ~20 min."**
   - This is the next action — not yet started
</history>

<work_done>
**Stage 5 (Claim 7) — DONE, committed `f294998` on main:**

Files created:
- `backend/Sparql/nodes-meta.rq` — meta-view nodes query (knm:* NodeTypes/EdgeTypes + 4 L1 primitives via VALUES clause)
- `backend/Sparql/edges-meta.rq` — synthesized classical edges from kn:domain / kn:range / kn:subtype_of triples; both endpoints constrained via UNION pattern to be themselves meta nodes (excludes visual-style subtype_of chains); separator `--` not `-->`

Files modified:
- `backend/Infrastructure/SparqlQueries.cs` — added `NodesMeta`, `EdgesMeta`
- `backend/Infrastructure/NamespacePrefixes.cs` — added `kne` prefix → `http://knowledgenetwork.local/meta-edge#`
- `backend/Repositories/IGraphRepository.cs` — `GetGraphAsync(string view = "domain", CancellationToken)`
- `backend/Repositories/SparqlGraphRepository.cs` — view dispatch; `LoadNodesAsync`/`LoadEdgesAsync` take query string param; ExcludedNodePredicates extended with kn:domain/range/subtype_of
- `backend/Program.cs` — `/api/graph` endpoint reads `?view=` query string
- `backend/tests/.../SparqlGraphRepositoryTests.cs` — 8 new meta-view tests
- `backend/tests/.../GraphEndpointTests.cs` — 3 new meta-view endpoint tests
- `src/stores/useGraphStore.ts` — view param, view state field
- `src/App.tsx` — Domain/Meta toggle button group in header

Tests: **49/49 green** (was 38, +11 new)
Live state: stack running, `/api/graph?view=meta` returns 30n/26e with predicates {kn:domain, kn:range, kn:subtype_of}
SQL todo `stage-5-meta-view` marked done

**Review session (current) — not yet started:**
- User chose scope: cheap wins (#2 + #3 + #4) on META_MODEL_DESIGN.md
- No edits made yet
</work_done>

<technical_details>
**Stage 5 implementation:**
- L1 primitives (kn:Node, kn:Edge, kn:NodeType, kn:EdgeType) self-type via `kn:type_of`, NOT `rdf:type` — this is intentional to avoid rdf:type loops at the apex. Meta-view nodes query must include them via explicit `VALUES ?id { ... }` clause; the `?id a kn:NodeType` patterns won't match them.
- Visual styles (knm:DefaultNodeStyle etc.) use `kn:subtype_of` too. Initial edges query picked these up and produced dangling edges (style nodes weren't in node set). Fix: constrain both `?source` and `?target` in edges query via UNION pattern requiring `a kn:NodeType` / `a kn:EdgeType` / L1-VALUES — so styles are silently filtered.
- ExcludedNodePredicates expanded with kn:domain/range/subtype_of to prevent double-counting in the property bag once they're projected as edges.

**The IRI strictness gap (caught at live-smoke, not in tests):**
- dotNetRDF (in-memory test client) accepts `IRI("http://...meta-edge#prerequisite_of--domain-->Concept")` despite embedded `>`
- Fuseki/Jena rejects it strictly — silently drops the `?id` binding from results, no error
- Test impact: all 49 tests pass; live API returns `edges=0`
- Lesson: in-memory tests don't catch every Fuseki conformance gap. Live smoke after every meaningful query change is mandatory before commit.
- Fix: synthesized URIs must be plain ASCII without URI-reserved chars; switched separator to `--` (two hyphens, between source/predicate and predicate/target)

**Fuseki dataset quirk:**
- Dataset is at `/knowledgenetwork/sparql` (NOT `/kn/sparql` as the prefix might suggest)
- POST with `Content-Type: application/sparql-query` works for the SparqlGraphRepository client
- Manual ad-hoc query via PowerShell: GET with URL-encoded `?query=...` is simpler than POST forms
- `/$/datasets` endpoint requires basic auth (admin / FUSEKI_ADMIN_PASSWORD)

**ChatGPT review verdict (stored mentally):**
- 7 points; #2 (3→4 primitive edge types) is a factual doc bug
- #3 prefer kn:type_of in authored TTL/docs over `a` shorthand (queries can keep `a` since OWL bridges them)
- #4 "two faces" — every kn:EdgeType is BOTH a node (inspectable) AND an RDF predicate (executable). Thesis-defense critical paragraph
- #1/#6 kn:* kernel audit — defensible to keep kn:VisualStyle (rendering-bound) but PropertyDescriptor already correctly knm:
- #7 vertical slice — too late retroactively (Stage 3 done) but applies forward to Phase 5 (classical projection + OWL inference, NOT YET BUILT — repository currently queries reified form only)
- Classical projection has NOT been implemented; current `/api/graph` domain query reads reified `kn:Edge` instances directly. Phase 5 will add classical-form derivation rules.

**Active mode:** caveman mode (full intensity by default) — keep ultra-terse with technical accuracy, drop articles/filler.
</technical_details>

<important_files>
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\SCHEMA_REVIEW_HANDOFF.md`
  - The ChatGPT review under discussion
  - 7 numbered points + suggested canonical doc edits + non-goals
  - User chose to act on #2 (3→4 edge primitives), #3 (kn:type_of canonical authoring), #4 (two faces explanatory paragraph)

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\META_MODEL_DESIGN.md`
  - **Target of next edits.** Canonical reflexive meta-model spec
  - Current state: Accepted; says "three primitive edge types" somewhere (the bug)
  - Need to: (a) fix count to "four", (b) add "two faces" paragraph, (c) normalize Turtle examples to use `kn:type_of` instead of `a`
  - Lines 333 and 434 mention "Self-visualizing style tree" — note for context

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\THESIS_DEMO_GAP_ANALYSIS.md`
  - Living status doc. Stage 5 should be marked done after this session
  - Lines 212-222 (GAP 10), 272-276 (Stage 5), 316-326 (post-pivot Claim 7 checklist)
  - Should reflect: Domain/meta toggle ✅, L1 primitives render ✅, schema edges render ✅

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Sparql\nodes-meta.rq` and `edges-meta.rq`
  - New Stage 5 query templates. Reference for how meta-view is shaped
  - edges-meta.rq: separator must stay `--` (two hyphens) not `-->` due to Fuseki IRI() strictness

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\backend\Repositories\SparqlGraphRepository.cs`
  - View dispatch logic
  - ExcludedNodePredicates extension (kn:domain/range/subtype_of)

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\App.tsx`
  - Domain/Meta toggle UI (header button group)
  - Clears selectedNode on view switch to prevent stale detail panel

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\infrastructure\jena\data\meta.ttl` and `meta-instances.ttl`
  - Source data. meta.ttl declares L1 primitives self-typed via kn:type_of (not rdf:type). meta-instances.ttl declares user-authored types/edge-types using `a kn:NodeType` / `a kn:EdgeType` shorthand
  - Per ChatGPT #3, these examples in docs should be normalized to kn:type_of form (data files may stay practical)
</important_files>

<next_steps>
**Immediate (user-approved scope):** Apply cheap wins #2, #3, #4 to `META_MODEL_DESIGN.md`.

Specific edits planned:
1. **#2 — Edge primitive count.** Search META_MODEL_DESIGN.md for "three primitive edge types" (or similar); change to "four primitive edge types" and list them: kn:type_of, kn:subtype_of, kn:source, kn:target.
2. **#3 — kn:type_of canonical authoring form.** Find Turtle examples using `a knm:Concept` / `a kn:NodeType` style; rewrite to `kn:type_of knm:Concept` form. Add brief note that `a` and `kn:type_of` are equivalent under OWL but `kn:type_of` is preferred in author-facing examples to reinforce the thesis vocabulary.
3. **#4 — "Two faces" paragraph.** Add a section (or paragraph in an existing relevant section) titled something like "Edge types have two faces" stating: every kn:EdgeType instance is simultaneously (a) a graph node — inspectable, styleable, traversable — and (b) an RDF predicate — executable by SPARQL/OWL. Include a worked Turtle example showing both readings of `knm:prerequisite_of` (as subject of triples describing it; as predicate in `knd:Variable knm:prerequisite_of knd:Function`).

**Approach:** Read META_MODEL_DESIGN.md in full first to find exact insertion points and existing Turtle examples to normalize. Make edits in a single batched response. Run no tests (doc-only). Commit with conventional message referencing the review handoff. Optionally note in commit body which review points are addressed.

**After this session, deferred:**
- Stage 6 — Phases 3/4/6/7 ported (traversals, inference, validation, EVōC)
- kn:* kernel audit (#1/#6 from review) — emit ADR
- Classical projection + OWL inference (Phase 5) — apply #7 forward as vertical slice before full ruleset
- Mark Stage 5 done in THESIS_DEMO_GAP_ANALYSIS.md (low priority polish)

**Open question:** After applying the doc edits, should `SCHEMA_REVIEW_HANDOFF.md` be deleted (per its own "Delete after" header) or left as historical record? Ask user.
</next_steps>