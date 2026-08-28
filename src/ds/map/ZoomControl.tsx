import type { CSSProperties, MouseEvent } from 'react'

import { MapFloatingButton } from './MapFloatingButton'

/**
 * The zoom in/out pair, fused into one pill — the Google-Maps-style control, bottom-right
 * on the map by convention. Built from two `MapFloatingButton`s with their own border and
 * shadow suppressed, so the PAIR wears one frame instead of two touching squares (which
 * reads as an accidental gap rather than a control).
 */
export interface ZoomControlProps {
  /** px, square, per button. 36 is the standard. */
  size?: number
  onZoomIn?: (e: MouseEvent<HTMLButtonElement>) => void
  onZoomOut?: (e: MouseEvent<HTMLButtonElement>) => void
  zoomInDisabled?: boolean
  zoomOutDisabled?: boolean
  /** POSITION ONLY — where the pill sits on the map pane, not its face */
  style?: CSSProperties
}

export function ZoomControl({ size = 36, onZoomIn, onZoomOut, zoomInDisabled, zoomOutDisabled, style }: ZoomControlProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: size,
        border: '1px solid var(--border-rule)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-raised)',
        boxShadow: 'var(--lift-1)',
        overflow: 'hidden',
        ...style,
      }}
    >
      <MapFloatingButton size={size} title="zoom in" label="zoom in" onClick={onZoomIn} disabled={zoomInDisabled} style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
        +
      </MapFloatingButton>
      <div style={{ height: 1, background: 'var(--border-hair)' }} />
      <MapFloatingButton size={size} title="zoom out" label="zoom out" onClick={onZoomOut} disabled={zoomOutDisabled} style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
        &#8722;
      </MapFloatingButton>
    </div>
  )
}
