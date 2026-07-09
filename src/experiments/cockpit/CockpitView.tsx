// Cockpit — the Map-Tree-Walk navigation model as one screen: breadcrumb,
// map, tree, knowledge, and trail+walk over ONE authored corpus. Owns all
// core state and the interaction contract (SELECT / AUTO-RE-ROOT / ZOOM /
// JUMP / WALK — HANDOFF-COCKPIT-SPIKE.md §3.3); the five panels are pure
// renderers of whatever state they're given. Self-contained like EvocView —
// does not join Shell's shared route state.

import { useState } from 'react'

import { byId, pathTo, ROOT_ID } from '../graph'
import MapPanel from './MapPanel'
import TreePanel from './TreePanel'
import KnowledgePanel from './KnowledgePanel'
import TrailStrip from './TrailStrip'
import { WALKS } from './walks'
import { isInSubtree, parentOf } from './state'
import type { ActiveWalkState, TrailEntry, TrailVia } from './state'

export default function CockpitView() {
  const [currentId, setCurrentId] = useState(ROOT_ID)
  const [treeRootId, setTreeRootId] = useState(ROOT_ID)
  const [trail, setTrail] = useState<TrailEntry[]>([{ id: ROOT_ID, via: 'tree', jump: false }])
  const [activeWalk, setActiveWalk] = useState<ActiveWalkState | null>(null)
  const [dimmingOn, setDimmingOn] = useState(true)

  // SELECT + the AUTO-RE-ROOT invariant in one place: every selection can
  // move currentId outside the tree's current root, in which case the tree
  // re-roots to the node's parent — but only reactively, never on its own.
  const select = (id: string, via: TrailVia, jump = false) => {
    setCurrentId(id)
    setTrail((t) => [...t, { id, via, jump }])
    setTreeRootId((root) => (isInSubtree(id, root) ? root : parentOf(id)))
  }

  const zoom = (containerId: string) => setTreeRootId(containerId)
  const jump = (targetId: string) => select(targetId, 'link', true)

  const activateWalkAtStop = (walkId: string, stopIndex: number) => {
    const w = WALKS.find((x) => x.id === walkId)
    if (!w || stopIndex < 0 || stopIndex >= w.stops.length) return
    setActiveWalk({ walkId, cursor: stopIndex })
    select(w.stops[stopIndex].id, 'walk')
  }
  const advanceWalk = () => {
    if (!activeWalk) return
    activateWalkAtStop(activeWalk.walkId, activeWalk.cursor + 1)
  }
  const deactivateWalk = () => setActiveWalk(null)

  const breadcrumb = pathTo(treeRootId)

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <div className="shrink-0 flex items-center gap-1 px-3 py-1.5 border-b border-slate-200 bg-white text-[11.5px]" aria-label="breadcrumb">
        <span className="text-slate-400 mr-1">Cockpit —</span>
        {breadcrumb.map((id, i) => (
          <span key={id} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-300">/</span>}
            <button
              onClick={() => zoom(id)}
              className={i === breadcrumb.length - 1 ? 'font-bold text-slate-800' : 'text-slate-500 hover:text-slate-700 hover:underline'}
            >
              {byId.get(id)!.title}
            </button>
          </span>
        ))}
        <span className="flex-1" />
        <span className="text-slate-400">you are here: {byId.get(currentId)!.title}</span>
      </div>

      <div className="flex-1 min-h-0 flex">
        <div className="w-[38%] min-w-[360px] border-r border-slate-200">
          <MapPanel
            currentId={currentId}
            onSelectLeaf={(id) => select(id, 'map')}
            onZoomContainer={zoom}
            activeWalk={activeWalk}
            dimmingOn={dimmingOn}
          />
        </div>
        <div className="w-[24%] min-w-[260px] border-r border-slate-200">
          <TreePanel treeRootId={treeRootId} currentId={currentId} onSelect={(id) => select(id, 'tree')} onZoom={zoom} />
        </div>
        <div className="flex-1 min-w-[360px]">
          <KnowledgePanel
            currentId={currentId}
            onSelectChild={(id) => select(id, 'tree')}
            onJump={jump}
            onActivateWalkAtStop={activateWalkAtStop}
          />
        </div>
      </div>

      <TrailStrip
        trail={trail}
        onSelectTrailEntry={(id) => select(id, 'trail')}
        activeWalk={activeWalk}
        onActivateWalk={(walkId) => activateWalkAtStop(walkId, 0)}
        onAdvanceWalk={advanceWalk}
        onJumpToStop={(index) => activeWalk && activateWalkAtStop(activeWalk.walkId, index)}
        onDeactivateWalk={deactivateWalk}
        dimmingOn={dimmingOn}
        onToggleDimming={() => setDimmingOn((d) => !d)}
      />
    </div>
  )
}
