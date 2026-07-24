// The walk desk — the walk-tiers spike's winning candidate (#11 round 7b),
// graduated into the Studio as one instrument. Each JOB gets its own zone on
// one shared draft: the palette FEEDS (stand-in for the map instrument), the
// railroad AUTHORS (forks, optionals, stages — the only view that ever sees
// a branch), and the fringe strip reports the PROJECTION. resolveRoad() is the
// seam: pick a branch per fork, drop skipped optionals, and everything
// downstream receives a plain linear walk. The #13 editor pass fixed the spike-era rough edges: forgiving
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
// Review 4 set the desk's four zones by their GRAIN — rail and stack as tall
// vertical slices, map and columns as wide rows. #20 then decided the COMBINED
// DESK was the wrong unit and split the two reading zones out into instruments
// of their own (WalkColumnsView, WalkStackView). The grain argument survives it:
// it just applies inside each instrument now instead of across one desk. The
// marquee's move onto the road's SCROLL PANE dates from that pass and stays —
// it is what lets a narrow slice hold the railroad at all (see AuthorRoad).
//
// So this instrument is AUTHORING only: the palette feeds it, the railroad
// writes it, the fringe strip reports what the road currently projects to. The
// Google-Maps framing behind #20 is that the real map instrument sits BESIDE
// this one — map and route editor side by side, the way you plan a trip — with
// the palette as the searchable index into the same corpus. Remaining
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
import { fringe, resolveRoad } from './mockwalk'
import type { Stop } from './mockwalk'
import Palette from './Palette'
import { FringeStrip } from './shared'
import { useHover } from '../../studio/bus'
import type { Bus } from '../../studio/bus'

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

  const resolved = resolveRoad(state.stops, choices, withOptionals)

  return (
    <div className="h-full flex flex-col" data-desk>
      {/* Two zones, both AUTHORING: where stops come from, and where they go.
          Palette left because you read a name before you place it. */}
      <div className="flex-1 min-h-0 flex">
        {/* 1:2 — the palette is an index you scan, the rail is a board you
            work on, and a fork fans its lanes sideways */}
        <div data-zone="map" className="flex-[3] min-w-0 flex flex-col border-r border-slate-200">
          <Palette state={state} sync={sync} />
        </div>

        {/* the rail — the only view that ever sees a branch */}
        <div data-zone="rail" className="flex-[6] min-w-0 flex flex-col bg-slate-50/50">
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
      </div>

      {/* the projection, in place: what the road currently reads as. It stays
          on the authoring surface because it is this editor's own status line —
          the reading INSTRUMENTS are separate panes now (#20). */}
      <FringeStrip entries={fringe(resolved, allKeysOf(resolved))} sync={sync} />
    </div>
  )
}
