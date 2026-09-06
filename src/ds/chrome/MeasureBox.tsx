import { useEffect, useRef } from 'react'
import type { DependencyList } from 'react'

/** WHEN A COMPONENT MAY BELIEVE ITS OWN MEASUREMENT.
 *
 *  Three faults in one session taught this file (DS, 2026-09-04), each of them a number that
 *  LOOKED measured and was not:
 *   1. An OBSERVER-ONLY measurement keeps its FIRST callback, and that one is early. The
 *      observer's initial notification fires at observe time, before layout is final in this
 *      host — and a box that never changes size afterwards never gets a second one. So the value
 *      stays whatever that early callback said: 0 for a flex-derived height. The observer is
 *      NOT broken (probed: observe a 20px div → callback 20; resize to 40 → callback 40) — it
 *      reports CHANGE, and a settled box has none to report.
 *   2. A read on the mount frame measures the FALLBACK, not the layout. The component that
 *      measures itself has not laid out yet.
 *   3. A SINGLE `requestAnimationFrame` is not enough here either — measured: a readout still
 *      printed 0 with `read(); requestAnimationFrame(read)`, and a later stray `resize`
 *      corrected it. So the first frame after mount can still precede final layout.
 *
 *  `settleRead` is therefore a LADDER, not a callback: read now (right in a settled host), on the
 *  next frame, on the frame after that (the double rAF is what fixed fault 3), when fonts resolve
 *  (type metrics move boxes), and on every window resize. Cheap — a handful of reads on mount, all
 *  of them idempotent — and the point is that no single one of them has to be the lucky one.
 *
 *  Pair it with a `ResizeObserver` for LATER changes; that is what an observer is good at. Never
 *  use the observer alone, and never trust one frame. Returns its own teardown.
 *  Typed port of the DS MeasureBox.jsx (contract: MeasureBox.d.ts), OB-136/137 / #267. */
export function settleRead(read: () => void): () => void {
  read()
  let outer: number | null = null
  let inner: number | null = null
  if (typeof requestAnimationFrame === 'function') {
    outer = requestAnimationFrame(() => { read(); inner = requestAnimationFrame(read) })
  }
  /* type metrics change box sizes, and a font can resolve after the frames above */
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(read).catch(() => {})
  }
  if (typeof window !== 'undefined') window.addEventListener('resize', read)
  return () => {
    if (outer != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(outer)
    if (inner != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(inner)
    if (typeof window !== 'undefined') window.removeEventListener('resize', read)
  }
}

/** READ A BOX AND KEEP READING IT — the whole recipe in one hook: the settle ladder above for the
 *  value now, an observer for later. Returns nothing; `read` is yours and receives no arguments,
 *  so it reads whatever box it likes (several, if a component measures more than one). Observe
 *  the boxes yourself: this hook's observer exists for the callback's identity only — a port
 *  detail kept from the DS, where the observer is created but never told what to watch. */
export function useSettledMeasure(read: () => void, deps?: DependencyList): void {
  const held = useRef(read)
  held.current = read
  useEffect(() => {
    const run = () => held.current && held.current()
    return settleRead(run)
    // the caller names the deps, as the DS's signature does
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps || [])
}

/** The capitalised way in for a card or a rig — the same function objects, not copies. */
export const MeasureBox = { settleRead, useSettledMeasure }
