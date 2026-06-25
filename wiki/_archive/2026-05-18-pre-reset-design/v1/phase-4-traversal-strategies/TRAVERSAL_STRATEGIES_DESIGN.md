# Phase 4 — Traversal Strategies Design
**Status:** Design reference — Stage 6 revisit needed for current namespaces, SPARQL implementation, and API contracts  
**Last Updated:** 2026-04-18  
**Depends on:** KNOWLEDGE_NODE_MODEL.md, phase-2-type-system/TYPE_SYSTEM_DESIGN.md, phase-1-domain-data/DOMAIN_DATA_DESIGN.md, ADR-002

---

## What This Phase Covers

> **Design is direction, not contract.** Implementation will reveal what's practical. Thesis claims adapt to reality.

Designing the traversal visualization and editing system. Three traversal strategies (Thesis Claims 4-6) displayed through a dual-pane coordinated view: a **circuit-design-inspired timeline editor** synchronized with the **EVōC WorldMap**. The three strategies are **authoring analysis tools** — the core workflow is author → present.

Stage 6 note: the `GET /api/traverse` response contract is still undesigned. Revisit and define it before implementing traversal endpoints.

---

## Design Philosophy

The traversal problem is a **coordination and scheduling problem**, not just a visualization problem. The professor isn't passively viewing a graph — they're authoring and rearranging a learning sequence subject to dependency constraints.

**Core insight:** A knowledge graph's `prerequisite_of` edges define a **partial order**. A complete teaching schedule is one of many valid **topological sorts** of that partial order. The editor's job is to make the **degrees of freedom** visible — where the professor has choice (free zones) vs. where the graph constrains them (locked rails).

**Interaction metaphor:** Electronic circuit design (EDA). Knowledge nodes are components. Dependencies are wires. The timeline editor is the schematic view. The WorldMap is the PCB layout view. Both stay synchronized, just like KiCad's schematic ↔ board coordination.

---

## Dual-Pane Architecture

### WorldMap Pane (Spatial / Overview)

- EVōC-clustered spatial layout, max 3 tiers deep
- Traversal-relevant nodes highlighted by **opacity** (DOI function — Furnas, 1986)
- Full graph always visible as dimmed context; traversal result is bright foreground
- Click node on WorldMap → scrolls timeline to that node's position
- Expand/collapse in timeline → WorldMap adjusts highlight granularity

### Timeline Pane (Sequential / Detail)

- Circuit-design-inspired DAG editor using the 6 primitives (see below)
- Horizontal (bottom pane) or vertical (side pane) orientation — user preference
- Professor-authored teaching sequence with dependency constraints enforced
- Sugiyama-framework layout (Sugiyama et al., 1981) via dagre or ELK
- Hover node on timeline → pulse on WorldMap

### Sync Behavior

| Action in Timeline | Effect on WorldMap |
|---|---|
| Hover node | Pulse/highlight corresponding node |
| Select node | Center and zoom to node's cluster |
| Expand group | Reveal sub-nodes in cluster at finer granularity |
| Collapse group | Fade sub-nodes, show only group-level highlight |
| Collapse branch | Fade corresponding branch nodes |

| Action on WorldMap | Effect on Timeline |
|---|---|
| Click node | Scroll timeline to node's position |
| Click cluster | Highlight all timeline nodes in that cluster |
| Zoom into cluster | Expand corresponding group in timeline (if grouped) |

---

## The 6 Editor Primitives

Derived from systematic mapping of electronic circuit design concepts to curriculum knowledge graph editing. See thesis notes: `traversal-visualization-contribution.md`.

### 4 Interaction Primitives (what the professor does)

#### 1. Wire

**Circuit analogy:** Trace / signal path  
**What it is:** A locked dependency connection between two nodes. Created by `prerequisite_of` edges in the knowledge graph.  
**Behavior:**
- Renders as a rigid rail on the timeline — connected nodes cannot be reordered relative to each other
- The partial order of the DAG determines which node pairs are locked
- Professor cannot drag a wired node past its dependency — the rail prevents it
- Creating a new wire = adding a `prerequisite_of` edge to the graph (graph mutation)
- Deleting a wire = removing the edge, potentially unlocking the node into a free zone

