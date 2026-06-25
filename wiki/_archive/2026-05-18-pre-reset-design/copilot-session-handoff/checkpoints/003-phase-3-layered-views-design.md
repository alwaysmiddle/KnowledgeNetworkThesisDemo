<overview>
The user is building `KnowledgeNetworkDemo`, a thesis demo for *Knowledge Graph Based Course Visualization*. Over multiple design sessions, we've established a comprehensive architecture: "everything is a node" philosophy, system vs domain edge separation, Python 101 course domain (pivoted from sorting algorithms), professor-as-course-author persona, and a full visualization pipeline using the Tutte Institute's EVōC clustering. The project has an existing React + ReactFlow codebase with school org chart data that needs to be completely replaced with the new knowledge graph system. We're currently in the design phase — writing detailed design docs before implementation begins.
</overview>

<history>
1. **Session 1 (prior to this conversation):** Established foundational design — 6 node types (Concept, Principle, Example, Assessment, Reference, Analogy), 10 formal domain edges + 1 derived, computed hierarchy (not stored), promote-to-node model, C# ASP.NET Core backend, Jena Fuseki in-memory. Created `KNOWLEDGE_NODE_MODEL.md`, `TYPE_SYSTEM_DESIGN.md`, `ADR-001`, `DOMAIN_DATA_DESIGN.md`.

2. **Session 2: "Everything is a node" philosophy + system edges**
   - User and wife conceived the idea that subnodes should be distinguished from peer nodes via system edges
   - Designed `sys:contains` edge with lifecycle properties (`onDelete: cascade|detach|prevent`, `exclusive`, `autoCreated`, `userEditable`)
   - Established orthogonal system vs domain edge architecture
   - Designed colon-separated namespace convention (`sys:contains`) mapping to RDF QNames
   - System edges: muted gray, dotted, toggle-able, hidden by default
   - Updated all 4 design docs (KNOWLEDGE_NODE_MODEL.md, DOMAIN_DATA_DESIGN.md, TYPE_SYSTEM_DESIGN.md, THESIS_DEMO_GAP_ANALYSIS.md)

3. **Session 3: Domain pivot and persona shift**
   - User wanted to expand from 23 nodes to 200-300 nodes for realism, add school organizational structure
   - After discussion: org layer is context only, not a thesis claim
   - **Domain pivot:** Sorting algorithms → Python 101 (more recognizable to examiners, richer prerequisite chains)
   - **Persona pivot:** Student viewer → Professor as course author/manager (stronger thesis framing)
   - Updated DOMAIN_DATA_DESIGN.md (full node/edge inventory rewrite to Python 101), THESIS_DEMO_GAP_ANALYSIS.md (all references updated), KNOWLEDGE_NODE_MODEL.md (education domain section updated)
   - New node set: Variable, Data Type, Integer, String, Boolean, List, Tuple, Dictionary, Conditional Statement, For Loop, Function, Parameter, Return Value, Recursion, Class (15 Concepts), 4 Principles (DRY, Immutability, Single Responsibility, Encapsulation), 2 Examples, 3 Assessments, 1 Reference, 1 Analogy = 26 nodes

4. **Session 4 (current): Phase 3 — Layered Views design session**
   - User shared 8 graph visualization papers from thesis references folder (`01_Graph_Visualization`)
   - Scanned all papers via explore agent — identified Vehlow survey as the anchor, plus Holten (edge bundling), Bubble Sets/KelpFusion (set visualization), GMap (colored regions), ZMLT (semantic zoom), Overview+Detail (compound layout), ima-dt (compound graph layout)
   - User selected 3 Vehlow styles for WorldMap: Disjoint Hierarchical, Disjoint Flat, Overlapping Flat
   - User chose ZMLT for compound graph detail view
   - **Major architectural decision:** EVōC clustering becomes PRIMARY layer source (not node-type filtering). Node-type Level 1-4 becomes a secondary visibility toggle on top.
   - **Pipeline decisions:**
     - Embedding: nomic-embed-text-v1.5 (550MB, local, free, 768-dim) with model-agnostic interface
     - Clustering: EVōC multi-granularity (Python-native)
     - Toponymy: Cheap LLM API (GPT-4.1-mini or Haiku, ~$0.01/run)
     - All three steps in one Python microservice (FastAPI, port 8001)
   - **Backend stays C#** (ADR-001 preserved) — C# orchestrates + caches, Python handles ML pipeline
   - **Deployment:** Docker + local venv fallback
   - Created `LAYERED_VIEWS_DESIGN.md` in `phase-3-layered-views/`
