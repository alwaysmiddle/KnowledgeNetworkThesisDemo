// Authored walks (Part A of the cockpit spike) — first-class narrative
// artifacts over the same corpus docs.ts describes as terrain. Domain
// sequence is fixed as ingestion(0) < model(1) < reasoning(2) <
// presentation(3) < platform(4); a "twist" in Walk 1 is a jump between
// consecutive stops whose domain index differs by 2 or more (skipping over
// or doubling back across at least one domain), vs. a plain step to a
// neighboring domain. That reading of "not tree-adjacent" was the simplest
// one available — recorded here since the handoff left it ambiguous.

import { byId } from '../graph'

export interface Walk {
  id: string
  title: string
  description: string
  stops: { id: string; note: string }[] // ids are leaf ids
}

export const WALKS: Walk[] = [
  {
    id: 'article-to-knowledge',
    title: 'How an article becomes knowledge',
    description:
      'Follows one article from the moment it arrives through Ingestion to the moment it is searchable — ' +
      'including the feedback loops that make it a real pipeline instead of a straight line.',
    stops: [
      { id: 'src-rss-connector', note: "An article lands through the RSS connector — the walk's first foothold in Ingestion." },
      { id: 'prs-markdown-parser', note: 'The raw feed gets normalized to markdown before anything else can touch it.' },
      { id: 'enr-entity-tagger', note: 'A tagging pass pulls out the entities the rest of the system will index by.' },
      {
        id: 'enr-embedding-builder',
        note: "Now that it's parsed and tagged, its embedding is what makes it findable by meaning, not just keyword.",
      },
      { id: 'sto-node-repository', note: 'The embedded node is written into the graph store, crossing from Ingestion into the Knowledge Model.' },
      { id: 'ont-type-registry', note: "Before it's trusted, the node is classified against the ontology's type registry." },
      { id: 'qry-query-parser', note: 'A live query happens to touch the freshly typed node on its way through Query parsing.' },
      { id: 'inf-cluster-detector', note: 'Background inference sweeps it into a cluster with related material.' },
      {
        id: 'enr-summarizer',
        note:
          'First twist: the new cluster is different enough to trigger a re-summarization pass back in ' +
          'Enrichment, two domains back.',
      },
      {
        id: 'inf-suggestion-builder',
        note: 'Second twist: the refreshed summary flows forward again to build a suggestion — Reasoning picking up where it left off.',
      },
      { id: 'cnv-node-renderer', note: 'The suggestion finally reaches the canvas and gets rendered for a human to see.' },
      { id: 'del-telemetry', note: 'Every render emits a telemetry event, landing the walk in Platform.' },
      {
        id: 'ont-schema-validator',
        note:
          'Third twist: telemetry catches a schema drift and routes the alert straight back to the ' +
          "ontology's validator — Platform talking directly to the Knowledge Model.",
      },
      {
        id: 'sch-search-index',
        note:
          'Fourth twist: once validated, the corrected node is indexed for search — an article that started ' +
          'as an RSS item is now something you can find.',
      },
    ],
  },
  {
    id: 'query-journey',
    title: 'Where a query goes',
    description: "A shorter walk in the opposite direction: what happens between typing a search and seeing results.",
    stops: [
      { id: 'sch-search-index', note: 'A search box in Presentation is where every query begins.' },
      { id: 'qry-query-parser', note: 'The raw text gets parsed into a structured query shape.' },
      { id: 'qry-path-resolver', note: 'The parser hands off to the path resolver, which figures out which part of the graph to walk.' },
      { id: 'qry-filter-engine', note: 'A filter engine narrows the candidate set before anything expensive runs.' },
      { id: 'sto-edge-repository', note: 'The filtered path pulls real edges out of the graph store.' },
      { id: 'qry-result-ranker', note: 'Back in Query, a ranker orders what came back by relevance.' },
      { id: 'sch-result-list', note: "The ranked results reach the result list — the query's answer, made visible." },
      {
        id: 'nav-history-stack',
        note: 'The query itself gets pushed onto the navigation history, so the walk back is as easy as the walk forward.',
      },
    ],
  },
]

// Module-load guard: every stop id must be a real leaf in graph.ts.
for (const w of WALKS) {
  for (const s of w.stops) {
    const n = byId.get(s.id)
    if (!n) throw new Error(`walk "${w.id}" references unknown node id: ${s.id}`)
    if (n.kind !== 'leaf') throw new Error(`walk "${w.id}" stop ${s.id} is not a leaf`)
  }
}
