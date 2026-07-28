/**
 * The branch decision on a container with two or more variants: a question line,
 * one tab per branch with its step count, and a ghost line for what is hidden.
 * @startingPoint section="Road" subtitle="Branch chooser with visible cost" viewport="700x200"
 */
export interface ForkVariant {
  label: string
  /** leaf visits this branch contributes — shown on the tab */
  count: number
}
export interface ForkSwitchProps {
  /** the question the tabs answer */
  question?: string
  variants: ForkVariant[]
  /** index of the branch currently on the road */
  chosen: number
  /** clicking a tab picks it. Focusing a label must not. */
  onPick?: (index: number) => void
  onQuestion?: (value: string) => void
  onRelabel?: (index: number, value: string) => void
}
export declare function ForkSwitch(props: ForkSwitchProps): JSX.Element