</history>

<work_done>
Files created this session:
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-3-layered-views\LAYERED_VIEWS_DESIGN.md` — Complete Phase 3 design doc covering EVōC pipeline, WorldMap visualization (3 styles), compound graph detail view, node-type filter overlay, service architecture, API spec, file change plan, and reference paper mapping.

Files updated this session:
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-1-domain-data\DOMAIN_DATA_DESIGN.md` — Full domain swap from sorting algorithms to Python 101. All 26 nodes, all edges rewritten, sys:contains updated, traversal walkthroughs reframed for professor persona, inference demo script rewritten, design decisions log updated with Session 3 entries.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\THESIS_DEMO_GAP_ANALYSIS.md` — Context updated to Python 101 + professor framing. Claims table gained "Professor Framing" column. GAP 3 rewritten with Python 101 nodes/edges + 200-500 node scale target. GAP 6 inference example updated. Priority order and verification checklist updated.
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\KNOWLEDGE_NODE_MODEL.md` — Status bumped to iteration 3. Education domain section rewritten for Python 101 + professor persona. Session 3 decisions added to resolved decisions log. Node count updated from 23 to 26.

Files updated in prior turns (carried forward):
- All 4 design docs were updated in Session 2 for system vs domain edge architecture (see prior checkpoints for details).

SQL todo tracking:
- 4 todos from Session 2 all marked `done` (update-node-model, update-domain-data, update-type-system, update-gap-analysis)
- No new todos created yet for Phase 3

Work completed:
- [x] Domain pivot: sorting algorithms → Python 101 (all docs updated)
- [x] Persona pivot: student → professor (all docs updated)
- [x] Phase 3 design session: all decisions locked
- [x] Phase 3 design doc written (LAYERED_VIEWS_DESIGN.md)
- [ ] Phase 3 design doc NOT yet reflected in THESIS_DEMO_GAP_ANALYSIS.md (GAP 5 and GAP 9 still reference old architecture)
- [ ] Phases 4-7 design docs still empty
- [ ] No implementation started
</work_done>

<technical_details>

**Core architectural decisions (all sessions):**

1. **"Everything is a node"** — no nested data structures. Every entity is a first-class graph node.

2. **System vs Domain edge axes (orthogonal):**
   - System edges (`sys:*`): Managed by tool. Lifecycle, ownership. Example: `sys:contains`.
   - Domain edges: Managed by user. Semantic relationships. Example: `prerequisite_of`, `demonstrates`.
   - Properties on `sys:contains`: `onDelete: 'cascade'|'detach'|'prevent'`, `exclusive: boolean`, `autoCreated: boolean`, `userEditable: boolean`

3. **Edge naming:** Colon-separated qualified names (`sys:contains`) mapping to RDF QNames. Store full name, display short name. Future: hierarchical namespaces.

4. **6 node types:** Concept, Principle, Example, Assessment (format: exam|exercise|quiz), Reference, Analogy

5. **10 formal domain edges + 1 derived + system edges:**
   - Domain: prerequisite_of, generalizes, is_instance_of, is_component_of, builds_on, contradicts, is_analogous_to, applies_in, commonly_conflated_with, demonstrates (+ inverse is_demonstrated_by)
   - Derived: assesses (from Assessment applies_in Concept, via Jena inference)
   - System: sys:contains

6. **Python 101 domain (26 demo nodes):**
   - 15 Concepts: Variable, Data Type, Integer, String, Boolean, List, Tuple, Dictionary, Conditional Statement, For Loop, Function, Parameter, Return Value, Recursion, Class
   - 4 Principles: DRY, Immutability, Single Responsibility, Encapsulation
   - 2 Examples: FizzBuzz Walk-through, List Comprehension Trace
   - 3 Assessments: Exam: Python Fundamentals, Exercise: Implement FizzBuzz, Exercise: Build a Fibonacci Function
   - 1 Reference: Python 3 Official Documentation
   - 1 Analogy: Recipe as a Function
   - Scale target: 200-500 nodes for realistic course

