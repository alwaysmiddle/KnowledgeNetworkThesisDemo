// The tier-lines selection state, shared by candidate B (lines alone) and
// candidate E (layer stack + lines): a path of stage keys, one per tier.
// Picking a stage on line N truncates the path at N and descends into it —
// every line below N swaps out. Picking a leaf visit just truncates: a visit
// has no inside, so nothing runs below it.

import { useState } from 'react'

import { linesForPath } from './mockwalk'
import type { Stop, TierLine } from './mockwalk'

export interface TierPathState {
  path: string[]
  lines: TierLine[]
  pick(lineIndex: number, stop: Stop): void
}

export function useTierPath(initial: string[] = []): TierPathState {
  const [path, setPath] = useState<string[]>(initial)
  return {
    path,
    lines: linesForPath(path),
    pick: (i, s) => setPath(s.kind === 'stage' ? [...path.slice(0, i), s.key] : path.slice(0, i)),
  }
}
