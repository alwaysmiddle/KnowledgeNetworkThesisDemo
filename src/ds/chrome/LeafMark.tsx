import leafUrl from '../assets/leaf-mask.png'

/** The house brand motif: a hand-drawn wavy leaf. This is a REAL DRAWN ASSET, not
 *  a generated shape — the first hand-drawn material in the system, and the thing
 *  that gives the palette its warmth. Do not redraw it in SVG, do not trace it, do
 *  not "clean it up": the wobble in the line is the point.
 *
 *  The artwork is drawn ALREADY CROPPED — the blade runs off the right edge of its
 *  own canvas, with empty space at the left and bottom — so it is meant to be
 *  anchored into a corner and clipped, not centred in a box.
 *
 *  The PNG is used as a MASK and painted with a token colour rather than shown
 *  directly. That keeps the drawn line exactly as it was while letting the system
 *  control its weight, and it means the motif inherits the palette instead of
 *  pinning one hard-coded green. It is painted in --moss-600, the SAME green as
 *  the wordmark, held back with opacity rather than with a paler swatch: there is
 *  one brand green, and the motif is quieter because it is more transparent.
 *
 *  It is a MOTIF, not an icon: decorative, non-interactive, carries no state, and
 *  the closest thing the system has to a mark (there is no logo file). Keep it
 *  quiet — one per surface, cropped by its container.
 *
 *  Port of DS components/chrome/LeafMark.jsx.
 *
 *  Deviations from DS source:
 *  - Drops the `base` prop (a path to the project root, which the DS needs because
 *    its pages have no build step) in favour of importing the asset, so the URL is
 *    resolved and fingerprinted by Vite like every other asset in this app.
 *  - Masks with assets/leaf-mask.png rather than assets/leaf.png. Same drawing at
 *    half scale with the colour channels flattened; the component only ever reads
 *    the alpha channel, so nothing is lost, and the full-size PNG cannot cross the
 *    design-sync channel's 256 KiB file cap (#89). */

// Measured from the artwork (1870×841): the blade's pointed tip sits at 45.1% of
// the height and runs to the very last pixel column, so anchoring the mark's right
// edge puts the tip exactly on that edge. RATIO is the artwork's aspect. The
// vendored mask is the same drawing at half scale, so both still hold — re-measure
// only if the drawing itself is ever replaced.
const RATIO = 2.224
const TIP_Y = 0.451
// how much of the mark hangs below the rule when tipOnRule is set. The tip itself
// would sit exactly on the line at (1 - TIP_Y); lifting it by 0.12 of the height
// raises the blade until its top edge just clears the strip, which is the most
// leaf you can show without shaving the upper lobes off.
const HANG = 1 - TIP_Y - 0.12

export interface LeafMarkProps {
  /** the mark's height; its width follows the artwork's aspect. Default 96 */
  size?: number
  /** held back with opacity, not with a paler swatch. Default 0.55 */
  opacity?: number
  /** any paint the mask can take. Default var(--moss-600), the wordmark's green */
  color?: string
  /** sit the blade's tip on the rule below it and let the rest hang past, clipped */
  tipOnRule?: boolean
  /** give the motif an accessible name. Without one it is aria-hidden, which is
   *  the right default for decoration */
  title?: string
}

export function LeafMark({ size = 96, opacity = 0.55, color = 'var(--moss-600)', tipOnRule, title }: LeafMarkProps) {
  const url = 'url("' + leafUrl + '")'
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : 'true'}
      style={{
        display: 'block', flexShrink: 0,
        height: size, width: size * RATIO,
        // lift the mark so more of the blade clears the rule; the tip stays just
        // under the line and the rest hangs below, clipped
        marginBottom: tipOnRule ? -HANG * size : 0,
        background: color, opacity,
        WebkitMaskImage: url, maskImage: url,
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
      }}
    />
  )
}
