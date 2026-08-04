// The FloatingPanel core (#76). The geometry is pure and runs in node like the
// rest of the model layer; persistence needs a `localStorage`, so a tiny
// in-memory stub stands in — we keep the node environment (fast, DOM-free) and
// only fake the one global these two functions touch.

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { clampInside, drag, loadRect, resize, saveRect } from './floatingPanelRect'
import type { Bounds, Rect, SizeLimits } from './floatingPanelRect'

const HOST: Bounds = { w: 100, h: 100 }
const LIM: SizeLimits = { minW: 10, minH: 10 }

describe('clampInside — slide a panel back into its host, never resize it', () => {
  test('a rect already inside is untouched', () => {
    expect(clampInside({ x: 5, y: 5, w: 20, h: 10 }, HOST)).toEqual({ x: 5, y: 5, w: 20, h: 10 })
  })

  test('an off-the-left/top corner pins to 0 without changing size', () => {
    expect(clampInside({ x: -8, y: -3, w: 20, h: 10 }, HOST)).toEqual({ x: 0, y: 0, w: 20, h: 10 })
  })

  test('past the right/bottom wall it backs off by its own width/height', () => {
    expect(clampInside({ x: 95, y: 96, w: 20, h: 10 }, HOST)).toEqual({ x: 80, y: 90, w: 20, h: 10 })
  })

  test('a panel bigger than the host on an axis pins to 0 there (repositioning cannot fit it)', () => {
    expect(clampInside({ x: 40, y: 5, w: 200, h: 10 }, HOST)).toEqual({ x: 0, y: 5, w: 200, h: 10 })
  })
})

describe('drag — move by a pointer delta, then clamp', () => {
  test('a free move adds the delta', () => {
    expect(drag({ x: 10, y: 10, w: 20, h: 20 }, 5, -4, HOST)).toEqual({ x: 15, y: 6, w: 20, h: 20 })
  })

  test('a move into the wall stops at the wall', () => {
    expect(drag({ x: 70, y: 10, w: 20, h: 20 }, 1000, 0, HOST)).toEqual({ x: 80, y: 10, w: 20, h: 20 })
  })
})

describe('resize — grabbed edge follows the pointer, opposite edge is the anchor', () => {
  const base: Rect = { x: 20, y: 20, w: 30, h: 30 } // right=50, bottom=50

  test('east edge grows/shrinks width only', () => {
    expect(resize(base, 'e', 5, 0, LIM, HOST)).toEqual({ x: 20, y: 20, w: 35, h: 30 })
    expect(resize(base, 'e', -5, 0, LIM, HOST)).toEqual({ x: 20, y: 20, w: 25, h: 30 })
  })

  test('south edge grows/shrinks height only', () => {
    expect(resize(base, 's', 0, 7, LIM, HOST)).toEqual({ x: 20, y: 20, w: 30, h: 37 })
  })

  test('west edge moves x and inversely changes width; the right edge stays at 50', () => {
    expect(resize(base, 'w', -5, 0, LIM, HOST)).toEqual({ x: 15, y: 20, w: 35, h: 30 })
    expect(resize(base, 'w', 5, 0, LIM, HOST)).toEqual({ x: 25, y: 20, w: 25, h: 30 })
  })

  test('north edge moves y and inversely changes height; the bottom stays at 50', () => {
    expect(resize(base, 'n', 0, -6, LIM, HOST)).toEqual({ x: 20, y: 14, w: 30, h: 36 }) // n reads dy
  })

  test('minimum width caps how far the east edge can shrink', () => {
    expect(resize(base, 'e', -1000, 0, LIM, HOST)).toEqual({ x: 20, y: 20, w: 10, h: 30 })
  })

  test('minimum width caps the moving west edge — x stops at right-minW, width at minW', () => {
    // right=50, minW=10 → x can reach 40, width bottoms out at 10
    expect(resize(base, 'w', 1000, 0, LIM, HOST)).toEqual({ x: 40, y: 20, w: 10, h: 30 })
  })

  test('the west edge cannot pass x=0 — it pins to the wall and width spans to the anchor', () => {
    expect(resize(base, 'w', -1000, 0, LIM, HOST)).toEqual({ x: 0, y: 20, w: 50, h: 30 })
  })

  test('the east edge cannot pass the host wall — width tops out at host.w - x', () => {
    expect(resize(base, 'e', 1000, 0, LIM, HOST)).toEqual({ x: 20, y: 20, w: 80, h: 30 })
  })

  test('a corner moves both axes at once', () => {
    expect(resize(base, 'se', 5, 8, LIM, HOST)).toEqual({ x: 20, y: 20, w: 35, h: 38 })
    expect(resize(base, 'nw', -5, -5, LIM, HOST)).toEqual({ x: 15, y: 15, w: 35, h: 35 })
  })
})

describe('persistence — namespaced, defensive, never throws', () => {
  const FALLBACK: Rect = { x: 1, y: 2, w: 30, h: 40 }

  beforeEach(() => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  test('a saved rect round-trips', () => {
    const r: Rect = { x: 12, y: 34, w: 200, h: 150 }
    saveRect('toolbox', r)
    expect(loadRect('toolbox', FALLBACK)).toEqual(r)
  })

  test('nothing stored yields the fallback anchor', () => {
    expect(loadRect('never-saved', FALLBACK)).toEqual(FALLBACK)
  })

  test('two ids do not collide', () => {
    saveRect('a', { x: 1, y: 1, w: 10, h: 10 })
    saveRect('b', { x: 9, y: 9, w: 90, h: 90 })
    expect(loadRect('a', FALLBACK)).toEqual({ x: 1, y: 1, w: 10, h: 10 })
    expect(loadRect('b', FALLBACK)).toEqual({ x: 9, y: 9, w: 90, h: 90 })
  })

  test('corrupt JSON falls back instead of throwing', () => {
    localStorage.setItem('pkt.floating-panel.bad', 'not json {')
    expect(loadRect('bad', FALLBACK)).toEqual(FALLBACK)
  })

  test('a wrong-shape object falls back', () => {
    localStorage.setItem('pkt.floating-panel.partial', JSON.stringify({ x: 1, y: 2 }))
    expect(loadRect('partial', FALLBACK)).toEqual(FALLBACK)
  })

  test('a non-positive size falls back (a zero/negative panel is junk)', () => {
    localStorage.setItem('pkt.floating-panel.flat', JSON.stringify({ x: 1, y: 2, w: 0, h: 40 }))
    expect(loadRect('flat', FALLBACK)).toEqual(FALLBACK)
  })
})
