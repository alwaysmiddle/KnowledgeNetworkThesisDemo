// Hand-authored CS teaching corpus for the disclosure experiments:
// 53 topic leaves in a 6-domain / 16-module tree (one branch goes to depth 4),
// plus typed leaf-to-leaf edges authored one by one — every edge is a claim a
// CS teacher would defend, none are generated. The corpus doubles as content:
// the same graph a map draws is a curriculum a person could actually follow.

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

// ── Palette (validated 6+3-slot categorical set; see dataviz skill, 2026-07-10)
// Domains take six hues (node identity); edge types take three + neutral gray.
// Keeping the channels hue-disjoint means an edge color can never be misread
// as a domain color. `depends_on` is the most common type, so it gets the
// gray: the prerequisite backbone recedes, rarer semantic links pop.
export const DOMAIN_COLOR: Record<string, string> = {
  sys: '#008300', // green — hardware, PCB
  math: '#4a3aa7', // violet — abstraction
  cs: '#2a78d6', // blue — the core
  net: '#0891b2', // teal — comms
  sec: '#eda100', // yellow — caution
  se: '#1baf7a', // aqua — shipping
}

export const EDGE_COLOR: Record<EdgeType, string> = {
  depends_on: '#94a3b8', // neutral slate — the backbone, deliberately quiet
  data_flow: '#eb6834', // orange
  references: '#e87ba4', // magenta
  implements: '#e34948', // red
}
export const MIXED_EDGE_COLOR = '#64748b' // aggregate of several types

export const EDGE_LABEL: Record<EdgeType, string> = {
  depends_on: 'builds on',
  data_flow: 'uses',
  references: 'see also',
  implements: 'implemented with',
}

// ── Tree ────────────────────────────────────────────────────────────────────
const N: GNode[] = [{ id: ROOT_ID, kind: 'container', parentId: null, title: 'Computer Science' }]

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

// depth 1: domains, depth 2: modules, depth 3: topics…
const sys = container('sys', ROOT_ID, 'Computer Systems')
leaves(container('dig', sys, 'Digital Logic'), 'dig', [
  'Binary & Data Representation',
  'Transistors & Logic Gates',
  'Combinational Circuits',
  'Sequential Logic & Memory',
])
leaves(container('arc', sys, 'Machine Organization'), 'arc', ['Instruction Set Architecture', 'Memory Hierarchy & Caches'])
leaves(container('os', sys, 'Operating Systems'), 'os', [
  'Processes & Threads',
  'CPU Scheduling',
  'Virtual Memory',
  'File Systems',
  'Concurrency & Synchronization',
])

const math = container('math', ROOT_ID, 'Mathematical Foundations')
leaves(container('dm', math, 'Discrete Mathematics'), 'dm', [
  'Propositional Logic',
  'Set Theory & Functions',
  'Graph Theory',
  'Combinatorics & Counting',
  'Induction & Recursion',
])
leaves(container('am', math, 'Applied Mathematics'), 'am', ['Probability & Statistics', 'Linear Algebra', 'Modular Arithmetic'])

const cs = container('cs', ROOT_ID, 'Core Computer Science')
leaves(container('ds', cs, 'Data Structures'), 'ds', ['Arrays & Lists', 'Hash Tables', 'Trees & Heaps', 'Graph Representations'])
leaves(container('alg', cs, 'Algorithms'), 'alg', ['Complexity & Big-O', 'Sorting & Searching', 'Graph Traversal', 'Dynamic Programming'])
leaves(container('pl', cs, 'Languages & Compilers'), 'pl', [
  'Regular Expressions & Automata',
  'Grammars & Parsing',
  'Type Systems',
  'Compilers & Interpreters',
])

const net = container('net', ROOT_ID, 'Networking')
leaves(container('stk', net, 'Protocol Stack'), 'stk', ['Link Layer & Ethernet', 'IP & Routing', 'TCP & UDP', 'DNS & Naming'])
leaves(container('web', net, 'Web & Services'), 'web', ['HTTP & REST', 'Sockets & APIs'])

