# HANDOFF: Map-Tree-Walk Cockpit Spike

> **Disposable task document.** Written 2026-07-08 by the planning session (Fable) for a
> Sonnet session to execute inside `D:\ShiZhong\MyCode\KnowledgeNetworkThesisDemo`.
> It is NOT a knowledge doc (those live in DocHub) — delete it once the spike is done
> and reported. Everything you need is inlined; background reading is optional
> (`DocHub/docs/knowledge-network-thesis-demo/progress/Map-Tree-Walk-Navigation-Model.md`).

## 0 · Mission

Prototype the **Map-Tree-Walk cockpit** — three navigation instruments plus a reading
pane over ONE authored corpus — as a new tab in the Graph Disclosure Lab. The model,
settled in a design session:

- **Map — where am I.** Stable anchor; regions = the authored containment hierarchy;
  never re-layouts on navigation, only overlays change.
- **Tree — the road ahead.** Local detail below the current root; re-roots on zoom-in;
  breadcrumb records ancestry.
- **Walked path (trail) — where I've been.** Temporal history of visits. **Distinct
  from the breadcrumb**: the two diverge exactly when a cross-link is followed
  (ancestry rewrites discontinuously; history stays continuous). That divergence is
  the demo moment of this whole spike.
- **Knowledge view** — the current document's content. Reading happens here; the other
  three are for moving.
- **Walks are first-class authored artifacts** (a lesson plan IS a walk), not just
  history.

**This is an interaction experiment, not a feature.** "Instrument X felt redundant" is
a fully successful finding — report it as-is.

Parts: **A** corpus additions (docs + walks), **B** the CockpitView (five surfaces +
frozen contract), **C** verification + honest report.

## 1 · Verified environment facts (do not re-derive)

- Windows 11, PowerShell primary. Repo: `D:\ShiZhong\MyCode\KnowledgeNetworkThesisDemo`
  (Vite + React 19 + TS + Tailwind v4).
- Dev server: `npm run dev` → http://localhost:3000. It may already be running — check
  before starting a second one.
- `playwright-core` is in devDependencies; **Edge** is installed — launch with
  `channel: 'msedge'`. (Full `playwright` is NOT installed; no bundled browsers.)
- Checks: `npx tsc -b`, `npm run lint`. Lint has **one known pre-existing warning**
  from `tools/evoc-spike/.venv/...matplotlib...` — not yours; leave the eslint config
  alone.
- The corpus already exists: `src/experiments/graph.ts` — root `System`, 5 domains,
  13 modules (containers), 50 leaves; nodes `{id, kind: 'container'|'leaf', parentId,
  title}`; exactly 200 seeded leaf-to-leaf typed edges
  (`depends_on | data_flow | references | implements`); exports `DOMAIN_COLOR`,
  `EDGE_COLOR`, `EDGE_LABEL`, `byId`, `domainIds`, and more — read it. **Do not modify
  it.**
- Existing tabs share walk/route state via `Shell.tsx`. The cockpit does **not** join
  that shared state — fully self-contained view, like `EvocView`.

## 2 · Read these before writing code

- `src/experiments/Shell.tsx` — tab wiring you will extend.
- `src/experiments/graph.ts` — full corpus + exported helpers.
- `src/experiments/MapView.tsx` — proven patterns to copy: non-passive wheel-zoom +
  pointer-drag pan (ref + `useEffect`; never read refs during render — eslint
  react-hooks enforces this), HUD/panel styling, and how it derives its map layout.
- `src/experiments/derive.ts`, `src/experiments/flat.ts` — exported layout/derivation
  utilities. **Reuse by import if they fit as-is; do not modify them.** If they don't
  fit, write your own `cockpit/layout.ts` (see §3.4).
- `src/experiments/WalkView.tsx` — route semantics precedent.
- `src/experiments/parts.tsx` — shared UI atoms.
- `src/experiments/EvocView.tsx` — precedent for a self-contained view.

Among existing files, **only `Shell.tsx` may be modified** (minimal tab diff). Nothing
under `wiki/` (deprecated).

## 3 · The design (frozen — see §6)

### 3.1 Screen

New tab id `'cockpit'`, label `Cockpit`, hint
`map + tree + trail + document — the three-instrument navigation model`.

Five surfaces, all visible at once (target viewport ≥ 1370 px wide):

- **Breadcrumb strip** (top): ancestry of the tree root.
- Three columns: **Map | Tree | Knowledge** (proportions yours; map and knowledge
  wider than tree).
- **Trail strip** (bottom, full width): the walked path, plus the walk picker/controls.

### 3.2 State

