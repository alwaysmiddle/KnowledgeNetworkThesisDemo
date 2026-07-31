// The app IS the Studio: after the consolidation, every navigation-UX
// prototype is a pickable instrument inside StudioView (the old tab-per-view
// Shell and the standalone Cockpit tab live on as git history and the
// 'explore' preset). App owns only the corpus header — what the graph is —
// while Studio owns everything about how it's explored.
import { byId, domainIds, edges, MAX_DEPTH, nodes, topicIds } from './corpus/graph'
import { DomainDot, EdgeLegend, type DomainCode } from '@/ds'
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
        {/* legend: domains (node identity) vs link types — hue-disjoint on purpose.
            Both halves now render the DS graph primitives (#62), so the swatches
            carry the DS's muted palette rather than the corpus's raw hex. */}
        <div className="flex items-center gap-2.5 text-[10px] text-slate-500">
          {domainIds.map((d) => (
            <span key={d} className="flex items-center gap-1">
              <DomainDot domain={d as DomainCode} size={8} />
              {byId.get(d)!.title}
            </span>
          ))}
          <span className="w-px h-4 bg-slate-200 mx-1" />
          <EdgeLegend />
        </div>
      </header>
      <main className="flex-1 min-h-0">
        <StudioView />
      </main>
    </div>
  )
}
