// Deterministic synthetic corpus for the disclosure experiments:
// 50 leaf nodes in a 5-domain / 13-module tree (one branch goes to depth 4),
// plus EXACTLY 200 typed leaf-to-leaf edges from a seeded PRNG. The point is
// a graph the size of the real DocHub corpus (53n/217e) that we can reshape
// freely. Same seed -> same graph, every run, so views are comparable.

export type EdgeType = 'depends_on' | 'data_flow' | 'references' | 'implements'

export interface GNode {
  id: string
  kind: 'container' | 'leaf'
  parentId: string | null // null only for root
  title: string
}

export interface GEdge {
  id: string
  source: string // always a leaf
  target: string // always a leaf
  type: EdgeType
}

export const ROOT_ID = 'root'

// ── Palette (validated 8-slot categorical set; see dataviz skill) ───────────
// Domains take slots 1–5 (node identity); edge types take slots 6–8 + neutral
// gray. Keeping the channels hue-disjoint means an edge color can never be
// misread as a domain color. `depends_on` is the most common type, so it gets
// the gray: structure recedes, rarer semantic links pop.
export const DOMAIN_COLOR: Record<string, string> = {
  ingestion: '#2a78d6', // blue
  model: '#4a3aa7', // violet
  reasoning: '#1baf7a', // aqua
  presentation: '#eda100', // yellow
  platform: '#008300', // green
}

export const EDGE_COLOR: Record<EdgeType, string> = {
  depends_on: '#94a3b8', // neutral slate — the backbone, deliberately quiet
  data_flow: '#eb6834', // orange
  references: '#e87ba4', // magenta
  implements: '#e34948', // red
}
export const MIXED_EDGE_COLOR = '#64748b' // aggregate of several types

export const EDGE_LABEL: Record<EdgeType, string> = {
  depends_on: 'depends on',
  data_flow: 'data flow',
  references: 'references',
  implements: 'implements',
}

// ── Tree ────────────────────────────────────────────────────────────────────
const N: GNode[] = [{ id: ROOT_ID, kind: 'container', parentId: null, title: 'System' }]

