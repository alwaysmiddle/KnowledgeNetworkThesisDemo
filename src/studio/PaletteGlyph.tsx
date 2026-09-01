import type { CSSProperties } from 'react'

/** The toolbar's palette-and-brush mark — the one control that brings the palette
 *  pane back once it has been closed (OB-104).
 *
 *  IT LIVES HERE, NOT IN `src/ds/`, AND THAT IS DELIBERATE. The DS authors this
 *  glyph inside `templates/studio/StudioApp.jsx` — its own host screen — not as a
 *  `components/chrome/*.jsx` export with a `.d.ts` contract. `src/ds/**` mirrors the
 *  DS's published components; a mark that exists only in the DS's template is host
 *  code on both sides, so it is transcribed into the host here. If the DS ever
 *  promotes it to `components/chrome/PaletteMark.jsx`, this file is what gets
 *  deleted in favour of the vendored one.
 *
 *  Drawn as a LINE glyph on purpose: it sits in a Toolbar group beside Unicode
 *  glyphs (↶ ↷ ✂) and the drawn marks, so it takes the same 1.5px stroke and
 *  `currentColor` as they do — no fill anywhere but the four paint wells, which are
 *  the only solid shapes in it. */
export interface PaletteGlyphProps {
  size?: number
  style?: CSSProperties
}

export function PaletteGlyph({ size = 17, style }: PaletteGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', ...style }}
    >
      <g transform="translate(0.3,0.4) scale(1.09)">
        <path d="M9.2 2.6c3.9 0 7 2.6 7 5.9 0 2-1.6 3-3.1 3h-1.3c-.9 0-1.6.7-1.6 1.6 0 .4.1.7.3 1 .2.3.3.6.3 1 0 .9-.7 1.5-1.6 1.5-3.9 0-7-3.1-7-7s3.1-7 7-7Z" />
        <circle cx="5.9" cy="6.6" r="1" fill="currentColor" stroke="none" />
        <circle cx="9.4" cy="5.2" r="1" fill="currentColor" stroke="none" />
        <circle cx="12.6" cy="7.2" r="1" fill="currentColor" stroke="none" />
        <circle cx="4.9" cy="10.3" r="1" fill="currentColor" stroke="none" />
      </g>
      <path d="M18.7 1.8 12.7 7.8" strokeWidth="1.3" />
      <path d="M12.4 8.2 11.7 8.9" strokeWidth="2.2" />
      <path d="M11.2 9.5Q9.8 11.2 9 13.1 10.8 12.3 12 10.6Z" fill="currentColor" strokeWidth="0.9" />
    </svg>
  )
}

/** The two titles the palette toggle carries. They are copy, and nothing may
 *  locate the button by them: the tooltip changes as the toggle flips, and past
 *  `wrapTip`'s 44 characters it FOLDS, which no CSS attribute selector can
 *  express. Find the button by `PALETTE_HOOK` instead (OB-124). */
export const PALETTE_TIP = { hide: 'hide the palette', show: 'show the palette' } as const

/** The palette toggle's stable handle, passed as the DS `Toolbar` item's `hook`
 *  and reaching the DOM as `data-toolbar-hook`. One constant, so the toolbar,
 *  the animation that measures off the button, and the drivers all name the
 *  same string. */
export const PALETTE_HOOK = 'palette-toggle'

/** The selector that finds it — the whole of what `paletteanchor.ts` used to be. */
export const PALETTE_HOOK_SELECTOR = `[data-toolbar-hook="${PALETTE_HOOK}"]`
