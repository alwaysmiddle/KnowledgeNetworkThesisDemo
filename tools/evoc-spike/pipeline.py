# Mock Infra corpus -> synthetic vectors with a planted graph/stage/topic
# hierarchy -> EVoC -> derived cross-layer tree -> UMAP -> ARI/NMI vs the
# planted truth -> JSON for the EvocView frontend. See HANDOFF-EVOC-SPIKE.md
# at the repo root for the full experiment design this implements.
import argparse
import importlib.metadata
import inspect
import json
import math
import random
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

GRAPHS = ["design", "slice", "skeleton", "ingest"]
GRAPH_SHARE = {"design": 0.40, "slice": 0.30, "skeleton": 0.20, "ingest": 0.10}

STAGES = {
    "design": ["goal", "problem", "idea", "decision", "spec"],
    "slice": ["plan", "build", "verify", "merge"],
    "skeleton": ["draft", "gate", "sync"],
    "ingest": ["capture", "distill", "record"],
}

TOPICS = [
    "event-bus", "node-repository", "type-registry", "embedding-builder",
    "query-parser", "graph-canvas", "session-console", "dochub-pipeline",
    "auth-and-config", "telemetry",
]

STAGE_LIST = [f"{g}/{s}" for g in GRAPHS for s in STAGES[g]]  # 15, namespaced
GRAPH_INDEX = {g: i for i, g in enumerate(GRAPHS)}
STAGE_INDEX = {s: i for i, s in enumerate(STAGE_LIST)}
TOPIC_INDEX = {t: i for i, t in enumerate(TOPICS)}

KIND_BY_GRAPH_STAGE = {
    ("design", "goal"): "goal-page",
    ("design", "problem"): "problem-page",
    ("design", "idea"): "idea-page",
    ("design", "decision"): "decision-page",
    ("design", "spec"): "spec-page",
    ("slice", "plan"): "slice-plan",
    ("slice", "build"): "build-log",
    ("slice", "verify"): "verify-log",
    ("slice", "merge"): "pr-review",
    ("skeleton", "draft"): "doc-draft",
    ("skeleton", "gate"): "gate-note",
    ("skeleton", "sync"): "sync-log",
    ("ingest", "capture"): "capture-note",
    ("ingest", "distill"): "distill-note",
    ("ingest", "record"): "ingest-record",
}

STAGE_VERBS = {
    "goal": ["frames the goal for", "states the target outcome of", "sets the north star for"],
    "problem": ["names the problem behind", "diagnoses friction in", "surfaces a gap in"],
    "idea": ["proposes an approach to", "sketches an option for", "explores a direction for"],
    "decision": ["locks in the decision on", "resolves the tradeoff in", "commits to an approach for"],
    "spec": ["specifies the contract for", "pins down the behavior of", "writes the wire format for"],
    "plan": ["scopes the slice for", "breaks down the work on", "plans the build order for"],
    "build": ["implements", "wires up", "builds out"],
    "verify": ["runs verification against", "checks the test coverage of", "validates the behavior of"],
    "merge": ["reviews the PR for", "reconciles the merge of", "closes out the slice on"],
    "draft": ["drafts the skeleton doc for", "writes a first pass on", "outlines the shape of"],
    "gate": ["holds the human gate on", "flags for review the state of", "checkpoints progress on"],
    "sync": ["syncs the generated doc for", "pushes the update for", "reconciles docs with"],
    "capture": ["captures a raw session on", "records the interaction around", "logs the raw trace of"],
    "distill": ["distills the session notes on", "extracts the signal from", "summarizes the thread on"],
    "record": ["files the ingest record for", "commits the distilled note on", "archives the record of"],
}

# Domain terms per topic, in the flavor of the lab's flat.ts hub names
# (event-bus, node-repository, ... are literally shared with that corpus).
TOPIC_TERMS = {
    "event-bus": ["dispatch queue", "event envelope", "subscriber registry", "retry backoff", "dead-letter path", "publish latency", "topic partition", "consumer offset"],
    "node-repository": ["node store", "revision history", "content hash", "compaction pass", "index shard", "write-ahead log", "snapshot cursor", "orphan sweep"],
    "type-registry": ["type schema", "field constraint", "migration script", "registry cache", "validator chain", "enum drift", "type alias", "compat matrix"],
    "embedding-builder": ["vector store", "batch encoder", "similarity index", "chunk window", "embedding drift", "model checkpoint", "cosine threshold", "reindex job"],
    "query-parser": ["grammar rule", "token stream", "AST node", "parse error", "operator precedence", "query plan", "syntax fixture", "lexer state"],
    "graph-canvas": ["layout pass", "viewport transform", "hit testing", "render batch", "edge routing", "zoom level", "selection state", "pan inertia"],
    "session-console": ["session log", "stage cursor", "human gate", "handoff payload", "console panel", "replay buffer", "live tail", "state snapshot"],
    "dochub-pipeline": ["doc sync", "frontmatter check", "link validator", "sidebar generator", "page diff", "publish hook", "stale-doc sweep", "cross-reference"],
    "auth-and-config": ["token scope", "config layer", "secret rotation", "permission grant", "env override", "session key", "policy rule", "audit entry"],
    "telemetry": ["trace span", "metric bucket", "latency histogram", "sample rate", "dashboard panel", "alert threshold", "log correlation", "counter reset"],
}

