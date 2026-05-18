# KnowledgeNetworkThesisDemo

Thesis demo prototype for turning course material into an editable knowledge
node network and a presentation path.

The current implementation-first scope starts with PowerPoint import:

1. Import a `.pptx` deck.
2. Convert slides into editable nodes.
3. Show those nodes on a ReactFlow canvas.
4. Let the user edit, connect, group, and collapse nodes.
5. Let the user build and preview a presentation sequence through the graph.

Ontology, RDF, SPARQL, Fuseki/Jena, OWL inference, EVOC, and external ontology
alignment are deferred. They may return after the node-building and
presentation experience works.

## Architecture

```text
React (Vite) :5173  - frontend graph canvas
Neo4j 5      :7474  - graph database browser
Neo4j Bolt   :7687  - application database connection
```

The current frontend uses mock data while the Neo4j-backed persistence layer is
rebuilt.

## Prerequisites

- Node.js
- Docker Desktop

## Getting Started

Install frontend dependencies:

```powershell
npm install
```

Start Neo4j:

```powershell
docker compose up -d
```

Start the frontend dev server:

```powershell
npm run dev
```

## Service Health Checks

| Service | URL |
|---|---|
| Neo4j Browser | http://localhost:7474 |

Default local Neo4j credentials are configured in `docker-compose.yml`:

- user: `neo4j`
- password: `kndemopw`

## Project Structure

```text
KnowledgeNetworkThesisDemo/
├── docs/                  # active design docs and archived prior design corpus
├── src/                   # React + TypeScript frontend
│   ├── components/        # ReactFlow canvas, node, and edge components
│   ├── data/              # current mock graph data
│   ├── lib/               # layer, layout, and traversal helpers
│   └── types.ts           # shared frontend type definitions
├── docker-compose.yml     # Neo4j only
└── package.json           # frontend scripts
```

## Current Docs

- `docs/README.md`
- `docs/DESIGN_SESSION_001_SCOPE_RESET.md`
- `docs/MVP_SCOPE.md`

Previous design work is archived under:

- `docs/_archive/2026-05-18-pre-reset-design/`

## Scripts

```powershell
npm run dev
npm run build
npm run lint
```

## License

BSD-2-Clause - see [LICENSE](LICENSE).
