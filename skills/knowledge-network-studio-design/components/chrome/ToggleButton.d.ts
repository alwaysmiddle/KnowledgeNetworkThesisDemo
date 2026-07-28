/**
 * Small bordered control used across Studio pane headers.
 */
export interface ToggleButtonProps {
  children?: React.ReactNode
  /** 'warn' = this state changes what the road resolves to */
  tone?: 'neutral' | 'warn'
  active?: boolean
  disabled?: boolean
  onClick?: (e: React.MouseEvent) => void
  title?: string
}
export declare function ToggleButton(props: ToggleButtonProps): JSX.Element
