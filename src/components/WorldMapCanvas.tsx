import { useMemo, useState, useEffect } from 'react'
import { ReactFlow, Background, BackgroundVariant } from '@xyflow/react'
import type { Node, Edge, NodeMouseHandler } from '@xyflow/react'

import { KGNodeComponent } from './KGNode'
import type { KGNodeData } from './KGNode'
import { KGEdgeComponent } from './KGEdge'
import { layoutWorldMapDagre } from '../lib/layoutWorldMapDagre'
import { layoutSugiyama } from '../lib/layoutSugiyama'
import { layoutWorldMapElk } from '../lib/layoutElk'
import { detectCommunitiesLouvain } from '../lib/detectCommunitiesLouvain'
import type { KnowledgeGraph, ComputedLayer } from '../types'

// Stable references — must be outside component
const nodeTypes = { kgNode: KGNodeComponent }
const edgeTypes = { kgEdge: KGEdgeComponent }

const LAYER_BADGE_COLORS = [
  'bg-blue-100 text-blue-700 border-blue-300',
  'bg-emerald-100 text-emerald-700 border-emerald-300',
  'bg-amber-100 text-amber-700 border-amber-300',
  'bg-violet-100 text-violet-700 border-violet-300',
  'bg-rose-100 text-rose-700 border-rose-300',
]

const CLUSTER_COLORS = [
  'border-sky-400 bg-sky-50 text-sky-800',
  'border-teal-400 bg-teal-50 text-teal-800',
  'border-orange-400 bg-orange-50 text-orange-800',
  'border-pink-400 bg-pink-50 text-pink-800',
  'border-indigo-400 bg-indigo-50 text-indigo-800',
]

const CLUSTER_BADGE_COLORS = [
  'bg-sky-100 text-sky-700 border-sky-300',
  'bg-teal-100 text-teal-700 border-teal-300',
  'bg-orange-100 text-orange-700 border-orange-300',
  'bg-pink-100 text-pink-700 border-pink-300',
  'bg-indigo-100 text-indigo-700 border-indigo-300',
]

interface WorldMapCanvasProps {
  graph: KnowledgeGraph
  layers: ComputedLayer[]
  layerNames: string[]
  visibleNodeIds: Set<string>
  onNodeClick: (nodeId: string) => void
}

