// The authoring draft state — the walk tree ITSELF as mutable state, plus a
// block selection and an insertion caret. Since #19 there is ONE stop type, so
// the path grammar is UNIFORM: every container consumes exactly two segments,
// [stopIdx, variantIdx, stepIdx…]. A leaf is just a stop nobody descends into.
// The old "a stage consumes one segment, a fork consumes two" special case is
// gone — rebuildListAt knows one rule, and every structural op inherits it.
//
// Blocks are addressed by INDEX PATHS into the draft's stops. A path alternates
// stop-index / variant-index and always ends on a stop index, so [1, 0, 2] is
// "step 2 of variant 0 of stop 1". Every op is a pure rebuild; selection is
// cleared after any structural change so no stale path can dangle.

import { useSyncExternalStore } from 'react'

import { isBox, isFork, isLeaf } from './mockwalk'
import type { Stop, Variant } from './mockwalk'

export type Path = number[]

// ── One draft, shared (#21) ─────────────────────────────────────────────────
// The draft used to be component state inside WalkDeskView, which worked while
// the palette and the railroad were two zones of one component. #21 split them
// into separate instruments, and a palette that inserts into a draft the
// railroad cannot see is useless — so the draft moved into module-level stores
// both subscribe to.
//
// A SINGLETON, deliberately: there is one plan being written. Two Walk·Desk
// panes should be two views OF that plan, not two plans. The bus is not the
// right home either — it carries what every instrument shares; a half-built
// draft is the authoring pair's private business until #16 bridges it.

interface Store<T> {
  get(): T
  set(v: T): void
  subscribe(fn: () => void): () => void
}

function store<T>(initial: T): Store<T> {
  let value = initial
  const subs = new Set<() => void>()
  return {
    get: () => value,
    set: (v) => {
      if (Object.is(v, value)) return
      value = v
      for (const fn of subs) fn()
    },
    subscribe: (fn) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
  }
}

/** the useState of a shared store — same shape, one value across all callers */
function useStore<T>(s: Store<T>): [T, (v: T) => void] {
  return [useSyncExternalStore(s.subscribe, s.get), s.set]
}

/** The draft starts SEEDED with a fork and an optional stop so branching is
 * visible at first paint; every id is a real corpus node — tiers and variants
 * alike stay pure overlay on an untouched corpus. */
const SEED: Stop[] = [
  { node: 'stk-dns-naming', variants: [] },
  {
    key: 'seed-net',
    title: 'Reach the machine',
    variants: [{ label: '', steps: [{ node: 'stk-ip-routing', variants: [] }, { node: 'stk-tcp-udp', variants: [] }] }],
  },
  {
    key: 'seed-sec',
    title: 'Secure the channel',
    question: 'how deep on security?',
    variants: [
      { label: 'just the handshake', steps: [{ node: 'cry-tls-certificates', variants: [] }] },
      {
        label: 'full crypto tour',
        steps: [
          { node: 'cry-public-key-cryptography', variants: [] },
          { node: 'cry-symmetric-encryption', variants: [] },
          { node: 'cry-cryptographic-hashing', variants: [] },
          { node: 'cry-tls-certificates', variants: [] },
        ],
      },
    ],
  },
  { node: 'web-http-rest', variants: [] },
  { node: 'web-sockets-apis', optional: true, variants: [] },
  { node: 'app-authentication-authorization', variants: [] },
]

const stopsStore = store<Stop[]>(SEED)
const selectedStore = store<ReadonlySet<string>>(new Set())
const caretStore = store<Path | null>(null)
/** which variant each container takes, and whether optionals ride the road —
 * the road's VIEW of the draft. The railroad edits it; the projection reads it. */
const choicesStore = store<Record<string, number>>({})
const optionalsStore = store(true)
const seq = { box: 0 }

/** the road's resolution knobs, shared by the railroad and the projection */
export function useRoad() {
  const [choices, setChoices] = useStore(choicesStore)
  const [withOptionals, setWithOptionals] = useStore(optionalsStore)
  return {
    choices,
    withOptionals,
    setWithOptionals,
    pickBranch: (key: string, idx: number) => setChoices({ ...choices, [key]: idx }),
  }
}

