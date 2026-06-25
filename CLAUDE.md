# KnowledgeNetworkThesisDemo Orientation

This project is the restarted implementation-first thesis demo.

Use this file for durable project guidance only. Do not put detailed current
status here; it will go stale. Current implementation status belongs in
`docs/ROADMAP.md`.

## Session Start

Start every session by reading:

1. `docs/PROJECT_CONTEXT.md` - current project references that may change.
2. `docs/README.md` - active-docs index and working loop.
3. `docs/ROADMAP.md` - current implementation order and status.
4. The relevant feature spec under `docs/features/` for the slice being built.

Do not assume the references in `docs/PROJECT_CONTEXT.md` are permanent.
Confirm current status in `docs/ROADMAP.md` before implementing.

## Working Loop

Use this loop for each MVP slice:

```text
ROADMAP -> SYSTEM_MODEL -> one feature spec -> implementation -> verification -> commit
```

Keep feature specs small. Update the roadmap after implementation instead of
creating external project-management state.
