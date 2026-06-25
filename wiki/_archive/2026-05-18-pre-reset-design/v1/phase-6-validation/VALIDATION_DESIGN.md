# Phase 6: Validation Layer Design

**Status:** Design intent preserved — implementation details need Stage 6 rewrite for SPARQL/SHACL  
**Date:** 2026-04-19  
**Depends on:** Phase 1 (domain data), Phase 2 (type system), ADR-001 (architecture)  
**Thesis Claims:** Claim 3 (structural constraint checking)

> **Guiding Principle: Design is direction, not contract.**  
> Implementation will reveal what's practical. Decisions here adapt to implementation reality.

Post-ADR-003 note: Cypher details in this document are superseded. Stage 6 should restate these checks as SPARQL queries and, where useful, SHACL shapes.

---

## What This Phase Covers

The validation layer enables Claim 3: a professor clicks "Validate" and the system checks whether the authored knowledge graph is **structurally well-formed**. This is analogous to compiling code — the professor authors the graph, then validates to catch structural errors before publishing.

**Professor framing:** "Before I present this course graph, I validate it to ensure every assessment tests something, every reference is connected, and no concepts are floating in isolation."

**Relationship to inference:** If inference is the logical mirror ("here's what your graph implies"), validation is the structural mirror ("here's where your graph is broken"). They complement each other — inference reveals semantic consequences, validation catches authoring mistakes.

---

## Resolved Design Decisions

### Q1: Where Validation Runs — Backend via Cypher

**Decision:** Validation rules run as Cypher queries on the C# backend. The frontend calls `GET /api/validate` and renders the results.

**Rationale:**
- Consistent with inference — backend owns all graph logic
- Cypher is natural for graph pattern matching (e.g., "find nodes with zero edges")
- No duplication of graph query logic in the frontend

---

### Q2: When Validation Runs — Manual Button

**Decision:** Validation runs only when the professor clicks "Validate." No auto-validation on graph change.

**Rationale:**
- Same pattern as "Run Inference" — professor controls when to check
- Analogous to compiling: author first, then validate on demand
- Simpler implementation — no debouncing or change tracking
- Auto-validation is a future consideration

---

### Q3: Validation UI — Side Panel

**Decision:** Validation results display in a side panel (like an IDE "Problems" tab).

**Layout:**
```
┌──────────────────────────────────────────┐
│ Validation Results          [✕ close]    │
├──────────────────────────────────────────┤
│ ✓ Assessment connectivity    (6/6 pass)  │
│ ✓ Reference connectivity     (4/4 pass)  │
│ ✗ Isolated nodes             (2 found)   │
│   → click: "Recursion"                   │
│   → click: "Memoization"                 │
│ ✓ generalizes type check     (all valid) │
│ ✓ is_instance_of direction   (all valid) │
│ ✓ General type mismatch      (0 found)   │
├──────────────────────────────────────────┤
│ 5/6 rules passed                         │
└──────────────────────────────────────────┘
```

**Interaction:** Clicking a failing node highlights it in the graph (pan + highlight). Professor can fix the issue, then re-validate.

---

## Six Validation Rules

Each rule is a Cypher query on the C# backend. Results include the offending nodes for UI display.

| # | Rule | What it checks | Cypher pattern |
|---|---|---|---|
| 1 | **Assessment connectivity** | Every Assessment connects via `applies_in` to ≥1 Concept/Principle | `MATCH (a:Assessment) WHERE NOT (a)-[:APPLIES_IN]->() RETURN a` |
| 2 | **Reference connectivity** | Every Reference has ≥1 inbound or outbound edge | `MATCH (r:Reference) WHERE NOT (r)-[]-() RETURN r` |
| 3 | **No isolated nodes** | No node has zero edges | `MATCH (n) WHERE NOT (n)-[]-() RETURN n` |
| 4 | **`generalizes` type check** | Source and target must both be Concept (or both Principle) | `MATCH (a)-[:GENERALIZES]->(b) WHERE NOT (labels(a) = labels(b)) RETURN a, b` |
| 5 | **`is_instance_of` direction** | Source must be Example, target must be Concept | `MATCH (a)-[:IS_INSTANCE_OF]->(b) WHERE NOT a:Example OR NOT b:Concept RETURN a, b` |
| 6 | **General type mismatch** | Edge types connect only valid source → target type combinations | Check each edge against allowed type pairs from the schema |

---

## API Contract

```typescript
// Request
GET /api/validate

// Response
{
  passedCount: 5,
  totalRules: 6,
  results: [
    {
      rule: "assessment-connectivity",
      label: "Assessment connectivity",
      passed: true,
      violations: []
    },
    {
      rule: "isolated-nodes",
      label: "No isolated nodes",
      passed: false,
      violations: [
        { nodeId: "recursion", label: "Recursion", type: "Concept" },
        { nodeId: "memoization", label: "Memoization", type: "Concept" }
      ]
    },
    ...
  ]
}
```

---

## Future Considerations (Not In Thesis Demo)

- **Auto-validation on graph change** — real-time structural feedback during authoring
- **SHACL formalization** — express rules as SHACL shapes for formal validation (currently "SHACL-parallel" — same intent, Cypher implementation)
- **Custom rules** — professor defines their own validation constraints
- **Severity levels** — warning vs. error (e.g., isolated node = warning, type mismatch = error)
- **Fix suggestions** — "This Assessment has no `applies_in` edge. Did you mean to connect it to [nearest Concept]?"
