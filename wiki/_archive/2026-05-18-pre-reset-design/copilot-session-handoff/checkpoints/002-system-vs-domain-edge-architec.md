<overview>
The user is working on `KnowledgeNetworkDemo`, a thesis demo for *Knowledge Graph Based Course Visualization* using a sorting algorithms domain. This session (session 2) introduced a major philosophical shift: "everything is a node" with a new **system vs domain edge architecture**. The user and their wife conceived the idea that subnodes should be distinguished from peer nodes via a special predetermined edge (`sys:contains`) with lifecycle behaviors (cascade delete, exclusivity), while keeping semantic domain edges orthogonal. I'm iterating the design docs to incorporate this new architectural layer across all four design documents.
</overview>

<history>

1. **Session 1 recap (prior checkpoint):** Established the foundational design — 6 node types (Exercise merged into Assessment), 10 formal domain edges + 1 derived, computed hierarchy (not stored), promote-to-node model, C# ASP.NET Core backend, Jena Fuseki in-memory. Created `KNOWLEDGE_NODE_MODEL.md` and `TYPE_SYSTEM_DESIGN.md`, updated `ADR-001` and `DOMAIN_DATA_DESIGN.md`.

2. **User requested design iteration: "everything is a node" philosophy**
   - User explained: subnodes should be marked with special predetermined edges that have predetermined behaviors (e.g., cascade delete when parent is deleted). The tool should create these edges implicitly/automatically.
   - I asked clarifying questions about what "subnode" means — user chose "D — Something else" and explained the ownership/lifecycle concept.

3. **Design discussion: `sys:contains` edge and its properties**
   - Established that subnodes have exclusive ownership (one owner), with behavior depending on use case (cascade for personal data, promote for shared data).
   - Drew SQL parallels: `ON DELETE CASCADE`, `ON DELETE SET NULL`, `ON DELETE RESTRICT`.
   - Decided: `onDelete: 'cascade' | 'detach' | 'prevent'`, `exclusive: boolean`, `autoCreated: boolean`, `userEditable: boolean`.

4. **Design discussion: `sys:contains` vs `is_component_of`**
   - User chose **Option A — Keep both as orthogonal axes**: `sys:contains` = structural lifecycle; `is_component_of` = semantic part-whole. Both can coexist on same node pair.

5. **Design discussion: Edge naming convention**
   - User wanted to discuss naming options. I presented prefix (`sys:`), namespace (`system/`), and separate field approaches.
   - User raised concern about long namespace names in edge labels and entry barriers.
   - Resolution: **Store full qualified name, display short name**. `displayLabel` field for UI; auto-derive from relationship name. Full name on hover.
   - Chose colon-separated convention (`sys:contains`) — maps to RDF QNames, extensible to hierarchical namespaces.
   - User noted namespaces will eventually follow conventions like `category1.subcategory.namespace` forming their own relationship hierarchy graph.

6. **Design discussion: System edge visual treatment**
   - User confirmed: muted gray, thin dotted stroke, 0.4 opacity, toggle-able, collapsed by default. Domain edges stay vibrant/solid/always visible.
   - User asked about `autoCreated` and `exclusive` properties — after explanation, chose to **keep both**.

7. **Plan created and approved**
   - Created plan.md with 4 todos: update KNOWLEDGE_NODE_MODEL.md, DOMAIN_DATA_DESIGN.md, TYPE_SYSTEM_DESIGN.md, THESIS_DEMO_GAP_ANALYSIS.md.
   - User approved with autopilot mode.

8. **Implementation: Updating design docs**
   - Updated KNOWLEDGE_NODE_MODEL.md with full system/domain edge architecture
   - Updated DOMAIN_DATA_DESIGN.md with system edge layer and concrete `sys:contains` edges
   - Updated TYPE_SYSTEM_DESIGN.md with new TypeScript types
   - Started updating THESIS_DEMO_GAP_ANALYSIS.md — partially complete when compaction triggered

</history>

<work_done>

