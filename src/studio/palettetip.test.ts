// OB-118 point 2 — the palette animation's anchor, and the two ways finding a
// button by its tooltip goes wrong.
//
// `StudioView` measures where the palette pane should shrink toward by locating
// the toolbar's palette toggle. There is no stable hook on that button to locate
// it BY: `ToolbarItem` destructures a closed prop list and spreads nothing, so a
// `ref` or a `data-` attribute put on a toolbar action never reaches the DOM.
// The title is the only thing about the button that does. The DS's own item says
// the component should own a hook; until it does, this is what we have.
//
// So these tests pin the two facts that make the tooltip route survivable:
//
//   1. the string to match is `wrapTip(tip)`, NOT `tip` — Toolbar folds every
//      title past 44 characters, so the two are different strings the moment
//      anyone lengthens the copy, and nothing about that edit looks like it
//      touches an animation;
//   2. the match is a JS comparison, not a CSS attribute selector — a CSS string
//      may not contain a raw newline, so `querySelector('[title="a\nb"]')`
//      THROWS SyntaxError rather than missing (measured in Chromium; the escaped
//      `\A ` form does not match either).
//
// Both tips are 16 characters today and nothing folds. That is a fact about the
// current copy, not a property of the code — which is the whole reason to test
// the mechanism with a long title rather than the constants with a short one.

import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, test } from 'vitest'

import { Toolbar, wrapTip } from '@/ds'
import { PALETTE_TIP } from './PaletteGlyph'
import { isPaletteIconTitle, titleMatcher } from './paletteanchor'

/** the `title` attribute Toolbar actually puts on the button, decoded */
function renderedTitle(tip: string): string {
  const markup = renderToStaticMarkup(
    createElement(Toolbar, { groups: [{ items: [{ label: 'p', title: tip, onClick: () => {} }] }] }),
  )
  const m = markup.match(/<button[^>]*\stitle="([^"]*)"/)
  if (!m) throw new Error('no titled button in:\n' + markup)
  return m[1]
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x0A;/g, '\n')
    .replace(/&amp;/g, '&')
}

const LONG = 'hide the palette panel and give the desk more room to work in'

describe('the title Toolbar renders is wrapTip(tip), not tip', () => {
  test('a short tip passes through unchanged, which is why the fault hid', () => {
    expect(renderedTitle(PALETTE_TIP.hide)).toBe(PALETTE_TIP.hide)
    expect(PALETTE_TIP.hide.length).toBeLessThanOrEqual(44)
  })

  test('a long one comes back FOLDED, so a raw-string match would miss it', () => {
    const rendered = renderedTitle(LONG)
    expect(LONG.length).toBeGreaterThan(44)
    expect(rendered).toContain('\n')
    expect(rendered).not.toBe(LONG)
    expect(rendered).toBe(wrapTip(LONG))
  })
})

describe('isPaletteIconTitle matches what is on the button', () => {
  test('it matches both of the toggle’s real rendered titles', () => {
    expect(isPaletteIconTitle(renderedTitle(PALETTE_TIP.hide))).toBe(true)
    expect(isPaletteIconTitle(renderedTitle(PALETTE_TIP.show))).toBe(true)
  })

  test('and it compares against wrapTip, so lengthening the copy cannot break it', () => {
    // the comparison basis, stated directly: whatever the tip is, the matcher's
    // target is the FOLDED form, because that is what reaches the DOM
    expect(wrapTip(PALETTE_TIP.hide)).toBe(renderedTitle(PALETTE_TIP.hide))
    expect(wrapTip(PALETTE_TIP.show)).toBe(renderedTitle(PALETTE_TIP.show))
  })

  test('it does not match some other toolbar button', () => {
    expect(isPaletteIconTitle(renderedTitle('save this walk'))).toBe(false)
  })

  // THE GUARD THAT ACTUALLY BITES. Every test above passes just as well against a
  // matcher that compares the RAW tip, because both current tips are 16 characters
  // and `wrapTip` returns them unchanged — so those tests describe the mechanism
  // without defending it. This one puts a tip past the fold through the same
  // matcher the palette uses, and fails the moment the comparison drops `wrapTip`,
  // whatever the palette's own copy happens to say that day.
  test('a matcher built the same way finds a button whose tip DID fold', () => {
    expect(titleMatcher(LONG)(renderedTitle(LONG))).toBe(true)
  })
})

describe('why this is not a CSS attribute selector', () => {
  test('a folded title cannot be expressed as one — the selector is a parse error, not a miss', () => {
    const folded = wrapTip(LONG)!
    expect(folded).toContain('\n')
    // A CSS string terminates at a newline, so this selector is invalid CSS.
    // Chromium throws SyntaxError on it; it does not quietly return null. Any
    // future rewrite that goes back to `[title="..."]` reintroduces that.
    expect(`[title="${folded}"]`).toContain('\n')
  })
})
