<overview>
The user initiated a design session for `KnowledgeNetworkDemo`, a thesis demo for *Knowledge Graph Based Course Visualization* using a sorting algorithms domain, with companion design docs in `KnowledgeNetworkDemo-design`. The session's goal was to read all existing design docs, resolve outstanding architectural decisions (backend choice, node model, edge schema), and lock design for implementation. All work was documentation-only — no code was written.
</overview>

<history>

1. **User asked to start a design session for KnowledgeNetworkDemo**
   - Read all design docs: `THESIS_DEMO_GAP_ANALYSIS.md`, `ADR-001-backend-and-data-architecture.md`, `_reference/FEATURE_SPEC.md`, `phase-1-domain-data/DOMAIN_DATA_DESIGN.md`, `phase-1-domain-data/DATA_MODEL_EXPLORATION.md`, `KnowledgeNetworkDemo/IMPLEMENTATION_PLAN.md`
   - Discovered phases 2–7 design folders are all empty (no docs written yet)
   - Summarized current state: Phase 1 of old school-domain demo complete; 9 documented GAPs; ADR-001 unresolved; three open sub-questions

2. **Backend architecture decision (ADR-001)**
   - User selected Option B (Neo4j + backend + Jena)
   - User asked about C# ASP.NET Core vs Node.js — confirmed C# is fully capable (official `Neo4j.Driver` NuGet, language-agnostic Jena HTTP calls)
   - **Decision locked**: C# ASP.NET Core Web API (.NET 8) as backend language
   - **Decision locked**: Jena Fuseki + in-memory dataset (no TDB, sufficient for 23 nodes)

3. **EVōC cluster view decision**
   - User asked about embedding source; after discussion decided to **defer EVōC** until rest of system is built

4. **Node model discussion (major pivot)**
   - User raised that the original KnowledgeNetwork vision is being lost: nodes should have `parent`, `children`, `documentId`, and `artifacts[]`
   - Key insight emerged: **hierarchy should be computed, not stored** — parent/child depends on traversal context, intent, and embeddings (why Tutte/EVōC matters)
   - Discussed the "promote-to-node" problem: block editors promote sections to child pages assuming a fixed parent, but computed hierarchy has no fixed parent
   - **Resolution**: Promotion creates a new node + one explicit semantic edge (author supplies edge type at promotion time); hierarchy is seeded by accumulated edges, not stored
   - Future LLM features: post-promotion redundancy scan, additional edge suggestion

5. **Exercise merged into Assessment**
   - User reconsidered Exercise as a separate node type: "What if Exercise is a type of Assessment?"
   - **Decision locked**: Exercise merged into Assessment (6 node types total). `format` field distinguishes: `'exam' | 'exercise' | 'quiz'`
   - All Assessment nodes (incl. exercises) use `applies_in` → Concept and receive derived `assesses` edge from Jena

6. **`demonstrates` / `is_demonstrated_by` new edge type**
   - User was deciding how Principle nodes (`Stability`, `In-Place Sorting`) connect to Concepts
   - User requested a new edge type specifically for this relationship
   - Confirmed bidirectional inverse pair (not symmetric — different names each direction)
   - **Decision locked**: `demonstrates` (Concept → Principle) / `is_demonstrated_by` (Principle → Concept); OWL: ObjectProperty + `owl:inverseOf`
   - Edge count: 9 → **10 formal edges** + 1 derived

7. **Updating design docs**
   - Updated `ADR-001` with the decision, C# amendment, Fuseki choice, port assignments
   - Created `KNOWLEDGE_NODE_MODEL.md` (new foundational document)
   - Created `phase-2-type-system/TYPE_SYSTEM_DESIGN.md` (new)
   - Updating `phase-1-domain-data/DOMAIN_DATA_DESIGN.md` — was in progress when compaction occurred

</history>

<work_done>

Files created:
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\KNOWLEDGE_NODE_MODEL.md` — foundational base node schema, computed hierarchy model, promote-to-node model, education domain specialization, resolved decisions
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-2-type-system\TYPE_SYSTEM_DESIGN.md` — full TypeScript type definitions for Phase 2 implementation (⚠️ needs update — still reflects 7 node types and 9 edges; was written before Exercise/Assessment merge and `demonstrates` decisions)

Files modified:
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\ADR-001-backend-and-data-architecture.md` — added Decision block: Option B selected, C# backend amendment, Jena in-memory amendment, port assignments table
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-1-domain-data\DOMAIN_DATA_DESIGN.md` — in-progress updates (see below)

