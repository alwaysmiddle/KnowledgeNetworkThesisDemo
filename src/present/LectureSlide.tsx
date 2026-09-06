// ONE SLIDE — the projector's own layout at the 1120×630 reference, and the box
// that fits that reference into whatever the film roll, the full-screen frame
// or the projector window gives it (#267, DS OB-135/136).
//
// WHAT A SLIDE IS. The DS's reference host draws a stop as its territory over its
// title over its NOTE, with the walk's name as a 32px foot — and says the app's
// slide is the host's to draw, on ONE renderer for every surface (OB-136 clause
// 2: "the slide content is the SAME renderer the projector surface shows"). This
// is that renderer, taken as the DS drew it. It is deliberately not the #195 deck
// (map + document + walk strip): three of those in the roll's cards would be
// three MapViews, and #217 — what the room should see at all — is still open.
// When that is decided this file is the one place the slide changes.

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { settleRead } from '@/ds'

import type { LectureStep } from './lecture'

export const SLIDE_WIDTH = 1120
export const SLIDE_HEIGHT = 630

/** fits the 1120×630 reference into its box: the child is drawn at reference size
 *  and scaled by the box's width, so type and spacing hold their proportions on a
 *  240px preview and a 1920px wall alike. The width is read on the settle ladder
 *  and then observed (DS MeasureBox: never the observer alone, never one frame). */
export function Scaled({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const read = () => { if (ref.current) setW(ref.current.getBoundingClientRect().width) }
    const stop = settleRead(read)
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(read); ro.observe(el) }
    return () => { stop(); if (ro) ro.disconnect() }
  }, [])
  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: SLIDE_WIDTH, height: SLIDE_HEIGHT, transform: 'scale(' + (w / SLIDE_WIDTH) + ')', transformOrigin: '0 0' }}>{children}</div>
    </div>
  )
}

/** the slide for one stop — territory eyebrow, title, note, and the walk's foot */
export function LectureSlide({ step, index, count }: { step: LectureStep; index: number; count: number }) {
  return (
    <Scaled>
      <div data-lecture-slide={step.id} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bark-50)', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, padding: '62px 62px 0' }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 'var(--fw-bold)', letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', color: step.hue ? 'var(--hue-' + step.hue + '-ink)' : 'var(--text-2)' }}>{step.territory} · stop {index + 1} of {count}</div>
          <div data-slide-title style={{ fontFamily: 'var(--font-display)', fontSize: 42, lineHeight: 1.12, fontWeight: 'var(--fw-bold)', color: 'var(--text-1)', letterSpacing: 'var(--ls-display)', marginTop: 12 }}>{step.title}</div>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 21, lineHeight: 1.65, color: 'var(--text-1)', marginTop: 22, maxWidth: 820, textWrap: 'pretty' }}>{step.note}</div>
        </div>
        <div style={{ flex: 'none', height: 32, borderTop: '1px solid var(--border-hair)', background: 'var(--bark-100)', display: 'flex', alignItems: 'center', padding: '0 26px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)' }}>{step.walk}</div>
      </div>
    </Scaled>
  )
}
