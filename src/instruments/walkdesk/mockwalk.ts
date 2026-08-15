// Mock data for the Walk·Desk — a TIERED walk over the teaching corpus, now on
// ONE stop type (#19). A stop optionally lands on a corpus node (a LEAF) and
// optionally holds child-lists (VARIANTS). Its meaning is read from its shape,
// never from a stored tag:
//
//   variants.length === 0   a leaf — the walk stops on a real corpus node
//                    === 1   a plain group — a named box, one list of steps
//                    >=  2   a fork — the road can go one of several ways
//
// "Container" = anything with variants; a fork is just a container with more
// than one. THROWAWAY spike data: nothing here touches the bus. The corpus is
// unchanged — tiers and branches are pure overlay over the same nodes.
//
// The dataset packs four tiers of depth (one more than the altitude window), a
// sub-walk BY REFERENCE (a group built from an authored walks.ts walk), a
// REVISIT (stk-tcp-udp stopped on twice), and mixed grain (a plain leaf between
// groups at tier 0).

import { byId } from '../../corpus/graph'
import { WALKS } from '../../corpus/walks'

/** one child-list of a container — its label is what picks it at a fork */
export interface Variant {
  /** stable id assigned at creation; survives reorder/delete so VersionedGroup
   * can track activeId across structural edits (#92). */
  id: string
  label: string
  steps: Stop[]
}

/** THE stop. A leaf binds `node` and has no variants; a container has variants
 * (and a `key`/`title`) and binds no node. The two are kept exclusive by how
 * the ops build them, not by the type — see #19. */
export interface Stop {
  /** the corpus topic a LEAF lands on ('' only while an unset placeholder) */
  node?: string
  note?: string
  /** an optional stop: on the road by default, but the road can bypass it */
  optional?: boolean
  /** a placeholder leaf with no node bound yet — shows a "pick a node" chip and
   * is DROPPED from the projection, so downstream never sees a hole */
  unset?: boolean
  /** a CONTAINER's stable id — choice, collapse and rename state hang off it */
  key?: string
  title?: string
  /** a free-text description shown under the title of any OPEN container — the
   * node subtitle (#15), left-indented so it reads as "under" the title. What
   * the node IS. (A separate fork "question" field was removed in the V2-NEAT
   * pass — the per-version v1/v2/v3 titles carry version naming instead.) */
  description?: string
  /** []  = leaf · 1 = plain group · 2+ = fork */
  variants: Variant[]
}

/** a leaf: no variants. Narrows `node` to a definite string for consumers. */
export const isLeaf = (s: Stop): s is Stop & { node: string } => s.variants.length === 0
/** a container: one or more variants. Narrows `key`/`title` to definite. */
export const isBox = (s: Stop): s is Stop & { key: string; title: string } => s.variants.length > 0
/** a fork: a container offering a choice (more than one variant) */
export const isFork = (s: Stop): boolean => s.variants.length > 1

/** which variant a container currently shows/takes. Looks up by the stored id
 * so the result is stable when variants before it are deleted (#92). Falls
 * back to 0 if the id is not found — the active version was deleted. */
export const chosenIdx = (s: Stop, choices: Record<string, string>): number => {
  const i = s.variants.findIndex((v) => v.id === choices[s.key ?? ''])
  return i >= 0 ? i : 0
}
/** the steps of the chosen variant */
export const chosenSteps = (s: Stop, choices: Record<string, string>): Stop[] =>
  s.variants[chosenIdx(s, choices)]?.steps ?? []

const v = (node: string, note?: string): Stop => ({ node, note, variants: [] })
/** a plain group: one unlabeled variant holding the steps */
const group = (key: string, title: string, steps: Stop[]): Stop => ({ key, title, variants: [{ id: key + '-v0', label: '', steps }] })

/** a group built FROM an authored walk — sub-walk by reference. The stop "is"
 * the whole walk; expanding it plays the walk's stops as its steps. */
function groupFromWalk(key: string, walkId: string): Stop {
  const w = WALKS.find((x) => x.id === walkId)
  if (!w) throw new Error(`walk mock references unknown walk: ${walkId}`)
  return group(
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
    groupFromWalk('machine', 'transistor-to-program'),
    group('serve', 'Serve it on the network', [
      v('stk-dns-naming', 'a typed name must become an address before anything moves'),
      v('stk-ip-routing', 'packets hop toward that address with no promises'),
      v('stk-tcp-udp', 'a reliable stream is built out of the unreliable hops'),
      group('secure', 'Secure the channel', [
        v('cry-public-key-cryptography', 'the trapdoor that lets strangers agree on a secret'),
        v('cry-tls-certificates', 'the handshake that proves a name and seals the stream'),
        group('primitives', 'The primitives underneath', [
          v('cry-symmetric-encryption', 'once the key is agreed, the bulk cipher does the work'),
          v('cry-cryptographic-hashing', 'integrity: the fingerprint every record carries'),
        ]),
      ]),
    ]),
    group('speak', 'Speak the application protocol', [
      v('web-http-rest', 'over the secured stream, the browser finally talks'),
      v('web-sockets-apis', 'on both ends the conversation is just sockets'),
      v('stk-tcp-udp', 'the same stream again — a revisit, on purpose'),
    ]),
    v('app-authentication-authorization', 'the closing leaf: the page knows who it is for'),
  ],
}

