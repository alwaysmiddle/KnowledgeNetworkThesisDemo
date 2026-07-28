/**
 * A collapsed container — raised like a stop, with stacked well-tinted
 * silhouettes behind it so it still reads as holding a road.
 * @startingPoint section="Road" subtitle="A group folded back into a node" viewport="700x160"
 */
export interface CollapsedStopProps {
  title: string
  /** the depth it sits at — drives the tint of the stacked silhouettes */
  depth?: number
  /** leaf visits inside (visitCount) */
  count?: number
  fork?: boolean
  optional?: boolean
  selected?: boolean
  linked?: boolean
  offRoad?: boolean
  dropInside?: boolean
  onToggle?: (e: React.MouseEvent) => void
  onClick?: (e: React.MouseEvent) => void
  onPointerDown?: (e: React.PointerEvent) => void
  onMenu?: (e: React.MouseEvent) => void
  width?: number | string
  style?: React.CSSProperties
}
export declare function CollapsedStop(props: CollapsedStopProps): JSX.Element
