// The DS component barrel — the ONE import surface for design-system
// components. Consumers import from '@/ds', never from a component's internal
// path (#61's no-restricted-imports will enforce this).
//
// These are typed ports of the KnowledgeNetwork Design System's components/**;
// the tokens they consume are vendored in src/tokens/ (#60). This barrel grows
// per migration step: graph now (#62), nav (#63), chrome/doc/sidebar (#64).

export { NodeArrow } from './graph/NodeArrow'
export type { NodeArrowProps } from './graph/NodeArrow'
export { ARROW_METRICS } from './graph/NodeArrow'
export { NodeChip } from './graph/NodeChip'
export type { NodeChipProps } from './graph/NodeChip'
export { NodeChain } from './graph/NodeChain'
export type { NodeChainProps } from './graph/NodeChain'
export { DomainDot } from './graph/DomainDot'
export type { DomainDotProps } from './graph/DomainDot'
export { EdgeLegend, EdgeDash } from './graph/EdgeLegend'
export type { EdgeLegendProps, EdgeDashProps } from './graph/EdgeLegend'
export { EdgeEntry } from './graph/EdgeEntry'
export type { EdgeEntryProps } from './graph/EdgeEntry'
export type { DomainCode, EdgeKind } from './graph/vocab'
export { DOMAIN_TOKEN, EDGE_TOKEN } from './graph/vocab'

export { TreeRow } from './nav/TreeRow'
export type { TreeRowProps } from './nav/TreeRow'
export { TrailChip } from './nav/TrailChip'
export type { TrailChipProps } from './nav/TrailChip'
export { StepDot } from './nav/StepDot'
export type { StepDotProps } from './nav/StepDot'
export { WalkCard } from './nav/WalkCard'
export type { WalkCardProps } from './nav/WalkCard'

export { DocHeader } from './doc/DocHeader'
export type { DocHeaderProps } from './doc/DocHeader'
export { SectionLabel } from './doc/SectionLabel'
export type { SectionLabelProps } from './doc/SectionLabel'

export { PresetButton } from './sidebar/PresetButton'
export type { PresetButtonProps } from './sidebar/PresetButton'
export { InstrumentRow } from './sidebar/InstrumentRow'
export type { InstrumentRowProps } from './sidebar/InstrumentRow'
export { BinMark } from './sidebar/BinMark'
export type { BinMarkProps } from './sidebar/BinMark'
export { InstrumentGroup, FamilyColumn } from './sidebar/InstrumentGroup'
export type { InstrumentGroupProps } from './sidebar/InstrumentGroup'

export { PillButton } from './chrome/PillButton'
export type { PillButtonProps } from './chrome/PillButton'
export { CountBadge } from './chrome/CountBadge'
export type { CountBadgeProps } from './chrome/CountBadge'
export { IconButton, RECEDE_LEAVE_MS, recedeMs, subscribePresence, useClipped, usePresence, useRecede, wrapTip } from './chrome/IconButton'
export type { IconButtonProps, PresenceOptions } from './chrome/IconButton'
export { Pane, PaneScroller, SCROLLER_INSET } from './chrome/Pane'
export type { PaneProps, PaneScrollerProps } from './chrome/Pane'
export { PaneFrameContext } from './chrome/PaneHeader'
export { PaneHeader } from './chrome/PaneHeader'
export type { PaneHeaderProps } from './chrome/PaneHeader'
export { Toolbar } from './chrome/Toolbar'
export type { ToolbarProps, ToolbarItemSpec } from './chrome/Toolbar'
export { AppHeader } from './chrome/AppHeader'
export type { AppHeaderProps } from './chrome/AppHeader'
export { LeafMark } from './chrome/LeafMark'
export type { LeafMarkProps } from './chrome/LeafMark'

export { VersionedGroup, INLINE_EDIT_STYLE } from './group/VersionedGroup'
export type { VersionedGroupProps, GroupVersion } from './group/VersionedGroup'
