// OB-118 point 2 — locating the toolbar's palette toggle on screen.
//
// Its own module, not `PaletteGlyph.tsx`, because a file that exports a component
// may export constants but not functions: `react-refresh/only-export-components`
// refuses the mix, and it is right to — a fast-refresh boundary should not depend
// on which of a file's exports changed.

import { wrapTip } from '@/ds'

import { PALETTE_TIP } from './PaletteGlyph'

/** FINDING THE PALETTE TOGGLE ON SCREEN — `StudioView` measures where the palette
 *  should shrink toward, and this is how it locates the button to measure.
 *
 *  Locating a button by its TOOLTIP is a bad mechanism and this is not a defence
 *  of it; it is the least-bad thing available until `Toolbar` carries a stable
 *  hook of its own (OB-118 point 2 — the DS's own item, still open on their side,
 *  and they own that API). `ToolbarItem` destructures a closed prop list and
 *  spreads nothing, so a `ref` or a `data-` attribute attached to a toolbar action
 *  is dropped before it reaches the DOM. Until that changes, the title is the only
 *  thing about the button that reaches the page.
 *
 *  WHY THIS IS A JS COMPARISON AND NOT A CSS ATTRIBUTE SELECTOR, which is what it
 *  used to be and what the DS template still does. `Toolbar` runs every title
 *  through `wrapTip`, which folds anything past 44 characters onto multiple lines.
 *  A CSS string may not contain a raw newline: `querySelector('[title="a
b"]')`
 *  does not merely fail to match, it THROWS SyntaxError, and the escaped `\A ` form
 *  does not match either (measured in Chromium, both). So the moment either tip
 *  above grew past 44 characters, the old selector took the palette animation from
 *  "silently does nothing" to "throws". Comparing the property in JS has no such
 *  rule and matches the folded string exactly.
 *
 *  Both tips are 16 characters today, so nothing folds — but that is a fact about
 *  the current copy, not a property of the code, which is precisely why this must
 *  not depend on it. */
export const titleMatcher =
  (...tips: string[]) =>
  (title: string): boolean =>
    tips.some((tip) => title === wrapTip(tip))

export const isPaletteIconTitle = titleMatcher(PALETTE_TIP.hide, PALETTE_TIP.show)

export const findPaletteIcon = (root: ParentNode = document): Element | null =>
  [...root.querySelectorAll('button[title]')].find((el) => isPaletteIconTitle((el as HTMLElement).title)) ?? null
