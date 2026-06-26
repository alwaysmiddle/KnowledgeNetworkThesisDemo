# ADR-005: `kn:` Scope Under Reading A

**Status:** Accepted
**Date:** 2026-04-24
**Deciders:** Shizhong Yu
**Related:** ADR-002 (system vs domain edge category), ADR-003 (reflexivity foundation), ADR-004 (superseded — tiered `kn:` namespace), VISION.md (§4.1 Reading A, §4.8 Reflexive substrate, §6 Scope)
**Supersedes:** ADR-004

---

## Context

ADR-004 attempted to organize the `kn:` namespace into three tiers (bootstrap kernel / system vocabulary / system classes) because the shipped `meta.ttl` had grown to 40+ symbols. The implicit assumption was that the engine would keep accumulating `kn:*` predicates as new features (visual styles, lifecycle, document binding, custom types, view preferences) landed.

Subsequent vision work changed the question. VISION.md §4.1 commits v1 to **Reading A**: only user-authored knowledge content lives in the graph. Application configuration, runtime state, rendering preferences, and engine-internal plumbing do not. VISION.md §4.8 narrows reflexivity to a **substrate property**, not a UX promise — the meta-model is *holdable* and *renderable* in the same engine, but the user does not edit it through the editor in v1.

Read together, those two principles dramatically shrink what `kn:` legitimately needs to contain. Most of what ADR-004 was trying to organize does not belong in the graph at all.

This ADR replaces ADR-004 with a vision-derived scope.

---

## Decision

The `kn:` namespace contains **only what is required to ground the substrate's type system and to make the meta-model self-renderable**. Everything else moves out of the graph.

### What stays in `kn:`

**Bootstrap kernel (4 + 4 — unchanged):**

| Symbol | Role |
|---|---|
| `kn:Node` | Universal node class |
| `kn:NodeType` | Type-of-nodes class |
| `kn:EdgeType` | Type-of-edges class |
| `kn:Edge` | Reified-edge class |
| `kn:type_of` | Instance-of relation |
| `kn:subtype_of` | Generalization between types |
| `kn:source` | Reified-edge source |
| `kn:target` | Reified-edge target |

**Reflexivity-rendering vocabulary** (the minimum required to mark the meta-model as a containable, traversable, renderable subgraph):

| Symbol | Role |
|---|---|
| `kn:edge_category` | Property on edge-type nodes; values `"system"` or `"domain"`. Distinguishes engine-internal containment edges from user-authored relations. (See ADR-002.) |
| `kn:contains` | Structural parent-child edge type. Used by the meta-visualization and by node-as-document binding (see ADR-006). Naming resolved by ADR-006 — `kn:contains` over `kn:sys_contains`. |
| `kn:body_ref` | Substrate-to-doc-store binding for node-as-document. Object is an opaque URN the doc store resolves. Added by ADR-006. |

This is the entire substrate-level surface. `kn:` is small by design.

### What leaves `kn:` (and leaves the graph in v1)

The following currently-in-`kn:` vocabulary is reclassified as **application config**, not graph content. It moves to TypeScript/JSON in the frontend (or, where appropriate, to backend code constants) and is not stored as RDF triples in v1:

- All visual-style classes: `kn:VisualStyle`, `kn:NodeVisualStyle`, `kn:EdgeVisualStyle`
- All visual-style property edges: `kn:color`, `kn:icon`, `kn:size`, `kn:line_style`, `kn:arrow_head`, etc.
- Style-applicability edges: `kn:applies_to`, `kn:applies_to_category`, `kn:filter_property`, etc.
- Lifecycle predicates: `kn:on_delete`, `kn:exclusive`
- Document-binding predicates: `kn:document_id`, `kn:has_artifact` *(superseded by `kn:body_ref` per ADR-006; the body itself remains outside RDF in v1, in a SQLite doc store)*
- Engine-cosmetic predicates: `kn:visual_style`, `kn:default_properties`

These are app-level concerns. Under Reading A they have no business in the graph. Future versions (Reading B, Reading C) may bring some of them back into the substrate as user-customizable nodes, but that is a deliberate future expansion, not a v1 commitment.

### What is deferred (case-by-case decisions)

