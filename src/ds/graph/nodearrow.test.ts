// OB-116 / OB-107 — the two props the map needs from `NodeArrow`, and the one
// coupling between them that can drift in silence.
//
// `shaftTailOffset` is our own addition (the DS publishes only the unscaled,
// bow-blind `ARROW_METRICS.across`), and it works by REDERIVING where the
// component puts its shaft. That is a copy of arithmetic living twelve lines
// above it, and a copy is a thing that goes stale: change `CASING_EXTRA`, or the
// `+ 3` in `across`, and the helper keeps returning the old number while every
// walk arrow on the map slides quietly off its own line. Nothing would fail.
//
// So these tests do not restate the formula — they RENDER the component and read
// the shaft's tail back out of the markup. `renderToStaticMarkup` needs no DOM,
// which is why this can live in the node-environment test run beside the rest.

import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, test } from 'vitest'

import { ARROW_METRICS, NodeArrow, shaftTailOffset } from './NodeArrow'
import type { NodeArrowProps } from './NodeArrow'

const draw = (props: NodeArrowProps) => renderToStaticMarkup(createElement(NodeArrow, props))

/** the translate the component wraps its drawing in, as [x, y] */
function padOf(svg: string): [number, number] {
  const m = svg.match(/transform="translate\(([-\d.]+),([-\d.]+)\)"/)
  if (!m) throw new Error('no wrapping translate in:\n' + svg)
  return [Number(m[1]), Number(m[2])]
}

/** where the SHAFT actually starts, in the drawing's own coordinates: the tail of
 *  the straight `<line>`, or the `M` point of the bowed `<path>`. Both are read
 *  after adding the wrapper's translate, so this is the point relative to the
 *  `<svg>`'s own origin — exactly what a host placing the drawing controls. */
function shaftTailIn(svg: string): { along: number; across: number } {
  const [px, py] = padOf(svg)
  // x1="0" is the PAINTED shaft; a casing line starts before it, at -casingBack
  const line = svg.match(/<line x1="0" y1="([-\d.]+)"/)
  if (line) return { along: px, across: Number(line[1]) + py }
  // the bowed case draws the shaft twice when cased (casing first, then paint);
  // both start at the same point, so the first M is the answer either way
  const path = svg.match(/ d="M([-\d.]+) ([-\d.]+) Q/)
  if (!path) throw new Error('no shaft found in:\n' + svg)
  return { along: Number(path[1]) + px, across: Number(path[2]) + py }
}

describe('shaftTailOffset tracks where NodeArrow really puts the shaft', () => {
  const cases: Array<[string, NodeArrowProps]> = [
    ['plain', { direction: 'right', length: 60 }],
    ['cased', { direction: 'right', length: 60, casing: true }],
    ['bowed +', { direction: 'right', length: 60, bow: 9 }],
    ['bowed -', { direction: 'right', length: 60, bow: -9 }],
    ['bowed + cased', { direction: 'right', length: 60, bow: 9, casing: true }],
    ['bowed - cased', { direction: 'right', length: 60, bow: -9, casing: true }],
    ['lighter join', { direction: 'right', length: 60, joins: 'border-2', casing: true }],
    ['borderless join', { direction: 'right', length: 60, joins: 0, bow: -6, casing: true }],
  ]
  for (const [name, props] of cases) {
    test(name, () => {
      const drawn = shaftTailIn(draw(props))
      const told = shaftTailOffset(props)
      expect(told.along).toBeCloseTo(drawn.along, 6)
      expect(told.across).toBeCloseTo(drawn.across, 6)
    })
  }
})

describe('bow', () => {
  test('the straight case is still a <line>, untouched — the DS reads its stroke-width', () => {
    const svg = draw({ direction: 'right', length: 40 })
    expect(svg).toContain('<line')
    expect(svg).toContain('shape-rendering="crispEdges"')
    expect(svg).not.toContain(' Q')
  })

  test('a bow turns the shaft into a curve and moves its midpoint by the bow', () => {
    const svg = draw({ direction: 'right', length: 40, bow: 8 })
    expect(svg).not.toContain('<line')
    const [, , ctrlY] = svg.match(/Q([-\d.]+) ([-\d.]+)/)!
    const tail = shaftTailIn(svg)
    // the CONTROL point sits a full bow off the axis; the drawn curve passes
    // half of it, which is the quadratic's own arithmetic and is what
    // walkarrow.bowedPoint models on the map's side
    expect(Number(ctrlY) + padOf(svg)[1] - tail.across).toBeCloseTo(8, 6)
  })

  test('the head follows the curve, not the axis — a bowed arrow does not point straight', () => {
    const straight = draw({ direction: 'right', length: 40 })
    const bowed = draw({ direction: 'right', length: 40, bow: 8 })
    const tipOf = (svg: string) => svg.match(/L([-\d.]+) ([-\d.]+) L/)![2]
    expect(Number(tipOf(bowed))).not.toBeCloseTo(Number(tipOf(straight)), 1)
  })

  test('the two signs are mirror images about the shaft, once the offset is applied', () => {
    const up = draw({ direction: 'right', length: 40, bow: 7 })
    const down = draw({ direction: 'right', length: 40, bow: -7 })
    const ctrl = (svg: string) => Number(svg.match(/Q([-\d.]+) ([-\d.]+)/)![2]) + padOf(svg)[1] - shaftTailIn(svg).across
    expect(ctrl(up)).toBeCloseTo(-ctrl(down), 6)
  })
})

describe('casing', () => {
  test('off by default — a chain gap draws no halo', () => {
    expect(draw({ direction: 'right', length: 40 })).not.toContain('--surface-raised')
  })

  test('on, it draws a halo behind BOTH the shaft and the head', () => {
    const svg = draw({ direction: 'right', length: 40, casing: true })
    expect(svg.split('--surface-raised').length - 1).toBe(2)
  })

  test('and it follows a bowed shaft too', () => {
    const svg = draw({ direction: 'right', length: 40, bow: 8, casing: true })
    expect(svg.split('--surface-raised').length - 1).toBe(2)
    // the halo is a curve as well, not a straight line laid under a curve
    expect(svg.match(/ Q/g)!.length).toBe(2)
  })

  test('it changes contrast, not size: the head and shaft keep their own numbers', () => {
    const bare = draw({ direction: 'right', length: 40 })
    const cased = draw({ direction: 'right', length: 40, casing: true })
    const headOf = (svg: string) => {
      const m = [...svg.matchAll(/d="M([-\d.]+) ([-\d.]+) L([-\d.]+) ([-\d.]+) L([-\d.]+) ([-\d.]+) Z"/g)]
      const last = m[m.length - 1] // the painted head is drawn after any casing
      const [, y] = padOf(svg)
      return { back: Number(last[2]) + y, tip: Number(last[4]) + y, front: Number(last[6]) + y }
    }
    const b = headOf(bare)
    const c = headOf(cased)
    expect(c.front - c.back).toBeCloseTo(b.front - b.back, 6) // same width
    expect(c.tip - shaftTailIn(cased).across).toBeCloseTo(b.tip - shaftTailIn(bare).across, 6)
    expect(cased).toContain(`stroke-width="${ARROW_METRICS.stroke}"`) // same shaft weight
  })
})
