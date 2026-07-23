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
//   - mixed grain — a plain leaf visit sitting between stages at tier 0
//
// The ASIDE ("meanwhile" lane) was CUT in review 5: a stage's steps are its
// steps, and a second kind of child that every view had to render specially
// bought less than it cost. Anything genuinely beside the road is an optional
// stop or its own branch.

import { byId } from '../../corpus/graph'
import { WALKS } from '../../corpus/walks'

/** a leaf visit: the walk stops on a real corpus node */
export interface VisitStop {
  kind: 'visit'
  node: string
  note?: string
  /** an optional stop: on the road by default, but the road can bypass it */
  optional?: boolean
  /** a placeholder slot with no node bound yet — a new lane opens with one of
   * these instead of an empty label (KnowledgeNetworkDemo#13). It shows a
   * "pick a node" chip in the editor and is DROPPED from the projection
   * (fringe/resolveRoad), so downstream — which does byId.get(node)! — never
   * sees a hole. `node` is '' until bound. */
  unset?: boolean
}

/** a stage: a stop that decomposes into its own walk, one tier down */
export interface StageStop {
  kind: 'stage'
  /** stable key for expansion state — unique across the whole plan */
  key: string
  title: string
  steps: Stop[]
  optional?: boolean
}

/** one road out of a fork — the branch label is the condition that picks it */
export interface Branch {
  label: string
  steps: Stop[]
}

/** a branching decision (round 7): the road splits into labelled branches and
 * every branch REJOINS below — well-nested fork/rejoin, never a free DAG.
 * Presentation never sees a fork: resolveRoad() splices the chosen branch
 * inline, so downstream (columns, fringe, bus) stays a linear walk. */
export interface ForkStop {
  kind: 'fork'
  key: string
  question: string
  branches: Branch[]
}

export type Stop = VisitStop | StageStop | ForkStop

const v = (node: string, note?: string): VisitStop => ({ kind: 'visit', node, note })
const stage = (key: string, title: string, steps: Stop[]): StageStop => ({ kind: 'stage', key, title, steps })

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
    stage('serve', 'Serve it on the network', [
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
    ]),
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
    if (s.kind === 'visit') {
      if (s.unset) continue // an unbound placeholder is not a real stop yet
      out.push({ kind: 'node', id: s.node, note: s.note })
    }
    // defensive: presentation reads RESOLVED trees (no forks); an unresolved
    // fork projects as its first branch, the default road
    else if (s.kind === 'fork') out.push(...fringe(s.branches[0]?.steps ?? [], expanded))
    else if (expanded.has(s.key)) out.push(...fringe(s.steps, expanded))
    else out.push({ kind: 'stage', key: s.key, title: s.title, visits: visitCount(s) })
  }
  return out
}

// ── Road resolution (round 7) ───────────────────────────────────────────────
// A branching draft still projects to ONE linear walk: pick a branch per fork
// (branch 0 is the default road), splice it inline where the fork stood, and
// drop skipped optionals. Everything downstream of this call — columns,
// fringe, the bus — never learns that forks exist.

export function resolveRoad(stops: Stop[], choices: Record<string, number>, withOptionals: boolean): Stop[] {
  const out: Stop[] = []
  for (const s of stops) {
    if (s.kind === 'visit' && s.unset) {
      continue // placeholder slot — never reaches the presented road
    } else if (s.kind === 'fork') {
      const branch = s.branches[choices[s.key] ?? 0] ?? s.branches[0]
      out.push(...resolveRoad(branch?.steps ?? [], choices, withOptionals))
    } else if (s.optional && !withOptionals) {
      continue
    } else if (s.kind === 'stage') {
      out.push({ ...s, steps: resolveRoad(s.steps, choices, withOptionals) })
    } else {
      out.push(s)
    }
  }
  return out
}

// ── Shape helpers ───────────────────────────────────────────────────────────

/** leaf visits under a stop, all tiers — a fork counts its longest road */
export function visitCount(s: Stop): number {
  if (s.kind === 'visit') return s.unset ? 0 : 1
  if (s.kind === 'fork') return Math.max(0, ...s.branches.map((b) => b.steps.reduce((a, c) => a + visitCount(c), 0)))
  return s.steps.reduce((a, c) => a + visitCount(c), 0)
}

/** tiers under a stop, counting itself — a fork adds no tier of its own */
export function tierCount(s: Stop): number {
  if (s.kind === 'visit') return 1
  if (s.kind === 'fork') return Math.max(1, ...s.branches.flatMap((b) => b.steps.map(tierCount)))
  return 1 + Math.max(...s.steps.map(tierCount))
}

/** the chain of stages from the plan root down to `key` (inclusive) */
export function stagePath(stops: Stop[], key: string): StageStop[] {
  for (const s of stops) {
    if (s.kind === 'visit') continue
    if (s.kind === 'fork') {
      for (const b of s.branches) {
        const below = stagePath(b.steps, key)
        if (below.length) return below
      }
      continue
    }
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
}

export function linesForPath(path: string[]): TierLine[] {
  const lines: TierLine[] = [{ tier: 0, source: PLAN.title, stops: PLAN.stops }]
  let stops = PLAN.stops
  for (const key of path) {
    const s = stops.find((x): x is StageStop => x.kind === 'stage' && x.key === key)
    if (!s) break
    lines.push({ tier: lines.length, source: s.title, stops: s.steps })
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
  return stops.flatMap((s) => {
    if (s.kind === 'stage') return entriesAtTier(s.steps, tier - 1)
    if (s.kind === 'fork') return s.branches.flatMap((b) => entriesAtTier(b.steps, tier))
    return []
  })
}

// ── Module-load guard — the walks.ts idiom: throw at load, not at render ────
{
  const check = (stops: Stop[]) => {
    for (const s of stops) {
      if (s.kind === 'visit') {
        const n = byId.get(s.node)
        if (!n) throw new Error(`walk-tiers mock references unknown node id: ${s.node}`)
        if (!n.topic) throw new Error(`walk-tiers mock stop ${s.node} is not a topic`)
      } else if (s.kind === 'fork') {
        for (const b of s.branches) check(b.steps)
      } else {
        check(s.steps)
      }
    }
  }
  check(PLAN.stops)
  const keys: string[] = []
  const collect = (stops: Stop[]) => {
    for (const s of stops) {
      if (s.kind === 'visit') continue
      keys.push(s.key)
      if (s.kind === 'fork') for (const b of s.branches) collect(b.steps)
      else collect(s.steps)
    }
  }
  collect(PLAN.stops)
  if (new Set(keys).size !== keys.length) throw new Error('walk-tiers mock: duplicate stage key')
}
