import { wrapTip } from '../chrome/IconButton'

/** A numbered stop on the active walk: done (behind the cursor), current (the
 *  cursor), or ahead (not yet reached). Two variants of the same three states —
 *  `rail` (default) is the strip's own dense fill-and-wash reading; `pin` is for
 *  the SAME dot pinned over a map, where the territory under it already carries
 *  colour: paper-white face, the state's colour on the ring and the number
 *  instead of on a fill, and a lighter number weight so the mark reads as a
 *  small label rather than a filled badge competing with the map's own ink.
 *  Typed port of the DS StepDot.jsx.
 *
 *  THE WHOLE FACE IS ONE SVG (ported 2026-08-26, DS OB-088). Fill, ring and the
 *  optional dash all live in the same coordinate system and the same rendering
 *  pipeline. The previous shape here — a CSS `border-radius` circle with an SVG
 *  dash laid over it — asked two SEPARATE renderers to agree on an identical
 *  curve's edge to the sub-pixel, and on real displays they do not: the dash
 *  showed a faint halo, and pulling it inward for margin then read as a second,
 *  thicker ring. Neither is fixable by tuning a number, because the disagreement
 *  is BETWEEN renderers. One SVG has no second renderer to disagree with. */
export interface StepDotProps {
  /** the stop number, OR a contiguous range label ("1-3") when one map pin stands for
   *  several adjacent walk steps that share a node/territory. A range's `state` is the
   *  caller's to derive from its member steps (done if all are behind the cursor, current
   *  if the cursor is inside it, else ahead) — StepDot only draws the label it's given.
   *  A range draws as an auto-width PILL rather than a circle, the plain CSS way; see
   *  the `isRange` branch for why that one case keeps CSS. */
  n: number | string
  /** done = behind the cursor, current = the cursor, ahead = not yet reached */
  state?: 'done' | 'current' | 'ahead'
  /** rail (default) = filled dot for the walk strip; pin = paper-white face with the
   *  state's colour on the ring and number only, for the same dot pinned over a map,
   *  where the territory underneath already carries colour */
  variant?: 'rail' | 'pin'
  /** px, both dimensions. Default 24 (the rail's size); a map pin usually wants larger. */
  size?: number
  /** dashes the ring — never a different colour — for a step the walk may skip. Same
   *  rule as `NodeChip`'s own `optional`: state and hue are separate channels. Drawn as
   *  an SVG `stroke-dasharray` on the same circle that draws the ring, since a browser's
   *  dashed rendering on a circle this small reads as barely-there. Never passed
   *  together with a range `n` — a range is a pill and has no dash. */
  optional?: boolean
  /** the stop's authored note */
  title?: string
  onClick?: () => void
}

/** the `pin` variant's own ring stroke width, published so a host drawing a connector
 *  to a pinned StepDot (`NodeArrow`'s `joins`) can measure the border it actually
 *  renders — the same rule `NodeChip`'s `chipBorder` and `VersionedGroup.joinBorder`
 *  already answer for their own forms. `rail` is never a `NodeArrow`'s neighbour, so
 *  it publishes nothing — nothing draws that today. LOCAL ADDITION, not in the DS
 *  `.jsx`, which inlines the same 1.5. */
export const PIN_RING_WIDTH = 1.5