**Visual:** Solid connection line between nodes on the timeline rail.

#### 2. Pin

**Circuit analogy:** Bypass capacitor / test point  
**What it is:** Optional content positioned alongside the main timeline. No dependency edges — purely a scheduling/positioning decision.  
**Behavior:**
- Professor drags a node onto the timeline → defaults to **pinned** (no graph mutation)
- Pinned nodes can be freely repositioned anywhere on the timeline
- Visually distinct from wired nodes (e.g., dashed border, lighter color, "optional" badge)
- Removing a pin just removes it from the timeline view — the node still exists in the graph
- Professor can **upgrade a pin to a wire** by explicitly connecting dependencies (right-click → "Lock into sequence" or draw edge)

**Visual:** Node with dashed border, positioned alongside but not on the main rail.

#### 3. Gate

**Circuit analogy:** AND gate / OR gate / Branch selector  
**What it is:** A split/join point where the timeline branches or converges. Unifies three dependency semantics into one node type with a mode selector.
**Modes:**
- **AND**: All incoming paths must be completed before proceeding. "You need BOTH Linear Algebra AND Probability for Machine Learning."
- **OR**: Any one incoming path is sufficient. "You need EITHER Java OR Python for this course."
- **BRANCH**: Professor-defined alternative learning paths. "Database Track vs Systems Track." Student/professor selects which path to follow.

**Behavior:**
- Gate nodes appear at branch/join points in the timeline
- BRANCH paths visually diverge from the gate and reconverge at a join gate
- AND/OR distinction affects traversal logic (gap detection, prerequisite checking)
- Professor can change gate mode (AND ↔ OR ↔ BRANCH) via interaction
- Labels shown on gate: "All required" (AND), "Any one" (OR), "Choose branch" (BRANCH)

**Visual:** Diamond or gate-shaped node at branch/convergence points. Mode indicated by label.

#### 4. Group

**Circuit analogy:** IC / black box / sub-circuit  
**What it is:** A collapsible container that packages multiple nodes into a single component with defined input/output ports.  
**Behavior:**
- Professor selects multiple nodes → "Group" action creates a container
- Group has **input ports** (prerequisite edges entering the group) and **output ports** (edges leaving the group)
- Collapsed view: single block on the timeline showing group label + port count
- Expanded view: inline indented tree showing internal nodes and wiring (like folder tree)
- Double-click to expand/collapse
- Groups can be nested (sub-circuits within sub-circuits)
- Maps to `sys:contains` hierarchy and EVōC tiers

**Visual:** Rounded container with label. Collapsed = single block with [+] indicator. Expanded = indented children with internal wiring visible.

---

### 1 Structural Element + 1 Visual-Only (what the editor understands)

#### 5. Bus (Visual-Only — Demo Mock)

**Circuit analogy:** Signal bus / data bus  
**What it is:** A visual indicator showing professor session progress across multiple courses. NOT an interactive editor primitive — static/mocked in the demo.  
**Future potential:** Multi-professor coordination dashboard showing progress across concurrent course sessions.  
**Behavior:**
- Rendered as a thin colored line below the timeline showing progress markers
- Static in demo — no authoring, no interaction
- Future: auto-derived from professor's course assignments and current teaching position

**Visual:** Thin colored line with progress markers (✓ = covered, ◉ = current).

#### 6. Clock

**Circuit analogy:** Clock signal / timing reference  
**What it is:** Vertical (or horizontal, depending on timeline orientation) scheduling grid lines marking temporal divisions.  
**Behavior:**
- Clock divisions are **professor-defined** (manually set — e.g., Week 1-14, Lecture 1-28, Module 1-6)
- Nodes positioned between clock lines indicate when they'll be taught
- Nodes can span multiple clock divisions if needed
- Clock lines are visual reference only — they don't create dependencies
- Future: auto-derive divisions from Group structure

**Visual:** Thin vertical/horizontal lines with labels at the top/side of the timeline.

---

## Primitive Interaction Summary

