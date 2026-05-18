import { useMemo, useState, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
} from '@xyflow/react'
import type { Node, Edge, NodeMouseHandler } from '@xyflow/react'

import { KGNodeComponent } from './KGNode'
import type { KGNodeData } from './KGNode'
import { KGEdgeComponent } from './KGEdge'
import { layoutNodes } from '../lib/layoutNodes'
import { layoutLayerElk } from '../lib/layoutElk'
import type { KGNode, KGEdge } from '../types'

// Defined outside component to keep references stable across renders
const nodeTypes = { kgNode: KGNodeComponent }
const edgeTypes = { kgEdge: KGEdgeComponent }

interface LayerCanvasProps {
  nodes: KGNode[]
  edges: KGEdge[]
  hasChildrenIds?: Set<string>
  layerIndex?: number
  onNodeClick: (nodeId: string) => void
  onNodeContextMenu: (nodeId: string, position: { x: number; y: number }) => void
}

export function LayerCanvas({
  nodes,
  edges,
  hasChildrenIds = new Set(),
  layerIndex,
  onNodeClick,
  onNodeContextMenu,
}: LayerCanvasProps) {
  // Immediate grid positions — shown instantly as ELK computes
  const gridPositionMap = useMemo(() => {
    const positions = layoutNodes(nodes.map(n => n.id))
    return Object.fromEntries(positions.map(p => [p.id, p.position]))
  }, [nodes])

  // ELK positions — replace grid once the async layout resolves
  const [elkPositionMap, setElkPositionMap] = useState<Record<string, { x: number; y: number }>>({})

  useEffect(() => {
    setElkPositionMap({}) // clear stale positions immediately on layer change
    layoutLayerElk(nodes, edges).then(setElkPositionMap)
  }, [nodes, edges])

  const positionMap = Object.keys(elkPositionMap).length > 0 ? elkPositionMap : gridPositionMap

  const rfNodes: Node<KGNodeData>[] = useMemo(
    () =>
      nodes.map(n => ({
        id: n.id,
        type: 'kgNode',
        position: positionMap[n.id] ?? { x: 0, y: 0 },
        data: {
          label: n.label,
          nodeType: n.type,
          hasChildren: hasChildrenIds.has(n.id),
          layerIndex,
        },
      })),
    [nodes, positionMap, hasChildrenIds, layerIndex]
  )

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'kgEdge',
        data: { relationship: e.relationship },
      })),
    [edges]
  )

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    onNodeClick(node.id)
  }

  const handleNodeContextMenu: NodeMouseHandler = (event, node) => {
    event.preventDefault()
    onNodeContextMenu(node.id, { x: event.clientX, y: event.clientY })
  }

  // key tied to node ids so ReactFlow remounts (and re-fitViews) when the layer changes
  const canvasKey = nodes.map(n => n.id).join(',')

  return (
    <ReactFlow
      key={canvasKey}
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeClick={handleNodeClick}
      onNodeContextMenu={handleNodeContextMenu}
      fitView
      minZoom={0.3}
      maxZoom={2}
      panOnScroll
      zoomOnScroll
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#cbd5e1" />
    </ReactFlow>
  )
}
