import { domainOf } from '../corpus/graph'
import type { DomainCode } from '../ds/graph/vocab'

/** The corpus and the Design System name the same six domains, but they arrive
 *  at the name differently: `domainOf(id)` walks up to the depth-1 ancestor and
 *  returns its NODE ID, typed `string`, while every DS component that wears a
 *  domain (DomainDot, TrailChip, DocHeader, AppHeader, TreeRow) is typed against
 *  the six-member union `DomainCode`.
 *
 *  They agree today because the six top-level corpus ids ARE the six codes. That
 *  is a real coupling and it was previously invisible — each call site would have
 *  cast on its own, and the day someone renamed a domain node the casts would all
 *  have kept compiling and started painting fallback grey. So the narrowing lives
 *  here, once, and domaincode.test.ts asserts the two vocabularies still match. */
export function domainCodeOf(id: string): DomainCode {
  // safe by the invariant the test guards; an id that somehow escapes it lands on
  // DomainDot's own `--swatch-anchor-fallback` rather than painting nothing, which
  // is the DS's designed behaviour for an unknown domain
  return domainOf(id) as DomainCode
}
