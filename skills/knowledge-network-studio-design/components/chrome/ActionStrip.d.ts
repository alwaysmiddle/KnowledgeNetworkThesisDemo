/**
 * Docked selection actions at the foot of an authoring pane, with an optional
 * prompt area for decisions that need full sentences (container delete).
 * @startingPoint section="Chrome" subtitle="Docked selection actions" viewport="700x200"
 */
export interface ActionStripProps {
  /** how many blocks are selected */
  count: number
  /** the action buttons */
  children?: React.ReactNode
  /** a decision to resolve — rendered below the actions, in the same dock */
  prompt?: React.ReactNode
}
export declare function ActionStrip(props: ActionStripProps): JSX.Element
export declare function ActionChoice(props: { children?: React.ReactNode; danger?: boolean; onClick?: (e: React.MouseEvent) => void }): JSX.Element
