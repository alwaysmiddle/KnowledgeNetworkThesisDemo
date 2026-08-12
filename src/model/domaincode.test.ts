import { describe, expect, it } from 'vitest'

import { domainIds, topicIds } from '../corpus/graph'
import { DOMAIN_TOKEN } from '../ds/graph/vocab'
import { domainCodeOf } from './domaincode'

/** domainCodeOf() narrows a corpus node id to the DS's DomainCode union with a
 *  cast, which is only honest while the two vocabularies actually agree. These
 *  tests are what make that cast safe: they fail the day either side renames a
 *  domain, instead of letting every domain swatch quietly fall back to grey. */
describe('the corpus and the DS name the same six domains', () => {
  const codes = Object.keys(DOMAIN_TOKEN).sort()

  it('the corpus top-level ids ARE the DS domain codes', () => {
    expect([...domainIds].sort()).toEqual(codes)
  })

  it('has exactly six of them, hue-disjoint by design', () => {
    expect(codes).toHaveLength(6)
  })

  it('every topic in the corpus resolves to a code the DS can paint', () => {
    const unpaintable = topicIds.filter((id) => !(domainCodeOf(id) in DOMAIN_TOKEN))
    expect(unpaintable).toEqual([])
  })
})
