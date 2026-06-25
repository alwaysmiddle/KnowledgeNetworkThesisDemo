# Session Todos

## ⬜ Update ADR-002 with MDE-style dual contains
**Status:** done  
**ID:** `adr-002-update`

Add MDE reuse concept. Update cross-references.

## ⬜ Update KNOWLEDGE_NODE_MODEL.md
**Status:** done  
**ID:** `update-knowledge-model`

Move teaches to domain, add contains to domain, remove sys:teaches.

**Depends on:** `adr-002-update`

## ⬜ Update TYPE_SYSTEM_DESIGN.md
**Status:** done  
**ID:** `update-type-system`

Move teaches+contains to domain, remove sys:teaches.

**Depends on:** `adr-002-update`

## ⬜ Update THESIS_DEMO_GAP_ANALYSIS.md
**Status:** done  
**ID:** `update-gap-analysis`

Fix sys:teaches refs, update edge counts.

**Depends on:** `adr-002-update`

## ⬜ Update DOMAIN_DATA_DESIGN.md
**Status:** done  
**ID:** `update-domain-data`

Fix sys:teaches in system edge section, update decisions.

**Depends on:** `adr-002-update`

## ⬜ Update TYPE_SYSTEM_DESIGN.md with Phase 4
**Status:** done  
**ID:** `p4-update-type-system`

Rename concept-web → explore in TraversalStrategy type. Add timeline types from Phase 4 design doc (TimelineNode, TimelineGate, TimelineGroup, TimelineBus, TimelineClock, TimelineState, GateMode).

## ⬜ Update GAP_ANALYSIS.md with Phase 4
**Status:** done  
**ID:** `p4-update-gap-analysis`

GAP 4: rename Concept-Web → Explore. Update Claims 4-6 descriptions. Priority order item 4 update. Verification checklist: rename Concept-Web → Explore.

## ⬜ Update DOMAIN_DATA_DESIGN.md traversal section
**Status:** done  
**ID:** `p4-update-domain-data`

Rename Concept-Web → Explore in traversal walkthrough section (line 662+).

## ⬜ Update thesis contribution notes
**Status:** done  
**ID:** `p4-update-thesis-notes`

MUX → BRANCH references, Bus → visual-only in circuit mapping table.

## ⬜ Update plan.md with Phase 4 completion
**Status:** done  
**ID:** `p4-update-plan`

Mark Phase 4 as complete, update next actions.

**Depends on:** `p4-update-type-system`, `p4-update-gap-analysis`, `p4-update-domain-data`, `p4-update-thesis-notes`

## ⬜ Fix ADR-001 stale counts
**Status:** done  
**ID:** `fix-high-1`

ADR-001 says 23 nodes/7 types/9 edges. Update to 559 nodes/9 types/13+ edges. Also fix Node.js headings, bubble-sort example, 7-phases count.

## ⬜ Fix exam→test format
**Status:** done  
**ID:** `fix-high-2`

DOMAIN_DATA_DESIGN and Phase 3 still use exam. Resolved decision is test. Update both.

## ⬜ Fix domain contains missing from DOMAIN_DATA
**Status:** done  
**ID:** `fix-high-3`

ADR-002 defines domain contains but DOMAIN_DATA never documents it. Add to edge reference and coverage check.

## ⬜ Fix teaches under System heading
**Status:** done  
**ID:** `fix-med-4`

DOMAIN_DATA puts teaches under System edges heading. Move to domain.

## ⬜ Fix edge count chaos
**Status:** done  
**ID:** `fix-med-5`

Establish canonical count across all docs. Reconcile 9/10/12/13 to one truth.

## ⬜ Fix Concept-Web→Explore rename
**Status:** done  
**ID:** `fix-med-6`

NODE_MODEL and ADR-001 still say Concept-Web. Update to Explore.

## ⬜ Fix API endpoint /infer vs /api/infer
**Status:** done  
**ID:** `fix-med-7`

ADR-001 uses /infer, Phase 5/6 use /api/infer. Standardize to /api/ prefix.

## ⬜ Fix NODE_MODEL stale types.ts guidance
**Status:** done  
**ID:** `fix-med-10`

Says 10 edges/6 types. Should be 13 edges/9 types.

## ⬜ Fix Phase 5 TBox contains omission
**Status:** done  
**ID:** `fix-low-11`

Document why domain contains is excluded from TBox.

## ⬜ Fix CourseNode professor field mismatch
**Status:** done  
**ID:** `fix-low-13`

NODE_MODEL has professor? field, Phase 2 does not. Reconcile.

## ⬜ Neo4j schema DDL
**Status:** done  
**ID:** `block-1-neo4j-ddl`

Define constraints, indexes, 9 node labels, 15 relationship types in Cypher. This is the foundation for all backend work.

## ⬜ Data seeding mechanism
**Status:** blocked  
**ID:** `block-2-data-seeding`

C# startup seeder: check count(n), seed 559 nodes if 0, /api/health returns seeding/ready/unavailable. Includes Cypher seed script. [INVALIDATED by ADR-003 pivot; Neo4j removed]

**Depends on:** `block-1-neo4j-ddl`

## ⬜ GET /api/graph response shape
**Status:** done  
**ID:** `block-3-graph-response`

