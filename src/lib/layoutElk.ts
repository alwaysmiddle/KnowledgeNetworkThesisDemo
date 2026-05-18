import ELK from 'elkjs/lib/elk.bundled.js'
import type { KGNode, KGEdge, KnowledgeGraph, ComputedLayer } from '../types'

const elk = new ELK()

const NODE_W = 120
const NODE_H = 50

type PositionMap = Record<string, { x: number; y: number }>

/**
 * ELK_STRESS layout for a single layer's nodes and intra-layer edges.
 * Stress minimization naturally clusters connected nodes and spreads
 * isolated ones — far better than a rigid grid for 3–12 nodes with
 * collaboration / prerequisite edges.
 */
export async function layoutLayerElk(
  nodes: KGNode[],
  edges: KGEdge[]
): Promise<PositionMap> {
  if (nodes.length === 0) return {}
  if (nodes.length === 1) return { [nodes[0].id]: { x: 0, y: 0 } }

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'org.eclipse.elk.stress',
      'elk.stress.desiredEdgeLength': '140',
      'elk.spacing.nodeNode': '80',
      'elk.padding': '[top=40,left=40,bottom=40,right=40]',
    },
    children: nodes.map(n => ({ id: n.id, width: NODE_W, height: NODE_H })),
    edges: edges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  }

  try {
    const laid = await elk.layout(graph)
    return Object.fromEntries(
      (laid.children ?? []).map(n => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }])
    )
  } catch {
    // Fallback: simple grid if ELK fails (e.g. disconnected graph edge case)
    return Object.fromEntries(
      nodes.map((n, i) => [n.id, { x: (i % 4) * 160, y: Math.floor(i / 4) * 100 }])
    )
  }
}

/**
 * ELK_LAYERED layout for the world map overview (all layers, left-to-right).
 * Uses only hierarchy edges (has_faculty, teaches, enrolled_in) for rank
 * computation so nodes stay in their correct columns. Intra-layer edges
 * (collaborates_with, prerequisite_of) are passed as cross-hierarchy edges
 * which ELK routes without disrupting the column structure.
 */
export async function layoutWorldMapElk(
  graph: KnowledgeGraph,
  layers: ComputedLayer[]
): Promise<PositionMap> {
  const layerNodeSet = new Set(layers.flatMap(l => l.nodeIds))
  const layerNodes = graph.nodes.filter(n => layerNodeSet.has(n.id))
  if (layerNodes.length === 0) return {}

  const layerRelationships = new Set(layers.flatMap(l => l.outgoingRelationships))

  // Feed only hierarchy edges to ELK_LAYERED for rank assignment.
  // Intra-layer edges are excluded so they don't pull nodes out of their column.
  const hierarchyEdges = graph.edges.filter(e => layerRelationships.has(e.relationship))

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'org.eclipse.elk.layered',
      'elk.direction': 'RIGHT',
      'elk.layered.spacing.nodeNodeBetweenLayers': '220',
      'elk.spacing.nodeNode': '30',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.padding': '[top=60,left=60,bottom=60,right=60]',
    },
    children: layerNodes.map(n => ({ id: n.id, width: NODE_W, height: NODE_H })),
    edges: hierarchyEdges.map(e => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  }

  try {
    const laid = await elk.layout(elkGraph)
    return Object.fromEntries(
      (laid.children ?? []).map(n => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }])
    )
  } catch {
    return {}
  }
}
