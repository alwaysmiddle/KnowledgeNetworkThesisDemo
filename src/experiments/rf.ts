// Non-component ReactFlow glue, kept out of parts.tsx so fast refresh works:
// the node-type registry and the single styling rule for lifted edges.

import { MarkerType } from '@xyflow/react'
import type { Edge } from '@xyflow/react'

import { EDGE_COLOR, MIXED_EDGE_COLOR } from './graph'
import type { EdgeType } from './graph'
import type { LiftedEdge } from './derive'
import { ContainerBox, ContainerChip, LeafCard, ProxyChip } from './parts'

export const nodeTypes = {
  leafCard: LeafCard,
  containerChip: ContainerChip,
  containerBox: ContainerBox,
  proxyChip: ProxyChip,
}

// Width grows with log(count); a count label appears once an edge stands in
// for a few; uniform aggregates keep their type color, mixed ones go slate.
// Straight edges on purpose: fixed left/right handles make bezier curves wrap
// around in giant loops whenever the target sits left of the source.
// `emphasis` is the tracing state: 'hi' = touches the hovered/selected node,
// 'lo' = everything else recedes while a trace is active, 'route' = a walked
// step of the combined screen's path — repainted amber and immune to tracing,
// 'dim' = background context while a route is active (softer than 'lo': still
// readable, but clearly not where you are).
export type Emphasis = 'hi' | 'lo' | 'route' | 'dim'

export function liftedToRfEdge(l: LiftedEdge, opts?: { dashed?: boolean; emphasis?: Emphasis }): Edge {
  const em = opts?.emphasis
  const typeColor = l.type === 'mixed' ? MIXED_EDGE_COLOR : EDGE_COLOR[l.type as EdgeType]
  const color = em === 'route' ? '#f59e0b' : typeColor
  const baseWidth = l.count === 1 ? 1.4 : 1.6 + Math.min(3.6, Math.log2(l.count) * 1.2)
  const width = em === 'hi' ? baseWidth + 1 : em === 'route' ? baseWidth + 1.2 : baseWidth
  // RF arrowheads scale WITH strokeWidth (markerUnits=strokeWidth); divide it
  // back out so heavy aggregates don't grow monster wedges.
  const marker = Math.max(2.8, 11 / width)
  const opacity = em === 'hi' || em === 'route' ? 1 : em === 'lo' ? 0.08 : em === 'dim' ? 0.15 : l.count >= 4 ? 0.75 : 0.9
  return {
    id: l.id,
    source: l.source,
    target: l.target,
    type: 'straight',
    // receded edges drop their labels too — a full-strength count on a ghost
    // line reads as floating noise
    label: em !== 'lo' && em !== 'dim' && (l.count > 2 || ((em === 'hi' || em === 'route') && l.count > 1)) ? String(l.count) : undefined,
    labelStyle: { fontSize: 9, fill: '#475569', fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
    style: {
      stroke: color,
      strokeWidth: width,
      opacity,
      strokeDasharray: opts?.dashed ? '7 4' : undefined,
    },
    markerEnd: { type: MarkerType.ArrowClosed, width: marker, height: marker, color },
  }
}
