# Data Model Exploration

This is a working document for iterating on the data model design.

---

## Starting Point: What We Have

Current types in code (`types.ts`):

```typescript
// A node in the graph
KnowledgeNode {
  id: string
  label: string
  type: string        // e.g., "professor", "course"
  metadata?: {}
}

// A connection between nodes
KnowledgeEdge {
  id: string
  source: string      // node id
  target: string      // node id
  relationship: string // e.g., "teaches", "enrolled_in"
}

// The whole graph
KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
}
```

---

## Question 1: What IS a "layer"?

Three possible interpretations:

### Option A: Layer = Node Type

```
Layer "Professors"  = all nodes where type === "professor"
Layer "Courses"     = all nodes where type === "course"
```

Layers are derived from node types. Simple, but rigid.

### Option B: Layer = Relationship Step

```
Start: Departments
  │
  │ "has_faculty" relationship
  ▼
Layer 1: Professors (targets of has_faculty)
  │
  │ "teaches" relationship
  ▼
Layer 2: Courses (targets of teaches)
```

Layers are defined by following a chain of relationships. More flexible.

### Option C: Layer = User-Defined Group

```
Layer "Important Stuff" = [node-1, node-5, node-9]  (manually assigned)
Layer "Archive"         = [node-2, node-3]
```

Arbitrary grouping. Most flexible, but no semantic meaning.

---

## Question 2: What defines "parent" and "child"?

In a knowledge graph, edges can go any direction. When we say "drill down to children":

### Option A: Edge Direction

```
Parent ───edge──► Child

"teaches": Professor ──► Course
Professor is parent, Course is child
```

### Option B: Relationship Semantics

```
Professor "teaches" Course     → Course is child
Course "taught_by" Professor   → Professor is child (inverse)
```

Same edge, different perspective based on which relationship name you use.

### Option C: Layer Order

```
Layers defined as: [Dept, Prof, Course, Student]
Anything in an earlier layer is "parent"
Anything in a later layer is "child"
```

---

## Question 3: How do edges relate to layers?

### Intra-layer edges (within same layer)

```
┌─────────────────────────────┐
│  Professor Layer            │
│                             │
│  Prof A ══════ Prof B       │  "collaborates_with"
│     │                       │
│  Prof C                     │
└─────────────────────────────┘
```

Should these exist? Are they different from cross-layer edges?

### Cross-layer edges (between layers)

```
┌─────────────────────────────┐
│  Professor Layer            │
│  Prof A ─────────┐          │
└──────────────────┼──────────┘
                   │ "teaches"
┌──────────────────┼──────────┐
│  Course Layer    ▼          │
│              CS 101         │
└─────────────────────────────┘
```

These are the edges used for drill-down navigation.

---

## Current Thinking: Minimal Model

```typescript
// Core: Just nodes and edges
interface Node {
  id: string
  label: string
  type: string           // determines which layer it belongs to
}

interface Edge {
  id: string
  source: string
  target: string
  relationship: string   // "teaches", "enrolled_in", etc.
}

// Layer definition: A chain of relationships to follow
interface LayerChain {
  name: string
  steps: LayerStep[]
}

interface LayerStep {
  nodeType: string           // "professor"
  relationship?: string      // "teaches" (to get to next layer)
}

// Example:
const schoolChain: LayerChain = {
  name: "School Hierarchy",
  steps: [
    { nodeType: "department", relationship: "has_faculty" },
    { nodeType: "professor", relationship: "teaches" },
    { nodeType: "course", relationship: "enrolled_by" },
    { nodeType: "student" }
  ]
}
```

---

## Your Input Needed

1. Does "layer = node type" make sense for your use case?
2. Should edges be directional (parent → child) or bidirectional?
3. Do you need intra-layer edges (connections within same layer)?
4. What domains besides "school" are you thinking about?

---

## Design Decision (2026-02-04)

### Core Insight: Layers are DYNAMIC, built from relationship groupings

Instead of fixed "layer = node type", layers are constructed dynamically by grouping relationships.

### The Model

**Edges have bidirectional semantics:**
```
Professor ──teaches/taught_by──► Student
           └── forward ──┘└── inverse ──┘
```

One edge, two relationship names (forward and inverse). Or: two directed edges between nodes.

