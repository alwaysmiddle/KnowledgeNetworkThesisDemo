# Vision

**Status:** Draft v1 — 2026-04-24
**Authors:** Shizhong Yu (product owner), drafted through structured interview
**Purpose:** Governs all architectural and product decisions for the KnowledgeNetwork product. The thesis demo (KnowledgeNetworkDemo) is a simplified, defendable instance of this vision.

---

## 1. Problem

Information is abundant; organization is scarce.

Every knowledge worker, learner, and curator faces the same landscape: too much information, no credible single source that presents evidence side-by-side, and no map of how ideas connect. Wikipedia is good but slow. Video is thorough but endless. LLMs are fast but opaque — answers without provenance, without structure, without a place for the reader to stand.

The deeper problem is that **organizing information at human scale has become impossible for any individual** — yet no system is helping. There is no roadmap, no structure, no shared spatial sense of where ideas live. People are expected to build this for themselves, privately, in their own heads, from scratch, for every topic they care about. The result is constant cognitive stress — not because people are incapable, but because the tools never caught up with the volume.

What's missing is a **general-purpose substrate for organizing knowledge visually, semantically, and collaboratively with machine help**, such that understanding compounds instead of evaporating.

---

## 2. Vision

**A tool that lets a single person visually organize everything they know — and everything they're trying to learn — as a living, zoomable, semantically-typed graph of nodes, where each node is both a vertex in the graph and a rich document of its own content, and where the structure of the graph grows in rigor as the graph grows in size, with an LLM as constant partner for classification, reference-finding, and organization.**

The graph is a world map of the user's knowledge. They start zoomed out and see the shape of the territory. They zoom in and see detail. They author by double-clicking, dragging edges, and typing into nodes. They review by switching modes and seeing the same content as a clean, consumable presentation. The substrate is the same whether they are making or browsing.

Over time, usage grows. Five-year horizon: **a general utility like Excel or PowerPoint** — something people reach for when they want to organize information or communicate intent. Not a specialized researcher's tool. A default.

---

## 3. Positioning

The product occupies space that existing tools touch but none fully claim.

| Existing tool | What it does well | What it leaves unsolved |
|---|---|---|
| **Obsidian / Logseq / Roam** | Text-first personal knowledge base with backlinks. Free-form authoring. | No semantic zoom. No world-map view. Graph view is cosmetic, not navigational. Typing is ad-hoc tags. No LLM-mediated growth of rigor. |
| **Neo4j Browser / Palantir / Linkurious** | Industrial graph databases with expert-level query and visualization. | Authoring is a developer task, not a user task. No free-form onset. Typed from the start. Expert-only contract. |
| **LLM chat (ChatGPT, Claude)** | Fast answers, generative conversation. | No structure, no provenance, no spatial persistence. Answers evaporate. No way to *accumulate* understanding. |
| **Mind-mapping tools (Miro, MindNode)** | Visual, free-form, friendly. | No semantic typing. No LLM mediation. No zoom-to-detail. No node-as-document. |
| **MDE / Model-Driven Engineering** | Rigorous metamodels, formal semantics, expressiveness. | Strict syntax. Mastery becomes a profession. Wrong contract for general users. |
| **Wikipedia / encyclopedias** | Curated, cited, broad. | Editing contract is too heavy for personal use. No spatial structure. Reading, not authoring. |

### The key positioning move: vs MDE

MDE has the **right expressiveness** — metamodels, typed nodes, typed edges, formal inference — but the **wrong contract**. MDE demands that the user commit to a metamodel before they can work. Mastering MDE is itself a profession.

This product inverts the contract:

- **MDE contract:** "Commit to the metamodel upfront, then you can work."
- **This product's contract:** "Start free. Structure grows as your graph earns it."

Typing is a **gradient, not a gate**. The LLM mediates the gradient — proposing types, noticing patterns, surfacing consolidation opportunities. The user never has to stop and learn a syntax; the structure thickens around them as their knowledge base reaches a size where structure pays off.

This principle is load-bearing. It is the answer to the question *"how do we get MDE expressiveness without MDE's contract?"* — and the answer is **structure earned, not imposed**.

---

## 4. Core Principles

Non-negotiables. Every architectural decision must respect these.

### 4.1 Everything the user knows is a node

The user's knowledge — concepts, examples, references, personal notes, domain entities, relationships between them — is represented as nodes and edges in a single graph. The user does not switch between "notes mode" and "graph mode" and "database mode"; there is one substrate.

**Scope for v1:** User-authored content only. Application configuration, backend plumbing, runtime state, architecture descriptions — these remain outside the graph in v1. Bringing them in-graph is a named future direction (see §6).

### 4.2 A node is both a vertex and a document

Every node has two faces: a position in the graph (with identity, type, edges to other nodes) and a rich body (text, headings, code blocks, media, references). Neither face can be removed without breaking the product identity.

