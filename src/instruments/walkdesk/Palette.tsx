// The supply pane (#28) — a ranked SEARCH over the whole corpus, whose empty
// state is your recent searches. It used to be a chip cloud of the 53 flagged
// topics (7% of the graph, hand-picked); now every one of the 753 nodes is
// reachable by typing, and `n.topic` is a ranking BOOST, not a gate.
//
// Putting a stop on the road is ALWAYS an explicit gesture: drag a hit onto the
// railroad (the `pal:<nodeId>` feed the road and the map already speak), or hit
// the row's + to append it to the end. A plain click does NOT insert — the pane
// is a finder, not a one-click adder, so the author is never surprised by a stop
// they only meant to inspect. Acting on a hit clears the box, collapsing the
// list back to recents.
//
// Recents hold the TITLE of the node a search resolved to, not the raw keystrokes
// — you searched "encrpytion", you meant "Symmetric Encryption", so that clean
// term is what comes back (and re-runs cleanly, since a title prefix-matches its
// own node). In-memory for now; persistence rides on #16.

import { useMemo, useState, useSyncExternalStore } from 'react'

import { byId, domainOf, DOMAIN_COLOR, nodes, pathTo } from '../../corpus/graph'
import type { AuthorState } from './authordraft'
import { DT } from './authordnd'
import type { HoverBinding } from '../../studio/bus'

// ── Recent searches — a module-level ring so it survives a remount within the
// session (the pane can unmount when the preset changes). Last ~8, most recent
// first, case-insensitively de-duplicated (a repeat moves to the front).
const MAX_RECENTS = 8
let recents: string[] = []
const recentSubs = new Set<() => void>()
function pushRecent(raw: string) {
  const s = raw.trim()
  if (!s) return
  recents = [s, ...recents.filter((r) => r.toLowerCase() !== s.toLowerCase())].slice(0, MAX_RECENTS)
  for (const fn of recentSubs) fn()
}
function useRecents(): string[] {
  return useSyncExternalStore(
    (fn) => (recentSubs.add(fn), () => recentSubs.delete(fn)),
    () => recents,
  )
}

// ── Breadcrumb — the containment path to a node, minus the root and the node
// itself, as a "Domain › Module › Topic" trail. Cached: pathTo is cheap but we
// touch it for every candidate on every keystroke.
const crumbCache = new Map<string, string>()
function breadcrumb(id: string): string {
  let s = crumbCache.get(id)
  if (s === undefined) {
    s = pathTo(id)
      .slice(1, -1)
      .map((pid) => byId.get(pid)!.title)
      .join(' › ')
    crumbCache.set(id, s)
  }
  return s
}

// ── Ranking — title-prefix beats title-substring beats breadcrumb-substring;
// a topic gets a boost within its tier; shallower nodes win ties. Non-matches
// score -1 and drop out.
function score(id: string, ql: string): number {
  const n = byId.get(id)!
  const t = n.title.toLowerCase()
  let base: number
  if (t.startsWith(ql)) base = 3
  else if (t.includes(ql)) base = 2
  else if (breadcrumb(id).toLowerCase().includes(ql)) base = 1
  else return -1
  return base + (n.topic ? 0.5 : 0)
}

const MAX_HITS = 40

