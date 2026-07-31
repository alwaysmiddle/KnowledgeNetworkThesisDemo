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