**Layer construction via relationship chain:**

User provides: `[[teaches, mentors], [enrolled_in]]`

This means:
```
Layer 0: Sources of "teaches" and "mentors"
         → Professors, Mentors (grouped together)

Layer 1: Targets of "teaches" and "mentors"
         = Sources of "enrolled_in"
         → Students

Layer 2: Targets of "enrolled_in"
         → Classes
```

**Visual:**
```
┌─────────────────────────────────────────┐
│ LAYER 0: Professor + Mentor             │
│ (sources of [teaches, mentors])         │
│                                         │
│   Prof A    Prof B    Mentor X          │
└─────┬─────────┬──────────┬──────────────┘
      │teaches  │teaches   │mentors
      ▼         ▼          ▼
┌─────────────────────────────────────────┐
│ LAYER 1: Students + Mentees             │
│ (targets of [teaches, mentors])         │
│ (sources of [enrolled_in])              │
│                                         │
│   Alice     Bob     Charlie   (mentee)  │
└─────┬───────┬─────────┬─────────────────┘
      │       │enrolled_in
      ▼       ▼
┌─────────────────────────────────────────┐
│ LAYER 2: Classes                        │
│ (targets of [enrolled_in])              │
│                                         │
│   CS 101    Math 201                    │
└─────────────────────────────────────────┘
```

**Key insight**: Layer membership is determined by graph traversal, not by node type.
A node labeled "mentee" ends up in Layer 1 because it's a TARGET of a relationship
in the first group `[teaches, mentors]`, not because of its type.

### Intra-layer edges

Within a layer, if nodes have edges between them, show them:
```
┌─────────────────────────────────────────┐
│ LAYER 0                                 │
│                                         │
│   Prof A ══collaborates══ Prof B        │
│      │                       │          │
│   Mentor X                              │
└─────────────────────────────────────────┘
```

Users can also CREATE new edges within a layer's view.

### Cross-layer edges

For now: **dummy logic** — just display the relationship groupings that connect layers. Don't implement full drill-down yet.

```
Layer 0 ──[teaches, mentors]──► Layer 1 ──[enrolled_in]──► Layer 2
```

---

## Revised Data Model

```typescript
// Core node - simple
interface Node {
  id: string
  label: string
  type?: string          // optional categorization
  metadata?: Record<string, unknown>
}

// Edge with bidirectional relationship semantics (PREFERRED)
// Single edge stores both directions
interface Edge {
  id: string
  source: string         // node id
  target: string         // node id
  relationship: string   // forward: "teaches"
  inverseRelationship: string  // inverse: "taught_by"
}

// UI can display either format based on user preference:
// - "Prof A ──teaches──► Alice"           (forward)
// - "Alice ──taught_by──► Prof A"         (inverse)
// - "Prof A ◄──taught_by── Alice ──teaches──► Prof A"  (both)

// The graph
interface Graph {
  nodes: Node[]
  edges: Edge[]  // or DirectedEdge[]
}

// Layer construction input
type RelationshipChain = string[][]
// Example: [["teaches", "mentors"], ["enrolled_in"]]
// Each inner array = relationships that define one layer transition

// Computed layer structure
interface ComputedLayer {
  index: number
  nodeIds: string[]      // nodes in this layer
  incomingRelationships: string[]  // relationships pointing INTO this layer
  outgoingRelationships: string[]  // relationships pointing OUT of this layer
}
```

---

## Decided

1. **Edge storage**: Single edge with forward + inverse relationship names
   - User can toggle UI to see either direction or both

2. **Unassigned nodes**: Hidden from layered view
   - Only nodes reached by the relationship chain appear in layers

3. **Partial chain traversal**: A node can appear in an intermediate layer even if it has no outgoing edges to the next layer
   - Example: Charlie (mentee) is in Layer 1 because he's a target of "mentors"
   - Charlie has no "enrolled_in" edge, so no arrow connects him to Layer 2
   - But Charlie still appears in Layer 1 — he's just a "leaf" in the hierarchy

```
Layer 0                    Layer 1                    Layer 2
┌──────────────────┐       ┌────────────────────┐     ┌──────────┐
│ Prof A   Prof B  │       │ Alice  Bob  Charlie│     │  CS 101  │
│ Mentor X         │       │  │      │     (no  │     │          │
└───┬────────┬─────┘       │  │      │    edge) │     └──────────┘
    │        │             └──┼──────┼──────────┘
    └────────┴──────────►     │      │
                              └──────┴──────────────►
```

