/**
 * The single insertion caret, plus the SVG road strokes it competes with for
 * attention. Amber is reserved for the road and for where a drop will land.
 */
export interface DropLineProps {
  width?: number | string
  style?: React.CSSProperties
}
export declare function DropLine(props: DropLineProps): JSX.Element
export declare function RoadArrow(props: { x: number; y1: number; y2: number; live?: boolean }): JSX.Element
export declare function BypassRail(props: { d: string; live?: boolean }): JSX.Element
