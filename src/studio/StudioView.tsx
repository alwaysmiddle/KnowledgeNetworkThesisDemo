// Studio — the instrument palette. Every view (Map, Walk, Unfold,
// Unfold·Graph, Contours, EVoC, Tree, Document, Plex, Trail) plus the three
// relation lenses are pickable INSTRUMENTS sharing one sync bus (focus /
// route / trail): selecting a leaf anywhere writes focus, and every
// instrument that reads focus recenters on it. A PRESET is just a curated
// instrument list plus layout weights — Coding (tree + three lenses),
// Teaching (map + unfold-graph + document + walk), and Cockpit (map + tree +
// document + plex + trail — the spike-verified navigation model, formerly
// its own tab). Toggling instruments by hand after applying a preset
// de-highlights it — the composition is "custom" from then on.
//
// The TRAIL is the bus's temporal channel, absorbed from the cockpit:
// every focus write appends an entry (append-only, via-tagged, jumps
// accented), and the map's dashed visited-rings are DERIVED from it (topics
// only). The cockpit's other contracts live here too: AUTO-RE-ROOT (a focus
// outside the tree's current root re-roots it to the node's parent, only
// ever reactively) and the authored-walk cursor (activate from the document
// panel's "Walks through here" or the trail strip, advance stop by stop —
// each stop lands the walked-so-far prefix on the shared route).
//
// The map's CAMERA is on the bus too, one-way, via counter-keyed
// MapFlyCommands (so the map's own pin-clicks never echo back into a
// move): opening a node in Unfold·Graph fits the map to that node plus its
// graph neighbors and pins it; any walk interaction pans the map to the
// new tip at the current altitude; "teach me this", switching the Walk
// instrument on, or the walk header's ⤢ button fit the WHOLE path.

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { byId, domainOf, DOMAIN_COLOR, EDGE_COLOR, ROOT_ID } from '../corpus/graph'
import type { EdgeType } from '../corpus/graph'
import { edgesTouching } from '../model/flat'
import MapView from '../instruments/MapView'
import type { MapFlyCommand } from '../instruments/MapView'
import WalkView from '../instruments/WalkView'
import UnfoldView from '../instruments/UnfoldView'
import UnfoldGraphView from '../instruments/UnfoldGraphView'
import ContourView from '../instruments/ContourView'
import EvocView from '../instruments/EvocView'
import LensPane from '../instruments/LensPane'
import TreePanel from '../instruments/TreePanel'
import KnowledgePanel from '../instruments/KnowledgePanel'
import PlexPanel from '../instruments/PlexPanel'
import TrailStrip from '../instruments/TrailStrip'
import { WALKS } from '../corpus/walks'
import { isInSubtree, parentOf } from '../model/nav'
import type { ActiveWalkState, TrailEntry, TrailVia } from '../model/nav'
import { curriculum } from '../model/lens'

type InstrumentId =
  | 'map'
  | 'walk'
  | 'unfold'
  | 'unfoldg'
  | 'contours'
  | 'evoc'
  | 'tree'
  | 'doc'
  | 'plex'
  | 'trail'
  | 'lens-depends_on'
  | 'lens-references'
  | 'lens-data_flow'

// 'walk' and 'trail' render as bottom strips, everything else as columns
const STRIPS: InstrumentId[] = ['walk', 'trail']

interface Preset {
  id: 'coding' | 'teaching' | 'cockpit'
  label: string
  hint: string
  active: InstrumentId[] // column order; strips always sit at the bottom
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
  {
    id: 'cockpit',
    label: 'Cockpit',
    hint: 'map + tree + document + plex + trail — the spike-verified navigation model',
    active: ['map', 'tree', 'doc', 'plex', 'trail'],
    flex: { map: 1.6, doc: 1.2, plex: 1 },
  },
]

// fixed sidebar order — every view, then the three lenses
const CATALOG: InstrumentId[] = [
  'map',
  'walk',
  'unfold',
  'unfoldg',
  'contours',
  'evoc',
  'tree',
  'doc',
  'plex',
  'trail',
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
  plex: 'Plex',
  trail: 'Trail',
  'lens-depends_on': 'Lens: builds on',
  'lens-references': 'Lens: see also',
  'lens-data_flow': 'Lens: uses',
}

const LENS_TYPE: Partial<Record<InstrumentId, EdgeType>> = {
  'lens-depends_on': 'depends_on',
  'lens-references': 'references',
  'lens-data_flow': 'data_flow',
}

