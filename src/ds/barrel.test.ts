import { describe, expect, it } from 'vitest'

import { EdgeDash, EdgeEntry, EdgeLegend, LeafMark } from '@/ds'

// These components are exported from @/ds but have no direct importer outside
// src/ds/ — ported, but not yet adopted by the app. The list is explicit here
// so that consuming one, or adding a new unconsumed port, requires a deliberate
// edit rather than a quiet audit miss.
//
// To adopt one: import it from '@/ds' in app code and remove it from these
// imports. To add a new unconsumed port: import it here and note why it waits.
//
// Not listed (rendered, but only via a parent DS component):
//   NodeChain  — inside VersionedGroup (consumed by AuthorRoad)
//   NodeArrow  — inside NodeChain
//   BinMark    — inside PresetButton (consumed by StudioView)
describe('ported but not adopted DS components', () => {
  it('EdgeLegend — waiting on #69 (strokes + key must re-tint together)', () => {
    expect(typeof EdgeLegend).toBe('function')
  })

  it('EdgeDash — waiting on #69 (used inside EdgeLegend only)', () => {
    expect(typeof EdgeDash).toBe('function')
  })

  it('EdgeEntry — waiting on #87', () => {
    expect(typeof EdgeEntry).toBe('function')
  })

  it('LeafMark — waiting on #89', () => {
    expect(typeof LeafMark).toBe('function')
  })
})
