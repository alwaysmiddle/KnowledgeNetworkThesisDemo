// The graph vocabulary the DS components are typed against: the six domain
// slots and the four authored relations. Not the saturated `-raw` source
// values — adopting these components re-tints hue to the muted palette on
// purpose (#62). To preserve the old saturated look, a caller would point
// these at the `-raw` tokens instead.
//
// OB-060 (2026-08-22): DOMAIN_TOKEN now points at ring slots (var(--hue-*))
// directly rather than at var(--domain-*) — matching the DS's own DomainDot.jsx,
// which the six domain codes are an EXAMPLE assignment of, not the palette
// itself. var(--domain-*) still exists in tokens/colors.css (pointing at the
// same ring slots) for anything matching the DS's "shipped example palette"
// section by name, but nothing in src/ds should take on a fresh reference to
// it — see src/ds/graph/DomainDot.tsx for the ring (HUE_RING, TOPIC_WALK,
// topicPaint, ...) this map is one worked example of.

export type DomainCode = 'sys' | 'math' | 'cs' | 'net' | 'sec' | 'se'
export type EdgeKind = 'depends_on' | 'uses' | 'see_also' | 'implemented_with'

/** domain → its ring-slot colour token. The DS's own comment on this exact
 *  map: "the app got here first" — DomainDot.jsx names its own copy
 *  DOMAIN_TOKEN to match this one, so a port is an import rather than a
 *  rename (src/ds/graph/DomainDot.tsx does exactly that). */
export const DOMAIN_TOKEN: Record<DomainCode, string> = {
  sys: 'var(--hue-leaf)',
  math: 'var(--hue-violet)',
  cs: 'var(--hue-cobalt)',
  net: 'var(--hue-teal)',
  sec: 'var(--hue-amber)',
  se: 'var(--hue-fern)',
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
