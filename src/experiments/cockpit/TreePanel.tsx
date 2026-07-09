// Tree instrument — "the road ahead." Local detail below treeRootId as a
// literal indented list (not a graph): containers expand/collapse, default
// open two levels deep from whatever treeRootId currently is (state.ts's
// depth2Expanded), reset whenever treeRootId changes. This component only
// renders whatever root it's given — re-rooting itself is CockpitView's job
// (the AUTO-RE-ROOT invariant and ZOOM both just change the treeRootId prop).
//
// A container row answers to both single-click (SELECT) and double-click
// (ZOOM), and the browser fires click, click, dblclick for every real
// double-click — so a naive pair of handlers would SELECT twice (polluting
// the trail) before ZOOM ever runs. The short setTimeout below is the
// standard fix: a single click is held for one tick in case a second one
// turns it into a double-click, which cancels the pending SELECT entirely.

import { useEffect, useRef, useState } from 'react'

import { byId, childrenOf, domainOf, DOMAIN_COLOR } from '../graph'
import { edgesTouching } from '../flat'
import { depth2Expanded } from './state'

export interface TreePanelProps {
  treeRootId: string
  currentId: string
  onSelect: (id: string) => void
  onZoom: (containerId: string) => void
}

export default function TreePanel({ treeRootId, currentId, onSelect, onZoom }: TreePanelProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => depth2Expanded(treeRootId))

  useEffect(() => {
    setExpanded(depth2Expanded(treeRootId))
  }, [treeRootId])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const rootChildren = childrenOf.get(treeRootId) ?? []

  return (
    <div className="h-full overflow-auto bg-white" aria-label="tree-panel">
      <div className="px-3 pt-2.5 pb-1.5 text-[11px] font-bold text-slate-800 border-b border-slate-100 sticky top-0 bg-white z-10">
        Tree — {byId.get(treeRootId)!.title}
      </div>
      <div className="py-1">
        {rootChildren.length === 0 ? (
          <div className="px-3 py-2 text-[11px] text-slate-400">no children — this is a leaf</div>
        ) : (
          rootChildren.map((c) => (
            <TreeRow
              key={c.id}
              id={c.id}
              depth={0}
              expanded={expanded}
              toggle={toggle}
              currentId={currentId}
              onSelect={onSelect}
              onZoom={onZoom}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TreeRow({
  id,
  depth,
  expanded,
  toggle,
  currentId,
  onSelect,
  onZoom,
}: {
  id: string
  depth: number
  expanded: Set<string>
  toggle: (id: string) => void
  currentId: string
  onSelect: (id: string) => void
  onZoom: (id: string) => void
}) {
  const n = byId.get(id)!
  const isContainer = n.kind === 'container'
  const isOpen = expanded.has(id)
  const kids = isContainer ? childrenOf.get(id) ?? [] : []
  const linkCount = n.kind === 'leaf' ? edgesTouching(id).length : 0
  const isCurrent = id === currentId
  const pendingSelect = useRef<number | null>(null)

  const handleClick = () => {
    if (!isContainer) {
      onSelect(id)
      return
    }
    if (pendingSelect.current !== null) return
    pendingSelect.current = window.setTimeout(() => {
      pendingSelect.current = null
      onSelect(id)
    }, 220)
  }

  const handleDoubleClick = () => {
    if (!isContainer) return
    if (pendingSelect.current !== null) {
      window.clearTimeout(pendingSelect.current)
      pendingSelect.current = null
    }
    onZoom(id)
  }

  return (
    <div>
      <div
        className={[
          'flex items-center gap-1.5 pr-2 py-1 cursor-pointer text-[11px]',
          isCurrent ? 'bg-amber-50' : 'hover:bg-slate-50',
        ].join(' ')}
        style={{ paddingLeft: 10 + depth * 16 }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {isContainer ? (
          <button
            onClick={(ev) => {
              ev.stopPropagation()
              toggle(id)
            }}
            className="w-3.5 text-slate-400 hover:text-slate-600 shrink-0"
          >
            {isOpen ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ background: DOMAIN_COLOR[domainOf(id)] }} />
        <span className={['truncate', isCurrent ? 'font-bold text-slate-800' : 'text-slate-600'].join(' ')}>{n.title}</span>
        {n.kind === 'leaf' && linkCount > 0 && <span className="text-slate-400 shrink-0">⤳ {linkCount}</span>}
      </div>
      {isContainer &&
        isOpen &&
        kids.map((k) => (
          <TreeRow
            key={k.id}
            id={k.id}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            currentId={currentId}
            onSelect={onSelect}
            onZoom={onZoom}
          />
        ))}
    </div>
  )
}