7. **Gap node for traversal demo:** Class (no assessment applies to it)

8. **Prerequisite chain:** Variable → Conditional Statement → For Loop → Function → Class

9. **sys:contains edges (4):** Conditional Statement→FizzBuzz Walk-through, List→List Comprehension Trace, Conditional Statement→Exercise: Implement FizzBuzz, Function→Exercise: Build a Fibonacci Function

10. **EVōC-primary layer architecture (Phase 3 — NEW):**
    - EVōC clustering = primary spatial layout (semantic grouping from embeddings)
    - Node-type filter (L1-L4) = secondary visibility toggle
    - Spatial layout is STABLE across visibility changes — hidden nodes leave gaps, no reflow
    - Pipeline: embed (nomic-embed-text-v1.5, local) → EVōC (multi-granularity) → toponymy (cheap LLM)
    - All-Python FastAPI service on port 8001
    - C# backend calls Python service, caches result with content hash

11. **WorldMap 3 styles:** Disjoint Hierarchical, Disjoint Flat, Overlapping Flat (from Vehlow taxonomy)

12. **Compound graph:** ZMLT-style semantic zoom. Containment from both EVōC clusters AND authored edges (generalizes, is_component_of). Authored structure takes priority within clusters. Cross-cluster edges bundled (Holten-style).

13. **Deployment stack:**
    - React (Vite): 5173
    - C# ASP.NET Core: 5000/5001
    - Python Pipeline: 8001
    - Jena Fuseki: 3030

14. **Backend:** C# ASP.NET Core Web API (.NET 8) — ADR-001 locked. Neo4j.Driver + HttpClient for Jena + HttpClient for Python pipeline.

15. **Hierarchy is computed, not stored.** No parentId/childrenIds on nodes.

16. **Professor persona:** The tool is for course management/authoring. Traversal strategies are "course design lenses" — professor asks "how would a student experience this?" Validation = "is my course structurally sound?"

17. **Inference:** 11 edges inferred in demo (6 transitive generalizes via Data Type, 5 derived assesses)

18. **Reference papers for Phase 3:**
    - Vehlow et al. (2017) — group visualization taxonomy (anchor paper)
    - ZMLT (1906.05996v2) — semantic zoom for compound graphs
    - GMap — colored regions for clusters
    - Holten (2006) — hierarchical edge bundling
    - Bubble Sets — isocontour set overlays
    - KelpFusion — hybrid set visualization
    - ima-dt — compound graph layout algorithms
    - Overview+Detail (2408.04045v1) — compound graph overview+detail layout

**Existing codebase state (KnowledgeNetworkDemo):**
- React + TypeScript + ReactFlow + Vite
- Current types.ts: generic `KGNode { type: string }`, `KGEdge { relationship: string }`
- Current mockGraph.ts: school org chart (3 depts, 6 profs, 8 courses, 12 students, 48 subtopics) — ~38.8KB
- Current layerConfig.ts: 5 layers by org depth, relationship chain traversal
- Layout engines: ELK (stress), Dagre, Sugiyama, Louvain cluster
- Components: LayerCanvas, WorldMapCanvas, KGNode, KGEdge, Breadcrumb, NodeContextMenu
- Lib: computeLayers, filterLayer, layoutElk, layoutNodes, layoutSugiyama, layoutWorldMapDagre, computeSubgraphIds, detectCommunitiesLouvain, useLayerTransition
- All infrastructure is reusable — data/types/domain need full replacement
</technical_details>

