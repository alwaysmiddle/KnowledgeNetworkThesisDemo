// Experiment H — Overview+Detail compound layout (Han, Knauer, Rutter 2024).
// The successor to old A (map) and B (drill), built on their diagnosed
// failures: A's expand-in-place "obscures higher level structure" (the paper
// names this exact defect) and B's drill loses all context. Here the OVERVIEW
// — the domains and their lifted edges — is laid out once and NEVER
// reshapes. Expanding draws the container's internals in a framed panel
// ADJACENT to it; an amber tether ties panel to its collapsed counterpart,
// and "ports" on the panel border keep boundary edges traceable from the
// undistorted overview into the expanded detail.

import { useMemo, useState } from 'react'
import { Background, Controls, ReactFlow } from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'

import { allContainerIds, byId, domainIds, domainOf, DOMAIN_COLOR, leavesUnder, pathTo, ROOT_ID } from './graph'
import { CARD_H, CARD_W, deriveDrill, hiddenIds, liftEdges } from './derive'
import type { LiftedEdge } from './derive'
import { BudgetHud } from './parts'
import { liftedToRfEdge, nodeTypes } from './rf'

// overview: everything collapsed to domain chips → domain↔domain aggregates
const domainLift = liftEdges(hiddenIds(new Set(allContainerIds)))

// overview chips on a pentagon: the domain graph is nearly complete (K5), and
// a ring keeps its edges out of the chip bodies — a stacked column doesn't
const RING_R = 270
const RING_CX = RING_R
const RING_CY = RING_R
const chipPos = (i: number) => {
  const ang = -Math.PI / 2 + (i * 2 * Math.PI) / 5
  return { x: RING_CX + RING_R * Math.cos(ang) - CARD_W / 2, y: RING_CY + RING_R * Math.sin(ang) * 0.88 - CARD_H / 2 }
}

const PANEL_X = RING_CX + RING_R + CARD_W / 2 + 430 // adjacency gutter — ports and connectors live here
const PANEL_PAD = 16
const PANEL_HEADER = 34
const PORT_GAP = 16

type NavDir = 'down' | 'up' | 'left' | 'right'

export interface OverviewDetailViewProps {
  /** leaf to land on: opens its module's panel with the leaf's edges lit */
  initialFocus?: string | null
}

