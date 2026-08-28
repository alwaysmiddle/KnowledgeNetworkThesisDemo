// Studio — the shell. It owns three things and nothing else: the header chrome,
// the COMPOSITION (which panes are on, in what order, at what weight), and the
// flexbox that lays them out.
//
// What it no longer owns: the session state, which is studio/bus.ts, and the
// list of what a pane even IS, which is studio/instruments.tsx. It used to own
// both — six useStates, eight closures, an InstrumentId union, a CATALOG order,
// a LABEL record, a LENS_TYPE lookup, and a switch that hand-wired every
// instrument's props and was not exhaustiveness-checked. Adding a channel cost
// an edit in every pane that read it; deleting one flat map cost nine edit sites
// here and still left a false sentence in a file this one never mentions.
//
// The split that fixed it: an instrument is an entry in a registry, and it takes
// ONE prop — the bus. A pane that ignores a channel does not know it exists.
//
// It now owns one more thing, and only one: whether the app is PRESENTING
// (#195). That is a mode, not a composition — it replaces this whole tree with
// the deck, on the same bus, leaving active/mounted/flexMap/presetId untouched
// so exiting restores the exact desk that was there.

import { useState } from 'react'
import type { CSSProperties } from 'react'

import { AppHeader, CountBadge, EDGE_TOKEN, FamilyColumn, InstrumentGroup, InstrumentRow, Pane, PaneHeader, PresetButton, SectionLabel } from '@/ds'
import type { DomainCode, EdgeKind } from '@/ds'

import { byId, domainOf } from '../corpus/graph'
import PresentationFrame from '../present/PresentationFrame'
import { usePresentSession } from '../present/session'
import { AppToolbar } from './AppToolbar'
import { useStudioBus } from './bus'
import { FAMILIES } from './families'
import type { Family } from './families'
import { byInstrument, flattenSlots, INSTRUMENTS, lensTypeOf, PRESETS } from './instruments'
import type { Instrument, InstrumentId, Preset, Slot } from './instruments'

