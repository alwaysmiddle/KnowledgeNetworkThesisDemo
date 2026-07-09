# HANDOFF: EVoC × Infra-Mock Spike

> **Disposable task document.** Written 2026-07-08 by the planning session (Fable) for a
> Sonnet session to execute inside `D:\ShiZhong\MyCode\KnowledgeNetworkThesisDemo`.
> It is NOT a knowledge doc (those live in DocHub) — delete it once the spike is done
> and reported. Everything you need is inlined; you should not need to read
> KnowledgeNetwork-Infra or DocHub at all.

## 0 · Mission

Test whether **EVoC** (Tutte Institute, `pip install evoc`) can automatically recover a
**known, planted multi-level hierarchy** from embedding vectors — as a feasibility spike
for replacing this lab's hand-rolled flat CNM communities with an automatic,
multi-granularity cluster tree.

Concretely, you will:

1. **Part A** — build a small Python pipeline (`tools/evoc-spike/`) that generates a
   mocked corpus of **800 knowledge artifacts** shaped like what the
   KnowledgeNetwork-Infra LangGraph deployment would accumulate (pipelines → stages →
   topics, details below), gives each item a synthetic embedding vector with that
   hierarchy planted in it, runs EVoC + UMAP, scores EVoC's layers against the planted
   truth (ARI/NMI), and writes one JSON artifact into `src/experiments/data/`.
2. **Part B** — add a new tab **"EVoC"** to the existing Graph Disclosure Lab
   (`src/experiments/Shell.tsx`) with a new view `src/experiments/EvocView.tsx`: a
   pannable/zoomable scatter of the 800 items, a "color by" switch (each EVoC layer vs
   each planted level), and a metrics table.
3. **Part C** — verify everything (commands + headless-browser protocol below) and write
   an honest results report.

**This is an experiment, not a feature.** A negative result (EVoC fails to recover the
hierarchy) is a fully successful spike — report it as-is.

## 1 · Verified environment facts (do not re-derive)

- Windows 11, PowerShell primary. Repo: `D:\ShiZhong\MyCode\KnowledgeNetworkThesisDemo`
  (Vite + React 19 + TS + Tailwind v4).
- `uv 0.8.0` installed. System Python is 3.10.11. Use `uv` for all Python work.
- Dev server: `npm run dev` → http://localhost:3000. It may already be running — check
  before starting a second one.
- `playwright-core` is already in devDependencies; **Edge** is installed — launch with
  `channel: 'msedge'`. (Full `playwright` is NOT installed; no bundled browsers.)
