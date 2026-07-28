# UI kit — Railroad

The authoring pane of the Studio's Railroad instrument (#21), rebuilt on the
elevation grammar. Single self-contained `index.html` (React + Babel from CDN,
tokens from the project's `styles.css`), so it opens with no build step.

## What is real
- The plan is `PLAN` from `src/instruments/walkdesk/mockwalk.ts`, including the
  sub-walk by reference (`transistor-to-program` from `src/corpus/walks.ts`) and
  the deliberate `stk-tcp-udp` revisit.
- Node titles and domain colours are the authored values from
  `src/corpus/graph.ts` (`topics(container(...))` labels, `DOMAIN_COLOR`).
- Model semantics mirror `mockwalk.ts` exactly: `variants.length` 0 / 1 / 2+ is
  leaf / group / fork; `chosenIdx`, `chosenSteps`, `visitCount` behave the same.

## Two demo additions, flagged
The mock plan authors no fork and no optional stop, so neither state would be
reachable. To exercise them:
- `secure` ("Secure the channel") is given a second variant — **Deep dive** (its
  real three steps) and **Skim** (TLS only) — with a question line.
- `primitives` ("The primitives underneath") is marked `optional`, so the
  optionals toggle in the header visibly changes what the road resolves to.

Neither is a proposal about the content; they exist so the fork switch and the
bypass/dim states can be seen.

## What to try
- Click a stop or a group; shift-click to add. Actions dock at the foot.
- Delete a group → the prompt offers three full-sentence outcomes.
- ▾ / ▸ or double-click a header collapses a group into a node (stacked
  silhouettes behind it) and back.
- Drag any block by its header/pill. The road recedes to 35%; a single amber
  caret shows where it lands; hovering a group's middle band rings it green for
  an inside-drop.
- Hover a stop on either side — the road block and its rail row light together.
  Groups light too, which the as-built rail cannot do.
- Toggle `◇ optionals` and watch both the badges and the rail renumber.
- `route → right` flips which side the rail runs down (DOM order is stable).

## Deliberately not built
Marquee select, keyboard undo/redo shortcuts, inline rename, the palette, and
node binding for unset slots. They are unchanged in intent from the current
implementation and would only add surface area to the comparison.
