// Authoring view 3 (round 4) — the same boxed flow as the columns, but a
// stage EXPANDS IN PLACE: its box grows and its steps render inside it as a
// nested flow, tiers as containment instead of separate columns. This is
// the drag-INTO surface: an expanded stage box is a drop target — drag a
// palette node (or an existing block) anywhere onto it and it appends to
// that stage's steps; the box glows while a drag hovers it. Grouping still
// comes from the shared toolbar — select blocks in the timeline, group,
// then open the new box here and fill it by dropping.

import { useState } from 'react'
import type { DragEvent as ReactDragEvent } from 'react'

import { byId, domainOf, DOMAIN_COLOR } from '../../corpus/graph'
import type { AuthorState, Path } from './authordraft'
import { handleDrop } from './authordnd'
import { visitCount } from './mockwalk'
import type { Stop } from './mockwalk'
import type { Sync } from './sync'

function DownArrow() {
  return <div className="text-amber-500/80 text-[11px] leading-none text-center select-none">↓</div>
}

function NestLevel({
  stops,
  parent,
  state,
  sync,
  expanded,
  toggle,
  hoverKey,
  setHoverKey,
}: {
  stops: Stop[]
  parent: Path
  state: AuthorState
  sync: Sync
  expanded: ReadonlySet<string>
  toggle(key: string): void
  hoverKey: string | null
  setHoverKey(k: string | null): void
}) {
  return (
    <div className="flex flex-col gap-1">
      {stops.map((s, i) => {
        const p = [...parent, i]
        if (s.kind === 'visit') {
          const color = DOMAIN_COLOR[domainOf(s.node)]
          return (
            <div key={`${i}-${s.node}`} className="flex flex-col gap-1">
              {i > 0 && <DownArrow />}
              <div
                {...sync.bind(s.node)}
                data-nbox
                data-node={s.node}
                className={[
                  'rounded-lg border-2 bg-white px-2 py-1.5 text-[10.5px] font-semibold',
                  sync.lit(s.node) ? 'ring-2 ring-sky-300' : '',
                ].join(' ')}
                style={{ borderColor: color, color }}
              >
                {byId.get(s.node)!.title}
              </div>
            </div>
          )
        }
        const isOpen = expanded.has(s.key)
        return (
          <div key={s.key} className="flex flex-col gap-1">
            {i > 0 && <DownArrow />}
            {isOpen ? (
              <div
                data-nbox
                data-ndrop={s.key}
                onDragOver={(e: ReactDragEvent) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setHoverKey(s.key)
                }}
                onDragLeave={() => setHoverKey(null)}
                onDrop={(e: ReactDragEvent) => {
                  setHoverKey(null)
                  handleDrop(e, [...p, s.steps.length], state)
                }}
                className={[
                  'rounded-lg border-2 border-amber-400 bg-amber-50/60 p-1.5',
                  hoverKey === s.key ? 'ring-2 ring-amber-400 bg-amber-100/80' : '',
                ].join(' ')}
              >
                <button data-nest-toggle={s.key} onClick={() => toggle(s.key)} className="w-full text-left text-[10.5px] font-bold text-amber-800 pb-1">
                  ⊟ {s.title}
                  <span className="font-normal text-amber-500 ml-1">— drop a node anywhere in this box to add it</span>
                </button>
                <div className="pl-2 border-l-2 border-dotted border-amber-300/70">
                  <NestLevel
                    stops={s.steps}
                    parent={p}
                    state={state}
                    sync={sync}
                    expanded={expanded}
                    toggle={toggle}
                    hoverKey={hoverKey}
                    setHoverKey={setHoverKey}
                  />
                </div>
              </div>
            ) : (
              <button
                data-nbox
                data-nest-toggle={s.key}
                onClick={() => toggle(s.key)}
                className="rounded-lg border-2 border-amber-400 bg-amber-50 px-2 py-1.5 text-left text-[10.5px] font-bold text-amber-800 hover:bg-amber-100"
              >
                ⊞ {s.title}
                <span className="font-normal text-amber-500 ml-1">{visitCount(s)} stops folded</span>
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AuthorNest({ state, sync }: { state: AuthorState; sync: Sync }) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(['seed-net']))
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const toggle = (key: string) => {
    const next = new Set(expanded)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setExpanded(next)
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-auto p-2"
      onDragOver={(e: ReactDragEvent) => e.preventDefault()}
      onDrop={(e: ReactDragEvent) => handleDrop(e, [state.stops.length], state)}
    >
      <NestLevel
        stops={state.stops}
        parent={[]}
        state={state}
        sync={sync}
        expanded={expanded}
        toggle={toggle}
        hoverKey={hoverKey}
        setHoverKey={setHoverKey}
      />
    </div>
  )
}
