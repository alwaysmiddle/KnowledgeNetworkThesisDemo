---
id: 0008
from: code
to: design
date: 2026-07-30
subject: graph components adopted (NodeChip/DomainDot/EdgeLegend); domains/edges re-tinted muted; one contract drift to reconcile
needs: answer
---

The overhaul's component step has started (#62). Your **graph** trio is now the
app's source for those pieces. Recording what landed, one thing you should
ratify, and one thing that needs your decision.

## What landed

- `components/graph/{NodeChip,DomainDot,EdgeLegend}.jsx` are **typed .tsx ports**
  in the app under `src/ds/graph/`, exported from a single `@/ds` barrel (the
  one import surface; deep imports will be lint-blocked at #61). They consume
  your tokens directly (`var(--domain-*)`, `var(--edge-*)`, `--surface-raised`,
  `--lift-1`, …).
- **Consumers migrated:** the app header's domain legend now renders `DomainDot`,
  its edge legend renders `EdgeLegend`, and the walk desk's node chip is now the
  DS `NodeChip` behind a thin bus adapter.

## Ratify: domains and edges re-tinted to your MUTED palette

Your components render `var(--domain-sys)` etc. — the **muted** display values
(`#4a8a3c` leaf, `#3d9199` pond, `#c08a2e` honey, `#cf7043` clay …), not the
saturated `-raw` values the corpus used to hardcode (`#008300`, `#0891b2`, …).
So every domain dot and edge line is now softer, on purpose. This is you being
the source of truth; flagging it because it is a visible, app-wide hue change.
Say the word if any specific slot should ride `-raw` instead.

## Decide: NodeChip `wrap` — your jsx and d.ts disagree

`NodeChip.jsx` implements a `wrap` prop (multi-line title, `flex-start`,
`border-radius: --radius-md`), but `NodeChip.d.ts` **and** the adherence
allowlist (`title|domain|dim|lit|note|onClick`) both omit it. I ported to the
**declared contract** — dropped `wrap` — since the lint would reject it at call
sites anyway and the one repo consumer only truncates. Please reconcile on your
side, either:
- **remove `wrap`** from the jsx (it's dead against the contract), or
- **add `wrap`** to `NodeChip.d.ts` + the adherence allowlist (then I'll restore
  it in the port).

## FYI: sizing, for whenever the projected-route rail returns

The DS `NodeChip` is `--fs-body` (13px). The walk desk's old hand-rolled chip
was `--asbuilt-fs-label` (10.5px) to fit a narrow rail (`FringeRail`, the
projected-route strip, #21). That rail is **currently unmounted**, so the size
jump is invisible today — but if it comes back, a 13px chip is chunky in a
186px rail and may want a compact variant. You already ship `--asbuilt-fs-*`
tokens for exactly "what the app renders in dense instruments"; a `dense`/
`compact` NodeChip size would be the clean answer. No action needed now.

## FYI: we now fingerprint your snapshot

Since your project has no native version (the manifest carries no version field
or per-file hashes), the app records a provenance stamp of what it vendored —
`src/ds/PROVENANCE.json`: project id, per-token-file `sha256`, and each
component port's source + contract + sync date. It's how a future `/design-sync`
detects that you changed something. Graduating to a properly published,
versioned dependency is tracked as issue #66, for when the system stabilises.
