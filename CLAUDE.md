# KnowledgeNetworkThesisDemo Orientation

This project is the restarted implementation-first thesis demo.

**The wiki is the main source of truth for this project.** All current status,
design decisions, specs, and roadmap live there. `CLAUDE.md` holds only durable
session guidance — not implementation detail. When `CLAUDE.md` and the wiki
disagree, trust the wiki.

## Session Start

Start every session by reading:

1. `wiki/progress/Project-Context.md` - current project references that may change.
2. `wiki/Home.md` - wiki index and working loop.
3. `wiki/Roadmap.md` - current implementation order and status.
4. The relevant feature spec under `wiki/specs/` for the slice being built.

Do not assume the references in `wiki/progress/Project-Context.md` are permanent.
Confirm current status in `wiki/Roadmap.md` before implementing.

## Working Loop

Use this loop for each MVP slice:

```text
ROADMAP -> SYSTEM_MODEL -> one feature spec -> implementation -> verification -> commit
```

Keep feature specs small. Update the roadmap after implementation instead of
creating external project-management state.
