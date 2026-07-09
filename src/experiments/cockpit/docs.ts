// Hand-authored document bodies for every node in graph.ts (Part A of the
// cockpit spike). Bodies describe what a node structurally IS and does —
// terrain, not narrative. Walk order and story live in walks.ts, not here:
// a body may describe a node's own internal role (e.g. "the last gate
// before X"), but never references any walk's sequence.

import { nodes } from '../graph'

export const DOC_BODY: Record<string, string> = {
  // ── Root ────────────────────────────────────────────────────────────────
  root:
    'System — the whole pipeline this map describes: raw content comes in through Ingestion, ' +
    'becomes structured knowledge in the Knowledge Model, gets queried and connected in Reasoning, ' +
    'and reaches a person through Presentation, all kept running by Platform.',

  // ── Domains ─────────────────────────────────────────────────────────────
  ingestion:
    'Ingestion — everything that gets outside content into the system: pulling it from sources, ' +
    'parsing it into a common shape, and enriching it with the metadata the rest of the system depends on.',
  model:
    'Knowledge Model — where parsed, enriched content becomes graph structure: typed, validated ' +
    'against a schema, and stored durably.',
  reasoning:
    'Reasoning — the layer that does something with stored knowledge: answers queries and draws ' +
    'inferences like clustering and suggestion.',
  presentation:
    'Presentation — turns graph structure and query results into something a person can see and ' +
    'navigate: canvas rendering, navigation state, and search.',
  platform:
    'Platform — the operational substrate underneath all four other domains: runtime services, ' +
    'release delivery, and the pipelines that ship changes.',

  // ── Modules: Ingestion ──────────────────────────────────────────────────
  src: 'Sources — the entry points where outside content first reaches the system, one connector per origin.',
  prs: "Parsing — turns raw source material into a single normalized shape the rest of the pipeline can rely on.",
  enr:
    "Enrichment — adds the metadata (entities, summaries, embeddings, language) that later stages " +
    "depend on but raw content doesn't carry.",

  // ── Modules: Knowledge Model ────────────────────────────────────────────
  ont: 'Ontology — the schema layer: what types and relations are allowed to exist, and what constraints hold them consistent.',
  sto: 'Graph Store — durable storage for nodes and edges, plus the indexing, transactions, and caching that make it fast.',

  // ── Modules: Reasoning ──────────────────────────────────────────────────
  qry: 'Query — turns a request into an answer: parsing it, resolving a path through the graph, filtering, and ranking results.',
  inf: 'Inference — the background reasoning that runs without a direct request: rules, similarity, clustering, and suggestions.',

  // ── Modules: Presentation ───────────────────────────────────────────────
  cnv: "Canvas — the rendering surface: nodes, edges, layout, the minimap, and what's currently selected.",
  nav: 'Navigation — tracks where a person is and how they got there: breadcrumbs, history, focus, and keyboard movement.',
  sch: 'Search — free-text and fuzzy lookup over the graph, and the results list it produces.',

  // ── Modules: Platform ───────────────────────────────────────────────────
  run: 'Runtime — the services every other domain assumes are just running: the event bus, configuration, and auth.',
  del: 'Delivery — how changes and flags reach production, and what gets measured once they do.',
  pip: "Pipelines — the automation that builds, tests, and deploys the system itself; Delivery's own machinery.",

  // ── Leaves: Sources ─────────────────────────────────────────────────────
  'src-rss-connector':
    'Polls subscribed feeds on a schedule and hands each new item to Parsing as a raw document. It tracks ' +
    'per-feed cursors so a restart never re-ingests the same item twice. The most consistent source of ' +
    'low-effort, high-volume content.',
  'src-web-clipper':
    "Accepts a single URL or pasted fragment and fetches the page content directly, for the case where " +
    "there's no feed to subscribe to. Strips obvious chrome before handing off, though the real cleanup " +
    'happens in Parsing. Used far more for one-off saves than for anything scheduled.',
  'src-pdf-import':
    'Extracts text and structure from uploaded PDFs, including a best-effort pass at reconstructing ' +
    "reading order from a multi-column layout. Falls back to raw text extraction when structure can't be " +
    'recovered. The slowest of the four connectors, and the one most likely to need a human to check its output.',
  'src-email-gateway':
    'Watches a dedicated inbox and treats each incoming message as a document, attachments included. ' +
    'Threading is preserved so a reply chain ingests as one related group rather than isolated fragments. ' +
    'Spam filtering happens upstream of this connector, not inside it.',

  // ── Leaves: Parsing ─────────────────────────────────────────────────────
  'prs-markdown-parser':
    "Normalizes every incoming document to a single markdown dialect, regardless of what shape it arrived " +
    "in. This is the one format every later stage can assume it's working with. Malformed input degrades " +
    'to plain text rather than failing outright.',
  'prs-html-sanitizer':
    'Strips scripts, tracking pixels, and layout markup from web-sourced content before it reaches the ' +
    'markdown parser. Runs first in the pipeline for anything from the Web Clipper or RSS Connector. ' +
    "Deliberately conservative — it would rather leave content in than risk stripping something meaningful.",
  'prs-code-extractor':
    'Pulls fenced and inferred code blocks out of parsed documents and tags them with a detected language. ' +
    'Extracted code gets a distinct node type downstream, since it enriches and links differently than prose. ' +
    "Language detection is heuristic, not a full parser, and says so when it's unsure.",
  'prs-table-parser':
    'Converts markdown and HTML tables into structured rows and columns instead of leaving them as opaque ' +
    "text blocks. This is what lets a later query filter or sort on a value that started life inside a " +
    'table cell. Nested tables are flattened rather than represented recursively.',

  // ── Leaves: Enrichment ──────────────────────────────────────────────────
  'enr-entity-tagger':
    'Identifies named entities — people, projects, concepts — in a parsed document and proposes links to ' +
    'existing graph nodes for each one. Ambiguous matches are left for Reasoning to resolve rather than ' +
    'guessed here. The single biggest source of candidate edges into the Graph Store.',
  'enr-summarizer':
    'Produces a short abstract for each document, used anywhere the full text would be too much: search ' +
    "results, navigation previews, suggestion cards. Re-runs automatically when a document's tags change " +
    'enough to shift what the summary should emphasize.',
  'enr-embedding-builder':
    'Turns each document into the vector representation that similarity scoring and clustering both depend ' +
    "on. One of the busiest nodes in the whole system — almost nothing in Reasoning can run without it " +
    'having already touched a document. Re-embeds on any substantive content change, not on metadata-only edits.',
  'enr-language-detector':
    'Tags each document with its detected language before enrichment continues, since entity tagging and ' +
    'summarization are both language-sensitive. Falls back to the system default when confidence is low ' +
    'rather than guessing.',

  // ── Leaves: Ontology ────────────────────────────────────────────────────
  'ont-type-registry':
    'The authoritative list of node types the system knows about, and what fields each type carries. ' +
    'Everything written to the Graph Store is checked against this registry first. One of the busiest ' +
    'nodes in the whole map — almost every write path touches it.',
  'ont-schema-validator':
    'Checks an incoming node or edge against the Type Registry and Constraint Engine before it is allowed ' +
    'into storage. Rejections come back with a specific field-level reason, not just pass/fail. The last ' +
    'gate before anything becomes durable.',
  'ont-relation-catalog':
    'Defines which edge types are allowed to connect which node types, and in which direction. Consulted ' +
    'by the schema validator on every edge write, and by Query when it needs to know what a path could ' +
    'possibly mean.',
  'ont-constraint-engine':
    'Enforces structural rules that span more than one field or node — uniqueness, required relations, ' +
    "cardinality limits. Runs after the Type Registry's simpler per-field checks, for the constraints " +
    "those checks can't express alone.",

  // ── Leaves: Graph Store ─────────────────────────────────────────────────
  'sto-node-repository':
    'The durable store of record for every node in the graph. One of the busiest nodes in the system: ' +
    'reasoning reads from it constantly, and every enrichment pass eventually writes back to it. Nothing ' +
    "downstream trusts a node that hasn't landed here.",
  'sto-edge-repository':
    "The durable store of record for every edge, kept separate from nodes so relationship-heavy queries " +
    "don't have to scan node records to find them. Shares its transaction boundary with the Node " +
    'Repository — the two are never allowed to disagree about what exists.',
  'sto-index-manager':
    'Maintains the secondary indexes that make Query fast: by type, by tag, by time, by embedding ' +
    'proximity. Rebuilds incrementally as writes land rather than in a separate batch job.',
  'sto-transaction-log':
    'An append-only record of every write to the graph, used for crash recovery and for replaying history ' +
    'when something needs to be reconstructed. Nothing is ever deleted from it; corrections are new ' +
    'entries, not edits to old ones.',
  'sto-cache-layer':
    'Sits in front of the repositories to absorb the read load that Query and Inference generate. ' +
    'Invalidated eagerly on write rather than on a timer, trading a little write latency for never ' +
    'serving stale graph structure.',

  // ── Leaves: Query ───────────────────────────────────────────────────────
  'qry-query-parser':
    'Turns a raw query string into a structured request the rest of Query can act on. One of the busiest ' +
    'nodes in the system, since it sits at the front of every search and every walk-planner request. ' +
    'Malformed queries fail here, before touching the graph at all.',
  'qry-path-resolver':
    "Given a structured query, figures out which traversal through the graph could answer it, consulting " +
    "the Ontology's relation catalog for which edge types are even legal to follow. Returns a candidate " +
    'path, not yet filtered or ranked.',
  'qry-filter-engine':
    "Narrows a resolver's candidate path down using the query's actual constraints — type, tag, date " +
    'range — before ranking does the more expensive relevance work. Runs early deliberately, so ranking ' +
    'never has to score something that was never going to qualify.',
  'qry-result-ranker':
    'Orders a filtered result set by relevance, blending embedding similarity with structural signals like ' +
    "how central a node is. The last step before results reach Presentation's Search module.",

  // ── Leaves: Inference ───────────────────────────────────────────────────
  'inf-rule-engine':
    "Runs authored if-this-then-that rules over the graph in the background — the one part of Inference " +
    "that's fully deterministic rather than learned or scored. Used for the cases where an explicit rule " +
    'is more trustworthy than a similarity threshold.',
  'inf-similarity-scorer':
    "Computes pairwise similarity between documents using the vectors Enrichment's embedding builder " +
    'produced. Feeds both the cluster detector and, more directly, anything in Presentation that wants to ' +
    'suggest related content.',
  'inf-cluster-detector':
    'Groups documents into clusters based on similarity scores, run periodically rather than on every ' +
    'write since it needs a stable-enough snapshot to be worth trusting. Its output is a proposal, not an ' +
    'authored grouping.',
  'inf-suggestion-builder':
    'Turns similarity scores and cluster membership into concrete suggestions — related documents, ' +
    "possible tags, candidate links — surfaced wherever Presentation has room to show them. The most " +
    "visible output of Inference, even though it's built entirely on other nodes' work.",

  // ── Leaves: Canvas ──────────────────────────────────────────────────────
  'cnv-node-renderer':
    'Draws each visible node on the canvas according to its type and current state — selected, ' +
    'highlighted, dimmed. Reads directly from whatever the active view has decided is visible; it has no ' +
    'opinion of its own about what should be on screen.',
  'cnv-edge-renderer':
    "Draws the connections between visible nodes, including the aggregated edges that stand in for many " +
    'hidden ones at once. Styling comes from edge type and count, not from the renderer\'s own logic.',
  'cnv-layout-engine':
    'Computes where nodes sit on the canvas — packing, force-directed embedding, or a fixed layout ' +
    'depending on which view is asking. Deliberately kept separate from rendering so a layout can be ' +
    'computed once and reused across a session.',
  'cnv-minimap':
    'A small overview of the full canvas, always visible regardless of how far the main view has zoomed ' +
    "or panned. Exists specifically to answer 'where am I relative to everything' without leaving the " +
    'current view.',
  'cnv-selection-manager':
    'Tracks which node or nodes are currently selected or pinned, and broadcasts that state to whatever ' +
    'else on screen needs to react to it — a details panel, a highlighted set of edges, a context menu.',

  // ── Leaves: Navigation ──────────────────────────────────────────────────
  'nav-breadcrumbs':
    'Shows the containment ancestry of wherever the current view is rooted, and lets a click jump ' +
    'straight back up to any ancestor. Reflects structural position only — it does not track the order ' +
    'things were visited in.',
  'nav-history-stack':
    'Records the sequence of nodes actually visited, in order, independent of the containment structure ' +
    'Breadcrumbs shows. The two diverge the moment a cross-link is followed instead of a strictly ' +
    'hierarchical move, and that divergence is the whole reason both exist.',
  'nav-focus-controller':
    "Owns the single 'current node' concept that the rest of Navigation and Canvas key off of. Every other " +
    'navigation action — breadcrumb click, history entry, keyboard move — ultimately calls through here to ' +
    'change focus.',
  'nav-keyboard-nav':
    'Maps keyboard input to focus and selection changes, for moving through the graph without reaching for ' +
    'a pointer. Built on top of the Focus Controller rather than mutating focus state directly.',

  // ── Leaves: Search ──────────────────────────────────────────────────────
  'sch-search-index':
    "The text index Query's parser and filter engine search against — built from every document's parsed " +
    'content plus its enrichment tags, kept current as Ingestion adds new material.',
  'sch-fuzzy-matcher':
    'Handles typos and near-matches that an exact index lookup would miss, sitting in front of the Search ' +
    'Index for anything that misses a direct hit. Tuned to favor recall over precision, since a wrong ' +
    'fuzzy suggestion costs less than a missed one.',
  'sch-result-list':
    'Renders a ranked result set as an actual list a person can scan and click into, handling pagination ' +
    "and per-result preview text pulled from Enrichment's summaries.",

  // ── Leaves: Runtime ─────────────────────────────────────────────────────
  'run-event-bus':
    "Carries events between domains that otherwise have no direct dependency on each other — Ingestion " +
    "doesn't need to know Presentation exists, it just publishes, and anything listening reacts. One of " +
    'the busiest nodes in the system precisely because of that decoupling: everything eventually talks ' +
    'through it.',
  'run-config-service':
    "The single source of truth for runtime configuration across every domain, so a setting changed once " +
    "doesn't need to be reconciled in five different places. Watched, not polled — changes propagate as " +
    'events on the Event Bus.',
  'run-auth-guard':
    'Checks that a request is allowed before it reaches anything that would act on it, at the boundary ' +
    'rather than scattered through individual modules. Every other node in the system assumes this check ' +
    'already happened.',

  // ── Leaves: Delivery ────────────────────────────────────────────────────
  'del-release-manager':
    'Coordinates what version of the system is actually running, and rolls a release forward or back. ' +
    "Consumes the Pipelines module's build and test output directly rather than trusting an external signal.",
  'del-feature-flags':
    'Lets a capability ship dark and turn on independently of a release, for anything risky enough to ' +
    'want a kill switch. Read by any domain, though most flags in practice gate Presentation and ' +
    'Reasoning behavior.',
  'del-telemetry':
    'Collects operational signal from every other domain — error rates, latency, usage — and is often the ' +
    "first place a problem becomes visible before a person notices it directly. Feeds back into Delivery's " +
    'own release decisions as much as it feeds dashboards.',

  // ── Leaves: Pipelines ───────────────────────────────────────────────────
  'pip-build-runner':
    'Compiles and packages the system on every change, the first automated gate a commit passes through. ' +
    'Failing here means nothing downstream in Pipelines even attempts to run.',
  'pip-test-harness':
    'Runs the automated test suite against a build artifact and reports pass/fail back to the Release ' +
    'Manager. Sits between Build Runner and Deploy Bot, and neither trusts an artifact that skipped it.',
  'pip-deploy-bot':
    'Takes a tested build artifact and actually ships it, the last of the three Pipelines steps. Reports ' +
    'its own outcome back through Telemetry, so a bad deploy shows up in the same signal stream as any ' +
    'other operational problem.',
}

// Module-load guard: every graph node must have a body, and every body key
// must be a real graph node — the two lists must match exactly.
{
  const graphIds = new Set(nodes.map((n) => n.id))
  const bodyIds = new Set(Object.keys(DOC_BODY))
  const missing = [...graphIds].filter((id) => !bodyIds.has(id))
  const extra = [...bodyIds].filter((id) => !graphIds.has(id))
  if (missing.length) throw new Error(`DOC_BODY missing bodies for: ${missing.join(', ')}`)
  if (extra.length) throw new Error(`DOC_BODY has bodies for unknown ids: ${extra.join(', ')}`)
}