export function StepDot({ n, state = 'ahead', variant = 'rail', size = 24, optional, onClick, title }: StepDotProps) {
  const isRange = String(n).length > 1
  const skin = variant === 'pin'
    ? (state === 'current'
        ? { bg: 'var(--surface-paper)', bd: 'var(--accent-walk)', ink: 'var(--accent-walk)' }
        : state === 'done'
          ? { bg: 'var(--surface-paper)', bd: 'var(--acorn-400)', ink: 'var(--text-walk)' }
          : { bg: 'var(--surface-paper)', bd: 'var(--border-rule)', ink: 'var(--text-3)' })
    : (state === 'current'
        ? { bg: 'var(--accent-walk)', bd: 'var(--accent-walk)', ink: 'var(--text-inverse)' }
        : state === 'done'
          ? { bg: 'var(--acorn-100)', bd: 'var(--acorn-200)', ink: 'var(--text-walk)' }
          : { bg: 'var(--surface-raised)', bd: 'var(--border-rule)', ink: 'var(--text-3)' })
  const ringW = variant === 'pin' ? PIN_RING_WIDTH : 1
  /* BOLDER ONLY FOR `current` — that is the one state whose fill and border share the
     same token (rail `current`: bg=bd=--accent-walk), so the dash needs real weight to
     read against the fill it sits on. `done`/`ahead` already contrast fine at the ring's
     own plain weight; boldening those too made an optional dot look heavier than its
     non-optional siblings at rest for no reason. */
  const dashW = state === 'current' ? ringW * 1.5 : ringW

  /* A RANGE ("1-3") IS A PILL, drawn the plain CSS way (border-radius/border/background)
     — SVG can draw a circle but not this component's variable-width auto rounded pill
     without measuring text first, and no caller passes a range AND `optional` together,
     so the pill never needs the dash the rest of this file exists to get right. */
  if (isRange) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={wrapTip(title)}
        style={{
          position: 'relative',
          minWidth: size,
          width: 'auto',
          height: size,
          flexShrink: 0,
          display: 'grid',
          placeItems: 'center',
          padding: `0 ${Math.max(4, size * 0.18)}px`,
          whiteSpace: 'nowrap',
          borderRadius: 'var(--radius-pill)',
          border: `${ringW}px solid ${skin.bd}`,
          background: skin.bg,
          color: skin.ink,
          boxShadow: variant === 'pin' ? 'var(--lift-1)' : 'none',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--fs-micro)',
          fontWeight: variant === 'pin' ? 'var(--fw-regular)' : 'var(--fw-medium)',
          fontVariantNumeric: 'var(--tnum)',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'var(--transition-wash)',
        }}
      >
        {n}
      </button>
    )
  }

  const r = size / 2 - ringW / 2
  /* OPTIONAL + CURRENT SHRINKS THE FILL, NOT THE RING — the dash sits at the same radius
     the ring always has, so at rest an optional dot matches its siblings exactly. But
     `current`'s fill is the same colour as its own ring/dash, and a fill reaching all the
     way to the dash leaves no gap of bare background for the eye to read as "a ring", so
     the dash read as texture on a solid dot. Pulling the fill in leaves a visible band for
     the dash to sit on. ONLY when both conditions hold — a plain `current` dot with a
     smaller fill would just look mis-sized, with no `optional` to explain it. */
  const shrinkFill = optional && state === 'current'
  const fillR = shrinkFill ? r * 0.78 : r
  /* THAT BAND NEEDS ITS OWN FILL, AND THE DASH NEEDS A DIFFERENT STROKE COLOUR — a shrunk
     fill leaves the band between it and the ring with NO fill at all, so the page's own
     background shows through instead of a colour this component controls, and the dash —
     stroked in `ink`, white on `current` — is invisible against it. The band takes the
     same neutral surface a `done`/`ahead` dot rests on, and the dash on THIS band is
     stroked in `bd` instead of `ink`: dark enough to read against the light band, and the
     same colour as the small fill it now rings, so the two pieces still read as one
     "active" mark. `ink` stays correct for `done`/`ahead`, where the fill reaches the ring
     and needs a colour that contrasts THAT fill. */
  const bandFill = variant === 'pin' ? 'var(--surface-paper)' : 'var(--surface-raised)'
  const dashStroke = state === 'current' ? skin.bd : skin.ink

  return (
    <button
      type="button"
      onClick={onClick}
      title={wrapTip(title)}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        display: 'grid',
        placeItems: 'center',
        padding: 0,
        borderRadius: 'var(--radius-pill)',
        /* THE BUTTON DRAWS NOTHING OF ITS OWN — fill/ring/dash all live in the SVG below
           — but a native <button> still carries its OWN default chrome (`appearance:
           auto`: a 2px outset border, a grey background) unless explicitly reset, and
           nothing resets it once the old `border`/`background` CSS is gone. That native
           bevel shows as a dark crescent at one corner on EVERY dot, not just optional
           ones. */
        appearance: 'none',
        WebkitAppearance: 'none',
        border: 'none',
        background: 'none',
        boxShadow: variant === 'pin' ? 'var(--lift-1)' : 'none',
        color: skin.ink,
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--fs-micro)',
        fontWeight: variant === 'pin' ? 'var(--fw-regular)' : 'var(--fw-medium)',
        fontVariantNumeric: 'var(--tnum)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'var(--transition-wash)',
      }}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, overflow: 'visible' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill={shrinkFill ? bandFill : skin.bg}
          stroke={optional ? 'none' : skin.bd}
          strokeWidth={ringW}
        />
        {shrinkFill ? <circle cx={size / 2} cy={size / 2} r={fillR} fill={skin.bg} /> : null}
        {optional ? (
          /* DASHES THE RING, NEVER A DIFFERENT COLOUR — same rule `NodeChip`'s own
             `optional` follows. Drawn as `stroke-dasharray` rather than a CSS dashed
             border: a browser's dashed rendering on a circle this small (24-28px)
             computes illegibly short, faint dashes. SAME RADIUS `r` as the fill/ring
             circle above — no separate inset to get wrong, no margin to tune. */
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={dashStroke}
            strokeWidth={dashW}
            strokeLinecap="round"
            strokeDasharray={`${Math.max(1.5, size * 0.1)} ${Math.max(1.5, size * 0.08)}`}
          />
        ) : null}
      </svg>
      <span style={{ position: 'relative' }}>{n}</span>
    </button>
  )
}