```ts
currentId: string                    // the selected/visited node ("you are here")
treeRootId: string                   // tree panel root (initially ROOT_ID)
trail: { id: string; via: 'map'|'tree'|'link'|'trail'|'walk'; jump: boolean }[]
activeWalk: { walkId: string; cursor: number } | null
```

### 3.3 Interaction contract

Implement exactly; where ambiguous, choose the simplest option and record it in
RESULTS Deviations.

- **SELECT** (single-click a node on map, tree, knowledge-panel lists, trail chip, or
  walk stop): `currentId = X`; push `{id: X, via, jump}` onto the trail. The trail is
  **append-only** — revisits append again; nothing is rewritten.
- **AUTO-RE-ROOT invariant**: after any SELECT, if `currentId` is not inside
  `subtree(treeRootId)`, set `treeRootId = parent(currentId)` (root stays root).
  Otherwise the tree root is sticky.
- **ZOOM** (double-click a container in the tree, or double-click a region label on
  the map): `treeRootId = thatContainer`. No trail append, no `currentId` change.
  Breadcrumb = ancestry of `treeRootId`; clicking a crumb re-roots to that ancestor
  (no trail append).
- **JUMP** (click a typed cross-link in the knowledge panel): SELECT the target with
  `jump: true`. Expected visible effect — the whole point: breadcrumb rewrites
  discontinuously (via auto-re-root), trail grows continuously with an accented chip.
- **MAP STABILITY invariant**: node/region positions are computed **once** per corpus
  (module scope or `useMemo` with empty deps) and never change on any navigation.
  Only overlays change: you-are-here ring, region highlight, incident edges, walk
  route, dimming. Map pan/zoom is visual only — it never re-roots or re-lays-out
  anything.
- **WALK**: a picker lists the authored walks (§3.5). Activating a walk sets
  `cursor = 0` and SELECTs stop 0 (`via: 'walk'`). "Next stop" advances; clicking any
  itinerary stop jumps the cursor there. Map shows the route polyline through stop
  positions: visited segments solid, remaining dashed. **Downstream filter** while
  active: nodes not in (remaining stops ∪ their ancestors) dim to ~25% opacity
  (incident edges too); provide an on/off toggle. Deactivating the walk restores
  everything.

### 3.4 Panels

