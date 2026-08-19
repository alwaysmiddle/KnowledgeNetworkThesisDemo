import { useRef } from 'react'
import type { CSSProperties, ElementType, PointerEvent, ReactNode, Ref } from 'react'
import { PaneHeader, PaneFrameContext } from './PaneHeader'

/** How far a scrolling body holds off the pane's edge, so the scrollbar's end
 *  arrows clear the `--radius-lg` corners instead of being clipped by them. One
 *  inset serves both axes AND BOTH ENDS — a scroller reserves an arrow square at
 *  each end of its gutter, and a pane has a rounded corner at each end of its
 *  right edge. It was bottom-only until 2026-08-17f, which left the top arrow
 *  inside the top corner's arc: total overlap in a pane with no header (the
 *  scroller starts 1px down against a 20px arc), ~2px in one with a legend, whose
 *  11px hat is not enough on its own. Insetting from the header rather than
 *  computing `radius − headerHeight` keeps it one number and stops the two
 *  coupling.
 *
 *  Exported for the rare pane that builds its own body (`scroll="none"`), so the
 *  number still lives in exactly one place. Prefer `PaneScroller`, which applies
 *  it for you. */
export const SCROLLER_INSET = 12

export interface PaneScrollerProps {
  /** which axis scrolls; the other is hidden. Default `y` */
  axis?: 'y' | 'x' | 'both'
  /** the caller's padding and gaps. Not the inset or the overflow: those are the
   *  component's */
  style?: CSSProperties
  /** ref to the scrolling element, for scroll restoration and the like */
  forwardRef?: Ref<HTMLDivElement>
  /** the column's content */
  children?: ReactNode
}

/** ONE SCROLLING COLUMN of a pane's body, for the `scroll="none"` case — a body
 *  split into columns that scroll separately, which is the only reason a caller
 *  ever owns the body. It carries the inset, so "a `none` body that scrolls MUST
 *  apply SCROLLER_INSET itself" stops being something to remember. `Pane`'s own
 *  body IS this component, so there is one implementation rather than two that can
 *  drift.
 *
 *  A fixed-width scrolling column passes `flex: 'none'` with its width in `style`,
 *  since this sets `flex: 1`.
 *
 *  Typed port of the DS Pane.jsx (contract: Pane.d.ts). */
