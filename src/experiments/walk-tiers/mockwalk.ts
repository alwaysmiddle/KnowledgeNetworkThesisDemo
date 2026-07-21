// Mock data for the walk-tiers spike (KnowledgeNetworkDemo#11) — a TIERED
// walk: stops that are either leaf visits to corpus nodes, or stages that
// decompose into their own walk one tier down. THROWAWAY spike data: nothing
// here touches corpus/walks.ts or the bus. The corpus is unchanged — the
// tiers are pure overlay, a more sophisticated visit order over the same
// nodes.
//
// The dataset deliberately packs every case a candidate view must answer:
//   - FOUR tiers of depth (plan → stage → sub-stage → sub-sub-stage), one
//     more than the 3-tier altitude window, so the window/dive rule is
//     actually exercised
//   - a sub-walk BY REFERENCE — a stage built from an authored walks.ts walk
//   - a REVISIT — stk-tcp-udp is stopped on by two different stages
//   - an ASIDE — a sequence at the same tier that is related to a stage but
//     not part of its steps (the "meanwhile" lane)
//   - mixed grain — a plain leaf visit sitting between stages at tier 0

import { byId } from '../../corpus/graph'
import { WALKS } from '../../corpus/walks'

/** a leaf visit: the walk stops on a real corpus node */
export interface VisitStop {
  kind: 'visit'
  node: string
  note?: string
}

/** a related sequence at a stage's tier — beside the steps, not one of them */
export interface Aside {
  title: string
  steps: VisitStop[]
}

/** a stage: a stop that decomposes into its own walk, one tier down */
export interface StageStop {
  kind: 'stage'
  /** stable key for expansion state — unique across the whole plan */
  key: string
  title: string
  steps: Stop[]
  asides?: Aside[]
}

export type Stop = VisitStop | StageStop

const v = (node: string, note?: string): VisitStop => ({ kind: 'visit', node, note })
const stage = (key: string, title: string, steps: Stop[], asides?: Aside[]): StageStop => ({
  kind: 'stage',
  key,
  title,
  steps,
  asides,
})

/** a stage built FROM an authored walk — sub-walk by reference. The stop
 * "is" the whole walk; expanding it plays the walk's stops as its steps. */
function stageFromWalk(key: string, walkId: string): StageStop {
  const w = WALKS.find((x) => x.id === walkId)
  if (!w) throw new Error(`walk-tiers mock references unknown walk: ${walkId}`)
  return stage(
    key,
    w.title,
    w.stops.map((s) => v(s.id, s.note)),
  )
}

export interface Plan {
  title: string
  stops: Stop[]
}

export const PLAN: Plan = {
  title: 'Ship a page the world can load — a plan',
  stops: [
    stageFromWalk('machine', 'transistor-to-program'),
    stage(
      'serve',
      'Serve it on the network',
      [
        v('stk-dns-naming', 'a typed name must become an address before anything moves'),
        v('stk-ip-routing', 'packets hop toward that address with no promises'),
        v('stk-tcp-udp', 'a reliable stream is built out of the unreliable hops'),
        stage('secure', 'Secure the channel', [
          v('cry-public-key-cryptography', 'the trapdoor that lets strangers agree on a secret'),
          v('cry-tls-certificates', 'the handshake that proves a name and seals the stream'),
          stage('primitives', 'The primitives underneath', [
            v('cry-symmetric-encryption', 'once the key is agreed, the bulk cipher does the work'),
            v('cry-cryptographic-hashing', 'integrity: the fingerprint every record carries'),
          ]),
        ]),
      ],
      [
        {
          title: 'Meanwhile — the pipeline that ships it',
          steps: [
            v('auto-continuous-integration', 'every push is built and tested before it may ship'),
            v('auto-deployment-monitoring', 'the deploy that put the page here, and the telemetry watching it'),
          ],
        },
      ],
    ),
    stage('speak', 'Speak the application protocol', [
      v('web-http-rest', 'over the secured stream, the browser finally talks'),
      v('web-sockets-apis', 'on both ends the conversation is just sockets'),
      v('stk-tcp-udp', 'the same stream again — a revisit, on purpose'),
    ]),
    v('app-authentication-authorization', 'the closing leaf: the page knows who it is for'),
  ],
}

