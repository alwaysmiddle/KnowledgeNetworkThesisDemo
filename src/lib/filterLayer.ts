import type { KnowledgeGraph, KGNode, KGEdge, ComputedLayer, FilterStep } from '../types'

export interface FilteredLayer {
  nodes: KGNode[]
  edges: KGEdge[]
}

export function filterLayer(
  graph: KnowledgeGraph,
  layers: ComputedLayer[],
  currentLayerIndex: number,
  filterPath: FilterStep[]
): FilteredLayer {
  const currentLayer = layers[currentLayerIndex]
  if (!currentLayer) return { nodes: [], edges: [] }

  let visibleNodeIds: Set<string>

  if (filterPath.length === 0) {
    // No filter — show all nodes in this layer
    visibleNodeIds = new Set(currentLayer.nodeIds)
  } else {
    // Collect nodes reachable from the last filter step via the incoming relationships
    const lastStep = filterPath[filterPath.length - 1]
    const incomingRels = currentLayer.incomingRelationships

    const reachable = graph.edges
      .filter(e => incomingRels.includes(e.relationship) && e.source === lastStep.nodeId)
      .map(e => e.target)
      .filter(id => currentLayer.nodeIds.includes(id))

    visibleNodeIds = new Set(reachable)
  }

  const nodes = graph.nodes.filter(n => visibleNodeIds.has(n.id))

  // Intra-layer edges: both endpoints in the visible set
  const edges = graph.edges.filter(
    e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  )

  return { nodes, edges }
}