## Open Questions

1. **Cycles and repeated nodes**: What if traversal revisits a node?

   Example: Prof A teaches Student B, Student B mentors Student C, Student C enrolled_in Class X, Class X taught_by Prof A

   ```
   Prof A ──teaches──► Student B ──mentors──► Student C ──enrolled_in──► Class X
      ▲                                                                      │
      └──────────────────────── taught_by ◄──────────────────────────────────┘
   ```

   **Two options (user chooses):**

   **Option A: Skip (first-visit wins)**
   - Once a node is assigned to a layer, ignore it if encountered again
   - Prof A stays in Layer 0, doesn't appear again even if reached via "taught_by"
   - Simpler, no duplication, but loses some relationship visibility

   ```
   Layer 0          Layer 1          Layer 2          Layer 3
   ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐
   │ Prof A │──────►│Student │──────►│Student │──────►│Class X │
   │        │       │   B    │       │   C    │       │   │    │
   └────────┘       └────────┘       └────────┘       └───┼────┘
                                                          │
                                            (edge to Prof A not shown,
                                             Prof A already in Layer 0)
   ```

   **Option B: Duplicate (show node in multiple layers)**
   - If a node is reached again, show it again in the new layer
   - Prof A appears in Layer 0 AND as a ghost/reference in Layer 4
   - More complete view, but can get cluttered with large graphs

   ```
   Layer 0          Layer 1          Layer 2          Layer 3          Layer 4
   ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐
   │ Prof A │──────►│Student │──────►│Student │──────►│Class X │──────►│ Prof A │
   │        │       │   B    │       │   C    │       │        │       │ (dup)  │
   └────────┘       └────────┘       └────────┘       └────────┘       └────────┘
   ```

   **Decision**: Let user toggle between Skip and Duplicate modes.

   **When to use each mode:**

   | SKIP MODE | DUPLICATE MODE |
   |-----------|----------------|
   | "Where does X belong?" | "How is X connected?" |
   | Identity-focused | Relationship-focused |
   | Org charts, taxonomies | Dependency graphs, flow diagrams |
   | Clean hierarchy, one home per node | Show cycles explicitly |
   | File/folder structures | Circular dependency detection |
   | Classification questions | Reachability questions |

   **Examples where SKIP makes sense:**
   - Organizational hierarchy: CEO shouldn't appear at top AND bottom
   - File system: Show canonical location, not symlink loops
   - "Which department does Prof A belong to?" → one answer

   **Examples where DUPLICATE makes sense:**
   - Module dependencies: Show that Module A imports itself (circular dep)
   - Document workflow: Draft → Review → Publish → Revise → Draft (lifecycle)
   - Dual roles: Student B is both a learner (Layer 1) and a TA who teaches (Layer 0)
   - "Trace all paths from X to Y" → show every route

---

## Infrastructure: Database & Setup (2026-02-05)

### Database Choice: Neo4j (Local via Docker)

**Why Neo4j:**
- Native graph database — nodes, edges, and traversals are first-class
- Cypher query language makes path queries trivial:
  `MATCH (a)-[:TEACHES]->(b)-[:ENROLLED_IN]->(c) RETURN a, b, c`
- Pattern matching fits our relationship chain model directly
- Free Community Edition is sufficient

**Why Docker:**
- One-command setup: `docker-compose up -d`
- Reproducible across machines — no manual install steps
- Isolates Neo4j from the host system
- Same `docker-compose.yml` works on Windows, Mac, Linux

### Setup Experience (Clone & Run)

**Goal:** Someone clones the repo, runs one script, everything works.

```
git clone <repo>
cd KnowledgeNetworkDemo
.\setup.ps1              ← Windows (PowerShell)
# ./setup.sh             ← Mac/Linux (future)
```