export const pathKey = (p: Path) => 'b.' + p.join('.')
export const parsePath = (key: string): Path =>
  key === 'b.' ? [] : key.slice(2).split('.').map(Number)

/** rebuild the sibling list a parent path addresses. A container is descended
 * through two segments — stop index, then variant index — uniformly, with no
 * per-kind branch. Every structural op goes through here. */
function rebuildListAt(stops: Stop[], parent: Path, f: (list: Stop[]) => Stop[]): Stop[] {
  if (parent.length === 0) return f(stops)
  const [i, vIdx, ...rest] = parent
  return stops.map((s, j) => {
    if (j !== i) return s
    return { ...s, variants: s.variants.map((vr, k) => (k === vIdx ? { ...vr, steps: rebuildListAt(vr.steps, rest, f) } : vr)) }
  })
}

/** the sibling list a parent path addresses (root list for []) */
function stopAtList(stops: Stop[], parent: Path): Stop[] | null {
  if (parent.length === 0) return stops
  const [i, vIdx, ...rest] = parent
  const s = stops[i]
  const vr = s?.variants[vIdx]
  return vr ? stopAtList(vr.steps, rest) : null
}

export function stopAt(stops: Stop[], path: Path): Stop | undefined {
  if (path.length === 0) return undefined
  return stopAtList(stops, path.slice(0, -1))?.[path[path.length - 1]]
}

function insertAt(stops: Stop[], path: Path, stop: Stop): Stop[] {
  const i = path[path.length - 1]
  return rebuildListAt(stops, path.slice(0, -1), (list) => [...list.slice(0, i), stop, ...list.slice(i)])
}

function removeAt(stops: Stop[], path: Path): { rest: Stop[]; removed?: Stop } {
  const i = path[path.length - 1]
  let removed: Stop | undefined
  const rest = rebuildListAt(stops, path.slice(0, -1), (list) => {
    removed = list[i]
    return list.filter((_, j) => j !== i)
  })
  return { rest, removed }
}

/** rebuild the single stop at `path` through `f` */
function mapStopAt(stops: Stop[], path: Path, f: (s: Stop) => Stop): Stop[] {
  const i = path[path.length - 1]
  return rebuildListAt(stops, path.slice(0, -1), (list) => list.map((s, j) => (j === i ? f(s) : s)))
}

/** rebuild the container carrying `key` through `f`, wherever it sits */
function mapBox(list: Stop[], key: string, f: (s: Stop) => Stop): Stop[] {
  return list.map((s) => {
    if (isLeaf(s)) return s
    if (s.key === key) return f(s)
    return { ...s, variants: s.variants.map((vr) => ({ ...vr, steps: mapBox(vr.steps, key, f) })) }
  })
}

/** removing `removed` shifts later siblings at its parent level down by one */
function adjustAfterRemoval(target: Path, removed: Path): Path {
  const d = removed.length - 1
  if (target.length > d && removed.slice(0, d).every((v, k) => v === target[k]) && target[d] > removed[d]) {
    const t = [...target]
    t[d]--
    return t
  }
  return target
}

/** the selection as a contiguous run of siblings, or null if it isn't one */
function contiguousRun(selected: ReadonlySet<string>): { parent: Path; from: number; to: number } | null {
  if (selected.size === 0) return null
  const paths = [...selected].map(parsePath)
  const parent = paths[0].slice(0, -1)
  const pk = pathKey(parent)
  if (!paths.every((p) => pathKey(p.slice(0, -1)) === pk)) return null
  const idx = paths.map((p) => p[p.length - 1]).sort((a, b) => a - b)
  for (let k = 1; k < idx.length; k++) if (idx[k] !== idx[k - 1] + 1) return null
  return { parent, from: idx[0], to: idx[idx.length - 1] }
}

/** every container key in a draft — the "all open" expansion for fringe() */
export function allKeysOf(stops: Stop[]): ReadonlySet<string> {
  const keys = new Set<string>()
  const walk = (list: Stop[]) => {
    for (const s of list)
      if (isBox(s)) {
        keys.add(s.key)
        for (const vr of s.variants) walk(vr.steps)
      }
  }
  walk(stops)
  return keys
}

