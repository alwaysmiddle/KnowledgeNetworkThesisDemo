# ADR-004: Tiered Structure of the `kn:` Namespace

**Status:** Superseded by ADR-005 (2026-04-24)
**Date:** 2026-04-24
**Deciders:** Shizhong Yu
**Related:** ADR-002 (system vs domain edge category), ADR-003 (reflexivity foundation), ADR-005 (`kn:` scope under Reading A), VISION.md, META_MODEL_DESIGN.md (D3, D5)
**Triggered by:** External schema review (`SCHEMA_REVIEW_HANDOFF.md`, points #1 and #6 — *file deleted 2026-04-28; points absorbed into ADR-005*)

> **Superseded.** This ADR proposed a three-tier structure (Tier A bootstrap kernel / Tier B system vocabulary / Tier C system classes) for the `kn:` namespace. The proposal assumed a future where engine-shipped vocabulary — visual styles, lifecycle, document binding — would keep accumulating inside `kn:` and needed organization.
>
> Subsequent vision work (see VISION.md, especially §4.1 Reading A and §4.8 Reflexivity as substrate property) reframed the question. Under Reading A, app-level concerns (visual styling, view preferences, document binding) do not belong in the graph at all in v1 — they are application code/JSON, not RDF. This collapses Tier C entirely and shrinks Tier B to substrate-level vocabulary needed for reflexivity rendering.
>
> The remaining `kn:` scope is small enough that tiering is no longer the right frame. ADR-005 supersedes this document with a vision-derived scope statement. The historical record below is preserved as evidence of the architectural pivot.

---

## Context

META_MODEL_DESIGN.md decision **D3** says the system bottoms out at **"four primitive node types and four primitive edge types."** Decision **D5** says `kn:` is for **"meta-model primitives. Fixed. Changes require an ADR."**

Read together, those two sentences claim the entire `kn:` namespace contains exactly 8 symbols.

A direct read of the shipped `meta.ttl` shows otherwise. The `kn:` namespace currently also contains:

- 3 visual-style classes (`kn:VisualStyle`, `kn:NodeVisualStyle`, `kn:EdgeVisualStyle`) — and a deferred `kn:NodeSet`.
- ~13 visual-style property edges (`kn:color`, `kn:icon`, `kn:size`, `kn:line_style`, `kn:arrow_head`, …).
- ~7 style-applicability edges (`kn:applies_to`, `kn:applies_to_category`, `kn:filter_property`, …).
- ~5 property-descriptor edges (`kn:category`, `kn:domain`, `kn:range`, `kn:data_type`, `kn:allowed_values`).
- A handful of lifecycle and document edges (`kn:on_delete`, `kn:exclusive`, `kn:document_id`, `kn:has_artifact`, …).
- Engine-internal predicates (`kn:visual_style`, `kn:owl_semantics`, `kn:edge_category`, `kn:default_properties`, `kn:derived`, `kn:inverse_edge_type`, `kn:description`).

This is 40+ symbols, not 8. Every one is needed by the engine. None are authored by the user. All are tagged `kn:edge_category "system"`. They are not bugs; they are the system's own working vocabulary.

The `kn:` namespace is therefore doing two jobs simultaneously: holding the bootstrap kernel that grounds the type system, *and* holding the engine-shipped vocabulary that drives rendering, validation, lifecycle, and reasoning. The current docs conflate the two and the "exactly 4+4" framing reads as misleading.

The schema review surfaced this as points #1 ("audit `kn:*` for what truly belongs in the kernel") and #6 ("decide whether `kn:VisualStyle` etc. are kernel or engine-shipped instances").

---

## Decision

We declare a **three-tier structure inside the `kn:` namespace** and a single rule for entry into each tier. The split is documentary and architectural; the namespace URI does not change. Existing data files require no edits.

### Tier A — Bootstrap kernel (the 4 + 4)

The minimum set of symbols required before anything else can be defined. Removing any of them breaks the model's ability to bootstrap itself.

**Node-type primitives (4):** `kn:Node`, `kn:NodeType`, `kn:EdgeType`, `kn:Edge`.
**Edge-type primitives (4):** `kn:type_of`, `kn:subtype_of`, `kn:source`, `kn:target`.

The fixed point `kn:NodeType kn:type_of kn:NodeType` lives here. This tier is the basis of the reflexivity claim: *with these eight, the user can define every other type the system needs, including all of tiers B and C.*

**Entry rule:** changes require an ADR that supersedes ADR-003. Practically — frozen.

### Tier B — System vocabulary

Engine-shipped predicates that domain content does not need to invent but the engine relies on to do its job. Examples:

- `kn:visual_style`, `kn:owl_semantics`, `kn:edge_category`, `kn:default_properties`, `kn:description`, `kn:inverse_edge_type`, `kn:derived` — meta-instance attribution.
- `kn:color`, `kn:icon`, `kn:size`, `kn:line_style`, `kn:arrow_head`, `kn:width`, `kn:opacity`, `kn:shape`, `kn:badge`, `kn:label_position`, `kn:hidden_by_default`, `kn:border_style`, `kn:border_color` — visual style values.
- `kn:applies_to`, `kn:applies_to_category`, `kn:applies_to_owl`, `kn:applies_to_derived`, `kn:filter_property`, `kn:filter_value` — visual style scope.
- `kn:category`, `kn:domain`, `kn:range`, `kn:data_type`, `kn:allowed_values` — property descriptor mechanics.
- `kn:on_delete`, `kn:exclusive`, `kn:auto_created`, `kn:user_editable`, `kn:default_on_delete`, `kn:default_exclusive` — lifecycle.
- `kn:document_id`, `kn:has_artifact` — document binding.

Every member of Tier B is tagged `kn:edge_category "system"` per ADR-002. That tag is the runtime test for tier membership.

**Entry rule:** new entries require a design note (not a full ADR) referencing the feature that introduces them, and must be tagged `kn:edge_category "system"` in `meta.ttl`. Renaming or removing entries requires an ADR because shipped data may carry the predicate.

### Tier C — System classes

Engine-shipped node types that Tier B vocabulary refers to. Examples:

- `kn:VisualStyle`, `kn:NodeVisualStyle`, `kn:EdgeVisualStyle` — referenced by `kn:visual_style`.
- `kn:NodeSet` (deferred) — referenced by hypothetical `kn:source_set` / `kn:target_set` extensions.

These are conceptually `kn:NodeType` instances ("a visual style is a kind of node"). They live in `kn:` rather than `knm:` because they are inseparable from Tier B vocabulary that already lives in `kn:`.

**Entry rule:** same as Tier B. New system classes are introduced together with the Tier B vocabulary that needs them.

---

## Why this split, not other options

**Option 1 (rejected): Split `kn:` into `kn:` (kernel only) and `kns:` (system).**
Cleanest in theory. Rejected because:
- All shipped `meta.ttl`, `meta-instances.ttl`, and (eventually) authored property descriptors would need rewriting.
- Two namespaces to remember instead of one. The conceptual gain is small; the documentation cost is real.
- The `kn:edge_category "system"` property already does the categorization work at runtime.

**Option 2 (rejected): Move Tier C into `knm:`.**
Argued in the schema review (#6). Rejected because:
- `knm:` is for *user-authored* meta-instances. Visual style classes are not authored — they ship with the engine and changing them is a release event.
- `knm:DefaultNodeStyle` (an *instance* of `kn:NodeVisualStyle`) is correctly in `knm:` already. The class lives one tier up.
- Splitting class from instance across namespaces would invert the kn / knm relationship for one feature.

**Option 3 (chosen): Keep `kn:` as the engine namespace, declare three tiers internally.**
Documentary fix only. Existing data unaffected. The 4+4 kernel claim becomes precise ("Tier A"), the broader engine surface gets named honestly, and the `kn:edge_category "system"` tag becomes the canonical runtime discriminator. The reflexivity claim is preserved: **Tier A bootstraps everything, including Tiers B and C.**

---

## Consequences

**Documentation changes (mandatory):**
1. **META_MODEL_DESIGN.md D3** — clarify that "four primitive node types, four primitive edge types" refers to **Tier A only**, and reference this ADR for the rest of `kn:`.
2. **META_MODEL_DESIGN.md D5** — clarify that `kn:` holds Tier A + B + C (engine-shipped), not user-authored content.
3. **META_MODEL_DESIGN.md "Primitive Node Types" / "Primitive Edge Types"** sections — already correct in scope; add a one-line cross-reference to this ADR for completeness.

**Data changes (none):**
No edits to `meta.ttl` or `meta-instances.ttl`. Existing tier-B entries are already tagged correctly via `kn:edge_category "system"`.

**Code changes (none required, one optional):**
Backend repository code already filters via `kn:edge_category` (ADR-002). An optional helper such as `IsKernelSymbol(uri)` could be added if a future feature needs to enforce "Tier A is frozen" at validation time. Out of scope for now.

**Reflexivity story (sharpened):**
The thesis claim becomes more precise. *Reflexivity is grounded in 8 bootstrap primitives.* The engine then defines its own working vocabulary (Tier B + C) **using those 8** and stores it in the same graph. The user can inspect, style, and traverse the entire engine vocabulary using the same UI as the domain content — which is what the Stage 5 meta-view already demonstrates.

**Open follow-ups (out of scope here):**
- ADR-002 amendment surfacing: `knm:sys_contains` URI naming uses a `sys_` prefix that re-encodes the category. Either keep as cosmetic mnemonic or rename. Tracked separately.
- Some Tier B predicates (e.g., `kn:document_id`, `kn:has_artifact`) belong to a not-yet-implemented document-binding feature. Their presence in the loaded `meta.ttl` is forward-looking. No action required; flagged for awareness.

---

## Validation

A reader of META_MODEL_DESIGN.md after the doc updates land should be able to answer:

1. **What is the bootstrap kernel?** → 4 node types and 4 edge types, listed in D3.
2. **Is `kn:visual_style` part of the kernel?** → No, Tier B. Engine-shipped, tagged `kn:edge_category "system"`.
3. **Is `kn:VisualStyle` part of the kernel?** → No, Tier C. Engine-shipped class.
4. **Where do user-authored types live?** → `knm:`.
5. **What can change in the kernel?** → Nothing without an ADR superseding ADR-003.
6. **What can change in `kn:` Tier B / C?** → Additive changes via design note + `kn:edge_category "system"` tag. Renaming or removal needs an ADR.

If any of those answers are unclear after the docs are updated, the docs failed and need another pass.
