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

import { useState } from 'react'
import type { CSSProperties } from 'react'

import { byId, domainOf, DOMAIN_COLOR, EDGE_COLOR } from '../corpus/graph'
import { useStudioBus } from './bus'
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
  const canTeach = !!bus.focus && byId.get(bus.focus)?.topic === true

  // ── layout ────────────────────────────────────────────────────────────────
  // A pane does not decide its own size: where it sits does. A lone column, one
  // half of a stacked column and a bottom strip need three different styles, so
  // the caller supplies them and this only owns the chrome.
  const pane = (inst: Instrument, on: boolean, style: CSSProperties, extra: string) => (
    <section
      key={inst.id}
      aria-label={`studio-pane-${inst.id}`}
      data-slot={on ? 'on' : 'benched'}
      className={`flex-col min-w-0 min-h-0 bg-white ${extra}`}
      style={{ display: on ? 'flex' : 'none', ...style }}
    >
      <header className="shrink-0 flex items-center gap-1.5 px-2 py-1 border-b border-slate-200 bg-white text-[11px]">
        <span className="font-bold text-slate-700 truncate">{inst.label}</span>
        <span className="flex-1" />
        <button
          onClick={() => toggle(inst.id as InstrumentId)}
          title="remove from composition"
          className="px-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          ✕
        </button>
      </header>
      {/* a strip with no declared height sizes itself to its content */}
      <div className={inst.slot === 'strip' && !inst.height ? 'shrink-0' : 'flex-1 min-h-0'}>{inst.render(bus)}</div>
    </section>
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

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div
        aria-label="studio-header"
        className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-white text-[11.5px]"
      >
        <span className="font-bold text-slate-800 text-[12px]">Studio</span>
        <span className="text-slate-400">instrument palette — toggle views on the sidebar, everything shares one focus / route / trail bus</span>
        <span className="flex-1" />
        <span data-focus={bus.focus ?? ''} className="flex items-center gap-1.5">
          {bus.focus ? (
            <>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: DOMAIN_COLOR[domainOf(bus.focus)] }} />
              <span className="font-medium text-slate-700">{byId.get(bus.focus)!.title}</span>
            </>
          ) : (
            <span className="text-slate-400">no focus</span>
          )}
        </span>
        <button
          aria-label="studio-teach"
          onClick={bus.teach}
          disabled={!canTeach}
          title="generate a depends_on curriculum ending at the focused node and walk it"
          className={[
            'px-2 py-0.5 rounded border font-medium',
            canTeach ? 'border-amber-400 text-amber-700 hover:bg-amber-50' : 'border-slate-200 text-slate-300 cursor-not-allowed',
          ].join(' ')}
        >
          ★ teach me this
        </button>
        {bus.cycleNote && <span className="text-[10px] text-slate-400">contains a cycle — order approximate</span>}
        <span aria-label="studio-visited" className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
          {bus.visited.size} visited
        </span>
        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{bus.route.length} route</span>
        <button onClick={bus.clearRoute} className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100">
          clear route
        </button>
        <button onClick={bus.reset} className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100">
          reset session
        </button>
      </div>

      <div className="flex-1 min-h-0 flex">
        <aside aria-label="studio-sidebar" className="w-52 shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-auto">
          <div className="p-2 border-b border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Presets</div>
            <div className="flex flex-col gap-1">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  aria-label={`studio-preset-${p.id}`}
                  title={p.hint}
                  onClick={() => applyPreset(p)}
                  className={[
                    'text-left px-2 py-1 rounded border text-[11px]',
                    presetId === p.id
                      ? 'border-amber-400 bg-amber-50 font-semibold text-amber-800'
                      : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-600',
                  ].join(' ')}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5">
              {presetId ? PRESETS.find((p) => p.id === presetId)!.hint : 'custom composition'}
            </div>
          </div>

          <div className="p-2 flex-1 overflow-auto">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Instruments</div>
            <div className="flex flex-col gap-0.5">
              {INSTRUMENTS.map((inst) => {
                const idx = onScreen.indexOf(inst.id as InstrumentId)
                const on = idx >= 0
                const lensType = lensTypeOf(inst.id)
                return (
                  <button
                    key={inst.id}
                    aria-label={`studio-inst-${inst.id}`}
                    onClick={() => toggle(inst.id as InstrumentId)}
                    className={[
                      'flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-left',
                      on ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-500 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span className="w-3 text-center shrink-0">{on ? '●' : '○'}</span>
                    {lensType && <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{ background: EDGE_COLOR[lensType] }} />}
                    <span className="truncate flex-1">{inst.label}</span>
                    {on && <span className="text-slate-400 shrink-0">{idx + 1}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 flex">
            {columnSlots.map(({ order, members }) =>
              members.length === 1 ? (
                pane(members[0], true, { order, ...widthOf(members[0]) }, 'border-r border-slate-200')
              ) : (
                <div
                  key={members.map((m) => m.id).join('+')}
                  aria-label={`studio-stack-${members.map((m) => m.id).join('-')}`}
                  className="flex flex-col min-w-0 min-h-0 border-r border-slate-200"
                  style={{ order, ...widthOf(members[0]) }}
                >
                  {members.map((m) =>
                    pane(
                      m,
                      true,
                      // stackGrow:false sizes the pane to its content and hands the
                      // slack to its stack-mates; the default takes an even share.
                      { flex: m.stackGrow === false ? '0 0 auto' : '1 1 0%' },
                      'border-b border-slate-200 last:border-b-0',
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
              { order: onScreen.indexOf(i.id as InstrumentId), height: i.height ? `${i.height}px` : undefined },
              'w-full border-t border-slate-200',
            ),
          )}
        </div>
      </div>
    </div>
  )
}
