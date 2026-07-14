// Edge lifting — the disclosure win, and the easiest thing in the repo to get
// subtly wrong. Collapse a box and its internal edges must VANISH (that is the
// whole point: fewer lines, not the same lines redrawn onto the box); everything
// crossing the boundary must re-anchor to the visible ancestor and MERGE, with
// an honest count. A lift that dropped a crossing edge would quietly under-report
// how connected a region is, and the map would look calmer than the corpus is.

import { describe, expect, test } from 'vitest'

import { byId, childrenOf, domainIds, edges, topicsUnder, ROOT_ID } from '../corpus/graph'
import { deriveChoices, hiddenIds, liftEdges, visibleAncestor } from './derive'

const COLLAPSES: [string, Set<string>][] = [
  ['nothing collapsed', new Set()],
  ['one domain', new Set(['sys'])],
  ['every domain', new Set(domainIds)],
  ['a scatter of modules', new Set(['dig', 'os', 'ds', 'cry'])],
  ['a domain and a module inside another', new Set(['math', 'pl'])],
]

describe.each(COLLAPSES)('liftEdges — %s', (_label, collapsed) => {
  const hidden = hiddenIds(collapsed)
  const lifted = liftEdges(hidden)

  test('no edge is lost or invented — every raw edge is accounted for exactly once', () => {
    // Each raw edge either vanishes (both ends inside one collapsed box) or
    // lands in exactly one aggregate. The counts must add up to the corpus.
    const vanished = edges.filter((e) => visibleAncestor(e.source, hidden) === visibleAncestor(e.target, hidden))
    const carried = lifted.reduce((s, l) => s + l.count, 0)
    expect(carried + vanished.length).toBe(edges.length)
  })

  test('both endpoints of a lifted edge are visible', () => {
    for (const l of lifted) {
      expect(hidden.has(l.source), `${l.source} is hidden but drawn`).toBe(false)
      expect(hidden.has(l.target), `${l.target} is hidden but drawn`).toBe(false)
      expect(l.source).not.toBe(l.target) // a self-loop means an internal edge escaped
    }
  })

  test('one aggregate per ordered pair — parallel edges merge, they do not stack', () => {
    const keys = lifted.map((l) => `${l.source}>${l.target}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test("type is 'mixed' exactly when the aggregate is not uniform", () => {
    for (const l of lifted) {
      const kinds = Object.keys(l.types)
      expect(l.type === 'mixed', `${l.id} claims ${l.type} but carries ${kinds.join('+')}`).toBe(kinds.length > 1)
      expect(Object.values(l.types).reduce((s, n) => s + n, 0)).toBe(l.count)
    }
  })
})

describe('collapsing genuinely hides things', () => {
  test('a collapsed box hides its whole subtree, but stays visible itself', () => {
    const hidden = hiddenIds(new Set(['sys']))
    expect(hidden.has('sys')).toBe(false)
    for (const t of topicsUnder('sys')) expect(hidden.has(t), t).toBe(true)
    for (const t of topicsUnder('math')) expect(hidden.has(t), t).toBe(false)
  })

  test('collapsing a domain strictly REDUCES the number of drawn lines', () => {
    // If it did not, disclosure would be buying nothing.
    const open = liftEdges(hiddenIds(new Set()))
    const shut = liftEdges(hiddenIds(new Set(domainIds)))
    expect(shut.length).toBeLessThan(open.length)
    // and every remaining line runs domain→domain
    for (const l of shut) {
      expect(byId.get(l.source)!.parentId, l.source).toBe(ROOT_ID)
      expect(byId.get(l.target)!.parentId, l.target).toBe(ROOT_ID)
    }
  })

  test('visibleAncestor is the nearest visible one, never a further-up one', () => {
    const hidden = hiddenIds(new Set(['dig']))
    // a topic inside the collapsed module lifts to the MODULE, not the domain
    expect(visibleAncestor('dig-binary-data-representation', hidden)).toBe('dig')
    // an unaffected topic is its own visible ancestor
    expect(visibleAncestor('os-virtual-memory', hidden)).toBe('os-virtual-memory')
  })
})

describe('deriveChoices — "where can I walk from here"', () => {
  test('a choice is never inside the thing you are walking FROM', () => {
    // Otherwise the path-builder would offer to walk you deeper into where you
    // already are, which is containment, not traversal.
    for (const from of ['sys', 'os', 'cry', 'os-virtual-memory', ROOT_ID]) {
      const inside = new Set(byId.get(from)!.kind === 'container' ? topicsUnder(from) : [from])
      for (const c of deriveChoices(from)) {
        expect(inside.has(c.id), `${from} offers to walk to ${c.id}, which is inside it`).toBe(false)
      }
    }
  })

  test('the root offers nothing — there is no outside', () => {
    expect(deriveChoices(ROOT_ID)).toEqual([])
  })

  test('choices lead with the heaviest route', () => {
    const cs = deriveChoices('cry')
    for (let i = 1; i < cs.length; i++) expect(cs[i - 1].count).toBeGreaterThanOrEqual(cs[i].count)
  })

  test('a deep (non-topic) node has no typed links, so no choices', () => {
    // edges are topic↔topic; below the topic grain the structure is pure
    // containment, and deriveChoices must say so rather than inventing routes
    const deep = (childrenOf.get('os-virtual-memory') ?? [])[0]
    expect(deep).toBeDefined()
    expect(deriveChoices(deep.id)).toEqual([])
  })
})
