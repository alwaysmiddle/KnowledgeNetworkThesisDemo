# Phase 3 — Layered Views Design
**Status:** Design reference — Stage 6 revisit needed for current namespaces and API contracts
**Last Updated:** 2026-04-15
**Depends on:** KNOWLEDGE_NODE_MODEL.md, phase-1-domain-data/DOMAIN_DATA_DESIGN.md, phase-2-type-system/TYPE_SYSTEM_DESIGN.md

---

## What This Phase Covers

The visual layer system that drives both the **WorldMap overview** and the **compound graph detail view**. This phase defines how nodes are grouped, how groups are rendered, and how the professor navigates between levels of detail.

Stage 6 should preserve the EVōC-as-layout intent here while keeping it separate from ADR-007's EVōC + CSO categorization pipeline.

---

## Core Architecture: EVōC Primary, Node-Type Secondary

The layered view has two orthogonal axes:

| Axis | What it controls | Source |
|---|---|---|
| **EVōC clustering** (primary) | Spatial layout and group boundaries — which nodes are near each other, what region they belong to | Computed from embedding vectors via EVōC multi-granularity clustering |
| **Node-type filter** (secondary) | Visibility — which node types are shown/hidden | User-controlled toggle (Level 1–4) |

**Key property:** The spatial layout is stable across visibility changes. When a professor toggles from Level 4 to Level 1 (hiding Examples, Assessments, References, Analogies), the remaining Concept and Principle nodes stay in their EVōC-determined positions. No layout thrashing.

---

## The Pipeline: Embed → Cluster → Name

A Python microservice handles the full Tutte Institute pipeline:

```
Node texts (label + description)
       │
       ▼
┌─────────────────────────┐
│  1. Embed               │  nomic-embed-text-v1.5 (local, 550MB)
│     → 768-dim vectors   │  Model-agnostic interface (swappable)
├─────────────────────────┤
│  2. EVōC Cluster        │  Multi-granularity clustering
│     → cluster_layers_   │  Fine → coarse layers
│     → cluster_tree_     │  Hierarchy across layers
├─────────────────────────┤
│  3. Toponymy            │  Cheap LLM (GPT-4.1-mini / Haiku)
│     → cluster labels    │  Human-readable names per cluster
└─────────────────────────┘
       │
       ▼
Cached by C# backend — re-run only when graph data changes
```

### Embedding Model

| Property | Value |
|---|---|
| Model | nomic-embed-text-v1.5 |
| Size | ~550 MB (downloaded once, cached locally) |
| Dimensions | 768 |
| License | Apache 2.0 |
| Quality | Near-API quality (competitive with Cohere embed-v3) |
| Speed | ~2 seconds for 500 nodes on CPU |

**Model-agnostic interface:** The embedding step is behind an abstraction. Swapping to Cohere API, OpenAI, or another local model requires changing one config value — no pipeline code changes.

```python
class EmbeddingProvider(Protocol):
    def embed(self, texts: list[str]) -> np.ndarray:
        """Returns (n_texts, embedding_dim) array."""
        ...
```

### EVōC Clustering

EVōC produces **multiple granularity layers** automatically:

```python
clusterer = evoc.EVoC()
cluster_labels = clusterer.fit_predict(embeddings)

cluster_layers = clusterer.cluster_layers_   # list of label arrays (fine → coarse)
hierarchy = clusterer.cluster_tree_          # tree connecting layers
duplicates = clusterer.duplicates_           # near-duplicate detection
```

For 200–500 nodes, expect 4–6 granularity layers. Each layer is a complete assignment of every node to a cluster at that granularity.

**Layer mapping:**
- **Finest layer** → individual topic groups (e.g., "Control Flow", "Data Structures", "Functions")
- **Coarsest layer** → broad themes (e.g., "Fundamentals", "Advanced Concepts")
- **Intermediate layers** → useful for semantic zoom transitions

### Cluster Naming (Toponymy)

Each cluster at each granularity level gets a human-readable name via a cheap LLM call:

**Input:** List of node labels in the cluster
**Prompt:** "Given these Python course topics: [Variable, Data Type, Integer, String, Boolean]. What is a short (2-4 word) category name for this group?"
**Output:** "Basic Data Types"