**What the setup script does:**
1. Check Docker Desktop is running
2. `docker-compose up -d` — starts Neo4j container
3. Wait for Neo4j health check (bolt://localhost:7687)
4. `npm install` — frontend dependencies
5. Run seed script — load sample graph data into Neo4j
6. `npm run dev` — start the app

### Repo Structure (Infrastructure Files)

```
KnowledgeNetworkDemo/
├── docker-compose.yml        ← Neo4j config, ports, volumes
├── setup.ps1                 ← Windows setup script
├── seed/
│   └── seed.cypher           ← sample nodes & edges in Cypher
├── src/                      ← React app (connects via neo4j-driver)
└── package.json              ← includes neo4j-driver dependency
```

### Connection Details

```
Neo4j Browser UI:   http://localhost:7474
Bolt connection:    bolt://localhost:7687
Default auth:       neo4j / password  (configurable in docker-compose.yml)
JS driver:          neo4j-driver (npm package)
```

### Port Assignments

| Service      | Port | Protocol |
|-------------|------|----------|
| Neo4j HTTP  | 7474 | HTTP (browser UI) |
| Neo4j Bolt  | 7687 | Bolt (driver connection) |
| Frontend    | 3000 | HTTP (Vite dev server) |

### Current Target: Windows Only

- `setup.ps1` is the only setup script for now
- Future: add `setup.sh` for Mac/Linux (same docker-compose.yml)
- Docker Desktop for Windows is the only prerequisite

---

## Ontology Layer (2026-02-05)

### Why Ontology

The ontology is a rules and vocabulary layer that sits above the data. It defines what types of nodes exist, what relationships are valid between them, and the semantic meaning of each relationship (including inverses and categories).

**Problems it solves:**
- Inverse names defined once, not repeated on every edge
- Validation: prevents invalid relationships (e.g., Course -TEACHES-> Department)
- UI intelligence: guides the relationship chain builder with valid suggestions
- Grouping: categories like "instructional" expand to [teaches, mentors, advises]
- Data shapes reference categories, so adding a new relationship auto-includes it

### Neo4j Storage Strategy

**Data edges — clean, no metadata needed:**
```
(Prof A)-[:TEACHES]->(Student B)
(Prof A)-[:MENTORS]->(Student C)
(Student B)-[:ENROLLED_IN]->(CS 101)
```

**Ontology — stored as nodes in the same database:**
```
(:NodeType {name: "Professor"})
(:NodeType {name: "Student"})
(:NodeType {name: "Course"})

(:RelDef {name: "teaches", inverse: "taught_by", category: "instructional"})
  -[:FROM_TYPE]->(:NodeType {name: "Professor"})
  -[:TO_TYPE]->(:NodeType {name: "Student"})

(:RelDef {name: "mentors", inverse: "mentored_by", category: "instructional"})
  -[:FROM_TYPE]->(:NodeType {name: "Professor"})
  -[:TO_TYPE]->(:NodeType {name: "Student"})

(:RelDef {name: "enrolled_in", inverse: "has_enrollment", category: "academic"})
  -[:FROM_TYPE]->(:NodeType {name: "Student"})
  -[:TO_TYPE]->(:NodeType {name: "Course"})
```

### How It Works Together

**Relationship type (Neo4j label)** = forward name = fast traversal index
**Ontology RelDef node** = inverse name, domain/range, category = defined once
**Arrow direction** = hierarchy (source → target)

**Edge storage**: No properties needed on data edges. The ontology holds all metadata.

**UI flow for relationship chain builder:**
1. User starts from "Professor"
2. UI queries ontology: "What relationships come FROM Professor?"
3. Ontology returns: [teaches → Student, mentors → Student]
4. User picks "teaches", arrives at "Student"
5. UI queries: "What relationships come FROM Student?"
6. Ontology returns: [enrolled_in → Course]
7. Chain builds with guided suggestions

**Category-based chains:**
```
Instead of:  [["teaches", "mentors"], ["enrolled_in"]]
User selects: [["instructional"], ["academic"]]

If "advises" is later added to "instructional" category,
saved data shapes automatically include it.
```

---

## Next Steps

1. Create `docker-compose.yml` with Neo4j config
2. Create `setup.ps1` script
3. Add `neo4j-driver` to project dependencies
4. Create `seed/seed.cypher` with sample graph data (including ontology nodes)
5. Build service layer to connect React app to Neo4j
6. Implement ontology query layer (valid relationships, inverses, categories)
7. Implement layer construction algorithm using Cypher queries

