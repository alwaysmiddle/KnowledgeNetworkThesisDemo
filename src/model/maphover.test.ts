// The map's hover rule, asserted directly (OB-127, #251).
//
// The obligation's done-when is behavioural — "hovering a tree row or a
// connections row highlights the matching territory and draws no tooltip there"
// — and this repo has no way to render a React component in a test: vitest runs
// in `node`, with no DOM and no testing-library. The same wall was hit on OB-128,
// and the answer there was the one taken here: lift the decision out of the
// component into a pure function, and assert the rule instead of a screenshot.
//
// The first two cases below ARE the done-when. The rest exist because the two
// hovers have to stay distinguishable when the next obligation adds a third
// (OB-131's walk preview, #246).

import { describe, expect, test } from 'vitest'

import { hoverMarks } from './maphover'
import type { HoverSources } from './maphover'

/** nothing hovered, nothing selected — every case below is this plus one thing. */
const NOTHING: HoverSources = {
  cursorCell: null,
  selectedCell: null,
  publishedCell: null,
  lookedAtCell: null,
  onRelation: false,
}

describe('the card belongs to the cursor over THIS pane', () => {
  test('our own hover lights nothing extra and gets a node card', () => {
    const marks = hoverMarks({ ...NOTHING, cursorCell: 'topic-a' })

    expect(marks.card).toEqual({ kind: 'node', id: 'topic-a' })
    // our own hover draws the dashed preselect, which is not this function's
    // business; what matters is that it does not ALSO spotlight itself
    expect(marks.spotlightId).toBeNull()
  })

  test('a hover published by another pane lights the territory and draws NO card', () => {
    const marks = hoverMarks({ ...NOTHING, publishedCell: 'topic-a' })

    expect(marks.spotlightId).toBe('topic-a')
    expect(marks.card).toBeNull()
  })

  test('a cell clicked in another pane stays lit, and it draws no card either', () => {
    const marks = hoverMarks({ ...NOTHING, lookedAtCell: 'topic-b' })

    expect(marks.spotlightId).toBe('topic-b')
    expect(marks.card).toBeNull()
  })

  test('nothing hovered anywhere draws neither', () => {
    expect(hoverMarks(NOTHING)).toEqual({ spotlightId: null, card: null })
  })
})

describe('the two sources stay separable', () => {
  test('our cursor and a published hover at once: one card, and it is ours', () => {
    const marks = hoverMarks({ ...NOTHING, cursorCell: 'topic-a', publishedCell: 'topic-b' })

    expect(marks.spotlightId).toBe('topic-b')
    expect(marks.card).toEqual({ kind: 'node', id: 'topic-a' })
  })

  test('our own hover echoing back off the bus is not spotlit on top of itself', () => {
    const marks = hoverMarks({ ...NOTHING, cursorCell: 'topic-a', publishedCell: 'topic-a' })

    expect(marks.spotlightId).toBeNull()
    expect(marks.card).toEqual({ kind: 'node', id: 'topic-a' })
  })

  test('a look at the already-selected cell stands aside for the selection', () => {
    const marks = hoverMarks({ ...NOTHING, selectedCell: 'topic-c', lookedAtCell: 'topic-c' })

    expect(marks.spotlightId).toBeNull()
  })

  test('a live published hover outranks a stale look', () => {
    const marks = hoverMarks({ ...NOTHING, publishedCell: 'topic-a', lookedAtCell: 'topic-b' })

    expect(marks.spotlightId).toBe('topic-a')
  })
})

describe('a relation under the pointer wins the card', () => {
  test('on a relation line over a cell, the card reports the relation', () => {
    const marks = hoverMarks({ ...NOTHING, cursorCell: 'topic-a', onRelation: true })

    expect(marks.card).toEqual({ kind: 'relation' })
  })

  test('a relation hover is still a cursor hover, so a published one cannot fake it', () => {
    const marks = hoverMarks({ ...NOTHING, publishedCell: 'topic-a', onRelation: false })

    expect(marks.card).toBeNull()
  })
})
