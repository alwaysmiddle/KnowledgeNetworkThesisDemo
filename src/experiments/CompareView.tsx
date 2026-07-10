// Compare — a layout mock, not a new instrument: the old ⅔-left / ⅓-right
// proportions with a togglable folder tree on the far left (IDE-style), and
// the three standalone instruments — Map, Walk, Unfold — swappable between
// the two panes. Instruments stay MOUNTED when benched (display:none, slots
// assigned via CSS order/flex), so a grown unfold tree or a walk route
// survives any amount of swapping. Walk and Map share one route (the same
// wiring Shell uses), so a walk built in one pane glows on the map in the
// other. Two things are deliberately absent: the document renderer, and any
// tree↔pane selection sync — both are the next design questions, not this
// mock's.
//
// Deliberate exception to "top-level views don't import from cockpit/":
// composing the existing instruments is this view's whole point, and the
// cockpit's TreePanel IS the folder tree being evaluated.

import { useState } from 'react'
import type { ReactNode } from 'react'

import { ROOT_ID } from './graph'
import MapView from './MapView'
import WalkView from './WalkView'
import UnfoldView from './UnfoldView'
import TreePanel from './cockpit/TreePanel'

type Instrument = 'map' | 'walk' | 'unfold'

const LABEL: Record<Instrument, string> = { map: 'Map', walk: 'Walk', unfold: 'Unfold' }
const ORDER: Instrument[] = ['map', 'walk', 'unfold']

export default function CompareView() {
  const [treeOpen, setTreeOpen] = useState(true)
  const [treeRootId, setTreeRootId] = useState(ROOT_ID)
  const [treeSel, setTreeSel] = useState(ROOT_ID)
  const [slotA, setSlotA] = useState<Instrument>('map')
  const [slotB, setSlotB] = useState<Instrument>('unfold')
  const [mounted, setMounted] = useState<Set<Instrument>>(() => new Set<Instrument>(['map', 'unfold']))
  const [route, setRoute] = useState<string[]>([])

  const slotOf = (inst: Instrument): 'A' | 'B' | null => (slotA === inst ? 'A' : slotB === inst ? 'B' : null)

  const mount = (inst: Instrument) => setMounted((prev) => (prev.has(inst) ? prev : new Set(prev).add(inst)))

  // picking an instrument already shown in the other pane swaps the two —
  // there is never a duplicate instance, so shared state can't fight itself
  const pick = (slot: 'A' | 'B', inst: Instrument) => {
    mount(inst)
    if (slot === 'A') {
      if (inst === slotB) setSlotB(slotA)
      setSlotA(inst)
    } else {
      if (inst === slotA) setSlotA(slotB)
      setSlotB(inst)
    }
  }

  const swap = () => {
    setSlotA(slotB)
    setSlotB(slotA)
  }

  // the map's pinned-node actions, repurposed: instead of switching tabs the
  // target instrument appears in the OTHER pane, beside the map
  const revealBeside = (anchor: Instrument, inst: Instrument) => {
    if (slotOf(inst)) return
    mount(inst)
    if (slotA === anchor) setSlotB(inst)
    else setSlotA(inst)
  }

  const paneShell = (inst: Instrument, body: ReactNode) => {
    const slot = slotOf(inst)
    return (
      <section
        key={inst}
        aria-label={`compare-pane-${inst}`}
        data-slot={slot ?? 'benched'}
        className={['flex-col min-w-0 min-h-0 bg-white', slot === 'A' ? 'border-r border-slate-200' : ''].join(' ')}
        style={{ display: slot ? 'flex' : 'none', order: slot === 'A' ? 0 : 1, flex: slot === 'A' ? '2 1 0%' : '1 1 0%' }}
      >
        <header className="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-slate-200 bg-white">
          {ORDER.map((i) => (
            <button
              key={i}
              onClick={() => slot && pick(slot, i)}
              className={[
                'px-2 py-0.5 rounded text-[11px]',
                i === inst ? 'bg-slate-800 text-white font-bold' : 'text-slate-500 hover:bg-slate-100',
              ].join(' ')}
            >
              {LABEL[i]}
            </button>
          ))}
          <span className="flex-1" />
          <span className="text-[10px] text-slate-400">{slot === 'A' ? '⅔ pane' : '⅓ pane'}</span>
          <button
            onClick={swap}
            title="swap panes"
            aria-label={`swap-${inst}`}
            className="ml-1 px-1.5 py-0.5 rounded border border-slate-300 text-slate-600 hover:bg-slate-100 text-[11px]"
          >
            ⇄
          </button>
        </header>
        <div className="flex-1 min-h-0">{body}</div>
      </section>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-slate-200 bg-white text-[11.5px]">
        <button
          aria-label="toggle-tree"
          onClick={() => setTreeOpen((o) => !o)}
          className={[
            'px-2 py-0.5 rounded border text-[11px]',
            treeOpen ? 'bg-slate-100 border-slate-300 text-slate-700 font-medium' : 'border-slate-300 text-slate-500 hover:bg-slate-50',
          ].join(' ')}
        >
          ◧ Tree
        </button>
        <span className="text-slate-400">
          layout mock — folder tree (togglable) + two panes at ⅔ / ⅓; Map, Walk and Unfold swap between them · the walk
          route glows on the map · document pane deliberately absent
        </span>
      </div>

      <div className="flex-1 min-h-0 flex">
        {treeOpen && (
          <aside className="w-60 shrink-0 border-r border-slate-200 bg-white flex flex-col" aria-label="compare-tree">
            <div className="shrink-0 flex items-center gap-1 px-2 py-1 border-b border-slate-100 text-[11px]">
              <span className="font-bold text-slate-800">Folders</span>
              {treeRootId !== ROOT_ID && (
                <button
                  onClick={() => setTreeRootId(ROOT_ID)}
                  title="back to top"
                  className="px-1 rounded text-slate-500 hover:bg-slate-100"
                >
                  ⌂
                </button>
              )}
              <span className="flex-1" />
              <button
                aria-label="collapse-tree"
                onClick={() => setTreeOpen(false)}
                title="hide tree"
                className="px-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                «
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <TreePanel treeRootId={treeRootId} currentId={treeSel} onSelect={setTreeSel} onZoom={setTreeRootId} />
            </div>
          </aside>
        )}

        {mounted.has('map') &&
          paneShell(
            'map',
            <MapView
              route={route}
              onStartWalk={(id) => {
                setRoute([id])
                revealBeside('map', 'walk')
              }}
              onOpenNeighborhood={() => revealBeside('map', 'unfold')}
            />,
          )}
        {mounted.has('walk') && paneShell('walk', <WalkView route={route} setRoute={setRoute} />)}
        {mounted.has('unfold') && paneShell('unfold', <UnfoldView />)}
      </div>
    </div>
  )
}
