# Cockpit Spike Results — 2026-07-08

**Environment.** Windows 11, dev server already running on :3000 (reused, not
restarted). `tsc -b` clean. `npm run lint` — 0 errors, 1 warning (the
pre-existing `tools/evoc-spike/.venv/.../matplotlib` one; not touched).
`node tools/cockpit-spike/shots.mjs` against the live dev server — exit 0, no
`pageerror`/console-error events.

**What was built**, all under `src/experiments/cockpit/` unless noted:

| file | lines | purpose |
|---|---:|---|
| `docs.ts` | 285 | `DOC_BODY` for all 69 graph nodes + load guard |
| `walks.ts` | 91 | 2 authored walks (14 + 8 stops) + load guard |
| `state.ts` | 51 | shared types + pure helpers (not in the handoff's file list — see Deviations) |
| `layout.ts` | 37 | map geometry, wraps `derive.ts`'s `layoutMap` |
| `CockpitView.tsx` | 107 | state + interaction contract |
| `MapPanel.tsx` | 231 | map instrument |
| `TreePanel.tsx` | 163 | tree instrument |
| `KnowledgePanel.tsx` | 132 | knowledge instrument |
| `TrailStrip.tsx` | 145 | trail + walk controls |
| **total** | **1242** | |

Plus a 6-line, 2-edit change to `Shell.tsx` (import, `Tab` union, one `TABS`
entry, one render line) and `tools/cockpit-spike/` (`shots.mjs`, `.gitignore`,
this file).

## Contract observations

**Map.** Earned its space passively rather than actively — it has the fewest
direct interactions (double-click a region to zoom, click a dot to select)
but is legible continuously, which is its actual job. The stability invariant
paid off exactly as hoped: `cockpit-zoomed.png` is pixel-identical to
`cockpit-initial.png` (same `zoom ×1.00`) while breadcrumb and tree moved —
visible proof the map is a fixed reference frame, not a fourth thing that
also re-renders. It stops being wallpaper the moment the current node has
real edges: `cockpit-jump.png`'s 8-line fan out of Search Index, reaching
into three other domains, is the map doing real work. Two cosmetic findings,
neither architectural: the `⤳` badge glyph renders as `~` in headless Edge
(font fallback, not logic); and when a walk is active and the current node is
also a hub, the route overlay and the incident-edge overlay visually compete
(`cockpit-walk.png`) — worth a z-order/opacity pass in a real build.

**Tree.** Did the most work and felt the most "solved." Depth-2 default
expansion consistently showed a sensible slice of structure with zero
configuration, and re-rooting (via zoom or auto-re-root) read immediately
from the panel's own `Tree — <root>` header. The single/double-click
disambiguation (a 220ms hold before SELECT commits, cancelled by a second
click) cost real implementation weight — a per-row timer — for a distinction
the frozen contract requires: a ZOOM must never smuggle a trail entry. Worth
it, but a production build would want a dedicated zoom affordance instead of
relying on double-click timing.

**Breadcrumb.** Small and did exactly one job well. The single moment it
exists to justify — an expected "System / Ingestion" after an ordinary zoom,
versus a jarring "System / Presentation / Search" after a JUMP — lands
clearly in the two screenshots side by side. Living above the map rather than
inside any one panel also read correctly as "the map's stated root," not
"the tree's breadcrumb."

**Trail.** The panel the whole spike was built to justify, and the strongest
evidence is unscripted: mid-walk, "Embedding Builder" appears in the trail
**twice** — once tagged `TREE` (an earlier manual visit), once tagged `WLK`
(revisited by Walk 1) — with no deduplication or rewriting
(`cockpit-walk.png`). That is the append-only, via-tagged contract working
exactly as specified, produced by ordinary use, not a scripted assertion. The
jump chip's amber accent + `⤳` prefix make the one "this diverged from the
breadcrumb" moment easy to spot in an otherwise quiet strip.

**Knowledge.** Earned its space as the reading surface — its three outgoing
lists (Contained / Roads from here / Walks through here) close the loop back
into the other three instruments, so a person never has to leave it to decide
the next move. The real finding here is a gap: both link-lists are leaf-only
by construction (`graph.ts` edges are leaf-to-leaf; walk stops are leaf ids),
so a **container** — which happens constantly, since the cockpit opens on one
(System) and containers are directly selectable — shows neither section
populated. `cockpit-initial.png`'s "Walks through here (0)" on the System
root is the direct evidence, not a hypothetical.

**Walk.** Itinerary bubbles + route polyline + remaining-count communicate
progress clearly. "Walks through here" correctly surfacing a node shared by
*both* authored walks (Search Index: Walk 1's last stop, Walk 2's first) was
a hoped-for case that the jump step happened to land on unprompted —
`cockpit-jump.png` lists both with correct stop numbers. Downstream dimming
at 25% opacity is correct everywhere checked (touched domains/modules stay
bright, untouched ones fade) but visually subtle against this palette —
present, but you have to know to look for it, which undercuts it as a
decluttering aid.

## The three open questions (answered from the build)

**1. Should the map semantic-zoom, or stay top-level with a pin?**
Pin. The map never changed its own layout in any screenshot, by contract, and
that limit was never once felt as a gap — the *tree* is what descends into
structure, and the map's job was fully satisfied by overlays (ring, domain
highlight, edge fan, route). All 69 nodes render as regions/dots
simultaneously at rest, so there's rarely "more structure" a semantic zoom
would reveal that tighter framing doesn't already show. Recommendation: pin
only; if the map needs to declutter at real scale, do it by choosing *which*
dots render, not by changing what the map itself looks like.