Files updated this session:

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\KNOWLEDGE_NODE_MODEL.md`:
  - Added "System vs Domain Edge Architecture" section (two-axis model explanation)
  - Added "Edge Namespace Convention" section (colon-separated QNames, future hierarchical vision, RDF/Turtle mapping)
  - Added "`sys:contains` — Lifecycle Ownership Edge" section (behavioral properties, exclusivity rule, SQL parallel table)
  - Added "Decision Guide: `sys:contains` vs `is_component_of`" section
  - Added "System Edge Visual Treatment" table
  - Updated Edge Schema: added `EdgeCategory`, `displayLabel`, `SystemEdgeProperties`, `deriveDisplayLabel()` utility
  - Updated "Promote to Node" model: now creates TWO edges (auto `sys:contains` + author-supplied domain edge)
  - Updated Education Domain: split `ThesisEdgeRelationship` into `ThesisDomainEdge | ThesisSystemEdge`
  - Added "Future Direction: Artifacts as Nodes" section
  - Updated "Resolved Decisions" with Session 2 decisions
  - Updated status line to 2026-04-11

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-1-domain-data\DOMAIN_DATA_DESIGN.md`:
  - Added "System Edge Layer" section after domain edge reference table
  - Defined which 4 demo nodes get `sys:contains` edges (Merge Sort Walkthrough, QuickSort Trace, Exercise:BubbleSort, Exercise:QuickSort)
  - Documented which nodes do NOT get `sys:contains` (D&C, Exam, CLRS, Analogy, Principles) with rationale
  - Added concrete `sys:contains` edge list
  - Updated coverage check: split into "Domain edges" and "System edges" subsections
  - Added 2026-04-11 session to Design Decisions Log
  - Updated Authoring Promotion Model to reference `sys:contains`

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-2-type-system\TYPE_SYSTEM_DESIGN.md`:
  - Added `EdgeCategory`, `ThesisDomainEdge`, `ThesisSystemEdge`, `SystemEdgeProperties` types
  - Updated `KnowledgeEdge` interface: added `category`, `displayLabel`, `systemProperties`
  - Added "Display Name Utility" section with `deriveDisplayLabel()` function
  - Updated Edge Visual Styles: split into Domain edges and System edges subsections
  - Added system edge visibility toggle spec
  - Updated status date to 2026-04-11

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\THESIS_DEMO_GAP_ANALYSIS.md` — **IN PROGRESS**:
  - [x] Updated date to 2026-04-11
  - [x] Fixed Claims table: 7→6 node types, added system edges row
  - [x] Replaced "Resolved Design Decisions" section (added demonstrates, Exercise merge, system edges, backend, Jena)
  - [x] Replaced "Open Sub-Questions" with "Resolved Sub-Questions" (all 3 resolved)
  - [x] Fixed GAP 1: 7→6 node types, Assessment with format variants
  - [x] Fixed GAP 2: 9→10 domain edges + system edges, added `demonstrates` and `sys:contains`
  - [x] Fixed GAP 3: Exercise→Assessment, added system edge examples, updated analogy name
  - [x] Fixed GAP 4: 9→10 edge types in Concept-Web, Assessment not Exercise in Problem-First
  - [ ] **INCOMPLETE**: GAP 5 still says "all 7 types" in Level 4 — needs "all 6 types"
  - [ ] **INCOMPLETE**: GAP 5 Level 3 still says "+Exercise" — needs "+Assessment:exercise"
  - [ ] **INCOMPLETE**: GAP 6 — mostly fine but could mention system edges in inference scope
  - [ ] **INCOMPLETE**: GAP 9 — no changes needed
  - [ ] **INCOMPLETE**: Suggested Priority Order still says "all 7 node types, all 9 edge types"
  - [ ] **INCOMPLETE**: Critical Files Reference — may need `types.ts` description update
  - [ ] **INCOMPLETE**: Verification Checklist still says "All 7 node types" and "All 9 formal edge types"

Todo tracking (SQL):
- `update-node-model`: **done**
- `update-domain-data`: **done**
- `update-type-system`: **done**
- `update-gap-analysis`: **in_progress**

</work_done>

<technical_details>

**Core architectural decisions (Session 2):**

