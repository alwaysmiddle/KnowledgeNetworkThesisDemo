// The instrument registry — what panes exist, and which combinations we ship.
//
// This replaces five hand-maintained parallel structures inside StudioView: an
// InstrumentId union, a CATALOG order array, a LABEL record, a LENS_TYPE lookup,
// and a switch that was NOT exhaustiveness-checked (add an id, forget the case,
// and you got a blank pane at runtime — it compiled fine). Deleting one flat map
// last week took nine edit sites and still left a false string in another file.
//
// Now: an instrument is one entry. Add one, and its sidebar row, its pane, its
// label and its preset eligibility all follow. InstrumentId is DERIVED from the
// array, so a preset cannot name a pane that does not exist, and reveal() cannot
// be handed a typo.

import type { ReactNode } from 'react'

import { EDGE_LABEL } from '../corpus/graph'
import type { EdgeType } from '../corpus/graph'
import { EDGE_TYPES } from '../model/nav'
import type { Bus } from './bus'

import ChildrenPanel from '../instruments/ChildrenPanel'
import ContourView from '../instruments/ContourView'
import EvocView from '../instruments/EvocView'
import KnowledgePanel from '../instruments/KnowledgePanel'
import LensPane from '../instruments/LensPane'
import NestedAtlasView from '../instruments/NestedAtlasView'
import PlexPanel from '../instruments/PlexPanel'
import TrailStrip from '../instruments/TrailStrip'
import TreePanel from '../instruments/TreePanel'
import UnfoldGraphView from '../instruments/UnfoldGraphView'
import UnfoldView from '../instruments/UnfoldView'
import WalkView from '../instruments/WalkView'

export interface Instrument {
  id: string
  label: string
  /** columns flow left to right; strips pin to the bottom of the stack */
  slot: 'column' | 'strip'
  /** default flex weight (a preset may override it); { fixed } pins a pixel
   * width instead — the tree is a list, not a canvas, and does not want to grow */
  flex?: number | { fixed: number }
  /** a strip that needs working room says how much; one that sizes itself to its
   * content (the trail) leaves this out */
  height?: number
  /** the pane's BODY. The title bar and the ✕ are the shell's job, not the
   * instrument's — which is why an instrument that reads nothing from the bus
   * (Unfold, Contours, EVoC) simply does not take it. */
  render(bus: Bus): ReactNode
}

// ── The views ───────────────────────────────────────────────────────────────
// `as const satisfies` is doing real work: it keeps the ids as literal types so
// InstrumentId can be derived from them, while still typechecking every entry
// against Instrument.
const VIEWS = [
  {
    id: 'nested',
    label: 'Map',
    slot: 'column',
    render: (bus) => <NestedAtlasView bus={bus} />,
  },
  {
    id: 'walk',
    label: 'Walk',
    slot: 'strip',
    height: 240,
    render: (bus) => <WalkView bus={bus} />,
  },
  {
    id: 'unfold',
    label: 'Unfold',
    slot: 'column',
    render: () => <UnfoldView />,
  },
  {
    id: 'unfoldg',
    label: 'Unfold·Graph',
    slot: 'column',
    render: (bus) => <UnfoldGraphView bus={bus} />,
  },
  {
    id: 'contours',
    label: 'Contours',
    slot: 'column',
    render: () => <ContourView />,
  },
  {
    id: 'evoc',
    label: 'EVoC',
    slot: 'column',
    render: () => <EvocView />,
  },
  {
    id: 'tree',
    label: 'Tree',
    slot: 'column',
    flex: { fixed: 240 },
    render: (bus) => <TreePanel bus={bus} />,
  },
  {
    id: 'children',
    label: 'Connections',
    slot: 'column',
    render: (bus) => (
      <div className="h-full overflow-hidden bg-white">
        <ChildrenPanel bus={bus} />
      </div>
    ),
  },
  {
    id: 'doc',
    label: 'Document',
    slot: 'column',
    render: (bus) => <KnowledgePanel bus={bus} />,
  },
  {
    id: 'plex',
    label: 'Plex',
    slot: 'column',
    render: (bus) => (
      <div className="h-full overflow-auto bg-white px-2 py-1">
        <PlexPanel bus={bus} />
      </div>
    ),
  },
  {
    id: 'trail',
    label: 'Trail',
    slot: 'strip',
    render: (bus) => <TrailStrip bus={bus} />,
  },
] as const satisfies readonly Instrument[]