export function WorldMapCanvas({
  graph,
  layers,
  layerNames,
  visibleNodeIds,
  onNodeClick,
}: WorldMapCanvasProps) {
  const [viewMode, setViewMode] = useState<'hierarchy' | 'elk' | 'sugiyama' | 'cluster'>('hierarchy')

  // --- Hierarchy mode ---
  const positionMap = useMemo(() => {
    const positions = layoutWorldMapDagre(graph, layers)
    return Object.fromEntries(positions.map(p => [p.id, p.position]))
  }, [graph, layers])

  // --- ELK Layered mode ---
  const [elkPositionMap, setElkPositionMap] = useState<Record<string, { x: number; y: number }>>({})

  useEffect(() => {
    if (viewMode !== 'elk') return
    layoutWorldMapElk(graph, layers).then(setElkPositionMap)
  }, [viewMode, graph, layers])

  // --- Sugiyama mode ---
  const sugiyamaPositionMap = useMemo(() => layoutSugiyama(graph), [graph])

  const drillRelationships = useMemo(
    () => new Set(layers.flatMap(l => l.outgoingRelationships)),
    [layers]
  )
  const hasChildrenIds = useMemo(
    () => new Set(graph.edges.filter(e => drillRelationships.has(e.relationship)).map(e => e.source)),
    [graph.edges, drillRelationships]
  )

  const nodeLayerIndex = useMemo(() => {
    const map: Record<string, number> = {}
    layers.forEach((layer, i) => layer.nodeIds.forEach(id => { map[id] = i }))
    return map
  }, [layers])

  // --- Cluster mode ---
  const louvainResult = useMemo(() => detectCommunitiesLouvain(graph), [graph])

  const clusterPositionMap = useMemo(() => {
    if (viewMode !== 'cluster') return {}
    const groups: Record<number, string[]> = {}
    Object.entries(louvainResult.communityMap).forEach(([id, cid]) => {
      if (!groups[cid]) groups[cid] = []
      groups[cid].push(id)
    })
    const N = Object.keys(groups).length
    const positions: Record<string, { x: number; y: number }> = {}

    const ARC_PER_NODE = 130
    const subRadii = Object.values(groups).map(nodeIds =>
      Math.max((nodeIds.length * ARC_PER_NODE) / (2 * Math.PI), 100)
    )
    const maxSubR = Math.max(...subRadii)
    const MAIN_R = N < 2 ? 0 : (maxSubR + 60) / Math.sin(Math.PI / N)
    const CENTER = { x: MAIN_R + 150, y: MAIN_R + 100 }

    Object.entries(groups).forEach(([, nodeIds], i) => {
      const clusterAngle = (2 * Math.PI / N) * i - Math.PI / 2
      const cx = N < 2 ? CENTER.x : CENTER.x + MAIN_R * Math.cos(clusterAngle)
      const cy = N < 2 ? CENTER.y : CENTER.y + MAIN_R * Math.sin(clusterAngle)
      const SUB_R = subRadii[i]
      nodeIds.forEach((id, j) => {
        const a = (2 * Math.PI / nodeIds.length) * j - Math.PI / 2
        positions[id] = { x: cx + SUB_R * Math.cos(a) - 60, y: cy + SUB_R * Math.sin(a) - 25 }
      })
    })
    return positions
  }, [viewMode, louvainResult])

  // --- Build rfNodes based on current mode ---
  const rfNodes: Node<KGNodeData>[] = useMemo(() => {
    if (viewMode === 'elk') {
      return graph.nodes
        .filter(n => nodeLayerIndex[n.id] !== undefined)
        .map(n => ({
          id: n.id,
          type: 'kgNode',
          position: elkPositionMap[n.id] ?? { x: 0, y: 0 },
          data: {
            label: n.label,
            nodeType: n.type,
            hasChildren: hasChildrenIds.has(n.id),
            layerIndex: nodeLayerIndex[n.id],
            dimmed: visibleNodeIds.size > 0 && !visibleNodeIds.has(n.id),
          },
        }))
    }
    if (viewMode === 'hierarchy') {
      return graph.nodes
        .filter(n => nodeLayerIndex[n.id] !== undefined)
        .map(n => ({
          id: n.id,
          type: 'kgNode',
          position: positionMap[n.id] ?? { x: 0, y: 0 },
          data: {
            label: n.label,
            nodeType: n.type,
            hasChildren: hasChildrenIds.has(n.id),
            layerIndex: nodeLayerIndex[n.id],
            dimmed: visibleNodeIds.size > 0 && !visibleNodeIds.has(n.id),
          },
        }))
    }
    if (viewMode === 'sugiyama') {
      return graph.nodes.map(n => ({
        id: n.id,
        type: 'kgNode',
        position: sugiyamaPositionMap[n.id] ?? { x: 0, y: 0 },
        data: {
          label: n.label,
          nodeType: n.type,
          hasChildren: hasChildrenIds.has(n.id),
          layerIndex: nodeLayerIndex[n.id],
          dimmed: visibleNodeIds.size > 0 && !visibleNodeIds.has(n.id),
        },
      }))
    }
    // cluster mode — all nodes, colored by community
    return graph.nodes.map(n => ({
      id: n.id,
      type: 'kgNode',
      position: clusterPositionMap[n.id] ?? { x: 0, y: 0 },
      data: {
        label: n.label,
        nodeType: n.type,
        hasChildren: false,
        clusterColor: CLUSTER_COLORS[louvainResult.communityMap[n.id] % CLUSTER_COLORS.length],
        dimmed: visibleNodeIds.size > 0 && !visibleNodeIds.has(n.id),
      },
    }))
  }, [viewMode, graph.nodes, positionMap, elkPositionMap, sugiyamaPositionMap, hasChildrenIds, nodeLayerIndex, visibleNodeIds, clusterPositionMap, louvainResult])

  const rfEdges: Edge[] = useMemo(
    () =>
      graph.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'kgEdge',
        data: { relationship: e.relationship },
      })),
    [graph.edges]
  )

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    onNodeClick(node.id)
  }

  const legendItems = viewMode === 'cluster'
    ? louvainResult.communityLabels.map((name, i) => ({ name, colorClass: CLUSTER_BADGE_COLORS[i % CLUSTER_BADGE_COLORS.length] }))
    : layerNames.map((name, i) => ({ name, colorClass: LAYER_BADGE_COLORS[i] ?? 'bg-slate-100 text-slate-600 border-slate-300' }))

  return (
    <div className="relative w-full h-full">
      {/* Legend — static overlay at top of pane */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex gap-2 pointer-events-none">
        {legendItems.map(({ name, colorClass }) => (
          <span
            key={name}
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}
          >
            {name}
          </span>
        ))}
      </div>

      {/* View mode tabs */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        {(['hierarchy', 'elk', 'sugiyama', 'cluster'] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`text-[11px] px-3 py-0.5 rounded-full border capitalize transition-colors ${
              viewMode === mode
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <ReactFlow
        key={viewMode}
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={handleNodeClick}
        fitView
        minZoom={0.1}
        maxZoom={2}
        panOnScroll
        zoomOnScroll
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
      </ReactFlow>
    </div>
  )
}
