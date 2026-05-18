import type { KnowledgeGraph, RelationshipChain, ComputedLayer } from '../types'

export function computeLayers(
  graph: KnowledgeGraph,
  chain: RelationshipChain,
  layerNames: string[]
): ComputedLayer[] {
  const visited = new Set<string>()
  const layers: ComputedLayer[] = []

  // Layer 0: sources of chain[0] relationships not yet visited
  const layer0Rels = chain[0]
  const layer0Ids = [
    ...new Set(
      graph.edges
        .filter(e => layer0Rels.includes(e.relationship))
        .map(e => e.source)
        .filter(id => !visited.has(id))
    ),
  ]
  layer0Ids.forEach(id => visited.add(id))

  layers.push({
    index: 0,
    name: layerNames[0] ?? 'Layer 0',
    nodeIds: layer0Ids,
    incomingRelationships: [],
    outgoingRelationships: layer0Rels,
  })

  // Layers 1..N: targets of chain[i-1] not yet visited
  for (let i = 1; i <= chain.length; i++) {
    const prevRels = chain[i - 1]
    const layerIds = [
      ...new Set(
        graph.edges
          .filter(e => prevRels.includes(e.relationship))
          .map(e => e.target)
          .filter(id => !visited.has(id))
      ),
    ]
    layerIds.forEach(id => visited.add(id))

    layers.push({
      index: i,
      name: layerNames[i] ?? `Layer ${i}`,
      nodeIds: layerIds,
      incomingRelationships: prevRels,
      outgoingRelationships: i < chain.length ? chain[i] : [],
    })
  }

  return layers
}
