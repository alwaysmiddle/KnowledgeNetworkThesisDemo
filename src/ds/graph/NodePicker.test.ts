// #160 regression: NodePicker's menu opened off the bottom of the viewport with
// no way to scroll it into view (position:fixed absorbs no overflow). The fix
// is placeMenu()'s flip-and-cap math, pulled out of the component so this stays
// checkable without a browser — the drive-pickerviewport.mjs driver covers the
// same fix end to end, this covers the arithmetic it depends on.

import { describe, expect, test } from 'vitest'

import { placeMenu } from './NodePicker'

describe('placeMenu — #160 off-screen menu', () => {
  test('plenty of room below: no flip, full height, anchored under the trigger', () => {
    const p = placeMenu({ top: 100, bottom: 130, left: 20, width: 200 }, 950, 280)
    expect(p.up).toBe(false)
    expect(p.top).toBe(134) // bottom + 4
    expect(p.bottom).toBeUndefined()
    expect(p.maxHeight).toBe(280)
    expect(p.left).toBe(20)
    expect(p.width).toBe(200)
  })

  test('not enough room below, more room above: flips up', () => {
    // below = 500-370-8=122, above = 350-8=342 → flips, and 342 > 280 so no cap bites
    const p = placeMenu({ top: 350, bottom: 370, left: 0, width: 200 }, 500, 280)
    expect(p.up).toBe(true)
    expect(p.top).toBeUndefined()
    expect(p.bottom).toBe(154) // viewportHeight - anchor.top + 4
    expect(p.maxHeight).toBe(280)
  })

  test('flips up AND still needs the cap — flipping alone does not fix it', () => {
    // below = 300-180-8=112, above = 160-8=152: flips (152>112), but 152 < menuMaxHeight
    const p = placeMenu({ top: 160, bottom: 180, left: 0, width: 200 }, 300, 280)
    expect(p.up).toBe(true)
    expect(p.maxHeight).toBe(152) // capped to available room, not the full 280
  })

  test('#160 exact shape: room below is short of the menu but flipping would not help — stays down, cap saves it', () => {
    // below = 500-260-8=232, above = 240-8=232: tied, so it does NOT flip (up requires
    // above STRICTLY greater than below) — this is the case the commit measured, where
    // the DS's unconditional `rect.bottom + 4` with no cap would have rendered a 280px
    // menu into 232px of room and run 48px off the bottom of the viewport.
    const p = placeMenu({ top: 240, bottom: 260, left: 0, width: 200 }, 500, 280)
    expect(p.up).toBe(false)
    expect(p.top).toBe(264)
    expect(p.maxHeight).toBe(232)
  })

  test('floors at 120 rather than collapsing to a sliver', () => {
    const p = placeMenu({ top: 95, bottom: 105, left: 0, width: 200 }, 200, 280)
    expect(p.maxHeight).toBe(120)
  })

  test('never caps above the caller-supplied menuMaxHeight', () => {
    const p = placeMenu({ top: 10, bottom: 20, left: 0, width: 200 }, 5000, 280)
    expect(p.maxHeight).toBe(280)
  })
})