MIXES = {
    "balanced": {"wg": 1.0, "ws": 0.8, "wt": 0.8, "wn": 0.9},
    "process": {"wg": 1.2, "ws": 1.0, "wt": 0.35, "wn": 0.9},
    "topic": {"wg": 0.35, "ws": 0.3, "wt": 1.2, "wn": 0.9},
}

D = 256


def kind_for(rng, g, stage):
    if rng.random() < 0.08:
        return "session-log"
    return KIND_BY_GRAPH_STAGE[(g, stage)]


def make_item(rng, idx, g, stage, topic, session_id):
    stage_key = f"{g}/{stage}"
    kind = kind_for(rng, g, stage)
    verb = rng.choice(STAGE_VERBS[stage])
    terms = TOPIC_TERMS[topic]
    t1 = rng.choice(terms)
    t2 = rng.choice([t for t in terms if t != t1])
    label = f"{stage_key} · {topic}: {t1}"
    text = (
        f"This {kind.replace('-', ' ')} {verb} {topic.replace('-', ' ')} in {g}. "
        f"It touches the {t1} and weighs {t2} before the next stage. "
        f"({session_id}, {stage_key})"
    )[:240]
    return {
        "id": f"item-{idx:04d}",
        "label": label,
        "kind": kind,
        "graph": g,
        "graph_idx": GRAPH_INDEX[g],
        "stage_key": stage_key,
        "stage_idx": STAGE_INDEX[stage_key],
        "topic": topic,
        "topic_idx": TOPIC_INDEX[topic],
        "session": session_id,
        "text": text,
    }


def generate_corpus(n, seed):
    rng = random.Random(seed)
    items = []
    seq_by_graph = {g: 0 for g in GRAPHS}
    n_sessions = 0
    graphs_pop = GRAPHS
    graphs_w = [GRAPH_SHARE[g] for g in GRAPHS]

    while len(items) < n:
        g = rng.choices(graphs_pop, weights=graphs_w, k=1)[0]
        seq_by_graph[g] += 1
        session_id = f"s-{g}-{seq_by_graph[g]:03d}"
        home_topic = rng.choice(TOPICS)
        n_sessions += 1
        session_items = 0

        for stage in STAGES[g]:
            if len(items) >= n:
                break
            if rng.random() < 0.15:  # stage skipped this session
                continue
            k = rng.choice([1, 2, 3])
            for _ in range(k):
                if session_items >= 12 or len(items) >= n:
                    break
                topic = home_topic if rng.random() < 0.85 else rng.choice(TOPICS)
                items.append(make_item(rng, len(items), g, stage, topic, session_id))
                session_items += 1

    return items, n_sessions


def build_vectors(items, seed, mix):
    rng = np.random.default_rng(seed)
    w = MIXES[mix]

    def unit_vectors(count):
        v = rng.normal(size=(count, D))
        return v / np.linalg.norm(v, axis=1, keepdims=True)

    c_g = unit_vectors(len(GRAPHS))
    c_s = unit_vectors(len(STAGE_LIST))
    c_t = unit_vectors(len(TOPICS))

    n = len(items)
    vectors = np.zeros((n, D))
    for i, it in enumerate(items):
        eps = rng.normal(size=D)
        eps = eps / np.linalg.norm(eps) * w["wn"]  # rescaled to EXACT norm wn
        v = w["wg"] * c_g[it["graph_idx"]] + w["ws"] * c_s[it["stage_idx"]] + w["wt"] * c_t[it["topic_idx"]] + eps
        vectors[i] = v / np.linalg.norm(v)
    return vectors


