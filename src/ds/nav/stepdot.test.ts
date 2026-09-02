// OB-129 — which branch a stop label takes, and OB-132's `arrival` riding in with it.
//
// The measurement half of OB-129's acceptance test lives in
// `tools/studio-spike/drive-stepdot.mjs`, because it is a measurement and jsdom
// lays nothing out. What is left for a unit test is the part a browser cannot
// reach at will: the RANGE case, which needs a corpus where some cell is crowded
// enough to draw "1-3" and today's is not, and the `arrival` blend, which has no
// caller yet and so appears on no screen.
//
// The two branches are told apart by their FACE: a circle draws fill, ring and
// dash in one `<svg>`; a pill draws a CSS border and no SVG. That distinction is
// exact at every size, which the measurement is not — the pill keeps
// `minWidth: size`, so at the rail's 28px dot two digits still fit inside the
// minimum and a broken build measures square anyway.

import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, test } from 'vitest'

import { StepDot } from './StepDot'
import type { StepDotProps } from './StepDot'

const draw = (props: StepDotProps) => renderToStaticMarkup(createElement(StepDot, props))
const isCircle = (markup: string) => markup.includes('<svg')

describe('a range is a string; a number never is', () => {
  test('two-digit stop numbers draw the circle face, not the pill', () => {
    for (const n of [10, 25, 60]) {
      for (const variant of ['rail', 'pin'] as const) {
        for (const state of ['done', 'current', 'ahead'] as const) {
          expect(isCircle(draw({ n, variant, state })), `n=${n} ${variant}/${state}`).toBe(true)
        }
      }
    }
  })

  test('single digits are unchanged, which is the control', () => {
    expect(isCircle(draw({ n: 9 }))).toBe(true)
  })

  test('a range label is still a pill — the branch exists for it', () => {
    expect(isCircle(draw({ n: '1-3' }))).toBe(false)
    expect(isCircle(draw({ n: '10-12' }))).toBe(false)
  })

  test('a ONE-character string is a circle: "5" is a label, not a range', () => {
    // the test is `length > 1`, not `typeof n === 'string'` — a caller that
    // stringifies its labels must not lose the circle for stops 1 through 9
    expect(isCircle(draw({ n: '5' }))).toBe(true)
  })

  test('the pill keeps a MINIMUM width, which is why measuring alone missed this', () => {
    // recorded so nobody weakens the driver back to a measurement: the pill only
    // outgrows the circle once its content plus padding passes `size`
    const pill = draw({ n: '1-3', size: 28 })
    expect(pill).toContain('min-width:28px')
    expect(pill).toContain('width:auto')
  })
})

describe('arrival blends the three colours and nothing else', () => {
  test('undefined draws exactly what the component always drew', () => {
    expect(draw({ n: 4, state: 'ahead' })).toBe(draw({ n: 4, state: 'ahead', arrival: undefined }))
    expect(draw({ n: 4, state: 'ahead' })).toBe(draw({ n: 4, state: 'ahead', arrival: 0 }))
  })

  test('1 lands exactly on the current look, from either direction', () => {
    const atCurrent = draw({ n: 4, state: 'current' })
    expect(draw({ n: 4, state: 'ahead', arrival: 1 })).toBe(atCurrent)
    expect(draw({ n: 4, state: 'done', arrival: 1 })).toBe(atCurrent)
  })

  test('midway is a real oklab mix, not a snap to either end', () => {
    const mid = draw({ n: 4, state: 'ahead', arrival: 0.5 })
    expect(mid).toContain('color-mix(in oklab')
    expect(mid).toContain('50%')
  })

  test('out-of-range values clamp rather than producing nonsense', () => {
    expect(draw({ n: 4, state: 'ahead', arrival: 2 })).toBe(draw({ n: 4, state: 'current' }))
    expect(draw({ n: 4, state: 'ahead', arrival: -1 })).toBe(draw({ n: 4, state: 'ahead' }))
  })

  test('geometry does not blend — an optional dash is keyed on the discrete state', () => {
    // `optional && current` shrinks the fill; a half-arrived `ahead` dot must not
    // half-shrink it. Two circles in the SVG means the shrink happened.
    const circles = (m: string) => (m.match(/<circle/g) || []).length
    expect(circles(draw({ n: 4, state: 'current', optional: true }))).toBe(3)
    expect(circles(draw({ n: 4, state: 'ahead', optional: true, arrival: 0.5 }))).toBe(2)
  })
})