- Verify commands that exist today: `npx tsc -b`, `npm run lint`.
  (`npm run verify` also runs `map`/`spec-gate`/DocHub validation — you don't need it.)
- EVoC facts, confirmed from the README on 2026-07-08:
  - `pip install evoc`; deps: numpy, scikit-learn, numba, tqdm, tbb. **Early beta.**
  - sklearn-style API:

    ```python
    import evoc
    clusterer = evoc.EVoC()
    cluster_labels = clusterer.fit_predict(data)   # data: (n, d) float array
    cluster_layers = clusterer.cluster_layers_     # list of label vectors, FINEST first
    hierarchy = clusterer.cluster_tree_            # cross-layer hierarchy (format undocumented)
    potential_duplicates = clusterer.duplicates_
    ```
  - HDBSCAN lineage → expect **noise labels `-1`** inside layers.
  - First call is slow (numba JIT, possibly 30–60 s). Use generous Bash timeouts
    (≥ 300000 ms). Do not kill it early.

## 2 · Read these before writing code

- `src/experiments/Shell.tsx` — tab wiring you will extend (tab ids, TABS array, main render).
- `src/experiments/MapView.tsx` — ONLY for two proven patterns you should copy:
  the non-passive wheel-zoom + pointer-drag pan (ref + `useEffect`; **never** read refs
  during render — the eslint react-hooks config enforces this) and the HUD/panel styling idiom.
- `src/experiments/flat.ts` — naming vocabulary style of the existing corpus (for
  flavor consistency in generated titles/text).
- `tsconfig.app.json` — check `compilerOptions.resolveJsonModule`; add `true` if missing
  (EvocView statically imports the JSON artifact).

Do NOT modify `MapView.tsx`, `flat.ts`, `graph.ts`, `WalkView.tsx`,
`OverviewDetailView.tsx`, `ContourView.tsx`, or anything under `wiki/` (deprecated).
Shell.tsx gets only the minimal tab addition.

## 3 · The experiment design

### 3.1 The mocked Infra hierarchy (real names, verified from the Infra repo)

The corpus mimics artifacts accumulated by KnowledgeNetwork-Infra's four LangGraph
pipelines. Use these **exact** level vocabularies:

**Level `graph`** (4 values, with corpus share): `design` 40% · `slice` 30% ·
`skeleton` 20% · `ingest` 10%.

**Level `stage`** (15 values, namespaced `graph/stage`):

| graph | stages (in order) |
|---|---|
| design | `goal`, `problem`, `idea`, `decision`, `spec` |
| slice | `plan`, `build`, `verify`, `merge` |
| skeleton | `draft`, `gate`, `sync` |
| ingest | `capture`, `distill`, `record` |

**Level `topic`** (10 values — the subject matter an item is about, cross-cutting all
graphs): `event-bus`, `node-repository`, `type-registry`, `embedding-builder`,
`query-parser`, `graph-canvas`, `session-console`, `dochub-pipeline`,
`auth-and-config`, `telemetry`.

**Level `session`** (negative control): items are generated in sessions (below) and
carry a session id, but session identity contributes **nothing** to the vector. We
expect ARI ≈ 0 against sessions — it demonstrates "what the embedding doesn't encode,
clustering cannot find." Do not "fix" this.

**Artifact `kind`** (metadata only, for tooltips): derive from (graph, stage) — e.g.
design/decision → `decision-page`, design/goal → `goal-page`, slice/verify →
`verify-log`, slice/merge → `pr-review`, skeleton/draft → `doc-draft`, ingest/record →
`ingest-record`, plus `session-log` sprinkled anywhere. Exact mapping is your choice;
keep it deterministic.

### 3.2 Corpus generator (pure Python, seeded, no LLM, no network)

Session-based generation with `random.Random(seed)`:

1. Repeat until `n` items exist: open a session — pick a `graph` by the shares above,
   a home `topic` (uniform), a session id `s-{graph}-{seq:03d}`.
2. Walk that graph's stages in order; at each stage emit 1–3 items (skip a stage with
   p=0.15). Cap items per session at 12.
3. Each item: 85% chance topic = session's home topic, 15% a random other topic
   (topic bleed — keeps it honest).
4. Title + 2–3 sentence text from templates: stage-specific verb phrases × topic
   vocabulary (give each topic 6–10 domain terms, in the flavor of `flat.ts` names) ×
   kind phrases. ~150–260 chars. Truncate to 240 chars in the JSON. The text is for
   tooltips and a future real-embedder track — **vectors are synthetic** (below), so no
   embedding model is needed. This is deliberate: it decouples the spike from model
   downloads and gives exact ground truth.

### 3.3 Vector model (the planted hierarchy)

Dimension `d = 256`, `numpy.random.default_rng(seed)`:

- Draw unit-norm center vectors: one per graph `C_g`, one per (graph, stage) `C_s`,
  one per topic `C_t` (all independent Gaussians, normalized).
- Item vector: `v = wg·C_g + ws·C_s + wt·C_t + ε`, where `ε` is a Gaussian vector
  **rescaled to exact norm** `wn`. Then L2-normalize `v`.
- Session contributes nothing (negative control).

### 3.4 Three mix conditions (run all three)

| mix | wg | ws | wt | wn | expectation |
|---|---|---|---|---|---|
| `balanced` (default) | 1.0 | 0.8 | 0.8 | 0.9 | competing structure — the realistic case |
| `process` | 1.2 | 1.0 | 0.35 | 0.9 | coarse layer ≈ graph, finer layer ≈ stage |
| `topic` | 0.35 | 0.3 | 1.2 | 0.9 | some layer ≈ topic; graph/stage unrecoverable |

Only `balanced` writes the JSON artifact for the frontend; the other two run with
`--no-write` and their metric tables go in the report.

## 4 · Part A — `tools/evoc-spike/` (Python)

Layout:

```
tools/evoc-spike/
  pyproject.toml
  pipeline.py          # everything: corpus → vectors → EVoC → tree → UMAP → metrics → JSON
  .gitignore           # .venv/  __pycache__/  out/
  RESULTS.md           # you write this at the end (report template in §9)
  shots-evoc.mjs       # part C browser script; screenshots into out/
```

`pyproject.toml`:

```toml
[project]
name = "evoc-spike"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
  "evoc",
  "umap-learn",
  "numpy",
  "scikit-learn",
]
```

