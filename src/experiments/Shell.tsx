// The experiment shell, remodeled against the literature: ONE deterministic
// 50-leaf / 200-edge corpus, and one tab per PAPER POSITION where the papers
// genuinely disagree —
//   E · GMap '10          hard tessellation: communities as countries
//   F · Bubble/Kelp '09-13 soft contours over the SAME fixed layout
//   G · ZMLT '20          real nodes only, importance-filtered semantic zoom
//   H · Overview+Detail '24 hierarchy kept, expansion adjacent, never in place
// E and F share one embedding on purpose: flipping between them changes only
// the thing the papers actually dispute (hard vs soft regions).

import { useState } from 'react'

import { byId, domainIds, DOMAIN_COLOR, EDGE_COLOR, EDGE_LABEL } from './graph'
import type { EdgeType } from './graph'
import GMapView from './GMapView'
import ContourView from './ContourView'
import ZmltView from './ZmltView'
import OverviewDetailView from './OverviewDetailView'

type Tab = 'gmap' | 'contours' | 'zmlt' | 'ovd'

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'gmap', label: 'E · GMap', hint: 'communities as countries — hard tessellation' },
  { id: 'contours', label: 'F · Contours', hint: 'soft group shapes over one fixed layout' },
  { id: 'zmlt', label: 'G · Semantic Zoom', hint: 'real nodes only, importance filtration' },
  { id: 'ovd', label: 'H · Overview+Detail', hint: 'expand adjacent, never in place' },
]

export default function Shell() {
  const [tab, setTab] = useState<Tab>('gmap')

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="px-4 pt-2.5 pb-0 bg-white border-b border-slate-200 shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <h1 className="text-[15px] font-bold text-slate-800">Graph Disclosure Lab</h1>
          <span className="text-[11px] text-slate-400">
            one corpus — 50 leaves / 200 typed links, seeded · four papers, one tab each · E+F share one embedding
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
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-h-0">
        {tab === 'gmap' && <GMapView />}
        {tab === 'contours' && <ContourView />}
        {tab === 'zmlt' && <ZmltView />}
        {tab === 'ovd' && <OverviewDetailView />}
      </main>
    </div>
  )
}
