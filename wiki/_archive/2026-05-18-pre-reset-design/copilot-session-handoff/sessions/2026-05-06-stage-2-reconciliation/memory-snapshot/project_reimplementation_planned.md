---
name: KnowledgeNetworkDemo Stage 5+ code will be reimplemented
description: User signaled intent to rebuild the shipped backend/frontend from scratch when picking up Stage 6 work, so design-doc renames and decisions can move freely without keeping the current Stage 5 code in lockstep.
type: project
originSessionId: 9c9304f7-0568-4e2d-991b-f905866f4cb2
---
User confirmed (2026-04-28) plans to **re-implement the whole shipped Stage 5 implementation** when picking up Stage 6 work. This came up while deciding whether to apply view-name renames (meta-view → type-view, domain-view → knowledge-view, alignment overlay → map-view) to both docs and code.

Decision: rename in design docs only, skip code changes for Stage 5.

**Why:** Reimplementation is coming. Stage 5 code is a working proof of Claim 7 but is not the v1 production implementation. Synchronizing rename across the about-to-be-rewritten code is wasted effort.

**How to apply:**
- Don't worry about doc/code drift on Stage 5-only artifacts (`backend/Sparql/*-meta.rq`, `SparqlGraphRepository.cs` view branches, frontend view selector, GraphEndpointTests).
- Do keep design docs internally consistent — that's the governance layer for the rebuild.
- During Stage 6 implementation work, treat the current Stage 5 code as a reference implementation to learn from, not as something to incrementally evolve. Expect the rebuild to absorb the post-reconciliation decisions (14-symbol kn:, knl: instead of knm:, type-view/knowledge-view/map-view names, ADR-005/006/007 contracts) from a clean slate.
- This decision applies to **shipped Stage 5 code only**. Future Stage 6+ code should keep doc/code parity from the start.
