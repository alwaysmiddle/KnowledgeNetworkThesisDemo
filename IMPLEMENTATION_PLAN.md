# Multi-Layer Knowledge Graph — Implementation Plan

> **Tech Stack:** React 18 + TypeScript · Vite · ReactFlow (xyflow) · Tailwind CSS v4
> **Target Directory:** `D:/ShiZhong/MyCode/KnowledgeNetworkDemo/`
> **Design Docs:** `D:/ShiZhong/MyCode/KnowledgeNetwork-design-docs/demo-multi-layer-knowledge-graph/`

---

## What We Are Building

A single-page app that renders a multi-layer knowledge graph. One layer is visible at a time as a 2D ReactFlow canvas. Clicking a node drills down to its children in the next layer with a smooth zoom animation. The school system (Departments → Professors → Courses → Students) is the demo domain.

---

## Phase 1 — Frontend MVP (No Database)

All data is hardcoded mock data. Full UI and navigation logic is built and testable without any backend.

---

### Step 1 — Project Scaffold

**Goal:** A running Vite + React + TypeScript app with Tailwind and ReactFlow installed.

**Commands:**
```bash
cd D:/ShiZhong/MyCode/KnowledgeNetworkDemo
npm create vite@latest . -- --template react-ts
npm install
npm install @xyflow/react
npm install -D tailwindcss @tailwindcss/vite
```

**Files to create/edit after scaffold:**
- `vite.config.ts` — add `@tailwindcss/vite` plugin
- `src/index.css` — replace with `@import "tailwindcss";`
- Delete: `src/App.css`, boilerplate in `src/App.tsx`

**Acceptance:** `npm run dev` shows a blank React page at `http://localhost:3000` with no errors.

---

### Step 2 — TypeScript Types

**Goal:** Define all shared types that the entire app depends on.

**File:** `src/types.ts`

```typescript
// Core graph data
export interface KGNode {
  id: string
  label: string
  type: string
  metadata?: Record<string, unknown>
}

export interface KGEdge {
  id: string
  source: string
  target: string
  relationship: string
  inverseRelationship: string
}

export interface KnowledgeGraph {
  nodes: KGNode[]
  edges: KGEdge[]
}

// Layer computation
export type RelationshipChain = string[][]
// e.g. [["teaches", "mentors"], ["enrolled_in"]]

export interface ComputedLayer {
  index: number
  name: string
  nodeIds: string[]
  incomingRelationships: string[]
  outgoingRelationships: string[]
}

// Navigation state
export interface FilterStep {
  layerIndex: number
  nodeId: string
  nodeLabel: string
}

export interface NavigationState {
  currentLayerIndex: number
  filterPath: FilterStep[]
}
```

**Acceptance:** No TypeScript errors in the project.

---

### Step 3 — Mock Data

**Goal:** A realistic hardcoded school graph that exercises all features.

**File:** `src/data/mockGraph.ts`

The mock graph contains:
- 3 Departments (CS, Math, Physics)
- 6 Professors (2 per department, with cross-department collaboration edges)
- 8 Courses (distributed across professors)
- 12 Students (distributed across courses)

Edges use `relationship` / `inverseRelationship` pattern:
```typescript
{ relationship: "teaches", inverseRelationship: "taught_by" }
{ relationship: "enrolled_in", inverseRelationship: "has_enrollment" }
{ relationship: "has_faculty", inverseRelationship: "member_of_faculty" }
{ relationship: "collaborates_with", inverseRelationship: "collaborates_with" }
```

**File:** `src/data/layerConfig.ts`

```typescript
export const SCHOOL_LAYER_NAMES = ["Departments", "Professors", "Courses", "Students"]
export const SCHOOL_RELATIONSHIP_CHAIN: RelationshipChain = [
  ["has_faculty"],
  ["teaches"],
  ["enrolled_in"]
]
```

**Acceptance:** Importing mock data in a component renders a count of nodes and edges with no errors.

---

### Step 4 — Layer Computation Algorithm

**Goal:** A pure function that takes a `KnowledgeGraph` + `RelationshipChain` and returns `ComputedLayer[]`.

**File:** `src/lib/computeLayers.ts`

**Algorithm (Skip mode — first-visit wins):**
```
computeLayers(graph, chain):
  visited = new Set()
  layers = []

  // Layer 0: sources of chain[0] relationships that haven't been visited
  layer0.nodeIds = edges
    .filter(e => chain[0].includes(e.relationship))
    .map(e => e.source)
    .filter(id => !visited.has(id))
  add layer0.nodeIds to visited

  // Layer N: targets of chain[N-1] that haven't been visited
  for i in 1..chain.length:
    layerN.nodeIds = edges
      .filter(e => chain[i-1].includes(e.relationship))
      .map(e => e.target)
      .filter(id => !visited.has(id))
    add layerN.nodeIds to visited

  return layers
```