// ── Projection ──────────────────────────────────────────────────────────────
// The flat route the bus would read: the leaf fringe of the plan at its
// current expansion state. A collapsed stage contributes a STAGE entry (a
// placeholder with no corpus node — focus only ever moves to leaves), an
// expanded one contributes its children's fringe instead. Collapse/expand
// changes this projection, never the data.

export type RouteEntry =
  | { kind: 'node'; id: string; note?: string }
  | { kind: 'stage'; key: string; title: string; visits: number }

export function fringe(stops: Stop[], expanded: ReadonlySet<string>): RouteEntry[] {
  const out: RouteEntry[] = []
  for (const s of stops) {
    if (s.kind === 'visit') out.push({ kind: 'node', id: s.node, note: s.note })
    else if (expanded.has(s.key)) out.push(...fringe(s.steps, expanded))
    else out.push({ kind: 'stage', key: s.key, title: s.title, visits: visitCount(s) })
  }
  return out
}

// ── Shape helpers ───────────────────────────────────────────────────────────

/** leaf visits under a stop, all tiers */
export function visitCount(s: Stop): number {
  return s.kind === 'visit' ? 1 : s.steps.reduce((a, c) => a + visitCount(c), 0)
}

/** tiers under a stop, counting itself */
export function tierCount(s: Stop): number {
  return s.kind === 'visit' ? 1 : 1 + Math.max(...s.steps.map(tierCount))
}

/** the chain of stages from the plan root down to `key` (inclusive) */
export function stagePath(stops: Stop[], key: string): StageStop[] {
  for (const s of stops) {
    if (s.kind !== 'stage') continue
    if (s.key === key) return [s]
    const below = stagePath(s.steps, key)
    if (below.length) return [s, ...below]
  }
  return []
}

// ── Tier lines (round 2) ────────────────────────────────────────────────────
// The selection-driven reading: a PATH of stage keys, one per tier, derives
// one line per tier. Picking a different stage on line N swaps out every line
// below it — at most one decomposition is open per tier, unlike the round-1
// expansion set where any number of stages could be open at once.

export interface TierLine {
  tier: number
  /** what this line is the inside of — the plan itself, or a stage title */
  source: string
  stops: Stop[]
  asides?: Aside[]
}

export function linesForPath(path: string[]): TierLine[] {
  const lines: TierLine[] = [{ tier: 0, source: PLAN.title, stops: PLAN.stops }]
  let stops = PLAN.stops
  for (const key of path) {
    const s = stops.find((x): x is StageStop => x.kind === 'stage' && x.key === key)
    if (!s) break
    lines.push({ tier: lines.length, source: s.title, stops: s.steps, asides: s.asides })
    stops = s.steps
  }
  return lines
}

/** every stage key in the plan — "expand all" in one call */
export function allExpandedKeys(): ReadonlySet<string> {
  const keys = new Set<string>()
  const collect = (stops: Stop[]) => {
    for (const s of stops)
      if (s.kind === 'stage') {
        keys.add(s.key)
        collect(s.steps)
      }
  }
  collect(PLAN.stops)
  return keys
}

/** every entry sitting AT a tier, in walk order, treating all stages as open —
 * the structural reading (layer stack), independent of expansion state */
export function entriesAtTier(stops: Stop[], tier: number): Stop[] {
  if (tier === 0) return stops
  return stops.flatMap((s) => (s.kind === 'stage' ? entriesAtTier(s.steps, tier - 1) : []))
}

// ── Module-load guard — the walks.ts idiom: throw at load, not at render ────
{
  const check = (stops: Stop[]) => {
    for (const s of stops) {
      if (s.kind === 'visit') {
        const n = byId.get(s.node)
        if (!n) throw new Error(`walk-tiers mock references unknown node id: ${s.node}`)
        if (!n.topic) throw new Error(`walk-tiers mock stop ${s.node} is not a topic`)
      } else {
        check(s.steps)
        for (const a of s.asides ?? []) check(a.steps)
      }
    }
  }
  check(PLAN.stops)
  const keys: string[] = []
  const collect = (stops: Stop[]) => {
    for (const s of stops)
      if (s.kind === 'stage') {
        keys.push(s.key)
        collect(s.steps)
      }
  }
  collect(PLAN.stops)
  if (new Set(keys).size !== keys.length) throw new Error('walk-tiers mock: duplicate stage key')
}
