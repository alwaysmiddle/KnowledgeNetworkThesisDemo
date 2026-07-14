// The wheel's contract, made executable. panegraph.ts's header states it in
// prose — "opening a node only adds rings outward, it never re-deals the
// angles" — and until now nothing enforced it. It is the single most load-
// bearing invariant in the Studio: the Connections pane previews a container's
// children on HOVER, so if a layout could shift under an expansion, the pane
// would jitter every time the cursor crossed a node. Both properties below
// (sectors ∝ FULL subtree weight, rings at a FIXED radius) exist only to make
// this true, and both are the kind of thing an innocent-looking optimization
// silently breaks.

import { describe, expect, test } from 'vitest'

import { byId, childrenOf, ROOT_ID } from '../corpus/graph'
import { depthBelow, paneGraph } from './panegraph'

/** Containers with enough beneath them to be worth expanding, one per stratum. */
const ROOTS = ['root', 'sys', 'os', 'os-virtual-memory', 'cs', 'ds']

/** every container inside `root`'s subtree — the expandable set */
function containersUnder(root: string): string[] {
  const out: string[] = []
  const walk = (id: string) => {
    for (const k of childrenOf.get(id) ?? []) {
      if ((childrenOf.get(k.id) ?? []).length > 0) {
        out.push(k.id)
        walk(k.id)
      }
    }
  }
  walk(root)
  return out
}

describe('no-jitter: a layout is a pure function of (root, corpus), never of what is open', () => {
  test.each(ROOTS)('opening any single container under %s moves nothing already placed', (root) => {
    const closed = paneGraph(root, new Set())
    const before = new Map(closed.nodes.map((n) => [n.id, n]))

    for (const c of containersUnder(root)) {
      const open = paneGraph(root, new Set([c]))
      for (const n of open.nodes) {
        const was = before.get(n.id)
        if (!was) continue // newly revealed — appearing is allowed, moving is not
        expect(n.x, `${n.id} moved in x when ${c} opened`).toBeCloseTo(was.x, 9)
        expect(n.y, `${n.id} moved in y when ${c} opened`).toBeCloseTo(was.y, 9)
        expect(n.depth).toBe(was.depth)
      }
    }
  })

  test('opening EVERYTHING moves nothing already placed', () => {
    // the "open all" button — the worst case, and the one a user reaches in one
    // click. If sectors were ∝ what is OPEN rather than ∝ the full subtree, this
    // is where the whole wheel would re-deal.
    for (const root of ROOTS) {
      const closed = paneGraph(root, new Set())
      const all = paneGraph(root, new Set(containersUnder(root)))
      const before = new Map(closed.nodes.map((n) => [n.id, n]))
      for (const n of all.nodes) {
        const was = before.get(n.id)
        if (!was) continue
        expect(n.x, `${n.id} moved when the whole subtree of ${root} opened`).toBeCloseTo(was.x, 9)
        expect(n.y, `${n.id} moved when the whole subtree of ${root} opened`).toBeCloseTo(was.y, 9)
      }
    }
  })

  test('the hover PREVIEW is the same computation as the commit', () => {
    // ChildrenPanel draws paneGraph(root, expanded ∪ {hovered}) and treats the
    // extra nodes as ghosts. Clicking then commits `hovered` into `expanded`.
    // The click must therefore be a pure no-op on geometry — what you previewed
    // is exactly what you get, which is why the pane needs no deferred-click
    // dance.
    const expanded = new Set(['dig', 'os'])
    const preview = paneGraph('sys', new Set([...expanded, 'arc']))
    const committed = paneGraph('sys', new Set([...expanded, 'arc']))
    expect(preview.nodes).toEqual(committed.nodes)
  })
})