- Graph without documents = empty structure.
- Documents without graph = isolated notes.

The editor must support both simultaneously. This is a defining feature, not a layout convenience.

### 4.3 Structure earned, not imposed

Authoring starts free-form. A user who has just opened the app can double-click to make a node, type into it, drag an edge to another node, and never once encounter the word "type."

As the graph grows:
- The LLM proposes node and edge types based on observed content.
- IntelliSense surfaces existing vocabulary when the user labels an edge.
- The editor becomes progressively more insistent about consistency — gently, not punitively.

Small graph = playful free-form. Large graph = gently guided toward structure *because structure is what makes the large graph navigable*. The gradient is automatic and driven by scale.

### 4.4 LLM as mediator, not author

The LLM is a constant partner: it proposes types, classifies content, fetches references from the web or knowledge banks, helps navigate, offers interpretation, suggests organization. It operates in two modes:

- **Copilot mode** — ambient suggestions as the user works.
- **On-demand mode** — the user explicitly asks for help.

**The user stays in control.** The LLM does not silently modify the graph. When the LLM fetches external context, the result is surfaced for the user to cite, attach, or discard. Attribution is preserved.

### 4.5 Visual and textual authoring, unified surface

The user authors through both the graph canvas (visual — node placement, edge drawing, spatial layout) and the node body editor (textual — writing, structuring content). These are not separate applications. They are two views of the same substrate, and the user moves between them without friction.

### 4.6 Navigation is world-map + semantic zoom

The graph is presented as a world map. The user starts zoomed out and sees the overall shape — clusters, regions, cluster names. As they zoom in, **different content** appears — finer structure, more nodes, more detail. This is semantic zoom, not geometric zoom.

Hierarchy is either:
- **Computed** by an embedding + multi-granularity clustering pipeline (EVōC) when no human-authored layout exists, or
- **Authored** by the curator when they've made explicit structural decisions.

Both coexist. Spatial layout is stable across filter changes, so users build a spatial memory of their knowledge.

### 4.7 Two modes, one substrate: author and consume

The tool has two modes, consciously separated and visually distinct:

- **Author mode** — expert cockpit. All affordances exposed: edge-drawing tools, LLM copilot panel, reference panel, version history, type suggestions. The mental model is *workshop*.
- **Consume mode** — layperson gallery. Reduced chrome. Clean. Emphasizes content, shape, zoom. The mental model is *presentation*.

Both modes read the same graph. The substrate does not change. What differs is the rendering contract and the available affordances. A user switching modes does not lose orientation — the spatial layout and node identities are continuous.

### 4.8 Reflexive substrate

The substrate meta-model — node types, edge types, edge categories, and inference-relevant metadata — is stored in the same RDF graph as user content and rendered by the same graph engine. App-level visual styling may be supplied outside RDF in v1. The tool can visualize itself.

**Scope for v1:** Reflexivity is a property of the substrate, not of the user experience. The user does not edit the meta-model through the editor. The claim is that the substrate *holds* the meta-model identically to how it holds user data, and renders it identically — not that the user operates on it.

**Scope boundary:** App-level visual styling, lifecycle predicates, document binding, and rendering preferences live outside RDF in v1 (see ADR-005). They are app config, not substrate. Bringing any of them back into the graph is a Reading B/C future direction, not a v1 commitment.

### 4.9 Versioning as first-class

Knowledge changes. The tool treats the graph as versioned state at multiple granularities: per-node (live text-editor-style history), per-region (git-style commits, branches, rollback over a selected subgraph), per-whole-graph (snapshots). This is a design constraint, not an afterthought.

**Scope for v1:** The full vision is git-style multi-granularity versioning. The demo implementation may be a simplified version (see §7).

---

## 5. The User

**The user is a single person who is both curator and learner.** The same person creates knowledge nodes and later consumes them. The same person will, at different moments, be authoring something new or orienting themselves in something old. There is no division of labor between "knowledge producer" and "knowledge consumer" at the tool level — it is one person across time.

**v1 target: personal use.** The user works on their own graph. Sharing, collaboration, multi-user editing, and publishing flows are deferred.

**5-year aspiration: general utility.** The tool reaches the ubiquity of Excel or PowerPoint — something people reach for by default when organizing information or communicating intent. At that horizon the user base broadens from technically inclined early adopters to general knowledge workers.

**The "serious business" distinction.** When knowledge moves from personal notes to public presentation, the stakes rise. "Serious business" is not a mode at the authoring surface — it is a property of the publishing moment. Publishing-to-others involves rigor, review, credibility systems. Those systems exist in society already (peer review, citation, editorial oversight). The tool will eventually integrate them as deferred concerns. For v1, this entire dimension is out of scope.

---

## 6. Scope

### In scope for v1