| Primitive | Graph Mutation? | Drag Behavior | Professor Creates By | Demo Scope |
|---|---|---|---|---|
| Wire | Yes — adds/removes `prerequisite_of` edge | Locked — cannot reorder past dependency | Explicitly connecting two nodes | Full |
| Pin | No — scheduling only | Free — shifts other free nodes (list-like) | Dragging a node onto timeline (default) | Full |
| Gate | Yes — defines AND/OR/BRANCH semantics | Fixed at branch/join point | Creating a branch or marking a join | Full |
| Group | No — visual grouping (uses existing `sys:contains`) | Moves as a unit | Selecting nodes → "Group" | Full |
| Clock | No — reference grid only | N/A (fixed divisions, professor-defined) | Defining schedule divisions manually | Full |
| Bus | No — visual mock only | N/A (static progress indicator) | N/A — auto-derived in future | Visual mock |

---

## Free Zones and Locked Rails

The DAG's partial order divides node pairs into two categories:

- **Comparable pairs**: Nodes connected by a directed path (transitive closure of `prerequisite_of`). Their relative order is **locked** — the rail enforces it.
- **Incomparable pairs**: Nodes with no directed path between them. Their relative order is **free** — the professor can arrange them in any order.

**Free zones** are contiguous regions of the timeline where all nodes are mutually incomparable. Within a free zone, the professor can drag and reorder freely. **Free zones are auto-detected and visually indicated** — subtle background shading or swim-lane border marks reorderable regions before the professor interacts.

**Drag physics:** List-like — when the professor drags a node in a free zone, other free nodes shift to accommodate (like reordering items in a todo list). No manual spacing management needed.

```
Locked rail (can't reorder):
  Variable ════ Conditional ══════ For Loop ══════ Function

Free zone (drag to reorder):              ╔═══════════════╗
                                          ║ Encapsulation ↕ ║
  ─── Class ════ Inheritance ──────────── ║ Polymorphism  ↕ ║ ─── ...
                                          ║ Abstraction   ↕ ║
                                          ╚═══════════════╝
```

**Insertion behavior:** When a professor drags a new node into the timeline:
- **Default: Pin** (Case A) — no edges created, node is freely positioned. Safe, reversible.
- **Explicit: Wire** (Case B) — professor connects dependency edges, locking the node into the rail. Graph mutation, intentional.

This distinction keeps casual gestures safe and structural changes intentional.

---

## Two Interaction Modes

### Author Mode (default)

The professor edits the knowledge graph and builds teaching sequences using the 6 editor primitives. The timeline is a DAG editor. The WorldMap shows spatial context.

**Analysis tools available during authoring:**
- **Linear** — follow `prerequisite_of` forward to inspect the dependency chain
- **Explore** — browse neighborhood on WorldMap (all 13 domain edge types)
- **Problem-First** — trace backward from an Assessment to verify coverage

These are **inspection utilities**, not the core workflow. The professor invokes them to check their work — "does my authored path actually cover the prerequisites?" — then returns to editing.

### Presentation Mode (F5-style entry)

The professor enters presentation mode to walk through their **authored timeline path**. The graph is read-only.

**Entry:** Select starting point → "Present" (or hotkey)  
**Controls:** Step forward/backward through the authored sequence  
**At a Gate (BRANCH):** Professor chooses which path to take live  
**At a Group:** Professor can expand inline or skip  
**Timeline shows progress:**
- ✓ = covered (dimmed/green)
- ◉ = current node (highlighted)  
- ○ = upcoming (muted)
- ⚠ = gap (no assessment)

**WorldMap syncs** — current node highlighted spatially.  
**ESC** to exit back to Author Mode.

**Cross-course nodes** appear as visually distinct exit points. Professor clicks to follow into that course's context.

**Future work:** Separate audience-facing simplified view, presenter vs. audience display split.

---

## Three Analysis Strategies (Authoring Utilities)

These are **supplementary inspection tools** available during Author Mode. They help the professor analyze the graph structure, not build the teaching path. The core workflow is author → present.

Each strategy is a different **lens** through the same dual-pane system. The strategy determines which edges are followed, which direction, and how the result is rendered.

| Strategy | Pane | Purpose |
|---|---|---|
| **Linear** | Timeline | Follow prerequisite chain forward |
| **Problem-First** | Timeline | Trace backward from assessment |
| **Explore** | WorldMap | Browse neighborhood, all edge types |