<important_files>
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-3-layered-views\LAYERED_VIEWS_DESIGN.md`
  - **Why**: Newly created Phase 3 design doc. Defines the EVōC pipeline architecture, WorldMap visualization modes, compound graph detail view, Python service API spec, and integration plan.
  - **Changes**: Created from scratch this session.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-1-domain-data\DOMAIN_DATA_DESIGN.md`
  - **Why**: Authoritative record of all nodes, edges, and mock data for Python 101 domain. Implementation reference for `mockGraph.ts`.
  - **Changes**: Full domain rewrite this session — all 26 Python 101 nodes, all edges, sys:contains, traversal walkthroughs, inference demo, coverage check. Status date: 2026-04-11.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\THESIS_DEMO_GAP_ANALYSIS.md`
  - **Why**: Master overview of all 9 GAPs and thesis claims. Links every gap to specific files and changes needed.
  - **Changes**: Updated for Python 101 domain + professor framing. Note: GAP 5 and GAP 9 still describe the old architecture (node-type-only layers, EVōC as separate cluster view). These need updating to reflect the new EVōC-primary architecture from Phase 3.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\KNOWLEDGE_NODE_MODEL.md`
  - **Why**: Foundational schema doc — base node/edge schema, system vs domain edge architecture, namespace convention, promote-to-node model.
  - **Changes**: Updated to iteration 3 — Python 101 domain, professor persona, Session 3 decisions.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-2-type-system\TYPE_SYSTEM_DESIGN.md`
  - **Why**: TypeScript type definitions for implementation. Direct input to `src/types.ts`.
  - **Changes**: Updated in Session 2 (EdgeCategory, SystemEdgeProperties, ThesisDomainEdge, ThesisSystemEdge). Not changed in Sessions 3-4.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\ADR-001-backend-and-data-architecture.md`
  - **Why**: Backend architecture decision record. C# ASP.NET Core locked in Session 1.
  - **Changes**: None since Session 1. Still current — Python pipeline service is additive, not a replacement.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\types.ts`
  - **Why**: Current type system that needs full replacement. Currently has generic `KGNode`, `KGEdge`, `RelationshipChain`, `ComputedLayer`.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\data\mockGraph.ts`
  - **Why**: Current school org chart data (~38.8KB) that needs full replacement with Python 101 domain.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\data\layerConfig.ts`
  - **Why**: Current 5-layer school config that needs replacement with EVōC-based layer system.

- `C:\Users\ysz10\OneDrive\Documents\Research\Masters\Thesis\References\01_Graph_Visualization\`
  - **Why**: 8 reference papers informing Phase 3 visualization design. Key papers: Vehlow survey (group viz taxonomy), ZMLT (semantic zoom), GMap (colored regions), Holten (edge bundling).

- `C:\Users\ysz10\.copilot\session-state\692e80fb-990b-4a68-bac5-84e472c1c35c\plan.md`
  - **Why**: Session plan file. Currently reflects Session 2 todos (all done). Needs update for Phase 3+ work.
</important_files>

<next_steps>
Remaining design work:
- Update THESIS_DEMO_GAP_ANALYSIS.md: GAP 5 and GAP 9 need to reflect the new EVōC-primary architecture (currently still describe old node-type-only layers and EVōC as separate cluster view)
- Phase 4 design doc (Traversal Strategies) — `phase-4-traversal-strategies/` is empty
- Phase 5 design doc (Inference Backend) — `phase-5-inference-backend/` is empty
- Phase 6 design doc (Validation) — `phase-6-validation/` is empty
- Phase 7 design doc (EVōC) — `phase-7-evoc/` is empty. Note: EVōC is now part of Phase 3 pipeline, so Phase 7's scope may change to just the contrast view (Louvain vs EVōC) or be merged into Phase 3.

Implementation (not started):
- Phase 1: Replace `mockGraph.ts` with Python 101 domain data (26+ nodes, all edges)
- Phase 1: Replace `layerConfig.ts` with new EVōC-based config
- Phase 2: Rewrite `types.ts` with full type system from TYPE_SYSTEM_DESIGN.md
- Phase 3: Build Python pipeline service (FastAPI + EVōC + nomic + toponymy)
- Phase 3: Rework WorldMapCanvas for 3 group styles + semantic zoom
- Phase 3: Rework LayerCanvas for compound graph with EVōC + authored containment
- Phases 4-7: Implementation per design docs

Immediate next action:
- Ask user if they want to continue designing remaining phases (4-7) or start implementation with Phases 1-2 first
</next_steps>