- Notes-first authoring loop (double-click to create, drag to connect, type to fill)
- Progressive typing gradient with LLM mediation
- World-map + semantic zoom navigation (EVōC-backed)
- Compound graph detail view with dual containment (semantic clusters + authored structure)
- Two-mode UX: author cockpit and consume gallery
- Node-as-document (graph vertex + rich text body, same node)
- LLM integration: copilot + on-demand, web-context surfacing with user control
- Multi-granularity versioning (scope simplified for demo — see §7)
- Reflexive substrate: meta-model stored and rendered identically to user data

### Out of scope for v1 — aspirational (Reading B)

These are exciting and part of the long-term product identity, but not v1 commitments:

- Application configuration as in-graph nodes (visual styles, view preferences, user-defined types)
- User-customizable meta-model through the editor
- Custom node and edge type definitions authored through the graph UI
- Saved layouts as first-class nodes

### Out of scope for v1 — research horizon (Reading C)

Named for completeness; treated as research vision, not product commitment:

- Full architectural self-reflection (the app's own structure as an editable subgraph)
- Configuration-as-data down to backend plumbing
- The engine editing itself

### Out of scope for v1 — social/publishing

- Multi-user collaboration
- Sharing and publishing to external audiences
- Credibility / peer-review / rigor-tier systems
- Cross-graph federation

These are real product directions — but they belong to future versions, not v1.

### Explicit non-goals

- **Not a database administration tool.** The user does not write SPARQL or Cypher.
- **Not a programming environment.** The user does not write code to define types.
- **Not an MDE tool.** The user is never required to commit to a metamodel before authoring.
- **Not an LLM chat interface.** The LLM mediates the graph; it does not replace the graph.

---

## 7. Role of the Thesis Demo

**KnowledgeNetworkDemo is a constrained, defendable instance of this vision — not the v1 product.**

The vision document sits alongside the demo and guides its direction. Individual demo features may be simplified versions of their vision counterparts, as long as the thesis claims remain defensible.

### What the demo must demonstrate (real, not token)

These are claim-bearing. They must work.

| Thesis claim | Demo requirement |
|---|---|
| **C1 — Node type coverage** | 9 domain node types authored, visible, filterable |
| **C2 — OWL 2 RL inference** | Live inference run, derived edges appear, Jena reasoner in place |
| **C3 — SPARQL validation** | Structural rules run as SPARQL, results surfaced |
| **C4 — Linear traversal** | Prerequisite chain + gap detection, working against real data |
| **C5 — Explore traversal** | Full neighborhood retrieval, working |
| **C6 — Problem-First traversal** | Backward reachability from Assessment, working |
| **C7 — Reflexivity** | The substrate meta-model — node types, edge types, edge categories, and inference-relevant metadata — is stored in the same RDF graph as user content and rendered by the same graph engine. App-level visual styling may be supplied outside RDF in v1. Demonstrated in Stage 5 (`/api/graph?view=type` returns the meta-model live from Fuseki). |

### What the demo may simplify (token, not full)

These illustrate the vision without carrying thesis weight.

| Vision feature | Demo implementation |
|---|---|
| **Versioning** | Simple save-state or basic undo/history. Not full git-style branches. |
| **LLM integration** | Real wire-up (API or local classification model) exercised in a scripted scenario. Enough to demonstrate the integration pattern; not a full copilot experience. |
| **Authoring loop** | Demo ships with pre-authored graph. Free-form authoring shown as a narrow walkthrough, not the primary surface. |
| **Two-mode UX** | Author and consume modes distinct enough to demonstrate the split. Full polish deferred. |
| **Progressive typing gradient** | Demonstrated conceptually; demo content is already fully typed. |

### What the demo does not attempt

- Readings B and C (in-graph app config, full architectural reflexivity)
- Multi-user / sharing / publishing
- Production-grade performance at scale beyond curriculum size (~500–1000 nodes)

### Relationship to this document

If a demo feature contradicts this vision document, the vision document wins — and the demo should be scoped to match, or the vision document should be explicitly amended. Decisions taken during demo implementation that diverge from the vision should be recorded as ADRs so the divergence is visible.

---

## Appendix — Vision Principles Summary

For quick reference. Read §4 for full text.

1. Everything the user knows is a node *(Reading A: user content only)*
2. A node is both a vertex and a document
3. Structure earned, not imposed *(progressive typing gradient)*
4. LLM as mediator, not author
5. Visual and textual authoring, unified surface
6. Navigation is world-map + semantic zoom
7. Two modes, one substrate: author and consume
8. Reflexive substrate *(property of substrate, not of UX in v1)*
9. Versioning as first-class

---

**Next documents that should descend from this vision:**

- Architectural decisions that follow from §4 (type system scope, namespace discipline, versioning mechanism, mode split in frontend) — future ADRs
- Stage 6 implementation specs that turn §7 demo claims into concrete data, API, and UI contracts
- Revisit `ADR-004-kn-namespace-tiers.md` under the lens of this vision (likely supersede or rewrite)
