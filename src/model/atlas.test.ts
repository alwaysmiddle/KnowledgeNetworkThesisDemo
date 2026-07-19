// The selection overlay. Until this derivation was lifted out of the component
// (2026-07-14) its invariant could only be checked by querying the rendered DOM
// in the screenshot driver, on the two selections that driver happens to make.
// It is a pure function, so ask it about every node in the corpus instead.

import { describe, expect, test } from 'vitest'

import { byId, domainIds, domainOf, edges, nodes, topicIds, topicsUnder } from '../corpus/graph'
import { provinceIds, provinceOf, topicAnchorOf } from './flat'
import { endpointAtTier, flightTargetOf, outlineOf, roadsFor, tierOf } from './atlas'

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

/** every id a user can actually click on the map, at any level */
const SELECTABLE = [...domainIds, ...provinceIds, ...topicIds]

describe('ONE ROAD PER PAIR — the map draws a road, not a bundle of curves', () => {
  test('no unordered pair is ever drawn twice, for any selection in the corpus', () => {
    // This is the assertion shot-visuals.mjs makes by splitting data-seledge
    // attributes out of the DOM, on exactly two selections. Here it runs on all
    // 75 selectable regions — including every reciprocal pair, which is the case
    // that regresses (A→B and B→A drawn as two bowed arrows past each other).
    for (const sel of SELECTABLE) {
      const { bundles } = roadsFor(sel)
      const keys = bundles.map((b) => pairKey(b.src, b.tgt))
      expect(new Set(keys).size, `${sel} drew a pair twice`).toBe(keys.length)
    }
  })

  test('collapsing loses no traffic — bundle counts sum to arrow counts', () => {
    for (const sel of SELECTABLE) {
      const { arrows, bundles } = roadsFor(sel)
      const drawn = bundles.reduce((s, b) => s + b.n, 0)
      const raw = arrows.reduce((s, a) => s + a.n, 0)
      expect(drawn, `${sel} lost links in the collapse`).toBe(raw)
    }
  })

  test('a bundle is two-way exactly when the pair really is reciprocal', () => {
    // dir: 'both' suppresses the arrowhead. Getting this wrong either draws a
    // one-way arrow on a two-way road (a lie) or drops the head off a one-way
    // road (an omission), and both look plausible on screen.
    for (const sel of SELECTABLE) {
      const { arrows, bundles } = roadsFor(sel)
      for (const b of bundles) {
        const mine = arrows.filter((a) => pairKey(a.src, a.tgt) === pairKey(b.src, b.tgt))
        const dirs = new Set(mine.map((a) => `${a.src}>${a.tgt}`))
        expect(b.dir, `${sel}: ${b.key}`).toBe(dirs.size > 1 ? 'both' : 'fwd')
      }
    }
  })

  test("type is null exactly when the bundle mixes types — that's what draws it slate", () => {
    for (const sel of SELECTABLE) {
      const { arrows, bundles } = roadsFor(sel)
      for (const b of bundles) {
        const mine = arrows.filter((a) => pairKey(a.src, a.tgt) === pairKey(b.src, b.tgt))
        const kinds = new Set(mine.map((a) => a.type))
        expect(b.type === null, `${sel}: ${b.key} carries ${[...kinds].join('+')}`).toBe(kinds.size > 1)
        if (kinds.size === 1) expect(b.type).toBe([...kinds][0])
      }
    }
  })

  test('no road ever runs from a cell to itself', () => {
    for (const sel of SELECTABLE) {
      for (const b of roadsFor(sel).bundles) expect(b.src, sel).not.toBe(b.tgt)
    }
  })
})

describe('rolling up to a coarser grain', () => {
  test('a region selection drops the edges INTERNAL to it', () => {
    // The whole point of the roll-up: a domain's own internal wiring is its
    // children's business. Drawing it across the region would be drawing a
    // relationship the map is not currently showing the endpoints of.
    for (const d of domainIds) {
      const inside = new Set(topicsUnder(d))
      const internal = edges.filter((e) => inside.has(e.source) && inside.has(e.target))
      expect(internal.length, `${d} has no internal edges to test with`).toBeGreaterThan(0)

      const { arrows } = roadsFor(d)
      const carried = arrows.reduce((s, a) => s + a.n, 0)
      const crossing = edges.filter((e) => inside.has(e.source) !== inside.has(e.target))
      expect(carried, `${d} rolled up the wrong number of edges`).toBe(crossing.length)
      // and every road it drew touches the selected region itself
      for (const a of arrows) expect(a.src === d || a.tgt === d, `${d} drew a road it is not on`).toBe(true)
    }
  })

  test('a region selection draws region↔region roads, never topic ones', () => {
    for (const d of domainIds) {
      for (const a of roadsFor(d).arrows) {
        expect(domainIds, `${a.src}`).toContain(a.src)
        expect(domainIds, `${a.tgt}`).toContain(a.tgt)
      }
    }
    for (const m of provinceIds) {
      for (const a of roadsFor(m).arrows) {
        expect(provinceIds, `${a.src}`).toContain(a.src)
        expect(provinceIds, `${a.tgt}`).toContain(a.tgt)
      }
    }
  })

  test('a topic selection keeps its edges RAW — one arrow per link', () => {
    for (const t of topicIds) {
      const { tier, arrows } = roadsFor(t)
      expect(tier).toBe(2)
      const touching = edges.filter((e) => e.source === t || e.target === t)
      expect(arrows.length, t).toBe(touching.length)
      for (const a of arrows) expect(a.n).toBe(1)
    }
  })

  test('a DEEP node draws NO roads — the map refuses the lift, like the pane', () => {
    // A concept below a topic has no edges of its own (the corpus forbids
    // them). Until 2026-07-17 the overlay borrowed the owning topic's roads
    // here — the map-side twin of the pane's retired "via" lift — which kept
    // the parent's arrows on screen for every relation-less child. Now the
    // selection tint is all a deep cell gets; the topic's roads belong to the
    // topic's selection.
    const deep = nodes.filter((n) => !n.topic && topicsUnder(n.id).length === 0 && n.parentId).slice(0, 40)
    expect(deep.length).toBeGreaterThan(0)
    for (const d of deep) {
      const r = roadsFor(d.id)
      expect(r.arrows, `${d.id} borrowed arrows`).toEqual([])
      expect(r.bundles, `${d.id} borrowed bundles`).toEqual([])
      expect(r.tier, d.id).toBe(2) // still a real tier — the chip reads it
    }
  })
})