1. **"Everything is a node"** — no nested data structures. Every entity is a first-class graph node. Edges define all relationships.

2. **System vs Domain edge axes (orthogonal):**
   - **System edges** (`sys:*`): Managed by the tool. Lifecycle, ownership, structural plumbing. Example: `sys:contains`.
   - **Domain edges**: Managed by the user. Semantic knowledge relationships. Example: `prerequisite_of`, `demonstrates`.
   - Both can coexist on the same node pair. Removing one doesn't affect the other.

3. **`sys:contains` — the first system edge:**
   - Lifecycle ownership: subnode's existence depends on owner
   - Properties: `onDelete: 'cascade'|'detach'|'prevent'`, `exclusive: boolean`, `autoCreated: boolean`, `userEditable: boolean`
   - Exclusivity: A node can have at most ONE `sys:contains` edge pointing to it
   - SQL parallel: `CASCADE` / `SET NULL` / `RESTRICT`

4. **`sys:contains` vs `is_component_of`:**
   - `sys:contains`: structural lifecycle (cascade delete, exclusive owner)
   - `is_component_of`: semantic part-whole (no lifecycle, many-to-many)
   - Example: `D&C is_component_of Merge Sort` (shared concept, no ownership) vs `Merge Sort sys:contains Merge Sort Walkthrough` (owned content, cascade)