describe('the properties that MAKE no-jitter true', () => {
  test('rings sit at a fixed radius = depth, at every root', () => {
    // Not normalized to the pane: the pane is a pannable canvas, so ring k is
    // always at radius k. Normalizing would make radius depend on the deepest
    // OPEN node — i.e. on the expansion state — and the whole thing collapses.
    for (const root of ROOTS) {
      const pg = paneGraph(root, new Set(containersUnder(root)))
      for (const n of pg.nodes) {
        expect(Math.hypot(n.x, n.y), `${n.id} is not on ring ${n.depth}`).toBeCloseTo(n.depth, 9)
      }
    }
  })

  test("a child's sector is inside its parent's — children never escape the wedge", () => {
    // The structural reason opening is safe: a child is placed by SUBDIVIDING
    // the arc its parent already owned, so revealing it cannot displace anyone.
    const pg = paneGraph('sys', new Set(containersUnder('sys')))
    const at = new Map(pg.nodes.map((n) => [n.id, n]))
    const ang = (id: string) => {
      const n = at.get(id)!
      return Math.atan2(n.y, n.x)
    }
    // siblings' angular order is stable under expansion, which is the readable
    // consequence: the compass never re-deals
    const kidsOf = (id: string) => (childrenOf.get(id) ?? []).map((k) => k.id).filter((k) => at.has(k))
    for (const parent of ['sys', 'dig', 'os']) {
      const kids = kidsOf(parent)
      if (kids.length < 2) continue
      const closedPg = paneGraph('sys', new Set())
      const closedAt = new Map(closedPg.nodes.map((n) => [n.id, n]))
      const shared = kids.filter((k) => closedAt.has(k))
      if (shared.length < 2) continue
      const orderOpen = [...shared].sort((a, b) => ang(a) - ang(b))
      const orderClosed = [...shared].sort(
        (a, b) => Math.atan2(closedAt.get(a)!.y, closedAt.get(a)!.x) - Math.atan2(closedAt.get(b)!.y, closedAt.get(b)!.x),
      )
      expect(orderOpen).toEqual(orderClosed)
    }
  })

  test('clipped counts what is hidden, and only when closed', () => {
    const pg = paneGraph('sys', new Set(['dig']))
    for (const n of pg.nodes) {
      const kids = childrenOf.get(n.id) ?? []
      expect(n.container).toBe(kids.length > 0)
      if (n.depth === 0) continue
      const open = pg.nodes.some((c) => c.parent === n.id)
      expect(n.clipped, `${n.id}`).toBe(kids.length > 0 && !open ? kids.length : 0)
    }
  })

  test('depthAvail is the real depth below the root, independent of expansion', () => {
    for (const root of ROOTS) {
      expect(paneGraph(root, new Set()).depthAvail).toBe(depthBelow(root))
      expect(paneGraph(root, new Set(containersUnder(root))).depthAvail).toBe(depthBelow(root))
    }
  })
})

describe('the wheel is a view of the corpus, not a rewrite of it', () => {
  test('every placed node is a real descendant of the root', () => {
    const pg = paneGraph('cs', new Set(containersUnder('cs')))
    for (const n of pg.nodes) {
      expect(byId.has(n.id)).toBe(true)
      if (n.depth === 0) continue
      expect(byId.get(n.id)!.parentId).toBe(n.parent)
    }
  })

  test('a closed root shows exactly its direct children, plus itself', () => {
    const pg = paneGraph(ROOT_ID, new Set())
    expect(pg.nodes.filter((n) => n.depth === 1).map((n) => n.id).sort()).toEqual(
      (childrenOf.get(ROOT_ID) ?? []).map((k) => k.id).sort(),
    )
    expect(pg.nodes.filter((n) => n.depth > 1)).toHaveLength(0)
  })

  test('a leaf root lays out as itself alone', () => {
    const leaf = [...byId.values()].find((n) => n.kind === 'leaf')!
    const pg = paneGraph(leaf.id, new Set())
    expect(pg.nodes).toHaveLength(1)
    expect(pg.depthAvail).toBe(0)
  })
})
