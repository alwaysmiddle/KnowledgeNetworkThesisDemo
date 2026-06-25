import { useCallback, useMemo, useState } from 'react'
import { ReactFlow, Background, Controls } from '@xyflow/react'
import type { Node, Edge, NodeChange, NodeProps } from '@xyflow/react'

import { nodes as initialNodes, edges, initialPositions } from './data/nodes'
import type { KNode } from './data/nodes'

// ── Layout constants ────────────────────────────────────────────────────────
const NODE_W = 180
const NODE_H = 72
const PAD = 28 // breathing room around children inside a container
const HEADER = 36 // space at the top of a container for its title
const ROOT_ID = 'root'

type XY = { x: number; y: number }

// ── Custom node renderers ───────────────────────────────────────────────────
function SlideNode({ data, selected }: NodeProps) {
  const { title, content } = data as { title: string; content: string }
  return (
    <div
      className={[
        'rounded-lg border-2 bg-white shadow-sm px-3 py-2 select-none',
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-300',
      ].join(' ')}
      style={{ width: NODE_W, height: NODE_H }}
    >
      <div className="text-sm font-semibold text-slate-800 truncate">{title}</div>
      <div className="text-xs text-slate-500 leading-tight mt-0.5 line-clamp-2">{content}</div>
    </div>
  )
}

// The expanded group is now a REAL node: a sized container. Its children are
// separate ReactFlow nodes parented to it (extent:'parent'), so they live
// inside its coordinate space and clip to its bounds.
function GroupContainerNode({ data }: NodeProps) {
  const { title, width, height } = data as { title: string; width: number; height: number }
  return (
    <div
      className="rounded-xl border-2 border-violet-400 bg-violet-50/60 shadow-sm"
      style={{ width, height }}
    >
      <div className="px-3 py-1 text-xs font-semibold text-violet-700 border-b border-violet-200/70">
        {title} <span className="opacity-50">· click to collapse</span>
      </div>
    </div>
  )
}

// The collapsed group: one compact card standing in for all its children.
function GroupCollapsedNode({ data, selected }: NodeProps) {
  const { title, count } = data as { title: string; count: number }
  return (
    <div
      className={[
        'rounded-lg border-2 bg-violet-100 shadow-sm px-3 py-2 select-none',
        selected ? 'border-violet-600 ring-2 ring-violet-200' : 'border-violet-400',
      ].join(' ')}
      style={{ width: NODE_W, height: NODE_H }}
    >
      <div className="text-sm font-semibold text-violet-800 truncate">▸ {title}</div>
      <div className="text-xs text-violet-600 mt-0.5">{count} items · click to expand</div>
    </div>
  )
}

const nodeTypes = {
  slide: SlideNode,
  groupContainer: GroupContainerNode,
  groupCollapsed: GroupCollapsedNode,
}

