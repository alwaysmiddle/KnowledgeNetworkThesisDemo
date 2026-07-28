/**
 * Fixed-width status slot pinned to the left edge of any road block.
 * Renders the resolved step number, or one shape mark, or nothing — and never
 * an interactive control.
 */
export interface StatusGutterProps {
  /** position on the resolved road; omit for blocks that are off the road */
  order?: number | null
  /** the stop is optional (◇) */
  optional?: boolean
  /** the container offers a choice (⥂) */
  fork?: boolean
  /** this node id already appeared earlier in the walk (↺) */
  revisit?: boolean
  /** 'road' = amber badge (on the road), 'off' = slate badge */
  tone?: 'road' | 'off'
}
export declare function StatusGutter(props: StatusGutterProps): JSX.Element
