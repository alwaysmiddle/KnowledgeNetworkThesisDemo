// Lens and curriculum. lens.ts's header makes a strong claim — "One BFS, two
// readings" — and the teaching half of the whole thesis rests on the second
// one: a topological order of a node's prerequisite cone IS a lesson sequence.
// If curriculum() ever emitted a node before something it depends on, the
// "★ teach me this" button would be quietly teaching backwards, and nothing
// on screen would look wrong.

import { describe, expect, test } from 'vitest'

import { edges, topicIds } from '../corpus/graph'
import type { EdgeType } from '../corpus/graph'
import { curriculum, lensModel } from './lens'

const TYPES: EdgeType[] = ['depends_on', 'uses', 'see_also', 'implemented_with']
// the corpus's richest builds-on cone, plus a spread of shapes: a source with
// no prerequisites, a mid-ladder node, a hub
const GOALS = ['cry-tls-certificates', 'dm-propositional-logic', 'alg-graph-traversal', 'auto-deployment-monitoring', 'os-virtual-memory']

/** direct `type` prerequisites of `id` — what curriculum must place BEFORE it */
const prereqs = (id: string, type: EdgeType) => edges.filter((e) => e.type === type && e.source === id).map((e) => e.target)

describe('curriculum is a topological order of the prerequisite cone', () => {
  test.each(GOALS)('nothing is taught before its prerequisites — %s', (goal) => {
    const c = curriculum(goal, 'depends_on', 3)
    expect(c.hadCycle).toBe(false) // the corpus guards depends_on as a DAG
    const pos = new Map(c.order.map((id, i) => [id, i]))
    for (const id of c.order) {
      for (const p of prereqs(id, 'depends_on')) {
        if (!pos.has(p)) continue // outside the depth-limited cone — fine
        expect(pos.get(p)!, `${p} must be taught before ${id}`).toBeLessThan(pos.get(id)!)
      }
    }
  })

  test.each(GOALS)('the cone is covered exactly once and ends at the goal — %s', (goal) => {
    const c = curriculum(goal, 'depends_on', 3)
    expect(new Set(c.order).size).toBe(c.order.length)
    expect(c.order).toContain(goal)
    expect(c.order[c.order.length - 1]).toBe(goal) // acyclic ⇒ the goal is last

    // the order is precisely {goal} ∪ its out-cone at this depth — no extras,
    // no omissions. lensModel walks the same BFS, so it is the reference.
    const cone = new Set([goal, ...lensModel(goal, 'depends_on', 3).out.levels.flat()])
    expect(new Set(c.order)).toEqual(cone)
  })

  test('a goal with no prerequisites is a one-step curriculum', () => {
    const c = curriculum('dm-propositional-logic', 'depends_on', 3)
    expect(c.order).toEqual(['dm-propositional-logic'])
  })

  test('curriculum is deterministic — the same goal always teaches the same way', () => {
    for (const g of GOALS) {
      expect(curriculum(g, 'depends_on', 3).order).toEqual(curriculum(g, 'depends_on', 3).order)
    }
  })
})

describe('lensModel — "what is true from here", one relation, both directions', () => {
  test.each(TYPES)('%s: the focus is never in its own cone, and levels are disjoint', (type) => {
    for (const focus of topicIds) {
      const m = lensModel(focus, type, 2)
      for (const side of [m.out, m.in]) {
        const seen = new Set<string>()
        for (const level of side.levels) {
          for (const id of level) {
            expect(id, `${focus} appears in its own ${type} cone`).not.toBe(focus)
            expect(seen.has(id), `${id} appears at two depths from ${focus}`).toBe(false)
            seen.add(id)
          }
        }
      }
    }
  })

  test('out and in are genuinely opposite directions', () => {
    // X in focus's OUT cone at depth 1 ⟺ focus in X's IN cone at depth 1.
    // The two adjacency maps are built from one edge list, so this is really a
    // check that neither got its endpoints flipped.
    for (const focus of topicIds) {
      for (const x of lensModel(focus, 'depends_on', 1).out.levels[0] ?? []) {
        expect(lensModel(x, 'depends_on', 1).in.levels[0] ?? []).toContain(focus)
      }
    }
  })

  test('depth 1 is exactly the direct neighbours', () => {
    for (const focus of topicIds) {
      const direct = new Set(edges.filter((e) => e.type === 'depends_on' && e.source === focus).map((e) => e.target))
      expect(new Set(lensModel(focus, 'depends_on', 1).out.levels[0] ?? [])).toEqual(direct)
    }
  })

  test('the frontier counts real onward links, not links already shown', () => {
    // "⤳ 6 more" has to mean six things you cannot see. If the frontier counted
    // edges back into the cone, the badge would promise depth that is already
    // on screen.
    for (const focus of ['cry-tls-certificates', 'alg-graph-traversal', 'os-virtual-memory']) {
      const m = lensModel(focus, 'depends_on', 2)
      const shown = new Set([focus, ...m.out.levels.flat()])
      for (const [id, n] of Object.entries(m.out.frontier)) {
        const onward = edges.filter((e) => e.type === 'depends_on' && e.source === id && !shown.has(e.target))
        expect(onward.length, `${id}'s frontier badge`).toBe(n)
        expect(n).toBeGreaterThan(0) // a zero badge should not be rendered at all
      }
    }
  })

  test('induced edges connect only nodes the cone actually shows', () => {
    for (const focus of ['cry-tls-certificates', 'web-http-rest']) {
      const m = lensModel(focus, 'uses', 2)
      for (const side of [m.out, m.in]) {
        const shown = new Set([focus, ...side.levels.flat()])
        for (const e of side.edges) {
          expect(shown.has(e.from), e.from).toBe(true)
          expect(shown.has(e.to), e.to).toBe(true)
        }
      }
    }
  })
})