**File:** `src/lib/filterLayer.ts`

```
filterLayerNodes(graph, layers, currentLayerIndex, filterPath):
  // If filterPath is empty, show all nodes in current layer
  // Otherwise, collect nodeIds reachable from filterPath[-1].nodeId
  //   via the relationship(s) connecting layer[N-1] to layer[N]
  // Returns: KGNode[] (visible nodes) + KGEdge[] (intra-layer edges among them)
```

**Tests (manual):** Verify school graph produces 4 layers with correct node counts.

**Acceptance:** `computeLayers(mockGraph, SCHOOL_CHAIN)` returns:
- Layer 0: 3 nodes (Departments)
- Layer 1: 6 nodes (Professors)
- Layer 2: 8 nodes (Courses)
- Layer 3: 12 nodes (Students)

---

### Step 5 — Auto-Layout Utility

**Goal:** Position nodes on the ReactFlow canvas using a simple grid/circle layout (no external layout library needed for MVP).

**File:** `src/lib/layoutNodes.ts`

**Strategy:** Grid layout for now. Arrange N nodes in a grid with configurable column count and spacing. Returns `{ id, position: { x, y } }[]`.

```
layoutNodes(nodeIds, columns = 4, spacingX = 200, spacingY = 150):
  for each nodeId at index i:
    col = i % columns
    row = Math.floor(i / columns)
    position = { x: col * spacingX, y: row * spacingY }
```

**Future upgrade path:** Swap in `elkjs` or `dagre` for force-directed layout in Phase 3.

**Acceptance:** 8 nodes arranged in a 4×2 grid, no overlaps.

---

### Step 6 — Custom ReactFlow Node Component

**Goal:** A styled node that reflects all interaction states from the design spec.

**File:** `src/components/KGNode.tsx`

**States and visuals:**

| State | Tailwind classes |
|-------|-----------------|
| Default | `bg-white border-2 border-slate-300 rounded-xl shadow-sm` |
| Hover | `scale-105 shadow-md border-blue-400` |
| Selected | `ring-2 ring-blue-500 ring-offset-2 border-blue-500` |
| Has children | small `▼` badge (bottom-right corner) |
| No children | no badge |

Node shape: rounded rectangle, 120×50px, label centered.

**File:** `src/components/KGEdge.tsx`

Custom edge with relationship label displayed on the edge line.

**Acceptance:** Node renders all states visually correctly in a Storybook or inline test page.

---

### Step 7 — Layer Canvas Component

**Goal:** A ReactFlow canvas that renders one layer's nodes and edges.

**File:** `src/components/LayerCanvas.tsx`

```typescript
interface LayerCanvasProps {
  nodes: KGNode[]
  edges: KGEdge[]    // intra-layer edges only
  onNodeClick: (nodeId: string) => void
  onNodeContextMenu: (nodeId: string, position: { x: number, y: number }) => void
}
```

**ReactFlow setup:**
- `nodeTypes={{ kgNode: KGNode }}` — use custom node component
- `edgeTypes={{ kgEdge: KGEdge }}` — use custom edge component
- `fitView` on mount and on node set change
- `panOnScroll` enabled, `zoomOnScroll` enabled
- `minZoom=0.3`, `maxZoom=2`
- Background: subtle dot pattern (`<Background variant="dots" />`)
- MiniMap disabled for now (Phase 3)

**Acceptance:** Renders 6 professor nodes with 2 collaboration edges. Clicking a node calls `onNodeClick`.

---

### Step 8 — Node Context Menu

**Goal:** Right-click or click on a node shows a small popover menu.

**File:** `src/components/NodeContextMenu.tsx`

```typescript
interface NodeContextMenuProps {
  nodeId: string
  nodeLabel: string
  canDrillDown: boolean   // has children in next layer
  canDrillUp: boolean     // not at root layer
  onDrillDown: () => void
  onDrillUp: () => void
  onClose: () => void
  position: { x: number, y: number }
}
```

**Visual:** Small card (Tailwind: `bg-white rounded-lg shadow-xl border border-slate-200 p-2`), two buttons:
- `↓ Drill Down` (disabled + greyed if `canDrillDown=false`)
- `↑ Drill Up` (disabled + greyed if `canDrillUp=false`)

Closes on outside click or `Escape`.

**Acceptance:** Context menu appears at click position, both buttons trigger correct callbacks.

---

