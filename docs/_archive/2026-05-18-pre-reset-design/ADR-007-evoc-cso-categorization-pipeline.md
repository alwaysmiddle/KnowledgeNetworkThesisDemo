# ADR-007: EVōC + CSO Categorization Pipeline

**Status:** Accepted (revised 2026-05-02)
**Date:** 2026-04-28 — original; 2026-05-02 — revised
**Deciders:** Shizhong Yu
**Related:** ADR-003 (reflexivity foundation), ADR-005 (`kn:` scope under Reading A; namespace architecture addendum), VISION.md (§4.8 reflexive substrate, §6 v1 scope)
**Builds on:** ADR-005 namespace architecture addendum

> **2026-05-02 revision summary.** The original ADR framed the pipeline as a one-shot run that would silently mint new concepts on no-match — matching how MILA / GenOM / OLIVE describe their pipelines in the literature. Design discussion surfaced an iterative-feedback concern: a real authoring workflow re-runs the pipeline as the professor adds content, so output triples enter the next run's input set, creating a loop. The revision splits the pipeline into **Bootstrap** (one-shot taxonomy proposal) and **Population** (continuous classification against the existing taxonomy), and gates all writes on user approval. Population's classification mechanism is a **k-NN classifier** against bootstrap-labeled embeddings, replacing an earlier centroid-comparison sketch — the k-NN approach preserves the density structure EVōC built and dissolves the centroid-drift concern (see D2 step 3, D4 Table 1, and Open Questions). Substrate additions remain zero. Original D1, D6 (now D8) preserved unchanged. D2 fully rewritten. D5 (mint-on-no-match) folded into D3's approval gate. Open-questions list expanded.

---

## Context

The original queued question — "Should the substrate include a `Category` type for grouping concepts?" — was reframed during the post-Stage-5 reconciliation. Categories are *not* an authored substrate type. They are *emergent groupings* discovered from authored content by a clustering pipeline, optionally aligned to canonical research ontologies.

This converts the question from "design a `Category` vocabulary" into "design an integration pipeline that produces and grounds emergent categories."

A literature scan covering CSO (Computer Science Ontology), EVōC (Tutte Institute clustering library), and 2025 SOTA LLM ontology-population/matching papers (MILA, GenOM, OLIVE, LLMs4OL Challenge) confirms that the pipeline outlined below is well-grounded and that the thesis demo can claim a small but real novel contribution.

The full literature digest is captured in the Masters thesis Draft 2 notes folder: `evoc-cso-ontology-grounding-pipeline.md`. This ADR records only the design decisions derived from that research.

### Why two pipelines, not one (added 2026-05-02)

The literature treats ontology population and ontology learning as one-shot operations: a fixed input ontology or corpus produces alignments or new concepts in a single pass. A real authoring workflow is iterative — the professor adds content over weeks and re-runs the pipeline. If the pipeline writes new concepts back into the same graph it reads on the next run, output flows back into input. Two failure modes follow:

- **Drift.** Each run sees a slightly different graph, produces slightly different clusters, may rename, merge, or split previously-emitted groupings. The user loses stable categorical structure.
- **Duplication.** A previously-minted concept may be re-clustered alongside its own members on the next run, creating a near-duplicate.

The fix is a separation between two distinct operations that the original pipeline conflated: (a) **bootstrap** the initial taxonomy from a corpus, and (b) **populate** the taxonomy with new content. Bootstrap is a learning operation — runs once (or rarely, deliberately) and produces categorical structure. Population is a placement operation — runs continuously and never invents new groupings without user approval. This pattern matches established practice in domains where stable taxonomy matters: email folders, library catalogs, Spotify playlists. The categorical structure is human-curated with software assistance; routing into the structure is automated against a stable target.

---

## Decisions

### D1 — No `Category` type in the substrate

The substrate does not gain a `knl:Category` (or equivalent) class. Groupings live in the user namespace, typed `skos:Concept`. ADR-005's namespace architecture stands unchanged.

### D2 — Pipeline splits into Bootstrap and Population

**Bootstrap pipeline (one-shot taxonomy proposal):**