| Property | Value |
|---|---|
| Model | GPT-4.1-mini or Claude Haiku (cheapest available) |
| Cost | ~$0.01 per full pipeline run (naming ~15 clusters) |
| Fallback | Most central node label as cluster name (zero cost) |

---

## WorldMap Visualization

The WorldMap renders the full graph as an overview, using EVōC cluster assignments to determine spatial grouping.

### Entry and Focus Flow

The application opens on the WorldMap. The user's first experience is the shape of the knowledge territory, not a blank document or a table of nodes.

The WorldMap remains the persistent workspace shell. Opening a node should not feel like leaving the map for a separate editor. Instead, documents and local neighborhoods expand as coordinated focus panels inside the WorldMap workspace.

The expected flow is:

1. **WorldMap entry.** The user starts zoomed out and sees regions, clusters, and major labels.
2. **Zoom/select inspection.** As the user zooms into a region or selects a node, a lightweight focus panel opens with node details: title, type, short body preview, important relationships, and available actions.
3. **Document focus.** When the user opens the node, the focus panel expands into the editable node-document while the WorldMap stays active behind or beside it.
4. **Neighborhood focus.** When the user explores the node's neighborhood, the WorldMap zooms and filters around that node's local context instead of switching to a separate workspace.

The focus panel is for inspection, reading, editing, promotion, and relationship authoring. The map remains the spatial substrate for orientation and traversal. A two-surface layout may still appear visually on desktop, but conceptually it is one coordinated WorldMap workspace, not a segregated map mode and editor mode.

### Three Group Visualization Styles

Based on the Vehlow et al. taxonomy (2017), the WorldMap offers three selectable rendering modes:

| Mode | Description | Best for | Reference |
|---|---|---|---|
| **Disjoint Hierarchical** | Nested regions — coarse clusters contain finer clusters. Tree structure visible. | Seeing the full EVōC hierarchy at once | Vehlow: "embedded, disjoint, hierarchical" |
| **Disjoint Flat** | Side-by-side clusters at one granularity level. No nesting, no overlap. Clean separation. | Comparing clusters of equal importance | Vehlow: "embedded, disjoint, flat" |
| **Overlapping Flat** | Clusters can share visual space. Nodes at cluster boundaries appear in overlap zones. | Seeing semantic ambiguity — nodes that bridge two topics | Vehlow: "embedded, overlapping, flat" |

### Group Coloring

GMap-style colored regions:
- Each cluster gets a distinct fill color (from a categorical palette)
- Region boundaries follow cluster membership
- Nested clusters (in Disjoint Hierarchical mode) use progressively lighter shades of the parent color
- Color assignment is stable across re-renders (deterministic from cluster ID)

### Semantic Zoom (ZMLT-Inspired)

The WorldMap supports ZMLT-style semantic zoom:

| Zoom Level | What's visible |
|---|---|
| **Zoomed out** | Coarsest EVōC layer — large colored regions with cluster names only |
| **Mid zoom** | Intermediate layer — sub-clusters appear within regions |
| **Zoomed in** | Finest layer — individual nodes visible within their cluster regions |
| **Full zoom** | Node details: labels, edges, type badges |

**Transition:** As the professor zooms, the visible EVōC layer changes. Cluster regions smoothly subdivide into finer groups. This mirrors how geographic maps reveal more detail at higher zoom.

---

## Compound Graph Detail View

When the professor clicks into a cluster or zooms deeply enough, the WorldMap resolves into a **compound graph** showing individual nodes and their relationships. This is a deeper focus state of the same workspace, not a separate screen.

### Compound Graph Structure

| Visual Element | Driven by |
|---|---|
| **Container nodes** | EVōC finest-layer clusters (or `generalizes`/`is_component_of` edges) |
| **Leaf nodes** | Individual knowledge nodes |
| **Intra-cluster edges** | Domain edges between nodes in the same cluster |
| **Inter-cluster edges** | Domain edges crossing cluster boundaries (bundled à la Holten) |
| **System edges** | `sys:contains` — muted, toggle-able (existing design) |

### Containment Rules

