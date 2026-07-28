# Syncing this folder from Claude Design

This folder is a **mirror** of a Claude Design project. Edit it there, then pull;
do not hand-edit files here expecting them to survive the next sync.

- Project: **Node grouping and hierarchy design**
- Project id: `5396a7eb-7744-4d60-9a08-69b2460b6dfe`
- URL: <https://claude.ai/design/p/5396a7eb-7744-4d60-9a08-69b2460b6dfe>
- Last pulled: 2026-07-28 (66 files)

The project's own `github.md` records the opposite direction — the repo paths the
design system was *extracted from* (`src/instruments/walkdesk/…`). That is
provenance, not a sync target. Nothing here writes into `src/`.

## Pulling an update

Ask Claude Code to re-sync this folder. The procedure it follows:

1. `DesignSync list_files` on the project id above.
2. `DesignSync get_file` each path in the include set (below), writing it to the
   matching path under `skills/knowledge-network-studio-design/`.
3. `git diff` — that is the change report. The design API exposes no hashes or
   mtimes, so there is nothing to diff against remotely; git is the diff engine
   and a full re-pull is the only correct way to detect change.

New files appear as untracked, deletions must be applied by hand after checking
`list_files` against the working tree.

## Include set

Everything in the project **except**:

| Excluded | Why |
| --- | --- |
| `support.js` | 70 KB generated `.dc.html` canvas runtime — Claude Design tooling, marked "do not edit", rebuilt from `dc-runtime/` |
| `Node Grouping Canvas.dc.html` | the grouping study that preceded this system; needs `support.js` to render, and `github.md` maps it to no repo file |
| `.thumbnail` | project preview image, not content |

Drop an exclusion only if you also pull the file it depends on.

## Fidelity notes

Two things that look cosmetic but are not:

- **`\uXXXX` escapes in `.jsx` stay escapes.** `StopPill.jsx`, `ContainerWell.jsx`,
  `CollapsedStop.jsx`, `StatusGutter.jsx`, `ForkSwitch.jsx`, `NodeChip.jsx` and
  `RailRow.jsx` write glyphs as `'\u22ef'`, not literal `⋯`. The HTML cards use
  literals. Swapping either way renders identically but shows as a diff on every
  subsequent sync.
- **The `<!-- @dsCard … -->` first line is load-bearing.** It is how the Design
  System pane builds its card index. Preserve it verbatim, including
  `colors-road.html`'s nested double quotes — that is how it exists upstream.

Relative paths (`../styles.css`, `../../styles.css`) mean the directory shape has
to be preserved exactly; the kit and the cards break if the tree is flattened.

## Pushing back

`DesignSync` can write to design projects (`finalize_plan` → `write_files`), but
this project is `type: PROJECT_TYPE_PROJECT`, not a design system, and the flow
here has only ever been pull. Treat the Claude Design project as the source of
truth for this folder.
