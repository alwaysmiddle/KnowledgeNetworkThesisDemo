// OB-032 — `wrapTip` folds every tooltip in the system, so its rules are worth
// pinning. Each one below was learned from a defect rather than chosen, and the
// two that look like over-engineering are the two that were shipped wrong first:
// leaving a long unbroken run whole, and folding a string that did not need it.
//
// `useClipped` is NOT tested here. It measures `scrollWidth`/`clientWidth` on a
// laid-out element, which this suite's `node` environment has no way to produce —
// a jsdom stub would return 0 for both and assert nothing but the stub. It is
// checked in a real browser instead (tools/studio-spike/drive-tooltips.mjs).

import { describe, expect, it } from 'vitest'

import { wrapTip } from './chrome/IconButton'

const MEASURE = 44

describe('wrapTip — short strings come back untouched', () => {
  it('returns a short string as itself', () => {
    expect(wrapTip('close')).toBe('close')
    expect(wrapTip('drag to resize · double-click to reset')).toBe('drag to resize · double-click to reset')
  })

  it('is a no-op at exactly the measure, and folds at one over', () => {
    // the boundary is the whole reason this can be applied at EVERY title= with no
    // judgement at the call site — so it is asserted, not assumed
    const exact = 'a'.repeat(MEASURE)
    expect(wrapTip(exact)).toBe(exact)
    expect(wrapTip('a'.repeat(MEASURE + 1))).toContain('\n')
  })

  it('trims, and returns undefined rather than empty for an absent or empty string (OB-047)', () => {
    expect(wrapTip('  padded  ')).toBe('padded')
    expect(wrapTip(undefined)).toBe(undefined)
    expect(wrapTip(null)).toBe(undefined)
    expect(wrapTip('')).toBe(undefined)
    expect(wrapTip('   ')).toBe(undefined)
  })
})

describe('wrapTip — folding', () => {
  const LONG =
    'Everything the browser does before the first byte of the page comes back to it'

  it('breaks on word boundaries and never exceeds the measure', () => {
    const lines = wrapTip(LONG)!.split('\n')
    expect(lines.length).toBeGreaterThan(1)
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(MEASURE)
    // nothing is lost or invented — the fold adds line breaks and nothing else
    expect(lines.join(' ')).toBe(LONG)
  })

  it('takes a measure of its own', () => {
    for (const line of wrapTip(LONG, 20)!.split('\n')) expect(line.length).toBeLessThanOrEqual(20)
  })

  it('cuts an unbroken run rather than leaving one screen-wide line', () => {
    // the DS shipped this as an exception first, reasoning that a break inside a
    // word misreports the string. A 60-character run then drew exactly the line
    // the function exists to prevent, so the exception swallowed the rule — and a
    // NAME is where such a run turns up (a pasted id, a typo, a URL).
    const run = 'x'.repeat(60)
    const lines = wrapTip(run)!.split('\n')
    expect(lines).toEqual(['x'.repeat(44), 'x'.repeat(16)])
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(MEASURE)
  })

  it('keeps a long run on its own lines without swallowing its neighbours', () => {
    const lines = wrapTip('see ' + 'y'.repeat(50) + ' now')!.split('\n')
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(MEASURE)
    expect(lines.join(' ').replace(/\s+/g, ' ')).toContain('see')
    expect(lines.join('').includes('y'.repeat(44))).toBe(true)
  })

  it('collapses the whitespace it folds on, so a newline in the source is not doubled', () => {
    const lines = wrapTip('one\ntwo three four five six seven eight nine ten eleven')!.split('\n')
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(MEASURE)
    expect(lines[0].startsWith('one two')).toBe(true)
  })
})