const sec = container('sec', ROOT_ID, 'Security')
leaves(container('cry', sec, 'Cryptography'), 'cry', [
  'Symmetric Encryption',
  'Public-Key Cryptography',
  'Cryptographic Hashing',
  'TLS & Certificates',
])
leaves(container('app', sec, 'Applied Security'), 'app', ['Authentication & Authorization', 'Common Vulnerabilities'])

const se = container('se', ROOT_ID, 'Software Engineering')
leaves(container('prc', se, 'Practices'), 'prc', ['Version Control', 'Code Review', 'Design Patterns'])
leaves(container('tst', se, 'Testing'), 'tst', ['Unit Testing', 'Integration Testing', 'Property-Based Testing'])
const tool = container('tool', se, 'Tooling')
leaves(tool, 'tool', ['Shell & Scripting', 'Debuggers & Profilers'])
// …and ONE depth-4 branch, to exercise the "limit depth to 3–4" constraint.
leaves(container('auto', tool, 'Automation'), 'auto', ['Continuous Integration', 'Deployment & Monitoring'])

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

// ── Authored edges ──────────────────────────────────────────────────────────
// Four relations, each with one teaching meaning:
//   on(X, Y)   X builds on Y — pedagogical prerequisite: learn Y before X.
//              This subgraph is a DAG by construction (guard below), so a
//              generated curriculum is always a clean foundations-first order.
//   uses(X, Y) X uses Y — applies Y's machinery in practice (TLS uses
//              public-key crypto). Application, not prerequisite.
//   impl(X, Y) X is implemented with Y — X's realization rests on Y's
//              structure (file systems are built out of trees).
//   also(A, B) see also — related reading. The ONLY relation allowed to be
//              reciprocal; a few deliberate A⇄B pairs keep revisit/cycle
//              mechanics in the views exercisable.
// addEdge is strict: unknown ids, container ids, self-loops and duplicate
// same-direction pairs all throw at module load — an authoring typo cannot
// ship silently.

const E: GEdge[] = []
const seen = new Set<string>()
function addEdge(source: string, target: string, type: EdgeType) {
  for (const id of [source, target]) {
    const n = byId.get(id)
    if (!n) throw new Error(`edge references unknown id: ${id}`)
    if (n.kind !== 'leaf') throw new Error(`edge endpoint is not a leaf: ${id}`)
  }
  if (source === target) throw new Error(`self-loop: ${source}`)
  const key = `${source}>${target}`
  if (seen.has(key)) throw new Error(`duplicate edge: ${key}`)
  seen.add(key)
  E.push({ id: `e${E.length}`, source, target, type })
}
const on = (x: string, y: string) => addEdge(x, y, 'depends_on')
const uses = (x: string, y: string) => addEdge(x, y, 'data_flow')
const impl = (x: string, y: string) => addEdge(x, y, 'implements')
const also = (a: string, b: string) => addEdge(a, b, 'references')

// — The systems ladder: from physics to a running program —
on('dig-transistors-logic-gates', 'dm-propositional-logic') // a gate IS a proposition in silicon
on('dig-combinational-circuits', 'dig-transistors-logic-gates')
on('dig-combinational-circuits', 'dig-binary-data-representation') // adders add binary numbers
on('dig-sequential-logic-memory', 'dig-combinational-circuits') // feedback turns logic into state
on('arc-instruction-set-architecture', 'dig-sequential-logic-memory') // registers hold the machine's state
on('arc-instruction-set-architecture', 'dig-binary-data-representation') // instructions are bit encodings
on('arc-memory-hierarchy-caches', 'dig-sequential-logic-memory') // SRAM/DRAM are sequential circuits
on('os-processes-threads', 'arc-instruction-set-architecture') // a context is registers + a program counter
on('os-cpu-scheduling', 'os-processes-threads')
on('os-virtual-memory', 'arc-memory-hierarchy-caches')
on('os-virtual-memory', 'os-processes-threads') // one address space per process
on('os-file-systems', 'arc-memory-hierarchy-caches') // storage is the bottom of the hierarchy
on('os-concurrency-synchronization', 'os-processes-threads')

