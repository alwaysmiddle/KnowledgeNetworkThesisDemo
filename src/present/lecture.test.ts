import { describe, expect, it } from 'vitest'

import { WALKS } from '../corpus/walks'
import { byId, domainOf } from '../corpus/graph'
import { playSteps } from '../instruments/walkdesk/playback'
import { BOOKED_SECONDS, clampStop, coveredBefore, lectureStart, lectureSteps, mmss } from './lecture'

/* #267 (DS OB-135) — the pure half of presenter mode, asked directly. */

describe('mmss — the clocks', () => {
  it('pads both halves, floors, and clamps at zero', () => {
    expect(mmss(0)).toBe('00:00')
    expect(mmss(19.9)).toBe('00:19')
    expect(mmss(BOOKED_SECONDS)).toBe('50:00')
    expect(mmss(21 * 60 + 5)).toBe('21:05')
    expect(mmss(-4)).toBe('00:00')
  })
})

describe('lectureSteps — the walk being played, as the presenter reads it', () => {
  const walk = WALKS[0]
  const steps = lectureSteps(playSteps(walk, []), walk.title)
  it('one lecture stop per played step, in order, with the corpus title', () => {
    expect(steps.map((s) => s.id)).toEqual(walk.stops.map((s) => s.id))
    expect(steps[0].title).toBe(byId.get(walk.stops[0].id)!.title)
  })
  it('names the territory as the stop\'s domain and gives it the domain\'s ring hue', () => {
    for (const s of steps) {
      expect(s.territory).toBe(byId.get(domainOf(s.id))!.title)
      expect(typeof s.hue).toBe('string')
    }
  })
  it('carries the note for the slide and the walk\'s name for the foot', () => {
    expect(steps[0].note).toBe(walk.stops[0].note)
    expect(steps.every((s) => s.walk === walk.title)).toBe(true)
  })
})

describe('lectureStart / coveredBefore / clampStop', () => {
  const steps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  it('starts at the focus when it is a stop of the walk, else at the first stop', () => {
    expect(lectureStart(steps, 'b')).toBe(1)
    expect(lectureStart(steps, 'zzz')).toBe(0)
    expect(lectureStart(steps, null)).toBe(0)
    expect(lectureStart([], 'a')).toBe(0)
  })
  it('a lecture starting at stop 3 takes stops 1 and 2 as covered', () => {
    expect(coveredBefore(2)).toEqual([0, 1])
    expect(coveredBefore(0)).toEqual([])
  })
  it('clamps into the walk, and to 0 for an empty one', () => {
    expect(clampStop(5, 3)).toBe(2)
    expect(clampStop(-1, 3)).toBe(0)
    expect(clampStop(2, 0)).toBe(0)
  })
})