**2. What should the walk's "downstream" include?**
Remaining stops plus their containment ancestors — implemented, and it reads
correctly: in `cockpit-walk.png`, Sources and Parsing (Ingestion's other two
modules) visibly fade while Enrichment stays bright, because a later stop
(index 8, the "first twist") revisits it. I did not extend downstream to
linked neighbors (nodes connected to a remaining stop by a real edge but not
themselves a stop) — the build argues against it: a hub like Node Repository
carries 15 roads, and lighting up all of *their* neighborhoods too would
likely undim most of the map, defeating the filter's purpose.

**3. Where do cross-links surface best?**
The knowledge panel, clearly — the other two candidates don't really compete.
Map "roads" (the incident-edge lines) show volume and shape at a glance —
"this touches many things, over there" — but not *which* thing without
further interaction. Tree badges (`⤳ n`) are good for browsing (which leaves
are worth a look) but, in this build, aren't themselves clickable through to
the link's other end. Only the knowledge panel names the other endpoint,
states direction and type, and is directly actionable — it does real work the
other two only gesture at.

## Verification

**Commands.** `tsc -b` clean · `npm run lint` 0 errors / 1 known warning ·
`node tools/cockpit-spike/shots.mjs` exit 0, 0 page/console errors.

**Screenshots** (`tools/cockpit-spike/out/`):
- `cockpit-initial.png` — Cockpit tab open at the default state (`currentId =
  treeRootId = System`): all five surfaces populated. Map shows all 5 domains
  as nested regions, including the one depth-4 branch (Platform → Delivery →
  Pipelines) rendering as a box nested inside a box. Tree shows 5 expanded
  domains with collapsed modules beneath. Knowledge panel shows System's doc,
  5 Contained domains, and "Walks through here (0)". Trail shows 1 chip.
- `cockpit-zoomed.png` — double-clicked the Ingestion region label.
  Breadcrumb grew to "System / Ingestion"; tree re-rooted to Ingestion's 3
  modules, expanded to all 12 leaves with link-count badges; map is
  pixel-identical to `cockpit-initial.png`; knowledge panel and trail are
  *also* unchanged — direct visual proof ZOOM touches only `treeRootId`.
- `cockpit-jump.png` — selected Embedding Builder (a named hub, 20 roads) via
  the tree, then clicked its *last*-listed road (deliberately, not the
  first — see Deviations), landing on Search Index in Presentation/Search.
  Breadcrumb rewrote to "System / Presentation / Search"; map shows the
  you-are-here ring on Search Index with an 8-line edge fan reaching into
  three other domains; knowledge panel shows "Walks through here (2)"; trail
  shows all 3 visits with the jump chip accented.
- `cockpit-walk.png` — activated Walk 1, advanced 4 times to stop 5 of 14
  (Node Repository — itself a hub, 15 roads). Map shows the amber route
  (solid through visited stops, dashed ahead) overlapping the current node's
  own incident-edge fan; untouched modules (Sources, Parsing) visibly dim.
  Trail grew to 8 entries and — unscripted — shows Embedding Builder twice
  (`TREE` then `WLK`), the clearest evidence in this report that revisits
  append rather than rewrite.

