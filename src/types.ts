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