Two sources of containment can coexist:

1. **EVōC clusters** → semantic grouping (from embeddings)
2. **`generalizes` / `is_component_of` edges** → structural grouping (from authored edges)

When both apply, **authored structure takes priority** within a cluster. EVōC defines which cluster a node belongs to; authored edges define nesting within that cluster.

Example:
- EVōC groups `Data Type`, `Integer`, `String`, `Boolean`, `List`, `Tuple`, `Dictionary` into a "Data Types" cluster
- Within that cluster, `Data Type generalizes Integer` creates a compound containment (Integer nested inside Data Type)
- The professor sees a "Data Types" region containing a `Data Type` container with `Integer`, `String`, etc. nested inside

### Edge Bundling (Holten-Inspired)

For cross-cluster edges (e.g., `Function prerequisite_of Class` where Function is in "Functions" cluster and Class is in "OOP" cluster):
- Edges are bundled along the cluster hierarchy path
- Reduces visual clutter at overview level
- Individual edges become distinguishable as the professor zooms in

---

## Node-Type Filter (Level 1–4)

Operates as a **visibility overlay** on top of the EVōC layout:

| Level | Node Types Visible | Effect |
|---|---|---|
| **Level 1** | Concept + Principle | Sparse view — only core knowledge structure |
| **Level 2** | + Example | Concrete instantiations appear in their cluster positions |
| **Level 3** | + Assessment (exercise format) | Practice tasks appear |
| **Level 4** | + Assessment (test) + Reference + Analogy | All 6 types — full density |

**Spatial stability:** Hidden nodes leave gaps in the layout — they don't cause remaining nodes to reflow. This preserves the professor's spatial mental model across level changes.

**Alternative (compact mode):** Optionally, the layout can re-compact when nodes are hidden, closing gaps. This is a UI toggle, not the default.

---

## Service Architecture

### Python Pipeline Service

| Property | Value |
|---|---|
| Framework | FastAPI |
| Port | 8001 |
| Deployment | Docker container (+ local venv fallback for dev) |
| Dependencies | evoc, sentence-transformers (nomic), numpy, scikit-learn, numba, fastapi, uvicorn |
| Health check | `GET /health` |

### API Endpoints

```
POST /pipeline
  Request:  { nodes: [{ id, text }], config?: { embedding_model?, n_layers? } }
  Response: {
    layers: [
      {
        level: 0,                    // finest
        clusters: [
          { id, name, node_ids: [] }
        ]
      },
      ...                            // coarser layers
    ],
    hierarchy: { ... },              // cluster tree (parent-child across layers)
    embeddings: { node_id: [...] },  // raw vectors (optional, for future use)
    metadata: { model, n_nodes, n_layers, elapsed_ms }
  }
```

```
GET /health
  Response: { status: "ok", model_loaded: true }
```

### Cache Strategy (C# Backend)

- C# backend stores the pipeline result alongside a **content hash** of all node texts
- On graph load: compare current hash with cached hash
- If match → serve cached clusters (no Python call)
- If mismatch → call Python pipeline, cache new result
- Cache invalidation is automatic — no manual clearing needed

---

## Integration with Existing Codebase

### Files to Change

| File | Change |
|---|---|
| `src/data/layerConfig.ts` | Replace `SCHOOL_LAYER_NAMES` + `SCHOOL_RELATIONSHIP_CHAIN` with EVōC layer config |
| `src/lib/computeLayers.ts` | Rewrite — layers now come from EVōC cluster assignments, not relationship traversal |
| `src/lib/filterLayer.ts` | Extend — add node-type visibility filter on top of cluster-based filtering |
| `src/components/WorldMapCanvas.tsx` | Major rework — add 3 group styles, semantic zoom, GMap coloring |
| `src/components/KGNode.tsx` | Add container node style (cluster region) vs leaf node style |
| `src/components/LayerCanvas.tsx` | Compound graph with EVōC + authored structure containment |
| `src/lib/layoutElk.ts` | Extend for compound graphs with cluster containers |
| `src/App.tsx` | Add group style selector, node-type level slider |

### Files to Add

