import { describe, it, expect } from 'vitest'
import { tidyMultiline } from '../chrome/InlineText'
import { EDIT_MARK_LIFT } from '../chrome/EditMark'
import binSource from '../sidebar/BinMark.tsx?raw'

/* OB-144 — two rules that can be asserted without a DOM.
 *
 * (b) THE TIDY ON SAVE. The field reads `innerText` back and tidies it; whether blank
 * lines survive is the whole difference `enterInserts` makes to a saved value, and the
 * done-when's check is exactly "type three blank lines between two paragraphs, blur — all
 * three are still there". The keydown half (plain Enter inserts a break) needs a browser
 * and a caret, and no caller in this app passes `enterInserts` yet, so it is not driven
 * here; the notes pane that will pass it (#267) is where that check belongs.
 *
 * (a) THE BIN'S LIFT. It is a transform on an SVG; a DOM-less test cannot measure it, but
 * it can pin that the bin reads the PUBLISHED constant rather than a retyped number —
 * which is the clause: "use the constant, never a retyped 1.4". */

describe('OB-144 (b) — the tidy on save keeps prose as typed', () => {
  const typed = 'first paragraph\n\n\n\nsecond paragraph'

  it('with enterInserts, three blank lines between two paragraphs are all still there', () => {
    expect(tidyMultiline(typed, true)).toBe('first paragraph\n\n\n\nsecond paragraph')
  })

  it('without it, the old rule stands: blank runs collapse to a single break', () => {
    expect(tidyMultiline(typed, false)).toBe('first paragraph\nsecond paragraph')
  })

  it('either way: runs of spaces collapse, each line is trimmed, the ends are trimmed', () => {
    const messy = '  \n  a   b  \n\n  c\t d  \n  '
    expect(tidyMultiline(messy, true)).toBe('a b\n\nc d')
    expect(tidyMultiline(messy, false)).toBe('a b\nc d')
  })

  it('Windows line endings are normalised before anything else', () => {
    expect(tidyMultiline('a\r\n\r\nb', true)).toBe('a\n\nb')
  })
})

describe('OB-144 (a) — the bin lifts by the pencil\'s published number', () => {
  it('EDIT_MARK_LIFT is the chosen 1.4', () => {
    expect(EDIT_MARK_LIFT).toBe(1.4)
  })

  it('BinMark reads the constant, not a retyped number', () => {
    const src = binSource.replace(/\r\n/g, '\n')
    expect(src).toContain("import { EDIT_MARK_LIFT } from '../chrome/EditMark'")
    expect(src).toContain('translateY(-${EDIT_MARK_LIFT}px)')
    expect(src).not.toMatch(/translateY\(-1\.4px\)/)
  })
})
