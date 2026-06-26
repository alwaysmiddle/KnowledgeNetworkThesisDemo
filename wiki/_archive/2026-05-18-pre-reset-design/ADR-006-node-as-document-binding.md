# ADR-006 — Node-as-Document Binding

**Status:** Accepted
**Date:** 2026-04-26
**Author:** Shizhong Yu, with Claude
**Depends on:** VISION.md (Principle: "node is both a node and a document"), ADR-003, ADR-005
**Supersedes:** —
**Superseded by:** —

---

## ⚠️ Naming Update — 2026-04-28 (ADR-005 namespace addendum)

This ADR was written two days before ADR-005's namespace addendum landed. The **decisions** here (block IDs, promotion model, opaque doc-store URN, kernel `kn:contains` and `kn:body_ref`) are intact. If older notes or handoff material use pre-addendum naming, substitute:

- `knd:` (domain instances) → `cs:` (user namespace per ADR-005 addendum). Block URIs become `cs:variable/blocks/b3f2`, etc.
- `knm:Concept` → `cs:Concept` (education-specific types live in the user namespace).
- `knm:prerequisite_of` → `knl:prerequisite_of` (engine standard library, engine-feature test passes).
- Legacy mentions of `knm:promoted_from` → either `cs:promoted_from` or, preferred, the W3C standard `prov:wasDerivedFrom` per ADR-005's preference for community vocabularies. Engine code does not read this edge by name, so it does not qualify for `knl:`.

The kernel symbols `kn:contains` and `kn:body_ref` introduced here are **unchanged** — both are in the locked 14-symbol kernel per ADR-005's deferred-bucket resolutions.

---

## Context

`VISION.md` commits to a model where **every node is simultaneously a node in the graph and a document with a WYSIWYG body.** Sections within a document can be **promoted** into their own nodes. This is the editor experience we want; it shapes what we have to store and how the substrate references it.

`ADR-005` already moved "document body binding" into the deferred bucket pending an ADR. This is that ADR.

Four design questions had to be settled together because they cascade:

1. **Document model.** What is a "section" the user can promote?
2. **Promotion semantics.** What happens when a section becomes a node?
3. **Storage shape.** Where does the body live?
4. **RDF binding.** How does the substrate reference the body?

---

## Decisions

### D1 — Document model: block tree with stable block IDs ("B+")

The body of every node is a **tree of typed blocks** — paragraph, heading, list, list-item, quote, code, embed, transclusion, … — modeled after the ProseMirror / Tiptap document model.

**Every block carries a stable URI from the moment it is created**, e.g. `cs:variable/blocks/b3f2`. Block IDs are content-independent (block id survives edits to its text) and globally addressable.

**Why B+ rather than pure block tree (Option B):**
The promotion operation must produce a referenceable target. If blocks are anonymous, promotion has to mint a new identity at promotion time, which loses the back-reference from the source location. Stable IDs from creation make promotion a *type change* rather than an *identity creation* (see D2).

**Why not blocks-as-RDF-nodes from day one (Option C):**
Tana, Anytype, Logseq prove the UX. None of them runs over RDF/SPARQL/OWL. Storing every paragraph as RDF triples would explode the triple count (≈50× domain triples at thesis-demo scale) and slow Fuseki on workloads where the body is fundamentally a document, not a graph. We preserve the door — block IDs are stable, so future-C is a materialization step, not a redesign — but ship Reading A.

**Markdown was rejected** because round-trip fidelity loses with tables, embeds, and custom blocks; "publishing-moment seriousness" needs WYSIWYG that doesn't drop user content.

### D2 — Promotion semantics: transclusion + visible structural containment + guided semantic relation

When the user promotes a block subtree to a node:

1. **The selected blocks become the body of a new node.** A `kn:NodeType` is chosen (Concept, Principle, …). The new node's URI is minted in `cs:`.
2. **The source location is replaced with an embedded transclusion block** referencing the new node's URI. The embedded block stays exactly where the original section was promoted. This position rule is accepted for v1 and may be revisited after editor testing.
3. **The transclusion is a live editing surface for the child node.** Inline edits inside the embedded block update the child node's canonical body directly. Opening the child directly shows the same body as a full node-document with its own graph context, relationships, and contained children.
4. **A structural edge is always written:** `<source-doc-uri> kn:contains <new-node-uri>`. `kn:contains` means document/composition containment only. It does not imply prerequisite, component, explanation, subtopic, type inheritance, or any other domain-semantic relation.
5. **A provenance edge may be written:** `<new-node-uri> prov:wasDerivedFrom <source-block-uri>` is preferred when provenance is useful. Engine code does not depend on this edge by name.
6. **A semantic edge is suggested, not forced.** After promotion, the editor should offer a ranked relationship picker populated from ontology domain/range constraints, existing graph patterns, domain defaults, and optional LLM suggestions over the selected text and parent context. The user may accept, change, or skip the semantic edge.
7. **Skipping the semantic edge is valid.** `kn:contains` alone is acceptable in lightweight authoring. The UI may surface a soft todo such as "semantic relation missing." Stricter validation profiles may promote missing semantic relations to warnings or errors when domain rules require them. Invalid semantic edges, such as domain/range violations, may be validation errors.
8. **`kn:contains` is visible but visually distinct.** Graph views should render it as a structural/document edge, styled differently from semantic/domain edges. Users can toggle structural edges on or off as a view preference; hiding them does not change the graph.
9. **Reversibility is governed by dependency-graph rules.** The promotion is reversible (one-click "demote" — body merges back into the transclusion site, new node deleted, promotion-created edges removed) **as long as the new node's in-degree from outside the source document is zero.** Any of the following locks the promotion:
   - Another node creates an edge to it (`cs:other knl:prerequisite_of <new-node>`)
   - A different document transcludes it
   - It is published, version-tagged, or shared
   - (Pluggable: more triggers can be added without changing this rule.)

   Once locked, demote is no longer offered; the user can still delete the node, but doing so is a destructive operation governed by the system's normal node-deletion rules.