// ── Projection ──────────────────────────────────────────────────────────────
// The flat route the bus would read: the leaf fringe of the plan at its current
// expansion state. A collapsed container contributes a GROUP entry (a
// placeholder with no corpus node — focus only ever moves to leaves), an
// expanded one contributes its chosen variant's fringe instead.

export type RouteEntry =
  | { kind: 'node'; id: string; note?: string }
  | { kind: 'group'; key: string; title: string; visits: number }

export function fringe(stops: Stop[], expanded: ReadonlySet<string>): RouteEntry[] {
  const out: RouteEntry[] = []
  for (const s of stops) {
    if (isLeaf(s)) {
      if (s.unset) continue // an unbound placeholder is not a real stop yet
      out.push({ kind: 'node', id: s.node, note: s.note })
    } else if (isBox(s)) {
      if (expanded.has(s.key)) {
        // a container in the fringe walks its default (first) variant — the road
        out.push(...fringe(s.variants[0].steps, expanded))
      } else {
        out.push({ kind: 'group', key: s.key, title: s.title, visits: visitCount(s) })
      }
    }
  }
  return out
}

/** flat ordered leaf-node IDs from a resolved stop tree. resolveRoad has
 * already collapsed fork choices and dropped skipped optionals, so every
 * container here has exactly one variant — no branching remains. */
export function leafIds(stops: Stop[]): string[] {
  const out: string[] = []
  for (const s of stops) {
    if (isLeaf(s)) out.push(s.node)
    else out.push(...leafIds(s.variants[0]?.steps ?? []))
  }
  return out
}

// ── Road resolution ─────────────────────────────────────────────────────────
// A branching draft still projects to ONE linear walk: at every container pick
// the chosen variant (variant 0 is the default road) and drop skipped optionals.
// Unlike the old model, a resolved container STAYS a named group (its single
// surviving variant), rather than splicing its steps inline (#19) — everything
// downstream renders a container the same way whether it began as a group or a
// fork.

export function resolveRoad(stops: Stop[], choices: Record<string, string>, withOptionals: boolean): Stop[] {
  const out: Stop[] = []
  for (const s of stops) {
    if (isLeaf(s)) {
      if (s.unset) continue // placeholder slot — never reaches the presented road
      if (s.optional && !withOptionals) continue
      out.push(s)
    } else {
      if (s.optional && !withOptionals) continue
      const chosen = s.variants[chosenIdx(s, choices)]
      out.push({
        ...s,
        variants: [{ id: chosen?.id ?? '', label: chosen?.label ?? '', steps: resolveRoad(chosen?.steps ?? [], choices, withOptionals) }],
      })
    }
  }
  return out
}

// ── Shape helpers ───────────────────────────────────────────────────────────

/** Depth-first visit of every stop, descending into EVERY variant (both roads
 * of a fork, not just the chosen one). The one tree-walk the read-only
 * traversals share — validation, key collection, "all open". Projection
 * (`fringe`, `resolveRoad`) does NOT use it: those pick a single variant, so
 * their branching is the point, not boilerplate to factor out. */
export function forEachStop(stops: Stop[], visit: (s: Stop) => void): void {
  for (const s of stops) {
    visit(s)
    if (isBox(s)) for (const vr of s.variants) forEachStop(vr.steps, visit)
  }
}

/** leaf visits under a stop, all tiers — a fork counts its longest variant */
export function visitCount(s: Stop): number {
  if (isLeaf(s)) return s.unset ? 0 : 1
  return Math.max(0, ...s.variants.map((vr) => vr.steps.reduce((a, c) => a + visitCount(c), 0)))
}

// ── Module-load guard — the walks.ts idiom: throw at load, not at render ────
{
  forEachStop(PLAN.stops, (s) => {
    if (!isLeaf(s) || s.unset) return
    const n = byId.get(s.node)
    if (!n) throw new Error(`walk mock references unknown node id: ${s.node}`)
    if (!n.topic) throw new Error(`walk mock stop ${s.node} is not a topic`)
  })
  const keys: string[] = []
  forEachStop(PLAN.stops, (s) => {
    if (isBox(s)) keys.push(s.key)
  })
  if (new Set(keys).size !== keys.length) throw new Error('walk mock: duplicate container key')
}