Setup: `cd tools/evoc-spike` then `uv sync`. If numba/tbb wheels fail on Python 3.10,
run `uv python install 3.12`, set `requires-python = ">=3.12"`, `uv sync` again. If EVoC
itself still fails to import or crashes in `fit_predict`, **stop Part A, record the
exact traceback in RESULTS.md, and still build Part B against a checked-in fallback**:
generate the JSON with planted labels only and an `evoc.layers = []` — then report.
Do not patch around a broken library.

`pipeline.py` (argparse: `--n 800 --seed 42 --mix balanced --no-write`, out path
defaulting to `../../src/experiments/data/evocRun.json`):

1. Generate corpus (§3.2) and vectors (§3.3).
2. `evoc.EVoC().fit_predict(vectors)`. Before fitting, print
   `inspect.signature(evoc.EVoC.__init__)` and the installed evoc version; if the
   signature has a seed-like parameter (`random_state`, `random_seed`, …), pass 42 and
   note it. Use defaults otherwise.
3. Collect `cluster_layers_` (coerce each to `list[int]`; **finest first** per README).
   Guard: if it's missing/empty, fall back to the single `fit_predict` labels as one layer.
4. **Derive the cross-layer tree yourself** (do NOT parse `cluster_tree_` — undocumented
   beta format; just `repr()` its first ~500 chars into RESULTS.md for the record).
   Overlap rule: for consecutive layers (i finer, i+1 coarser), parent of fine cluster
   `c` = the coarse cluster with the largest member overlap (ignore noise points).
   Emit edges `{layer, cluster, parentLayer, parentCluster}`.
5. UMAP: `umap.UMAP(n_components=2, metric="cosine", random_state=seed)`, then min-max
   scale positions into x ∈ [40, 960], y ∈ [40, 580].
6. Metrics: for every EVoC layer × every planted level (graph, stage, topic, session):
   `adjusted_rand_score` and `normalized_mutual_info_score` computed **over non-noise
   points only**; also record `nClusters` (excluding −1) and `noisePct` per layer.
   Print one aligned table per run to stdout.
7. Asserts before writing: every layer has exactly n labels; ≥1 layer; if ≥2 layers,
   coarsest has fewer clusters than finest; no NaN metrics. Write JSON (§4.1) unless
   `--no-write`; always print the table.

### 4.1 JSON contract (frontend consumes exactly this)

```ts
interface EvocRun {
  meta: { seed: number; n: number; d: number; mix: string; generatedAt: string;
          evocVersion: string; layersNote: 'finest-first' }
  levels: { graph: string[]; stage: string[]; topic: string[] }   // label vocabularies
  items: Array<{ id: string; label: string; kind: string;
                 graph: number; stage: number; topic: number;     // indices into levels
                 session: string; text: string; x: number; y: number }>
  evoc: { layers: Array<{ nClusters: number; noisePct: number; labels: number[] }> }
  tree: Array<{ layer: number; cluster: number; parentLayer: number; parentCluster: number }>
  metrics: Array<{ layer: number; nClusters: number; noisePct: number;
                   vs: Array<{ level: 'graph'|'stage'|'topic'|'session';
                               ari: number; nmi: number }> }>
}
```

Keep the file under ~1 MB (240-char texts keep 800 items well inside that).

## 5 · Part B — the frontend tab

### 5.1 Shell wiring (minimal diff)

In `src/experiments/Shell.tsx`: extend `type Tab` with `'evoc'`, append one TABS entry —
label `EVoC`, hint `can auto-clustering recover our pipeline? — 800 mocked Infra
artifacts` — and one line in `<main>`: `{tab === 'evoc' && <EvocView />}`. No props, no
shared walk/route state, header legend untouched.

### 5.2 `src/experiments/EvocView.tsx`

- `import run from './data/evocRun.json'` (add `resolveJsonModule` to tsconfig.app.json
  if missing). Type it via the §4.1 interface (author the interface in the file and cast).
- **Scatter**: one SVG, viewBox `0 0 1000 620`, dots r≈3, opacity 0.85. Pan (pointer
  drag) + wheel zoom copied from MapView's pattern (non-passive wheel listener attached
  in `useEffect` via ref; zoom range ~[0.7, 6]).
- **Color-by control** (button row, exactly one active):
  - one button per EVoC layer: `L0 · {nClusters} clusters` … (finest → coarsest),
  - one per planted level: `graph (4)`, `stage (15)`, `topic (10)`, `session`.
  - Default active: the **coarsest** EVoC layer.
  - Colors: golden-angle HSL `hsl((idx*137.508)%360, 70%, 52%)`; noise (−1) → `#9aa0a6`.
    For `session`, hash the id to an index.
