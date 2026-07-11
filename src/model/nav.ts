// Pure helpers + shared types for the cockpit, split out from CockpitView so
// that component stays focused on wiring — mirrors the repo's existing split
// between derive.ts/flat.ts (pure) and the views that render them. Not in
// the handoff's file list verbatim (it says "optionally layout.ts"); adding
// this one small file for the same reason logged as a deviation in RESULTS.

import { byId, childrenOf, EDGE_LABEL, pathTo, ROOT_ID } from '../corpus/graph'
import type { EdgeType } from '../corpus/graph'

export type TrailVia = 'map' | 'tree' | 'link' | 'trail' | 'walk' | 'graph'

/** Fixed edge-type order, derived once from graph.ts's own declaration order
 * so the plex's rings and the knowledge panel's grouped list always agree. */
export const EDGE_TYPES = Object.keys(EDGE_LABEL) as EdgeType[]

export interface TrailEntry {
  id: string
  via: TrailVia
  jump: boolean
}

export interface ActiveWalkState {
  walkId: string
  cursor: number
}

/** Is `id` inside (or equal to) the subtree rooted at `rootId`? */
export function isInSubtree(id: string, rootId: string): boolean {
  return pathTo(id).includes(rootId)
}

/** Containment parent, falling back to ROOT_ID itself — root stays root. */
export function parentOf(id: string): string {
  return byId.get(id)?.parentId ?? ROOT_ID
}

/** Container ids that should start expanded: `rootId` and its direct
 * container children — two levels of container structure open by default. */
export function depth2Expanded(rootId: string): Set<string> {
  const out = new Set<string>([rootId])
  for (const c of childrenOf.get(rootId) ?? []) {
    if (c.kind === 'container') out.add(c.id)
  }
  return out
}
