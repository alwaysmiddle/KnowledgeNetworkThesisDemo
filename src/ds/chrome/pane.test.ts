import { describe, it, expect } from 'vitest'
import { isHairlineRule } from './Pane'
import paneSource from './Pane.tsx?raw'

/* OB-141: the body audit must not call a hairline divider a face.
 *
 * WHY THIS TESTS A PREDICATE AND NOT THE AUDIT. `auditBody` reads `getComputedStyle` and
 * `getBoundingClientRect` off a mounted pane, and vitest runs in `node` with no DOM (jsdom is
 * not installed, and even under jsdom every rect measures 0×0, which would make EVERY child a
 * hairline and the "a real filled child still warns" case impossible to state). So the one
 * line of the audit that carries the threshold is a named, exported function, and the
 * threshold is what gets pinned here. The wiring — that the loop actually consults it before
 * the face check — is asserted from the source text, read through Vite's `?raw` import so this
 * stays an app-project test rather than a node program. */

describe('OB-141 — a rule is not a face', () => {
  it('a 1px-tall divider is a rule, so the face check skips it', () => {
    expect(isHairlineRule({ width: 320, height: 1 })).toBe(true)
  })

  it('a hairline that renders under a pixel is still a rule', () => {
    expect(isHairlineRule({ width: 320, height: 0.5 })).toBe(true)
  })

  it('a 1px-wide vertical rule is the same case turned sideways', () => {
    // OB-141's text says height OR width; the DS's .jsx reads height alone. Ported both.
    expect(isHairlineRule({ width: 1, height: 240 })).toBe(true)
  })

  it('a real filled child is NOT a rule — the face check must still reach it', () => {
    expect(isHairlineRule({ width: 320, height: 240 })).toBe(false)
    // the smallest box that is not a rule: two pixels either way
    expect(isHairlineRule({ width: 2, height: 2 })).toBe(false)
  })

  it('the audit loop consults the predicate BEFORE it reads the background', () => {
    const src = paneSource.replace(/\r\n/g, '\n')
    const loop = src.slice(src.indexOf('for (const el of bodyChrome(body))'))
    const skip = loop.indexOf('isHairlineRule(el.getBoundingClientRect())')
    const face = loop.indexOf('getComputedStyle(el).backgroundColor')
    expect(skip).toBeGreaterThan(-1)
    expect(face).toBeGreaterThan(-1)
    expect(skip).toBeLessThan(face)
  })
})
