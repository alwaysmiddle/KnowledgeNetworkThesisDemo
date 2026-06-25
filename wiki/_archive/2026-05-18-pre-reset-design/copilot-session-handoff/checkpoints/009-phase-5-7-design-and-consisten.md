<overview>
The user is building `KnowledgeNetworkDemo`, a thesis demo for *Knowledge Graph Based Course Visualization*. This session completed Phase 5 (Inference Backend) and Phase 6 (Validation) design documents, closed Phase 7 (EVōC scope) as absorbed into Phase 3, then conducted a cross-phase consistency audit across all 9 design documents — finding 13 inconsistencies (3 HIGH, 5 MEDIUM, 5 LOW). The user wants to fix all inconsistencies with double-verification, then rewrite the stale GAP analysis into a flexible implementation roadmap. The user's philosophy throughout: "design is direction, not contract" — implement first, then write the thesis around what actually works.
</overview>

<history>
1. **Phase 5 design discussion — Q1: OWL Ontology Structure**
   - User asked "what was the reasoning that led us to use Jena?" — I reviewed ADR-001 and explained the thesis credibility argument (Claim 2 requires formal OWL reasoning, not just Cypher pattern matching)
   - Presented TBox (schema) vs ABox (instance data) distinction with library analogy
   - User asked about production patterns — I taught the production architecture (TBox premade, ABox dynamic conversion)
   - User asked "is it difficult to translate property graph to RDF?" — I clarified: the general problem is hard (impedance mismatch), but our specific case is easy (1:1 mapping, no edge properties needed for reasoning)
   - User had key insight: "the visualization of full deductive closure at authoring time is useful to correct our own thinking" — inference as a logical mirror / validation tool
   - **Decision: Dynamic TBox + ABox** — premade `.ttl` schema + C# serializes Neo4j → RDF at runtime

