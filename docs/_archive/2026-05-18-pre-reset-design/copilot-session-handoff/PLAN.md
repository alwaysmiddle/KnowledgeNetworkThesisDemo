# KnowledgeNetworkDemo — Design Progress

## Completed Design Sessions

### Session 1: Node Model + Edge Schema (DONE)
- 6 node types, 10 domain edges + 1 derived, computed hierarchy
- Created KNOWLEDGE_NODE_MODEL.md, TYPE_SYSTEM_DESIGN.md, ADR-001, DOMAIN_DATA_DESIGN.md

### Session 2: System vs Domain Edges (DONE)
- `sys:contains` lifecycle ownership edge, orthogonal system/domain axes
- Colon-separated namespace convention, behavioral properties
- Updated all 4 design docs

### Session 3: Domain Pivot + Persona Shift (DONE)
- Sorting algorithms → Python 101 (26 nodes)
- Student viewer → Professor as course author
- Full rewrite of DOMAIN_DATA_DESIGN.md, updates to GAP analysis + node model

### Session 4: Phase 3 — Layered Views Design (DONE)
- EVōC-primary clustering architecture (replaces node-type-only layers)
- 3 WorldMap modes: Disjoint Hierarchical, Disjoint Flat, Overlapping Flat
- ZMLT compound graph with semantic zoom
- Python FastAPI pipeline (:8001): nomic-embed → EVōC → toponymy
- Node-type L1-L4 as secondary visibility toggle
- Created LAYERED_VIEWS_DESIGN.md
- Updated THESIS_DEMO_GAP_ANALYSIS.md (GAP 5, GAP 9, pipeline positioning, priority order, verification checklist, resolved sub-questions)

### Session 5: Phase 4 — Traversal Strategies Design (DONE)
- Circuit-design metaphor for curriculum editing (EDA analogy)
- 5+1 editor primitives: Wire, Pin, Gate (AND/OR/BRANCH), Group, Clock + Bus (visual-only)
- Dual-pane architecture: Timeline Editor + EVōC WorldMap with bidirectional sync
- 3 traversal strategies: Linear (timeline), Explore (WorldMap-only), Problem-First (timeline reverse)
- Partial order insight: locked rails vs free zones, auto-indicated
- All 7 open design questions resolved
- Created TRAVERSAL_STRATEGIES_DESIGN.md
- Updated thesis notes (traversal-visualization-contribution.md)
- Propagated: TYPE_SYSTEM_DESIGN.md (timeline types, Explore rename), GAP_ANALYSIS.md (Claims 4-6, Explore rename), DOMAIN_DATA_DESIGN.md (Explore rename)

### Session 6: Phase 5 — Inference Backend Design (DONE)
- Dynamic TBox + ABox: premade .ttl schema + C# serializes Neo4j → RDF at runtime
- Delta API: POST /api/infer returns only new inferred edges (no full graph re-fetch)
- Raw HttpClient: no RDF library, ~60 lines of Turtle serialization + SPARQL parsing
- Manual "Run Inference" button, full graph scope (559 nodes)
- Clear-and-recompute idempotency pattern
- Identity bridge via deterministic URI scheme (kn:{node-id})
- TBox ontology outline with all 5 inference rules + derived assesses property
- C# backend pipeline pseudocode
- Key insight: inference as logical mirror / authoring validation tool
- Created INFERENCE_BACKEND_DESIGN.md
- Updated THESIS_DEMO_GAP_ANALYSIS.md (GAP 6 resolved, GAP 8 updated)

### Session 6 (cont): Phase 6 + 7 — Validation + EVōC Scope (DONE)
- Validation: backend Cypher queries, manual button, side panel with ✓/✗ per rule
- 6 validation rules mapped to Cypher queries
- API: GET /api/validate returns rule results with violations + node IDs
- Phase 7: confirmed absorbed into Phase 3 (EVōC is primary layout engine)
- Created VALIDATION_DESIGN.md
- Created EVOC_SCOPE_REVIEW.md (absorption record)
- Updated THESIS_DEMO_GAP_ANALYSIS.md (GAP 7 resolved)

## All Design Phases Complete

All 7 design phases are resolved:
- Phase 1: Domain Data ✅
- Phase 2: Type System ✅
- Phase 3: Layered Views ✅
- Phase 4: Traversal Strategies ✅
- Phase 5: Inference Backend ✅
- Phase 6: Validation ✅
- Phase 7: EVōC Scope ✅ (absorbed into Phase 3)

### Session 7: Consistency Audit + Coherence Analysis (DONE)
- Fixed 13 cross-phase inconsistencies + 12 residual issues (25 total fixes)
- Double-verified: all stale counts, exam→test, Concept-Web→Explore, Node.js→C#, edge counts
- Files fixed: ADR-001, ADR-002, KNOWLEDGE_NODE_MODEL, DOMAIN_DATA_DESIGN, LAYERED_VIEWS, TRAVERSAL_STRATEGIES, INFERENCE_BACKEND, THESIS_DEMO_GAP_ANALYSIS
- Ran architectural coherence analysis across all 9 docs
- Key findings:
  - Backend (C# + Neo4j + Jena) = buildable from docs
  - Frontend visualization (WorldMap, Timeline) = needs implementation-time discovery
  - 4 blocking gaps identified (seeding, API response shapes, Neo4j DDL, rendering library)
- Synthesis decisions from Q&A:
  - Q1 Graph state: start with full re-fetch, optimize to delta only if needed
  - Q2 Data readiness: C# checks Neo4j count on startup, seeds if empty, /api/health returns seeding/ready
  - Q3 Inference staleness: visual hint "⚠ Inference outdated" after edits, manual re-run
- WorldMap + Timeline: implement quick versions first (force-directed + read-only path), design docs serve as "future work" evidence
- Undo: defer to editing design phase

## Next Action: Clear Blocking Gaps → Begin Implementation

### Priority 1: Blocking Gaps (must resolve before coding)
1. **Neo4j schema DDL** — constraints, indexes, node labels, relationship types
2. **Data seeding mechanism** — C# startup seeder (check count → seed if 0 → /api/health reports status)
3. **GET /api/graph response shape** — JSON contract for the most-called endpoint
4. **GET /api/traverse response shape** — JSON contract for traversal results
5. **docker-compose.yml** — 5 services with health checks + startup ordering

### Priority 2: Implementation (build in this order)
1. Domain data + Neo4j seeding (GAP 3) — 559 nodes, Cypher seed script
2. C# backend skeleton + /api/graph + /api/health (GAP 1+2)
3. Visual vocabulary — restyle nodes/edges for typed system
4. WorldMap quick version — force-directed + cluster coloring (simplified GAP 5)
5. Traversal strategies — 3 strategies, read-only timeline (simplified GAP 4)
6. Inference backend (GAP 6) — Jena + C# pipeline
7. Validation panel (GAP 7) — Cypher rules + side panel
8. System edge toggle (GAP 3) — sys:contains visibility
9. Derived property display (GAP 8) — dashed inferred edges

### Pragmatic Scope (thesis demo philosophy)
- WorldMap: start with force-directed + cluster colors. GMap regions/edge bundling/ZMLT = future work.
- Timeline: start with read-only path display. Circuit-design editing = future work.
- Full re-fetch for graph state. Delta optimization = future work.
- Design docs are "future work" evidence for thesis defense.