Define JSON contract for graph fetch endpoint — nodes array, edges array, metadata. Most-called endpoint. [INVALIDATED by ADR-003 pivot; Neo4j removed]

**Depends on:** `block-1-neo4j-ddl`

## ⬜ GET /api/traverse response shape
**Status:** pending  
**ID:** `block-4-traverse-response`

Define JSON contract for traversal results — subgraph or path format, strategy-specific fields. [Carries forward; Cypher->SPARQL]

## ⬜ docker-compose.yml
**Status:** blocked  
**ID:** `block-5-docker-compose`

5 services: React :5173, C# :5000, Neo4j :7687, Jena :3030, Python :8001. Health checks + depends_on with service_healthy. [INVALIDATED by ADR-003 pivot; Neo4j removed]

**Depends on:** `block-1-neo4j-ddl`

## ⬜ Write META_MODEL_DESIGN.md
**Status:** done  
**ID:** `stage-1-meta-model`

Bootstrap graph: primitive node/edge types, fixed-point construction, layered vocabulary (kn: + OWL equivalences), Turtle encoding, loading story. The hardest document in the project.

## ⬜ Rewrite foundational docs post-pivot
**Status:** done  
**ID:** `stage-2-rewrite-foundations`

KNOWLEDGE_NODE_MODEL rewrite, TYPE_SYSTEM_DESIGN rewrite, amend ADR-001, amend ADR-002, update GAP analysis, update CLAUDE.md, mark NEO4J_SCHEMA_DDL deprecated.

**Depends on:** `stage-1-meta-model`

## ⬜ Re-encode 559-node domain data as RDF/Turtle
**Status:** done  
**ID:** `stage-3-domain-reencoding`

Convert the 6-course curriculum inventory into reflexive Turtle. Each node typed via kn:type_of. Each domain edge reified as a kn:Edge node.

**Depends on:** `stage-1-meta-model`, `stage-2-rewrite-foundations`

## ⬜ C# adapter + SPARQL templates + render JSON contract
**Status:** done  
**ID:** `stage-4-backend-rendering`

Backend has no hardcoded type knowledge. GET /api/graph returns rendering-ready JSON derived from SPARQL. React renders uniformly, styled from type-node properties.

**Depends on:** `stage-3-domain-reencoding`

## ⬜ Demonstrate meta-model visualization
**Status:** pending  
**ID:** `stage-5-meta-visualization`

Render the type system itself through the same pipeline that renders domain data. This is the thesis-defense moment.

**Depends on:** `stage-4-backend-rendering`

## ⬜ Port phases 3, 4, 6, 7 onto reflexive foundation
**Status:** pending  
**ID:** `stage-6-phases-onward`

Layered views, traversal strategies, validation, EVoC clustering. Most design carries forward with encoding adjustments.

**Depends on:** `stage-5-meta-visualization`

## ⬜ Integrated thesis demo
**Status:** pending  
**ID:** `stage-7-thesis-demo`

End-to-end demonstrable prototype. Target: December.

**Depends on:** `stage-6-phases-onward`

## ⬜ Notify other instance of pivot
**Status:** pending  
**ID:** `notify-other-session`

Session working on block-2 Cypher seeding needs to know their output must be redone in Turtle once meta-model is set.

## ⬜ Stage 4a: uniform reflexive DTO contract
**Status:** done  
**ID:** `stage-4a-uniform-dto`

Backend + frontend rewritten to GraphEnvelope + uniform KnowledgeNode/Edge with Properties dict. 11/11 backend tests pass, frontend builds clean. Commit made.

## ⬜ Stage 4b: Fuseki adapter
**Status:** done  
**ID:** `stage-4b-fuseki-adapter`

Replace StubGraphData with SPARQL-backed repository. dotNetRDF for unit tests (in-memory Turtle), HttpClient for prod Fuseki at :3030.

## ⬜ Stage 4c: SPARQL templates
**Status:** done  
**ID:** `stage-4c-sparql-templates`

Four templates: graph.rq, types.rq, styles.rq, health.rq. /api/styles + /api/types endpoints replace hardcoded typeRegistry.ts.

## ⬜ Stage 4d: controllers + integration tests
**Status:** done  
**ID:** `stage-4d-controllers`

Wire /api/graph to Fuseki repository. Integration tests against live (or docker) Fuseki.

## ⬜ Stage 4e: frontend Zustand stores
**Status:** done  
**ID:** `stage-4e-frontend-stores`

useTypeStore, useStyleStore, useGraphStore; parallel bootstrap; remove typeRegistry.ts hardcoded fallback.

## ⬜ Stage 4f: docker-compose + Fuseki bootstrap
**Status:** done  
**ID:** `stage-4f-docker-compose`

docker-compose.yml: api + fuseki + frontend (+pipeline later). Fuseki auto-load of 3 ttl files on startup. [config committed; live smoke pending Docker Desktop]

## ⬜ Interactive stack script
**Status:** done  
**ID:** `stage-4f-script`

scripts/start-stack.ps1 — Docker Desktop probe, build, up, health wait, smoke. Menu + -Action flags.

## ⬜ Stage 5 meta-visualization (Claim 7)
**Status:** done  
**ID:** `stage-5-meta-view`

Backend /api/graph?view=meta + frontend Domain/Meta toggle. 30 meta nodes, 26 schema edges, same uniform envelope.