### Linear Traversal (Claim 4 — "inspect the learning path")

**Edge followed:** `prerequisite_of` (transitive closure)  
**Direction:** Forward from selected node  
**Timeline rendering:** Main trunk = prerequisite chain. Branches = other edge types (`generalizes`, cross-course `prerequisite_of`, etc.)  
**Gap detection:** Nodes in the chain with no Assessment connected via `applies_in` are marked with ⚠  

**Walkthrough:** Start node: `Variable` (CS101)
```
Variable ═══ Conditional ═══ For Loop ═══ Function ═══ Class ⚠
   │              │              │            │
   └─ Data Type   └─ Boolean     └─ CS201:    └─ CS201:
      ├─ Integer     (gen.)        Array        Linked List
      └─ String                   (cross)       (cross)
```
**Professor use:** "I can trace the linear learning path my course implies and spot gaps — Class has no assessment."

### Explore (Claim 5 — "see all relationships around a topic")

**Edges followed:** All 13 domain edge types  
**Direction:** Both inbound and outbound from selected node  
**Rendering:** **WorldMap-only** — no timeline pane for this strategy. The WorldMap highlights the neighborhood with edge-type coloring. A sidebar shows the edge-type-grouped list. Timeline pane is hidden or grayed out.  
**Rationale:** Explore is fundamentally spatial, not sequential. The WorldMap IS the network view — forcing neighborhood exploration into a timeline would be redundant with the system's core purpose.  
**Gap detection:** N/A — this is exploration, not path analysis

**Walkthrough:** Start node: `Hash Table` (CS201)
- `prerequisite_of` ← Hash Function
- `is_instance_of` ← Hash Table with Chaining Demo
- `demonstrates` → Time-Space Trade-off (shared principle)
- `applies_in` ← Quiz, Test, Exercise (3 assessments)
- Cross-course: `prerequisite_of` → CS401:Hash Index

**Professor use:** "I can see Hash Table is well-covered with 3 assessments, demonstrates a shared principle, and feeds into CS401."

### Problem-First Traversal (Claim 6 — "verify what an assessment implicitly requires")

**Edges followed:** `applies_in` (backward), then `prerequisite_of` (backward transitive closure)  
**Direction:** Backward from Assessment node  
**Timeline rendering:** Reverse-direction timeline. Assessment at the right (or bottom), prerequisites chain going left (or up).  
**Gap detection:** Highlights the full prerequisite tree an assessment implicitly requires

**Walkthrough:** Start node: `Test: Dijkstra vs Bellman-Ford` (CS301)
```
  CS101:List ◄══ CS201:Graph ◄══ Graph Algo ◄══ Dijkstra's ◄══ Test: Dijkstra
                                     │                            vs Bellman-Ford
                                     └══ Bellman-Ford ◄══════════════╝
```
**Professor use:** "This test requires both shortest path algorithms, tracing back through CS201 graphs to CS101 lists."

---

## Type System Additions

New types needed in `types.ts` to support the timeline editor:

```typescript
export type TimelinePrimitiveType = 'wire' | 'pin' | 'gate' | 'group' | 'bus' | 'clock'

export type GateMode = 'and' | 'or' | 'branch'

export interface TimelineNode {
  nodeId: string
  primitive: 'wire' | 'pin'
  position: number
  locked: boolean
}

export interface TimelineGate {
  id: string
  mode: GateMode
  inputNodeIds: string[]
  outputNodeIds: string[]
}

export interface TimelineGroup {
  id: string
  label: string
  nodeIds: string[]
  inputPorts: string[]
  outputPorts: string[]
  collapsed: boolean
}

export interface TimelineBus {
  id: string
  label: string
  color: string
  courseId: string
  progressMarkers: { nodeId: string; status: 'covered' | 'current' | 'upcoming' }[]
}

export interface TimelineClock {
  divisions: ClockDivision[]
}

export interface ClockDivision {
  id: string
  label: string
  position: number
}

export interface TimelineState {
  nodes: TimelineNode[]
  gates: TimelineGate[]
  groups: TimelineGroup[]
  buses: TimelineBus[]
  clock: TimelineClock
  orientation: 'horizontal' | 'vertical'
  strategy: TraversalStrategy
}
```

