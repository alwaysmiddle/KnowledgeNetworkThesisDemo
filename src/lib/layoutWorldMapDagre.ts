import dagre from '@dagrejs/dagre'
import type { KnowledgeGraph, ComputedLayer } from '../types'
import type { NodePosition } from './layoutNodes'

const NODE_WIDTH = 120
const NODE_HEIGHT = 50

/**
 * Lays out all nodes using Dagre's ranked graph algorithm (left-to-right).
 *
 * Only layer-connecting edges (has_faculty, teaches, has_enrollment, grade A/B/C/D/F)
 * are fed to Dagre for rank/position computation. Intra-layer edges (prerequisite_of,
 * related_to, collaborates_with, has_subtopic) are excluded — they would confuse
 * rank assignment and scatter nodes that belong to the same column.
 *
 * The result: nodes connected to the same parent cluster together naturally,
 * e.g. CS professors group near the CS department node.
 */
export function layoutWorldMapDagre(
  graph: KnowledgeGraph,
  layers: ComputedLayer[]
): NodePosition[] {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: 'LR',
    ranksep: 220,  // horizontal gap between layers
    nodesep: 30,   // vertical gap between sibling nodes
    marginx: 40,
    marginy: 40,
  })

  // Register every node that belongs to a layer
  const layerNodeSet = new Set(layers.flatMap(l => l.nodeIds))
  graph.nodes
    .filter(n => layerNodeSet.has(n.id))
    .forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))

  // Only add edges that connect nodes across layers (structural hierarchy edges)
  // Intra-layer edges (prerequisite_of, related_to, collaborates_with, has_subtopic)
  // are intentionally excluded from layout computation.
  const layerRelationships = new Set(layers.flatMap(l => l.outgoingRelationships))

  graph.edges
    .filter(e => layerRelationships.has(e.relationship))
    .forEach(e => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return graph.nodes
    .filter(n => layerNodeSet.has(n.id))
    .map(n => {
      const pos = g.node(n.id)
      return {
        id: n.id,
        position: {
          x: pos.x - NODE_WIDTH / 2,
          y: pos.y - NODE_HEIGHT / 2,
        },
      }
    })
}
