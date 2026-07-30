---
id: 0004
from: code
to: design
date: 2026-07-28
subject: Railroad node states — mock the "V2-NEAT" target (normal / group / fork-with-versions)
needs: decision
---

# Railroad node states — mock the "V2-NEAT" target

First outbound message from our side. It opens a new piece of work, separate
from your open threads `0001`–`0003` (those still want answers; a reply is
coming in its own message).

## The ask, in one line

Design the **visual system for a railroad node in each of its functional
states** — from the hand wireframe below — as a study we can then build. This is
a `needs: decision` message: we want your visual decisions and a mock, not code.

## Where this lives, so the mock is grounded

The **railroad walk** (a.k.a. Walk·Desk) is the authoring instrument in the
Studio. The road is a **single vertical column of nodes**, top to bottom, arrows
between them. One data type describes every node — a `Stop`:

- `variants: Variant[]` where `Variant = { label, steps: Stop[] }`.
- `variants.length === 0` → a **leaf** (a plain step, no children).
- `variants.length === 1` → a **group** (one child route, no choice to make).
- `variants.length >= 2` → a **fork** (several alternative child routes —
  "versions" in the wireframe).

So "node with subnodes" = group or fork; "node with multiple versions" = fork.
The road is *measure-free arithmetic layout* — every size is a constant, not a
measured DOM box (see Constraints below).

Source of the target: **issue #15** ("Walk·Desk visual polish") and its attached
hand wireframe, which is committed next to this message as
`0004-railroad-node-states.wireframe.jpg`. The transcription below is the
authority — read the image for feel, read the text for the spec.

## The four states (transcribed from the wireframe)

The sheet is titled **"V2 — NEAT"** and draws the node in four states.

### 1. Normal node — a leaf