---

## Cross-Reference

| Document | Relevance |
|---|---|
| KNOWLEDGE_NODE_MODEL.md | Node/edge schema used by traversal |
| TYPE_SYSTEM_DESIGN.md | TypeScript types extended with timeline primitives |
| DOMAIN_DATA_DESIGN.md | Traversal walkthrough examples (Lines 648-685) |
| ADR-002 | `sys:contains` used by Group primitive for hierarchy |
| VISION.md | Demo claim framing for traversal strategies |
| phase-3-layered-views/ | EVōC WorldMap pane design (coordinated view partner) |
| Thesis Notes: traversal-visualization-contribution.md | Novel contribution framing + citations |

---

## Research Grounding

| Concept | Source |
|---|---|
| Coordinated Multiple Views | Wang Baldonado et al., AVI 2000 |
| Storyline Visualization | Tanahashi & Ma, IEEE TVCG 2012 |
| Layered Graph Drawing (Sugiyama) | Sugiyama et al., IEEE Trans. SMC 1981 |
| Semantic Zooming | Furnas & Bederson, CHI 1995 |
| Degree of Interest (DOI) | Furnas, CHI 1986 |
| Overview+Detail survey | Cockburn et al., ACM CSUR 2008 |
| AND/OR Dependency Graphs | AI planning literature |
| Petri Nets for Curriculum | Stafford & Cox, 2009; Murata, 1989 |
| Crossing Minimization (NP-hard) | Garey & Johnson, 1983 |

---

## Resolved Design Questions

### Original 7 (Circuit Design Sub-Questions)

| # | Question | Decision |
|---|---|---|
| 1 | Concept-Web in dual-pane | Renamed to **Explore**. WorldMap-only — timeline pane hidden. The WorldMap IS the network view. |
| 2 | Free zone auto-detection | **Auto-indicate** — free zones visually marked with subtle background shading before professor interacts. |
| 3 | Gate visual language | Use plain labels: **AND** ("All required"), **OR** ("Any one"), **BRANCH** ("Choose branch"). No logic gate symbols. |
| 4 | Cross-course boundaries | **Group boundary** as default (courses are Groups with in/out ports). Visual separator line as toggleable alternative. |
| 5 | Bus rendering | **Demoted to visual-only mock** — static progress indicator for professor's multi-session overview. Not an interactive primitive. Future: multi-professor coordination dashboard. |
| 6 | Clock granularity | **Professor-defined, manual** divisions (weeks, lectures, or modules). Future: auto-derive from Group structure. |
| 7 | Drag physics | **List-like shift** — other free nodes shift to accommodate the dragged node. No manual spacing. |

### Original 5 (Phase 4 Scope Questions)

| # | Question | Decision |
|---|---|---|
| 8 | Cross-course traversal behavior | **Exit-point model** — cross-course nodes render as visually distinct exit points leading off-canvas. Professor clicks to follow into that course's context. Traversal does not auto-expand into other courses. |
| 9 | Gap detection algorithm | **Direct-only** — a concept is a gap if it has zero direct `applies_in` edges from any Assessment node. No transitive/indirect coverage analysis. Assessment granularity (question-level) deferred to future design. |
| 10 | Problem-First depth limits | **Unbounded + auto-collapse** — full prerequisite chain shown, but nodes past 3 hops auto-collapsed into a Group. Professor can expand to see full depth. |
| 11 | UI interaction model | **Two modes: Author + Presentation.** Author Mode = timeline editor with full editing + analysis tools (Linear/Explore/Problem-First as inspection utilities). Presentation Mode = step through professor's authored path, live branching at Gates, progress bar (✓/◉/○), read-only. ESC to exit. Audience-facing simplified view = future work. |
| 12 | Relationship of 3 traversal strategies to path planning | **Supplementary analysis tools**, not the core workflow. The core is author → present. Linear/Explore/Problem-First are inspection utilities available during authoring. Thesis claims will adapt to implementation reality — design is direction, not contract. |
