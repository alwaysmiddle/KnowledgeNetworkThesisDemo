// The ONE combined surface (round 7) — palette, railroad, columns on a
// single desk. The verdict that shaped it: the two round-6 authoring
// metaphors were provably the same editor, so instead of comparing
// renderings, the desk gives each JOB its own instrument on one shared
// draft: the palette FEEDS (stand-in for the map), the railroad AUTHORS
// (forks, optionals, stages — the only view that ever sees a branch), and
// the columns + fringe strip PRESENT the resolved road. resolveRoad() is the
// seam: pick a branch per fork, drop skipped optionals, and everything right
// of the railroad receives a plain linear walk — the round-5 presentation
// stack, byte-for-byte unchanged.
//
// The draft starts SEEDED with a fork and an optional stop so branching is
// visible at first paint; every id is a real corpus node — tiers and
// branches alike stay pure overlay on an untouched corpus.

import { useState } from 'react'

import AuthorRoad from './AuthorRoad'
import { allKeysOf, useAuthorDraft } from './authordraft'
import LayerStack from './LayerStack'
import { fringe, resolveRoad } from './mockwalk'
import type { Stop } from './mockwalk'
import Palette from './Palette'
import { FringeStrip } from './shared'
import type { Sync } from './sync'
import WalkColumns from './WalkColumns'

const SEED: Stop[] = [
  { kind: 'visit', node: 'stk-dns-naming' },
  {
    kind: 'stage',
    key: 'seed-net',
    title: 'Reach the machine',
    steps: [
      { kind: 'visit', node: 'stk-ip-routing' },
      { kind: 'visit', node: 'stk-tcp-udp' },
    ],
  },
  {
    kind: 'fork',
    key: 'seed-sec',
    question: 'how deep on security?',
    branches: [
      { label: 'just the handshake', steps: [{ kind: 'visit', node: 'cry-tls-certificates' }] },
      {
        label: 'full crypto tour',
        steps: [
          { kind: 'visit', node: 'cry-public-key-cryptography' },
          { kind: 'visit', node: 'cry-symmetric-encryption' },
          { kind: 'visit', node: 'cry-cryptographic-hashing' },
          { kind: 'visit', node: 'cry-tls-certificates' },
        ],
      },
    ],
  },
  { kind: 'visit', node: 'web-http-rest' },
  { kind: 'visit', node: 'web-sockets-apis', optional: true },
  { kind: 'visit', node: 'app-authentication-authorization' },
]

export default function DeskMock({ sync }: { sync: Sync }) {
  const state = useAuthorDraft(SEED)
  const [choices, setChoices] = useState<Record<string, number>>({})
  const [withOptionals, setWithOptionals] = useState(true)
  const [colPath, setColPath] = useState<string[]>([])

  const resolved = resolveRoad(state.stops, choices, withOptionals)

  return (
    <div className="h-full flex" data-cand="S">
      <Palette state={state} sync={sync} />

      <div className="flex-1 min-w-0 flex flex-col bg-slate-50/50">
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 flex flex-col border-r border-slate-200">
            <div className="shrink-0 px-3 py-1.5 flex items-center gap-2 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500">
                railroad — the road can fork and rejoin; ● picks the branch the road takes
              </span>
              <span className="flex-1" />
              <button
                data-opt-toggle
                onClick={() => setWithOptionals(!withOptionals)}
                className={[
                  'text-[10px] px-1.5 py-0.5 rounded border',
                  withOptionals
                    ? 'border-slate-300 text-slate-600 bg-white hover:bg-slate-50'
                    : 'border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100',
                ].join(' ')}
              >
                ◇ optionals: {withOptionals ? 'on the road' : 'bypassed'}
              </button>
            </div>
            <AuthorRoad
              state={state}
              sync={sync}
              choices={choices}
              pickBranch={(forkKey, idx) => setChoices({ ...choices, [forkKey]: idx })}
              withOptionals={withOptionals}
            />
          </div>

          <div className="w-[440px] shrink-0 min-w-0 flex flex-col">
            <div className="shrink-0 px-3 py-1.5 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500">
                stack + columns — the RESOLVED road: forks already decided, one linear walk to present
              </span>
            </div>
            <LayerStack
              stops={resolved}
              path={colPath}
              pick={(col, s) => setColPath(s.kind === 'stage' ? [...colPath.slice(0, col), s.key] : colPath.slice(0, col))}
              sync={sync}
            />
            <WalkColumns
              stops={resolved}
              path={colPath}
              pick={(col, s) => setColPath(s.kind === 'stage' ? [...colPath.slice(0, col), s.key] : colPath.slice(0, col))}
              sync={sync}
            />
          </div>
        </div>

        <FringeStrip entries={fringe(resolved, allKeysOf(resolved))} sync={sync} />
      </div>
    </div>
  )
}
