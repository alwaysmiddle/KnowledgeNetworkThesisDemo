// The experiment shell, now organized around the three navigation QUESTIONS
// instead of one tab per paper:
//   Map          where is everything?      GMap '10 countries × ZMLT '20 zoom
//   Walk         how does flow move?       step-by-step downstream paths
//   Unfold·Graph what surrounds one thing? unfold trial — deduped graph, snap-back
//   Contours     (reference) soft vs hard grouping — Bubble Sets/KelpFusion
// The glue is shared state: the walk route glows on the map, and a pinned map
// node can jump into a walk or into its neighborhood.

import { useState } from 'react'

import { byId, domainIds, DOMAIN_COLOR, EDGE_COLOR, EDGE_LABEL, edges, leafIds } from './graph'
import type { EdgeType } from './graph'
import MapView from './MapView'
import WalkView from './WalkView'
import ContourView from './ContourView'
import UnfoldGraphView from './UnfoldGraphView'
import EvocView from './EvocView'
import CockpitView from './cockpit/CockpitView'
import UnfoldView from './UnfoldView'
import CompareView from './CompareView'
import StudioView from './StudioView'

type Tab = 'map' | 'walk' | 'unfoldg' | 'contours' | 'evoc' | 'cockpit' | 'unfold' | 'compare' | 'studio'

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'studio', label: 'Studio', hint: 'instrument palette — pick views, sync on one bus, presets for coding & teaching' },
  { id: 'map', label: 'Map', hint: 'where is everything — countries + semantic zoom' },
  { id: 'walk', label: 'Walk', hint: 'how does flow move — step-by-step paths' },
  { id: 'unfoldg', label: 'Unfold·Graph', hint: 'trial — unfold into a graph: every node once, revisits snap back' },
  { id: 'contours', label: 'Contours', hint: 'reference — soft groups over the same layout' },
  { id: 'evoc', label: 'EVoC', hint: 'can auto-clustering recover our pipeline? — 800 mocked Infra artifacts' },
  { id: 'cockpit', label: 'Cockpit', hint: 'map + tree + trail + document — the three-instrument navigation model' },
  { id: 'unfold', label: 'Unfold', hint: 'click to reveal links, pick one to grow the tree' },
  { id: 'compare', label: 'Compare', hint: 'layout mock — togglable folder tree + ⅔/⅓ panes, instruments swap' },
]

export default function Shell() {
  const [tab, setTab] = useState<Tab>('map')
  const [route, setRoute] = useState<string[]>([])
  const [focusLeaf, setFocusLeaf] = useState<string | null>(null)

  const startWalk = (id: string) => {
    setRoute([id])
    setTab('walk')
  }
  const openNeighborhood = (id: string) => {
    setFocusLeaf(id)
    setTab('unfoldg')
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="px-4 pt-2.5 pb-0 bg-white border-b border-slate-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-[15px] font-bold text-slate-800">Graph Disclosure Lab</h1>
          <span className="text-[11px] text-slate-400">
            one corpus — {leafIds.length} CS topics / {edges.length} typed links, hand-authored · three navigation modes + one reference · the walk route glows on the map
          </span>
          <span className="flex-1" />
          {/* legend: domains (node identity) vs link types — hue-disjoint on purpose */}
          <div className="flex items-center gap-2.5 text-[10px] text-slate-500">
            {domainIds.map((d) => (
              <span key={d} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ background: DOMAIN_COLOR[d] }} />
                {byId.get(d)!.title}
              </span>
            ))}
            <span className="w-px h-4 bg-slate-200 mx-1" />
            {(Object.keys(EDGE_LABEL) as EdgeType[]).map((t) => (
              <span key={t} className="flex items-center gap-1">
                <span className="w-4 h-0.5 inline-block rounded" style={{ background: EDGE_COLOR[t] }} />
                {EDGE_LABEL[t]}
              </span>
            ))}
          </div>
        </div>
        <nav className="flex gap-1 mt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              title={t.hint}
              className={[
                'px-3.5 py-1.5 text-[12px] rounded-t-lg border border-b-0 transition-colors',
                tab === t.id
                  ? 'bg-slate-50 border-slate-200 font-bold text-slate-800 -mb-px'
                  : 'bg-white border-transparent text-slate-400 hover:text-slate-600',
              ].join(' ')}
            >
              {t.label} <span className="font-normal opacity-60">— {t.hint}</span>
              {t.id === 'walk' && route.length > 0 && (
                <span className="ml-1.5 px-1.5 rounded-full bg-amber-100 text-amber-700 font-bold">{route.length}</span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-h-0">
        {tab === 'map' && <MapView route={route} onStartWalk={startWalk} onOpenNeighborhood={openNeighborhood} />}
        {tab === 'walk' && <WalkView route={route} setRoute={setRoute} />}
        {tab === 'unfoldg' && <UnfoldGraphView key={focusLeaf ?? 'plain'} initialStart={focusLeaf} />}
        {tab === 'contours' && <ContourView />}
        {tab === 'evoc' && <EvocView />}
        {tab === 'cockpit' && <CockpitView />}
        {tab === 'unfold' && <UnfoldView />}
        {tab === 'compare' && <CompareView />}
        {tab === 'studio' && <StudioView />}
      </main>
    </div>
  )
}
