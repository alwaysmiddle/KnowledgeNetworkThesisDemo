// Studio — the instrument palette. Every current view (Map, Walk, Unfold,
// Unfold·Graph, Contours, EVoC, Tree, Document) plus the three relation
// lenses are pickable INSTRUMENTS sharing one sync bus (focus / route /
// visited): selecting a leaf anywhere writes focus, and every instrument
// that reads focus recenters on it. A PRESET is just a curated instrument
// list plus layout weights — Coding (tree + three lenses, for reading one
// node's relations at once) and Teaching (map + unfold-graph + document +
// walk, for an accumulating guided tour). Toggling instruments by hand after
// applying a preset de-highlights it — the composition is "custom" from then
// on, same idea as CompareView's slot picker, generalized to N panes instead
// of 2.
//
// Deliberate exception to "top-level views don't import from cockpit/"
// (see CompareView.tsx's identical note): TreePanel, KnowledgePanel and
// WALKS are the real Tree and Document instruments, not stand-ins for them.
//
// The bus is now fully wired: MapView paints visited as dashed rings and
// writes focus on pin-click; "open neighborhood" bumps a counter-keyed
// unfoldSeed that reseeds Unfold·Graph (never key-remounted, so a grown
// canvas survives everything else); Unfold·Graph writes focus (open) and
// visited (place) as it grows. "★ teach me this" runs lens.ts's curriculum
// over the focused leaf's depends_on cone and drops the ordered walk onto
// the shared route, surfacing a cycle note when the topo-sort had to fall
// back to fewest-unmet-prerequisites.

import { useState } from 'react'
import type { ReactNode } from 'react'

import { byId, domainOf, DOMAIN_COLOR, EDGE_COLOR, ROOT_ID } from './graph'
import type { EdgeType } from './graph'
import MapView from './MapView'
import WalkView from './WalkView'
import UnfoldView from './UnfoldView'
import UnfoldGraphView from './UnfoldGraphView'
import ContourView from './ContourView'
import EvocView from './EvocView'
import LensPane from './LensPane'
import TreePanel from './cockpit/TreePanel'
import KnowledgePanel from './cockpit/KnowledgePanel'
import { WALKS } from './cockpit/walks'
import { curriculum } from './lens'

type InstrumentId =
  | 'map'
  | 'walk'
  | 'unfold'
  | 'unfoldg'
  | 'contours'
  | 'evoc'
  | 'tree'
  | 'doc'
  | 'lens-depends_on'
  | 'lens-references'
  | 'lens-data_flow'

interface Preset {
  id: 'coding' | 'teaching'
  label: string
  hint: string
  active: InstrumentId[] // column order; 'walk' implies the bottom strip
  flex?: Partial<Record<InstrumentId, number>>
}

const PRESETS: Preset[] = [
  {
    id: 'coding',
    label: 'Coding',
    hint: 'tree + three lenses — every pane recenters on focus',
    active: ['tree', 'lens-depends_on', 'lens-references', 'lens-data_flow'],
  },
  {
    id: 'teaching',
    label: 'Teaching',
    hint: 'map + unfold + document + walk — accumulating, authored order',
    active: ['map', 'unfoldg', 'doc', 'walk'],
    flex: { map: 2, unfoldg: 1.4, doc: 1 },
  },
]

// fixed sidebar order — every current standalone view, then the three lenses
const CATALOG: InstrumentId[] = [
  'map',
  'walk',
  'unfold',
  'unfoldg',
  'contours',
  'evoc',
  'tree',
  'doc',
  'lens-depends_on',
  'lens-references',
  'lens-data_flow',
]

const LABEL: Record<InstrumentId, string> = {
  map: 'Map',
  walk: 'Walk',
  unfold: 'Unfold',
  unfoldg: 'Unfold·Graph',
  contours: 'Contours',
  evoc: 'EVoC',
  tree: 'Tree',
  doc: 'Document',
  'lens-depends_on': 'Lens: dependencies',
  'lens-references': 'Lens: references',
  'lens-data_flow': 'Lens: data flow',
}

const LENS_TYPE: Partial<Record<InstrumentId, EdgeType>> = {
  'lens-depends_on': 'depends_on',
  'lens-references': 'references',
  'lens-data_flow': 'data_flow',
}