Work completed in DOMAIN_DATA_DESIGN.md:
- [x] Node types table: 7 → 6 (Exercise merged into Assessment with format field)
- [x] Edge reference table: 9 → 10 (added `demonstrates` + inverse)
- [x] `applies_in` section: added exercises as Assessment nodes
- [x] Added new `demonstrates` section with concrete edges
- [x] Updated `assesses` derived edge section (now 4 inferred assesses edges, not 2)
- [x] Coverage check table updated (10 edges all covered)
- [x] Traversal strategy walkthrough updated (gap condition wording updated)
- [x] Inference Demo Script updated (11 edges inferred, not 9)
- [ ] **INCOMPLETE**: Stale "Resolved Design Decisions" section at bottom of DOMAIN_DATA_DESIGN.md still references the old decisions (Exercise via `is_component_of`, Stability standalone) — needs to be replaced with updated decisions

Files NOT yet updated (still stale):
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\THESIS_DEMO_GAP_ANALYSIS.md` — still says "7 node types", "9 OWL-typed formal edges", "Exercise" as separate type; needs update to reflect 6 types and 10 edges
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-2-type-system\TYPE_SYSTEM_DESIGN.md` — TypeScript types still have `ExerciseNode` as separate type, `ThesisEdgeRelationship` union missing `demonstrates`/`is_demonstrated_by`

</work_done>

<technical_details>

**Core architecture decisions:**

- **Backend**: C# ASP.NET Core Web API (.NET 8). Uses `Neo4j.Driver` NuGet for graph DB, `HttpClient` for Jena Fuseki calls. From React's perspective identical to Node.js — REST/JSON API.
- **Jena Fuseki**: In-memory dataset only. OWL ontology file loaded at Docker container startup. No TDB persistence needed for 23 nodes.
- **Port assignments**: React Vite `5173`, ASP.NET Core `5000`/`5001`, Neo4j Browser `7474`, Neo4j Bolt `7687`, Jena Fuseki `3030`

**Node model (foundational insight):**
- `KnowledgeNode` does NOT store `parentId`/`childrenIds` — hierarchy is always computed
- Hierarchy sources: OWL-typed edges (explicit), EVōC embeddings (semantic, deferred), traversal strategy (context-dependent), complexity level filter (node-type based)
- Base schema: `{ id, label, type, description?, documentId?, artifacts[] }`
- `documentId` is a stub field (block editor out of scope for thesis demo)
- `artifacts[]` are unstructured file attachments (PDFs, images, code files) — local disk paths for now

**"Promote to node" model:**
- Promotion creates a new node + one explicit semantic edge the author supplies at promotion time
- The first edge anchors the node into the computed hierarchy — no fixed parent stored
- Future LLM features: redundancy scan, additional edge suggestion (out of scope for thesis)

**Education domain node types (6 total):**
- Concept, Principle, Example, Assessment (merged from Exercise+Assessment), Reference, Analogy
- Assessment has `format: 'exam' | 'exercise' | 'quiz'`
- Type-specific extra fields: `ExerciseNode` subtype removed; `AssessmentNode` gets `format`; `ReferenceNode` gets `url`/`citation`

**Edge schema (10 formal + 1 derived):**

| Edge | OWL Type | Direction |
|---|---|---|
| `prerequisite_of` | TransitiveProperty | Concept → Concept |
| `generalizes` | TransitiveProperty | Concept → Concept |
| `is_instance_of` | ObjectProperty | Example → Concept |
| `is_component_of` | ObjectProperty | Concept → Concept |
| `builds_on` | ObjectProperty | Concept → Concept |
| `contradicts` | SymmetricProperty | Concept ↔ Principle |
| `is_analogous_to` | SymmetricProperty | Analogy ↔ Concept |
| `applies_in` | ObjectProperty | Assessment/Reference → Concept |
| `commonly_conflated_with` | SymmetricProperty | Concept ↔ Concept |
| `demonstrates` | ObjectProperty + inverse `is_demonstrated_by` | Concept → Principle |
| `assesses` | Derived (from `applies_in`) | Assessment → Concept |

**`demonstrates` edge specifics:**
- OWL: `demonstrates` ObjectProperty; `is_demonstrated_by` = `owl:inverseOf demonstrates`
- Canonical storage direction: Concept → Principle
- Concrete edges: Merge Sort + Counting Sort → Stability; Bubble/Insertion/Heap/Quick Sort → In-Place Sorting
- Divide and Conquer and Time-Space Trade-off already connected via `is_component_of` and `contradicts`

**Inference (Jena):**
- 11 inferred edges total (up from 9):
  - 7 transitive `generalizes` closures via Sorting Algorithm
  - 4 derived `assesses` edges (Exam→Merge, Exam→Quick, Exercise:Bubble→Bubble, Exercise:QuickSort→Quick)

**Gap node for Linear Traversal:**
- Dynamic Programming has no Assessment (any format) connected via `applies_in` — this IS the gap node for Claim 4

**EVōC**: Deferred. To be content-based (using `description` field), likely pre-computed sentence embeddings via Python script stored as JSON. Decided after rest of system is built.