// ── The lenses, GENERATED from the corpus's edge types ───────────────────────
// They used to be three hand-written union members, three CATALOG rows, three
// LABEL entries and a LENS_TYPE lookup — four edit sites to add a fourth. The
// corpus has always had four relation types; `implements` simply never got its
// pane, and nobody noticed, because noticing required reading four files. Here a
// new relation type gets its lens for free, and the template-literal type below
// means it lands in InstrumentId for free too.
const LENSES: Instrument[] = EDGE_TYPES.map((t) => ({
  id: `lens-${t}`,
  label: `Lens: ${EDGE_LABEL[t]}`,
  slot: 'column',
  render: (bus: Bus) => <LensPane bus={bus} type={t} />,
}))

export type InstrumentId = (typeof VIEWS)[number]['id'] | `lens-${EdgeType}`

/** fixed order: every view, then the lenses. Drives the sidebar and the DOM
 * order of the panes; a preset's own array order drives their visual order. */
export const INSTRUMENTS: Instrument[] = [...VIEWS, ...LENSES]
export const byInstrument = new Map(INSTRUMENTS.map((i) => [i.id, i]))

/** the type a lens pane is about, or undefined for anything else */
export const lensTypeOf = (id: string): EdgeType | undefined =>
  id.startsWith('lens-') ? (id.slice(5) as EdgeType) : undefined

// ── Presets ─────────────────────────────────────────────────────────────────
// A preset is (instrument list + geometry), not an instrument list alone: Coding
// wants several small glanceable panes, Teaching wants one or two canvases with
// room to breathe.
export interface Preset {
  id: 'coding' | 'teaching' | 'cockpit'
  label: string
  hint: string
  /** column order; strips always sit at the bottom */
  active: InstrumentId[]
  flex?: Partial<Record<InstrumentId, number>>
}

export const PRESETS: Preset[] = [
  {
    id: 'coding',
    label: 'Coding',
    hint: 'tree + relation lenses — every pane recenters on focus',
    active: ['tree', 'lens-depends_on', 'lens-references', 'lens-data_flow'],
  },
  {
    id: 'teaching',
    label: 'Teaching',
    hint: 'map + unfold + document + walk — accumulating, authored order',
    active: ['nested', 'unfoldg', 'doc', 'walk'],
    flex: { nested: 2, unfoldg: 1.4, doc: 1 },
  },
  {
    id: 'cockpit',
    label: 'Cockpit',
    hint: 'nested map + connections + document — territory, subtree wheel, and prose on one focus',
    active: ['nested', 'children', 'doc'],
    flex: { nested: 1.8, children: 1, doc: 1 },
  },
]

// ── Module-load guard ───────────────────────────────────────────────────────
// The same idiom corpus/graph.ts uses for an authoring typo: throw at load, not
// at render. A preset naming a dead instrument used to ship as a silently
// missing pane — the exact failure mode deleting the flat map could have caused.
{
  const ids = new Set(INSTRUMENTS.map((i) => i.id))
  if (ids.size !== INSTRUMENTS.length) throw new Error('duplicate instrument id in the registry')
  for (const p of PRESETS) {
    for (const i of p.active) if (!ids.has(i)) throw new Error(`preset "${p.id}" names an unknown instrument: ${i}`)
    for (const i of Object.keys(p.flex ?? {})) if (!ids.has(i)) throw new Error(`preset "${p.id}" weights an unknown instrument: ${i}`)
  }
}
