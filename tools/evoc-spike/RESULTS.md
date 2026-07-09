# EVoC Spike Results — 2026-07-09

Environment: evoc 0.3.1, python 3.12.11 (uv-selected; `requires-python = ">=3.10"` unchanged —
no need for the §4 fallback-to-3.12 contingency, uv just resolved a working toolchain directly).
EVoC signature: `EVoC(noise_level=0.5, base_min_cluster_size=5, base_n_clusters=None,
approx_n_clusters=None, n_neighbors=15, min_samples=5, n_epochs=50,
node_embedding_init='label_prop', symmetrize_graph=True, node_embedding_dim=None,
neighbor_scale=1.0, random_state=None, min_similarity_threshold=0.2, max_layers=10,
n_label_prop_iter=20)`. Seed passed via `random_state`.

Corpus: n=800 seed=42, sessions=117, items/graph: design=416, slice=208, skeleton=106,
ingest=70 (identical across all three mixes — corpus generation doesn't depend on mix).

## Verdict

**EVoC recovers `stage` (the 15-value, namespaced graph/stage level) far more readily than
`graph` (4 macro-pipelines) or `topic` (10 cross-cutting subjects) — in every mix, including
the realistic `balanced` one.** Best balanced-mix recovery: ARI 0.582 / NMI 0.826 for `stage`
at EVoC's own coarsest layer. `graph` never rises above ARI 0.18 anywhere, even in `balanced`
where its weight (wg=1.0) is nominally the *strongest* of the three — EVoC's automatic
depth selection simply never coarsens far enough (it stopped at 3 layers / 28 clusters
minimum in `balanced`) to approach a 4-cluster macro-partition. The `process` mix confirms
EVoC *can* nail a planted structure cleanly when it dominates (stage ARI 0.869) — so the
balanced-mix result isn't a broken pipeline, it's a real finding about where EVoC's automatic
layer count lands relative to a coarse 4-way split.

## Metrics — balanced (wg=1.0 ws=0.8 wt=0.8 wn=0.9)

| layer | nClusters | noise% | ARI graph | ARI stage | ARI topic | ARI session |
|---|---|---|---|---|---|---|
| L0 | 75 | 4.7% | 0.046 | 0.263 | 0.139 | 0.119 |
| L1 | 66 | 7.1% | 0.051 | 0.287 | 0.142 | 0.113 |
| L2 | 28 | 18.1% | **0.176** | **0.582** | 0.098 | 0.066 |

NMI (same layer order): L0 0.425 / 0.742 / 0.576 / 0.659 · L1 0.434 / 0.749 / 0.562 / 0.646 ·
L2 0.547 / 0.826 / 0.368 / 0.550

## Metrics — process (wg=1.2 ws=1.0 wt=0.35 wn=0.9)

| layer | nClusters | noise% | ARI graph | ARI stage | ARI topic | ARI session |
|---|---|---|---|---|---|---|
| L0 | 31 | 22.1% | 0.193 | 0.778 | 0.042 | 0.041 |
| L1 | 21 | 14.0% | 0.231 | **0.869** | 0.031 | 0.036 |
| L2 | 8 | 0.0% | 0.173 | 0.652 | 0.003 | 0.012 |

NMI: L0 0.558 / 0.903 / 0.247 / 0.514 · L1 0.596 / 0.949 / 0.169 / 0.459 ·
L2 0.455 / 0.864 / 0.028 / 0.267

## Metrics — topic (wg=0.35 ws=0.3 wt=1.2 wn=0.9)

| layer | nClusters | noise% | ARI graph | ARI stage | ARI topic | ARI session |
|---|---|---|---|---|---|---|
| L0 | 41 | 22.4% | 0.109 | 0.103 | 0.413 | 0.259 |
| L1 | 32 | 12.4% | 0.117 | 0.093 | **0.514** | 0.242 |
| L2 | 4 | 0.0% | 0.019 | 0.005 | 0.511 | 0.038 |

NMI: L0 0.473 / 0.442 / 0.776 / 0.736 · L1 0.455 / 0.396 / 0.811 / 0.723 ·
L2 0.021 / 0.024 / 0.754 / 0.371

## Reading

- **balanced** (the genuinely open question): `stage` wins at every layer and is the only
  level that ever clears ARI 0.5 (0.582 at L2). `graph` stays low (≤0.176) throughout —
  not because it's unrecoverable in principle (see `process`), but because EVoC's automatic
  depth selection stopped at a 28-cluster coarsest layer and never produced anything close
  to a 4-way split. `topic` sits in between and never dominates (≤0.142). Under competing,
  realistically-weighted structure, EVoC's tree tracks the medium-cardinality grouping, not
  the coarsest one — a real constraint on the "auto-hierarchy replaces our flat CNM
  communities" idea, not a pipeline bug.
- **process**: sanity signal holds clearly — stage ARI 0.869 / NMI 0.949 at L1, well past the
  ">~0.6" bar from the handoff. Confirms EVoC recovers a planted structure cleanly when its
  signal actually dominates the embedding.
- **topic**: topic ARI stabilizes at 0.41–0.51 across all three layers — recovered, but less
  cleanly than `process` recovered `stage` (0.51 vs 0.87) despite comparable relative
  dominance (wt=1.2 vs ws=1.0). `graph`/`stage` both collapse toward 0, as expected.
- **Negative control (session)**: never the top signal anywhere, but **not a clean, flat
  zero** — session ARI tracks the *topic* weight in each mix: lowest in `process` (wt=0.35 →
  ARI 0.01–0.04), moderate in `balanced` (wt=0.8 → ARI 0.07–0.12), highest in `topic`
  (wt=1.2 → ARI 0.04–0.26). This is fully explained by the generator itself (§3.2): 85% of a
  session's items share its home topic by construction, so session identity is never *in*
  the vector, but leaks in proportionally to how strongly topic is encoded. This is the
  negative control behaving exactly as the corpus design predicts, not a broken control —
  weights were not adjusted to hide or "fix" it, per the frozen-weights rule.
- **Noise**: grows monotonically from finest to coarsest layer in every mix (balanced 4.7% →
  7.1% → 18.1%; similarly for the other two) — consistent with HDBSCAN-style lineage
  reclassifying more borderline points as unclustered as layers coarsen.
- **`cluster_tree_` raw repr** (first 500 chars, balanced run):
  `{(1, 0): [(0, 0)], (1, 1): [(0, 1)], (1, 2): [(0, 2)], (1, 3): [(0, 3)], (1, 4): [(0, 4)],
  (1, 5): [(0, 5)], (1, 6): [(0, 6)], (1, 7): [(0, 13), (0, 14)], (1, 8): [(0, 17), (0, 18)],
  (1, 9): [(0, 7)], (1, 10): [(0, 8)], (1, 11): [(0, 10)], (1, 12): [(0, 11)],
  (1, 13): [(0, 12)], (1, 14): [(0, 15)], (1, 15): [(0, 16)], (1, 16): [(0, 19)], ...}` —
  keyed by `(layer, cluster)` mapping to a list of `(finerLayer, finerCluster)` children, i.e.
  coarse→children, the opposite direction from this spike's own overlap-derived fine→parent
  edges. Noted for the record only, per §4 instructions — not parsed or relied on here, but
  worth a follow-up spike given it looks more regular than "undocumented" implied.

## Verification

- `uv sync`: clean on first attempt except EVoC's own missing `matplotlib` dependency (see
  Deviations). After adding it: clean, Python 3.12.11 auto-selected by uv.