// — Math feeding everything: the discrete core and its applied wing —
on('dm-set-theory-functions', 'dm-propositional-logic') // proofs about sets need logic first
on('dm-graph-theory', 'dm-set-theory-functions')
on('dm-combinatorics-counting', 'dm-set-theory-functions')
on('dm-induction-recursion', 'dm-propositional-logic')
on('am-probability-statistics', 'dm-combinatorics-counting') // counting before probability
on('am-probability-statistics', 'dm-set-theory-functions') // events are sets
on('am-linear-algebra', 'dm-set-theory-functions') // vector spaces are structured sets
on('am-modular-arithmetic', 'dm-set-theory-functions') // congruence classes are equivalence classes

// — Data structures and algorithms —
on('ds-arrays-lists', 'dig-binary-data-representation') // contiguous memory is a bit-level idea
on('ds-hash-tables', 'ds-arrays-lists')
on('ds-trees-heaps', 'ds-arrays-lists')
on('ds-trees-heaps', 'dm-induction-recursion') // trees are the inductive structure
on('ds-graph-representations', 'dm-graph-theory')
on('ds-graph-representations', 'ds-arrays-lists')
on('alg-complexity-big-o', 'dm-combinatorics-counting') // analysis is counting steps
on('alg-complexity-big-o', 'dm-induction-recursion') // recurrences
on('alg-sorting-searching', 'alg-complexity-big-o')
on('alg-sorting-searching', 'ds-arrays-lists')
on('alg-graph-traversal', 'ds-graph-representations')
on('alg-graph-traversal', 'alg-complexity-big-o')
on('alg-dynamic-programming', 'dm-induction-recursion') // optimal substructure is induction
on('alg-dynamic-programming', 'alg-complexity-big-o')

// — Languages: from regular to Turing-complete —
on('pl-regular-expressions-automata', 'dm-set-theory-functions') // a language is a set of strings
on('pl-grammars-parsing', 'pl-regular-expressions-automata') // one rung up the Chomsky ladder
on('pl-type-systems', 'dm-set-theory-functions') // types are sets of values
on('pl-type-systems', 'dm-propositional-logic') // propositions as types
on('pl-compilers-interpreters', 'pl-grammars-parsing')
on('pl-compilers-interpreters', 'arc-instruction-set-architecture') // codegen needs a target

// — The network stack, bottom up —
on('stk-link-layer-ethernet', 'dig-binary-data-representation') // a frame is a bit layout
on('stk-ip-routing', 'stk-link-layer-ethernet')
on('stk-ip-routing', 'dm-graph-theory') // the internet is a graph
on('stk-tcp-udp', 'stk-ip-routing')
on('stk-dns-naming', 'stk-tcp-udp') // resolution rides on UDP/TCP
on('web-http-rest', 'stk-tcp-udp')
on('web-http-rest', 'stk-dns-naming') // a URL means nothing without name resolution
on('web-sockets-apis', 'stk-tcp-udp')

// — Security: math made load-bearing —
on('cry-symmetric-encryption', 'dig-binary-data-representation') // XOR, blocks, padding
on('cry-symmetric-encryption', 'am-probability-statistics') // keyspaces and randomness
on('cry-public-key-cryptography', 'am-modular-arithmetic') // the whole trick is modular
on('cry-cryptographic-hashing', 'dig-binary-data-representation')
on('cry-tls-certificates', 'cry-public-key-cryptography')
on('cry-tls-certificates', 'cry-symmetric-encryption')
on('cry-tls-certificates', 'cry-cryptographic-hashing')
on('cry-tls-certificates', 'stk-tcp-udp') // the handshake rides on TCP
on('app-authentication-authorization', 'cry-cryptographic-hashing') // password storage
on('app-common-vulnerabilities', 'web-http-rest') // injection/XSS/CSRF live in the web
on('app-common-vulnerabilities', 'ds-arrays-lists') // buffer overflows live in memory layout