- **Metrics panel** (fixed, right side or bottom): a table — rows = EVoC layers, columns
  = graph/stage/topic/session, cell = ARI to 3 decimals (NMI smaller beneath), bold the
  row's max ARI; plus per-row nClusters and noise %. One caption line explaining ARI:
  "1 = perfect recovery of the planted level, 0 = random."
- **Hover tooltip**: label, kind, `graph/stage`, topic, session, EVoC cluster under the
  current coloring, first ~160 chars of text.
- No Voronoi, no hulls, no semantic zoom, no edges — this view answers one question:
  *do EVoC's layers line up with the planted levels?* (Hulls/contours are a later phase.)

### 5.3 Quality bars

`npx tsc -b` clean, `npm run lint` clean. Follow the existing views' style: function
component, Tailwind utility classes, sparse comments only where the code can't say it
(e.g. why metrics exclude noise points).

## 6 · Part C — verification protocol (run in this order)

```powershell
cd D:\ShiZhong\MyCode\KnowledgeNetworkThesisDemo\tools\evoc-spike
uv sync
uv run python pipeline.py --n 800 --seed 42 --mix balanced          # writes the JSON
uv run python pipeline.py --n 800 --seed 42 --mix process --no-write
uv run python pipeline.py --n 800 --seed 42 --mix topic   --no-write
cd ..\..
npx tsc -b
npm run lint
```

Then the browser check. If http://localhost:3000 isn't already serving, start
`npm run dev` in the background first. `shots-evoc.mjs` (run with
`node tools/evoc-spike/shots-evoc.mjs`), following the project's proven pattern:

```js
import { createRequire } from 'node:module'
const require = createRequire('D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo/package.json')
const { chromium } = require('playwright-core')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1750, height: 950 } })
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })
await page.goto('http://localhost:3000')
// click the EVoC tab, screenshot; click 2–3 color-by buttons (a planted level and an
// EVoC layer), screenshot each into tools/evoc-spike/out/; finally page.evaluate the
// metrics table's textContent and console.log it (ground truth, not just pixels).
// Exit nonzero if errors.length > 0.
```

Screenshots to capture: default (coarsest EVoC layer), `graph` coloring, `stage`
coloring. Then LOOK at them (Read the PNGs) and confirm: dots render, colors switch,
metrics table populated.

## 7 · Science rules

- **Do not tune the generator to make metrics look good.** Weights in §3.4 are frozen.
  If results are poor, that's the finding; report it.
- Run all three mixes; report all three tables.
- Expected sanity signals (if these fail, suspect your code before suspecting EVoC):
  `process` mix should score high ARI (> ~0.6) for graph or stage at *some* layer;
  `session` should be ≈ 0 everywhere; `balanced` is the genuinely open question.
- Record: evoc version, EVoC() signature, layer count, per-layer cluster counts, run
  time, and any warnings — in RESULTS.md.
- EVoC label assignments may vary slightly run-to-run (numba parallelism); the written
  JSON is the frozen artifact of record, so the UI stays deterministic.

## 8 · Hard constraints

- **No git commits, no pushes.** Leave everything in the working tree.
- Only new files, plus the two edits: Shell.tsx (tab) and possibly tsconfig.app.json
  (`resolveJsonModule`). Nothing else in `src/` changes.
- No DocHub edits, no `wiki/` edits, no changes in KnowledgeNetwork-Infra.
- Keep all Python inside `tools/evoc-spike/` (own venv via uv; never install into the
  Infra venv or system Python).

## 9 · Report-back

Write `tools/evoc-spike/RESULTS.md`:

```
# EVoC Spike Results — <date>
Environment: evoc <version>, python <version>, EVoC signature: <...>
Corpus: n=800 seed=42 (sessions: <count>, items/graph: design/slice/skeleton/ingest = <counts>)

## Metrics — balanced        (and repeat for process / topic)
| layer | nClusters | noise% | ARI graph | ARI stage | ARI topic | ARI session |
(NMI table or parenthetical values as well)

## Reading
- Which EVoC layer best matches which planted level, per mix — 3–5 sentences.
- Negative control (session) held? Noise behavior?
- cluster_tree_ raw repr (first 500 chars): <...>

## Verification
- commands run + outcomes (tsc, lint, pipeline runs, browser script)
- screenshots: out/<files> — one line each on what they show

## Deviations & open questions
```

Your final message to the user: lead with the verdict (did EVoC recover the hierarchy,
and at which layers), then the balanced-mix table, then anything that broke. Honesty
over polish.
