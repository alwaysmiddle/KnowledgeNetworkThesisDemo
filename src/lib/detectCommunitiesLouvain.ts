import Graph from 'graphology'
import louvain from 'graphology-communities-louvain'
import type { KnowledgeGraph } from '../types'

export interface LouvainResult {
  communityMap: Record<string, number>   // nodeId → communityId
  communityLabels: string[]              // label per communityId (from Dept node)
  count: number
}

export function detectCommunitiesLouvain(graph: KnowledgeGraph): LouvainResult {
  const g = new Graph({ type: 'undirected', multi: false, allowSelfLoops: false })
  graph.nodes.forEach(n => g.addNode(n.id))
  graph.edges.forEach(e => {
    if (!g.hasEdge(e.source, e.target)) g.addEdge(e.source, e.target)
  })

  const communityMap = louvain(g)  // { nodeId: communityId }
  const count = new Set(Object.values(communityMap)).size

  // Infer label from the Department node in each community
  const communityLabels: string[] = Array(count).fill('')
  graph.nodes.forEach(n => {
    if (n.type === 'Department') {
      const cid = communityMap[n.id]
      if (cid !== undefined) communityLabels[cid] = n.label
    }
  })
  communityLabels.forEach((l, i) => {
    if (!l) communityLabels[i] = `Cluster ${i}`
  })

  return { communityMap, communityLabels, count }
}
