// The graph vocabulary the DS components are typed against: the six domain
// slots and the four authored relations. The colour maps point at the DS's
// MUTED display tokens (var(--domain-*) / var(--edge-*)), not the saturated
// `-raw` source values — adopting these components re-tints hue to the muted
// palette on purpose (#62). To preserve the old saturated look, a caller would
// point these at the `-raw` tokens instead.

export type DomainCode = 'sys' | 'math' | 'cs' | 'net' | 'sec' | 'se'
export type EdgeKind = 'depends_on' | 'uses' | 'see_also' | 'implemented_with'

/** domain → its muted DS colour token */
export const DOMAIN_TOKEN: Record<DomainCode, string> = {
  sys: 'var(--domain-sys)',
  math: 'var(--domain-math)',
  cs: 'var(--domain-cs)',
  net: 'var(--domain-net)',
  sec: 'var(--domain-sec)',
  se: 'var(--domain-se)',
}

/** edge kind → its muted DS colour token (the same muted palette the EdgeLegend
 *  renders — used where a caller passes an edge colour INTO a DS component, e.g.
 *  a lens row's swatch) */
export const EDGE_TOKEN: Record<EdgeKind, string> = {
  depends_on: 'var(--edge-depends-on)',
  uses: 'var(--edge-uses)',
  see_also: 'var(--edge-see-also)',
  implemented_with: 'var(--edge-implemented-with)',
}
