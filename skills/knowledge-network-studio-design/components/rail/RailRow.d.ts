/**
 * A row of the projected route (the receipt beside the road).
 * @startingPoint section="Rail" subtitle="Projected route rows" viewport="700x180"
 */
export interface RailRowProps {
  /** resolved step number, or a range ("1–12") for a collapsed group */
  step?: number | string
  title: string
  domainColor?: string
  group?: boolean
  count?: number
  /** this node id appeared earlier in the walk */
  revisit?: boolean
  linked?: boolean
  dim?: boolean
  onPointerEnter?: (e: React.PointerEvent) => void
  onPointerLeave?: (e: React.PointerEvent) => void
}
export declare function RailRow(props: RailRowProps): JSX.Element
