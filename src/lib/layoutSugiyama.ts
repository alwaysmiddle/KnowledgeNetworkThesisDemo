import dagre from '@dagrejs/dagre'
import type { KnowledgeGraph } from '../types'

const RANKING_RELATIONSHIPS = new Set([
  'has_faculty', 'teaches', 'has_enrollment',
  'has_subtopic', 'prerequisite_of',
  'A', 'B', 'C', 'D', 'F',
])

export function layoutSugiyama(graph: KnowledgeGraph): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 90, nodesep: 18, marginx: 60, marginy: 60 })

  graph.nodes.forEach(n => g.setNode(n.id, { width: 120, height: 50 }))

  graph.edges
    .filter(e => RANKING_RELATIONSHIPS.has(e.relationship))
    .forEach(e => {
      if (!g.hasEdge(e.source, e.target)) g.setEdge(e.source, e.target)
    })

  dagre.layout(g)

  return Object.fromEntries(
    graph.nodes.map(n => {
      const pos = g.node(n.id)
      return [n.id, { x: (pos?.x ?? 0) - 60, y: (pos?.y ?? 0) - 25 }]
    })
  )
}