export default function OverviewDetailView({ initialFocus = null }: OverviewDetailViewProps) {
  const [path, setPath] = useState<string[]>(() =>
    initialFocus ? pathTo(byId.get(initialFocus)!.parentId!) : [ROOT_ID],
  )
  const [navDir, setNavDir] = useState<NavDir>('down')
  const [hovered, setHovered] = useState<string | null>(initialFocus)

  const open = path.length > 1
  const model = useMemo(() => (open ? deriveDrill(path) : null), [path, open])

  const navigate = (p: string[], dir: NavDir) => {
    setNavDir(dir)
    setHovered(null)
    setPath(p)
  }

  const panel = useMemo(() => {
    if (!model) return null
    const itemsW = Math.max(...model.items.map((it) => model.itemPos[it.id].x + CARD_W), CARD_W)
    const itemsH = Math.max(...model.items.map((it) => model.itemPos[it.id].y + CARD_H), CARD_H)
    return { w: itemsW + 2 * PANEL_PAD, h: itemsH + PANEL_HEADER + PANEL_PAD }
  }, [model])

  const rfNodes: Node[] = useMemo(() => {
    const out: Node[] = domainIds.map((d, i) => ({
      id: d,
      position: chipPos(i),
      width: CARD_W,
      height: CARD_H,
      draggable: false,
      selectable: false,
      type: 'containerChip',
      data: { title: byId.get(d)!.title, count: leavesUnder(d).length, color: DOMAIN_COLOR[d], active: open && d === path[1] },
    }))

    if (model && panel) {
      const color = DOMAIN_COLOR[path[1]]
      // vertical centering: panel and both port columns share a midline
      const colH = (n: number) => (n === 0 ? 0 : n * CARD_H + (n - 1) * PORT_GAP)
      const totalH = Math.max(panel.h, colH(model.inProxies.length), colH(model.outProxies.length))
      const panelY = (totalH - panel.h) / 2
      out.push({
        id: 'panel',
        position: { x: PANEL_X, y: panelY },
        draggable: false,
        selectable: false,
        type: 'containerBox',
        zIndex: -1,
        data: {
          id: 'panel',
          title: path.slice(1).map((p) => byId.get(p)!.title).join(' › '),
          w: panel.w,
          h: panel.h,
          color,
          onCollapse: () => navigate(path.slice(0, -1), 'up'),
        },
      })
      for (const it of model.items) {
        out.push({
          id: it.id,
          position: { x: PANEL_X + PANEL_PAD + model.itemPos[it.id].x, y: panelY + PANEL_HEADER + model.itemPos[it.id].y },
          width: CARD_W,
          height: CARD_H,
          draggable: false,
          selectable: false,
          type: it.kind === 'container' ? 'containerChip' : 'leafCard',
          data:
            it.kind === 'container'
              ? { title: it.title, count: leavesUnder(it.id).length, color: DOMAIN_COLOR[domainOf(it.id)] }
              : { title: it.title, color: DOMAIN_COLOR[domainOf(it.id)] },
        })
      }
      const portColumn = (ids: string[], dir: 'in' | 'out') =>
        ids.forEach((pid, i) => {
          const crumb = pathTo(pid)
            .slice(1, -1)
            .map((a) => byId.get(a)!.title)
            .join(' › ')
          out.push({
            id: `port:${dir}:${pid}`,
            position: {
              // fully OUTSIDE the panel — flanking columns, not border overlaps
              x: dir === 'in' ? PANEL_X - CARD_W - 36 : PANEL_X + panel.w + 36,
              y: (totalH - colH(ids.length)) / 2 + i * (CARD_H + PORT_GAP),
            },
            width: CARD_W,
            height: CARD_H,
            draggable: false,
            selectable: false,
            type: 'proxyChip',
            data: { title: byId.get(pid)!.title, caption: crumb || 'top level', color: DOMAIN_COLOR[domainOf(pid)], dir },
          })
        })
      portColumn(model.inProxies, 'in')
      portColumn(model.outProxies, 'out')
    }
    return out
  }, [model, panel, path, open])

  const rfEdges: Edge[] = useMemo(() => {
    const emphasis = (l: LiftedEdge) =>
      hovered ? (l.source === hovered || l.target === hovered ? ('hi' as const) : ('lo' as const)) : undefined

    // overview edges stay put; while a panel is open the ones not touching the
    // expanded domain recede — context, not focus
    const overview = domainLift.map((l) =>
      liftedToRfEdge(l, {
        emphasis: hovered
          ? l.source === hovered || l.target === hovered
            ? 'hi'
            : 'lo'
          : open && l.source !== path[1] && l.target !== path[1]
            ? 'dim'
            : undefined,
      }),
    )
    if (!model) return overview

    const out: Edge[] = overview

    // the Han tether: panel ↔ its collapsed counterpart in the overview
    out.push({
      id: 'tether',
      source: path[1],
      target: 'panel',
      type: 'straight',
      style: { stroke: '#f59e0b', strokeWidth: 1.6, strokeDasharray: '7 5', opacity: 0.75 },
    })

    for (const l of model.internal) out.push(liftedToRfEdge(l, { emphasis: emphasis(l) }))

    // boundary edges: port ↔ item (dashed, inside the adjacency gutter)
    for (const p of model.proxyLinks) {
      const portNode = `port:${p.dir}:${p.proxyId}`
      const l: LiftedEdge = {
        id: `P:${p.dir}:${p.proxyId}>${p.itemId}`,
        source: p.dir === 'in' ? portNode : p.itemId,
        target: p.dir === 'in' ? p.itemId : portNode,
        count: p.count,
        types: p.types,
        type: p.type,
      }
      out.push(liftedToRfEdge(l, { dashed: true, emphasis: emphasis(l) }))
    }

    // connectors: overview chip → port, so the path stays traceable from the
    // undistorted overview into the panel (skip ports internal to the
    // expanded domain — their crumb already says where they live)
    const perPort = new Map<string, { count: number; type: LiftedEdge['type'] }>()
    for (const p of model.proxyLinks) {
      const key = `${p.dir}:${p.proxyId}`
      const cur = perPort.get(key)
      perPort.set(key, { count: (cur?.count ?? 0) + p.count, type: cur ? (cur.type === p.type ? cur.type : 'mixed') : p.type })
    }
    for (const [key, agg] of perPort) {
      const [dir, pid] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)]
      const dom = domainOf(pid)
      if (dom === path[1]) continue
      const portNode = `port:${dir}:${pid}`
      const l: LiftedEdge = {
        id: `C:${key}`,
        source: dir === 'in' ? dom : portNode,
        target: dir === 'in' ? portNode : dom,
        count: agg.count,
        types: {},
        type: agg.type,
      }
      out.push(liftedToRfEdge(l, { dashed: true, emphasis: hovered ? 'lo' : 'dim' }))
    }
    return out
  }, [model, hovered, open, path])

  return (
    <div className="relative h-full">
      <div className="absolute top-3 left-3 z-10 rounded-lg bg-white/95 border border-slate-200 shadow-sm px-3 py-2 text-[11px] text-slate-600 max-w-[560px]">
        <div className="font-bold text-slate-800 text-[12px]">Overview+Detail '24 — expand adjacent, never in place</div>
        <div className="mt-0.5">
          The overview never reshapes (old A's failure, named in the paper). Expansion opens a panel beside it, tethered to its
          chip; dashed ports on the panel border carry the boundary edges.
        </div>
        <div className="mt-1 flex items-center gap-1 flex-wrap">
          {path.map((id, i) => (
            <span key={id} className="flex items-center gap-1">
              {i > 0 && <span className="text-slate-300">›</span>}
              <button
                onClick={() => i < path.length - 1 && navigate(path.slice(0, i + 1), 'up')}
                className={i === path.length - 1 ? 'font-bold text-slate-800 cursor-default' : 'text-slate-500 hover:text-slate-800 hover:underline'}
              >
                {id === ROOT_ID ? '⌂ System' : byId.get(id)!.title}
              </button>
            </span>
          ))}
          {open && (
            <button
              onClick={() => navigate([ROOT_ID], 'up')}
              className="ml-2 px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-600 text-[11px]"
            >
              ✕ close panel
            </button>
          )}
          {!open && <span className="text-slate-400 ml-1">click a domain chip to expand it alongside</span>}
        </div>
      </div>

      <div key={path.join('/')} className={`h-full drill-enter-${navDir}`}>
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => {
            if (node.type === 'containerChip') {
              if (domainIds.includes(node.id)) {
                if (open && node.id === path[1]) navigate([ROOT_ID], 'up')
                else navigate([ROOT_ID, node.id], 'down')
              } else {
                navigate([...path, node.id], 'down')
              }
            } else if (node.type === 'proxyChip') {
              const [, side, pid] = node.id.split(':')
              const target = byId.get(pid)!
              navigate(target.kind === 'container' ? pathTo(pid) : pathTo(target.parentId!), side === 'in' ? 'left' : 'right')
            }
          }}
          onNodeMouseEnter={(_, node) => setHovered(node.id)}
          onNodeMouseLeave={() => setHovered(null)}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
          fitView
          fitViewOptions={{ padding: 0.14 }}
          minZoom={0.15}
        >
          <Background gap={24} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <BudgetHud boxes={rfNodes.length} links={rfEdges.length} />
    </div>
  )
}