function App() {
  // The whole tree is one flat list of nodes. Containment is the up-link
  // `parentId`; a node's children are derived by filtering on it.
  const [nodes, setNodes] = useState<KNode[]>(initialNodes)
  // Positions are stored ABSOLUTE (canvas space). We convert to/from ReactFlow's
  // parent-relative coordinates only at the canvas boundary.
  const [positions, setPositions] = useState<Record<string, XY>>(initialPositions)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Hidden = every descendant of any collapsed group. Recursive: collapsing an
  // outer group also hides things inside an inner one. The collapsed group node
  // ITSELF stays visible (it renders as a card).
  const hiddenIds = useMemo(() => {
    const hidden = new Set<string>()
    const stack: string[] = []
    for (const g of nodes) {
      if (g.kind === 'group' && g.collapsed) {
        for (const c of nodes) if (c.parentId === g.id) stack.push(c.id)
      }
    }
    while (stack.length) {
      const id = stack.pop() as string
      if (hidden.has(id)) continue
      hidden.add(id)
      for (const c of nodes) if (c.parentId === id) stack.push(c.id)
    }
    return hidden
  }, [nodes])

  // ── Derive the ReactFlow node list from the tree ──────────────────────────
  const rfNodes: Node[] = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const out: Node[] = []

    for (const n of nodes) {
      if (n.id === ROOT_ID) continue // root is the implicit canvas, never drawn
      if (hiddenIds.has(n.id)) continue

      // A node's ReactFlow parent is its domain parent UNLESS that parent is
      // root (which isn't rendered) — then it's a free top-level node.
      const rfParent = n.parentId && n.parentId !== ROOT_ID ? n.parentId : undefined
      const abs = positions[n.id] ?? { x: 0, y: 0 }
      const parentAbs = rfParent ? positions[rfParent] ?? { x: 0, y: 0 } : { x: 0, y: 0 }
      const pos = rfParent ? { x: abs.x - parentAbs.x, y: abs.y - parentAbs.y } : abs
      const parentBits = rfParent ? { parentId: rfParent, extent: 'parent' as const } : {}

      if (n.kind === 'group') {
        const kids = nodes.filter((c) => c.parentId === n.id)
        if (n.collapsed) {
          out.push({
            id: n.id,
            type: 'groupCollapsed',
            position: pos,
            ...parentBits,
            data: { title: n.title, count: kids.length },
            selected: selectedIds.has(n.id),
            zIndex: 1,
          })
        } else {
          // Container size hugs its children (relative coords + node size + pad).
          let width = NODE_W + 2 * PAD
          let height = NODE_H + HEADER + PAD
          if (kids.length) {
            const rx = kids.map((k) => (positions[k.id]?.x ?? 0) - abs.x)
            const ry = kids.map((k) => (positions[k.id]?.y ?? 0) - abs.y)
            width = Math.max(...rx) + NODE_W + PAD
            height = Math.max(...ry) + NODE_H + PAD
          }
          out.push({
            id: n.id,
            type: 'groupContainer',
            position: pos,
            ...parentBits,
            data: { title: n.title, width, height },
            selectable: false,
            zIndex: 0,
          })
        }
        continue
      }

      // slide
      out.push({
        id: n.id,
        type: 'slide',
        position: pos,
        ...parentBits,
        data: { title: n.title, content: n.content ?? '' },
        selected: selectedIds.has(n.id),
        zIndex: 1,
      })
    }

    // ReactFlow requires a parent node to appear BEFORE its children. Sort by
    // containment depth so containers always precede what they hold.
    const depth = (id: string): number => {
      let d = 0
      let cur = byId.get(id)
      while (cur && cur.parentId && cur.parentId !== ROOT_ID) {
        d++
        cur = byId.get(cur.parentId)
      }
      return d
    }
    out.sort((a, b) => depth(a.id) - depth(b.id))
    return out
  }, [nodes, positions, selectedIds, hiddenIds])

  const rfEdges: Edge[] = useMemo(
    () =>
      edges
        .filter((e) => !hiddenIds.has(e.source) && !hiddenIds.has(e.target))
        .map((e) => ({ id: e.id, source: e.source, target: e.target })),
    [hiddenIds],
  )

  // ── Interaction handlers ──────────────────────────────────────────────────
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setPositions((prev) => {
        let next = prev
        for (const c of changes) {
          if (c.type !== 'position' || !c.position) continue
          const node = nodes.find((n) => n.id === c.id)
          const rfParent = node?.parentId && node.parentId !== ROOT_ID ? node.parentId : undefined
          // ReactFlow reports a child's position RELATIVE to its parent; add the
          // parent's absolute origin back to recover an absolute position.
          const base = rfParent ? next[rfParent] ?? prev[rfParent] ?? { x: 0, y: 0 } : { x: 0, y: 0 }
          const abs = { x: c.position.x + base.x, y: c.position.y + base.y }

          if (next === prev) next = { ...prev }

          // Dragging a CONTAINER must carry its descendants: ReactFlow only
          // reports the container's own change, so shift every descendant's
          // stored absolute position by the same delta or they snap back.
          if (node?.kind === 'group') {
            const old = next[c.id]
            if (old) {
              const dx = abs.x - old.x
              const dy = abs.y - old.y
              const stack = nodes.filter((n) => n.parentId === c.id).map((n) => n.id)
              while (stack.length) {
                const id = stack.pop() as string
                const p = next[id]
                if (p) next[id] = { x: p.x + dx, y: p.y + dy }
                for (const ch of nodes) if (ch.parentId === id) stack.push(ch.id)
              }
            }
          }
          next[c.id] = abs
        }
        return next
      })

      setSelectedIds((prev) => {
        let changed = false
        const s = new Set(prev)
        for (const c of changes) {
          if (c.type === 'select') {
            changed = true
            if (c.selected) s.add(c.id)
            else s.delete(c.id)
          }
        }
        return changed ? s : prev
      })
    },
    [nodes],
  )

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    if (node.type === 'groupContainer') {
      setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, collapsed: true } : n)))
    } else if (node.type === 'groupCollapsed') {
      setNodes((ns) => ns.map((n) => (n.id === node.id ? { ...n, collapsed: false } : n)))
    }
  }, [])

  // Nodes eligible to be grouped: selected, visible, and not the root.
  const groupableIds = useMemo(
    () => [...selectedIds].filter((id) => id !== ROOT_ID && !hiddenIds.has(id)),
    [selectedIds, hiddenIds],
  )

  const groupSelected = useCallback(() => {
    if (groupableIds.length < 2) return
    const chosen = new Set(groupableIds)
    const newId = `group-${Date.now()}`
    // The new group lands under the parent the first member already had, so
    // grouping doesn't yank nodes out of their level.
    const parentId = nodes.find((n) => chosen.has(n.id))?.parentId ?? ROOT_ID

    setNodes((ns) => {
      // Reparenting IS the grouping: flip parentId on the chosen nodes. No
      // childIds array to maintain — the up-link is the single source of truth.
      const reparented = ns.map((n) => (chosen.has(n.id) ? { ...n, parentId: newId } : n))
      const newGroup: KNode = { id: newId, kind: 'group', parentId, title: 'Group', collapsed: false }
      return [...reparented, newGroup]
    })

    // Park the container's top-left just above-left of its members so each
    // member's position relative to it stays positive (inside the box).
    const pts = [...chosen].map((id) => positions[id]).filter(Boolean) as XY[]
    const minX = Math.min(...pts.map((p) => p.x)) - PAD
    const minY = Math.min(...pts.map((p) => p.y)) - HEADER
    setPositions((prev) => ({ ...prev, [newId]: { x: minX, y: minY } }))
    setSelectedIds(new Set())
  }, [groupableIds, nodes, positions])

  const canGroup = groupableIds.length >= 2

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="h-12 px-4 flex items-center gap-4 border-b bg-white shadow-sm shrink-0">
        <h1 className="text-base font-semibold text-slate-700">Slide Canvas — Container Nodes</h1>
        <button
          onClick={groupSelected}
          disabled={!canGroup}
          className="px-3 py-1 rounded border text-sm transition-colors
            disabled:border-slate-200 disabled:text-slate-300 disabled:cursor-not-allowed
            enabled:border-violet-400 enabled:text-violet-700 enabled:hover:bg-violet-50"
        >
          Group selected{canGroup ? ` (${groupableIds.length})` : ''}
        </button>
        <span className="text-xs text-slate-400">
          Shift-click to multi-select · click a group to collapse / expand
        </span>
      </header>

      <div className="flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          selectionKeyCode="Shift"
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}

export default App