function container(id: string, parentId: string, title: string): string {
  N.push({ id, kind: 'container', parentId, title })
  return id
}
function leaves(parentId: string, prefix: string, titles: string[]) {
  for (const t of titles) {
    N.push({
      id: `${prefix}-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      kind: 'leaf',
      parentId,
      title: t,
    })
  }
}

// depth 1: domains, depth 2: modules, depth 3: leaves…
const ingestion = container('ingestion', ROOT_ID, 'Ingestion')
leaves(container('src', ingestion, 'Sources'), 'src', ['RSS Connector', 'Web Clipper', 'PDF Import', 'Email Gateway'])
leaves(container('prs', ingestion, 'Parsing'), 'prs', ['Markdown Parser', 'HTML Sanitizer', 'Code Extractor', 'Table Parser'])
leaves(container('enr', ingestion, 'Enrichment'), 'enr', ['Entity Tagger', 'Summarizer', 'Embedding Builder', 'Language Detector'])

const model = container('model', ROOT_ID, 'Knowledge Model')
leaves(container('ont', model, 'Ontology'), 'ont', ['Type Registry', 'Schema Validator', 'Relation Catalog', 'Constraint Engine'])
leaves(container('sto', model, 'Graph Store'), 'sto', ['Node Repository', 'Edge Repository', 'Index Manager', 'Transaction Log', 'Cache Layer'])

const reasoning = container('reasoning', ROOT_ID, 'Reasoning')
leaves(container('qry', reasoning, 'Query'), 'qry', ['Query Parser', 'Path Resolver', 'Filter Engine', 'Result Ranker'])
leaves(container('inf', reasoning, 'Inference'), 'inf', ['Rule Engine', 'Similarity Scorer', 'Cluster Detector', 'Suggestion Builder'])

const presentation = container('presentation', ROOT_ID, 'Presentation')
leaves(container('cnv', presentation, 'Canvas'), 'cnv', ['Node Renderer', 'Edge Renderer', 'Layout Engine', 'Minimap', 'Selection Manager'])
leaves(container('nav', presentation, 'Navigation'), 'nav', ['Breadcrumbs', 'History Stack', 'Focus Controller', 'Keyboard Nav'])
leaves(container('sch', presentation, 'Search'), 'sch', ['Search Index', 'Fuzzy Matcher', 'Result List'])

const platform = container('platform', ROOT_ID, 'Platform')
leaves(container('run', platform, 'Runtime'), 'run', ['Event Bus', 'Config Service', 'Auth Guard'])
const delivery = container('del', platform, 'Delivery')
leaves(delivery, 'del', ['Release Manager', 'Feature Flags', 'Telemetry'])
// …and ONE depth-4 branch, to exercise the "limit depth to 3–4" constraint.
leaves(container('pip', delivery, 'Pipelines'), 'pip', ['Build Runner', 'Test Harness', 'Deploy Bot'])

export const nodes: GNode[] = N

// ── Derived indexes ─────────────────────────────────────────────────────────
export const byId = new Map(nodes.map((n) => [n.id, n]))
export const childrenOf = new Map<string, GNode[]>()
for (const n of nodes) {
  if (n.parentId === null) continue
  const list = childrenOf.get(n.parentId) ?? []
  list.push(n)
  childrenOf.set(n.parentId, list)
}

export const allContainerIds = nodes.filter((n) => n.kind === 'container' && n.id !== ROOT_ID).map((n) => n.id)
export const leafIds = nodes.filter((n) => n.kind === 'leaf').map((n) => n.id)

/** [root, …, node] — the containment path down to (and including) the node. */
export function pathTo(id: string): string[] {
  const path: string[] = []
  let cur = byId.get(id)
  while (cur) {
    path.unshift(cur.id)
    cur = cur.parentId ? byId.get(cur.parentId) : undefined
  }
  return path
}

/** The depth-1 ancestor (domain) a node belongs to; the id itself if it IS a domain. */
export function domainOf(id: string): string {
  const path = pathTo(id)
  return path[1] ?? id
}

export const domainIds = (childrenOf.get(ROOT_ID) ?? []).map((d) => d.id)

// ── Edge generation (seeded, exactly 200) ───────────────────────────────────
// Structure-biased randomness: dense inside modules, moderate across modules
// within a domain, sparse across domains, plus a few hub nodes that attract
// links from everywhere — the shape real dependency graphs actually have.
function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rnd = mulberry32(20260708)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const weightedType = (): EdgeType => {
  const r = rnd()
  if (r < 0.42) return 'depends_on'
  if (r < 0.67) return 'data_flow'
  if (r < 0.9) return 'references'
  return 'implements'
}

export function leavesUnder(id: string): string[] {
  const out: string[] = []
  const stack = [id]
  while (stack.length) {
    const cur = stack.pop()!
    const node = byId.get(cur)!
    if (node.kind === 'leaf') out.push(cur)
    else for (const c of childrenOf.get(cur) ?? []) stack.push(c.id)
  }
  return out
}

const E: GEdge[] = []
const seen = new Set<string>()
function addEdge(source: string, target: string, type: EdgeType): boolean {
  if (source === target) return false
  const key = `${source}>${target}`
  if (seen.has(key)) return false
  seen.add(key)
  E.push({ id: `e${E.length}`, source, target, type })
  return true
}

const bottomContainers = allContainerIds.filter((id) => (childrenOf.get(id) ?? []).some((c) => c.kind === 'leaf'))

// 1. Local cohesion: chain each module's leaves (guaranteed connectivity).
for (const m of bottomContainers) {
  const ls = (childrenOf.get(m) ?? []).filter((c) => c.kind === 'leaf').map((c) => c.id)
  for (let i = 0; i + 1 < ls.length; i++) addEdge(ls[i], ls[i + 1], 'depends_on')
}
// 2. Extra intra-module pairs.
for (const m of bottomContainers) {
  const ls = leavesUnder(m)
  const tries = Math.ceil(ls.length / 2)
  for (let i = 0; i < tries; i++) addEdge(pick(ls), pick(ls), rnd() < 0.5 ? 'implements' : weightedType())
}
// 3. Cross-module traffic inside each domain.
for (const d of domainIds) {
  const ls = leavesUnder(d)
  for (let i = 0; i < 14; i++) addEdge(pick(ls), pick(ls), weightedType())
}
// 4. Hubs: a few nodes the whole system leans on.
const hubs = ['sto-node-repository', 'run-event-bus', 'ont-type-registry', 'enr-embedding-builder', 'qry-query-parser']
for (const h of hubs) if (!byId.has(h)) throw new Error(`hub id typo: ${h}`)
for (let i = 0; i < 55; i++) addEdge(pick(leafIds), pick(hubs), rnd() < 0.5 ? 'data_flow' : 'references')
// 5. Fill with anything-to-anything until exactly 200.
while (E.length < 200) addEdge(pick(leafIds), pick(leafIds), weightedType())

export const edges: GEdge[] = E

// The generator is deterministic — these either always hold or never do.
if (leafIds.length !== 50) throw new Error(`expected 50 leaves, got ${leafIds.length}`)
if (edges.length !== 200) throw new Error(`expected 200 edges, got ${edges.length}`)