**Jump-divergence DOM text**, quoted verbatim from the script's console:
```
BREADCRUMB BEFORE JUMP: Cockpit —System/Ingestionyou are here: Embedding Builder
BREADCRUMB AFTER JUMP: Cockpit —System/Presentation/Searchyou are here: Search Index
LAST 4 TRAIL CHIPS AFTER JUMP: ["SystemTREE","Embedding BuilderTREE","⤳Search IndexLNK"]
DIVERGENCE CONFIRMED: breadcrumb changed on jump
```
(Breadcrumb and "you are here" share one `aria-label` region, hence the
run-together text; the ancestry portion is what changed —
`System/Ingestion` → `System/Presentation/Search` — while the trail's 3 chips
are the full continuous history, only the newest marked as a jump.)

## Deviations & parking lot

Ambiguity resolutions (§3.3: pick the simplest option, log it here):
- **Initial state**, unspecified by the contract: `currentId = treeRootId =
  ROOT_ID`, trail seeded with one `{id: ROOT_ID, via: 'tree', jump: false}`
  entry, so the cockpit opens fully populated rather than blank.
- **Knowledge panel's "Contained" clicks** are tagged `via: 'tree'` — the
  same semantic move as clicking that child in the tree panel; no separate
  `via` value exists for "selected from a panel list."
- **"Walks through here" matches only exact leaf-id stops**, not container
  subtrees — a container shows "(0)" even when a walk passes through its
  descendants. Reported above as a real gap, not silently patched: fixing it
  would have been a design decision (match by subtree how?), not a bug fix,
  and the frozen contract doesn't specify one.
- **Walk 1's "twist"** was defined as a same-consecutive-stop domain-index
  jump of 2+ (on the fixed ingestion<model<reasoning<presentation<platform
  ordering), documented inline in `walks.ts`, rather than a stricter
  graph-theoretic reading of "not tree-adjacent." The walk shipped with four
  such twists against the required three.
