// The atlas's geometric contract. Two properties hold up everything the map
// draws, and both are silent when broken — you get subtly wrong text placement
// and slightly-overlapping cells, not an exception:
//
//   CONVEXITY. chordAt() takes the horizontal chord of a cell by finding the
//   min and max crossing at height y. On a concave polygon that spans the
//   CONCAVITY too, so a label would be centered on room the cell does not have.
//   The construction guarantees convexity (convex ∩ half-planes stays convex);
//   this is what stops someone swapping in a "better" bounded-Voronoi library
//   and quietly breaking every label in the deep tiers.
//
//   TILING. Children partition their parent exactly. The whole disclosure idea
//   — zoom in and the same territory subdivides — is a lie the moment child
//   cells overlap or leave gaps.

import { describe, expect, test } from 'vitest'

import { byId, childrenOf, topicIds } from '../corpus/graph'
import type { XY } from './derive'
import { chordAt, maxTier, nestedDots, pointInPoly, territories, topicPoly } from './nested'

const byTerr = new Map(territories.map((t) => [t.id, t]))

/** shoelace — signed area, sign tells winding */
const area = (poly: XY[]) => {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

/** every turn goes the same way — the polygon never bends back on itself */
const isConvex = (poly: XY[]) => {
  if (poly.length < 3) return true
  let sign = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const c = poly[(i + 2) % poly.length]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (Math.abs(cross) < 1e-6) continue // collinear vertices are fine
    const s = Math.sign(cross)
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}

describe('every territory is convex — chordAt depends on it', () => {
  test('all of them, at every tier', () => {
    const concave = territories.filter((t) => !isConvex(t.poly)).map((t) => `${t.id} (tier ${t.tier})`)
    expect(concave).toEqual([])
  })

  test('chordAt returns real room inside the cell, and nothing outside it', () => {
    for (const t of territories.slice(0, 200)) {
      const c = chordAt(t.poly, t.cy)
      expect(c, `${t.id} has no chord at its own centroid height`).not.toBeNull()
      const [x0, x1] = c!
      expect(x1).toBeGreaterThanOrEqual(x0)
      // the centroid of a convex polygon is inside it, so the chord through it
      // must contain it
      expect(t.cx).toBeGreaterThanOrEqual(x0 - 1e-6)
      expect(t.cx).toBeLessThanOrEqual(x1 + 1e-6)
    }
  })
})

describe('children tile their parent exactly', () => {
  test('child areas sum to the parent area', () => {
    for (const t of territories) {
      const kids = (childrenOf.get(t.id) ?? []).map((k) => byTerr.get(k.id)).filter((k) => k !== undefined)
      if (kids.length === 0) continue
      // a child too thin to draw is dropped to a dot instead of a territory, so
      // only compare when every child got a cell — a dropped sliver has ~0 area
      // anyway, but "~0" is not a number this assertion should have to trust
      if (kids.length !== (childrenOf.get(t.id) ?? []).length) continue
      const parent = Math.abs(area(t.poly))
      const sum = kids.reduce((s, k) => s + Math.abs(area(k.poly)), 0)
      expect(sum / parent, `${t.id}'s children do not tile it`).toBeCloseTo(1, 3)
    }
  })

  test('every child centroid lies inside its parent', () => {
    for (const t of territories) {
      for (const k of childrenOf.get(t.id) ?? []) {
        const kid = byTerr.get(k.id)
        if (!kid) continue
        expect(pointInPoly({ x: kid.cx, y: kid.cy }, t.poly), `${kid.id} sits outside ${t.id}`).toBe(true)
      }
    }
  })
})

describe('the tier scale is what the DATA says, not what a constant says', () => {
  test('topics are tier 2 and own their own Voronoi cell', () => {
    for (const t of topicIds) {
      expect(byTerr.get(t)?.tier, t).toBe(2)
      expect(topicPoly.has(t), t).toBe(true)
    }
    expect(topicPoly.size).toBe(topicIds.length)
  })

  test('every territory tier is in [2, maxTier], and maxTier is attained', () => {
    for (const t of territories) {
      expect(t.tier).toBeGreaterThanOrEqual(2)
      expect(t.tier).toBeLessThanOrEqual(maxTier)
    }
    const deepest = Math.max(...territories.map((t) => t.tier), ...nestedDots.map((d) => d.tier))
    expect(deepest).toBe(maxTier)
  })

  test('a territory is leaf iff the corpus says the node is childless', () => {
    for (const t of territories) {
      expect(t.leaf, t.id).toBe((childrenOf.get(t.id) ?? []).length === 0)
    }
  })

  test('every node at or below the topic grain is drawable — a cell or a dot', () => {
    // the disclosure promise: zoom far enough and EVERY authored node is
    // somewhere on the map. A node with neither a territory nor a dot would be
    // a place you can never reach.
    const placed = new Set([...territories.map((t) => t.id), ...nestedDots.map((d) => d.id)])
    const missing: string[] = []
    const walk = (id: string) => {
      for (const k of childrenOf.get(id) ?? []) {
        if (!placed.has(k.id)) missing.push(k.id)
        walk(k.id)
      }
    }
    for (const t of topicIds) walk(t)
    expect(missing).toEqual([])
  })

  test('every placed id is a real corpus node', () => {
    for (const t of territories) expect(byId.has(t.id), t.id).toBe(true)
    for (const d of nestedDots) expect(byId.has(d.id), d.id).toBe(true)
  })
})
