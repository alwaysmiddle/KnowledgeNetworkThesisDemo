// #246 (OB-133, OB-131) — the shared parts' pure rules and the preview's geometry.

import { describe, expect, it } from 'vitest'

import { WALK_HOVER_GROW, WALK_ROW_HOVER_GROW, stopInk, stopState, walkHoverStyle } from './WalkParts'
import { PREVIEW_GAP, previewAnchor } from './WalkPreview'

describe('stopState / stopInk — one ladder for every surface', () => {
  it('behind is done, on is current, past is ahead', () => {
    expect(stopState(1, 3)).toBe('done')
    expect(stopState(3, 3)).toBe('current')
    expect(stopState(4, 3)).toBe('ahead')
  })

  it('ink follows the state', () => {
    expect(stopInk('current')).toBe('var(--text-walk)')
    expect(stopInk('done')).toBe('var(--text-2)')
    expect(stopInk('ahead')).toBe('var(--text-3)')
  })
})

describe('walkHoverStyle — the fragment that keeps the numeral from jiggling', () => {
  it('carries translateZ(0), the whole fix, and the prefix ahead of the scale', () => {
    const s = walkHoverStyle(WALK_HOVER_GROW)
    expect(s.transform).toBe('scale(1.18) translateZ(0)')
    expect(s.backfaceVisibility).toBe('hidden')
    expect(walkHoverStyle(WALK_ROW_HOVER_GROW, 'translate(-50%, 0)').transform).toBe('translate(-50%, 0) scale(1.08) translateZ(0)')
  })
})

describe('previewAnchor — a discrete hover anchors on its element', () => {
  it('centred on the box, on its top edge', () => {
    expect(previewAnchor({ left: 100, top: 40, width: 20 })).toEqual({ x: 110, top: 40 })
    expect(PREVIEW_GAP).toBe(12)
  })
})