- **The verification script clicks the *last* listed road**, not the first,
  when demonstrating JUMP. `graph.ts` generates edges in passes —
  local-cohesion chains (intra-module) first, hub-attraction and uniform fill
  last — and `edgesTouching()` preserves that order, so "first road" is
  reliably an intra-module neighbor, not a cross-domain link. This is a
  property of the corpus's generation order, not something a real user would
  hit (a person reads the link labels; they don't blindly click position 1),
  but it's worth recording since it looks like it should work and doesn't.
- **Added `aria-label` landmarks** (`map-panel`, `tree-panel`,
  `knowledge-panel`, `trail-strip`, `breadcrumb`, `roads-from-here`) to the
  panel components — not in the handoff's file list, added for genuine
  accessibility value and because it made the verification script reliable
  instead of position-guessing. Also added one file beyond the "optionally
  `layout.ts`" allowance: `cockpit/state.ts`, holding shared types and pure
  helpers, mirroring the repo's own `derive.ts`/`flat.ts`-vs-views split.

**Parking lot** (came up mid-build, deliberately not implemented — contract
is frozen):
- A dedicated zoom affordance on tree containers, instead of double-click
  timing.
- Extending Roads/Walks-through-here to containers via subtree aggregation.
- Stronger visual separation between the walk-route and incident-edge
  overlays on the map when they coincide on a hub.
- Higher-contrast dimming (25% opacity is correct but not emphatic against
  this palette).

Nothing was cut from §6's protected list — map stability, breadcrumb-vs-trail,
and JUMP semantics all shipped intact, along with everything on the
cut-if-overrunning list (Walk 2, per-stop notes, downstream dimming): none of
it was cut.

## Addendum — Plex (2026-07-09)

Follow-up to feedback that the Knowledge panel's Roads-from-here section read
as a flat, direction-then-appearance-order button list — functionally correct
but visually indistinguishable from any typed-link list (Jira's "linked
issues," GitHub's "linked PRs"). Added `cockpit/PlexPanel.tsx`: a small radial
diagram, embedded above that list, centered on the current node. Containment
is vertical (parent above, children below — the tree's own axis, at a point
scale) and, for leaves, typed links fan left (incoming) and right (outgoing),
one concentric ring per edge type, so same-type neighbors group by radius
*and* color instead of by list position. The adjacent list was regrouped to
match (by type, not by direction), sharing one `EDGE_TYPES` order (`state.ts`,
derived from `EDGE_LABEL`'s own key order) so the diagram and the list always
agree on grouping. No contract change: parent/child clicks still SELECT,
ring-neighbor clicks still JUMP, both through the same callbacks CockpitView
already passed into the Knowledge panel — `PlexPanel` took no new wiring.

**Closes a gap this report flagged as real** (line 73-78, original): a
container's Roads/Walks sections showed nothing, because both are leaf-only
by construction. The plex doesn't extend those sections — leaf-to-leaf edges
still don't reach containers — but it gives every container a populated,
useful diagram of its own (parent above, children below), so opening on
System no longer opens on an empty relationship panel. Confirmed in
`plex-container.png`: System (root, no parent, 5 children) renders 6 circles
and the honest note "graph links connect leaves only — this container shows
containment," rather than nothing.

**Two bugs found by looking at the render, not by the type-checker** — `tsc
-b` and `npm run lint` were clean both times; both bugs were only visible in
a screenshot:
- The center node's fill was `DOMAIN_COLOR[domainOf(currentId)]` with no
  fallback. `domainOf(ROOT_ID)` has no domain (root isn't inside a domain, it
  IS the root), so the lookup was `undefined` — which SVG renders as black.
  Confirmed in the first `plex-container.png` capture: a black center circle,
  not the intended neutral slate. KnowledgePanel's own header already guards
  this (`?? '#475569'`); `PlexPanel` didn't. Fixed by adding the same
  fallback to the two lookups that can legitimately receive `ROOT_ID` — the
  center and, separately, the parent slot (hit when viewing a domain
  container directly, whose parent *is* root). Children and neighbor lookups
  don't need the guard: every child and every edge endpoint in this corpus
  has a real domain ancestor by construction, so the fallback there would
  guard against a case that can't occur.
- The center's label was white text inside the 44px circle, sized for the
  longest node title. Wider than the circle, its overflow rendered white
  text on the page's white background — invisible past the fill's edge. The
  first `plex-hub.png` shows exactly this: "Embedding Builder" reads as
  "bedding," the only portion still overlapping the dark fill. Fixed by
  moving the label below the circle, matching how parent and child labels
  were already positioned — one label placement rule for every node in the
  diagram instead of an inside/outside split.

**Verification.** `tsc -b` clean · `npm run lint` 0 errors / the same 1
pre-existing warning · new script `tools/cockpit-spike/shots-plex.mjs`
(mirrors `shots.mjs`'s pattern) exit 0, 0 page/console errors. Re-ran the
original `shots.mjs` too, since regrouping the roads list by type changes its
DOM order and that script's JUMP demonstration depends on clicking a specific
list position (`roads.last()`) — still lands on Search Index, so no
regression, but order-dependent by luck rather than by guarantee (see
`shots.mjs`'s own comment on why "last" was chosen; that reasoning gets
weaker once the list is grouped by type rather than by generation order).

Screenshots (`tools/cockpit-spike/out/`):
- `plex-container.png` — System's plex: 6 circles (center + 5 domain
  children), no parent, no rings, the containment-only note.
- `plex-hub.png` — Embedding Builder's plex (the same 20-road hub the
  original spike used): 22 circles (center + parent + all 20 roads), rings
  visibly dominated by data-flow orange with a thin depends-on slate ring,
  legible even at the corpus's highest degree.
- `plex-jump.png` — clicked a ring node directly (Search Index, cross-domain,
  not the adjacent list) and captured the result: breadcrumb rewrote to
  `System / Presentation / Search`, trail gained a `⤳ … LNK` chip — the plex
  is a real JUMP surface, not decoration alongside one.

**Parking lot**, unchanged in spirit from the original report — not done,
not blocking:
- Neighbor labels are hover-only (`<title>`); a hub's outermost ring is
  visually dense enough that a persistent label would need real collision
  avoidance, not just truncation.
- No animation on JUMP — the center recomposes instantly to the new node's
  own neighborhood. Ties to the separate "make navigation feel like
  traveling" direction raised alongside this request; not attempted here.
