// The authoring draft state (round 3, branching in round 7) — the walk tree
// ITSELF as mutable state, plus a block selection and an insertion caret.
// Round 7 adds forks: the path grammar grows exactly one rule — a FORK
// CONSUMES TWO SEGMENTS, [forkIdx, branchIdx, stepIdx…] — so every existing
// tree op (insert/remove/move/group) works inside a branch unchanged. All
// structural ops funnel through rebuildListAt, which knows that grammar once.
//
// Blocks are addressed by INDEX PATHS into the draft's stops — [1, 0, 2] is
// "third step of the first step of the second stop". Every op is a pure
// rebuild; selection is cleared after any structural change so no stale path
// can dangle.

import { useSyncExternalStore } from 'react'

import type { Branch, ForkStop, StageStop, Stop, VisitStop } from './mockwalk'

export type Path = number[]

// ── One draft, shared (#21) ─────────────────────────────────────────────────
// The draft used to be component state inside WalkDeskView, which worked while
// the palette and the railroad were two zones of one component. #21 split them
// into separate instruments, and a palette that inserts into a draft the
// railroad cannot see is useless — so the draft moved into module-level stores
// both subscribe to.
//
// A SINGLETON, deliberately: there is one plan being written. Two Walk·Desk
// panes should be two views OF that plan, not two plans, which is what
// component state would have given. This is state that outlived its component,
// so it stopped living in one. The bus is not the right home either — it
// carries what every instrument shares (focus, route, trail), and a half-built
// draft is the authoring pair's private business until #16 bridges it to
// walks.ts.

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
 * visible at first paint; every id is a real corpus node — tiers and branches
 * alike stay pure overlay on an untouched corpus. */
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

const stopsStore = store<Stop[]>(SEED)
const selectedStore = store<ReadonlySet<string>>(new Set())
const caretStore = store<Path | null>(null)
/** which branch each fork takes, and whether optionals ride the road — the
 * road's VIEW of the draft. The railroad edits it; the projection reads it. */
const choicesStore = store<Record<string, number>>({})
const optionalsStore = store(true)
const seq = { stage: 0, fork: 0 }

/** the road's resolution knobs, shared by the railroad and the projection */
export function useRoad() {
  const [choices, setChoices] = useStore(choicesStore)
  const [withOptionals, setWithOptionals] = useStore(optionalsStore)
  return {
    choices,
    withOptionals,
    setWithOptionals,
    pickBranch: (forkKey: string, idx: number) => setChoices({ ...choices, [forkKey]: idx }),
  }
}

export const pathKey = (p: Path) => 'b.' + p.join('.')
export const parsePath = (key: string): Path =>
  key === 'b.' ? [] : key.slice(2).split('.').map(Number)

/** rebuild the sibling list a parent path addresses, through the fork
 * grammar: a stage recurses on one segment, a fork on two (branch, then
 * step). Every structural op goes through here. */
function rebuildListAt(stops: Stop[], parent: Path, f: (list: Stop[]) => Stop[]): Stop[] {
  if (parent.length === 0) return f(stops)
  const [i, ...rest] = parent
  return stops.map((s, j) => {
    if (j !== i) return s
    if (s.kind === 'stage') return { ...s, steps: rebuildListAt(s.steps, rest, f) }
    if (s.kind === 'fork') {
      const [b, ...more] = rest
      return {
        ...s,
        branches: s.branches.map((br, k) => (k === b ? { ...br, steps: rebuildListAt(br.steps, more, f) } : br)),
      }
    }
    return s
  })
}

