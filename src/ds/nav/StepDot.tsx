import { wrapTip } from '../chrome/IconButton'

/** A numbered stop on the active walk: done (behind the cursor), current (the
 *  cursor), or ahead (not yet reached). Two variants of the same three states —
 *  `rail` (default) is the strip's own dense fill-and-wash reading; `pin` is for
 *  the SAME dot pinned over a map, where the territory under it already carries
 *  colour: paper-white face, the state's colour on the ring and the number
 *  instead of on a fill, and a lighter number weight so the mark reads as a
 *  small label rather than a filled badge competing with the map's own ink.
 *  Typed port of the DS StepDot.jsx. */
export interface StepDotProps {
  /** the stop number, OR a contiguous range label ("1-3") when one map pin stands for
   *  several adjacent walk steps that share a node/territory. A range's `state` is the
   *  caller's to derive from its member steps (done if all are behind the cursor, current
   *  if the cursor is inside it, else ahead) — StepDot only draws the label it's given. */
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
   *  rule as `NodeChip`'s own `optional`: state and hue are separate channels. Drawn
   *  as an SVG `stroke-dasharray` overlay rather than a CSS dashed border, since a
   *  browser's dashed rendering on a circle this small reads as barely-there. */
  optional?: boolean
  /** the stop's authored note */
  title?: string
  onClick?: () => void
}

/** the `pin` variant's own ring stroke width, published so a host drawing a connector
 *  to a pinned StepDot (`NodeArrow`'s `joins`) can measure the border it actually
 *  renders — the same rule `NodeChip`'s `chipBorder` and `VersionedGroup.joinBorder`
 *  already answer for their own forms. `rail` is never a `NodeArrow`'s neighbour, so
 *  it publishes nothing — nothing draws that today. */
export const PIN_RING_WIDTH = 1.5

export function StepDot({ n, state = 'ahead', variant = 'rail', size = 24, optional, onClick, title }: StepDotProps) {
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
        /* OPTIONAL DASHES THE RING, NEVER A DIFFERENT COLOUR — same rule `NodeChip`'s own
           `optional` follows: state and hue stay separate channels. The dash itself is
           drawn by an SVG overlay below, not a CSS `border-style: dashed` — a browser's
           dashed rendering on a circle this small (24-28px) computes illegibly short,
           faint dashes; an SVG `stroke-dasharray` gives an exact, always-visible dash
           regardless of the dot's size. */
        border: ringW + 'px solid ' + (optional ? 'transparent' : skin.bd),
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
      {optional ? (
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
            r={size / 2 - ringW / 2}
            fill="none"
            stroke={skin.bd}
            strokeWidth={ringW}
            strokeDasharray={`${Math.max(2, size * 0.16)} ${Math.max(1.5, size * 0.11)}`}
          />
        </svg>
      ) : null}
      {n}
    </button>
  )
}