| File | Purpose |
|---|---|
| `src/lib/pipelineClient.ts` | HTTP client calling the Python pipeline service |
| `pipeline/` | Python service directory (FastAPI app, Dockerfile, requirements.txt) |
| `pipeline/app.py` | Main FastAPI application |
| `pipeline/embedding.py` | Model-agnostic embedding provider |
| `pipeline/clustering.py` | EVōC wrapper |
| `pipeline/toponymy.py` | LLM cluster naming |
| `pipeline/Dockerfile` | Container definition |

### Files to Keep

| File | Reuse |
|---|---|
| `src/lib/detectCommunitiesLouvain.ts` | Keep as contrast view (topological vs semantic) |
| `src/lib/layoutWorldMapDagre.ts` | May reuse for Disjoint Flat mode |
| `src/lib/layoutSugiyama.ts` | May reuse for Disjoint Hierarchical mode |
| `src/lib/useLayerTransition.ts` | Keep animation system |
| `src/components/Breadcrumb.tsx` | Keep — relabel for cluster navigation |

---

## Deployment Stack (Updated)

```
React (Vite)        :5173   — Frontend
C# ASP.NET Core     :5000   — Backend API (orchestrator + cache)
Python Pipeline     :8001   — Embed + EVōC + Toponymy
Apache Jena Fuseki  :3030   — OWL inference engine
```

All services in Docker. React dev server runs locally via Vite.

---

## Reference Papers

| Paper | How it informs this design |
|---|---|
| **Vehlow et al. (2017)** — Visualizing Group Structures in Graphs: A Survey | Taxonomy for the 3 WorldMap modes (disjoint hierarchical/flat, overlapping flat) |
| **ZMLT (2019)** — Multi-level tree based approach for interactive graph visualization with semantic zoom | Compound graph semantic zoom model |
| **GMap** — Visualizing Graphs and Clusters as Maps | Colored region rendering for cluster groups |
| **Holten (2006)** — Hierarchical Edge Bundles | Cross-cluster edge bundling technique |
| **Bubble Sets** — Revealing Set Relations with Isocontours | Alternative to hard boundaries for overlapping flat mode |
| **KelpFusion (2013)** — Hybrid Set Visualization | Density-adaptive set visualization for overlapping mode |
| **ima-dt** — Layout of Compound Graphs | Compound graph layout algorithm with cross-hierarchy edges |
| **Overview+Detail (2024)** — Compound Graph Layout | Detail-view expansion model for compound subgraphs |

---

## Design Decisions Log

### 2026-04-15 Session

| Decision | Resolution | Rationale |
|---|---|---|
| Layer source | **EVōC primary, node-type secondary** | Semantic clustering provides meaningful spatial grouping; node-type filter is a visibility toggle on top |
| Embedding model | **nomic-embed-text-v1.5** (local, 550MB, 768-dim) | Free, local, near-API quality, Apache 2.0 license. Model-agnostic interface allows swapping. |
| Cluster naming | **Cheap LLM API** (GPT-4.1-mini or Haiku) | ~$0.01/run for ~15 clusters. Fallback: centroid node label. |
| Pipeline architecture | **All-Python service** (embed + EVōC + toponymy) | Natural sequential pipeline; EVōC is Python-native; avoids cross-language serialization |
| Backend architecture | **Keep C# + Python pipeline service** | ADR-001 stands. C# orchestrates + caches. Python handles ML pipeline. |
| WorldMap styles | **3 modes** — Disjoint Hierarchical, Disjoint Flat, Overlapping Flat | From Vehlow taxonomy. Each serves a different professor inspection need. |
| Compound graph model | **ZMLT-style semantic zoom** | Zoom in reveals local features. Matches map-like exploration mental model. |
| Group coloring | **GMap-style colored regions** | Categorical palette, deterministic assignment, nested shading for hierarchy |
| Python service deployment | **Docker + local venv fallback** | Consistent with Jena Docker pattern. Venv fallback for debugging. |
| Port assignment | **:8001** for Python pipeline | Follows existing port convention (5000 C#, 3030 Jena) |
| Scale target | **200–500 nodes** | Realistic university course scope. EVōC produces 4–6 meaningful layers at this scale. |
