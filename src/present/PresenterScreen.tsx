// THE PRESENTER SCREEN — the professor's own view of a walk while it is taught:
// the header bar, the film roll, the strip and the finder on ONE store (#267,
// DS OB-135/136/137/138, parts 1–4 of the presenter-mode split). Ported from the
// DS's reference host `templates/studio/PresenterScreen.jsx`, with the Studio's
// bindings translated and its wiring kept.
//
// WHERE IT SITS. StudioView mounts it as its presenter MODE (owner, 2026-09-03):
// while a lecture is LIVE (projecting and not ended) it takes the whole area under
// nothing — app header, toolbar and palette are gone and this bar is the chrome;
// as a PREVIEW (the palette's Present, `projecting={false}`) or once ENDED it sits
// framed beside the palette with the chrome kept, so ending is always a way home.
//
// THE STORE — the three facts and the transient UI, all here. `activeStop` is the
// record, `roamingStop` where the professor is looking, `covered` what was
// presented (a stop is covered when the record LEAVES it). Components ask; this
// decides. THE LECTURE IS THE WALK BEING PLAYED — `useWalkPlayback`'s steps, the
// saved walk if one is active and the desk's road otherwise — and it starts at
// the Studio's focus, reporting the shown stop back to the bus so the header's
// focus follows the lecture.
//
// WHAT IS PROJECTED (clause 2): the roll's live card content — the slide — goes
// to the projector window through `useProjectorSender`; the preview projects
// nothing, so the room's window shows dark. Parts 5–8 (the map on the wall, the
// notes, the deck, the recap) are not built yet; the panes row under the strip is
// an empty flex:1 child so the column rule the strip needs is already in place.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { FilmRoll, Pane, PresenterHeaderBar, PresenterStrip, StopFinder } from '@/ds'
import type { PresenterState } from '@/ds'

import { useWalkPlayback } from '../instruments/walkdesk/playback'
import { renderStopPreview } from '../instruments/walkdesk/stoppreview'
import type { Bus } from '../studio/bus'
import { BOOKED_SECONDS, clampStop, coveredBefore, lectureStart, lectureSteps, mmss } from './lecture'
import { LectureSlide } from './LectureSlide'
import { useProjectorSender } from './projector'
import type { ProjectedState } from './projector'

export interface PresenterScreenProps {
  bus: Bus
  /** is the room watching — the toolbar ▶ (true) or the palette's Present (false, a preview:
   *  no clock, nothing projected). Flipping to true STARTS the lecture here and now. */
  projecting: boolean
  /** bumped by the host's toolbar ▶ once ended — the lecture picks up where the clock stopped */
  resumeToken: number
  /** the lecture ended or resumed — the host hides its chrome for a live lecture and hands it
   *  back the moment the lecture ends */
  onEnded?: (ended: boolean) => void
  /** what the header names the course; the walk's title by default */
  course?: string
  /** FRAMED LIKE A PANE beside the palette (a preview, or an ended lecture — DS OB-135 rule 4),
   *  or bare, the whole window (a live lecture). A prop rather than a wrapper the host puts
   *  around this component: the screen must keep ONE position in the tree across that flip, or
   *  ending a lecture would remount it and lose the record. */
  framed?: boolean
  /** the framed pane's ✕ — leave the mode */
  onLeave?: () => void
}

