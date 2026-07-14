// The selection overlay. Until this derivation was lifted out of the component
// (2026-07-14) its invariant could only be checked by querying the rendered DOM
// in the screenshot driver, on the two selections that driver happens to make.
// It is a pure function, so ask it about every node in the corpus instead.

import { describe, expect, test } from 'vitest'

import { byId, domainIds, edges, nodes, topicIds, topicsUnder } from '../corpus/graph'
import { provinceIds } from './flat'
import { outlineOf, roadsFor, tierOf } from './atlas'

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

  test('a DEEP node borrows its owning topic\'s edges — that is the "via" in the pane', () => {
    // A concept four levels below a topic has no edges of its own (the corpus
    // forbids them), but selecting it must still show you something true: the
    // relations of the topic you are standing inside.
    const deep = nodes.filter((n) => !n.topic && topicsUnder(n.id).length === 0 && n.parentId).slice(0, 40)
    for (const d of deep) {
      const own = roadsFor(d.id)
      const anchorArrows = own.arrows
      expect(anchorArrows.length, `${d.id} shows nothing`).toBeGreaterThan(0)
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