export default function StudioView() {
  // ── composition: which panes are on screen, and how big ───────────────────
  // `mounted` is a superset of `active`: a benched pane stays mounted at
  // display:none so its internal state (an unfold canvas, a zoom level) survives
  // being toggled off and back on.
  // The opening composition is PRESETS[0] — every field of it, id and geometry
  // included. It used to be spelled out three times over, which let the flex
  // weights silently sit out the first render until you clicked a preset.
  // `active` is a list of SLOTS, not of instruments: an entry may be an array,
  // meaning those panes share one column and split it top to bottom. Everything
  // that only cares "is this pane on screen" reads `onScreen` instead.
  const [active, setActive] = useState<Slot[]>(PRESETS[0].active)
  const [mounted, setMounted] = useState<Set<InstrumentId>>(() => new Set(flattenSlots(PRESETS[0].active)))
  const [presetId, setPresetId] = useState<Preset['id'] | null>(PRESETS[0].id)
  const [flexMap, setFlexMap] = useState<Partial<Record<InstrumentId, number>>>(PRESETS[0].flex ?? {})
  // every family starts OPEN: the sidebar is how you reach an instrument, and a
  // palette that hides its contents on first paint is a worse list than the flat
  // one it replaced. Folding is there for when you know what you want.
  const [openFamilies, setOpenFamilies] = useState<Family[]>([...FAMILIES])
  // presenting is a MODE, not a composition (#195) — it takes the whole screen
  // and leaves active/mounted/flexMap/presetId untouched, so exiting restores
  // exactly the desk that was there. Declared above ensureActive, which reads it.
  const { presenting, fullscreen, enter, exit } = usePresentSession()
  // measured once over ALL family names and given to every group, so the counts
  // form one column instead of each group orphaning its own number
  const familyColumn = FamilyColumn([...FAMILIES])

  const onScreen = flattenSlots(active)

  /** drop an instrument from wherever it sits, collapsing a stack it empties */
  const without = (slots: Slot[], inst: InstrumentId): Slot[] =>
    slots
      .map((s) => (Array.isArray(s) ? s.filter((i) => i !== inst) : s))
      .filter((s) => (Array.isArray(s) ? s.length > 0 : s !== inst))
      .map((s) => (Array.isArray(s) && s.length === 1 ? s[0] : s))

  const toggle = (inst: InstrumentId) => {
    setActive((prev) => (flattenSlots(prev).includes(inst) ? without(prev, inst) : [...prev, inst]))
    setMounted((prev) => new Set(prev).add(inst))
    setPresetId(null) // hand-toggling makes the composition "custom" from now on
  }

  /** an instrument handing off to another one: reveal it WITHOUT disturbing the
   * rest of the composition. This is the bus's `reveal`. */
  const ensureActive = (inst: InstrumentId) => {
    // Nothing is composed while presenting, so revealing a pane is meaningless
    // there — and worse than meaningless: activateWalk reveals 'walkviewer', so
    // one step of a SAVED walk inside a deck would quietly rewrite `active` and
    // null `presetId`, and exiting would drop the user into a "custom
    // composition" they never made (#195).
    if (presenting) return
    setActive((prev) => (flattenSlots(prev).includes(inst) ? prev : [...prev, inst]))
    setMounted((prev) => (prev.has(inst) ? prev : new Set(prev).add(inst)))
    setPresetId((p) => (onScreen.includes(inst) ? p : null))
  }

  const applyPreset = (p: Preset) => {
    setActive(p.active)
    setFlexMap(p.flex ?? {})
    setPresetId(p.id)
    setMounted((prev) => {
      const next = new Set(prev)
      for (const inst of flattenSlots(p.active)) next.add(inst)
      return next
    })
  }

  // ── the bus ───────────────────────────────────────────────────────────────
  const bus = useStudioBus(ensureActive)

  // ── layout ────────────────────────────────────────────────────────────────
  // A pane does not decide its own size: where it sits does. A lone column, one
  // half of a stacked column and a bottom strip need three different styles, so
  // the caller supplies them and this only owns the chrome.
  //
  // OB-039: this is now the DS Pane rather than a hand-rolled <section> +
  // PaneHeader + clip div. Pane's own frame defaults to flex:1 (it did not
  // used to have a default at all — sizing was 100% the caller's), so a strip
  // with no explicit flex of its own now needs one passed: see the strips
  // mapping below.
  const pane = (inst: Instrument, on: boolean, style: CSSProperties, extra: string) => (
    <Pane
      key={inst.id}
      aria-label={`studio-pane-${inst.id}`}
      data-slot={on ? 'on' : 'benched'}
      className={extra}
      title={inst.label}
      variant="legend"
      legendBg="var(--surface-canopy)"
      face={inst.face}
      onClose={() => toggle(inst.id as InstrumentId)}
      scroll={inst.body === 'none' ? 'none' : 'y'}
      actions={inst.actions ? inst.actions(bus) : undefined}
      actionBar={inst.actionBar ? inst.actionBar(bus) : undefined}
      style={{ display: on ? 'flex' : 'none', ...style }}
    >
      {inst.render(bus)}
    </Pane>
  )

  /** how wide a column is: a pinned pixel width, or a flex weight the preset may
   * override. A stack takes its LEAD member's weight. */
  const widthOf = (inst: Instrument): CSSProperties => {
    const fixed = typeof inst.flex === 'object' ? inst.flex.fixed : null
    return fixed !== null
      ? { flex: `0 0 ${fixed}px` }
      : { flex: `${flexMap[inst.id as InstrumentId] ?? (typeof inst.flex === 'number' ? inst.flex : 1)} 1 0%` }
  }

  // `order` is what makes the PRESET's array order the visual order, independent
  // of the registry's (DOM) order — so toggling a pane never remounts another.
  const columnSlots = active
    .map((slot, order) => ({
      order,
      members: (Array.isArray(slot) ? slot : [slot])
        .map((id) => byInstrument.get(id)!)
        .filter((i) => i.slot === 'column'),
    }))
    .filter((s) => s.members.length > 0)

  // mounted but not in the composition: kept in the tree at display:none so an
  // unfold canvas or a zoom level survives being toggled off and back on
  const benchedColumns = INSTRUMENTS.filter(
    (i) => i.slot === 'column' && mounted.has(i.id as InstrumentId) && !onScreen.includes(i.id as InstrumentId),
  )
  const strips = INSTRUMENTS.filter((i) => i.slot === 'strip' && mounted.has(i.id as InstrumentId))

  // THE DECK RENDERS INSTEAD OF THE DESK, NOT OVER IT (#195). An overlay would
  // leave both mounted, which means two MapViews and two DocumentPanels — two
  // window listeners, two camera flights, and duplicate aria-labels that make
  // every driver locator ambiguous. Returning early keeps exactly one instance
  // of everything, on the SAME bus, so focus / route / trail / activeWalk are
  // literally the same values on both sides of the transition.
  if (presenting) return <PresentationFrame bus={bus} onExit={exit} fullscreen={fullscreen} />

  return (
    <div className="h-full flex flex-col bg-canopy">
      {/* The header renders from the DS AppHeader; the live counts are DS
          CountBadges (OB-065 dropped the session-control PillButtons outright,
          not relocated — bus.teach()/bus.reset()/bus.clearRoute() are untouched,
          there is simply no UI path to them from here any more). AppHeader owns
          the VISIBLE focus (dot + title). The machine-readable focus hook the
          shot driver reads — data-focus (the id) plus the title as innerText —
          is not something the DS component carries, so the consumer keeps a
          hidden readout twin beside it. See #74: AppHeader has no focus
          test-hook. */}
      <div aria-label="studio-header" style={{ flexShrink: 0, position: 'relative' }}>
        <AppHeader
          product="thesis-demo"
          corpusLine="instrument palette — toggle views on the sidebar, everything shares one focus / route / trail bus"
          focus={bus.focus ? { title: byId.get(bus.focus)!.title, domain: domainOf(bus.focus) as DomainCode } : null}
        >
          <span aria-label="studio-visited">
            <CountBadge value={bus.visited.size} label="visited" />
          </span>
          <span aria-label="studio-route">
            <CountBadge value={bus.route.length} label="route" />
          </span>
        </AppHeader>
        {/* hidden readout twin: the shot driver reads focus id + title from here */}
        <span data-focus={bus.focus ?? ''} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
          {bus.focus ? byId.get(bus.focus)!.title : ''}
        </span>
      </div>

      {/* #55: app-level operations, pinned directly under the app header */}
      <AppToolbar onPresent={enter} />

      <div className="flex-1 min-h-0 flex gap-3 p-3">
        {/* #96: the palette is now a pane — paper face, border-frame hairline,
            rounded-lg, legend PaneHeader. It was a flat bordered sidebar
            (border-r border-slate-200 bg-white) which read as an unfinished
            migration against the warm panes beside it. overflow-visible is
            required so the legend title can float above the top border. */}
        <aside aria-label="studio-sidebar" className="relative w-52 shrink-0 flex flex-col overflow-visible rounded-lg border border-frame bg-paper">
          <PaneHeader title="palette" variant="legend" legendBg="var(--surface-canopy)" />
          <div className="mb-3 min-h-0 flex-1 overflow-auto">
            <div className="border-b border-hair p-3 pt-2">
              <SectionLabel>presets</SectionLabel>
              <div className="flex flex-col gap-1">
                {PRESETS.map((p) => (
                  <div key={p.id} aria-label={`studio-preset-${p.id}`}>
                    <PresetButton label={p.label} hint={p.hint} active={presetId === p.id} onClick={() => applyPreset(p)} />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 flex-1">
              <SectionLabel>instruments</SectionLabel>
              {/* #97: the flat INSTRUMENTS.map is now the DS InstrumentGroup, one
                  family per group. FamilyColumn is measured ONCE over every family
                  name and handed to all of them, so the on-screen counts land on a
                  single x instead of each group orphaning its own number. A group
                  reports how many of its members are on screen, so a folded family
                  still says something. */}
              <div className="flex flex-col gap-0.5">
                {FAMILIES.map((fam) => {
                  const members = INSTRUMENTS.filter((i) => i.family === fam)
                  if (members.length === 0) return null
                  return (
                    <InstrumentGroup
                      key={fam}
                      label={fam}
                      labelWidth={familyColumn}
                      open={openFamilies.includes(fam)}
                      onToggle={() => setOpenFamilies((f) => (f.includes(fam) ? f.filter((x) => x !== fam) : [...f, fam]))}
                      count={members.filter((i) => onScreen.includes(i.id as InstrumentId)).length}
                    >
                      {members.map((inst) => {
                        const lensType = lensTypeOf(inst.id)
                        return (
                          <div key={inst.id} aria-label={`studio-inst-${inst.id}`}>
                            <InstrumentRow
                              label={inst.label}
                              on={onScreen.includes(inst.id as InstrumentId)}
                              swatch={lensType ? EDGE_TOKEN[lensType as EdgeKind] : undefined}
                              onClick={() => toggle(inst.id as InstrumentId)}
                            />
                          </div>
                        )
                      })}
                    </InstrumentGroup>
                  )
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* #77/#96: the canopy desk. Panes float on it with gap-3 between them;
            the 12px gutter matches the p-3 window inset on the outer flex row.
            Canopy is now on the root div — no inline background needed here. */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex-1 min-h-0 flex gap-3">
            {columnSlots.map(({ order, members }) =>
              members.length === 1 ? (
                pane(members[0], true, { order, ...widthOf(members[0]) }, '')
              ) : (
                <div
                  key={members.map((m) => m.id).join('+')}
                  aria-label={`studio-stack-${members.map((m) => m.id).join('-')}`}
                  className="flex flex-col min-w-0 min-h-0 gap-3"
                  style={{ order, ...widthOf(members[0]) }}
                >
                  {members.map((m) =>
                    pane(
                      m,
                      true,
                      // stackGrow:false sizes the pane to its content and hands the
                      // slack to its stack-mates; the default takes an even share.
                      { flex: m.stackGrow === false ? '0 0 auto' : '1 1 0%' },
                      '',
                    ),
                  )}
                </div>
              ),
            )}
            {benchedColumns.map((i) => pane(i, false, {}, ''))}
          </div>
          {strips.map((i) =>
            pane(
              i,
              onScreen.includes(i.id as InstrumentId),
              {
                order: onScreen.indexOf(i.id as InstrumentId),
                // a strip is never stretched by the desk's own flex column — Pane's
                // frame defaults to flex:1 (the hand-rolled <section> it replaces
                // had no default at all), so an explicit height pins it and a
                // heightless one still hugs its own content instead of growing
                flex: 'none',
                height: i.height ? `${i.height}px` : undefined,
              },
              'w-full',
            ),
          )}
        </div>
      </div>
    </div>
  )
}
