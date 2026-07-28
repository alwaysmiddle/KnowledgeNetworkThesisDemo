/**
 * A leaf stop on the road: the walk's smallest unit, bound to one corpus node.
 * Raised card silhouette — the counterpart to ContainerWell's recess.
 * @startingPoint section="Road" subtitle="Leaf stop in every state" viewport="700x220"
 */
export interface StopPillProps {
  title: string
  /** the node's domain colour — DOMAIN_COLOR[domainOf(id)] */
  domainColor?: string
  /** position on the resolved road; omit when off-road */
  order?: number
  optional?: boolean
  revisit?: boolean
  selected?: boolean
  /** lit by hover correspondence from another pane */
  linked?: boolean
  /** dimmed: skipped optional, or inside an unchosen variant */
  offRoad?: boolean
  dragging?: boolean
  onMenu?: (e: React.MouseEvent) => void
  onClick?: (e: React.MouseEvent) => void
  onPointerDown?: (e: React.PointerEvent) => void
  width?: number | string
  style?: React.CSSProperties
}
export declare function StopPill(props: StopPillProps): JSX.Element
export declare function BlockMenu(props: { onMenu?: (e: React.MouseEvent) => void }): JSX.Element
