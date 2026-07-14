// Fitting a name inside a convex cell. SVG text does not wrap, so wrapping is
// ours: split the title into ≤2 lines and centre each line on the horizontal
// CHORD of the cell at that line's height — the exact room a horizontal line of
// text has there, which no inscribed-circle estimate matches.
//
// A name whose best split still overflows is DROPPED. Not every place is named
// at every scale; zooming in names it, and the hover tooltip always has it.
// force=true (the parent watermark ghost) returns its best split regardless:
// orientation text may bleed, it must not vanish.
//
// Lifted out of NestedAtlasView 2026-07-14. It is pure, it is the thing the
// deferred "labels still overlap / region text not wrapped" note is about, and
// it was sitting in the middle of a 948-line component where no test could see
// it.

import { chordAt } from './nested'
import type { Territory } from './nested'

const CHAR_W = 0.58 // ≈ average glyph width / font-size of the UI sans
const FIT = 0.88 // fraction of the chord a line may fill

export interface FitLine {
  x: number
  y: number
  text: string
}

export function fitLabel(title: string, t: Territory, fs: number, force: boolean): FitLine[] | null {
  const lh = fs * 1.12
  const wOf = (s: string) => s.length * fs * CHAR_W
  const at = (y: number, text: string) => {
    const c = chordAt(t.poly, y)
    return {
      x: c ? (c[0] + c[1]) / 2 : t.cx,
      y: y + fs * 0.35,
      text,
      over: wOf(text) - (c ? (c[1] - c[0]) * FIT : 0),
    }
  }
  const one = at(t.cy, title)
  if (one.over <= 0) return [one]

  const words = title.split(' ')
  let best: { l1: FitLine; l2: FitLine; over: number } | null = null
  for (let k = 1; k < words.length; k++) {
    const l1 = at(t.cy - lh / 2, words.slice(0, k).join(' '))
    const l2 = at(t.cy + lh / 2, words.slice(k).join(' '))
    const over = Math.max(l1.over, l2.over)
    if (!best || over < best.over) best = { l1, l2, over }
  }
  if (best && best.over <= 0) return [best.l1, best.l2]
  return force ? (best ? [best.l1, best.l2] : [one]) : null
}