2. **Phase 5 design — Q2: API Contract**
   - Presented 3 options: Command+Re-fetch, Delta, Full graph
   - Initially recommended Command+Re-fetch (Option A)
   - User pushed back: "doesn't this increase rendering time and doesn't scale well" — also resets viewport/layout
   - Acknowledged my overcaution on delta merge complexity (it's just append-only)
   - **Decision: Delta return** — `POST /api/infer` returns only new inferred edges + count

3. **Phase 5 design — Q3: C# ↔ Jena Integration**
   - Presented Raw HttpClient vs dotNetRDF library
   - User asked "by using a library what do we lose?" — I explained: almost nothing for our case, but raw gives full examiner visibility
   - **Decision: Raw HttpClient** — ~60 lines of Turtle serialization + SPARQL parsing, library for future

4. **Phase 5 design — Q4: Inference Timing**
   - User: "I am unclear when is the best time to run this, because we need to use the tool first to determine that question"
   - **Decision: Manual "Run Inference" button only** — let implementation inform auto-inference later

5. **Phase 5 design — Q5: Inference Scope**
   - **Decision: Full graph** — all 559 nodes sent to Jena each time (trivial at this scale)

6. **Phase 5 design doc written**
   - Created `INFERENCE_BACKEND_DESIGN.md` with all 5 resolved questions, TBox outline, C# pseudocode, idempotency pattern, decision table
   - Updated GAP analysis (GAP 6 resolved, GAP 8 updated)
   - Updated plan.md

7. **Phase 5 audit — user asked to check for missed topics**
   - Reviewed full conversation against doc — found one gap: concrete examples of inference catching authoring mistakes
   - Added 3 examples: wrong edge type, over-connected chains, symmetric surprises

8. **Phase 6 + Phase 7 design (quick)**
   - Phase 6 Validation: 3 decisions resolved:
     - Q1: Backend via Cypher (`GET /api/validate`)
     - Q2: Manual "Validate" button (user: "same as compiling")
     - Q3: Side panel with rule-by-rule ✓/✗ and clickable failing nodes
   - Phase 7 EVōC: Confirmed absorbed into Phase 3, created closure record
   - Created `VALIDATION_DESIGN.md` and `EVOC_SCOPE_REVIEW.md`
   - Updated GAP analysis and plan.md — all 7 design phases now complete

9. **User identified GAP analysis is stale and too rigid**
   - User: "the gaps are quite out of date... the thesis is just a draft... we need the rigorous approach where we keep options open to implement, then write a next version of the thesis"
   - User requested: fix inconsistencies first, then rewrite GAP analysis

10. **Cross-phase consistency audit launched**
    - Launched general-purpose agent to audit all 9 design docs
    - Agent found **13 inconsistencies**: 3 HIGH, 5 MEDIUM, 5 LOW
    - User: "let's fix the inconsistencies, and make sure they are changed by examining it 2 times"

11. **Started fixing inconsistencies**
    - Created 10 SQL todos for all fixes
    - Established canonical truth from Phase 2 types (ground truth):
      - 9 node types (6 knowledge + 3 organizational)
      - 13 formal domain edges + 1 derived (`assesses`) + 1 system (`sys:contains`) = 15 total
      - 559 nodes, 6 courses
      - Format: `'test' | 'exercise' | 'quiz'`
    - Read all sections needing fixes in ADR-001
    - **Compaction triggered before applying fixes**
</history>

<work_done>
Files created:
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-5-inference-backend\INFERENCE_BACKEND_DESIGN.md`
  - Complete Phase 5 design: architecture diagram, 5 resolved questions, TBox ontology outline, C# pseudocode, idempotency pattern, inference rules, decision table, demo script reference, future considerations
  - Added "inference catches authoring mistakes" section with 3 concrete examples

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-6-validation\VALIDATION_DESIGN.md`
  - Phase 6 design: backend Cypher validation, manual button, side panel UI mockup, 6 rules with Cypher patterns, API contract, future considerations

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-7-evoc\EVOC_SCOPE_REVIEW.md`
  - Closure record: Phase 7 absorbed into Phase 3

Files updated:
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\THESIS_DEMO_GAP_ANALYSIS.md`
  - GAP 6: fully resolved (architecture, API, timing, scope, idempotency documented)
  - GAP 7: resolved (backend Cypher, manual button, side panel)
  - GAP 8: updated (delta merge, not re-fetch)

- `C:\Users\ysz10\.copilot\session-state\692e80fb-990b-4a68-bac5-84e472c1c35c\plan.md`
  - Added Session 6 summary (Phase 5 + Phase 6 + Phase 7)
  - All 7 design phases marked complete
  - Implementation priority order listed

Work completed:
- [x] Phase 5 Inference Backend design — all 5 questions resolved, doc written
- [x] Phase 5 audit — missing authoring-mistakes examples added
- [x] Phase 6 Validation design — all 3 questions resolved, doc written
- [x] Phase 7 EVōC scope — confirmed absorbed, closure record written
- [x] All design docs propagated (GAP analysis, plan.md)
- [x] Cross-phase consistency audit — 13 issues found
- [ ] Fix 13 inconsistencies across all docs (IN PROGRESS — todos created, canonical truth established, not yet applied)
- [ ] Rewrite GAP analysis as flexible implementation roadmap
</work_done>

<technical_details>
**Phase 5 Resolved Decisions:**

| # | Question | Decision |
|---|---|---|
| Q1 | OWL ontology structure | **Dynamic TBox + ABox** — premade `.ttl` schema + C# serializes Neo4j → RDF at runtime. URI scheme: `kn:{node-id}` |
| Q2 | API contract | **Delta return** — `POST /api/infer` returns only new inferred edges + count. Frontend merges surgically (append-only, no viewport reset) |
| Q3 | C# ↔ Jena integration | **Raw HttpClient** — no dotNetRDF library. ~60 lines total (40 Turtle serializer + 20 SPARQL parser) |
| Q4 | Inference timing | **Manual button only** — auto-inference deferred to future |
| Q5 | Inference scope | **Full graph** — all 559 nodes sent each time (milliseconds for Jena) |

**Key Inference Concepts:**
- **TBox** = ontology schema (classes + property rules), premade, version-controlled (`course-ontology.ttl`)
- **ABox** = instance data (nodes + edges), dynamically serialized from Neo4j
- **Deductive closure** = all statements logically entailed by authored graph + ontology rules
- **Identity bridge** = deterministic URI scheme `kn:{node-id}` — strip prefix to get Neo4j ID
- **Property graph ↔ RDF impedance mismatch** = general problem is hard, but our case is easy (no edge properties needed for reasoning, direct 1:1 mapping)
- **Inference as logical mirror** = shows professor consequences of their authoring decisions, catches mistakes (wrong edge types, over-connected chains)
- **Clear-and-recompute** = delete all `inferred=true` edges, re-derive fresh. Simple and correct at 559 nodes.
- **Partition invariant** = authored (`inferred=false`) and inferred (`inferred=true`) edges NEVER overlap. Authored takes precedence.

**5 Inference Rules (OWL):**
1. Transitive closure of `generalizes`
2. Transitive closure of `prerequisite_of`
3. Symmetric expansion of `contradicts`
4. Symmetric expansion of `is_analogous_to`
5. Symmetric expansion of `commonly_conflated_with`
6. Derived `assesses` from `applies_in` (SPARQL CONSTRUCT fallback if OWL property chains insufficient)

**Phase 6 Resolved Decisions:**
- Backend Cypher queries via `GET /api/validate`
- Manual "Validate" button (professor analogy: "same as compiling")
- Side panel UI with ✓/✗ per rule, clickable failing nodes
- 6 validation rules: assessment connectivity, reference connectivity, no isolated nodes, generalizes type check, is_instance_of direction, general type mismatch

**Canonical Counts (from Phase 2 types — implementation ground truth):**
- 9 node types (6 knowledge: Concept, Principle, Example, Assessment, Reference, Analogy + 3 organizational: Program, Course, Professor)
- 13 formal domain edges + 1 derived (`assesses`) + 1 system (`sys:contains`) = 15 total edge relationship values
- 559 nodes across 6 courses, 3 professors, 22 shared principles
- Assessment format: `'test' | 'exercise' | 'quiz'` (NOT `'exam'`)

**13 Cross-Phase Inconsistencies Found:**

HIGH (3):
1. ADR-001 says "23 nodes, 7 types, 9 edges" — should be 559/9/13+
2. `'exam'` not updated to `'test'` in DOMAIN_DATA_DESIGN and Phase 3
3. Domain `contains` edge missing from DOMAIN_DATA_DESIGN (ADR-002, NODE_MODEL, Phase 2 all have it)

MEDIUM (5):
4. `teaches` placed under "System edges" heading in DOMAIN_DATA (it's domain per ADR-002)
5. Edge count varies: 9, 10, 12, 13 across docs — nobody agrees
6. "Concept-Web" not renamed to "Explore" in NODE_MODEL and ADR-001
7. `/infer` vs `/api/infer` endpoint paths (ADR-001 vs Phase 5/6)
10. NODE_MODEL "types.ts guidance" says 10 edges/6 types (should be 13/9)

LOW (5):
8. ADR-001 references `bubble-sort` (stale domain example)
9. ADR-001 headings still say "Node.js" (amended to C# below)
11. Phase 5 TBox omits domain `contains` (likely intentional but undocumented)
12. ADR-001 says "7 build phases" (only 6 phase docs exist — Phase 7 absorbed)
13. `professor?` field on CourseNode in NODE_MODEL but not in Phase 2

**User's Guiding Philosophy:**
> "Design is direction, not contract. Implementation will reveal what's practical. Thesis claims adapt to implementation reality."
- Applied to GAP analysis (softened rigid "MUST" language)
- Applied to Phase 4 (TRAVERSAL_STRATEGIES_DESIGN.md header)
- User explicitly wants to implement first, then write thesis around what actually works
</technical_details>

<important_files>
- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-5-inference-backend\INFERENCE_BACKEND_DESIGN.md`
  - **Why**: Phase 5 design doc — fully resolved, all 5 questions answered
  - **Created this session**: Complete doc with architecture, TBox outline, C# pseudocode, decision tables
  - **Status**: COMPLETE

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-6-validation\VALIDATION_DESIGN.md`
  - **Why**: Phase 6 design doc — 3 questions resolved
  - **Created this session**: Backend Cypher, manual button, side panel
  - **Status**: COMPLETE

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-7-evoc\EVOC_SCOPE_REVIEW.md`
  - **Why**: Phase 7 closure record
  - **Created this session**: Confirms absorption into Phase 3
  - **Status**: COMPLETE

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\THESIS_DEMO_GAP_ANALYSIS.md`
  - **Why**: Master overview — needs rewrite after inconsistency fixes
  - **Updated this session**: GAP 6 resolved, GAP 7 resolved, GAP 8 updated
  - **Status**: STALE — needs rewrite as implementation roadmap
  - **Key stale sections**: Priority order (lines 315-323), Critical files (lines 327-347), Verification checklist (lines 351-374), "Current Demo State" table (lines 17-29)

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\ADR-001-backend-and-data-architecture.md`
  - **Why**: Backend architecture — has the most inconsistencies (items 1, 7, 8, 9, 12)
  - **Needs fixing**: Line 15 (23 nodes/7 types/9 edges), Line 71/166 (Node.js headings), Lines 80-84 (endpoint paths, bubble-sort), Line 6 (7 phases), Line 230 (23 nodes rationale)
  - **Status**: NEEDS FIXES

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\KNOWLEDGE_NODE_MODEL.md`
  - **Why**: Foundational schema — has stale sections
  - **Needs fixing**: Line 337 header (12→13 formal), Line 377 (Concept-Web→Explore, 10 edge types), Lines 411-412 (10 edges/6 types guidance)
  - **Status**: NEEDS FIXES

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-1-domain-data\DOMAIN_DATA_DESIGN.md`
  - **Why**: Domain data — missing domain `contains`, stale `exam` format
  - **Needs fixing**: Line 36 (exam→test), Lines 87-88 (Exams→Tests), Lines 639-644 (teaches under System heading, missing domain contains), Lines 167-184 (edge reference table missing contains)
  - **Status**: NEEDS FIXES

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-3-layered-views\LAYERED_VIEWS_DESIGN.md`
  - **Why**: Phase 3 — stale `exam` reference
  - **Needs fixing**: Line 191 (Assessment exam → Assessment test)
  - **Status**: NEEDS FIX

- `D:\ShiZhong\MyCode\KnowledgeNetworkDemo-design\phase-2-type-system\TYPE_SYSTEM_DESIGN.md`
  - **Why**: TypeScript types — this IS the canonical ground truth, no fixes needed
  - **Status**: CORRECT (reference for all fixes)

- `C:\Users\ysz10\.copilot\session-state\692e80fb-990b-4a68-bac5-84e472c1c35c\plan.md`
  - **Why**: Session plan — updated with all 7 phases complete
  - **Status**: UP TO DATE

SQL todos: 10 old todos (all `done`) + 10 new fix todos (all `pending`):
- fix-high-1: ADR-001 stale counts (23→559, 7→9, 9→13+)
- fix-high-2: exam→test format (DOMAIN_DATA, Phase 3)
- fix-high-3: domain contains missing from DOMAIN_DATA
- fix-med-4: teaches under System heading
- fix-med-5: edge count chaos (standardize across all docs)
- fix-med-6: Concept-Web→Explore rename (NODE_MODEL, ADR-001)
- fix-med-7: API endpoint /infer vs /api/infer
- fix-med-10: NODE_MODEL stale types.ts guidance
- fix-low-11: Phase 5 TBox contains omission documentation
- fix-low-13: CourseNode professor field mismatch
</important_files>

<next_steps>
**Immediate — Fix 13 inconsistencies (IN PROGRESS):**

The canonical truth is established (from Phase 2 types). The user wants fixes applied and verified twice. Apply in this order:

1. **ADR-001 fixes** (items 1, 7, 8, 9, 12):
   - Line 15: `7 node types, 9 edge types, 23 nodes` → `9 node types, 15 edge types, 559 nodes`
   - Line 71/166: Add "(amended to C# — see below)" to Node.js headings, or update headings
   - Lines 80-84: `/infer` → `/api/infer`, `/validate` → `/api/validate`, `bubble-sort` → CS program example
   - Line 6: "7 build phases" → "6 build phases"
   - Line 230: "23 nodes" → "559 nodes" in Jena rationale

2. **DOMAIN_DATA_DESIGN fixes** (items 2, 3, 4):
   - Line 36: `'exam'` → `'test'`
   - Lines 87-88: "Exams" → "Tests"
   - Add domain `contains` to edge reference table (lines 167-184)
   - Add domain `contains` to coverage check (lines 619-644)
   - Move `teaches` from System edges heading to domain edges section

3. **KNOWLEDGE_NODE_MODEL fixes** (items 5, 6, 10):
   - Line 337: "12 formal + 1 derived" → "13 formal + 1 derived"
   - Line 377: "Concept-Web" → "Explore", "10 edge types" → "13 formal domain edge types"
   - Lines 411-412: "10 formal domain edges" → "13 formal domain edges", "6 node types" → "9 node types"

4. **Phase 3 fix** (item 2): Line 191 "exam" → "test"

5. **ADR-001 Concept-Web→Explore** (item 6): Line 289

6. **Phase 5 TBox** (item 11): Add comment explaining why domain `contains` is excluded

7. **CourseNode** (item 13): Remove `professor?` from NODE_MODEL (Phase 2 is ground truth, resolves via `teaches` edge)

**After fixes — double verification:**
- Re-read every changed section to confirm consistency
- Run the audit agent again (or manually grep for stale terms)

**After verification — Rewrite GAP analysis:**
- User wants GAP analysis restructured as implementation roadmap
- Keep design decisions (they're solid)
- Replace rigid checklists with flexible scope markers (core / stretch / future)
- Frame around "what to build in what order" not "what the thesis demands"
</next_steps>