/** the sibling list a parent path addresses (root list for []) */
function stopAtList(stops: Stop[], parent: Path): Stop[] | null {
  if (parent.length === 0) return stops
  const [i, ...rest] = parent
  const s = stops[i]
  if (!s) return null
  if (s.kind === 'stage') return stopAtList(s.steps, rest)
  if (s.kind === 'fork') {
    const br = s.branches[rest[0]]
    return br ? stopAtList(br.steps, rest.slice(1)) : null
  }
  return null
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

/** rebuild the fork carrying `key` through `f`, wherever it sits */
function mapFork(list: Stop[], key: string, f: (s: ForkStop) => ForkStop): Stop[] {
  return list.map((s) => {
    if (s.kind === 'visit') return s
    if (s.kind === 'fork')
      return s.key === key ? f(s) : { ...s, branches: s.branches.map((b) => ({ ...b, steps: mapFork(b.steps, key, f) })) }
    return { ...s, steps: mapFork(s.steps, key, f) }
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

/** every stage key in a draft — the "all open" expansion for fringe() */
export function allKeysOf(stops: Stop[]): ReadonlySet<string> {
  const keys = new Set<string>()
  const walk = (list: Stop[]) => {
    for (const s of list) {
      if (s.kind === 'stage') {
        keys.add(s.key)
        walk(s.steps)
      } else if (s.kind === 'fork') {
        for (const b of s.branches) walk(b.steps)
      }
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
  groupSelection(): void
  /** wrap the selected run into a fork: it becomes the main-path branch, an
   * empty alternative branch opens beside it */
  forkSelection(): void
  deleteSelection(): void
  /** replace the single selected stage with its steps, spliced into the
   * parent list in place — remove the container but KEEP its children on the
   * road (the "promote children" answer to a container delete) */
  promoteSelection(): void
  /** the fork analogue of promote: replace the fork at `forkPath` with the
   * `keep` branch's steps spliced inline — dissolve the decision, keep the
   * chosen road. The caller (AuthorRoad) passes the chosen index from choices. */
  resolveForkTo(forkPath: Path, keep: number): void
  /** drop ONE lane from the fork at `forkPath`. If that leaves a single
   * branch, the fork dissolves into that branch's steps (a one-way fork is
   * just a linear run). The "delete this layer" answer to a container delete. */
  dropLane(forkPath: Path, idx: number): void
  /** bind a corpus node to an unset placeholder visit at `path` */
  bindNode(path: Path, node: string): void
  /** flip the optional flag on every selected visit/stage */
  toggleOptionalSelection(): void
  /** Tab — move the single selected block into the stage right above it */
  indentSelection(): void
  retitle(key: string, title: string): void
  addBranch(forkKey: string): void
  relabelBranch(forkKey: string, branch: number, label: string): void
  setForkQuestion(forkKey: string, question: string): void
  canGroup: boolean
  canFork: boolean
  canOptional: boolean
  canIndent: boolean
  canDelete: boolean
  /** exactly one stage is selected — a container whose children can be promoted */
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
      const stop: VisitStop = { kind: 'visit', node }
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
      const key = `draft-${seq.stage++}`
      commit(
        rebuildListAt(stops, run.parent, (list) => [
          ...list.slice(0, run.from),
          { kind: 'stage', key, title: 'name this stage', steps: list.slice(run.from, run.to + 1) } as StageStop,
          ...list.slice(run.to + 1),
        ]),
      )
    },
    forkSelection: () => {
      if (!run) return
      const key = `fork-${seq.fork++}`
      commit(
        rebuildListAt(stops, run.parent, (list) => [
          ...list.slice(0, run.from),
          {
            kind: 'fork',
            key,
            question: 'which way here?',
            branches: [
              { label: 'main path', steps: list.slice(run.from, run.to + 1) },
              // a new lane opens with a node slot to bind, not an empty label
              { label: 'alternative', steps: [{ kind: 'visit', node: '', unset: true }] },
            ],
          } as ForkStop,
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
    promoteSelection: () => {
      if (!single) return
      const s = stopAt(stops, single)
      if (!s || s.kind !== 'stage') return
      const i = single[single.length - 1]
      commit(
        rebuildListAt(stops, single.slice(0, -1), (list) => [...list.slice(0, i), ...s.steps, ...list.slice(i + 1)]),
      )
    },
    resolveForkTo: (forkPath, keep) => {
      const s = stopAt(stops, forkPath)
      if (!s || s.kind !== 'fork') return
      const branch = s.branches[keep] ?? s.branches[0]
      const i = forkPath[forkPath.length - 1]
      commit(
        rebuildListAt(stops, forkPath.slice(0, -1), (list) => [
          ...list.slice(0, i),
          ...(branch?.steps ?? []),
          ...list.slice(i + 1),
        ]),
      )
    },
    dropLane: (forkPath, idx) => {
      const s = stopAt(stops, forkPath)
      if (!s || s.kind !== 'fork') return
      const remaining = s.branches.filter((_, k) => k !== idx)
      if (remaining.length === 0) {
        commit(removeAt(stops, forkPath).rest) // last lane gone — drop the fork
        return
      }
      const i = forkPath[forkPath.length - 1]
      if (remaining.length === 1) {
        // a one-way fork is just a linear run — dissolve it to that branch
        commit(
          rebuildListAt(stops, forkPath.slice(0, -1), (list) => [
            ...list.slice(0, i),
            ...remaining[0].steps,
            ...list.slice(i + 1),
          ]),
        )
        return
      }
      commit(mapStopAt(stops, forkPath, (st) => (st.kind !== 'fork' ? st : { ...st, branches: remaining })))
    },
    bindNode: (path, node) => {
      setStops(mapStopAt(stops, path, (s) => (s.kind === 'visit' ? { ...s, node, unset: undefined } : s)))
    },
    toggleOptionalSelection: () => {
      if (selected.size === 0) return
      let next = stops
      for (const k of selected)
        next = mapStopAt(next, parsePath(k), (s) => (s.kind === 'fork' ? s : { ...s, optional: !s.optional }))
      commit(next)
    },
    indentSelection: () => {
      if (!single || prevSibling?.kind !== 'stage') return
      const idx = single[single.length - 1]
      const { rest, removed } = removeAt(stops, single)
      if (!removed) return
      commit(insertAt(rest, [...single.slice(0, -1), idx - 1, prevSibling.steps.length], removed))
    },
    retitle: (key, title) => {
      const walk = (list: Stop[]): Stop[] =>
        list.map((s) => {
          if (s.kind === 'visit') return s
          if (s.kind === 'fork') return { ...s, branches: s.branches.map((b) => ({ ...b, steps: walk(b.steps) })) }
          return s.key === key ? { ...s, title } : { ...s, steps: walk(s.steps) }
        })
      setStops(walk(stops))
    },
    addBranch: (forkKey) => {
      const branch: Branch = { label: 'another way', steps: [{ kind: 'visit', node: '', unset: true }] }
      setStops(mapFork(stops, forkKey, (f) => ({ ...f, branches: [...f.branches, branch] })))
    },
    relabelBranch: (forkKey, branch, label) => {
      setStops(mapFork(stops, forkKey, (f) => ({ ...f, branches: f.branches.map((b, k) => (k === branch ? { ...b, label } : b)) })))
    },
    setForkQuestion: (forkKey, question) => {
      setStops(mapFork(stops, forkKey, (f) => ({ ...f, question })))
    },
    canGroup: !!run,
    canFork: !!run,
    canOptional: selected.size > 0 && selectedStops.every((s) => s && s.kind !== 'fork'),
    canIndent: prevSibling?.kind === 'stage',
    canDelete: selected.size > 0,
    canPromote: !!single && stopAt(stops, single)?.kind === 'stage',
  }
}

/** document order: shorter shared-prefix path first, then by index */
function compareDoc(a: Path, b: Path): number {
  const n = Math.min(a.length, b.length)
  for (let k = 0; k < n; k++) if (a[k] !== b[k]) return a[k] - b[k]
  return a.length - b.length
}
