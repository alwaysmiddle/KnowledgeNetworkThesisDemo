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

import { useRef, useState } from 'react'

import type { Aside, Branch, ForkStop, StageStop, Stop, VisitStop } from './mockwalk'

export type Path = number[]

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
  /** palette insert: at the caret if the drop set one, else after a single
   * selected block, else at the end of the plan */
  insertNode(node: string, at?: Path): void
  /** move an existing block to a new position (drag) */
  moveBlock(from: Path, to: Path): void
  groupSelection(): void
  /** wrap the selected run into a fork: it becomes the main-path branch, an
   * empty alternative branch opens beside it */
  forkSelection(): void
  asideSelection(): void
  deleteSelection(): void
  /** replace the single selected stage with its steps, spliced into the
   * parent list in place — remove the container but KEEP its children on the
   * road (the "promote children" answer to a container delete) */
  promoteSelection(): void
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
  canAside: boolean
  canOptional: boolean
  canIndent: boolean
  canDelete: boolean
  /** exactly one stage is selected — a container whose children can be promoted */
  canPromote: boolean
}

export function useAuthorDraft(initial: Stop[] = []): AuthorState {
  const [stops, setStops] = useState<Stop[]>(initial)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [caret, setCaret] = useState<Path | null>(null)
  const stageSeq = useRef(0)
  const forkSeq = useRef(0)

  const commit = (next: Stop[]) => {
    setStops(next)
    setSelected(new Set())
    setCaret(null)
  }

  const run = contiguousRun(selected)
  const runList = run ? stopAtList(stops, run.parent) : null
  const runStops = run && runList ? runList.slice(run.from, run.to + 1) : null
  const runParentStop = run && run.parent.length > 0 ? stopAt(stops, run.parent) : undefined

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
      const key = `draft-${stageSeq.current++}`
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
      const key = `fork-${forkSeq.current++}`
      commit(
        rebuildListAt(stops, run.parent, (list) => [
          ...list.slice(0, run.from),
          {
            kind: 'fork',
            key,
            question: 'which way here?',
            branches: [
              { label: 'main path', steps: list.slice(run.from, run.to + 1) },
              { label: 'alternative', steps: [] },
            ],
          } as ForkStop,
          ...list.slice(run.to + 1),
        ]),
      )
    },
    asideSelection: () => {
      if (!run || runParentStop?.kind !== 'stage') return
      const slice = runStops ?? []
      if (!slice.every((s): s is VisitStop => s.kind === 'visit')) return
      const aside: Aside = { title: 'related — beside the steps', steps: slice }
      commit(
        mapStopAt(stops, run.parent, (st) =>
          st.kind !== 'stage'
            ? st
            : {
                ...st,
                steps: st.steps.filter((_, j) => j < run.from || j > run.to),
                asides: [...(st.asides ?? []), aside],
              },
        ),
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
      const branch: Branch = { label: 'another way', steps: [] }
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
    canAside: runParentStop?.kind === 'stage' && !!runStops && runStops.every((s) => s.kind === 'visit'),
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