export function PaneScroller({ axis = 'y', style, forwardRef, children }: PaneScrollerProps) {
  return (
    <div
      ref={forwardRef}
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: axis === 'x' ? 'hidden' : 'auto',
        overflowX: axis === 'y' ? 'hidden' : 'auto',
        /* both ends: not a radius on the scroller — the pane's own paper fills the strip */
        marginTop: SCROLLER_INSET,
        marginBottom: SCROLLER_INSET,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** The instrument pane, whole: the frame, its hat, and the body between them.
 *
 *  It exists because `PaneHeader` alone could not enforce the three rules its own
 *  geometry depends on — the legend is 11px tall against a 20px corner arc, so the
 *  box around it is not incidental. Every caller was rebuilding that box, and two
 *  of them got it wrong the same way: a body painting its own background starts
 *  INSIDE the corner arc with square corners and bites two square notches out of
 *  the pane's rounded top; a scroller with no inset has an end arrow clipped by the
 *  same arc, at whichever end it was forgotten. Here there is no body div for a
 *  caller to give a background to, and the inset is not optional.
 *
 *  What it guarantees, so a caller cannot get it wrong:
 *
 *   1. The frame is `--surface-paper`, `--radius-lg`, a `--border-frame` hairline
 *      and `position: relative`. `overflow` stays VISIBLE — the close control's
 *      notch and any menu a body opens have to leave the frame. A pane that
 *      genuinely must clip rounds all four corners, never the bottom two alone.
 *   2. THE BODY TAKES NO BACKGROUND. There is no body element left to give one to.
 *   3. A scrolling body insets itself `SCROLLER_INSET` from the top AND the bottom.
 *
 *  The frame is handed to `PaneHeader` through `PaneFrameContext`, so the header
 *  knows which element to watch for the pointer without walking the DOM. That used
 *  to be a `parentElement` walk, and "PaneHeader must be a direct child" was a rule
 *  a wrapper div could break in silence. Inside a `Pane` there is no such rule.
 *
 *  A FLOATING PANE is this component with `grabbable`, not a hand-written frame:
 *  both props pass straight through to `PaneHeader`, which supplies the grab
 *  cursor, `touch-action` and `user-select` and leaves the moving to the host.
 *
 *  Typed port of the DS Pane.jsx (contract: Pane.d.ts). */
export interface PaneProps {
  /** the pane's name. A pane carries a title and nothing else: no subtitle, no
   *  description, no contract line */
  title: string
  /** an optional Unicode mark from the house set */
  glyph?: string
  /** shows the close control on the frame. It arrives with the pointer and recedes
   *  on the scrollbar's clock */
  onClose?: () => void
  /** pane-scoped controls beside the title. The legend slot is 18px tall —
   *  icon-height only, and built from `IconButton` rather than by hand */
  actions?: ReactNode
  /** the colour the legend masks the border with; defaults to the desk. Pass the
   *  real surface if a pane ever sits on something other than `--surface-canopy` */
  legendBg?: string
  /** `legend` (default) or the older filled `bar` title row */
  variant?: 'legend' | 'bar'
  /** makes the title a drag handle — passes straight through to `PaneHeader` */
  grabbable?: boolean
  /** fires on pointer-down on the title; begin the host's gesture here */
  onGrabStart?: (e: PointerEvent<HTMLElement>) => void
  /** which axis the body scrolls. `none` renders `children` as direct children of
   *  the frame and hands the whole body back to the caller — for a pane whose body
   *  is split into columns that scroll separately. Wrap each scrolling column in
   *  `PaneScroller`, which carries the inset; a raw `overflow: auto` here has its
   *  end arrow clipped by the corner */
  scroll?: 'y' | 'x' | 'both' | 'none'
  /** the frame element; `section` by default, `aside` for a palette or sidebar */
  as?: ElementType
  /** merged into the frame — for the caller's own SIZE and place in its parent's
   *  flex (`flex: '0 0 var(--tree-w)'`, a fixed height). Not for the surface, the
   *  radius or the border: those are the pane's */
  style?: CSSProperties
  /** merged into the body — padding, and gap for a body that is itself a flex
   *  column. Not `background`, and not `marginBottom` */
  bodyStyle?: CSSProperties
  /** ref to the scrolling body */
  bodyRef?: Ref<HTMLDivElement>
  /** the pane's body. Direct children of the frame when `scroll="none"`, otherwise
   *  the contents of the `PaneScroller` this renders */
  children?: ReactNode
}

export function Pane({
  title, glyph, onClose, actions, legendBg, variant, grabbable, onGrabStart,
  scroll = 'y', as, style, bodyStyle, bodyRef, children,
}: PaneProps) {
  const Frame = (as || 'section') as ElementType
  const frameRef = useRef<HTMLElement | null>(null)
  return (
    <Frame
      ref={frameRef}
      style={{
        position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, minHeight: 0,
        background: 'var(--surface-paper)',
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-frame)',
        /* visible, not hidden: the close control's notch and any menu a body opens
           have to leave the frame. A pane that must clip rounds all four corners. */
        overflow: 'visible',
        ...style,
      }}
    >
      <PaneFrameContext.Provider value={frameRef}>
        <PaneHeader
          title={title} glyph={glyph} onClose={onClose} actions={actions}
          variant={variant} legendBg={legendBg}
          grabbable={grabbable} onGrabStart={onGrabStart}
        />
        {scroll === 'none' ? children : (
          <PaneScroller axis={scroll} forwardRef={bodyRef} style={bodyStyle}>{children}</PaneScroller>
        )}
      </PaneFrameContext.Provider>
    </Frame>
  )
}
