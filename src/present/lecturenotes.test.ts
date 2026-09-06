import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addNote, applyDeck, deleteNote, editNote, loadHabits, loadMintedCategories, loadNotebook,
  notebookKey, saveHabits, saveMintedCategories, saveNotebook, serialiseDeck, setPrepared,
} from './lecturenotes'
import type { LectureNotebook } from './lecturenotes'

const book = (over: Partial<LectureNotebook> = {}): LectureNotebook => ({ notes: [], prepared: {}, ...over })
const note = (id: string, text: string, stop = 0) => ({ id, text, stop, when: '00:10', at: 1 })

describe('the notebook is keyed by the walk', () => {
  it('gives a saved walk its own notebook and every draft lecture the same one', () => {
    expect(notebookKey('saved', 'w7')).toBe('pkt.lecture.notes.v1:walk:w7')
    expect(notebookKey('saved', 'w8')).not.toBe(notebookKey('saved', 'w7'))
    expect(notebookKey('draft')).toBe('pkt.lecture.notes.v1:draft')
    // a saved source with no id is still a draft, not a notebook called "walk:null"
    expect(notebookKey('saved', null)).toBe('pkt.lecture.notes.v1:draft')
  })
})

describe('adding, editing and deleting a note', () => {
  it('puts a new note at the front and gives it an id', () => {
    const one = addNote(book(), { text: 'why is this O(n)?', stop: 3, when: '04:12', at: 1000 })
    const two = addNote(one, { text: 'ask about collisions', stop: 4, when: '05:01', at: 2000 })
    expect(two.notes.map((n) => n.text)).toEqual(['ask about collisions', 'why is this O(n)?'])
    expect(two.notes[0].id).toBeTruthy()
    expect(two.notes[0].id).not.toBe(two.notes[1].id)
  })

  it('gives two notes saved in the same millisecond different ids', () => {
    const b = addNote(addNote(book(), { text: 'a', stop: 0, when: '00:01', at: 7 }), { text: 'b', stop: 0, when: '00:01', at: 7 })
    expect(b.notes[0].id).not.toBe(b.notes[1].id)
  })

  it('trims, and refuses a note that is only whitespace', () => {
    expect(addNote(book(), { text: '  spaced  ', stop: 0, when: '00:01', at: 1 }).notes[0].text).toBe('spaced')
    const same = book()
    expect(addNote(same, { text: '   ', stop: 0, when: '00:01', at: 1 })).toBe(same)
  })

  it('edits one note and leaves the rest identical', () => {
    const before = book({ notes: [note('a', 'first'), note('b', 'second')] })
    const after = editNote(before, 'b', ' second, corrected ')
    expect(after.notes[1].text).toBe('second, corrected')
    expect(after.notes[0]).toBe(before.notes[0])
  })

  it('returns the same notebook when an edit changes nothing', () => {
    const before = book({ notes: [note('a', 'first')] })
    expect(editNote(before, 'a', 'first')).toBe(before)
    expect(editNote(before, 'missing', 'anything')).toBe(before)
    expect(editNote(before, 'a', '   ')).toBe(before)
  })

  it('deletes by id, and returns the same notebook for an id that is not there', () => {
    const before = book({ notes: [note('a', 'first'), note('b', 'second')] })
    expect(deleteNote(before, 'a').notes.map((n) => n.id)).toEqual(['b'])
    expect(deleteNote(before, 'c')).toBe(before)
  })
})

describe('a prepared note edited at the lectern', () => {
  it('stores the override against the stop id', () => {
    const after = setPrepared(book(), 'stop-9', '  say it this way instead  ')
    expect(after.prepared['stop-9']).toBe('say it this way instead')
  })

  it('CLEARS the override when emptied, rather than storing a blank one', () => {
    const written = setPrepared(book(), 'stop-9', 'an override')
    const cleared = setPrepared(written, 'stop-9', '   ')
    expect(Object.prototype.hasOwnProperty.call(cleared.prepared, 'stop-9')).toBe(false)
  })

  it('returns the same notebook when nothing moves', () => {
    const written = setPrepared(book(), 'stop-9', 'an override')
    expect(setPrepared(written, 'stop-9', 'an override')).toBe(written)
    expect(setPrepared(written, 'stop-4', '')).toBe(written)
  })
})

describe('the deck layout survives as ids', () => {
  const groups = [
    { label: 'Class controls', actions: [{ id: 'a' }, { id: 'b' }] },
    { label: 'Other actions', actions: [{ id: 'c' }, { id: 'd' }] },
  ]
  const library = [{ id: 'e' }, { id: 'f' }]

  it('writes out what is where', () => {
    expect(serialiseDeck(groups, library)).toEqual({ groups: [['a', 'b'], ['c', 'd']], library: ['e', 'f'] })
  })

  it('puts a swapped-in action back where it was left', () => {
    const out = applyDeck({ groups: [['a', 'e'], ['c', 'd']], library: ['b', 'f'] }, groups, library)
    expect(out.groups[0].actions.map((a) => a.id)).toEqual(['a', 'e'])
    expect(out.groups[0].label).toBe('Class controls')
    expect(out.library.map((a) => a.id)).toEqual(['b', 'f'])
  })

  it('appends an action this release added, rather than losing it', () => {
    const withNew = library.concat([{ id: 'brand-new' }])
    const out = applyDeck({ groups: [['a', 'e'], ['c', 'd']], library: ['b', 'f'] }, groups, withNew)
    expect(out.library.map((a) => a.id)).toEqual(['b', 'f', 'brand-new'])
  })

  it('drops an id that no longer exists by keeping that group as designed', () => {
    const out = applyDeck({ groups: [['a', 'gone'], ['c', 'd']], library: [] }, groups, library)
    expect(out.groups[0].actions.map((a) => a.id)).toEqual(['a', 'b'])
  })

  it('ignores a stored layout whose shape no longer matches the deck', () => {
    expect(applyDeck({ groups: [['a', 'b', 'x']], library: [] }, groups, library).groups).toBe(groups)
    expect(applyDeck(undefined, groups, library).groups).toBe(groups)
  })
})

describe('storage never throws', () => {
  beforeEach(() => { vi.unstubAllGlobals() })

  it('reads an empty notebook when there is no store at all', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadNotebook('k')).toEqual({ notes: [], prepared: {} })
    expect(loadMintedCategories()).toEqual([])
    expect(loadHabits()).toEqual({})
  })

  it('swallows a quota error on write', () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded') } })
    expect(() => saveNotebook('k', book())).not.toThrow()
    expect(() => saveMintedCategories([])).not.toThrow()
    expect(() => saveHabits({ duringWidth: 320 })).not.toThrow()
  })

  it('reads back what it wrote', () => {
    const store: Record<string, string> = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = v },
    })
    saveNotebook('k', book({ notes: [note('a', 'kept')], prepared: { 's1': 'over' } }))
    expect(loadNotebook('k').notes[0].text).toBe('kept')
    expect(loadNotebook('k').prepared.s1).toBe('over')
    saveHabits({ duringWidth: 280, shelfPosition: { x: -12, y: 30 } })
    expect(loadHabits().shelfPosition).toEqual({ x: -12, y: 30 })
  })

  it('repairs a half-shaped stored notebook rather than handing it on', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{"notes":"not an array"}', setItem: () => {} })
    expect(loadNotebook('k')).toEqual({ notes: [], prepared: {} })
    vi.stubGlobal('localStorage', { getItem: () => 'not json at all', setItem: () => {} })
    expect(loadNotebook('k')).toEqual({ notes: [], prepared: {} })
  })
})