// — Software engineering: practices on top of everything below —
on('prc-code-review', 'prc-version-control')
on('prc-design-patterns', 'pl-type-systems')
on('tst-integration-testing', 'tst-unit-testing')
on('tst-property-based-testing', 'tst-unit-testing')
on('tool-shell-scripting', 'os-processes-threads') // a shell is process control made visible
on('tool-shell-scripting', 'os-file-systems')
on('tool-debuggers-profilers', 'arc-instruction-set-architecture') // breakpoints live at ISA level
on('tool-debuggers-profilers', 'os-processes-threads')
on('auto-continuous-integration', 'prc-version-control')
on('auto-continuous-integration', 'tst-unit-testing')
on('auto-deployment-monitoring', 'auto-continuous-integration')

// — uses: one topic applying another's machinery in practice —
uses('stk-ip-routing', 'alg-graph-traversal') // routing is shortest-path search, live
uses('web-http-rest', 'cry-tls-certificates') // HTTPS
uses('cry-tls-certificates', 'stk-dns-naming') // certificates vouch for hostnames
uses('app-authentication-authorization', 'web-http-rest') // sessions, cookies, tokens
uses('app-authentication-authorization', 'cry-public-key-cryptography') // signed tokens
uses('app-common-vulnerabilities', 'tool-debuggers-profilers') // analysis and exploit dev
uses('pl-compilers-interpreters', 'pl-type-systems') // the type-checking phase
uses('ds-graph-representations', 'am-linear-algebra') // adjacency matrices
uses('prc-version-control', 'os-file-systems') // the working tree is real files
uses('prc-code-review', 'prc-design-patterns') // reviewers speak pattern vocabulary
uses('tst-property-based-testing', 'am-probability-statistics') // random generation
uses('tst-integration-testing', 'web-http-rest') // API-level tests
uses('tool-shell-scripting', 'pl-regular-expressions-automata') // grep and sed all day
uses('tool-debuggers-profilers', 'arc-memory-hierarchy-caches') // profilers expose cache behavior
uses('web-sockets-apis', 'os-concurrency-synchronization') // async IO, thread-per-connection
uses('auto-continuous-integration', 'tool-shell-scripting') // pipelines are scripts
uses('auto-continuous-integration', 'tst-integration-testing')
uses('auto-deployment-monitoring', 'stk-dns-naming') // traffic switching
uses('auto-deployment-monitoring', 'web-http-rest') // health checks

// — implemented with: realizations resting on another topic's structure —
impl('os-file-systems', 'ds-trees-heaps') // directories and B-trees
impl('os-virtual-memory', 'ds-trees-heaps') // multi-level page tables
impl('os-cpu-scheduling', 'ds-trees-heaps') // priority queues
impl('pl-compilers-interpreters', 'ds-trees-heaps') // the AST
impl('pl-compilers-interpreters', 'ds-hash-tables') // symbol tables
impl('prc-version-control', 'cry-cryptographic-hashing') // content-addressed storage (git!)
impl('alg-sorting-searching', 'ds-trees-heaps') // heapsort
impl('alg-dynamic-programming', 'ds-arrays-lists') // memo tables
impl('stk-dns-naming', 'ds-trees-heaps') // the namespace is a tree

// — see also: related reading; reciprocal pairs are deliberate, and the pair
//   privilege goes to topics with NO stronger tie (a pair already bound by
//   builds-on doesn't get a see-also echo — one relation per direction) —
also('ds-hash-tables', 'cry-cryptographic-hashing') // ⇄ same idea, different guarantees
also('cry-cryptographic-hashing', 'ds-hash-tables')
also('tst-unit-testing', 'prc-code-review') // ⇄ the two everyday quality gates
also('prc-code-review', 'tst-unit-testing')
also('cry-symmetric-encryption', 'cry-public-key-cryptography') // ⇄ the classic compare-and-contrast
also('cry-public-key-cryptography', 'cry-symmetric-encryption')
also('dm-graph-theory', 'am-linear-algebra') // ⇄ the spectral view of a graph
also('am-linear-algebra', 'dm-graph-theory')
also('dig-sequential-logic-memory', 'pl-regular-expressions-automata') // both are state machines
also('dig-binary-data-representation', 'am-modular-arithmetic') // overflow wraps: arithmetic mod 2^n
also('am-modular-arithmetic', 'ds-hash-tables') // mod as bucket index
also('am-probability-statistics', 'ds-hash-tables') // collision odds, birthday bound
also('web-sockets-apis', 'web-http-rest') // two styles of talking to a server
also('app-common-vulnerabilities', 'app-authentication-authorization') // broken auth is a top class
also('tool-debuggers-profilers', 'tst-unit-testing') // two ways to corner a bug
also('auto-deployment-monitoring', 'tool-debuggers-profilers') // observing prod vs observing local
also('pl-compilers-interpreters', 'prc-design-patterns') // visitors walk the AST

