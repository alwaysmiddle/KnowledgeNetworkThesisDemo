// The authoring draft state (round 3) — the walk tree ITSELF as mutable
// state, plus a block selection and an insertion caret. This is the third
// state shape of the spike: viewing wants a drill-path (E) or an expansion
// set (old C); authoring edits the tree and shows everything open. All three
// project to the same flat route via fringe(), which is the point.
//
// Blocks are addressed by INDEX PATHS into the draft's stops — [1, 0, 2] is
// "third step of the first step of the second stop". Every op is a pure
// rebuild; selection is cleared after any structural change so no stale path
// can dangle.

import { useRef, useState } from 'react'

import type { Aside, StageStop, Stop, VisitStop } from './mockwalk'

export type Path = number[]

export const pathKey = (p: Path) => 'b.' + p.join('.')
export const parsePath = (key: string): Path =>
  key === 'b.' ? [] : key.slice(2).split('.').map(Number)

export function stopAt(stops: Stop[], path: Path): Stop | undefined {
  const [i, ...rest] = path
  const s = stops[i]
  if (!s || rest.length === 0) return s
  return s.kind === 'stage' ? stopAt(s.steps, rest) : undefined
}

function insertAt(stops: Stop[], path: Path, stop: Stop): Stop[] {
  const [i, ...rest] = path
  if (rest.length === 0) return [...stops.slice(0, i), stop, ...stops.slice(i)]
  return stops.map((s, j) => (j === i && s.kind === 'stage' ? { ...s, steps: insertAt(s.steps, rest, stop) } : s))
}

function removeAt(stops: Stop[], path: Path): { rest: Stop[]; removed?: Stop } {
  const [i, ...more] = path
  if (more.length === 0) return { rest: stops.filter((_, j) => j !== i), removed: stops[i] }
  let removed: Stop | undefined
  const rest = stops.map((s, j) => {
    if (j !== i || s.kind !== 'stage') return s
    const r = removeAt(s.steps, more)
    removed = r.removed
    return { ...s, steps: r.rest }
  })
  return { rest, removed }
}

/** rebuild the stage at `path` through `f` */
function mapStage(stops: Stop[], path: Path, f: (s: StageStop) => StageStop): Stop[] {
  const [i, ...rest] = path
  return stops.map((s, j) => {
    if (j !== i || s.kind !== 'stage') return s
    return rest.length ? { ...s, steps: mapStage(s.steps, rest, f) } : f(s)
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
    for (const s of list)
      if (s.kind === 'stage') {
        keys.add(s.key)
        walk(s.steps)
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
  asideSelection(): void
  deleteSelection(): void
  /** Tab — move the single selected block into the stage right above it */
  indentSelection(): void
  retitle(key: string, title: string): void
  canGroup: boolean
  canAside: boolean
  canIndent: boolean
  canDelete: boolean
}

export function useAuthorDraft(): AuthorState {
  const [stops, setStops] = useState<Stop[]>([])
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [caret, setCaret] = useState<Path | null>(null)
  const stageSeq = useRef(0)

  const commit = (next: Stop[]) => {
    setStops(next)
    setSelected(new Set())
    setCaret(null)
  }

  const run = contiguousRun(selected)
  const runList = run ? stopAtList(stops, run.parent) : null
  const runStops = run && runList ? runList.slice(run.from, run.to + 1) : null

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
      const title = 'name this stage'
      const key = `draft-${stageSeq.current++}`
      commit(
        replaceRange(stops, run.parent, run.from, run.to, (slice) => [
          { kind: 'stage', key, title, steps: slice } as StageStop,
        ]),
      )
    },
    asideSelection: () => {
      if (!run || run.parent.length === 0) return
      const list = stopAtList(stops, run.parent) ?? []
      const slice = list.slice(run.from, run.to + 1)
      if (!slice.every((s): s is VisitStop => s.kind === 'visit')) return
      const aside: Aside = { title: 'related — beside the steps', steps: slice }
      commit(
        mapStage(stops, run.parent, (st) => ({
          ...st,
          steps: st.steps.filter((_, j) => j < run.from || j > run.to),
          asides: [...(st.asides ?? []), aside],
        })),
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
    indentSelection: () => {
      if (!single || prevSibling?.kind !== 'stage') return
      const idx = single[single.length - 1]
      const { rest, removed } = removeAt(stops, single)
      if (!removed) return
      commit(insertAt(rest, [...single.slice(0, -1), idx - 1, prevSibling.steps.length], removed))
    },
    retitle: (key, title) => {
      const walk = (list: Stop[]): Stop[] =>
        list.map((s) => (s.kind === 'stage' ? (s.key === key ? { ...s, title } : { ...s, steps: walk(s.steps) }) : s))
      setStops(walk(stops))
    },
    canGroup: !!run,
    canAside: !!run && run.parent.length > 0 && !!runStops && runStops.every((s) => s.kind === 'visit'),
    canIndent: prevSibling?.kind === 'stage',
    canDelete: selected.size > 0,
  }
}

/** the sibling list a parent path addresses (root list for []) */
function stopAtList(stops: Stop[], parent: Path): Stop[] | null {
  if (parent.length === 0) return stops
  const s = stopAt(stops, parent)
  return s?.kind === 'stage' ? s.steps : null
}

function replaceRange(stops: Stop[], parent: Path, from: number, to: number, make: (slice: Stop[]) => Stop[]): Stop[] {
  if (parent.length === 0) return [...stops.slice(0, from), ...make(stops.slice(from, to + 1)), ...stops.slice(to + 1)]
  const [i, ...rest] = parent
  return stops.map((s, j) =>
    j === i && s.kind === 'stage' ? { ...s, steps: replaceRange(s.steps, rest, from, to, make) } : s,
  )
}

/** document order: shorter shared-prefix path first, then by index */
function compareDoc(a: Path, b: Path): number {
  const n = Math.min(a.length, b.length)
  for (let k = 0; k < n; k++) if (a[k] !== b[k]) return a[k] - b[k]
  return a.length - b.length
}