**Why transclusion (Q3a Option 2):**
Cut destroys inline context — the reader of the original doc loses the explanation. Copy creates immediate divergence — the canonical concept and the source block drift apart with no signal to either author. Transclusion preserves the inline reading experience while letting the concept exist as a first-class graph node. The complexity tax (which side is canonical, conflict handling) is bounded by D1's stable block IDs.

**Why structural containment plus guided semantics:**
`kn:contains` is safe for the system to create because it only records document structure. Domain meaning should remain user-confirmed or validation-profile-driven. This protects user-written reasoners: they can rely on `kn:contains` for document composition, export, embedding, and lifecycle behavior without accidentally importing domain claims that the user did not make.

### D2a — Embedded transclusion display and editing

Promoted subnodes are rendered by default as embedded transclusion blocks inside the parent document. Users may collapse an embedded block into a compact card. Opening the child directly expands it into a full node-document view with its own graph context.

Embedded blocks are live editable views of the child node. Inline edits update the child node's canonical body directly, so undo support is required. Undo restores the canonical child body and therefore affects every context where that child is transcluded.

If the same child node is open in another parent, that other embedding should not silently change in place. It should show a stale-content notification with an explicit refresh action. If the other embedding has unsaved local edits and the canonical body changes elsewhere, the editor enters a conflict state and must not overwrite either version. The user resolves the conflict by choosing one version or manually merging the changes.

### D2b — Deleting parents with contained children

Deleting a parent document that has `kn:contains` children is a user choice, not an automatic cascade. The delete flow should visualize the affected contained children and let the user choose what happens to them.

Every document that embeds a child node writes its own `kn:contains` edge to that child. A child is only safely deletable when all containment/transclusion dependencies are gone, using dependency-management semantics similar to package references or build graph dependencies.

The expected choices are:

1. Delete the parent only and keep contained children as standalone nodes or as children of any remaining parents.
2. Delete the parent and selected contained children.
3. Cancel and return to the document.

The UI should make dependency risk visible before deletion. Children that are referenced, transcluded, published, version-tagged, or shared elsewhere should be shown as higher-risk and should not be silently deleted.

