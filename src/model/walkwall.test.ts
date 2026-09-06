import { describe, expect, it } from 'vitest'
import { wallArrowShown, wallPinState } from './walkwall'

/* #267 (DS OB-139 rule 4) — the walk on the wall, unbanded: pins lit / done / ahead, and the
 * line through the covered stops and the lit one only. */

const pin = (step: number, stepEnd = step) => ({ step, stepEnd })

describe('wallPinState', () => {
  const wall = { lit: 3, covered: [0, 1, 2] } // stops 1–3 covered, the room looks at stop 4
  it('the lit stop is current, the covered ones done, the rest ahead', () => {
    expect(wallPinState(pin(4), wall)).toBe('current')
    expect(wallPinState(pin(2), wall)).toBe('done')
    expect(wallPinState(pin(5), wall)).toBe('ahead')
  })
  it('a pin standing for a run: current when the lit stop is inside it, done only when the whole run was covered', () => {
    expect(wallPinState(pin(3, 5), wall)).toBe('current')
    expect(wallPinState(pin(1, 3), wall)).toBe('done')
    expect(wallPinState(pin(2, 6), { lit: 8, covered: [0, 1, 2, 3] })).toBe('ahead')
  })
  it('a skip is a gap: a stop the record jumped over is ahead, not done', () => {
    const skipped = { lit: 4, covered: [0, 1, 3] } // stop 3 (index 2) was never presented
    expect(wallPinState(pin(3), skipped)).toBe('ahead')
    expect(wallPinState(pin(4), skipped)).toBe('done')
  })
})

describe('wallArrowShown — the line joins the covered stops and the lit one', () => {
  const wall = { lit: 3, covered: [0, 1, 2] }
  it('drawn between two covered stops, and into the lit one', () => {
    expect(wallArrowShown(pin(1), pin(2), wall)).toBe(true)
    expect(wallArrowShown(pin(3), pin(4), wall)).toBe(true)
  })
  it('not drawn out of the lit stop or between stops ahead', () => {
    expect(wallArrowShown(pin(4), pin(5), wall)).toBe(false)
    expect(wallArrowShown(pin(5), pin(6), wall)).toBe(false)
  })
  it('a gap in the record breaks the line', () => {
    expect(wallArrowShown(pin(2), pin(3), { lit: 4, covered: [0, 1, 3] })).toBe(false)
  })
})