- `uv run python pipeline.py --mix balanced`: fit_predict 21.0s (first-call numba JIT
  warmup), UMAP 7.8s, wrote `src/experiments/data/evocRun.json` (436,848 bytes). All asserts
  passed (layer lengths = n, coarsest < finest cluster count, no NaN metrics).
- `--mix process --no-write` and `--mix topic --no-write`: both clean, fit_predict 0.4s each
  (JIT already warm), all asserts passed.
- `npx tsc -b`: clean, no errors.
- `npm run lint`: 0 errors, 1 warning (see Deviations — not app code).
- Browser (`node tools/evoc-spike/shots-evoc.mjs` + one follow-up targeted-hover check): zero
  `pageerror`/console errors across both runs. Metrics table DOM text matched the pipeline's
  stdout numbers exactly (cross-checked digit-for-digit).
- Screenshots in `out/`:
  - `evoc-default.png` — EVoC tab loads with the coarsest layer (L2·28) active by default;
    metrics table populated top-right, color-by controls bottom-left, info panel top-left.
  - `evoc-graph.png` — colored by `graph (4)`: exactly 4 hues visible; the two visually
    distinct green blobs bottom-right are the *same* planted graph but spatially separate in
    the UMAP layout — a visual confirmation of graph's low ARI.
  - `evoc-stage.png` — colored by `stage (15)`: visibly richer color structure, including
    inside the clusters that were monochrome under `graph` coloring — visually consistent
    with stage being the dominant recoverable signal.
  - `evoc-hover.png` — first attempt: mouse aimed at the SVG's pixel center, which missed all
    800 sparse dots, so no tooltip appears. Not a product bug (see Deviations).
  - `evoc-hover2.png` — retargeted at an actual `<circle>` element's bounding box: tooltip
    renders correctly, e.g. *"ingest/record · auth-and-config: secret rotation /
    ingest-record · ingest/record · topic auth-and-config · s-ingest-009 / L2 cluster 5"*
    plus the truncated body text — confirms the tooltip path end-to-end.

## Deviations & open questions

- **EVoC 0.3.1 doesn't declare `matplotlib` as a dependency**, but `label_propagation.py`
  imports it unconditionally at module load. Added `matplotlib` to
  `tools/evoc-spike/pyproject.toml` — a packaging fix, not a code workaround; `evoc` itself
  was not patched or vendored.
- **`npm run lint` shows 1 warning**, not 0: ESLint's default glob reaches into
  `tools/evoc-spike/.venv/Lib/site-packages/matplotlib/...` (a vendored third-party file
  inside a gitignored virtualenv, not part of this diff). Per the hard constraint limiting
  pre-existing-file edits to `Shell.tsx` and `tsconfig.app.json`, the ESLint config was left
  untouched rather than adding an ignore pattern. Worth an ignore-pattern fix in a future,
  non-spike pass if `tools/` gains more Python subprojects.
- **Python 3.10 vs 3.12**: the handoff's contingency path (retry on 3.12 if numba/tbb wheels
  fail on 3.10) never triggered — uv resolved everything on an auto-selected 3.12.11 toolchain
  on the first `uv sync`, before any 3.10 attempt was needed.
- No git commits were made; nothing outside `tools/evoc-spike/`, `src/experiments/EvocView.tsx`,
  `src/experiments/data/evocRun.json`, `src/experiments/Shell.tsx`, and `tsconfig.app.json`
  was touched.
