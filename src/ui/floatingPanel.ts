// The pure core of the FloatingPanel primitive (#76). Everything here is
// geometry and persistence with NO React and NO DOM — so the arithmetic that is
// easy to get subtly wrong (an edge-resize that moves the origin, a clamp that
// must not shrink the panel, a stored rect that fails to parse) is unit-tested
// the way src/model/* is. The component (FloatingPanel.tsx) owns pointer events
// and calls into these; it holds no math of its own.

/** an absolutely-positioned box inside its host pane, in host-local pixels */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** the host pane's content box — a panel is kept fully inside it */
export interface Bounds {
  w: number
  h: number
}

export interface SizeLimits {
  minW: number
  minH: number
}

/** which edge or corner a resize drag grabbed. A letter present means that side
 * moves: 'w' moves the left edge, 'e' the right, 'n' the top, 's' the bottom;
 * corners combine two. The OPPOSITE side always stays put. */
export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

/** keep a rect inside [0,0 .. host.w,host.h] by SLIDING it, never resizing. If
 * the panel is larger than the host on an axis it pins to 0 on that axis (the
 * host is too small to contain it — repositioning can't fix that, resize can). */
export function clampInside(rect: Rect, host: Bounds): Rect {
  const x = host.w >= rect.w ? Math.min(Math.max(rect.x, 0), host.w - rect.w) : 0
  const y = host.h >= rect.h ? Math.min(Math.max(rect.y, 0), host.h - rect.h) : 0
  return { ...rect, x, y }
}

/** move the whole panel by a pointer delta, then slide it back inside the host */
export function drag(rect: Rect, dx: number, dy: number, host: Bounds): Rect {
  return clampInside({ ...rect, x: rect.x + dx, y: rect.y + dy }, host)
}

/** resize by dragging one edge/corner. The grabbed side follows the pointer; the
 * opposite side is fixed. Minimum size is honored by letting the moving side
 * cross no further than minW/minH from the fixed side. The result is confined to
 * the host box: a moving edge cannot leave the pane, so a panel resizes smaller
 * when it hits the far wall rather than growing off-screen. */
export function resize(
  rect: Rect,
  edge: ResizeEdge,
  dx: number,
  dy: number,
  limits: SizeLimits,
  host: Bounds,
): Rect {
  let { x, y, w, h } = rect
  const right = rect.x + rect.w // fixed when dragging the WEST edge
  const bottom = rect.y + rect.h // fixed when dragging the NORTH edge

  if (edge.includes('e')) {
    // right edge follows pointer; clamp to [minW .. host wall on the right]
    w = clampRange(rect.w + dx, limits.minW, host.w - rect.x)
  }
  if (edge.includes('s')) {
    h = clampRange(rect.h + dy, limits.minH, host.h - rect.y)
  }
  if (edge.includes('w')) {
    // left edge follows pointer; right edge (`right`) is the anchor. x can slide
    // from 0 up to right-minW; width is whatever spans the gap to `right`.
    x = clampRange(rect.x + dx, 0, right - limits.minW)
    w = right - x
  }
  if (edge.includes('n')) {
    y = clampRange(rect.y + dy, 0, bottom - limits.minH)
    h = bottom - y
  }
  return { x, y, w, h }
}

/** confine v to [lo, hi]; if the range is inverted (hi < lo) collapse to lo, so
 * an over-tight host never yields a negative width */
function clampRange(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(v, Math.max(lo, hi)))
}

// ── persistence ─────────────────────────────────────────────────────────────
// One namespaced key per panel id. localStorage is used nowhere else in the app,
// so this establishes the convention: `pkt.floating-panel.<id>`. Every read is
// defensive — a corrupt, absent, or shape-wrong value falls back to the caller's
// default anchor rather than throwing.

const KEY_PREFIX = 'pkt.floating-panel.'

function keyFor(id: string): string {
  return KEY_PREFIX + id
}

function isRect(v: unknown): v is Rect {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.x === 'number' &&
    typeof r.y === 'number' &&
    typeof r.w === 'number' &&
    typeof r.h === 'number' &&
    Number.isFinite(r.x) &&
    Number.isFinite(r.y) &&
    r.w > 0 &&
    r.h > 0
  )
}

/** the stored rect for this id, or the fallback anchor when nothing valid is
 * stored. Never throws — storage may be unavailable (private mode) or hold junk. */
export function loadRect(id: string, fallback: Rect): Rect {
  try {
    const raw = localStorage.getItem(keyFor(id))
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return isRect(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

/** persist a panel's rect. Never throws — a storage quota/availability error
 * must not break a drag. */
export function saveRect(id: string, rect: Rect): void {
  try {
    localStorage.setItem(keyFor(id), JSON.stringify(rect))
  } catch {
    // storage unavailable or full — the panel still works, it just won't restore
  }
}