def derive_tree(layers):
    # cluster_tree_'s cross-layer format is undocumented beta; instead, parent
    # of fine cluster c = whichever coarse cluster shares the most members
    # with it (noise points excluded on both sides).
    edges = []
    for i in range(len(layers) - 1):
        fine, coarse = layers[i], layers[i + 1]
        members_by_cluster: dict[int, list[int]] = {}
        for k, lab in enumerate(fine):
            if lab == -1:
                continue
            members_by_cluster.setdefault(lab, []).append(k)
        for c, member_idxs in members_by_cluster.items():
            counts: dict[int, int] = {}
            for k in member_idxs:
                cl = coarse[k]
                if cl == -1:
                    continue
                counts[cl] = counts.get(cl, 0) + 1
            if not counts:
                continue
            parent = max(counts.items(), key=lambda kv: kv[1])[0]
            edges.append({"layer": i, "cluster": int(c), "parentLayer": i + 1, "parentCluster": int(parent)})
    return edges


def compute_metrics(layers, planted):
    from sklearn.metrics import adjusted_rand_score, normalized_mutual_info_score

    results = []
    for li, layer in enumerate(layers):
        layer_arr = np.array(layer)
        noise_mask = layer_arr != -1
        n_clusters = len(set(layer_arr[noise_mask].tolist()))
        noise_pct = 100.0 * (1 - noise_mask.sum() / len(layer_arr))
        vs = []
        for level_name, truth in planted.items():
            truth_arr = np.asarray(truth, dtype=object)
            if noise_mask.sum() < 2:
                ari = nmi = float("nan")
            else:
                yt = truth_arr[noise_mask]
                yp = layer_arr[noise_mask]
                ari = float(adjusted_rand_score(yt, yp))
                nmi = float(normalized_mutual_info_score(yt, yp))
            vs.append({"level": level_name, "ari": ari, "nmi": nmi})
        results.append({"layer": li, "nClusters": n_clusters, "noisePct": noise_pct, "vs": vs})
    return results


def print_metrics_table(mix, metrics):
    levels = ("graph", "stage", "topic", "session")
    print(f"\n-- metrics ({mix}) --")
    print(f"{'layer':>5} {'nClust':>7} {'noise%':>7} | " + " ".join(f"ARI {lv:<7}" for lv in levels))
    for m in metrics:
        vs = {v["level"]: v for v in m["vs"]}
        row = f"{m['layer']:>5} {m['nClusters']:>7} {m['noisePct']:>6.1f}% | "
        row += " ".join(f"{vs[lv]['ari']:>10.3f} " for lv in levels)
        print(row)
    print(f"{'layer':>5} {'nClust':>7} {'noise%':>7} | " + " ".join(f"NMI {lv:<7}" for lv in levels))
    for m in metrics:
        vs = {v["level"]: v for v in m["vs"]}
        row = f"{m['layer']:>5} {m['nClusters']:>7} {m['noisePct']:>6.1f}% | "
        row += " ".join(f"{vs[lv]['nmi']:>10.3f} " for lv in levels)
        print(row)