- **Map**: fixed layout of the 5 domain regions (fills from `DOMAIN_COLOR` at low
  alpha, labeled), module sub-areas inside, leaves as dots. Overlays: you-are-here
  ring on `currentId` + a highlight on its domain; edges drawn = only those incident
  to `currentId` (colored via `EDGE_COLOR`), plus the active walk route. Pan/zoom per
  MapView's pattern. Prefer importing the existing layout derivation
  (`derive.ts`/`flat.ts`/MapView's approach) if usable without modifying those files;
  otherwise `cockpit/layout.ts` with simple nested rectangles is fine — **this spike
  tests coordination, not cartography.**
- **Tree**: an indented list (a literal tree, not a graph), rooted at `treeRootId`.
  Containers expandable (chevrons; default expanded to depth 2), rows show title + a
  small domain-color dot; `currentId` highlighted; leaves with cross-links get a small
  `⤳ n` badge. Double-click container = ZOOM.
- **Knowledge**: kind + title + one-line ancestry; body text (from `docs.ts`);
  **Contained** (children, click = SELECT); **Roads from here** (outgoing AND incoming
  typed edges: direction, type label, other endpoint's title; click = JUMP);
  **Walks through here** (each walk containing this node: title + "stop k of n",
  click = activate that walk at that stop). This last list is walks-as-content made
  visible.
- **Breadcrumb**: `System / … / <treeRoot>`, crumbs clickable.
- **Trail**: horizontal chips oldest → newest, auto-scroll to newest; chip = title +
  a small via-glyph; `jump` chips visually accented (e.g. `⤳` + edge-type color);
  click = SELECT (`via: 'trail'`).

### 3.5 Part A — corpus additions (new files, hand-authored, deterministic)

- `src/experiments/cockpit/docs.ts` — `export const DOC_BODY: Record<string, string>`
  covering **every** node in `graph.ts` including containers and root. Containers:
  1–2 sentences on what the region is; leaves: 2–4 sentences, flavor consistent with
  the existing titles. **Bodies must not reference any walk order** — documents are
  terrain; narrative lives in walks. Module-load guard: throw if any graph node id
  lacks a body or any body key isn't a graph node.
- `src/experiments/cockpit/walks.ts` —

  ```ts
  export interface Walk {
    id: string
    title: string
    description: string
    stops: { id: string; note: string }[]   // ids are leaf ids; note = 1 tour-guide sentence
  }
  ```

  **Walk 1 (required)**: "How an article becomes knowledge" — 10–14 stops spanning
  ≥ 4 domains, mostly following containment order but with **≥ 3 deliberate
  cross-domain twists** (consecutive stops in different domains that are not
  tree-adjacent). Stop notes may reference sequence ("now that it's parsed, jump
  ahead to where embeddings land"). **Walk 2 (optional)**: 6–8 stops, different theme
  (e.g. "where a query goes"). Module-load guard: every stop id must be a leaf in
  `graph.ts`.

## 4 · Files

- New, under `src/experiments/cockpit/`: `CockpitView.tsx` plus panel components
  (`MapPanel.tsx`, `TreePanel.tsx`, `KnowledgePanel.tsx`, `TrailStrip.tsx`),
  `docs.ts`, `walks.ts`, optionally `layout.ts`. Split so each file stays coherent.
- Edit: `src/experiments/Shell.tsx` ONLY — extend the `Tab` union, one TABS entry, one
  line in `<main>`: `{tab === 'cockpit' && <CockpitView />}`. No props, no shared
  state, header legend untouched.
- New: `tools/cockpit-spike/` with `shots.mjs`, `RESULTS.md` (end), and a `.gitignore`
  containing `out/`.
- **No new npm dependencies.** Raw SVG for the map (like the existing views); plain
  elements for tree/panels/strips.

## 5 · Part C — verification protocol (run in this order)

```powershell
cd D:\ShiZhong\MyCode\KnowledgeNetworkThesisDemo
npx tsc -b
npm run lint     # no NEW problems beyond the known .venv warning
```

Then the browser check (start `npm run dev` in the background first if :3000 isn't
serving). `tools/cockpit-spike/shots.mjs`, following the proven EVoC pattern
(`createRequire` → `playwright-core`, `channel: 'msedge'`, headless, viewport
1750×950, collect `pageerror` + console errors, exit nonzero if any). Steps, with
screenshots into `tools/cockpit-spike/out/`:

1. `cockpit-initial.png` — open the Cockpit tab; all five surfaces populated.
2. `cockpit-zoomed.png` — double-click zoom into a domain; **extract and log the
   breadcrumb's textContent** (must show the grown ancestry).
3. `cockpit-jump.png` — navigate a few steps, then click a cross-domain link in the
   knowledge panel; **log the breadcrumb text AND the last 4 trail chips' text** —
   the logs must show ancestry rewritten vs history continuous. This is the spike's
   ground-truth moment; DOM text, not just pixels.
4. `cockpit-walk.png` — activate Walk 1, advance to ~stop 5: route line on the map
   (solid/dashed split), dimming on, itinerary visible; log the remaining-stop count.

Finally **Read the four PNGs** and describe what they actually show; any mismatch
with the contract is a finding, not something to quietly fix after the fact.

## 6 · Honesty rules

- The §3.3 contract is **frozen** — implement it as written even if a better idea
  appears mid-build; put better ideas in RESULTS ("parking lot"), not in the code.
  (Same epistemics as the EVoC spike's frozen weights: a fixed hypothesis is what
  makes observed friction interpretable.)
- If overrunning, cut in this order: Walk 2 → per-stop notes → downstream dimming
  (keep the route line). **Never cut**: map stability, the breadcrumb-vs-trail
  distinction, JUMP semantics — those ARE the experiment.
- Report friction honestly. "The trail felt redundant with the breadcrumb until the
  first jump" is exactly the kind of sentence wanted.

## 7 · Hard constraints

- **No git commits, no pushes.** Leave everything in the working tree.
- No DocHub edits, no `wiki/` edits, nothing outside this repo.
- Only `Shell.tsx` modified among existing files; `graph.ts` untouched; no new deps.

## 8 · Report-back — `tools/cockpit-spike/RESULTS.md`

```
# Cockpit Spike Results — <date>
Environment + what was built (file list, line counts)

## Contract observations
One short section per instrument (map / tree / breadcrumb / trail / knowledge /
walk): did it earn its screen space? Where did the contract feel right or wrong?

## The three open questions (answer from the build, with evidence)
1. Should the map semantic-zoom (reveal sub-regions) or stay top-level with a pin?
2. What should the walk's "downstream" include — remaining stops only, or also
   their neighborhoods (descendants + linked nodes)?
3. Where do cross-links surface best — knowledge panel, map roads, tree badges?

## Verification
Commands + outcomes; screenshots listed with one line each on what they show;
the jump-divergence DOM text (breadcrumb vs trail) quoted verbatim.

## Deviations & parking lot
```

Your final message to the user: lead with the verdict on the cockpit model (which
instruments work, which don't), then the jump-divergence evidence, then anything that
broke. Honesty over polish.
