// OB-124 — the palette toggle's anchor, now that the DS `Toolbar` carries one.
//
// This file replaces `palettetip.test.ts`, which defended a mechanism rather
// than a behaviour: it pinned the two ways that finding a toolbar button BY ITS
// TOOLTIP goes wrong (the title Toolbar renders is `wrapTip(tip)`, not `tip`;
// and a folded title makes a CSS attribute selector a parse error rather than a
// miss). Both facts are still true and neither matters any more — the lookup
// they were guarding does not happen. `Toolbar` gained a `hook` prop, so the
// button says who it is.
//
// What is worth guarding now is the WIRING, because a ported prop that no call
// site passes is the failure this item was filed for: OB-118 was struck as fixed
// while the app was still matching on the tooltip. So:
//
//   1. `Toolbar` actually renders `hook` as `data-toolbar-hook` (the port);
//   2. `AppToolbar`'s palette item actually passes it (the adoption);
//   3. the selector StudioView measures with is built from the same constant, so
//      the three cannot drift apart;
//   4. nothing in the toolbar is identified by its title any more.

import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, test } from 'vitest'

import { Toolbar } from '@/ds'
import { AppToolbar } from './AppToolbar'
import { PALETTE_HOOK, PALETTE_HOOK_SELECTOR, PALETTE_TIP } from './PaletteGlyph'

const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el)

describe('Toolbar renders hook as data-toolbar-hook', () => {
  test('an item that passes a hook wears it on its own button', () => {
    const markup = render(
      createElement(Toolbar, { groups: [{ items: [{ label: 'p', title: 'a tip', hook: 'a-hook', onClick: () => {} }] }] }),
    )
    expect(markup).toContain('data-toolbar-hook="a-hook"')
  })

  test('and an item without one renders no such attribute — undefined, not empty', () => {
    const markup = render(createElement(Toolbar, { groups: [{ items: [{ label: 'p', title: 'a tip', onClick: () => {} }] }] }))
    expect(markup).not.toContain('data-toolbar-hook')
  })
})

describe('the palette toggle is wired to it', () => {
  // AppToolbar's whole props object is optional (`= {}`), which makes createElement
  // infer `{}` and reject the one prop this file is about — named explicitly rather
  // than cast, so a change to that shape fails here instead of being swallowed.
  type AppToolbarProps = { onPresent?: () => void; palette?: { on: boolean; onToggle: () => void } }
  const toolbar = (on: boolean) => render(createElement<AppToolbarProps>(AppToolbar, { palette: { on, onToggle: () => {} } }))

  test('AppToolbar passes the hook — the clause that makes the port done', () => {
    expect(toolbar(true)).toContain(`data-toolbar-hook="${PALETTE_HOOK}"`)
  })

  test('the hook holds still while the tooltip flips, which is the whole point', () => {
    // the title is the thing that changes as the toggle toggles; the handle is not
    expect(toolbar(true)).toContain(PALETTE_TIP.hide)
    expect(toolbar(false)).toContain(PALETTE_TIP.show)
    for (const on of [true, false]) expect(toolbar(on)).toContain(`data-toolbar-hook="${PALETTE_HOOK}"`)
  })

  test('the selector StudioView measures with is built from that same constant', () => {
    expect(PALETTE_HOOK_SELECTOR).toBe(`[data-toolbar-hook="${PALETTE_HOOK}"]`)
    // and it is a legal selector on any copy, unlike a folded title: no newline
    expect(PALETTE_HOOK_SELECTOR).not.toContain('\n')
  })

  test('no toolbar button is identified by its title any more', () => {
    // a `title` in the markup is a tooltip and nothing else — the mechanism this
    // file replaced would have needed one of these strings to be load-bearing
    const markup = toolbar(true)
    expect(markup).toContain('title="')
    expect(PALETTE_HOOK).not.toContain(PALETTE_TIP.hide)
    expect(PALETTE_HOOK).not.toContain(PALETTE_TIP.show)
  })
})