export const edges: GEdge[] = E

// ── Module-load guards ──────────────────────────────────────────────────────
// The corpus is hand-authored, so the guards are structural, not numeric: they
// catch the mistakes a human editor can actually make.

// 1. "builds on" is a DAG — a curriculum must never be circular.
{
  const dep = edges.filter((e) => e.type === 'depends_on')
  const unmet = new Map<string, number>(leafIds.map((id) => [id, 0]))
  for (const e of dep) unmet.set(e.source, unmet.get(e.source)! + 1)
  const dependants = new Map<string, string[]>()
  for (const e of dep) {
    if (!dependants.has(e.target)) dependants.set(e.target, [])
    dependants.get(e.target)!.push(e.source)
  }
  const queue = leafIds.filter((id) => unmet.get(id) === 0)
  let emitted = 0
  while (queue.length) {
    const cur = queue.pop()!
    emitted++
    for (const d of dependants.get(cur) ?? []) {
      unmet.set(d, unmet.get(d)! - 1)
      if (unmet.get(d) === 0) queue.push(d)
    }
  }
  if (emitted !== leafIds.length) {
    const stuck = leafIds.filter((id) => unmet.get(id)! > 0)
    throw new Error(`"builds on" edges contain a cycle through: ${stuck.join(', ')}`)
  }
}

// 2. Connected + no orphans — flat.ts's spanning tree and the map embedding
// both assume every topic is reachable from every other, ignoring direction.
{
  const adj = new Map<string, string[]>(leafIds.map((id) => [id, []]))
  for (const e of edges) {
    adj.get(e.source)!.push(e.target)
    adj.get(e.target)!.push(e.source)
  }
  const orphans = leafIds.filter((id) => adj.get(id)!.length === 0)
  if (orphans.length) throw new Error(`topics with no edges at all: ${orphans.join(', ')}`)
  const visited = new Set<string>([leafIds[0]])
  const queue = [leafIds[0]]
  while (queue.length) for (const nb of adj.get(queue.pop()!)!) if (!visited.has(nb)) { visited.add(nb); queue.push(nb) }
  if (visited.size !== leafIds.length) {
    throw new Error(`corpus is disconnected — unreachable: ${leafIds.filter((id) => !visited.has(id)).join(', ')}`)
  }
}

// 3. Reciprocal pairs are a "see also" privilege — in any directed relation a
// reciprocal pair is either a mistake or a hidden cycle.
{
  const byType = new Map<EdgeType, Set<string>>()
  for (const e of edges) {
    if (!byType.has(e.type)) byType.set(e.type, new Set())
    byType.get(e.type)!.add(`${e.source}>${e.target}`)
  }
  let seeAlsoPairs = 0
  for (const [type, keys] of byType) {
    let pairs = 0
    for (const k of keys) {
      const [s, t] = k.split('>')
      if (s < t && keys.has(`${t}>${s}`)) pairs++
    }
    if (type === 'references') seeAlsoPairs = pairs
    else if (pairs > 0) throw new Error(`reciprocal pair in directed relation "${type}"`)
  }
  if (seeAlsoPairs < 3) throw new Error(`expected >= 3 deliberate see-also pairs, found ${seeAlsoPairs}`)
}
