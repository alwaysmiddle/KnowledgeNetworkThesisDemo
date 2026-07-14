// The relations star. Its whole claim is "same compass as the map" — a
// counterpart that lives north-east on the map sits north-east on the star — and
// that claim survives only if relaxRing is ORDER-PRESERVING. A relaxation that
// sorted, or that let one node overtake another while pushing them apart, would
// still look like a tidy ring; it would just be lying about where things are,
// and nothing on screen would say so.

import { describe, expect, test } from 'vitest'

import { byId, childrenOf, domainIds, edges, topicIds } from '../corpus/graph'
import { leafPos, provinceIds } from './flat'
import { anchorTopicOf, MIN_GAP, relaxRing, R_STAR, starFor } from './star'

const TAU = 2 * Math.PI

describe('anchorTopicOf — relations live at the topic grain, and only there', () => {
  test('a topic anchors to itself', () => {
    for (const t of topicIds) expect(anchorTopicOf(t), t).toBe(t)
  })

  test('a deep node anchors to the topic that owns it', () => {
    const walk = (id: string, topic: string) => {
      for (const k of childrenOf.get(id) ?? []) {
        expect(anchorTopicOf(k.id), k.id).toBe(topic)
        walk(k.id, topic)
      }
    }
    for (const t of topicIds) walk(t, t)
  })

  test('ABOVE the topic grain there is no anchor at all — null, not itself', () => {
    // The distinction that makes the pane honest. flat.ts's topicAnchorOf falls
    // back to the id itself here, which would make a domain look like a topic
    // with zero links rather than a thing that cannot have links.
    expect(anchorTopicOf('root')).toBeNull()
    for (const d of domainIds) expect(anchorTopicOf(d), d).toBeNull()
    for (const m of provinceIds) expect(anchorTopicOf(m), m).toBeNull()
  })
})

describe('relaxRing keeps the compass', () => {
  test('order is preserved — nothing overtakes its neighbour while spreading', () => {
    const cases: number[][] = [
      [0, 0.05, 0.1], // a tight cluster — the case that forces real pushing
      [-3, -2.9, 1, 1.05, 3],
      [0.5],
      [],
      [0, 1, 2, 3, 4, 5],
    ]
    for (const sorted of cases) {
      const out = relaxRing(sorted, MIN_GAP)
      expect(out.length).toBe(sorted.length)
      for (let i = 1; i < out.length; i++) {
        expect(out[i], `${sorted} lost its order`).toBeGreaterThan(out[i - 1])
      }
    }
  })

  test('the minimum gap is actually achieved when the ring has room', () => {
    const out = relaxRing([0, 0.05, 0.1, 2, 2.02], MIN_GAP)
    for (let i = 1; i < out.length; i++) {
      expect(out[i] - out[i - 1]).toBeGreaterThanOrEqual(MIN_GAP - 1e-9)
    }
    // and the wrap-around gap too — the ring is a circle, not a line
    expect(out[0] + TAU - out[out.length - 1]).toBeGreaterThanOrEqual(MIN_GAP - 1e-9)
  })

  test('an OVERFULL ring spreads evenly rather than overlapping', () => {
    // more counterparts than MIN_GAP can fit: bearings become approximate, which
    // is the honest trade — a ring that cannot hold them all must not stack them
    const n = Math.ceil(TAU / MIN_GAP) + 3
    const crowded = Array.from({ length: n }, (_, i) => i * 0.01)
    const out = relaxRing(crowded, MIN_GAP)
    const gaps = out.slice(1).map((a, i) => a - out[i])
    for (const g of gaps) expect(g).toBeCloseTo(TAU / n, 9)
  })
})

describe('starFor', () => {
  test('every one of the 53 topics has a star — the corpus guarantees no orphans', () => {
    for (const t of topicIds) {
      const s = starFor(t)
      expect(s.anchor).toBe(t)
      expect(s.rels.length, `${t} has no typed links`).toBeGreaterThan(0)
      expect(s.nodes.length, `${t} has no counterparts`).toBeGreaterThan(0)
    }
  })

  test('one node per COUNTERPART, not per edge — parallel links share a spoke', () => {
    for (const t of topicIds) {
      const s = starFor(t)
      const counterparts = new Set(s.rels.map((e) => (e.source === t ? e.target : e.source)))
      expect(s.nodes.map((n) => n.id).sort()).toEqual([...counterparts].sort())
      // and every edge is on exactly one spoke
      expect(s.nodes.reduce((n, sn) => n + sn.edges.length, 0)).toBe(s.rels.length)
    }
  })

  test('a reciprocal pair is ONE node carrying two edges, not two stacked nodes', () => {
    // ds-hash-tables ⇄ cry-cryptographic-hashing is a deliberate see-also pair
    const s = starFor('ds-hash-tables')
    const hash = s.nodes.find((n) => n.id === 'cry-cryptographic-hashing')!
    expect(hash).toBeDefined()
    expect(hash.edges.length).toBe(2)
    expect(new Set(hash.edges.map((e) => `${e.source}>${e.target}`)).size).toBe(2)
  })

  test('counterparts sit at their TRUE map bearings, in map order', () => {
    // the star's one claim. Seeds are the real bearings; relaxRing may spread
    // them, but the cyclic ORDER must survive — that is what makes the star and
    // the map the same compass.
    for (const t of topicIds) {
      const s = starFor(t)
      if (s.nodes.length < 3) continue
      const origin = leafPos[t]
      const trueBearing = (id: string) => Math.atan2(leafPos[id].y - origin.y, leafPos[id].x - origin.x)
      const drawn = s.nodes.map((n) => n.id)
      const byTrue = [...drawn].sort((a, b) => trueBearing(a) - trueBearing(b) || a.localeCompare(b))
      expect(drawn, `${t}'s star is not in map order`).toEqual(byTrue)
    }
  })

  test('every node sits on the ring, at R_STAR', () => {
    for (const t of topicIds) {
      for (const n of starFor(t).nodes) expect(Math.hypot(n.x, n.y)).toBeCloseTo(R_STAR, 9)
    }
  })

  test('edges are grouped in edge-type order, so the list and the star agree', () => {
    const ORDER = Object.keys(
      edges.reduce<Record<string, true>>((acc, e) => ({ ...acc, [e.type]: true }), {}),
    )
    expect(ORDER.length).toBeGreaterThan(1)
    for (const t of topicIds) {
      for (const n of starFor(t).nodes) {
        const idx = n.edges.map((e) => ['depends_on', 'data_flow', 'references', 'implements'].indexOf(e.type))
        expect([...idx].sort((a, b) => a - b), `${t}→${n.id}`).toEqual(idx)
      }
    }
  })

  test('above the topic grain the star is empty, and says so', () => {
    for (const id of ['root', ...domainIds, ...provinceIds]) {
      const s = starFor(id)
      expect(s.anchor, id).toBeNull()
      expect(s.rels, id).toEqual([])
      expect(s.nodes, id).toEqual([])
    }
  })

  test("a deep node shows its owning topic's star — same anchor, same edges", () => {
    const topic = 'os-virtual-memory'
    const deep = (childrenOf.get(topic) ?? [])[0]
    expect(deep).toBeDefined()
    expect(byId.get(deep.id)!.topic).toBeUndefined()

    const fromDeep = starFor(deep.id)
    const fromTopic = starFor(topic)
    expect(fromDeep.anchor).toBe(topic)
    expect(fromDeep.nodes).toEqual(fromTopic.nodes)
  })
})
