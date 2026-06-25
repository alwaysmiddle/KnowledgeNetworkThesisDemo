// Spike: the unified ("weak reflexive") node model.
// Everything is a KNode. A slide is a node. A group is a node. Even the root
// is a node. Containment is the UP-link `parentId`, so a node's children are
// "all nodes whose parentId === this.id" (derived, never stored twice).
//
// This file mocks 2 layers of containment so we can study how it feels:
//   root ─┬─ s1..s4            (layer 1: top-level slides)
//         └─ g1 ─┬─ s5         (layer 2: slides inside a group)
//                └─ s6

export type NodeKind = 'slide' | 'group'

export interface KNode {
  id: string
  kind: NodeKind
  parentId: string | null // null ONLY for root — every other node defaults to root
  title: string
  content?: string // slides carry body text; groups usually omit it
  collapsed?: boolean // groups only: frontend view state, not domain truth
}

// Edges live in their own flat array — an edge belongs to two nodes, so it
// hangs off neither.
export interface KEdge {
  id: string
  source: string
  target: string
}

export const nodes: KNode[] = [
  // Root is just another node. That is the whole point of "reflexive".
  { id: 'root', kind: 'group', parentId: null, title: 'Intro to Graphs (deck)' },

  // Layer 1 — direct children of root.
  { id: 's1', kind: 'slide', parentId: 'root', title: 'Intro to Graphs', content: 'Course overview and goals' },
  { id: 's2', kind: 'slide', parentId: 'root', title: 'What is a Graph?', content: 'A set of things and the links between them' },
  { id: 's3', kind: 'slide', parentId: 'root', title: 'Nodes & Edges', content: 'Vertices hold data, edges hold relationships' },
  { id: 's4', kind: 'slide', parentId: 'root', title: 'Directed vs Undirected', content: 'Do the links point one way or both?' },
  { id: 'g1', kind: 'group', parentId: 'root', title: 'Traversal', collapsed: false },

  // Layer 2 — children of the group g1.
  { id: 's5', kind: 'slide', parentId: 'g1', title: 'Traversal: BFS', content: 'Explore level by level' },
  { id: 's6', kind: 'slide', parentId: 'g1', title: 'Traversal: DFS', content: 'Explore as deep as possible first' },
]

export const edges: KEdge[] = [
  { id: 'e1', source: 's2', target: 's3' },
  { id: 'e2', source: 's3', target: 's4' },
  { id: 'e3', source: 's4', target: 's5' },
  { id: 'e4', source: 's5', target: 's6' },
]

// Positions stay a separate map keyed by node id — layout is its own concern,
// kept out of the model so a layout pass can own it later.
// Top-level slides on one row; the group g1 sits below with its two children
// placed INSIDE its box (so their position relative to g1 is positive — the
// container clamps children to its own bounds via extent:'parent').
export const initialPositions: Record<string, { x: number; y: number }> = {
  s1: { x: 80, y: 80 },
  s2: { x: 320, y: 80 },
  s3: { x: 560, y: 80 },
  s4: { x: 800, y: 80 },
  g1: { x: 300, y: 260 }, // container top-left
  s5: { x: 332, y: 320 }, // relative to g1 ≈ (32, 60)
  s6: { x: 520, y: 320 }, // relative to g1 ≈ (220, 60)
}

// Helper the canvas will lean on constantly: a node's direct children.
export const childrenOf = (id: string): KNode[] => nodes.filter((n) => n.parentId === id)