export default function PresenterScreen({ bus, projecting, resumeToken, onEnded, course, framed = false, onLeave }: PresenterScreenProps) {
  const play = useWalkPlayback(bus)
  const steps = useMemo(() => lectureSteps(play.steps, play.title), [play.steps, play.title])
  const N = steps.length
  /* the store — `startAt` is the Studio's focus when the mode opened */
  const [activeStop, setActiveStop] = useState(() => lectureStart(play.steps, bus.focus))
  const [roamingStop, setRoamingStop] = useState<number | null>(null)
  const [covered, setCovered] = useState<number[]>(() => coveredBefore(lectureStart(play.steps, bus.focus)))
  const [flags, setFlags] = useState<number[]>([])
  const [finder, setFinder] = useState<DOMRect | null>(null)
  const [stripOpen, setStripOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [ended, setEnded] = useState(false)
  const [expanded, setExpanded] = useState(false)
  /* the clocks: lecture elapsed (stops when ended), and time on the current stop. Four instants,
     all STATE: `now` ticks once a second from the effect below, and the moments the lecture
     started, the stop started and the lecture ended are written from effects and handlers — so
     the render reads state and calls nothing impure. */
  const [now, setNow] = useState(() => Date.now())
  const [startAt, setStartAt] = useState(() => Date.now())
  const [stopStartAt, setStopStartAt] = useState(() => Date.now())
  const [endedAt, setEndedAt] = useState<number | null>(null)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const elapsedS = projecting ? ((endedAt ?? now) - startAt) / 1000 : 0
  const onStopS = (now - stopStartAt) / 1000
  /* PROJECTING OR NOT (owner, 2026-09-03). Flipping to true STARTS the lecture: clocks from zero,
     the record cleared to the stops before the active one, so nothing clicked while previewing
     counts as taught. Back to preview (the palette's Present after an ended lecture): the ended
     pane goes, the layout shows again with nothing projected. */
  const wasProjecting = useRef(projecting)
  const activeRef = useRef(activeStop)
  useEffect(() => { activeRef.current = activeStop }, [activeStop])
  /* the DS reference host's own effect: a prop flipped, the record and the clocks reset once.
     One synchronous cascade on a mode change, never per render — the rule below is about
     cascades on every render, which this is not. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (projecting === wasProjecting.current) return
    wasProjecting.current = projecting
    const t = Date.now()
    if (projecting) {
      setStartAt(t)
      setStopStartAt(t)
      setEndedAt(null)
      setEnded(false)
      setRoamingStop(null)
      setCovered(coveredBefore(activeRef.current))
    } else {
      setEndedAt(null)
      setEnded(false)
      setConfirmOpen(false)
      setRoamingStop(null)
    }
  }, [projecting])
  /* eslint-enable react-hooks/set-state-in-effect */
  const roaming = roamingStop != null
  const shown = roaming ? roamingStop : activeStop
  const cover = (i: number) => setCovered((c) => (c.indexOf(i) >= 0 ? c : c.concat(i)))
  /* ARROWS ADVANCE WHATEVER YOU ARE ON: presenting, → moves the record and covers the stop left
     behind; roaming, → moves only the roam. The active node otherwise moves on a hold alone. */
  const step = useCallback((d: number) => {
    if (ended) return
    if (roaming) { setRoamingStop(clampStop(roamingStop + d, N)); return }
    const to = clampStop(activeStop + d, N)
    if (to === activeStop) return
    cover(activeStop)
    setActiveStop(to)
    setStopStartAt(Date.now())
  }, [ended, roaming, roamingStop, activeStop, N])
  const roamTo = useCallback((i: number) => { if (ended) return; setRoamingStop(i === activeStop ? null : i) }, [ended, activeStop])
  const makeActive = (i: number) => { cover(activeStop); setActiveStop(i); setRoamingStop(null); setStopStartAt(Date.now()) }
  const toggleFlag = useCallback((i: number) => setFlags((f) => (f.indexOf(i) >= 0 ? f.filter((x) => x !== i) : f.concat(i))), [])
  /* THE KEYS, the host's (DS): arrows advance, Backspace ends a roam, F flags, E opens the strip,
     J opens the finder (part 8), Escape closes things. Not while a field has focus. */
  const stripRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea, select') || t.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'Backspace' && roaming) setRoamingStop(null)
      else if (e.key === 'f' || e.key === 'F') toggleFlag(shown)
      else if (e.key === 'e' || e.key === 'E') setStripOpen((o) => !o)
      else if (e.key === 'j' || e.key === 'J') {
        const btn = stripRef.current?.querySelector<HTMLElement>('[aria-label="find a stop"], [aria-label="close the finder"]')
        setFinder((f) => (f ? null : btn ? btn.getBoundingClientRect() : null))
      }
      else if (e.key === 'Escape') { setExpanded(false); setFinder(null); setConfirmOpen(false) }
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, roaming, shown, toggleFlag])
  /* the shown stop is reported up so the shell's focus (and its visited count) follow the lecture */
  const setFocus = bus.setFocus
  useEffect(() => { const s = steps[shown]; if (s && bus.focus !== s.id) setFocus(s.id, 'walk') }, [shown, steps, setFocus, bus.focus])
  /* ended / resumed is reported up too: the shell hides its chrome for a live lecture and hands it
     back the moment the lecture ends, so ending is always a way home */
  useEffect(() => { if (onEnded) onEnded(ended) }, [ended, onEnded])
  /* RESUME IS THE HOST'S: the bar has no ▶. The host bumps `resumeToken` and an ended lecture picks
     up where the clock stopped. Ignored while live. */
  const lastResume = useRef(resumeToken)
  useEffect(() => {
    if (resumeToken === lastResume.current) return
    lastResume.current = resumeToken
    // the host bumped the token: the pause is added back once, on that one change
    /* eslint-disable react-hooks/set-state-in-effect */
    if (ended && endedAt != null) { const paused = Date.now() - endedAt; setStartAt((s0) => s0 + paused); setEndedAt(null); setEnded(false) }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [resumeToken, ended, endedAt])
  /* WHAT THE ROOM SEES: the live slide while projecting and not ended; dark otherwise */
  const projected = useMemo<ProjectedState>(() => ({
    live: projecting && !ended && N > 0,
    slide: projecting && !ended && steps[shown] ? steps[shown] : null,
    stop: shown + 1,
    count: N,
  }), [projecting, ended, steps, shown, N])
  useProjectorSender(projected)

  const state: PresenterState = !projecting ? 'preview' : ended ? 'ended' : roaming ? 'roaming' : 'presenting'
  const slideFor = (i: number) => <LectureSlide step={steps[i]} index={i} count={N} />
  const nav = (i: number) => ({ content: slideFor(i), stopLabel: 'stop ' + (i + 1), flagged: flags.indexOf(i) >= 0, onNavigate: () => (roaming ? setRoamingStop(i) : step(i - activeStop)) })
  const courseName = course ?? play.title
  /* THE FRAME: a pane beside the palette while previewing or ended, the whole window while live.
     Both wrap the same body, from the same component, so the record survives the flip. */
  const frame = (body: React.ReactNode) => (framed ? (
    <Pane aria-label="studio-presenter" title="presenter" variant="legend" legendBg="var(--surface-canopy)" onClose={onLeave} scroll="none" style={{ flex: 1, minWidth: 0 }}>{body}</Pane>
  ) : (
    <div aria-label="studio-presenter" style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%' }}>{body}</div>
  ))
  if (N === 0) {
    return frame(
      <div data-presenter-screen="empty" style={{ height: '100%', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-caption)', color: 'var(--text-3)', background: 'var(--surface-canopy)' }}>
        nothing to present — open a walk on the desk, or play a saved one
      </div>,
    )
  }
  return frame(
    <div data-presenter-screen={state} style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--surface-canopy)' }}>
      <PresenterHeaderBar course={courseName} state={state} activeStop={activeStop + 1} roamingStop={roaming ? roamingStop + 1 : undefined}
        elapsed={ended || !projecting ? undefined : mmss(elapsedS)} bookedLength={ended || !projecting ? undefined : mmss(BOOKED_SECONDS)} progressPct={Math.min(100, (elapsedS / BOOKED_SECONDS) * 100)} endedTotal={ended ? mmss(elapsedS) + ' total' : undefined}
        confirmOpen={confirmOpen} onEndClick={projecting ? () => setConfirmOpen(true) : undefined} onCancelEnd={() => setConfirmOpen(false)}
        onConfirmEnd={() => { setConfirmOpen(false); setEndedAt(Date.now()); setEnded(true); setRoamingStop(null) }} />
      {/* THE COLUMN: roll, strip, panes. The strip is `flex: none` (it sets that itself); the pane
          below is `flex: 1; min-height: 0`; the roll is `flex: none` at its own height. */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', padding: 'var(--space-3)' }}>
        {ended ? (
          <div data-presenter-ended style={{ flex: 1, minHeight: 0, display: 'grid', placeItems: 'center', fontFamily: 'var(--font-ui)', fontSize: 'var(--fs-body)', color: 'var(--text-2)', textAlign: 'center' }}>
            <span>the lecture has ended — {mmss(elapsedS)} in total · ▶ on the app toolbar resumes it</span>
          </div>
        ) : (
          <>
            <div style={{ flex: 'none' }}>
              <FilmRoll height={286} projecting={projecting}
                prev={shown > 0 ? nav(shown - 1) : null}
                current={{ content: slideFor(shown), flagged: flags.indexOf(shown) >= 0, elapsed: roaming || !projecting ? undefined : mmss(onStopS) }}
                next={shown < N - 1 ? nav(shown + 1) : null}
                onToggleFlag={(which) => toggleFlag(which === 'prev' ? shown - 1 : which === 'next' ? shown + 1 : shown)}
                onExpand={() => setExpanded(true)} />
            </div>
            <div ref={stripRef} style={{ flex: 'none' }}>
              <PresenterStrip steps={steps} activeStop={activeStop} roamingStop={roamingStop} flags={flags} covered={covered}
                open={stripOpen} onOpenChange={setStripOpen}
                onFind={(rect) => setFinder(rect || null)} finderOpen={!!finder}
                onJumpToActive={() => setRoamingStop(null)}
                onRoamTo={roamTo} onMakeActive={makeActive}
                renderPreview={(_s, i) => renderStopPreview(play.steps[i])} />
            </div>
            {/* THE PANES ROW — parts 5–8 land here (notes, deck); until then an empty flex:1 child
                keeps the column rule the strip's contract asks for */}
            <div data-presenter-panes style={{ flex: 1, minHeight: 0 }} />
          </>
        )}
      </div>
      {finder ? (
        <StopFinder steps={steps} activeStop={activeStop} roamingStop={roamingStop} flags={flags} covered={covered}
          anchor={finder} onPick={roamTo} onClose={() => setFinder(null)}
          renderPreview={(_s, i) => renderStopPreview(play.steps[i])} />
      ) : null}
      {expanded ? (
        <div data-presenter-fullscreen onClick={() => setExpanded(false)} style={{
          position: 'fixed', inset: 0, zIndex: 80, background: 'var(--bark-900)', display: 'grid', placeItems: 'center', cursor: 'pointer',
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(100vw, 177.78vh)', aspectRatio: '1120 / 630', cursor: 'default' }}>{slideFor(shown)}</div>
        </div>
      ) : null}
    </div>,
  )
}
