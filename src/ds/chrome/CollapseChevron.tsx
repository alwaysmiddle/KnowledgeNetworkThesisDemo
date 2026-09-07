import type { CSSProperties, MouseEvent } from 'react'

import { IconButton } from './IconButton'

/** THE ONE AFFORDANCE THAT BOTH HIDES A COLUMN AND BRINGS IT BACK — same button, same spot,
 *  flipped glyph, so there is never a second place to look for "show it again". A plain
 *  directional chevron reads faster than an icon standing in for the panel it toggles.
 *
 *  Built on `IconButton` rather than a private `<button>`: extracted upstream 2026-08-28 out of
 *  `ConnectionsSplitPane`'s local `CollapseToggle`, which had reimplemented `IconButton`'s hover
 *  ramp, reserved border and disabled handling by hand. Any host collapsing a column, a sidebar
 *  or a rail gets the system's own button manners for free.
 *
 *  Typed port of the DS components/chrome/CollapseChevron.jsx, OB-101 / #253. */
export interface CollapseChevronProps {
  /** which way the chevron points, and therefore what pressing it will do: collapsed shows
   *  `›` and reopens, open shows `‹` and hides */
  collapsed?: boolean
  /** the press. The host owns what collapsing MEANS — this only reports the click */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void
  /** the tooltip and the accessible name, both. Defaults to `Show` / `Hide` by `collapsed` */
  title?: string
  /** placement in the host's own box — this component takes no position of its own */
  style?: CSSProperties
}

export function CollapseChevron({ collapsed, onClick, title, style }: CollapseChevronProps) {
  const label = title || (collapsed ? 'Show' : 'Hide')
  return (
    <IconButton tone="chrome" size={14} glyphSize={10} title={label} label={label} onClick={onClick} style={style}>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <path
          d={collapsed ? 'M4 1.5 L9 6 L4 10.5' : 'M8 1.5 L3 6 L8 10.5'}
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"
        />
      </svg>
    </IconButton>
  )
}
