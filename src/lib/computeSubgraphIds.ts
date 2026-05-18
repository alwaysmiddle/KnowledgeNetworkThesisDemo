import type { KnowledgeGraph, ComputedLayer, FilterStep, KGNode } from '../types'

/**
 * Returns the set of node IDs that should be "lit up" in the world map:
 *   - ancestor nodes from the filter path (nodes drilled through to get here)
 *   - current layer's visible nodes
 *   - all descendants reachable by traversing remaining layers downward
 *
 * When no filter is active (filterPath empty, all nodes visible), the traversal
 * reaches every node in the graph so nothing is dimmed.
 */
export function computeSubgraphIds(
  graph: KnowledgeGraph,
  layers: ComputedLayer[],
  currentLayerIndex: number,
  filterPath: FilterStep[],
  currentVisibleNodes: KGNode[]
): Set<string> {
  const result = new Set<string>()

  // Ancestors — nodes clicked through to arrive at current layer
  filterPath.forEach(step => result.add(step.nodeId))

  // Current layer — whatever filterLayer() returned
  const currentIds = currentVisibleNodes.map(n => n.id)
  currentIds.forEach(id => result.add(id))

  // Descendants — traverse remaining layers using each layer's incomingRelationships
  let seedIds = new Set(currentIds)

  for (let i = currentLayerIndex + 1; i < layers.length; i++) {
    const layer = layers[i]
    const rels = layer.incomingRelationships
    const layerNodeSet = new Set(layer.nodeIds)

    const nextIds = new Set(
      graph.edges
        .filter(e => rels.includes(e.relationship) && seedIds.has(e.source))
        .map(e => e.target)
        .filter(id => layerNodeSet.has(id))
    )

    nextIds.forEach(id => result.add(id))
    seedIds = nextIds
  }

  return result
}