export default function Palette({ state, sync }: { state: AuthorState; sync: HoverBinding }) {
  const [q, setQ] = useState('')
  const recent = useRecents()
  const ql = q.trim().toLowerCase()

  const hits = useMemo(() => {
    if (!ql) return []
    return nodes
      .map((n) => ({ id: n.id, s: score(n.id, ql), depth: pathTo(n.id).length }))
      .filter((r) => r.s >= 0)
      .sort((a, b) => b.s - a.s || a.depth - b.depth || byId.get(a.id)!.title.localeCompare(byId.get(b.id)!.title))
      .slice(0, MAX_HITS)
      .map((r) => r.id)
  }, [ql])

  // A search RESOLVED to a node: record its clean title (not the typo'd query)
  // and collapse the list back to recents. Used by every commit path.
  const noteResolved = (id: string) => {
    pushRecent(byId.get(id)!.title)
    setQ('')
  }
  // + appends the hit to the LAST position of the road, then resolves. Explicit,
  // and always the end — the pane never guesses a caret the way insertNode's
  // selection-relative default would.
  const appendToRoad = (id: string) => {
    state.insertNode(id, [state.stops.length])
    noteResolved(id)
  }

  return (
    <div className="min-w-0 flex flex-col bg-white">
      <div className="shrink-0 px-2 py-1.5 border-b border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 mb-1">search the corpus — drag a hit onto the road, or + to append</div>
        <input
          data-pal-search
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            // Enter records what you MEANT — the top hit's title — not the raw
            // keystrokes; a no-match Enter records nothing (no typo saved).
            if (e.key === 'Enter' && hits.length) pushRecent(byId.get(hits[0])!.title)
          }}
          placeholder="search 753 nodes…"
          className="w-full text-[11px] px-1.5 py-0.5 rounded border border-slate-200 outline-none focus:border-sky-400"
        />
      </div>

      <div className="overflow-auto py-1 max-h-[42vh]">
        {!ql ? (
          <RecentsEmptyState recent={recent} onPick={setQ} />
        ) : hits.length === 0 ? (
          <div className="px-2 py-3 text-[11px] text-slate-400">no node matches “{q.trim()}”.</div>
        ) : (
          <div className="px-1.5">
            {hits.map((id) => {
              const n = byId.get(id)!
              const crumb = breadcrumb(id)
              return (
                // The row is a DRAG HANDLE, not a button — a plain click does not
                // insert. Dragging feeds `pal:<id>` to the road/map; a drop that
                // landed (dropEffect set) resolves the search like the + does.
                <div
                  key={id}
                  {...sync.bind(id)}
                  data-pal={id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData(DT, 'pal:' + id)}
                  onDragEnd={(e) => {
                    if (e.dataTransfer.dropEffect !== 'none') noteResolved(id)
                  }}
                  className={[
                    'group w-full flex items-start gap-1.5 px-1.5 py-1 rounded cursor-grab',
                    sync.lit(id) ? 'ring-2 ring-sky-300 bg-white' : 'hover:bg-slate-50',
                  ].join(' ')}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full inline-block shrink-0 mt-1"
                    style={{ background: DOMAIN_COLOR[domainOf(id)] }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] leading-tight text-slate-800 truncate">{n.title}</span>
                    {crumb && <span className="block text-[9px] leading-tight text-slate-400 truncate">{crumb}</span>}
                  </span>
                  <button
                    data-pal-add={id}
                    onClick={() => appendToRoad(id)}
                    title="append to the end of the road"
                    className="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded text-[13px] leading-none text-slate-300 hover:bg-sky-100 hover:text-sky-600"
                  >
                    +
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// The empty state IS the value: your own path back to a search you just ran.
function RecentsEmptyState({ recent, onPick }: { recent: string[]; onPick: (q: string) => void }) {
  if (recent.length === 0) {
    return (
      <div className="px-2 py-3 text-[11px] text-slate-400 leading-relaxed">
        Type to search every node in the corpus. Your recent searches will collect here.
      </div>
    )
  }
  return (
    <div className="px-2 pt-1">
      <div className="text-[9.5px] uppercase tracking-wide font-semibold text-slate-400 py-0.5">recent searches</div>
      <div className="flex flex-wrap gap-1 pt-0.5">
        {recent.map((r) => (
          <button
            key={r}
            data-pal-recent={r}
            onClick={() => onPick(r)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10.5px] text-slate-600 hover:bg-white"
          >
            <span className="text-slate-300">↻</span>
            {r}
          </button>
        ))}
      </div>
    </div>
  )
}