- **Oval / heavily-rounded** box. **Centered** title (`1. Title`, where `1.` is
  the node's order number).
- **No shading.** A close / exit button. **Jiggles on hover / select.**
- This is the visual opposite of a group: round vs square, centered vs
  left-aligned, flat vs shaded.

### 2. Minimized nested node — a group, collapsed

- **Squared** box (square = "has children"). Title **left-aligned** with its
  order number (`1. Title`).
- Header, top-right, three affordances:
  - **`7`** — an *unfilled circle* showing the **count of items inside**.
  - **▢ maximize/restore** — "changes to maximize button" (the minus in the
    expanded state becomes this when collapsed).
  - **✕ close.**
- Hatched right edge. **Jiggles on hover / select.**

### 3. Maximized nested node — a group / fork, expanded  *(the centerpiece)*

- **Squared** box. Left-aligned numbered title, with an **indented** `desc goes
  here` line under it.
- Header, top-right: **`7 | − | X`** — count · **minimize** (`−`, highlights on
  hover) · close. Plus, just under it, a small **Simple / Complex view toggle**
  pill.
- Body: the versions render as **vertical route columns**, side by side (`V1`,
  `V2`, `V3`). Each column is a **rounded rectangle** holding that version's
  mini-route (the same node-and-arrow rendering as the main road — "same design
  as horizontal bar"). Columns **jiggle on hover / select**.
- **Two independent selectors — see the section below, this is the crux.**
  - A **●/○ radio circle at each column's top-left** = which version is
    **active** (the chosen one). Filled ● on the active column, hollow ○ on the
    rest.
  - A **checkbox bar along the bottom** (`☑V1 ☑V2 ☑V3 ☑V4  (＋)`) = which
    versions are **visible** as columns right now.
- **Inactive columns are faded** ("faded out for not being active"); the active
  one is bright/full-strength.
- **Bottom checkbox bar mechanics:**
  - "Ones not selected by this checkbox do **not show** and are faded out" — the
    checkbox governs *visibility*, i.e. which versions get a column.
  - **`(＋)` add-version** button at the end of the bar.
  - A right-side **arrow** scrolls the version namecards when there are too many;
    hidden when not needed. "If too many namecards, display on left of the arrow
    button on the right."
- **Right edge:** a **single scrollbar**, shown *only when needed*; a small
  `▶` scroll control bottom-right; note "3D shading".

### 4. Minimized version card — **DEFERRED, do not mock**

The sheet sketches a stacked/minimized form of individual version cards, but it
is annotated **"PP said to ✗ not make this feature for now."** Out of scope for
this pass — noted only so you know why the wireframe shows more than we're
asking for.

## The one load-bearing functional change: **visibility vs active**

Everything else on the sheet is shape and finish. This one is a real mechanic,
and it's new:

- **Visibility** — the **bottom checkboxes** — is a **multi-select**: *which
  versions am I comparing right now.* A version can be visible-but-not-active.
- **Active** — the **●/○ per column** — is a **single-select**: *which version
  is the chosen road.*

Today these are collapsed into one thing (see below). The wireframe splits them.
For the mock, please show all the resulting visual states clearly:

- a column that is **visible + active** (bright, ● filled),
- a column that is **visible + inactive** (faded, ○ hollow),
- a version that is **hidden** (unchecked in the bar — represented only by its
  checkbox namecard, no column),
- and the **empty** case (a version with no steps yet).

## Current reality you're replacing (so the mock is a real delta)

The fork today already renders **routes as side-by-side columns**, collapsed by
default behind a **`+k ▾` fan badge**; fanning shows *all* versions at once, and
the single chosen column is the bright road while the rest are dimmed. What the
wireframe **adds** on top of that:

1. the **visibility checkbox bar** (today fanning is all-or-nothing — no
   per-version show/hide),
2. the **●/○ active selector as a distinct control** from visibility,
3. distinct **node shapes by function** (oval leaf / square group) and the
   **header chrome** (count · minimize/maximize · close · simple-complex toggle),
4. **empty states in grey.**

Heads-up on timing: this comparator work is **uncommitted on `feat/fork-comparator`
as of this message**, so a `git checkout` at the sha below will *not* show it.
Design to the wireframe target, not to the current file.

## Right pane (from #15, not drawn on this sheet)

The linear pane on the right becomes a **toggle**: a *linear/presentation* view
vs an *editing* view — the "simple / complex view" duo. A presentation-mode
preview is the goal for the linear side. Mock the toggle and both faces if you
have room; the node states above are the priority.

## Constraints / the coupling that must not drift

The road is arithmetic, so its **constants *are* the layout**. Your spacing
tokens must equal these `const`s in `src/instruments/walkdesk/AuthorRoad.tsx`
(and `RAIL_W` in `RailroadView.tsx`) — a token that disagrees is a wrong drawing
of a right screen:

| const | value | meaning |
| --- | --- | --- |
| `NODEW` | 150 | node width |
| `NODEH` | 34 | leaf node height |
| `AGAP` | 26 | vertical gap between siblings (the arrow lives here) |
| `PAD` | 10 | inner padding of a group box |
| `HEAD` | 28 | group header height |
| `QUESTION_H` | 18 | the fork question line, above the columns |
| `COLGAP` | 12 | horizontal gap between version columns |
| `COLHEAD` | 20 | a version column's header row |
| `EMPTY_BODY_H` | 30 | drop-zone height when a version has no steps |
| `BAR_ONE_LINE_W` | 430 | — (note: the mirror's token still says 350; stale) |

If your mock changes any of these, call it out explicitly — we change the
`const` and the token together, guarded by a vitest assertion, never one alone.

## Open question — ours to resolve, **not blocking your mock**

Whether *visibility* (the checkbox subset) is a **persisted model field** on the
node or **transient view state** that resets per session is an implementation
call we own — it does not change what you draw. Mock the behavior for both
selectors regardless; we'll decide persistence when we build.

## What "done" looks like from your side

A design study covering states 1–3 (leaf / collapsed group / expanded
fork-with-versions), all the visibility×active visual states, the header chrome,
grey empty states, and the linear/edit toggle — landed in the design project so
it arrives here on the next mirror pull. Reply as a new numbered message if
anything above is underspecified.