~~The following are *legitimate substrate concerns* but their placement deserves separate decisions, not a blanket ruling here.~~ **Resolved 2026-04-28** (see "Deferred bucket resolutions" below). Original entries preserved for historical record:

| Symbol | Question to resolve |
|---|---|
| `kn:NodeSet` | Set-valued edges: needed for user-content typing? Or deferred entirely for v1? Decide in a follow-up ADR. |
| `kn:PropertyDescriptor` and friends (`kn:category`, `kn:domain`, `kn:range`, `kn:data_type`, `kn:allowed_values`) | Property-descriptor machinery: is it part of how the user types their content (substrate-level) or is it engine-internal schema (out)? Decide in a follow-up ADR. |
| `kn:owl_semantics`, `kn:derived`, `kn:inverse_edge_type` | Inference-related metadata: probably substrate-level (the user's edges have OWL semantics that drive Claim 2). Likely stays. Confirm in inference-engine review. |
| `kn:description` | Descriptive text on type/edge nodes: probably stays (it's *about* the substrate, used by reflexive rendering). Confirm. |

---

## Consequences

### Positive

- **`kn:` becomes small and defendable.** Around 10 symbols total, all justified by either the kernel grounding or the reflexivity claim. No more "is this engine plumbing or kernel" confusion.
- **Tiering is no longer needed.** ADR-004's three-tier scheme dissolves. There is one tier; everything in `kn:` is substrate-level.
- **App config gains a clean home.** Visual styles and lifecycle live in code, where they can be developed with normal frontend tooling, type-checked, hot-reloaded, and tested without round-tripping through Fuseki.
- **Reflexivity claim sharpens.** Claim 7 now reads: *"the meta-model — a small, principled, type-system subgraph — is held in the same substrate as user content and renders through the same engine."* That is a tighter and more defensible thesis claim than "everything the engine knows is graph data."
- **Vision and substrate align.** Reading A's boundary (graph holds user content only) is now mechanically reflected in `kn:`.

### Negative

- **Migration cost.** The shipped `meta.ttl` and Stage 5 meta-visualization currently rely on visual-style nodes living in `kn:`. Pulling them out requires either (a) moving the rendering-config elsewhere and adapting Stage 5 to read from there, or (b) accepting that visual styles in the demo are stored differently from how production v1 would store them. Decision deferred to companion-work plan.
- **Some reflexivity demonstrations get smaller.** If visual styles leave the graph, the meta-visualization no longer demonstrates "the engine's styling vocabulary is editable as a graph." That demo never matched Reading A anyway, so this is correction, not regression — but it's worth naming.
- **Stage 5 documentation drifts.** Current Stage 5 docs and tests may reference `kn:VisualStyle` etc. as graph nodes. Those references will need updating once the migration plan is settled.

### Neutral

- **The deferred bucket is real work.** Decisions on `NodeSet`, `PropertyDescriptor`, and inference metadata are now explicit follow-up items rather than implicit assumptions buried in `meta.ttl`.

---

## Companion Work Triggered by This ADR

To be tracked in the session todo list and worked through after this ADR settles:

1. **Update `META_MODEL_DESIGN.md`:** D3 scope-of-kernel paragraph, D5 namespace table, references to ADR-004 — all need to point at this ADR and reflect the narrower `kn:` scope.
2. **Migration plan for visual styles out of the graph:** how Stage 5 meta-visualization sources its rendering config once `kn:VisualStyle` is no longer in `meta.ttl`. May be a deferred task if Stage 5 demonstration is acceptable as-is for the thesis.
3. **Audit `meta.ttl`:** mark each predicate as kept / moved / deferred per the rules above; produce a target-state Turtle file.
4. **Decide `kn:contains` vs `kn:sys_contains` final naming** (open from ADR-002 amendment fallout).
5. **Follow-up ADRs** for the deferred bucket: `kn:NodeSet`, `kn:PropertyDescriptor`, inference metadata.
6. **Track Stage 6 companion work** in implementation tasks or phase-specific specs, not in the retired gap-analysis dashboard.
7. ~~**Decide fate of `SCHEMA_REVIEW_HANDOFF.md`** (review item that originally triggered ADR-004; points #1 and #6 are now answered by this ADR; remaining points still pending).~~ **Resolved 2026-04-28: file deleted; its points were absorbed into this ADR's namespace addendum and deferred-bucket resolutions, plus ADR-006 (node-as-document), ADR-007 (categorization pipeline), and `TYPE_VIEW_SPEC.md` (meta-view edge scope). Cross-references updated as part of post-Stage-5 reconciliation Step 9.**

---

## Open Questions

- **Containment edge naming.** ~~ADR-002 deprecated the `sys:` namespace prefix in favor of an `kn:edge_category` property. The remaining naming question is whether the substrate containment edge is `kn:contains` (clean, reads naturally) or `kn:sys_contains` (preserves prefix-style intent for grep-ability). Resolve in a small follow-up ADR or as part of META_MODEL_DESIGN cleanup.~~ **Resolved by ADR-006: `kn:contains`.**

- **Where exactly do visual styles live?** Outside the graph is decided. The specific home — TypeScript constants, JSON config file, frontend store — is a frontend architecture decision, not a substrate decision. Defer to frontend redesign.

- **Should `kn:edge_category` be a literal property or an edge to a category-type node?** Currently a literal (`"system"` / `"domain"`). For consistency with the "everything is a node" principle the substrate could promote categories to nodes. Probably premature — literal is fine for v1.

---

## Addendum: Namespace Architecture (2026-04-28)

This ADR defined `kn:` scope. It did not address how `knm:` (then named for "meta-instances") fits into the broader namespace ecosystem, nor how user-authored content and external ontologies relate. This addendum captures the namespace architecture decisions made during the post-Stage-5 reconciliation.

### Decision

The substrate uses a **four-layer namespace model**, where each layer represents a stability gradient and authorship community:

| Layer | Prefix | Role | Owned by | Examples |
|---|---|---|---|---|
| Kernel | `kn:` | Substrate primitives + reflexivity-rendering vocabulary | Engine team (locked at v1) | `kn:Node`, `kn:type_of`, `kn:edge_category`, `kn:contains`, `kn:body_ref` |
| Standard library | `knl:` | Engine-required edge types referenced by name in engine code | Engine team (grows by ADR) | `knl:prerequisite_of`, `knl:demonstrates`, `knl:assesses` |
| External ontologies | `skos:`, `schema:`, `owl:`, `foaf:`, etc. | Domain and general vocabularies maintained by W3C / community | External communities | `skos:Concept`, `schema:Course` |
| User namespace | User chooses (e.g., `cs:`) | Domain-specific types and all user-authored content | The course author | `cs:variable`, `cs:Professor` |

The previous `knm:` namespace is **renamed to `knl:`** and **redefined**: it no longer holds general meta-instances like `Concept`, `Principle`, `Course`, `Program`, `Professor`. Those move out — into external ontologies (where standards exist), or into the user namespace (where they are domain-specific).

### `knl:` membership criterion

A symbol qualifies for `knl:` if and only if **engine code references it by name**. This is the *engine-feature test*:

> *"If I delete this symbol, does a shipped engine feature (Linear Traversal, Problem-First Traversal, OWL Inference Pass, derived-edge SPARQL CONSTRUCT, etc.) stop working?"*

If yes → `knl:`. If no → external ontology or user namespace.

Concrete consequences:

- `knl:prerequisite_of` qualifies — Linear Traversal hardcodes it.
- `knl:demonstrates` / `knl:is_demonstrated_by` qualify — Problem-First Traversal hardcodes them.
- `knl:assesses` qualifies — derived edge produced by OWL inference rule.
- `Concept`, `Principle`, `Example`, `Assessment`, `Reference`, `Analogy` **do not qualify** — engine treats nodes generically via `kn:type_of kn:NodeType`. These move to user namespace or external ontology.
- `Course`, `Program`, `Professor` **do not qualify** — education-specific, not engine-required. Move to user namespace.

Expected `knl:` size: 5–7 edge types. Zero node types.

### Duplication with external ontologies is acceptable

`knl:prerequisite_of` may overlap semantically with `schema:competencyRequired` or similar standards. No alignment table is maintained. Optional `rdfs:seeAlso` linking is permitted for documentation but not required and not enforced. Reasoning:

- Maintaining alignment imposes ongoing semantic-drift checks every time a referenced standard updates.
- Duplication is the norm in real RDF ecosystems — every community library re-defines `Concept` because each wants control over canonical types.
- Engine team's authority over `knl:` semantics outweighs interop convenience for v1.
- Users who care about interop can author their own alignments.

### Friendliness layer is the UI, not a DSL

The original goal "save users from learning ontologies" is met by **UI-driven authoring**, not by a friendly DSL namespace. The UI:

- Presents type pickers populated from `knl:` + selected external ontologies.
- Renders display names from `rdfs:label` (with optional UI-config overrides for localization or rebranding).
- Maps user clicks to the appropriate URI under the hood.
- Hides URI complexity from non-technical authors.

This shifts maintenance from "alignment table per `knl:` symbol" to "palette JSON config per UI deployment" — significantly less work.

### Engine logic stays in code (consistent with Reading A)

This ADR's Reading A boundary (graph holds user knowledge + substrate; app config and engine internals stay outside) extends to **engine traversal/inference/validation logic**:

- Engine code references `knl:` URIs as constants (e.g., `LinearTraversal` reads `knl:prerequisite_of` directly).
- No `kn:traversal_role` metadata vocabulary is introduced. Engine knowledge of "what edges to follow for a given traversal" lives in code, not in the graph.
- Validation rules, OWL inference pre-filters, and UI palette config live in their respective code/config homes, not as RDF triples.

This keeps the substrate small and matches the precedent already set for visual styles.

### Future work: plug-in traversals (deferred, not in v1)

If the engine ever needs to support third-party traversals authored against the substrate, a `kn:traversal_role` metadata vocabulary could be introduced so traversals discover their target edge types via graph metadata rather than hardcoded URIs. This would make the engine truly type-agnostic and strengthen Claim 7. Out of scope for v1 demo.

### Consequences (addendum)

**Positive:**

- Namespace architecture matches RDF ecosystem conventions (multiple coexisting vocabularies with stability gradients).
- `knl:` shrinks to ~5–7 symbols, all justified by direct engine-code reference.
- No alignment-table maintenance burden.
- UI-driven friendliness scales better than DSL-driven friendliness.
- Reading A consistency holds across substrate, app config, and engine logic.

**Negative:**

- One-time migration: existing `knm:*` symbols must be reclassified — most move out of the engine-shipped namespace entirely. Includes turtle files, code constants, ADR cross-references, and gap-analysis tables.
- The `knm:` → `knl:` prefix rename touches every authored turtle file. Cheap pre-Stage-6, more expensive after.
- Loss of an "engine-shipped type catalog" for non-technical authors. Mitigated by UI palette + external ontology imports.

**Neutral:**

- Education-specific types (`Course`, `Program`, `Professor`) become user-namespace concerns. The demo curriculum picks its own URIs.
- Categories (proposed in queued ADR-007) follow the same membership test — engine-required → `knl:`, otherwise user namespace.

### Companion work added by this addendum

1. **Rename `knm:` → `knl:`** across `meta.ttl`, all design docs, and any seed data.
2. **Reclassify current `knm:*` symbols** per the engine-feature test: identify which 5–7 survive in `knl:`, which leave entirely.
3. **Pick education-namespace strategy for the demo:** which prefix the demo curriculum uses for `Course`/`Program`/`Professor` (e.g., adopt `schema:` directly, or mint a demo-local prefix).
4. **Update the queued category-system ADR (ADR-007)** to apply the membership test rather than auto-place `Category` in `knl:`/`knm:`.

---

## Deferred Bucket Resolutions (2026-04-28)

The four-row deferred table above (NodeSet, PropertyDescriptor + friends, inference metadata, description placement) is resolved here. The principle applied is from the namespace addendum: **prefer W3C / community standards over invented `kn:*` predicates whenever a standard fits**, and **drop everything that engine code does not read by name**.

### Resolutions

| Symbol | Disposition | Rationale |
|---|---|---|
| `kn:owl_semantics` | **Stays in `kn:`** | Engine code reads it to configure the Jena OWL reasoner. Engine-feature test passes. |
| `kn:derived` | **Stays in `kn:`** | Engine reads it to clear-and-recompute inferred edges and to exclude derived edges from validation. Engine-feature test passes. |
| `kn:inverse_edge_type` | **Stays in `kn:`** | Engine reads it to generate inverse-direction edges during inference. Engine-feature test passes. |
| `kn:description` | **Replaced by `rdfs:comment`** | W3C standard exists. Reflexive-rendering reads any descriptive text predicate; switching to `rdfs:comment` costs only a search-and-replace. |
| `kn:domain` | **Replaced by `rdfs:domain`** | W3C standard. |
| `kn:range` | **Replaced by `rdfs:range`** | W3C standard. |
| `kn:data_type` | **Dropped — use `xsd:*` typed literals directly** | RDF already provides typed literals. No invented predicate needed. |
| `kn:allowed_values` | **Replaced by `sh:in` (SHACL)** *if needed in v1; check usage first* | SHACL is the W3C standard for value constraints. May be unused in v1; companion-work step 3 below confirms. |
| `kn:category` (NodeType meta — knowledge / organizational / supporting) | **Dropped entirely** | Engine doesn't read it. UI/app concern if needed; not substrate-level. |
| `kn:NodeSet` and friends (`kn:target_set`) | **Deferred to v2** | Set-valued edges not required for thesis demo. Future ADR if requirement returns. |
| `kn:PropertyDescriptor` and graph-native property-descriptor machinery | **Deferred to v2** | v1 uses plain triples plus RDF-star where needed (decision 2026-04-21). Graph-native descriptors return only if v1 limitations bite in practice. |

### Final `kn:` Kernel Surface

After ADR-005, the addendum, and these resolutions, the `kn:` namespace contains exactly these symbols:

**Bootstrap kernel (8):**

- `kn:Node`, `kn:NodeType`, `kn:EdgeType`, `kn:Edge`
- `kn:type_of`, `kn:subtype_of`, `kn:source`, `kn:target`

**Reflexivity-rendering vocabulary (3):**

- `kn:edge_category` (system / domain partition)
- `kn:contains` (structural parent-child; per ADR-006)
- `kn:body_ref` (substrate-to-doc-store binding; per ADR-006)

**Inference protocol (3):**

- `kn:owl_semantics`
- `kn:derived`
- `kn:inverse_edge_type`

**Total: 14 symbols.**

`knl:` holds engine-required edge types (5–7 symbols, identified per the engine-feature test in companion work item 2 above).

Everything else in the current `meta.ttl` either moves out of the graph entirely (visual styles, lifecycle, document-binding cosmetic predicates), or is replaced by a W3C / SHACL standard predicate.

### Companion Work Added by These Resolutions

1. **`meta.ttl` rewrite** (also Step 10 of the post-Stage-5 reconciliation): rebuild `meta.ttl` against the 14-symbol final kernel above. Ejected predicates either disappear or move to `app-config.ts` / equivalent.
2. **Search-and-replace across design docs and seed data:**
   - `kn:description` → `rdfs:comment`
   - `kn:domain` → `rdfs:domain`
   - `kn:range` → `rdfs:range`
   - `kn:data_type X` → typed literal `"value"^^xsd:X`
   - Drop `kn:category` predicates entirely (inspect each call site for replacement need).
3. **SHACL-shapes file decision:** before introducing `sh:in` for `allowed_values`, audit current usage. If unused in v1 demo, drop `kn:allowed_values` outright. If used, write minimal SHACL shapes.
4. **Update `META_MODEL_DESIGN.md`** §"Meta-property declarations" to reflect the 14-symbol kernel and the W3C-standard replacements.

---

## References

- `VISION.md` §4.1 (Reading A scope), §4.8 (Reflexive substrate), §6 (v1 scope)
- `ADR-002-system-vs-domain-namespace.md` (origin of `kn:edge_category`)
- `ADR-003-reflexivity-as-foundation.md` (foundational pivot to reflexive substrate)
- `ADR-004-kn-namespace-tiers.md` (superseded; preserved for historical record)
- `ADR-006-node-as-document-binding.md` (resolves `kn:contains` naming and `kn:body_ref` introduction)
- `META_MODEL_DESIGN.md` (D3, D5 — pending update)
- `SCHEMA_REVIEW_HANDOFF.md` *(deleted 2026-04-28; points absorbed into this ADR's addendums, ADR-006, ADR-007, and `TYPE_VIEW_SPEC.md`)* — external review that triggered this thread
