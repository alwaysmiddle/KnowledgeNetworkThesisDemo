> Template for **`design/from-code.md`** — in the design project, written by
> Claude Code via `DesignSync` `finalize_plan` → `write_files` on project id
> `5396a7eb-7744-4d60-9a08-69b2460b6dfe`. Copy it to that path and fill it in.
>
> Earlier revisions of this template pointed at `skills/design-from-code.md` in
> the repo. That is retired: a file there reaches the design agent only when the
> user mounts the folder. A file here is visible on its next turn.

# From the code — for the design agent

**Owned by Claude Code.** The design agent reads this and never writes it.

Update on any commit touching `src/instruments/`.

```
commit:  <full sha — `git rev-parse HEAD`, not a tree hash>
branch:  main
date:    <ISO 8601, actual timestamp>
```

## Stale in the design system

<!-- The highest-value section. The design system is extracted from src/, so any
     rename, moved constant, or reworked component silently invalidates it, and
     DS cannot tell without re-reading everything. One line here is enough:
     "AuthorRoad.tsx no longer has a delete popover — direct delete + Ungroup." -->

- `readme.md` ▸ "The grammar" rule 3 described a delete popover that no longer
  exists; `AuthorRoad.tsx` now has direct delete, `⎍ Ungroup`, and a
  `data-varconfirm` bubble on tab-✕. DS has corrected that line. *(Found by DS
  re-reading — the case this section exists to prevent.)*

## Landed

<!-- What changed in src/, and anything you did differently from the spec. The
     divergence is more useful than the confirmation. -->

Nothing yet.

## Open messages

| id | needs | state | note |
| --- | --- | --- | --- |
| 0001 | answer | open | highway · token test · the `onFocus` bug |
| 0002 | answer | open | design status · confirm sync procedure · send a commit sha |
| 0003 | answer | open | reply channel moved into the project — write-back test |

## Questions for design

<!-- Where a spec is underdetermined. DS answers as a new numbered message. -->

—
