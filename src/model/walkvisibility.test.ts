import { describe, it, expect } from 'vitest'
import { toggleWalkHidden, walkDrawn, walkKeyOf } from './walkvisibility'

/* OB-134 clause 4 (#252): hidden survives seek, playback, zoom and a level change, and a
 * change of walk shows the new walk without a click. The first four are true by
 * construction — none of them touches the set — so the cases here are the ones that
 * DO touch it: the click, and the walk changing under it. */

describe('the visibility eye hides the walk it is looking at, per walk', () => {
  const none: ReadonlySet<string> = new Set()

  it('every walk is drawn until the eye has hidden it', () => {
    expect(walkDrawn(none, 'a')).toBe(true)
    expect(walkDrawn(none, 'draft')).toBe(true)
  })

  it('the click hides the walk on screen and no other', () => {
    const hidden = toggleWalkHidden(none, 'a')
    expect(walkDrawn(hidden, 'a')).toBe(false)
    expect(walkDrawn(hidden, 'b')).toBe(true)
  })

  it('THE CLAUSE: switching to another walk shows that walk, with no click', () => {
    const hidden = toggleWalkHidden(none, 'a')
    // the walk changes; the set does not
    expect(walkDrawn(hidden, 'b')).toBe(true)
  })

  it('and it is per-walk state: coming back to the hidden walk finds it hidden', () => {
    const hidden = toggleWalkHidden(none, 'a')
    expect(walkDrawn(hidden, 'a')).toBe(false)
  })

  it('the click again shows it, at whatever position the walk is now at', () => {
    const hidden = toggleWalkHidden(toggleWalkHidden(none, 'a'), 'a')
    expect(walkDrawn(hidden, 'a')).toBe(true)
  })

  it('the draft has a seat in the same set', () => {
    expect(walkKeyOf(null)).toBe('draft')
    expect(walkKeyOf({ walkId: 'w1' })).toBe('w1')
    const hidden = toggleWalkHidden(none, walkKeyOf(null))
    expect(walkDrawn(hidden, 'draft')).toBe(false)
    expect(walkDrawn(hidden, 'w1')).toBe(true)
  })

  it('state, never mutated in place', () => {
    const before = new Set(['a'])
    const after = toggleWalkHidden(before, 'b')
    expect(before.has('b')).toBe(false)
    expect(after.has('a') && after.has('b')).toBe(true)
  })
})
