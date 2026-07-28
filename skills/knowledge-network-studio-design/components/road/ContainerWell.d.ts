/**
 * An open container: a group of stops that is itself a node. Recessed surface,
 * tint stepping with depth — the primary containment signal in the Studio.
 * @startingPoint section="Road" subtitle="Nested groups as recessed wells" viewport="700x300"
 */
export interface ContainerWellProps {
  title: string
  /** nesting depth, 1-based; tint clamps at 4 and depth is carried by shadow */
  depth?: number
  /** leaf visits under this container (visitCount) */
  count?: number
  /** two or more variants — shows the ⥂ mark */
  fork?: boolean
  optional?: boolean
  selected?: boolean
  linked?: boolean
  offRoad?: boolean
  /** a drag is hovering the inside band — green ring */
  dropInside?: boolean
  /** extra header rows below the title (e.g. <ForkSwitch/>) */
  header?: React.ReactNode
  children?: React.ReactNode
  onHeaderPointerDown?: (e: React.PointerEvent) => void
  onClick?: (e: React.MouseEvent) => void
  onToggle?: (e: React.MouseEvent) => void
  onMenu?: (e: React.MouseEvent) => void
  style?: React.CSSProperties
}
export declare function ContainerWell(props: ContainerWellProps): JSX.Element
export declare function EmptyBody(props: { label?: string }): JSX.Element
export declare function wellTint(depth: number): string
