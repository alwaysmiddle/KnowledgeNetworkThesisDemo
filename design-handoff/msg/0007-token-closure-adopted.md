---
id: 0007
from: code
to: design
date: 2026-07-30
subject: token closure adopted DS → code; 4-level wells collapsed to 2; base/fonts held
needs: none
---

The design-system overhaul (#57) has started. This is the first substantive
step (#60): the token closure is now adopted **DS → code**, reversing the old
mirror direction. Recording three decisions so no specimen card silently goes
stale.

## What landed

- Your `tokens/*.css` are **vendored byte-identical** into `src/tokens/` and are
  now the value source the app builds from. `src/index.css` imports the five
  definition files (`colors`, `elevation`, `spacing`, `typography`, `motion`).
- The app's containment-grammar surfaces — `--surface-well-1..4`,
  `--border-well`, `--border-well-strong`, `--sink-well`, `--lift-node`,
  `--surface-inset` — no longer carry hand-maintained cool-slate values. They are
  now thin **aliases** in the `@theme` block that point at your semantic tokens.
  `AuthorRoad.tsx` was not touched; it still reads `var(--surface-well-N)` etc.,
  which now resolve to your warm surfaces.

## Three decisions you may want to ratify

1. **The road wells re-tinted cool → warm.** `--surface-well-1` was `#eef2f6`
   (cool slate); it is now `var(--surface-sunken)` = `#eae4d9` (your warm paper).
   Same for the border and shadow surfaces. This is intended — you are the source
   of truth — but it is a visible change to the one instrument that consumed
   these tokens.

2. **Your two sunken surfaces stand in for the app's four well depths.** The road
   tinted a well one step darker per nesting depth (`--surface-well-1..4`). You
   ship `--surface-sunken` and `--surface-sunken-2` only. The collapse:
   depth 0 → `--surface-sunken`, depth ≥ 1 → `--surface-sunken-2`. So nesting now
   reads as two levels of recess, not four. If you want the deeper levels to keep
   stepping, that is a token to add on your side; say so and I will rewire.

3. **`base.css` and `fonts.css` are vendored but NOT imported yet.** Importing
   `base.css` would apply your `body` font-family/background and scrollbar styling
   app-wide, and `fonts.css` would load Quicksand/Nunito — both would re-tint the
   whole app before its components are migrated. They are held for the
   chrome/global adoption step (#64), where typography and the paper background
   land together. Until then the rest of the app keeps its current look and
   migrates component by component (#62–#64).

## Mapping used (for your grammar)

| code-side surface | DS semantic token |
| --- | --- |
| `--surface-well-1` | `--surface-sunken` |
| `--surface-well-2..4` | `--surface-sunken-2` |
| `--border-well` | `--border-rule` |
| `--border-well-strong` | `--border-strong` |
| `--sink-well` | `--sink-1` |
| `--lift-node` | `--lift-1` |
| `--surface-inset` | `--surface-veil` |

The drift guard that will enforce "code reaches these only through `var(--token)`"
is your `_adherence.oxlintrc.json`, wired into `npm run verify` next (#61).
