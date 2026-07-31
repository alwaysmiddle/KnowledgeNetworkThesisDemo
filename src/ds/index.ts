// The DS component barrel — the ONE import surface for design-system
// components. Consumers import from '@/ds', never from a component's internal
// path (#61's no-restricted-imports will enforce this).
//
// These are typed ports of the KnowledgeNetwork Design System's components/**;
// the tokens they consume are vendored in src/tokens/ (#60). This barrel grows
// per migration step: graph now (#62), nav (#63), chrome/doc/sidebar (#64).

export { NodeChip } from './graph/NodeChip'
export type { NodeChipProps } from './graph/NodeChip'
export { DomainDot } from './graph/DomainDot'
export type { DomainDotProps } from './graph/DomainDot'
export { EdgeLegend } from './graph/EdgeLegend'
export type { EdgeLegendProps } from './graph/EdgeLegend'
export type { DomainCode, EdgeKind } from './graph/vocab'
