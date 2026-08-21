// Tree instrument — "the road ahead." Local detail below treeRootId as a
// literal indented list (not a graph): containers expand/collapse, default
// open two levels deep from whatever treeRootId currently is (state.ts's
// depth2Expanded), reset whenever treeRootId changes. This component only
// renders whatever root it's given — re-rooting itself is CockpitView's job
// (the AUTO-RE-ROOT invariant and ZOOM both just change the treeRootId prop).
//
// The row itself is the DS TreeRow (presentation: indent, domain dot,
// disclosure caret, current highlight, link count). This file owns everything
// the DS row deliberately doesn't model: the recursion (TreeNode), the drag
// source onto the road (#24), the data-node-id hook the screenshot driver
// reads, and the single/double-click disambiguation below.
//
// A container row answers to both single-click (SELECT) and double-click
// (ZOOM), and the browser fires click, click, dblclick for every real
// double-click — so a naive pair of handlers would SELECT twice (polluting
// the trail) before ZOOM ever runs. The short setTimeout below is the
// standard fix: a single click is held for one tick in case a second one
// turns it into a double-click, which cancels the pending SELECT entirely.

import { useEffect, useRef, useState } from 'react'

import { TreeRow } from '@/ds'
import type { DomainCode } from '@/ds'

import { byId, childrenOf, domainOf, ROOT_ID } from '../corpus/graph'
import { edgesTouching } from '../model/flat'
import { depth2Expanded } from '../model/nav'
import type { Bus } from '../studio/bus'
import { DT } from './walkdesk/authordnd'

export default function TreePanel({ bus }: { bus: Bus }) {
  // the tree reads its root from the bus, and the bus re-roots it REACTIVELY
  // when a focus lands outside — this pane still never re-roots itself
  const treeRootId = bus.treeRoot
  const currentId = bus.focus ?? ROOT_ID
  const onSelect = (id: string) => bus.setFocus(id, 'tree')
  const onZoom = bus.setTreeRoot

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
    <div aria-label="tree-panel">
      {/* sticky needs its own face to stop rows scrolling through it — the one
          exception OB-039 keeps rather than strips, since this is a heading
          inside the scroller PaneScroller now owns, not the pane's own body */}
      <div className="px-3 pt-2.5 pb-1.5 text-[11px] font-bold text-slate-800 border-b border-slate-100 sticky top-0 z-10" style={{ background: 'var(--surface-paper)' }}>
        Tree — {byId.get(treeRootId)!.title}
      </div>
      <div className="py-1">
        {rootChildren.length === 0 ? (
          <div className="px-3 py-2 text-[11px] text-slate-400">no children — this is a leaf</div>
        ) : (
          rootChildren.map((c) => (
            <TreeNode
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

function TreeNode({
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
  const linkCount = edgesTouching(id).length // nonzero only at the topic level
  const pendingSelect = useRef<number | null>(null)

  // SELECT, held one tick so a second click can cancel it into a ZOOM. Leaves
  // have no ZOOM, so they select immediately.
  const handleSelect = () => {
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

  const handleZoom = () => {
    if (!isContainer) return
    if (pendingSelect.current !== null) {
      window.clearTimeout(pendingSelect.current)
      pendingSelect.current = null
    }
    onZoom(id)
  }

  return (
    <div>
      {/* #24 — every Tree row is a drag source onto the road (same `pal:<id>`
          the palette and map speak). No selection gate here: the Tree doesn't
          pan, so there's no gesture to protect — any row drags, container or
          leaf. A native drag suppresses the click, so it never fights the
          single/double-click select/zoom on the DS row. data-node-id + the
          caret button inside are what the screenshot driver locates. */}
      <div data-node-id={id} draggable onDragStart={(e) => e.dataTransfer.setData(DT, 'pal:' + id)}>
        <TreeRow
          title={n.title}
          domain={domainOf(id) as DomainCode}
          depth={depth}
          container={isContainer}
          expanded={isOpen}
          current={id === currentId}
          linkCount={linkCount}
          onSelect={handleSelect}
          onToggle={() => toggle(id)}
          onZoom={handleZoom}
        />
      </div>
      {isContainer &&
        isOpen &&
        kids.map((k) => (
          <TreeNode
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