export default function StudioView() {
  const [focus, setFocusState] = useState<string | null>(null)
  const [route, setRouteState] = useState<string[]>([])
  const [visited, setVisited] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<InstrumentId[]>(PRESETS[0].active)
  const [mounted, setMounted] = useState<Set<InstrumentId>>(() => new Set(PRESETS[0].active))
  const [presetId, setPresetId] = useState<'coding' | 'teaching' | null>('coding')
  const [treeRootId, setTreeRootId] = useState(ROOT_ID)
  const [flexMap, setFlexMap] = useState<Partial<Record<InstrumentId, number>>>({})
  const [unfoldSeed, setUnfoldSeed] = useState<{ id: string; n: number } | null>(null)
  const [cycleNote, setCycleNote] = useState(false)

  // ── the sync bus ────────────────────────────────────────────────────────
  const addVisited = (id: string | null) => {
    if (!id || byId.get(id)?.kind !== 'leaf') return // containers would crash leaf-keyed lookups downstream
    setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }
  const setFocus = (id: string) => {
    setFocusState(id)
    addVisited(id)
  }
  const writeRoute = (r: string[]) => {
    setRouteState(r)
    if (r.length > 0) addVisited(r[r.length - 1])
  }
  const resetSession = () => {
    // deliberately doesn't touch the unfold canvas or instrument composition
    // — "reset session" clears WHERE you are, not WHAT you have on screen
    setFocusState(null)
    setRouteState([])
    setVisited(new Set())
    setCycleNote(false)
  }

  // ── composition ─────────────────────────────────────────────────────────
  const mount = (inst: InstrumentId) => setMounted((prev) => (prev.has(inst) ? prev : new Set(prev).add(inst)))

  const toggle = (inst: InstrumentId) => {
    setActive((prev) => (prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst]))
    mount(inst)
    setPresetId(null)
  }

  // used by instrument glue (e.g. "open neighborhood") to reveal a pane
  // without disturbing an already-active composition
  const ensureActive = (inst: InstrumentId) => {
    if (active.includes(inst)) return
    setActive((prev) => (prev.includes(inst) ? prev : [...prev, inst]))
    mount(inst)
    setPresetId(null)
  }

  // "★ teach me this": a generated curriculum over the focused leaf's
  // depends_on cone, dropped straight onto the shared route
  const teach = () => {
    if (!focus) return
    const c = curriculum(focus, 'depends_on', 3)
    writeRoute(c.order)
    setCycleNote(c.hadCycle)
    ensureActive('walk')
    ensureActive('map')
  }

  const applyPreset = (p: Preset) => {
    setActive(p.active)
    setFlexMap(p.flex ?? {})
    setPresetId(p.id)
    setMounted((prev) => {
      const next = new Set(prev)
      for (const inst of p.active) next.add(inst)
      return next
    })
  }

  const activateWalkAtStop = (walkId: string, stopIndex: number) => {
    const w = WALKS.find((x) => x.id === walkId)
    if (!w || stopIndex < 0 || stopIndex >= w.stops.length) return
    // mirrors CockpitView's activateWalkAtStop guard shape, but writes into
    // the studio bus's route instead of cockpit's own currentId/trail state
    writeRoute(w.stops.slice(0, stopIndex + 1).map((s) => s.id))
  }

  // ── instrument rendering ────────────────────────────────────────────────
  const renderInstrument = (inst: InstrumentId): ReactNode => {
    const lensType = LENS_TYPE[inst]
    if (lensType) return <LensPane focus={focus} type={lensType} onFocus={setFocus} />
    switch (inst) {
      case 'tree':
        return <TreePanel treeRootId={treeRootId} currentId={focus ?? ROOT_ID} onSelect={setFocus} onZoom={setTreeRootId} />
      case 'doc':
        return <KnowledgePanel currentId={focus ?? ROOT_ID} onSelectChild={setFocus} onJump={setFocus} onActivateWalkAtStop={activateWalkAtStop} />
      case 'map':
        return (
          <MapView
            route={route}
            visited={visited}
            compact
            onFocus={setFocus}
            onStartWalk={(id) => {
              writeRoute([id])
              ensureActive('walk')
            }}
            onOpenNeighborhood={(id) => {
              setFocus(id)
              setUnfoldSeed((s) => ({ id, n: (s?.n ?? 0) + 1 }))
              ensureActive('unfoldg')
            }}
          />
        )
      case 'walk':
        return <WalkView route={route} setRoute={writeRoute} />
      case 'unfoldg':
        return <UnfoldGraphView resetTo={unfoldSeed} onVisit={addVisited} onOpen={setFocus} />
      case 'unfold':
        return <UnfoldView />
      case 'contours':
        return <ContourView />
      case 'evoc':
        return <EvocView />
    }
  }

  const paneShell = (inst: InstrumentId, strip = false) => {
    const idx = active.indexOf(inst)
    const on = idx >= 0
    const flexStyle = strip ? undefined : inst === 'tree' ? '0 0 240px' : `${flexMap[inst] ?? 1} 1 0%`
    return (
      <section
        key={inst}
        aria-label={`studio-pane-${inst}`}
        data-slot={on ? 'on' : 'benched'}
        className={
          strip
            ? 'flex-col min-w-0 min-h-0 bg-white h-[240px] w-full border-t border-slate-200'
            : 'flex-col min-w-0 min-h-0 bg-white border-r border-slate-200'
        }
        style={{ display: on ? 'flex' : 'none', order: idx, flex: flexStyle }}
      >
        <header className="shrink-0 flex items-center gap-1.5 px-2 py-1 border-b border-slate-200 bg-white text-[11px]">
          <span className="font-bold text-slate-700 truncate">{LABEL[inst]}</span>
          <span className="flex-1" />
          <button
            onClick={() => toggle(inst)}
            title="remove from composition"
            className="px-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 min-h-0">{renderInstrument(inst)}</div>
      </section>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-white text-[11.5px]">
        <span className="font-bold text-slate-800 text-[12px]">Studio</span>
        <span className="text-slate-400">instrument palette — toggle views on the sidebar, everything shares one focus / route / visited bus</span>
        <span className="flex-1" />
        <span data-focus={focus ?? ''} className="flex items-center gap-1.5">
          {focus ? (
            <>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: DOMAIN_COLOR[domainOf(focus)] }} />
              <span className="font-medium text-slate-700">{byId.get(focus)!.title}</span>
            </>
          ) : (
            <span className="text-slate-400">no focus</span>
          )}
        </span>
        <button
          aria-label="studio-teach"
          onClick={teach}
          disabled={!focus || byId.get(focus)?.kind !== 'leaf'}
          title="generate a depends_on curriculum ending at the focused node and walk it"
          className={[
            'px-2 py-0.5 rounded border font-medium',
            focus && byId.get(focus)?.kind === 'leaf'
              ? 'border-amber-400 text-amber-700 hover:bg-amber-50'
              : 'border-slate-200 text-slate-300 cursor-not-allowed',
          ].join(' ')}
        >
          ★ teach me this
        </button>
        {cycleNote && <span className="text-[10px] text-slate-400">contains a cycle — order approximate</span>}
        <span aria-label="studio-visited" className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
          {visited.size} visited
        </span>
        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{route.length} route</span>
        <button
          onClick={() => {
            writeRoute([])
            setCycleNote(false)
          }}
          className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100"
        >
          clear route
        </button>
        <button onClick={resetSession} className="px-2 py-0.5 rounded border border-slate-300 hover:bg-slate-100">
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
                    presetId === p.id ? 'border-amber-400 bg-amber-50 font-semibold text-amber-800' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-600',
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
              {CATALOG.map((inst) => {
                const idx = active.indexOf(inst)
                const on = idx >= 0
                const lensType = LENS_TYPE[inst]
                return (
                  <button
                    key={inst}
                    aria-label={`studio-inst-${inst}`}
                    onClick={() => toggle(inst)}
                    className={['flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-left', on ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-500 hover:bg-slate-50'].join(
                      ' ',
                    )}
                  >
                    <span className="w-3 text-center shrink-0">{on ? '●' : '○'}</span>
                    {lensType && <span className="w-2 h-2 rounded-sm inline-block shrink-0" style={{ background: EDGE_COLOR[lensType] }} />}
                    <span className="truncate flex-1">{LABEL[inst]}</span>
                    {on && <span className="text-slate-400 shrink-0">{idx + 1}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 flex">{CATALOG.filter((i) => i !== 'walk' && mounted.has(i)).map((inst) => paneShell(inst))}</div>
          {mounted.has('walk') && paneShell('walk', true)}
        </div>
      </div>
    </div>
  )
}
