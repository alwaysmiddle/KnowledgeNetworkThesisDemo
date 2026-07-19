// The region-label fit (SelfNotes: "labels overlap / region text not
// wrapped"). The convex-cell fitLabel is exercised through the atlas driver;
// what needs pinning here is the part that made region names WRONG before:
// a convex chord over a concave region claims room that is not there, and an
// active region name must shrink rather than vanish.

import { describe, expect, test } from 'vitest'

import { fitRegionLabel } from './labelfit'
import { regionChordAt } from './nested'
import type { XY } from './derive'

const rect = (w: number, h: number): XY[] => [
  { x: 0, y: 0 },
  { x: w, y: 0 },
  { x: w, y: h },
  { x: 0, y: h },
]

// a U opening upward: two 10-wide arms joined by a base — at y=20 a horizontal
// row crosses BOTH arms, which is exactly where min/max-style chords lie
const U: XY[] = [
  { x: 0, y: 0 },
  { x: 30, y: 0 },
  { x: 30, y: 30 },
  { x: 20, y: 30 },
  { x: 20, y: 10 },
  { x: 10, y: 10 },
  { x: 10, y: 30 },
  { x: 0, y: 30 },
]

describe('regionChordAt — the honest room a text row has inside a region', () => {
  test('a convex ring behaves like the plain chord', () => {
    expect(regionChordAt([rect(100, 40)], 20, 50)).toEqual([0, 100])
  })

  test('a concave region yields the anchor\'s own interval, never the span across the bite', () => {
    expect(regionChordAt([U], 20, 5)).toEqual([0, 10]) // left arm
    expect(regionChordAt([U], 20, 25)).toEqual([20, 30]) // right arm
  })

  test('an anchor over the bite falls back to a real interval, not the void', () => {
    const c = regionChordAt([U], 20, 15)!
    expect(c[1] - c[0]).toBe(10) // one of the arms — 10 wide, not the 30 span
  })

  test('two disjoint rings pair independently — the anchor picks its ring', () => {
    const twin: XY[][] = [rect(10, 40), rect(10, 40).map((p) => ({ x: p.x + 50, y: p.y }))]
    expect(regionChordAt(twin, 20, 55)).toEqual([50, 60])
  })

  test('a row that misses the region entirely is null', () => {
    expect(regionChordAt([rect(100, 40)], 99, 50)).toBeNull()
  })
})

describe('fitRegionLabel — wrap first, shrink instead of dropping', () => {
  const wide = [rect(100, 40)]

  test('a short name is one line at full size', () => {
    const fit = fitRegionLabel('Security', wide, 50, 20, 10)
    expect(fit.lines).toHaveLength(1)
    expect(fit.shrink).toBe(1)
  })

  test('a long two-word name wraps to two lines before it ever shrinks', () => {
    const fit = fitRegionLabel('Aaaaaaaaaa Bbbbbbbbbb', wide, 50, 20, 10)
    expect(fit.lines.map((l) => l.text)).toEqual(['Aaaaaaaaaa', 'Bbbbbbbbbb'])
    expect(fit.shrink).toBe(1)
  })

  test('no split loses a word — the lines re-join to the title', () => {
    const fit = fitRegionLabel('Core Computer Science', wide, 50, 20, 10)
    expect(fit.lines.map((l) => l.text).join(' ')).toBe('Core Computer Science')
  })

  test('a name too big for its region shrinks to the floor instead of vanishing', () => {
    const tiny = [rect(20, 40)]
    const fit = fitRegionLabel('Aaaaaaaaaa Bbbbbbbbbb', tiny, 10, 20, 10, 0.55)
    expect(fit.lines.length).toBeGreaterThan(0)
    expect(fit.shrink).toBe(0.55)
  })

  test('lines centre on their own chord, not on the region centroid', () => {
    // anchor in the U's left arm: both lines must centre near x=5, inside it
    const fit = fitRegionLabel('Aa Bb', [U], 5, 20, 6)
    for (const l of fit.lines) {
      expect(l.x).toBeGreaterThanOrEqual(0)
      expect(l.x).toBeLessThanOrEqual(10)
    }
  })
})