def json_default(o):
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.floating):
        return float(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    raise TypeError(f"not JSON serializable: {type(o)!r}")


def write_fallback(out_path, items, n, seed, mix):
    payload = {
        "meta": {
            "seed": seed, "n": n, "d": D, "mix": mix,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "evocVersion": "unavailable (EVoC import/fit failed — see RESULTS.md)",
            "layersNote": "finest-first",
        },
        "levels": {"graph": GRAPHS, "stage": STAGE_LIST, "topic": TOPICS},
        "items": [
            {
                "id": it["id"], "label": it["label"], "kind": it["kind"],
                "graph": it["graph_idx"], "stage": it["stage_idx"], "topic": it["topic_idx"],
                "session": it["session"], "text": it["text"], "x": 0.0, "y": 0.0,
            }
            for it in items
        ],
        "evoc": {"layers": []},
        "tree": [],
        "metrics": [],
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, default=json_default)
    print(f"[fallback] wrote {out_path} with evoc.layers = [] (see RESULTS.md contingency)")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n", type=int, default=800)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--mix", choices=list(MIXES), default="balanced")
    parser.add_argument("--no-write", action="store_true")
    parser.add_argument("--out", type=str, default=None)
    args = parser.parse_args()

    out_path = Path(args.out) if args.out else Path(__file__).resolve().parent.parent.parent / "src" / "experiments" / "data" / "evocRun.json"

    items, n_sessions = generate_corpus(args.n, args.seed)
    counts_by_graph = {g: sum(1 for it in items if it["graph"] == g) for g in GRAPHS}
    print(f"corpus: n={len(items)} sessions={n_sessions} items/graph={counts_by_graph}")

    vectors = build_vectors(items, args.seed, args.mix)

    try:
        import evoc
    except Exception:
        print("EVoC import failed:")
        traceback.print_exc()
        if not args.no_write:
            write_fallback(out_path, items, args.n, args.seed, args.mix)
        return

    try:
        evoc_version = importlib.metadata.version("evoc")
    except Exception:
        evoc_version = getattr(evoc, "__version__", "unknown")
    sig = inspect.signature(evoc.EVoC.__init__)
    print(f"evoc version: {evoc_version}")
    print(f"EVoC.__init__ signature: {sig}")

    kwargs = {}
    for cand in ("random_state", "random_seed", "seed"):
        if cand in sig.parameters:
            kwargs[cand] = args.seed
            print(f"passing seed via '{cand}'")
            break

    try:
        t0 = time.time()
        clusterer = evoc.EVoC(**kwargs)
        labels = clusterer.fit_predict(vectors)
        fit_seconds = time.time() - t0
        print(f"fit_predict: {fit_seconds:.1f}s")
    except Exception:
        print("EVoC fit_predict failed:")
        traceback.print_exc()
        if not args.no_write:
            write_fallback(out_path, items, args.n, args.seed, args.mix)
        return

    layers = getattr(clusterer, "cluster_layers_", None)
    if not layers:
        print("cluster_layers_ missing/empty; falling back to fit_predict labels as one layer")
        layers = [labels]
    layers = [[int(x) for x in np.asarray(lyr).tolist()] for lyr in layers]

    duplicates = getattr(clusterer, "duplicates_", None)
    print(f"duplicates_: {len(duplicates) if duplicates is not None else 'n/a'}")
    tree_repr = repr(getattr(clusterer, "cluster_tree_", None))[:500]
    print(f"cluster_tree_ repr (first 500 chars): {tree_repr}")

    tree = derive_tree(layers)

    planted = {
        "graph": [it["graph_idx"] for it in items],
        "stage": [it["stage_idx"] for it in items],
        "topic": [it["topic_idx"] for it in items],
        "session": [it["session"] for it in items],
    }
    metrics = compute_metrics(layers, planted)
    print_metrics_table(args.mix, metrics)

    # -- sanity asserts before writing (§7: frozen weights, no tuning to pass these) --
    n = len(items)
    assert len(layers) >= 1, "EVoC returned no layers"
    for lyr in layers:
        assert len(lyr) == n, f"layer length {len(lyr)} != n {n}"
    if len(layers) >= 2:
        finest_k = len(set(layers[0]) - {-1})
        coarsest_k = len(set(layers[-1]) - {-1})
        assert coarsest_k < finest_k, f"coarsest ({coarsest_k}) should have fewer clusters than finest ({finest_k})"
    for m in metrics:
        for v in m["vs"]:
            assert not math.isnan(v["ari"]) and not math.isnan(v["nmi"]), f"NaN metric at layer {m['layer']} vs {v['level']}"

    if args.no_write:
        print(f"--no-write: skipping JSON output for mix={args.mix}")
        return

    import umap

    t0 = time.time()
    reducer = umap.UMAP(n_components=2, metric="cosine", random_state=args.seed)
    xy = reducer.fit_transform(vectors)
    print(f"UMAP: {time.time() - t0:.1f}s")
    x, y = xy[:, 0], xy[:, 1]
    x = 40 + (x - x.min()) / (x.max() - x.min() + 1e-12) * (960 - 40)
    y = 40 + (y - y.min()) / (y.max() - y.min() + 1e-12) * (580 - 40)

    payload = {
        "meta": {
            "seed": args.seed, "n": n, "d": D, "mix": args.mix,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "evocVersion": evoc_version,
            "layersNote": "finest-first",
        },
        "levels": {"graph": GRAPHS, "stage": STAGE_LIST, "topic": TOPICS},
        "items": [
            {
                "id": it["id"], "label": it["label"], "kind": it["kind"],
                "graph": it["graph_idx"], "stage": it["stage_idx"], "topic": it["topic_idx"],
                "session": it["session"], "text": it["text"],
                "x": float(x[i]), "y": float(y[i]),
            }
            for i, it in enumerate(items)
        ],
        "evoc": {
            "layers": [
                {
                    "nClusters": len(set(lyr) - {-1}),
                    "noisePct": 100.0 * sum(1 for v in lyr if v == -1) / len(lyr),
                    "labels": lyr,
                }
                for lyr in layers
            ]
        },
        "tree": tree,
        "metrics": metrics,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, default=json_default)
    print(f"wrote {out_path} ({out_path.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
