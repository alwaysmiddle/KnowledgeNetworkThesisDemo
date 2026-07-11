// The app IS the Studio: after the consolidation, every navigation-UX
// prototype is a pickable instrument inside StudioView (the old tab-per-view
// Shell and the standalone Cockpit tab live on as git history and the
// 'cockpit' preset). App owns only the corpus header — what the graph is —
// while Studio owns everything about how it's explored.
import { byId, domainIds, DOMAIN_COLOR, EDGE_COLOR, EDGE_LABEL, edges, MAX_DEPTH, nodes, topicIds } from './corpus/graph'
import type { EdgeType } from './corpus/graph'
import StudioView from './studio/StudioView'

export default function App() {
  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="px-4 py-2 bg-white border-b border-slate-200 shrink-0 shadow-sm flex items-center gap-4">
        <h1 className="text-[15px] font-bold text-slate-800">Graph Disclosure Lab</h1>
        <span className="text-[11px] text-slate-400">
          one corpus — {nodes.length} nodes on {MAX_DEPTH} levels / {topicIds.length} CS topics / {edges.length} typed links, hand-authored
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
      </header>
      <main className="flex-1 min-h-0">
        <StudioView />
      </main>
    </div>
  )
}