export interface AuthorState {
  stops: Stop[]
  selected: ReadonlySet<string>
  caret: Path | null
  setCaret(p: Path | null): void
  toggleSelect(p: Path): void
  /** replace the selection with exactly these blocks (a plain click selects one;
   * a marquee selects the boxed run), or ADD to it when additive (shift). */
  selectPaths(paths: Path[], additive?: boolean): void
  /** palette insert: at the caret if the drop set one, else after a single
   * selected block, else at the end of the plan */
  insertNode(node: string, at?: Path): void
  /** move an existing block to a new position (drag) */
  moveBlock(from: Path, to: Path): void
  /** wrap the selected run into a plain group — one variant holding the run */
  groupSelection(): void
  /** wrap the selected run into a fork: it becomes the first variant, an empty
   * alternative variant opens beside it */
  forkSelection(): void
  deleteSelection(): void
  /** replace the container at `path` with variant `keep`'s steps, spliced into
   * the parent list in place — remove the box but KEEP its chosen steps on the
   * road. Merges the old promote (plain group) and resolve-fork (chosen branch)
   * into one op: both keep the steps that were showing. */
  promote(path: Path, keep: number): void
  /** drop ONE variant from the container at `path`. Emptied → the container is
   * removed; one variant left → it stays a plain GROUP (a one-variant container
   * is a legal shape now, no longer dissolved). */
  dropVariant(path: Path, idx: number): void
  /** bind a corpus node to an unset placeholder leaf at `path` */
  bindNode(path: Path, node: string): void
  /** flip the optional flag on every selected leaf / plain group (not a fork) */
  toggleOptionalSelection(): void
  /** Tab — move the single selected block into the container right above it */
  indentSelection(): void
  retitle(key: string, title: string): void
  /** append a variant to the container — turns a plain group into a fork */
  addVariant(key: string): void
  relabelVariant(key: string, idx: number, label: string): void
  setQuestion(key: string, question: string): void
  canGroup: boolean
  canFork: boolean
  canOptional: boolean
  canIndent: boolean
  canDelete: boolean
  /** exactly one container is selected — its chosen steps can be promoted */
  canPromote: boolean
}

