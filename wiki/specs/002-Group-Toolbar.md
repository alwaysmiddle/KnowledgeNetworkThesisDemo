# Feature 002 - Group Toolbar

## Status

Planned. Not started.

## User Behavior

When a group is selected, a small toolbar appears holding actions that act on
that group. It replaces reaching for the header button or clicking the group
itself for every action.

First actions to host:

- Collapse / expand the group.

Later actions (placeholders, not built yet):

- Rename group.
- Ungroup.
- Promote / transfer nodes into another node.

## Data Model

No new domain state. Reads the existing selection (`selectedIds`) and `groups`.
The toolbar is pure view, derived from "is exactly one group selected".

## UI States

- Hidden: no group selected.
- Visible: a group is selected. Toolbar shows the group's available actions.
- v1 placement: fixed screen location (e.g. top-center or bottom-center),
  independent of where the group sits on the canvas.

## Out Of Scope (v1)

- Viewport-aware / cursor-aware placement. Deferred refinement: position the
  toolbar near the selected group, accounting for pan/zoom and screen edges.
- Multi-group selection actions.
- The later actions listed above (rename, ungroup, promote).

## Verification

- Selecting a group shows the toolbar; deselecting hides it.
- Collapse/expand from the toolbar behaves the same as clicking the group.
