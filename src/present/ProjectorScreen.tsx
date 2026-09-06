// THE ROOM'S WINDOW — what a lecture projects (#267 OB-135 clause 2/3).
//
// A second window of this app, opened by the toolbar ▶ at `?projector`, showing
// the live slide full-bleed and nothing else: no header, no toolbar, no panes,
// no controls. It never drives the lecture; it draws what the presenter's window
// says (`projector.ts`) and shuts itself when the presenter leaves.
//
// The slide keeps its 1120:630 shape inside whatever the window is: letterboxed
// on a dark ground, the way every projector app does it, so a 16:10 laptop or a
// 4:3 projector shows the whole slide rather than a cropped one.

import { useEffect } from 'react'

import { LectureSlide } from './LectureSlide'
import { useProjectedState } from './projector'

export default function ProjectorScreen() {
  const { state, closed } = useProjectedState()
  useEffect(() => { document.title = state.live && state.slide ? state.slide.title : 'projector' }, [state])
  // the presenter left: a screen nobody is watching must not keep showing a slide.
  // A script-opened window may close itself; one the user opened by hand ignores
  // this and goes dark instead, which is the honest floor.
  useEffect(() => { if (closed) window.close() }, [closed])
  return (
    <div data-projector={state.live ? 'live' : 'dark'} style={{ position: 'fixed', inset: 0, background: 'var(--bark-900)', display: 'grid', placeItems: 'center' }}>
      {state.live && state.slide ? (
        <div style={{ position: 'relative', width: 'min(100vw, 177.78vh)', aspectRatio: '1120 / 630' }}>
          <LectureSlide step={state.slide} index={state.stop - 1} count={state.count} />
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)', color: 'var(--bark-500)' }}>{closed ? 'the lecture has closed' : 'nothing is projected'}</div>
      )}
    </div>
  )
}