5. **Edge naming convention:**
   - Colon-separated qualified names: `sys:contains`
   - Maps to RDF QNames — native to OWL/Jena
   - Extensible to hierarchical: `sys:lifecycle:contains`, `domain:education:prerequisite_of`
   - The namespace hierarchy itself becomes a graph of relationship categories (user's insight)

6. **Display vs storage:**
   - Store: full qualified name (`sys:contains`)
   - Display: `displayLabel` field, or auto-derived (`deriveDisplayLabel()` strips prefix, humanizes)
   - Hover: shows full qualified name
   - No entry barrier for users — namespace is infrastructure

7. **System edge visual treatment:**
   - Muted gray (`stroke-gray-300`), thin dotted stroke, 0.4 opacity
   - Toggle-able (default: hidden/collapsed)
   - Small italic labels
   - Domain edges: vibrant colors, solid stroke, full opacity, always visible

8. **Demo `sys:contains` edges (4 total):**
   - `Merge Sort sys:contains Merge Sort Walkthrough` (cascade)
   - `Quick Sort sys:contains QuickSort Partitioning Trace` (cascade)
   - `Bubble Sort sys:contains Exercise: Implement Bubble Sort` (cascade)
   - `Quick Sort sys:contains Exercise: Trace QuickSort on [5,3,1,4,2]` (cascade)

9. **Nodes that do NOT get `sys:contains`:** Divide and Conquer (shared), Exam (multi-concept), CLRS (broad reference), Analogy (independent), Principles (independent concepts demonstrated by many).

10. **Artifacts as nodes:** Future direction documented. For thesis demo, keep `artifacts: Artifact[]` as property. Eventually each artifact becomes a node connected via `sys:contains`.

11. **Promote-to-node model updated:** Now creates TWO edges:
    - `sys:contains` (auto-created by tool, lifecycle)
    - Domain semantic edge (author-supplied, e.g., `applies_in`)

**Carried forward from Session 1:**
- 6 node types: Concept, Principle, Example, Assessment (format: exam|exercise|quiz), Reference, Analogy
- 10 formal domain edges + 1 derived (`assesses`)
- 23 total nodes in demo
- Backend: C# ASP.NET Core Web API (.NET 8)
- Jena: Fuseki + in-memory dataset
- Ports: React 5173, ASP.NET 5000/5001, Neo4j 7474/7687, Jena 3030
- Hierarchy is computed, not stored
- EVōC deferred

**Edge summary (final):**
- 10 formal domain edges + 1 derived domain edge + 4 system edges (in demo data)
- System edges have `SystemEdgeProperties`; domain edges have `owlType`

</technical_details>

<important_files>

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\KNOWLEDGE_NODE_MODEL.md`
  - **Why**: Foundational document for all KnowledgeNetwork projects. Contains base node/edge schema, computed hierarchy insight, system vs domain edge architecture, `sys:contains` spec, namespace convention, promote-to-node model.
  - **Changes**: Major additions this session — 6 new sections added (system/domain architecture, namespace convention, sys:contains, decision guide, visual treatment, artifacts future). Edge schema updated with `EdgeCategory`, `displayLabel`, `SystemEdgeProperties`. Promote model updated (two edges). Education domain edge types split into `ThesisDomainEdge | ThesisSystemEdge`.
  - **Status**: Complete and up-to-date.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-1-domain-data\DOMAIN_DATA_DESIGN.md`
  - **Why**: Authoritative record of all 23 nodes, all domain edges, all system edges, and every concrete edge in the mock data. Implementation reference for `mockGraph.ts`.
  - **Changes**: Added System Edge Layer section with 4 concrete `sys:contains` edges. Coverage check split into domain/system. Design decisions log updated. Authoring promotion model updated.
  - **Status**: Complete and up-to-date.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-2-type-system\TYPE_SYSTEM_DESIGN.md`
  - **Why**: TypeScript type definitions for Phase 2 implementation. Direct input to `src/types.ts` rewrite.
  - **Changes**: Added `EdgeCategory`, `ThesisDomainEdge`, `ThesisSystemEdge`, `SystemEdgeProperties`. Updated `KnowledgeEdge` interface. Added `deriveDisplayLabel()` utility. Edge visual styles split into domain/system subsections with toggle spec.
  - **Status**: Complete and up-to-date.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\THESIS_DEMO_GAP_ANALYSIS.md`
  - **Why**: Master overview of all 9 GAPs and thesis claims. Was heavily stale before this session.
  - **Changes**: Partially updated — Claims table, Resolved Decisions, Resolved Sub-Questions, GAPs 1-4 all fixed. GAP 5, Priority Order, Critical Files, and Verification Checklist still have stale content (references to 7 node types, 9 edges, Exercise as separate type).
  - **Status**: **IN PROGRESS** — approximately 60% complete. Remaining: GAP 5 level descriptions, Suggested Priority Order, Critical Files Reference, Verification Checklist.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\ADR-001-backend-and-data-architecture.md`
  - **Why**: Backend architecture decision record. Locked in Session 1.
  - **Changes**: None this session. Already up-to-date from Session 1.

- `C:\Users\ysz10\.copilot\session-state\692e80fb-990b-4a68-bac5-84e472c1c35c\plan.md`
  - **Why**: Session plan file for the current design iteration.
  - **Changes**: Created this session with 4 todos. 3 of 4 complete.

</important_files>

<next_steps>

**Immediate (in progress):**
1. **Finish `THESIS_DEMO_GAP_ANALYSIS.md`** — remaining stale sections:
   - GAP 5: Level 4 "all 7 types" → "all 6 types"; Level 3 "+Exercise" → "+Assessment:exercise"
   - Suggested Priority Order: "all 7 node types, all 9 edge types" → "all 6 node types, all 10 domain edge types + system edges"
   - Critical Files Reference: update description for `src/types.ts`
   - Verification Checklist: fix all references to 7 types / 9 edges / Exercise

2. **Mark `update-gap-analysis` todo as done** in SQL after completing the above.

**After design iteration is complete:**
1. Write remaining phase design docs (phases 3–7 folders are empty):
   - `phase-3-layered-views/` — Hybrid compound + depth filter architecture
   - `phase-4-traversal-strategies/` — Linear, Concept-Web, Problem-First specs
   - `phase-5-inference-backend/` — ASP.NET Core API design, Jena Fuseki setup, OWL ontology
   - `phase-6-validation/` — Validation rules, ValidationPanel spec
   - `phase-7-evoc/` — Deferred, placeholder only

2. Begin implementation (Phase 1 first):
   - Replace `src/data/mockGraph.ts` with sorting algorithms domain (23 nodes, all edges including system edges)
   - Replace `src/data/layerConfig.ts` with new 4-level complexity config
   - Rewrite `src/types.ts` with the locked TypeScript schema

</next_steps>