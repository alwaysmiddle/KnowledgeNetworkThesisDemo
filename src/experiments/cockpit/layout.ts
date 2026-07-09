// Map panel geometry. Reuses derive.ts's authored-hierarchy shelf-packer
// (layoutMap) with nothing collapsed, so every domain, module, and leaf gets
// a slot in ONE nested layout — computed once, at module scope, so the map
// never re-lays-out on navigation (the map-stability invariant, §3.3).
//
// Deliberately NOT flat.ts's leafPos: that embedding is keyed to CNM-detected
// communities, and the whole point of this cockpit is authored hierarchy
// over detected communities (see the EVoC spike's scoping conclusion). Using
// it here would put the wrong map under the tree.

import { layoutMap } from '../derive'
import type { XY } from '../derive'

export const MAP_LAYOUT = layoutMap(new Set())

export function centerOf(id: string): XY {
  const p = MAP_LAYOUT.pos[id]
  const s = MAP_LAYOUT.size[id]
  return { x: p.x + s.w / 2, y: p.y + s.h / 2 }
}

export const MAP_BOUNDS = (() => {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of MAP_LAYOUT.visible) {
    const p = MAP_LAYOUT.pos[n.id]
    const s = MAP_LAYOUT.size[n.id]
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x + s.w)
    maxY = Math.max(maxY, p.y + s.h)
  }
  const pad = 40
  return { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad }
})()