### Step 9 — Layer Transition Animation

**Goal:** Smooth animated transition when drilling down/up between layers.

**File:** `src/lib/useLayerTransition.ts` — custom React hook

**Animation sequence (drill down):**
1. `setTransitionState("zooming-out")` — CSS class adds `scale-110 opacity-0 transition-all duration-300`
2. After 300ms: swap nodes/edges data to new layer, call `fitView()`
3. `setTransitionState("zooming-in")` — CSS class adds `scale-95 opacity-0`
4. After 16ms (next frame): `setTransitionState("idle")` — removes transforms, CSS transition animates to `scale-100 opacity-100`

**Implementation:** The hook returns `{ transitionState, triggerTransition }`. The `LayerCanvas` wrapper div applies CSS classes based on `transitionState`.

No ReactFlow viewport manipulation needed for the MVP — CSS transitions on the canvas container are sufficient and simpler.

**Acceptance:** Drilling down shows a visible fade+scale transition (~300ms total).

---

### Step 10 — Breadcrumb Component

**Goal:** Displays the filter path taken and allows clicking back to any ancestor.

**File:** `src/components/Breadcrumb.tsx`

```typescript
interface BreadcrumbProps {
  filterPath: FilterStep[]
  layerNames: string[]
  onNavigateTo: (stepIndex: number) => void
}
```

**Visual:**
```
[Departments] > [CS] > [Prof. A] > Courses (current)
```
- Past steps: clickable links (blue, underline on hover)
- Current layer name: non-clickable, bold
- Separator: `>`
- Root (index 0): always visible as "All [LayerName]"

**Acceptance:** Clicking a breadcrumb step navigates back to that filter level.

---

### Step 11 — Main App State & Wiring

**Goal:** Wire all components together into a working navigable app.

**File:** `src/App.tsx`

**State:**
```typescript
const [navigationState, setNavigationState] = useState<NavigationState>({
  currentLayerIndex: 0,
  filterPath: []
})
const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
```

**Layout (Tailwind):**
```
<div class="flex flex-col h-screen bg-slate-50">
  <header class="h-14 px-4 flex items-center border-b bg-white shadow-sm">
    <h1>Knowledge Graph Demo</h1>
  </header>
  <div class="px-4 py-2 border-b bg-white">
    <Breadcrumb ... />
  </div>
  <main class="flex-1 relative overflow-hidden">
    <LayerCanvas ... />
    {contextMenu && <NodeContextMenu ... />}
  </main>
  <footer class="h-10 px-4 flex items-center border-t bg-white text-sm text-slate-400">
    Layer {N+1} of {total} · {visibleNodes.length} nodes
  </footer>
</div>
```

**Drill-down logic:**
```
handleDrillDown(nodeId):
  newFilterPath = [...filterPath, { layerIndex: current, nodeId, nodeLabel }]
  triggerTransition("down", () => setNavigationState({
    currentLayerIndex: current + 1,
    filterPath: newFilterPath
  }))
```

**Acceptance:** Full navigation flow: Departments → click CS → Professors filtered to CS → click Prof A → Courses filtered to Prof A's courses. Breadcrumbs update correctly. Back navigation works.

---

### Step 12 — Layer Info Footer Bar

**Goal:** Persistent bottom bar showing current layer context.

**File:** Inline in `src/App.tsx` (no separate component needed).

Content:
- Layer name (e.g., "Professors")
- Node count (e.g., "3 nodes")
- Active filter (e.g., "filtered by: CS Department")
- ← Back button (disabled at root layer)

**Acceptance:** Footer reflects current layer state on every navigation.

---

## Phase 1 Done — Acceptance Criteria

- [ ] App loads at `http://localhost:3000` showing Department layer (3 nodes)
- [ ] Clicking a Department node shows context menu with "Drill Down" enabled
- [ ] Drilling down shows filtered Professor layer with smooth animation
- [ ] Breadcrumb shows `Departments > CS`
- [ ] Clicking breadcrumb navigates back correctly
- [ ] Back button in footer works
- [ ] Intra-layer edges visible (e.g., professor collaborations)
- [ ] No TypeScript errors, no console errors

---

## Phase 2 — Neo4j Integration

> Prerequisites: Docker Desktop running on Windows

### Step 13 — Docker + Neo4j Setup

**Files to create:**
- `docker-compose.yml` — Neo4j 5.x, ports 7474 (HTTP) + 7687 (Bolt), volume mount
- `setup.ps1` — orchestrates Docker, npm install, seed, dev server start

