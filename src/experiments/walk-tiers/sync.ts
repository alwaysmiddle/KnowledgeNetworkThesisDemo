// The spike's stand-in for the bus hover channel — SAME bind()/data-lit shape
// as studio/bus.ts's useHover, so a graduated candidate swaps this hook for
// the real one without touching its markup, and the screenshot driver asserts
// on the selector the shipped app already uses. Local state only: the whole
// point of the spike is that no candidate joins the bus.

import { useMemo, useState } from 'react'

export interface Sync {
  hovered: string | null
  lit(id: string): boolean
  bind(id: string): {
    onPointerEnter: () => void
    onPointerLeave: () => void
    'data-lit': 0 | 1
  }
}

export function useSync(): Sync {
  const [hovered, setHovered] = useState<string | null>(null)
  return useMemo(
    () => ({
      hovered,
      lit: (id: string) => hovered === id,
      bind: (id: string) => ({
        onPointerEnter: () => setHovered(id),
        // guarded leave, same reason as the bus: adjacent elements carrying the
        // same id fire leave(X) then enter(X)
        onPointerLeave: () => setHovered((h) => (h === id ? null : h)),
        'data-lit': (hovered === id ? 1 : 0) as 0 | 1,
      }),
    }),
    [hovered],
  )
}
