# KnowledgeNetworkThesisDemo

Implementation-first thesis demo: turning course material into a navigable
knowledge-node network with an editable presentation path.

The app today is the **Graph Disclosure Lab** — a client-only React
prototyping ground for graph-navigation UX, running over one hand-authored
corpus (a CS-topics domain, ~70 nodes, typed edges). It is organized as one
**Studio**: every navigation view (map, walk, unfold, tree, document, plex,
trail, lenses) is a pickable instrument on a shared sync bus, and presets
(coding / teaching / cockpit) are curated instrument compositions. It exists
to answer navigation-UX questions before they get built into the product
roadmap's later slices (canvas organization, presentation path, presentation
preview).

The roadmap's earlier slices — a graph-model backend and PPTX import — are
tracked in DocHub and have not started yet. There is currently no backend
and no PPTX import in this repo.

## Getting Started

```powershell
npm install
npm run dev
```

## Project Structure

```text
KnowledgeNetworkThesisDemo/
├── src/
│   ├── corpus/              # the hand-authored graph: nodes, deep layers, documents, walks
│   ├── model/               # pure derivations — layouts, lenses, visibility, nav helpers
│   ├── instruments/         # one file per navigation view (map, walk, tree, plex, trail, …)
│   ├── studio/              # StudioView — the instrument palette + presets + sync bus
│   ├── App.tsx, main.tsx
│   └── index.css
├── scripts/                 # deterministic verification and DocHub map-generation scripts
├── tools/*-spike/           # spike verification scripts + RESULTS.md write-ups
└── package.json
```

## Current Docs

The knowledge base lives in the sibling DocHub repository — goals, problems,
ideas, decisions, specs, roadmap, and orchestration:

- `D:\ShiZhong\MyCode\DocHub\docs\knowledge-network-thesis-demo\`

This repository holds app code, deterministic generators, and spike tooling
only; DocHub is the source of truth. See its `progress/` section for spike
write-ups (`EVoC-Auto-Clustering-Spike.md`, `Map-Tree-Walk-Navigation-Model.md`,
`Relation-Graphs-Lens-and-Preset-Model.md`).

## Scripts

```powershell
npm run dev
npm run build
npm run lint
npm run map          # regenerate DocHub's Architecture page from src/ imports
npm run spec-gate
npm run verify
```

## License

BSD-2-Clause - see [LICENSE](LICENSE).
