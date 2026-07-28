/**
 * Header for any Studio instrument pane.
 */
export interface PaneHeaderProps {
  title: string
  /** one plain line stating what the pane is for */
  subtitle?: string
  /** controls row (ToggleButtons) */
  children?: React.ReactNode
}
export declare function PaneHeader(props: PaneHeaderProps): JSX.Element