export default function StudioView() {
  const [focus, setFocusState] = useState<string | null>(null)
  const [route, setRouteState] = useState<string[]>([])
  const [trail, setTrail] = useState<TrailEntry[]>([])
  const [activeWalk, setActiveWalk] = useState<ActiveWalkState | null>(null)
  const [active, setActive] = useState<InstrumentId[]>(PRESETS[0].active)
  const [mounted, setMounted] = useState<Set<InstrumentId>>(() => new Set(PRESETS[0].active))
  const [presetId, setPresetId] = useState<Preset['id'] | null>('coding')
  const [treeRootId, setTreeRootId] = useState(ROOT_ID)
  const [flexMap, setFlexMap] = useState<Partial<Record<InstrumentId, number>>>({})
  const [unfoldSeed, setUnfoldSeed] = useState<{ id: string; n: number } | null>(null)
  const [cycleNote, setCycleNote] = useState(false)
  const [mapFly, setMapFly] = useState<MapFlyCommand | null>(null)

  // ── the sync bus ────────────────────────────────────────────────────────
  // visited is DERIVED from the trail: topics only, because the map's
  // dashed-ring overlay does topic-keyed lookups
  const visited = useMemo(() => new Set(trail.filter((t) => byId.get(t.id)?.topic).map((t) => t.id)), [trail])

  // append-only, but a write identical to the tip is dropped — re-clicking
  // the same pin shouldn't spam chips (the cockpit never had that path;
  // Studio's bus fans one click out to several writers)
  const appendTrail = (id: string | null, via: TrailVia, jump = false) => {
    if (!id || !byId.get(id)) return
    setTrail((t) => (t.length > 0 && t[t.length - 1].id === id ? t : [...t, { id, via, jump }]))
  }
  const setFocus = (id: string, via: TrailVia, jump = false) => {
    setFocusState(id)
    appendTrail(id, via, jump)
    // AUTO-RE-ROOT — the cockpit invariant: reactive only, never on its own
    setTreeRootId((root) => (isInSubtree(id, root) ? root : parentOf(id)))
  }
  const writeRoute = (r: string[]) => {
    setRouteState(r)
    if (r.length > 0) appendTrail(r[r.length - 1], 'walk')
  }
  const resetSession = () => {
    // deliberately doesn't touch the unfold canvas or instrument composition
    // — "reset session" clears WHERE you are, not WHAT you have on screen
    setFocusState(null)
    setRouteState([])
    setTrail([])
    setActiveWalk(null)
    setCycleNote(false)
  }

  // ── map camera sync ─────────────────────────────────────────────────────
  // one-way commands into MapView; counter-keyed so identical payloads still
  // re-fly, and so the map's own focus writes never bounce back into a move
  const flyMap = (ids: string[], pin: string | null, mode: 'fit' | 'center') =>
    setMapFly((prev) => ({ ids, pin, mode, n: (prev?.n ?? 0) + 1 }))

  // opening a node in Unfold·Graph zooms the map to it WITH its graph
  // neighbors in frame, pinned so its typed links trace on the geography
  const openFromUnfold = (id: string) => {
    setFocus(id, 'graph')
    flyMap([id, ...edgesTouching(id).map((e) => (e.source === id ? e.target : e.source))], id, 'fit')
  }

  // every walk interaction (extend / fork / backtrack / start) leaves the
  // clicked node as the route tip — pan the map to it, keep the altitude
  const writeRouteFromWalk = (r: string[]) => {
    writeRoute(r)
    if (r.length > 0) flyMap([r[r.length - 1]], null, 'center')
  }

  // ── composition ─────────────────────────────────────────────────────────
  const mount = (inst: InstrumentId) => setMounted((prev) => (prev.has(inst) ? prev : new Set(prev).add(inst)))

  const toggle = (inst: InstrumentId) => {
    // selecting the Walk instrument with a route in hand shows the whole path
    if (inst === 'walk' && !active.includes(inst) && route.length > 0) flyMap(route, null, 'fit')
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
    if (c.order.length > 0) flyMap(c.order, null, 'fit') // the whole curriculum in frame
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

  // ── authored walks (cockpit's cursor, on the bus) ───────────────────────
  // activating a walk lands the walked-so-far prefix on the shared route and
  // reveals the trail strip, where the next-stop controls live
  const activateWalkAtStop = (walkId: string, stopIndex: number) => {
    const w = WALKS.find((x) => x.id === walkId)
    if (!w || stopIndex < 0 || stopIndex >= w.stops.length) return
    setActiveWalk({ walkId, cursor: stopIndex })
    ensureActive('trail')
    writeRouteFromWalk(w.stops.slice(0, stopIndex + 1).map((s) => s.id))
  }
  const advanceWalk = () => {
    if (!activeWalk) return
    activateWalkAtStop(activeWalk.walkId, activeWalk.cursor + 1)
  }
  const deactivateWalk = () => setActiveWalk(null)

  // ── instrument rendering ────────────────────────────────────────────────
  const renderInstrument = (inst: InstrumentId): ReactNode => {
    const lensType = LENS_TYPE[inst]
    if (lensType) return <LensPane focus={focus} type={lensType} onFocus={(id) => setFocus(id, 'link', true)} />
    switch (inst) {
      case 'tree':
        return <TreePanel treeRootId={treeRootId} currentId={focus ?? ROOT_ID} onSelect={(id) => setFocus(id, 'tree')} onZoom={setTreeRootId} />
      case 'doc':
        return (
          <KnowledgePanel
            currentId={focus ?? ROOT_ID}
            onSelectChild={(id) => setFocus(id, 'tree')}
            onJump={(id) => setFocus(id, 'link', true)}
            onActivateWalkAtStop={activateWalkAtStop}
          />
        )
      case 'plex':
        return (
          <div className="h-full overflow-auto bg-white px-2 py-1">
            <PlexPanel currentId={focus ?? ROOT_ID} onSelect={(id) => setFocus(id, 'tree')} onJump={(id) => setFocus(id, 'link', true)} />
          </div>
        )
      case 'trail':
        return (
          <TrailStrip
            trail={trail}
            onSelectTrailEntry={(id) => setFocus(id, 'trail')}
            activeWalk={activeWalk}
            onActivateWalk={(walkId) => activateWalkAtStop(walkId, 0)}
            onAdvanceWalk={advanceWalk}
            onJumpToStop={(index) => activeWalk && activateWalkAtStop(activeWalk.walkId, index)}
            onDeactivateWalk={deactivateWalk}
          />
        )
      case 'map':
        return (
          <MapView
            route={route}
            visited={visited}
            compact
            flyTo={mapFly}
            onFocus={(id) => setFocus(id, 'map')}
            onStartWalk={(id) => {
              writeRoute([id])
              ensureActive('walk')
            }}
            onOpenNeighborhood={(id) => {
              setFocus(id, 'map')
              setUnfoldSeed((s) => ({ id, n: (s?.n ?? 0) + 1 }))
              ensureActive('unfoldg')
            }}
          />
        )
      case 'walk':
        return <WalkView route={route} setRoute={writeRouteFromWalk} />
      case 'unfoldg':
        return <UnfoldGraphView resetTo={unfoldSeed} onVisit={(id) => appendTrail(id, 'graph')} onOpen={openFromUnfold} />
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
            ? // walk gets a working-height strip; the trail strip sizes itself
              `flex-col min-w-0 min-h-0 bg-white w-full border-t border-slate-200${inst === 'walk' ? ' h-[240px]' : ''}`
            : 'flex-col min-w-0 min-h-0 bg-white border-r border-slate-200'
        }
        style={{ display: on ? 'flex' : 'none', order: idx, flex: flexStyle }}
      >
        <header className="shrink-0 flex items-center gap-1.5 px-2 py-1 border-b border-slate-200 bg-white text-[11px]">
          <span className="font-bold text-slate-700 truncate">{LABEL[inst]}</span>
          <span className="flex-1" />
          {inst === 'walk' && route.length > 0 && (
            <button
              aria-label="studio-walk-fit"
              onClick={() => {
                ensureActive('map')
                flyMap(route, null, 'fit')
              }}
              title="fit the whole walk path on the map"
              className="px-1.5 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 text-[10px] font-medium"
            >
              ⤢ path on map
            </button>
          )}
          <button
            onClick={() => toggle(inst)}
            title="remove from composition"
            className="px-1.5 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </header>
        <div className={inst === 'trail' ? 'shrink-0' : 'flex-1 min-h-0'}>{renderInstrument(inst)}</div>
      </section>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-white text-[11.5px]">
        <span className="font-bold text-slate-800 text-[12px]">Studio</span>
        <span className="text-slate-400">instrument palette — toggle views on the sidebar, everything shares one focus / route / trail bus</span>
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
          disabled={!focus || !byId.get(focus)?.topic}
          title="generate a depends_on curriculum ending at the focused node and walk it"
          className={[
            'px-2 py-0.5 rounded border font-medium',
            focus && byId.get(focus)?.topic
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
            setActiveWalk(null)
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
          <div className="flex-1 min-h-0 flex">{CATALOG.filter((i) => !STRIPS.includes(i) && mounted.has(i)).map((inst) => paneShell(inst))}</div>
          {mounted.has('walk') && paneShell('walk', true)}
          {mounted.has('trail') && paneShell('trail', true)}
        </div>
      </div>
    </div>
  )
}
