/**
 * A corpus node (or a collapsed group placeholder) as a chip — the projected
 * route's unit. Narrow by design: the rail truncates rather than scrolls.
 */
export interface NodeChipProps {
  title: string
  domainColor?: string
  /** off the resolved road */
  dim?: boolean
  /** lit by hover correspondence with the road */
  linked?: boolean
  /** render as a collapsed-group placeholder (⊞, dashed, well-tinted) */
  group?: boolean
  /** visit count, groups only */
  count?: number
  onPointerEnter?: (e: React.PointerEvent) => void
  onPointerLeave?: (e: React.PointerEvent) => void
}
export declare function NodeChip(props: NodeChipProps): JSX.Element