export function useAuthorDraft(): AuthorState {
  const [stops, setStops] = useStore(stopsStore)
  const [selected, setSelected] = useStore(selectedStore)
  const [caret, setCaret] = useStore(caretStore)

  const commit = (next: Stop[]) => {
    setStops(next)
    setSelected(new Set())
    setCaret(null)
  }

  const run = contiguousRun(selected)

  const selectedStops = [...selected].map((k) => stopAt(stops, parsePath(k)))

  const single = selected.size === 1 ? parsePath([...selected][0]) : null
  const prevSibling =
    single && single[single.length - 1] > 0
      ? stopAt(stops, [...single.slice(0, -1), single[single.length - 1] - 1])
      : undefined

  return {
    stops,
    selected,
    caret,
    setCaret,
    toggleSelect: (p) => {
      const key = pathKey(p)
      const next = new Set(selected)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      setSelected(next)
    },
    selectPaths: (paths, additive) => {
      const next = additive ? new Set(selected) : new Set<string>()
      for (const p of paths) next.add(pathKey(p))
      setSelected(next)
      setCaret(null)
    },
    insertNode: (node, at) => {
      const stop: Stop = { node, variants: [] }
      const target = at ?? (single ? [...single.slice(0, -1), single[single.length - 1] + 1] : [stops.length])
      commit(insertAt(stops, target, stop))
    },
    moveBlock: (from, to) => {
      // a block cannot move into its own subtree
      if (to.length >= from.length && from.every((v, k) => v === to[k])) return
      const { rest, removed } = removeAt(stops, from)
      if (!removed) return
      commit(insertAt(rest, adjustAfterRemoval(to, from), removed))
    },
    groupSelection: () => {
      if (!run) return
      const key = `draft-${seq.box++}`
      commit(
        rebuildListAt(stops, run.parent, (list) => [
          ...list.slice(0, run.from),
          { key, title: 'name this stage', variants: [{ label: '', steps: list.slice(run.from, run.to + 1) }] },
          ...list.slice(run.to + 1),
        ]),
      )
    },
    forkSelection: () => {
      if (!run) return
      const key = `fork-${seq.box++}`
      commit(
        rebuildListAt(stops, run.parent, (list) => [
          ...list.slice(0, run.from),
          {
            key,
            title: 'name this fork',
            question: 'which way here?',
            variants: [
              { label: 'main path', steps: list.slice(run.from, run.to + 1) },
              // a new variant opens with a node slot to bind, not an empty label
              { label: 'alternative', steps: [{ node: '', unset: true, variants: [] }] },
            ],
          },
          ...list.slice(run.to + 1),
        ]),
      )
    },
    deleteSelection: () => {
      if (selected.size === 0) return
      // remove in reverse document order so earlier paths stay valid
      const paths = [...selected].map(parsePath).sort(compareDoc).reverse()
      let next = stops
      for (const p of paths) next = removeAt(next, p).rest
      commit(next)
    },
    promote: (path, keep) => {
      const s = stopAt(stops, path)
      if (!s || isLeaf(s)) return
      const steps = s.variants[keep]?.steps ?? s.variants[0]?.steps ?? []
      const i = path[path.length - 1]
      commit(rebuildListAt(stops, path.slice(0, -1), (list) => [...list.slice(0, i), ...steps, ...list.slice(i + 1)]))
    },
    dropVariant: (path, idx) => {
      const s = stopAt(stops, path)
      if (!s || isLeaf(s)) return
      const remaining = s.variants.filter((_, k) => k !== idx)
      if (remaining.length === 0) {
        commit(removeAt(stops, path).rest) // last variant gone — drop the container
        return
      }
      commit(mapStopAt(stops, path, (st) => (isLeaf(st) ? st : { ...st, variants: remaining })))
    },
    bindNode: (path, node) => {
      setStops(mapStopAt(stops, path, (s) => (isLeaf(s) ? { ...s, node, unset: undefined } : s)))
    },
    toggleOptionalSelection: () => {
      if (selected.size === 0) return
      let next = stops
      for (const k of selected)
        next = mapStopAt(next, parsePath(k), (s) => (isFork(s) ? s : { ...s, optional: !s.optional }))
      commit(next)
    },
    indentSelection: () => {
      if (!single || !prevSibling || !isBox(prevSibling)) return
      const idx = single[single.length - 1]
      const { rest, removed } = removeAt(stops, single)
      if (!removed) return
      // land inside the container above, at the end of its first variant
      commit(insertAt(rest, [...single.slice(0, -1), idx - 1, 0, prevSibling.variants[0].steps.length], removed))
    },
    retitle: (key, title) => {
      setStops(mapBox(stops, key, (s) => ({ ...s, title })))
    },
    addVariant: (key) => {
      const variant: Variant = { label: 'another way', steps: [{ node: '', unset: true, variants: [] }] }
      setStops(mapBox(stops, key, (s) => ({ ...s, variants: [...s.variants, variant] })))
    },
    relabelVariant: (key, idx, label) => {
      setStops(mapBox(stops, key, (s) => ({ ...s, variants: s.variants.map((vr, k) => (k === idx ? { ...vr, label } : vr)) })))
    },
    setQuestion: (key, question) => {
      setStops(mapBox(stops, key, (s) => ({ ...s, question })))
    },
    canGroup: !!run,
    canFork: !!run,
    canOptional: selected.size > 0 && selectedStops.every((s) => s !== undefined && !isFork(s)),
    canIndent: !!prevSibling && isBox(prevSibling),
    canDelete: selected.size > 0,
    canPromote: !!single && !!stopAt(stops, single) && isBox(stopAt(stops, single)!),
  }
}

/** document order: shorter shared-prefix path first, then by index */
function compareDoc(a: Path, b: Path): number {
  const n = Math.min(a.length, b.length)
  for (let k = 0; k < n; k++) if (a[k] !== b[k]) return a[k] - b[k]
  return a.length - b.length
}
