// The walk desk — the walk-tiers spike's winning candidate (#11 round 7b),
// graduated into the Studio as one instrument. Each JOB gets its own zone on
// one shared draft: the palette FEEDS (stand-in for the map instrument), the
// railroad AUTHORS (forks, optionals, stages — the only view that ever sees
// a branch), and the layer stack + columns + fringe strip PRESENT the
// resolved road. resolveRoad() is the seam: pick a branch per fork, drop
// skipped optionals, and everything right of the railroad receives a plain
// linear walk. The #13 editor pass fixed the spike-era rough edges: forgiving
// between-node drop slots, new lanes open with a node slot to bind, and a
// container delete now ASKS (promote children / delete all / drop a fork lane).
// A fork's alternative lanes stay ALWAYS visible (review 2 reversed the earlier
// hide-until-hover — the whole point of a fork is to see the choice). The #17
// selection pass replaced the confusing floating popup with a light-blue
// selection BOX plus a toolbar pinned to it (labeled, larger buttons), and a
// Windows-style marquee: drag empty board to box-select, click = single,
// shift+click adds. Grouped stages are GREEN.
//
// Review 3 gave the fork's + a hover PREVIEW of the lane it would add, enlarged
// the fork diamond into an easy select handle, and animated every block and the
// selection box as the layout expands/contracts.
//
// Review 4 set the zones by their GRAIN. The rail and the stack both flow
// top-down, so each gets its own tall VERTICAL SLICE on the right. The map and
// the columns both spread sideways, so they stack as two wide rows on the left
// — map on top (where you pull nodes from), columns below (where you read the
// result). The fringe strip spans the bottom. Four zones, each shaped like the
// thing inside it. The marquee moved onto the road's SCROLL PANE at the same
// time, so a narrow slice can't strand it (see AuthorRoad). Remaining
// refinement: polish (#15).
//
// Review 5 retired the ⊞/⊟ toggle buttons: a group now opens and closes by
// DOUBLE-CLICK, the gesture every file manager already taught, and the whole
// CARD answers to it — the always-live title field that used to sit in the
// middle of the header was a dead zone the gesture fell into, so renaming
// moved behind a ✎ button. The ASIDE was cut in the same pass: a second kind
// of stage child that every view rendered specially, earning less than it
// cost. The layer stack also stopped shearing off its right corner — it
// derives its width from the planes' ROTATED footprint now, not their CSS
// width (see LayerStack).
//
// Bus surface, deliberately minimal for now: the desk JOINS the hover
// channel (useHover) so its stops light up in any composed instrument, and
// nothing else — the draft, branch choices, and drill path stay desk-local
// until the break-apart pass syncs them (route publishing, map-as-palette).
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
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'
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

export default function WalkDeskView({ bus }: { bus: Bus }) {
  const sync = useHover(bus)
  const state = useAuthorDraft(SEED)
  const [choices, setChoices] = useState<Record<string, number>>({})
  const [withOptionals, setWithOptionals] = useState(true)
  const [colPath, setColPath] = useState<string[]>([])

  const resolved = resolveRoad(state.stops, choices, withOptionals)

  const drill = (col: number, s: Stop) =>
    setColPath(s.kind === 'stage' ? [...colPath.slice(0, col), s.key] : colPath.slice(0, col))

  return (
    <div className="h-full flex flex-col" data-desk>
      <div className="flex-1 min-h-0 flex">
        {/* ── LEFT HALF: the two WIDE views, stacked as rows ─────────────── */}
        <div className="flex-[5] min-w-0 flex flex-col border-r border-slate-200">
          {/* map on top — where nodes come FROM */}
          <div data-zone="map" className="flex-[2] min-h-0 flex flex-col border-b border-slate-200">
            <Palette state={state} sync={sync} />
          </div>

          {/* columns below — where the resolved walk is READ */}
          <div data-zone="columns" className="flex-[3] min-h-0 flex flex-col bg-slate-50/50">
            <div className="shrink-0 px-3 py-1.5 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-500">
                columns — the RESOLVED road: forks already decided, one linear walk to present
              </span>
            </div>
            <WalkColumns stops={resolved} path={colPath} pick={drill} sync={sync} />
          </div>
        </div>

        {/* ── RIGHT HALF: the two TOP-DOWN views, each its own slice ──────── */}
        <div className="flex-[6] min-w-0 flex">
          {/* the rail — authoring; the only view that ever sees a branch */}
          <div data-zone="rail" className="flex-1 min-w-0 flex flex-col border-r border-slate-200 bg-slate-50/50">
            <div className="shrink-0 px-2 py-1.5 border-b border-slate-100">
              <div className="text-[10px] font-bold text-slate-500 leading-tight">
                railroad — the road can fork and rejoin; ● picks the branch
              </div>
              <button
                data-opt-toggle
                onClick={() => setWithOptionals(!withOptionals)}
                className={[
                  'mt-1 text-[10px] px-1.5 py-0.5 rounded border',
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

          {/* the stack — its own window at last; one plane per open column */}
          <div data-zone="stack" className="w-[380px] shrink-0 flex flex-col bg-slate-50/40">
            <div className="flex-1 min-h-0 overflow-auto">
              <LayerStack stops={resolved} path={colPath} pick={drill} sync={sync} />
            </div>
          </div>
        </div>
      </div>

      <FringeStrip entries={fringe(resolved, allKeysOf(resolved))} sync={sync} />
    </div>
  )
}