**Why dependency-rule reversibility (Q3c):**
Topological reachability / refcount-style locking is well-trodden territory (build systems, garbage collection, package managers). It gives users predictable, explainable behavior: *"You can undo this until something else starts depending on it."* Better than a fixed time window, better than always-reversible (which would lie about what's safe).

### D3 — Storage shape: hybrid (metadata in RDF, body in separate doc store)

The substrate is split:

- **RDF (Fuseki)** holds: node URI, type triples, edges, system properties, and a single `kn:body_ref` triple per node pointing at the body location.
- **Document store (SQLite)** holds: the ProseMirror block tree, keyed by node URI.

**Why Shape B over Shape C (literal blob in RDF):**
Shape C was tempting for v1 simplicity, but the user's stated long-term vision (publishing seriousness, world-map navigation, LLM organization) implies bodies will grow large and numerous. RDF triple stores are not designed for long literals at scale; bringing in a document-shaped store now is the only choice that preserves expressive power as the system grows. Shape C is the simpler v1 but a guaranteed redesign at v2.

**Why Shape B over Shape A (every block as triples):**
Triple explosion (~50× growth, dominantly from blocks that will never participate in graph-level reasoning), and Fuseki performance on document-shaped workloads is worse than purpose-built doc stores. Shape A is the future-C target, not v1.

### D4 — RDF binding: explicit `kn:body_ref` predicate

The substrate references the doc store explicitly via a predicate:

```turtle
cs:variable
    kn:type_of    cs:Concept ;
    rdfs:label    "Variable" ;
    kn:body_ref   <urn:kn-body:variable> .
```

The object of `kn:body_ref` is an opaque URI/URN that the doc store resolves to a row. The exact form (URN scheme, hashed path, etc.) is an implementation detail, not part of the substrate contract.

**Why explicit predicate over convention-only (Q4a):**
A convention-based binding (every node implicitly has a body keyed by its URI) saves a triple but loses the ability to *ask the graph* whether a node has authored content. Conventions also drift — without a triple, the contract between substrate and doc store lives only in code. The cost of one triple per node is negligible.

**Why explicit ref over existence flag (`kn:has_body true`):**
A boolean flag is the worst of both worlds — it doesn't tell you where the body is, and it requires the same bookkeeping as a real ref.

### D5 — Doc store technology: SQLite

The document store is a SQLite database, accessed via `Microsoft.Data.Sqlite` from the C# backend. Schema is intentionally minimal:

```sql
CREATE TABLE node_bodies (
    node_uri    TEXT PRIMARY KEY,
    body_json   TEXT NOT NULL,         -- ProseMirror tree as JSON
    updated_at  TEXT NOT NULL
);
CREATE TABLE block_index (
    block_uri   TEXT PRIMARY KEY,
    node_uri    TEXT NOT NULL REFERENCES node_bodies(node_uri),
    block_type  TEXT NOT NULL          -- "paragraph", "heading", "transclusion", …
);
-- FTS5 virtual table over node_bodies.body_json may be added later if a separate search design needs it.
```

**Why SQLite:**
- Boring, mature, single-file, transactional, well-understood backup story
- C# integration is one NuGet away
- FTS5 keeps a future body-search path available without making search part of this ADR
- Scales to thesis-demo data sizes effortlessly; scales further than we need for v1

**Why not LiteDB:**
JSON-document-shape is attractive but less battle-tested; the schema is small enough that relational is fine.

**Why not JSON files on disk:**
Tempting for git-friendliness, but cross-cutting queries (e.g., "which nodes embed transclusion of X?") become file-system traversals.

**Why not Fuseki named graphs:**
Blurs the architectural line we just drew. The body is *not* RDF; storing it inside the RDF stack defeats the purpose of D3.

---

## Status growth in `kn:` (per ADR-005)

This ADR introduces two new predicates into `kn:`:

- `kn:contains` — structural parent-child between document and child node
- `kn:body_ref` — substrate-to-doc-store binding

Both are reflexivity-rendering vocabulary in the ADR-005 sense (the type-view must show them when it shows a node-as-document). They are added to ADR-005's small `kn:` surface.

Promotion provenance should use `prov:wasDerivedFrom` when needed. It is not substrate vocabulary and is not required by engine code.

---

## What this ADR does *not* decide

- **Editor implementation** — Tiptap vs ProseMirror direct vs custom. Implementation choice; doesn't affect the substrate contract.
- **Application entry and WorldMap navigation** — Phase 3 owns the WorldMap-first entry flow, focus-panel inspection, and persistent WorldMap workspace model. This ADR defines what a node-document is once opened.
- **Block ID scheme details** — content-addressable hash vs UUID vs path. Implementation detail.
- **Collaborative editing protocol** — D2a defines same-user stale/conflict behavior for open transclusions. Multi-user CRDT/OT is future work.
- **Versioning of bodies** — VISION.md commits to git-style versioning; the demo will ship a simplified version. Out of scope here.
- **Body search and indexing** — FTS5 is only provisioned as storage capability. Search semantics and UI belong in a separate design.
- **The exact list of triggers that lock reversibility** — D2 names four; the trigger set is pluggable and expected to grow with the editor.

---

## Consequences

### Positive

- **Simplicity at the substrate level.** Bodies don't pollute the triple store.
- **Performance.** Body workloads go to a doc store designed for them; graph workloads stay in Fuseki.
- **Future-C reachable.** B+ stable block IDs mean materializing block triples into RDF is an additive change, not a rewrite.
- **Reflexivity preserved at the right level.** Nodes (and the relationships between them) live in the same substrate. Bodies are "structure not yet earned" in Reading A's terms.
- **Demo-credible.** Two stores is normal for any document/graph hybrid product (Notion, Tana, Logseq all do something similar).

### Negative

- **Two stores to manage.** Backup, migration, and integrity checks must cover both. Mitigation: backup script combines the Fuseki dump + SQLite file.
- **No SPARQL queries over body content.** RDF queries can see `kn:body_ref`, but not the internal document body. Search/index behavior belongs to a separate design.
- **Block-level reflexivity is deferred.** Future-C ("blocks are nodes") becomes a real piece of work to enable, not free.
- **Promotion's transclusion semantics add editor complexity.** Bounded by D1 stable block IDs but still nontrivial.

### Open follow-ups

- **Reversibility trigger set.** D2 names four; refine when the editor is built.
- **Demote operation UI.** D2 defines the safe demote direction: merge the child body back at the transclusion site and remove promotion-created edges. The exact confirmation UI and dependency messaging remain editor work.
- **Body migration story.** If we ever move from SQLite to a different doc store, write the migration ADR then.
- **Stage 6 amendment.** Validation rules will eventually want to assert "every authored node has either an empty body or a `kn:body_ref`." Add when validation is wired.