**`docker-compose.yml` key config:**
```yaml
services:
  neo4j:
    image: neo4j:5
    ports:
      - "7474:7474"
      - "7687:7687"
    environment:
      NEO4J_AUTH: neo4j/password
    volumes:
      - neo4j_data:/data
```

### Step 14 — Seed Data

**File:** `seed/seed.cypher`

Cypher that creates:
1. Ontology nodes (`NodeType`, `RelDef` with FROM_TYPE/TO_TYPE relationships)
2. Data nodes (Departments, Professors, Courses, Students)
3. Data edges (TEACHES, HAS_FACULTY, ENROLLED_IN, COLLABORATES_WITH)

Mirror the hardcoded `mockGraph.ts` data exactly.

**Execution via setup.ps1:** `docker exec -it neo4j cypher-shell -u neo4j -p password -f /seed.cypher`

### Step 15 — Neo4j Service Layer

**File:** `src/services/neo4jService.ts`

```typescript
import neo4j from 'neo4j-driver'

export async function fetchGraph(): Promise<KnowledgeGraph>
export async function fetchLayers(chain: RelationshipChain): Promise<ComputedLayer[]>
export async function fetchFilteredLayer(layerIndex: number, filterPath: FilterStep[]): Promise<{ nodes: KGNode[], edges: KGEdge[] }>
```

Replace `mockGraph.ts` usage with service calls. Add loading states to `App.tsx`.

### Step 16 — Ontology Query Layer

**File:** `src/services/ontologyService.ts`

```typescript
export async function getNodeTypes(): Promise<string[]>
export async function getRelationshipsFrom(nodeType: string): Promise<RelDef[]>
export async function getRelationshipsByCategory(category: string): Promise<string[]>
```

Used by the relationship chain builder (Phase 2 UI).

### Step 17 — Relationship Chain Builder UI

**File:** `src/components/ChainBuilder.tsx`

Interactive panel where user:
1. Selects starting node type
2. Picks relationships to next layer (guided by ontology)
3. Adds more steps
4. Saves named configuration

---

## Phase 3 — Enhancements

### Step 18 — Force-Directed Layout

Replace grid layout in `layoutNodes.ts` with `elkjs` layout engine:
```bash
npm install elkjs
```
Use `ELK_LAYERED` or `ELK_FORCE` algorithm. Keeps layout stable between layer transitions.

### Step 19 — Mini-Map Overview

Add ReactFlow `<MiniMap>` component styled to match the reference image. Show all layers as small thumbnails. Click to jump layers.

### Step 20 — Search Within Layer

Add search input in header. Highlights matching nodes, dims others. Clear on layer transition.

### Step 21 — Skip / Duplicate Mode Toggle

Add toggle button to switch between Skip and Duplicate cycle handling modes (per design doc). Recomputes layers on toggle.

---

## File Structure (End of Phase 1)

```
KnowledgeNetworkDemo/
├── IMPLEMENTATION_PLAN.md       ← this file
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx                  ← main state + layout
    ├── index.css                ← tailwind import
    ├── types.ts                 ← all shared types
    ├── data/
    │   ├── mockGraph.ts         ← hardcoded school graph
    │   └── layerConfig.ts       ← relationship chain + layer names
    ├── lib/
    │   ├── computeLayers.ts     ← layer computation algorithm
    │   ├── filterLayer.ts       ← filter nodes by drill-down path
    │   ├── layoutNodes.ts       ← grid layout for ReactFlow nodes
    │   └── useLayerTransition.ts ← animation hook
    └── components/
        ├── KGNode.tsx           ← custom ReactFlow node
        ├── KGEdge.tsx           ← custom ReactFlow edge
        ├── LayerCanvas.tsx      ← ReactFlow canvas wrapper
        ├── NodeContextMenu.tsx  ← drill down/up popover
        └── Breadcrumb.tsx       ← navigation trail
```

---

## Key Decisions Captured Here

| Decision | Choice | Reason |
|----------|--------|--------|
| Cycle handling | Skip (first-visit wins) | Simpler for MVP; toggle in Phase 3 |
| Layout algorithm | Grid layout | No dependencies; swap to elkjs in Phase 3 |
| Layer transition | CSS transitions on container | No ReactFlow viewport hacks needed |
| Context menu trigger | Left click on node | Simpler than right-click on touch |
| Data for Phase 1 | Hardcoded mock | Test all UI without Neo4j |
| Edge display | Forward direction only | Cleaner; inverse toggle in Phase 3 |

---

## Dependencies Summary

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "@xyflow/react": "^12"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^4",
    "@tailwindcss/vite": "^4"
  }
}
```

Phase 2 adds: `neo4j-driver`
Phase 3 adds: `elkjs`