**Thesis demo node count**: Still 23 total (Exercise nodes reclassified as Assessment, counts unchanged).

</technical_details>

<important_files>

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\KNOWLEDGE_NODE_MODEL.md`
  - **Why it matters**: NEW — foundational document establishing the base node schema that all KnowledgeNetwork projects inherit from. Contains the computed-hierarchy insight, promote-to-node model, and education domain specialization.
  - **Changes**: Created from scratch this session. The "Decisions Resolved" section at the bottom still references placeholder text about Principles/Exercises (not yet cleaned up to reflect `demonstrates` edge).

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-1-domain-data\DOMAIN_DATA_DESIGN.md`
  - **Why it matters**: Authoritative record of all 23 nodes, 10 formal edges, and every concrete edge in the mock data. Implementation reference for `mockGraph.ts`.
  - **Changes**: In progress — most sections updated. Stale "Resolved Design Decisions" section at bottom (lines ~233–258) still has old content and needs replacement.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\ADR-001-backend-and-data-architecture.md`
  - **Why it matters**: Backend architecture decision record. Now locked: Option B with C# ASP.NET Core, Fuseki in-memory.
  - **Changes**: Decision block filled in; C# amendment and Fuseki amendment added; port table added.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-2-type-system\TYPE_SYSTEM_DESIGN.md`
  - **Why it matters**: NEW — TypeScript type definitions for Phase 2 implementation. Direct input to `src/types.ts` rewrite.
  - **Changes**: Created this session. ⚠️ STALE — still has `ExerciseNode` as separate type, `ThesisEdgeRelationship` missing `demonstrates`/`is_demonstrated_by`, node type union has 7 entries not 6.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\THESIS_DEMO_GAP_ANALYSIS.md`
  - **Why it matters**: Master overview of all 9 GAPs and thesis claims. Not yet updated.
  - **Changes**: None yet. ⚠️ STALE — still says 7 node types, 9 edges, Exercise as separate type. Needs update.

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo\src\types.ts`
  - **Why it matters**: Current (old) TypeScript types — generic `KGNode { type: string }` for school domain. Will be fully replaced in Phase 2.
  - **Changes**: Not yet touched.

</important_files>

<next_steps>

Immediate next steps (in order):

1. **Finish `DOMAIN_DATA_DESIGN.md`** — Replace the stale "Resolved Design Decisions" section at the bottom (lines ~233 to end). Replace with updated decisions:
   - Exercise merged into Assessment (format field)
   - `demonstrates` as 10th edge, with full `demonstrates` edge list
   - Principle connectivity via `demonstrates` (not standalone)
   - Authoring promotion model summary

2. **Update `THESIS_DEMO_GAP_ANALYSIS.md`** — Fix stale counts:
   - GAP 1: "7 node types" → 6 node types (Exercise removed, Assessment expanded)
   - GAP 2: "9 OWL-typed formal edges" → 10 formal edges (add `demonstrates`)
   - GAP 3: Domain data section — update Exercise nodes to Assessment format:'exercise', add `demonstrates` edges
   - Verification checklist at bottom

3. **Update `phase-2-type-system/TYPE_SYSTEM_DESIGN.md`** — Fix TypeScript types:
   - Remove `ExerciseNode` interface
   - Update `EducationNodeType` union: remove `'Exercise'` (6 types)
   - Add `demonstrates` and `is_demonstrated_by` to `ThesisEdgeRelationship` union
   - Update `AssessmentNode` to include `format?: 'exam' | 'exercise' | 'quiz'`
   - Update visual vocabulary table (remove Exercise row)

4. **Update `KNOWLEDGE_NODE_MODEL.md`** — The "Decisions Resolved" section placeholder needs the `demonstrates` edge and Exercise/Assessment merge properly documented.

5. **Write remaining phase design docs** (phases 3–7 folders are all empty):
   - `phase-3-layered-views/` — Hybrid compound + depth filter architecture (already resolved in THESIS_DEMO_GAP_ANALYSIS.md, needs its own doc)
   - `phase-4-traversal-strategies/` — Linear, Concept-Web, Problem-First specs
   - `phase-5-inference-backend/` — ASP.NET Core API design, Jena Fuseki setup, OWL ontology file spec
   - `phase-6-validation/` — Validation rules, ValidationPanel spec
   - `phase-7-evoc/` — Deferred, placeholder only

6. **Begin implementation** (Phase 1: domain data first, per build priority):
   - Replace `src/data/mockGraph.ts` with sorting algorithms domain (23 nodes, all 10 edge types)
   - Replace `src/data/layerConfig.ts` with new 4-level complexity config
   - Rewrite `src/types.ts` with the locked TypeScript schema from TYPE_SYSTEM_DESIGN.md

</next_steps>