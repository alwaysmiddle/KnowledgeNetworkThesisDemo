import type { CSSProperties } from 'react'

/** The fifth drawn mark, joining the caret, the bin, the live-version check and the
 *  restore mark — reserved as OB-036 since 2026-08-19, when the owner ruled out a typed
 *  `◇` on any control with no word: a glyph nobody already knows, alone, teaches nothing.
 *  `◇` is retired everywhere it stood in for this meaning. A circle is already load-bearing
 *  vocabulary (`●`/`○`, `Bullet`, `DomainDot`), so a bare circle could not be reused for a
 *  different meaning without a collision — the `?` inside is what makes this mark its own
 *  shape rather than a state light wearing a new job. Built from a border (not an SVG),
 *  same weight as `Caret`/`Check` — `?` is plain Latin punctuation with a real glyph in
 *  every font, so unlike the bin there is no emoji-fallback risk in typing it.
 *
 *  Centred with an invisible text anchor plus an absolutely-positioned SVG overlay, not
 *  flex alignment and not CSS `text-align` alone: a nested flex container offers a
 *  `baseline`-aligned parent no true baseline (falls back to its bottom margin edge, which
 *  is what made this mark sit below the text beside it), and `text-align: center` centres
 *  the `?` character's ADVANCE box, which this font does not centre its ink within (the
 *  mark then reads visibly off-centre even though the CSS is "correct"). The invisible
 *  same-font `?` keeps a real text baseline for the element to offer its `baseline`-aligned
 *  parent; the SVG `<text>` overlay centres the visible glyph on its own real metrics
 *  (`text-anchor="middle"` + `dominant-baseline="central"`), which CSS text layout has no
 *  equivalent for.
 *
 *  Dashed, not solid — the house rule is "dashed always means conditional" (readme.md),
 *  the same reason a `NodeChip`'s own border dashes when `optional` is set; a solid circle
 *  would contradict that convention on its own mark. Drawn as an SVG `stroke-dasharray`
 *  ring, not a CSS `border-style: dashed` circle — the CSS version renders unevenly at
 *  this size (bunched, uneven-length dashes vary by browser). Ring weight is 1px, thinner
 *  than `Caret`/`Check`'s 1.5px — a dashed stroke reads heavier than a solid one at the
 *  same weight, so it needed to drop a notch to match. Dash segments are shorter than the
 *  gaps between them (0.14 / 0.22 of the size), not equal — equal-length dashes read too
 *  heavy at this scale.
 *
 *  Typed port of the DS OptionalMark.jsx (contract: OptionalMark.d.ts). */
export interface OptionalMarkProps {
  /** scales the whole mark (circle + the `?`'s font-size together, proportionally).
   *  CONTRACT GAP: the DS's own .d.ts prose says the default is 12 ("matches the house
   *  glyph slot next to --fs-caption text"); the .jsx it ships actually defaults to 14.
   *  Ported from the .jsx, per the DS's own rule that the .jsx is the truth — reported
   *  rather than silently split the difference. */
  size?: number
  /** merged into the mark's own inline style — position, margin. Not the ring or the
   *  glyph: those are the component's */
  style?: CSSProperties
}

export function OptionalMark({ size = 14, style }: OptionalMarkProps) {
  const fs = Math.round(size * 0.58)
  const r = size / 2 - 1
  const dashLen = Math.round(size * 0.14)
  const gapLen = Math.round(size * 0.22)
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, lineHeight: size + 'px', ...style }}>
      {/* invisible — establishes this span's own text baseline (same font, same size),
          so it aligns correctly against sibling label text. Never removed: without it
          this element has no baseline to offer and falls back to its bottom margin
          edge, which is the bug this whole construction avoids. */}
      <span aria-hidden="true" style={{ color: 'transparent' }}>?</span>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray={dashLen + ' ' + gapLen}
          strokeLinecap="round"
        />
        <text x="50%" y="52%" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-ui)" fontWeight="700" fontSize={fs} fill="currentColor">
          ?
        </text>
      </svg>
    </span>
  )
}