1. **Cluster.** EVōC clusters embeddings of authored-node text. Multi-layer hierarchy emerges automatically.
2. **Label.** LLM generates a semantic label for each cluster (zero-shot prompt over the cluster's representative members).
3. **Ground.** Cluster labels embedded with SBERT-class embeddings, retrieved against the curated CSO concept index by cosine similarity, and verified by an LLM binary-decision prompt.
4. **Propose.** Output is a *proposed taxonomy* — a candidate set of groupings, each with a label, member list, and (where applicable) a CSO alignment. Proposals carry PROV-O markers (D5) and surface in the UI for user review.

Bootstrap is invoked deliberately by the user — typically once at initial setup, or as a destructive "re-bootstrap" when the existing taxonomy is no longer fit for purpose.

**Population pipeline (continuous classification against existing taxonomy):**

1. **Trigger.** Authored content change (node added, edited, or deleted).
2. **Embed.** New or edited node's text embedded with the same embedder used in bootstrap.
3. **k-NN classify.** Compute cosine similarity between the new node's embedding and every stored authored-node embedding (the bootstrap-labeled training set). Take the top *k* nearest neighbors (v1: k=5; see Open Questions). Vote by grouping membership — the grouping that appears most often among the top *k* is the candidate classification. Confidence signals: top-1 similarity score and vote margin (proportion of top-*k* sharing the winning grouping).
4. **Threshold-route** per Table 1 in D4: high-confidence matches auto-emit a `dcterms:subject` triple; mid-confidence cases surface in the UI for the user to pick from top candidates; low-confidence cases are flagged "doesn't fit" and accumulated.
5. **Backlog flush.** When the "doesn't fit" backlog crosses a configured size, a mini-bootstrap runs over just those nodes, proposing new groupings to the user. New-grouping proposals follow the same approval gate as bootstrap output.

For deleted nodes, the population step drops both the `dcterms:subject` triple from the graph and the corresponding row from the EVōC service's labeled training set. No further recomputation needed.

The classification mechanism is a standard k-NN classifier (Fix & Hodges 1951; Cover & Hart 1967) operating in the embedding space EVōC clustered. EVōC's role at population time is *implicit*: its output (the per-node `dcterms:subject` triples written during bootstrap approval) becomes the labeled training set for k-NN. Bootstrap is "training time"; population is "inference time." This separation is why the iterative-feedback concern dissolves — the two pipelines do not share runtime state in a way that creates a loop. It also preserves EVōC's density structure naturally: multi-modal and elongated groupings classify correctly because the new node is matched to its actual neighbors rather than to a synthetic group representative.

This split matches 2025 SOTA in the bootstrap step (MILA, GenOM, OLIVE provide direct citations for retrieve-then-prompt + embedding-with-LLM-verification). The **bootstrap-then-populate** separation, with user approval gating and k-NN against the bootstrap-labeled training set, is the thesis's incremental contribution to the literature — the surveyed papers do not specify continuous-classification semantics or human-in-the-loop approval, even though both are required for production authoring workflows.

### D3 — All pipeline output gated on user approval

No pipeline run writes substrate-state changes silently. Two gating mechanisms:

- **Pending suggestions in graph.** Pipeline output materializes as triples carrying `prov:wasGeneratedBy` markers. The engine treats presence of such a marker as "pending" and renders the proposal in a UI review surface rather than the standard knowledge-view. User approval either (a) strips the provenance triple to mark the grouping as user-owned, or (b) writes an explicit acceptance triple alongside the provenance (final mechanism deferred to companion work).
- **Auto-classification within an approved grouping.** Population's high-confidence path emits `dcterms:subject` triples without user prompting, since the *grouping itself* was already approved. The user can override an auto-classification at any time by editing the triple. Low- and mid-confidence cases never auto-emit.

Approval is therefore granular: the user approves *groupings* (categorical structure), not *every classification edge* (routine routing).

### D4 — Confidence-tier tables

Two separate tables. Table 1 governs the population step; Table 2 governs grouping-to-CSO alignment in bootstrap.

**Table 1 — Member → grouping classification (population, k-NN):**

| Tier | Top-1 cosine similarity | Vote margin (top-*k*) | LLM verification | Action |
|---|---|---|---|---|
| High | ≥ 0.80 | unanimous (k of k) | skip | auto-emit `dcterms:subject` |
| Mid | ≥ 0.60 | split (e.g., 3-of-5) | run on top-2 candidate groupings | surface top-3 in UI, user picks |
| Low | < 0.60 | — | skip | flag as "doesn't fit," accumulate for backlog flush |

Vote margin captures how clearly the neighborhood agrees. A unanimous vote on a high top-1 similarity is the strongest signal; a split vote even at high similarity indicates the new node sits at a grouping boundary and warrants user review.

**Table 2 — Grouping → CSO alignment (bootstrap and post-bootstrap manual ops):**

| Confidence | LLM probability | Cosine similarity | Predicate emitted |
|---|---|---|---|
| High | ≥ 0.95 | ≥ 0.85 | `skos:exactMatch` |
| Moderate | ≥ 0.80 | ≥ 0.75 | `skos:closeMatch` |
| Low (soft anchor) | ≥ 0.60 | ≥ 0.60 | `skos:relatedMatch` |
| Below all | — | — | no alignment emitted (grouping stands alone) |

Thresholds in both tables are starting values. Final values locked after pilot evaluation against demo curriculum content.

### D5 — PROV-O lifecycle markers

Pipeline-suggested groupings:

```turtle
cs:auto_grouping_42
    rdf:type             skos:Concept ;
    rdfs:label           "Recursive Algorithms" ;
    prov:wasGeneratedBy  cs:bootstrap_run_2026_05_03 ;
    prov:wasDerivedFrom  cs:cluster_42 ;
    skos:relatedMatch    cso:nearest_concept .   # only if alignment emitted
```

User-approved groupings: same triples, plus an acceptance signal (mechanism deferred — see Open Questions). Provenance triples stay as audit trail even after approval.

This decision replaces the original D5's "mint-on-no-match" framing: minting is no longer a silent automatic step but the result of user approval after the backlog-flush surface in D2.

### D6 — Membership predicate

Member-to-grouping edges use `dcterms:subject` (Dublin Core Terms). Standard, content-type-agnostic ("this content is about this topic"), works for any authored node — concept, lecture, assessment, principle. Inverse navigation handled by engine queries; no inverse predicate stored.

### D7 — Scope (A-lite)

Implementation target for the thesis demo:

- Bootstrap and population pipelines both implemented end-to-end.
- **Curated CSO subset** (~500 concepts relevant to undergraduate CS curriculum), not the full ~14K-concept ontology.
- Single prompt template for label generation; single template for verification. No prompt-engineering experimentation in v1.
- Manual review of bootstrap output as part of the live demo. Population auto-classification + user override demonstrated for at least one mid-confidence example.
- Implementation window: 6–8 weeks.

Rejected alternatives (unchanged from original ADR):

- **(A) Full pipeline + full CSO + multi-prompt experimentation** — out of timeline.
- **(B) Grounding only** (preload CSO, hand-author alignments) — discards EVōC and LLM contributions.
- **(C) Clusters-only** (visual overlay, no ontology grounding) — loses the "grounded in research ontology" insight that motivates the pipeline.

### D8 — Zero substrate-vocabulary additions

This ADR adds zero `kn:` or `knl:` symbols. Every emitted predicate is SKOS-, PROV-O-, or Dublin-Core-standard. ADR-005's namespace architecture addendum is unchanged. External vocabularies formally adopted by this ADR: `skos:`, `prov:`, `dcterms:`.

---

## Consequences

### Positive

- **Substrate stays small.** No growth in `kn:` or `knl:` from this work.
- **Loop concern dissolved.** Population reads only authored content; pipeline output never feeds back into bootstrap input. Bootstrap runs only on explicit user invocation.
- **Stable groupings for the user.** Once approved, a grouping's identity, label, and CSO alignment persist across content edits. The user can trust the categorical structure between sessions.
- **Thesis claim sharpened.** The bootstrap-then-populate split with human-in-the-loop approval is a defensible contribution beyond the surveyed papers, which assume one-shot operation.
- **Research-canonical anchors automatic.** Demo concepts get linked to CSO without manual curation, demonstrating substrate readiness for ontology interop.
- **CRUD operations behave naturally.** Add/edit/delete on authored nodes triggers proportional, predictable changes to classification edges. No full re-clustering on every change.
- **Pipeline iterates independently.** EVōC service, prompt templates, and threshold values can evolve without substrate changes.
- **Defensible scope window.** 6–8 weeks remains realistic.

### Negative

- **Two pipelines, not one.** Bootstrap and population are different code paths with different failure modes. Pilot evaluation must exercise both.
- **Outlier propagation risk.** A single mis-classified member becomes a labeled neighbor for future k-NN queries. Similar new content may then classify into the wrong grouping by following the outlier's vote. Mitigated by k≥3 majority voting and by the user's ability to correct any auto-classification at any time, which removes the bad label from the training set on the spot. Worth observing during pilot.
- **External LLM dependency.** Whatever LLM is chosen introduces cost, rate limits, and reproducibility considerations for the thesis defense.
- **Threshold tuning requires pilot data.** Demo curriculum content may not exist at full volume when thresholds need to be locked.
- **CSO subset curation bias.** The chosen ~500-concept subset must be documented (selection criteria, audit trail) to defend against arbitrary-cherry-pick concerns.
- **Backlog-flush UX.** The user has to deal with periodic "review N candidate new groupings" prompts. Demo must show this is tolerable for a small corpus; scaling to a larger corpus is future work.

### Neutral

- This ADR supersedes the original "Category type ADR" framing entirely. The original framing's open questions (SKOS-vs-invent, hierarchy modeling, taxonomic structure) are no longer relevant — they were artifacts of treating categories as substrate.
- Future versions can swap reference ontologies (ACM CCS, schema.org, domain-specific) without substrate changes. Pipeline is parameterized by reference-ontology choice, not the substrate.
- The bootstrap/population terminology aligns with established ontology-engineering vocabulary ("ontology learning" vs "ontology population"). No new terminology introduced.

---

## Companion Work

1. **EVōC service API contract ADR.** Stable HTTP contract between the C# backend and the Python FastAPI EVōC service. Endpoints: `cluster`, `label`, `align`, `verify` (bootstrap), and `classify` (population). Schema, error semantics, idempotency.
2. **Pilot evaluation.** Small-curriculum pilot validates threshold values from D4 (both tables). Results inform final threshold lock and any tier-mapping adjustments. Pilot must exercise centroid-drift behavior across simulated authoring sessions.
3. **CSO subset selection criteria.** Documented filter logic (proposal: "intersect CSO topics with curriculum keyword vocabulary; expand by one hop in CSO `skos:broaderGeneric` hierarchy").
4. **Approval mechanism finalization.** D5 leaves "approval" as either provenance-strip or explicit-acceptance-triple. Pick one based on UX prototyping.
5. **Update Stage 6 implementation notes.** Mark categorization as "implemented via bootstrap + population pipelines; substrate type unchanged."
6. **Define the `map-view` UI lens.** Renders alignment edges produced by this pipeline, plus a review surface for pending suggestions (groupings awaiting approval, mid-confidence classification candidates, backlog-flush proposals). Spec to be authored when the EVōC service API contract (item 1) lands.
7. **k-NN training-set storage.** The EVōC service stores `(authored_node_uri, grouping_uri, embedding_vector)` rows in local memory or a flat file (not the graph). Source of truth for `(uri, grouping_uri)` is the graph's `dcterms:subject` triples; embeddings are recomputed from authored text on demand or cached locally. Spec change is local to the EVōC service. At v1 scale (~1000 nodes × 384-dim ≈ 1.5 MB total), no ANN index needed — brute-force cosine search is sub-millisecond. Larger scale would adopt FAISS or hnswlib.

---

## Open Questions

### Pending-suggestion storage location

Pending suggestions live in the graph with `prov:wasGeneratedBy` markers (chosen path) or in a sidecar approval queue outside the graph (alternative). In-graph is cleaner — approval is a triple-edit operation and the suggestion is queryable like any other node — but means the engine must know to filter pending items out of knowledge-view queries. Sidecar is more isolated but adds a non-RDF surface. v1 proceeds with in-graph; revisit if filtering proves brittle.

### k-NN k value

v1 starts with k=5. Pilot data informs final value. Trade-off: small k (k=1, k=3) is more responsive to local structure but more sensitive to outliers; large k (k=10+) smooths outliers but blurs grouping boundaries. The "outlier propagation" risk listed in Negative Consequences is most acute at k=1; k≥3 mitigates it substantially.

Alternative considered and deferred: HDBSCAN's native `approximate_predict` uses the density model directly to assign new points, rather than k-NN against labeled neighbors. More principled if the underlying clustering is HDBSCAN-family, but introduces tighter coupling between the EVōC library version and the population step. v1 prefers the simpler, library-agnostic k-NN approach. Re-evaluate if pilot shows k-NN failure modes that density-based prediction would handle better.

### LLM choice

Trade-offs: GPT-4 (paid, highest quality, supports logprobs API for D4), Qwen2.5-32B (open-weights, MIT-license-equivalent, supports logprobs via vLLM), Llama-3.1 70B (open-weights, large model). Decision drivers: cost ceiling, reproducibility for thesis defense, support for token-level probability extraction.

### Embedding model

Trade-offs: `sentence-transformers/all-MiniLM-L6-v2` (most-cited free option, 2025 papers default), `text-embedding-3-small` (OpenAI, paid, higher quality), `bge-small-en-v1.5` (newer free option, competitive quality). Citation stability vs raw quality.

### Threshold-strategy implementation

Token-probability scoring (GenOM style) requires LLM API support for logprobs. Binary YES/NO scoring (MILA style) works on any chat-completion API but is a coarser signal. Trade-off: implementation simplicity vs signal quality.

### Provenance granularity

Per-pipeline-run record (one provenance node, all suggestions derive from it) is simpler. Per-suggestion record (one provenance node per proposed grouping or classification, with timestamp and per-event confidence) is more queryable. Decision affects PROV-O usage pattern.

### CSO subset selection method

Hand-curated (highest quality, lowest reproducibility) vs algorithmic filter (defensible criteria, may miss curriculum-specific concepts). Likely hybrid: algorithmic filter + manual review pass.

### Backlog-flush trigger size

Small N (e.g., 3) flushes frequently — user sees more "review new groupings" prompts but each is small. Large N (e.g., 20) batches better but delays new-grouping creation, which may surprise the user. Pilot data needed.

---

## References

- **Research note:** `evoc-cso-ontology-grounding-pipeline.md` (Thesis Draft 2 Notes folder) — full literature digest informing this ADR.
- **ADR-003** — Reflexivity as foundation.
- **ADR-005** — `kn:` scope under Reading A; namespace architecture addendum.
- **VISION.md** §4.8 (reflexive substrate), §6 (v1 scope).
- **MILA** — Ontology Matching with LLMs and Prioritized Depth-First Search (arXiv 2501.11441).
- **GenOM** — Ontology Matching with Description Generation and LLM (arXiv 2508.10703).
- **OLIVE** — Ontology Learning With Integrated Vector Embeddings (Sage 2025).
- **LLMs4OL Challenge 2025** — 2nd Large Language Models for Ontology Learning Challenge (tib-op.org/ojs).
- **CSO** — Computer Science Ontology v3.4.1 downloads (cso.kmi.open.ac.uk/downloads).
- **EVōC** — Tutte Institute clustering library (github.com/TutteInstitute/evoc).
- **SKOS** — W3C Simple Knowledge Organization System (w3.org/2004/02/skos).
- **PROV-O** — W3C Provenance Ontology (w3.org/TR/prov-o).
- **Dublin Core Terms** — `dcterms:subject` (purl.org/dc/terms).
- **Fix & Hodges (1951)** — Discriminatory Analysis: Nonparametric Discrimination, Consistency Properties. USAF School of Aviation Medicine technical report (the original k-NN paper).
- **Cover & Hart (1967)** — Nearest neighbor pattern classification. *IEEE Transactions on Information Theory*, 13(1):21–27 (proves k-NN's asymptotic error bound).
- **Campello, Moulavi & Sander (2013)** — Density-Based Clustering Based on Hierarchical Density Estimates. *PAKDD 2013* (HDBSCAN, the density model underlying EVōC and the basis for `approximate_predict` referenced in Open Questions).
