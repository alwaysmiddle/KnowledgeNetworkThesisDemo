# ADR-002: System vs Domain Namespace Architecture

**Status:** Accepted — mechanism amended by [ADR-003](ADR-003-reflexivity-as-foundation.md) (2026-04-20); naming further updated by [ADR-005](ADR-005-kn-scope-under-reading-a.md) namespace addendum (2026-04-28)
**Date:** 2026-04-16
**Deciders:** Shizhong Yu
**Context area:** Cross-cutting — affects edge schema, data model, all subsystems

---

## ⚠️ Naming Update — 2026-04-28 (ADR-005 namespace addendum)

The decision in this ADR — that system vs domain edges are distinguished by an `kn:edge_category` property on the edge-type node, not by URI prefix — is **unchanged**.

The example URIs used below have been **renamed** by ADR-005's namespace addendum + deferred-bucket resolutions. When reading the body, mentally substitute:

- `knm:sys_contains` → `kn:contains` (promoted to kernel symbol per ADR-006)
- `knm:prerequisite_of` → `knl:prerequisite_of` (engine standard library, engine-feature test passes)
- `knm:contains` (the user-authored organizational variant) → `cs:contains` (user namespace, URI-distinct from `kn:contains`)

The categorization mechanism (`kn:edge_category` property) survives the rename intact.

---

## ⚠️ Amendment — 2026-04-20 (ADR-003 Reflexivity Pivot)

**The conceptual separation still holds.** System edges (lifecycle, cascade,
exclusivity) and domain edges (user-authored knowledge relationships) remain
architecturally distinct, for the same reasons: different owners, different
invariants, different change frequencies.

**The mechanism has changed.** The distinction is no longer encoded as a URI
namespace prefix (`sys:` vs. unprefixed). Instead:

- Every edge type is a `kn:EdgeType` node in the graph.
- System-level edge types (e.g., `knm:sys_contains`) carry an
  `kn:edge_category` property with value `"system"`.
- Domain-level edge types (e.g., `knm:prerequisite_of`, `knm:contains`) carry
  `kn:edge_category "domain"`.
- Subsystems query the edge-type node to determine category, rather than
  pattern-matching URI prefixes.

**Why the change:** Reflexivity means edge types are graph-native nodes with
their own properties. Category is naturally a property of the edge-type node,
not a lexical convention on its URI. This lets new categories be added as data,
not code (e.g., `"derived"`, `"audit"`, `"provenance"`).

**Edge count unchanged:** 13 domain edges + 1 derived (`assesses`) + 1 system
edge (`sys:contains`, now `knm:sys_contains` with `edge_category "system"`).

**Reconciliation concerns from the original ADR still apply** — the coherence
protocol between `sys:contains` and domain `contains` is unchanged in spirit.

---

---

## Context

The knowledge graph engine needs containment relationships (e.g., "CS101 contains Variable") that carry lifecycle semantics (cascade delete, exclusivity). Simultaneously, professors need organizational relationships (e.g., grouping nodes into modules) that they can freely modify.

The question: **should these be the same edge type, or separate?**

### The Tension

A single `contains` edge serves two masters:

1. **System concern:** Data integrity — cascade delete, exclusive ownership, lifecycle management. Controlled by developers. Must always hold.
2. **Domain concern:** Organizational grouping — the professor chose to put Variable in CS101. User-authored, freely modifiable.

These look identical ("X contains Y") but have **different invariants, different owners, and change for different reasons.**

---

## Decision

**The concept `contains` exists at two distinct levels — system and domain — as separate edge types with independent semantics.** This mirrors the MDE (Model-Driven Engineering) pattern where the same concept is reused at the meta-model level (M2) and the model level (M1).

Additionally, **`teaches` is a domain edge, not a system edge.** The fact that "Prof. Chen teaches CS101" is user-authored educational data, not engine plumbing.

### The Two Levels of `contains`

| Level | Edge | Semantics | Owner | Visible | Modifiable |
|---|---|---|---|---|---|
| System (M2) | `sys:contains` | Lifecycle ownership — cascade delete, exclusivity | Engine/developer | Hidden (power-user toggle) | No |
| Domain (M1) | `contains` | Organizational grouping — professor's course structure | Professor/user | Yes — always | Yes |

**Both express "X contains Y" but serve different masters.** The system level enforces data integrity invariants. The domain level represents the user's organizational choices. They coexist independently — a node can have `sys:contains` (lifecycle binding) without domain `contains` (not yet grouped), or vice versa.

### Full Edge Classification

| Edge | Namespace | Owner | Modifiable by user |
|---|---|---|---|
| `sys:contains` | System | Engine/developer | No — system-managed lifecycle |
| `contains` | Domain | Professor/user | Yes — organizational grouping |
| `teaches` | Domain | Professor/user | Yes — assignment data |
| `prerequisite_of`, `generalizes`, etc. | Domain | Professor/user | Yes — knowledge relationships |

**Result:** 13 formal domain edges + 1 derived (`assesses`) + 1 system edge (`sys:contains`).

---

## Rationale

A single `contains` edge conflates two concerns that change for different reasons:

| Concern | Who changes it | When | What breaks if wrong |
|---|---|---|---|
| `sys:contains` mechanics | Developer | Engine evolution | Data integrity — orphans, accidental deletions |
| Domain `contains` grouping | Professor | Course reorganization | Workflow — things aren't where expected |

Separating them allows each to evolve independently — the system can add new lifecycle policies without constraining user organization, and users can create new grouping patterns without triggering system behaviors they didn't intend.

> **Theoretical grounding:** See thesis notes — `Thesis/Notes/namespace-architecture-rationale.md`

---

## Trade-off Accepted

**Freedom to modify independently ↔ Obligation to maintain coherence across subsystems.**

Every subsystem that touches both `sys:contains` and domain `contains` needs a reconciliation strategy. For example:

- If the professor moves a node via domain `contains` (reorganizes into a module), does `sys:contains` follow or stay?
- If the system removes a `sys:contains` edge (course deletion cascade), should domain `contains` edges to the same node also be cleaned up?
- What if domain `contains` creates a grouping that contradicts `sys:contains` exclusivity?

These coherence questions are real engineering cost. The benefit (independent modifiability, clean separation of concerns) is judged to outweigh this cost, especially for a system whose thesis contribution is precisely about knowledge graph architecture.

---

## Consequences

1. **Edge schema** must distinguish system and domain namespaces at the type level
2. **All subsystems** (traversal, visualization, inference, validation) must handle both edge types and understand which is authoritative for lifecycle vs. organizational queries
3. **User-facing UI** shows domain `contains` as the organizational view; `sys:contains` is invisible unless in power-user/debug mode
4. **Inference rules** in Jena operate on domain edges; `sys:contains` is engine-internal state
5. **Coherence protocol** needed: each subsystem that touches both levels must define reconciliation behavior (e.g., what happens when domain `contains` and `sys:contains` disagree)

---

## Affected Design Documents

| Document | Changes Required |
|---|---|
| `KNOWLEDGE_NODE_MODEL.md` | `teaches` → domain edge; add `contains` to domain edges; remove `sys:teaches` from `ThesisSystemEdge`; update Session 5 decisions |
| `phase-2-type-system/TYPE_SYSTEM_DESIGN.md` | Same edge type changes in TypeScript definitions; update system edge visual styles |
| `phase-1-domain-data/DOMAIN_DATA_DESIGN.md` | Update system edge layer section; `sys:teaches` → `teaches` in data samples; update decision log |

---

## Related

- **Thesis rationale:** `Thesis/Notes/namespace-architecture-rationale.md`
- **ADR-001:** Backend and data architecture
