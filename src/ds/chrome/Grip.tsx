import type { CSSProperties } from 'react'
import { wrapTip } from './IconButton'

/** THE DOT, which is the whole vocabulary. A grip is not an icon of a hand or a pair of
 *  arrows: it is the same 2px dot `Bullet` and `DomainDot` already use, repeated. That is
 *  deliberate — a system with one mark for "a thing" reads as a system, and a grip is
 *  just several of them arranged so the arrangement says which gesture is on offer.
 *
 *  WHOLE PIXELS ONLY, and this is not fussiness. A 1.5px dot cannot land on a device pixel:
 *  the browser rounds each one against its own position in the grid, so some come out 1px
 *  and some 2px, and the mark reads as a handful of mismatched specks. Both `dot` and `gap`
 *  are rounded here so a caller cannot reintroduce it. */
function Dot({ d }: { d: number }) {
  return <span style={{ width: d, height: d, borderRadius: '50%', background: 'currentColor' }} />
}

const BAR_CELLS = 4

/** THE TONE IS THE COMPONENT'S, NOT THE CALLER'S. `Pane` once passed `color: 'inherit'`
 *  into the corner mark, which overwrote `--bark-400` with the pane's TEXT colour: the
 *  corner painted near-black beside dots painting in bark-400, and every doc in the system
 *  said bark-400 throughout — a colour override on one of a matched pair is invisible in
 *  the source of either file and only shows up in the pixels. So a passed `color` is
 *  dropped, with a console warning naming the fault, rather than silently honoured. If a
 *  grip needs to be quieter or louder, change the default below; every grip in the app
 *  moves together, which is the point of a pair. */
function ownTone(style?: CSSProperties): CSSProperties | undefined {
  if (!style || !('color' in style)) return style
  console.warn(
    '[Grip] color: ' + style.color + ' was passed to a grip and has been ignored. '
    + 'The move and resize marks are a matched pair at --bark-400; toning one instance is how '
    + "the resize corner spent two days painting in the pane's text colour. Change Grip's "
    + 'default if the pair should shift.',
    style,
  )
  const rest: CSSProperties = { ...style }
  delete rest.color
  return rest
}

const cornerFace = (size: number, pitch: number): CSSProperties => ({
  width: size,
  height: size,
  backgroundImage: `repeating-linear-gradient(-45deg, currentColor 0 1px, transparent 1px ${pitch}px)`,
  clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
})

export interface GripProps {
  /** `bar` (default) — 2×2 dots for a drag handle, placed AFTER a title or at the end of a
   *  row. `corner` — a triangle of three hairlines for a resize handle in a frame's corner */
  variant?: 'bar' | 'corner'
  /** `corner` only: the triangle's side in px, default 9. `Pane` sits it 2px out per axis,
   *  which is a LOOK and not a derived minimum — grow the triangle and both numbers grow
   *  with it */
  size?: number
  /** `corner` only: px between hairline centres, default 3 */
  pitch?: number
  /** dot diameter in px, default 2 — the system's dot. Rounded to a whole pixel internally,
   *  because a fractional dot renders unevenly across the grid; pass a whole number. Do NOT
   *  reach here to reduce emphasis — TONE is the lever, and the default is already low */
  dot?: number
  /** px between dots, default 2. Rounded to a whole pixel, same reason as `dot` */
  gap?: number
  /** position and layout only. **A `color` here is IGNORED** (dropped, with a console
   *  warning): the two marks are a matched pair at `--bark-400`, and a single toned instance
   *  is what made the resize corner paint in the pane's text colour for two days. Not a
   *  background, a border or padding either: the surface that owns the gesture owns those,
   *  and a grip with its own box becomes a button that does nothing */
  style?: CSSProperties
  /** overrides the default hover label (`"drag to move"` for `bar`, `"drag to resize"` for
   *  `corner`). Both arrangements stay `aria-hidden` regardless — this is a mouse-hover
   *  label only, never the accessible name for the gesture; that still belongs to whichever
   *  `Pane`/`PaneHeader` element owns the pointerdown. */
  title?: string
}

/** THE MARK THAT SAYS A PANE CAN BE MOVED OR RESIZED. A `grabbable` pane and a fixed one
 *  look identical at rest with only a cursor for feedback — and a cursor is FEEDBACK, not
 *  an affordance: it arrives one gesture too late, once you are already hovering the exact
 *  strip that offers it.
 *
 *  Two arrangements, one mark:
 *   - `bar` — 2×2 dots, for a drag handle sitting in the pane's legend AFTER its title. A
 *     square, not a 2×3 rectangle: at 6×10 against an 11px legend that carries enough mass
 *     to compete with the title it labels, and placed BEFORE the title it reads as a bullet
 *     on the pane's name rather than as a handle. Four dots, trailing, loses nothing.
 *   - `corner` — the lower-right triangle, for a resize handle in the frame's corner. The
 *     shape points at the corner it drags, which is why neither form needs an arrow. Drawn
 *     as hairlines rather than dots: six dots packed into a 10px triangle carry more ink per
 *     unit area than four in a loose 6px square, so equal colour reads as unequal weight —
 *     ink density, not colour, is what makes two marks read as a matched pair.
 *
 *  IT IS A MARK AND NOTHING ELSE — no cursor, no pointer handlers, no positioning. Those
 *  belong to whoever owns the gesture (`PaneHeader` for the grab, `Pane` for the resize):
 *  the component owns the affordance, the host owns the coordinates. `currentColor`
 *  throughout, so a caller tones it with `color` — except this one, see `ownTone`.
 *
 *  ONE TONE FOR BOTH ARRANGEMENTS, and a caller cannot override it. `--bark-400`, below the
 *  system's text ramp on purpose, measures 2.35:1 on `--surface-paper` — under WCAG
 *  1.4.11's 3:1 for a UI affordance, and a DELIBERATE exception: the gesture is carried
 *  three other ways too (the `grab`/`nwse-resize` cursor, a 21px target, the pane's own
 *  visible frame), so the mark is a hint at a redundant affordance rather than the only
 *  route to it. It does not fade (a smudge, not a quieter mark) and it does not react to
 *  the pointer — the cursor already answers the hover, and a mark that also darkens is
 *  asking to be noticed twice.
 *
 *  You will not normally render this directly: `<Pane grabbable>` and `<Pane resizable>`
 *  place it for you, correctly. Reach for it by hand only for a gesture surface the pane
 *  does not own (a splitter between two panes, a drag handle on a row).
 *
 *  Typed port of the DS Grip.jsx (contract: Grip.d.ts). */
export function Grip({ variant = 'bar', dot = 2, gap = 2, size = 9, pitch = 3, style, title }: GripProps) {
  if (variant === 'corner') {
    return (
      <span
        aria-hidden="true"
        title={wrapTip(title ?? 'drag to resize')}
        style={{ ...cornerFace(size, pitch), ...ownTone(style), color: 'var(--bark-400)' }}
      />
    )
  }
  const d = Math.max(1, Math.round(dot))
  const g = Math.max(1, Math.round(gap))
  return (
    <span
      aria-hidden="true"
      title={wrapTip(title ?? 'drag to move')}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(2, ${d}px)`,
        gap: g,
        justifyItems: 'center',
        alignItems: 'center',
        ...ownTone(style),
        color: 'var(--bark-400)',
      }}
    >
      {Array.from({ length: BAR_CELLS }, (_, i) => <Dot key={i} d={d} />)}
    </span>
  )
}