describe('the empty and impossible cases', () => {
  test('no selection means no roads', () => {
    expect(roadsFor(null)).toEqual({ tier: -1, arrows: [], bundles: [] })
  })

  test('an unknown id means no roads, not a crash', () => {
    expect(roadsFor('not-a-node').bundles).toEqual([])
  })
})

describe('outlineOf and tierOf — one question, one answer', () => {
  test('every clickable region has an outline to draw', () => {
    // the selection, the hover preselect and the cross-pane spotlight all call
    // this; an undefined outline is an invisible selection
    for (const id of SELECTABLE) expect(outlineOf(id), id).toBeDefined()
  })

  test('tierOf agrees with the corpus about what kind of thing an id is', () => {
    for (const d of domainIds) expect(tierOf(d), d).toBe(0)
    for (const m of provinceIds) expect(tierOf(m), m).toBe(1)
    for (const t of topicIds) expect(tierOf(t), t).toBe(2)
  })

  test('the root is not a region — it has no outline', () => {
    expect(outlineOf('root')).toBeUndefined()
    expect(byId.get('root')!.parentId).toBeNull()
  })
})

describe('endpointAtTier — the road a hovered counterpart lights (item 3)', () => {
  test('every bundle endpoint is idempotent under the lift at its own grain', () => {
    // this IS the feature: hovering a counterpart cell must resolve to itself,
    // or the road drawn to it would never light. Checked on every road the
    // corpus can draw, at every grain, not the two the driver happens to hover.
    for (const sel of SELECTABLE) {
      const { tier, bundles } = roadsFor(sel)
      for (const b of bundles) {
        expect(endpointAtTier(b.src, tier), `${sel}:${b.src}`).toBe(b.src)
        expect(endpointAtTier(b.tgt, tier), `${sel}:${b.tgt}`).toBe(b.tgt)
      }
    }
  })

  test('a topic lifts to itself at topic grain, to its region when rolled up', () => {
    // a relationship row publishes a TOPIC id; at a domain/module selection that
    // topic must lift to the region whose road is actually on screen
    for (const t of topicIds) {
      expect(endpointAtTier(t, 2), t).toBe(t)
      expect(endpointAtTier(t, 1), t).toBe(provinceOf(t))
      expect(endpointAtTier(t, 0), t).toBe(domainOf(t))
    }
  })

  test('a deep node lifts through its owning topic — the "via" a hover follows', () => {
    const deep = nodes.filter((n) => !n.topic && n.parentId && topicsUnder(n.id).length === 0).slice(0, 30)
    for (const d of deep) {
      const owner = topicAnchorOf(d.id)
      expect(endpointAtTier(d.id, 2), d.id).toBe(owner)
      expect(endpointAtTier(d.id, 0), d.id).toBe(domainOf(owner))
    }
  })
})

describe('flightTargetOf — where the peek flies the camera', () => {
  test('every selectable node has a target, at its own grain', () => {
    for (const id of SELECTABLE) {
      const t = flightTargetOf(id)!
      expect(t, id).not.toBeNull()
      expect(t.tier, id).toBe(domainIds.includes(id) ? 0 : provinceIds.includes(id) ? 1 : 2)
      expect(Number.isFinite(t.c.x) && Number.isFinite(t.c.y), id).toBe(true)
    }
  })

  test('a deep node flies to a real territory; an unknown id flies nowhere', () => {
    const deep = nodes.filter((n) => !n.topic && n.parentId && topicsUnder(n.id).length === 0).slice(0, 30)
    for (const d of deep) {
      const t = flightTargetOf(d.id)
      expect(t, d.id).not.toBeNull()
      expect(t!.tier, d.id).toBeGreaterThanOrEqual(2)
    }
    expect(flightTargetOf('no-such-node')).toBeNull()
  })
})
