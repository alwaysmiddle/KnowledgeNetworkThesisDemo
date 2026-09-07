/** MEASURED LINE-FITTING for a label: wrap first, truncate once, at the end.
 *  CSS `-webkit-line-clamp` does not reliably engage everywhere this system renders, so the
 *  lines are built by MEASUREMENT — whole words while they fit, then CHARACTERS of the word
 *  that does not (a mid-word wrap is not a cut), the last line alone carrying an ellipsis with
 *  its room reserved before packing. A split that would orphan one or two characters at the
 *  head of the next line gives them back, so the fragment stays at least three long.
 *
 *  Shared by `NodeArrow`'s `fill label` and `NodeChip`'s `border-2` measured-mention mode
 *  (`path` + `maxLines`) — one function, not two that can drift. It is deliberately a HELPER
 *  FILE and not a component: it has no `.d.ts` upstream either, and a port takes it alongside
 *  whichever component imports it, exactly as `textMeasure` travels with `NodeChip`.
 *
 *  NOT `textMeasure`, and the two are not merged. That one answers HOW MANY LINES a CSS-wrapped
 *  run will take, for a box being predicted before it is laid out; this one answers WHICH WORDS
 *  go on each line, for text this system draws line by line itself. Different questions, and
 *  the DS keeps them in two files.
 *
 *  Typed port of the DS components/graph/textFit.js (contract: inline, it has none of its own),
 *  OB-101 / #253. */

/** the 1.12 factor covers canvas-vs-CSS measurement disagreement — canvas measures the glyph
 *  advance, CSS lays out with the letter-spacing and hinting of the real face, and a label
 *  fitted to the bare advance overhangs its box by a few percent. Upstream's number. */
const CSS_SLACK = 1.12

let ctx2d: CanvasRenderingContext2D | null | false = null
let family: string | null = null

/** upstream reads `document.body`'s own resolved family rather than a `--font-*` token, because
 *  the two labels this fits are body text on the page, not chrome with a face of its own. */
function fontFamily(): string {
  if (family !== null) return family
  let f = 'Nunito, sans-serif'
  if (typeof document !== 'undefined' && document.body) {
    const v = getComputedStyle(document.body).fontFamily
    if (v) f = v
  }
  family = f
  return f
}

export interface FitLinesOptions {
  /** the drawn size, in px. Default 9.5 */
  fontPx?: number
  /** measure at bold rather than the medium these labels are set in */
  bold?: boolean
  /** the ceiling on lines; the last one carries the ellipsis. Default 2 */
  maxLines?: number
  /** the box's OWN padding, deducted from `boxWidthPx` before fitting. Default 16;
   *  pass 0 to measure raw text with no box around it */
  pad?: number
}

/** wrap `text` into at most `maxLines` lines that each fit `boxWidthPx`, the last one
 *  ellipsised if anything is left over. Returns at least one string, always. */
export function fitLines(text: unknown, boxWidthPx: number, opts?: FitLinesOptions): string[] {
  const o = opts || {}
  const fontPx = o.fontPx || 9.5
  const pad = o.pad == null ? 16 : o.pad
  if (typeof document !== 'undefined' && !ctx2d) {
    try { ctx2d = document.createElement('canvas').getContext('2d') } catch { ctx2d = false }
  }
  const cx = ctx2d || null
  if (cx) cx.font = (o.bold ? '700 ' : '500 ') + fontPx + 'px ' + fontFamily()
  /* no canvas (a test, SSR): the same 0.55em average `textMeasure` falls back to, so a fit
     computed without a document is coarse rather than absent — the render still draws lines. */
  const measure = (s: string) => (cx ? cx.measureText(s).width * CSS_SLACK : s.length * fontPx * 0.55)
  const maxW = Math.max(10, (boxWidthPx || 70) - pad)
  const maxLines = o.maxLines || 2
  let rest = String(text).trim()
  const lines: string[] = []
  while (lines.length < maxLines - 1 && rest.length) {
    if (measure(rest) <= maxW) break
    const words = rest.split(' ')
    let line = ''
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i]
      if (measure(test) <= maxW) line = test
      else break
    }
    if (!line) {
      let s = ''
      for (let i = 0; i < rest.length; i++) {
        if (measure(s + rest[i]) > maxW) break
        s += rest[i]
      }
      line = s || rest[0]
      /* giving back a character or two so the fragment carried to the next line is at least
         three long: one orphaned letter against the border reads as a rendering fault. */
      const frag = (rest.slice(line.length).match(/^\S*/) || [''])[0]
      if (frag && frag.length < 3 && line.length > 3) line = line.slice(0, line.length - (3 - frag.length))
    }
    lines.push(line)
    rest = rest.slice(line.length).replace(/^\s+/, '')
  }
  if (rest.length) {
    if (measure(rest) <= maxW) {
      lines.push(rest)
    } else {
      let s = ''
      for (let i = 0; i < rest.length; i++) {
        if (measure(s + rest[i] + '…') > maxW) break
        s += rest[i]
      }
      lines.push(s.replace(/\s+$/, '') + '…')
    }
  }
  if (!lines.length) lines.push('')
  return lines
}
