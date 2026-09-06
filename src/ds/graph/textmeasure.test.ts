import { describe, expect, it } from 'vitest'
import { canMeasure, clampToLines, linesOf, linesOfBlock, measure, wrappedLines } from './textMeasure'

/* OB-110 (#256) — the DS's one canvas predictor, shared by NodeChip and VersionedGroup. Vitest
 * runs with no document, so every number here comes from the 0.55em fallback the file promises
 * for exactly that case; what is pinned is the arithmetic and the two rules that differ between
 * the block and normal readings, not a font. */

describe('textMeasure with no document', () => {
  it('measure() falls back to 0.55em per character and says so through canMeasure()', () => {
    expect(measure('abcd', 600, 10, 'ui')).toBeCloseTo(4 * 10 * 0.55)
    expect(measure('', 600, 10, 'ui')).toBe(0)
    expect(canMeasure()).toBe(false)
  })

  it('wrappedLines() breaks at words first, and only a word wider than the column inside itself', () => {
    // each character is 5.5px at 10px: "aaaa bbbb" is 49.5px wide, each word 22px
    expect(wrappedLines('aaaa bbbb', 60, 400, 10, 'ui')).toBe(1)
    expect(wrappedLines('aaaa bbbb', 30, 400, 10, 'ui')).toBe(2)
    // a 12-char word at 66px in a 30px column takes three lines on its own
    expect(wrappedLines('aaaaaaaaaaaa', 30, 400, 10, 'ui')).toBe(3)
    expect(wrappedLines('', 30, 400, 10, 'ui')).toBe(1)
  })

  it('linesOf() reads a newline as a space; linesOfBlock() reads it as a forced break', () => {
    expect(linesOf('aa\nbb', 100, 400, 10, 'ui', 0)).toBe(1)
    expect(linesOfBlock('aa\nbb', 100, 400, 10, 'ui', 0)).toBe(2)
    expect(linesOf('', 100, 400, 10, 'ui', 0)).toBe(0)
    expect(linesOfBlock('', 100, 400, 10, 'ui', 0)).toBe(0)
    expect(linesOfBlock('a\nb\nc\nd', 100, 400, 10, 'ui', 2)).toBe(2)
  })

  it('clampToLines() returns the whole string when it fits and a "…"-ended prefix that does when not', () => {
    expect(clampToLines('short', 1, 100, 400, 10, 'ui')).toBe('short')
    const cut = clampToLines('one two three four five six seven', 1, 60, 400, 10, 'ui')
    expect(cut.endsWith('…')).toBe(true)
    expect(cut.length).toBeLessThan('one two three four five six seven'.length)
    expect(wrappedLines(cut, 60, 400, 10, 'ui')).toBe(1)
  })
})
