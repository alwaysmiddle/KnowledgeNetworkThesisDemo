// The deep layers of the CS teaching corpus: hand-authored subtopics BELOW
// the 53 edge-bearing topics in graph.ts. Pure data — graph.ts attaches these
// under each topic (ids chain parent-id + title slug) and merges the `d`
// blurbs into the document bodies. Typed edges never reach down here: depth
// is containment only, which is exactly what the vertical instruments
// (tree, drill, cockpit) disclose.
//
// Shape: every topic gets 2–4 subtopics (level 5); subtopics that genuinely
// decompose get concepts (level 6); a few concepts go one deeper (level 7);
// and ONE flagship spine per domain reaches level 8 — the corpus is ragged
// on purpose, because real curricula are. The six spines:
//   sys  Virtual Memory → Paging → Page Tables → Multi-Level → x86-64 Walk
//   math Graph Theory → Spanning Structures → MSTs → Cut & Cycle → Exchange
//   cs   Sorting & Searching → Comparison Sorts → Quicksort → Partitioning → Lomuto vs. Hoare
//   net  TCP & UDP → Congestion Control → Loss-Based → CUBIC → Window Growth
//   sec  Public-Key → RSA → Key Generation → Prime Selection → Miller–Rabin
//   se   Version Control → Git Internals → Object Model → Packfiles → Delta Compression

export interface DeepSpec {
  /** one-line teaching blurb — merged into DOC_BODY under the derived id */
  d: string
  /** children by title; absence means this node is a true leaf */
  c?: Record<string, DeepSpec>
}

/** children of each topic, keyed by the topic's id in graph.ts */
export const DEEP: Record<string, Record<string, DeepSpec>> = {
  // ═══ sys · Digital Logic ═══════════════════════════════════════════════
  'dig-binary-data-representation': {
    'Number Bases & Integers': {
      d: 'Positional notation in bases 2, 8, and 16 — and how a fixed-width word turns "number" into a finite resource.',
      c: {
        "Two's Complement": { d: 'One encoding for signed integers where subtraction is just addition — the reason hardware needs only one adder.' },
        'Overflow & Wraparound': { d: 'Fixed-width arithmetic is modular: past the top value, numbers silently wrap unless something checks.' },
      },
    },
    'Floating Point': {
      d: 'Real numbers faked in 32 or 64 bits: a sign, an exponent, and a fraction trading range against precision.',
      c: {
        'IEEE 754 Layout': { d: 'The universal bit split — sign, biased exponent, mantissa — plus the special citizens: zeros, infinities, NaN.' },
        'Rounding & Precision Loss': { d: 'Why 0.1 + 0.2 ≠ 0.3: most decimals have no exact binary form, and every operation rounds.' },
      },
    },
    'Text Encodings': {
      d: 'How characters become bytes, and why "plain text" never is.',
      c: {
        'ASCII & Code Pages': { d: 'Seven bits for English, then a decade of mutually incompatible 8-bit extensions for everyone else.' },
        'Unicode & UTF-8': { d: 'One code point per character, and a variable-width encoding that keeps every old ASCII file valid byte-for-byte.' },
      },
    },
    'Bitwise Operations': { d: 'AND, OR, XOR, shifts — arithmetic on the representation itself, the idiom layer of low-level code.' },
  },
  'dig-transistors-logic-gates': {
    'MOSFET Switching': { d: 'A voltage on the gate opens or closes a channel — the physical event every computation ultimately reduces to.' },
    'Basic Gates': {
      d: 'AND, OR, NOT and their combinations: the vocabulary boolean formulas are built from in silicon.',
      c: {
        'NAND as Universal Gate': { d: 'Every boolean function can be built from NAND alone — one manufacturable part, all of logic.' },
      },
    },
    'CMOS & Power': { d: 'Complementary transistor pairs that draw power mainly while switching — why heat scales with clock speed.' },
  },
  'dig-combinational-circuits': {
    Adders: {
      d: 'Circuits that add: the schoolbook carry chain, then cleverness to stop waiting for it.',
      c: {
        'Ripple-Carry Adder': { d: 'Full adders chained bit by bit — simple, small, and slow in proportion to the word width.' },
        'Carry-Lookahead': { d: 'Compute all carries in parallel from generate/propagate signals — logarithmic depth bought with more gates.' },
      },
    },
    'Multiplexers & Decoders': { d: 'The traffic control of circuits: select one input among many, or turn a binary index into one active line.' },
    'ALU Design': { d: 'One circuit, many operations — add, subtract, compare, and logic sharing hardware behind a mode selector.' },
  },
  'dig-sequential-logic-memory': {
    'Latches & Flip-Flops': {
      d: 'Feedback loops that hold a bit; the clock decides when they are allowed to change.',
      c: {
        'SR Latch': { d: 'Two cross-coupled gates and the first bit of memory — plus the forbidden state that teaches why timing matters.' },
        'D Flip-Flop & Clock Edges': { d: 'Capture the input exactly at the clock edge, ignore it otherwise — the building block of every register.' },
      },
    },
    'Finite State Machines': { d: 'A state register plus next-state logic: the pattern behind controllers, protocols, and regex engines alike.' },
    'Registers & Counters': { d: 'Flip-flops in formation — a word of fast storage, or a value that steps with every clock tick.' },
    'SRAM & DRAM Cells': { d: 'Six transistors holding a bit as long as power lasts, or one transistor and a leaking capacitor refreshed forever.' },
  },

  // ═══ sys · Machine Organization ════════════════════════════════════════
  'arc-instruction-set-architecture': {
    'Instruction Encoding': { d: 'Opcodes and operand fields packed into bit layouts — the machine grammar frozen so software survives new hardware.' },
    'Addressing Modes': { d: 'The ways an operand can say where its data lives: register, immediate, memory, and indexed combinations.' },
    'RISC vs. CISC': { d: 'Few simple uniform instructions versus many powerful irregular ones — a design argument the market settled from both ends.' },
    'Calling Conventions': {
      d: 'The contract for function calls: who saves which registers, where arguments go, how the stack is shaped.',
      c: {
        'Stack Frames': { d: 'Each call pushes a frame — return address, saved registers, locals — and the debugger walks them back out.' },
        'Argument Passing': { d: 'The first few arguments ride in registers, the overflow goes on the stack — fixed per platform by the ABI.' },
      },
    },
  },
  'arc-memory-hierarchy-caches': {
    'Locality of Reference': { d: 'Programs revisit recent data and march through neighbors — the two statistical habits the whole hierarchy is a bet on.' },
    'Cache Organization': {
      d: 'How a small fast memory decides which slice of a big slow one it currently mirrors.',
      c: {
        'Direct-Mapped Caches': { d: 'Every address has exactly one slot — trivially fast to check, embarrassingly easy to thrash.' },
        'Set Associativity': { d: 'A few candidate slots per address: most of fully-associative hit rates at a fraction of the hardware.' },
        'Replacement Policies': { d: 'When the set is full, something must go — LRU and its cheaper approximations pick the victim.' },
      },
    },
    'Cache Coherence': { d: 'Multiple cores, private caches, one memory: the protocols that keep every core seeing the same story.' },
    'Storage Tiers': { d: 'SSDs and disks as the vast, slow bottom of the hierarchy — same locality bet, milliseconds instead of nanoseconds.' },
  },

  // ═══ sys · Operating Systems ═══════════════════════════════════════════
  'os-processes-threads': {
    'Process Lifecycle': { d: 'Created, ready, running, blocked, dead — and the queues a process waits in between those states.' },
    'Context Switching': { d: 'Freeze one computation mid-instruction, thaw another: register state swapped in microseconds, the illusion of many machines.' },
    'Threads vs. Processes': { d: 'Threads share an address space, processes own one — the difference between cheap cooperation and enforced isolation.' },
    'System Calls': {
      d: 'The narrow doorway where a program asks the kernel for anything real: files, memory, network, more processes.',
      c: {
        'User/Kernel Boundary': { d: 'Two privilege worlds on one CPU — code crosses only through controlled gates, never by jumping.' },
        'Traps & Interrupts': { d: 'The mechanisms that yank the CPU into the kernel: deliberately (syscalls), accidentally (faults), or externally (devices).' },
      },
    },
  },
  'os-cpu-scheduling': {
    'Scheduling Metrics': { d: 'Throughput, latency, fairness — the goals that pull in different directions, so every scheduler picks a side.' },
    'Classic Policies': {
      d: 'The standard answers to "who runs next", each optimizing a different metric.',
      c: {
        'Round-Robin': { d: 'Everyone gets a time slice in turn — fairness by clock, at the cost of context-switch overhead.' },
        'Priority & Aging': { d: 'Important work first, with priorities that drift upward while waiting so nothing starves forever.' },
        'Multi-Level Feedback Queues': { d: 'Demote CPU hogs, promote interactive jobs — the scheduler learns behavior instead of being told.' },
      },
    },
    'Real-Time Scheduling': { d: 'When "usually fast" is failure: deadline-driven policies that guarantee timing or refuse the work.' },
  },
  'os-virtual-memory': {
    'Address Translation': { d: 'Every memory reference a program makes is a fiction the hardware translates on the fly — per process, per access.' },
    Paging: {
      d: 'Memory chopped into fixed-size pages: no external fragmentation, and a clean unit for translation, protection, and eviction.',
      c: {
        'Page Tables': {
          d: 'The per-process map from virtual page to physical frame, consulted (in effect) on every single access.',
          c: {
            'Multi-Level Page Tables': {
              d: 'A tree of tables instead of one flat array — sparse address spaces pay only for the branches they touch.',
              c: {
                'x86-64 Four-Level Walk': { d: 'PML4 → PDPT → PD → PT: nine bits of the address per level, one physical read each — the walk the TLB exists to skip.' },
              },
            },
          },
        },
        TLBs: { d: 'A tiny cache of recent translations — the only reason paging is affordable at all.' },
      },
    },
    'Page Replacement': {
      d: 'When physical memory is full, some page must leave — choosing which is a bet on the future.',
      c: {
        'Working Sets': { d: 'The pages a process actually needs right now; keep those resident and it barely notices paging exists.' },
        'Clock Algorithm': { d: 'LRU is too expensive to track exactly, so a sweeping hand and one reference bit approximate it well enough.' },
      },
    },
    'Swapping & Thrashing': { d: 'Overcommit too far and the system spends its life moving pages instead of running programs.' },
  },
  'os-file-systems': {
    'Files & Metadata': { d: 'A file is bytes plus bookkeeping — size, owner, permissions, timestamps — and the name is not part of it.' },
    'Directories & Paths': { d: 'Directories are just files mapping names to file numbers; a path is a walk through that map.' },
    'Allocation & Layout': {
      d: 'Where file bytes physically live, and how the system finds block N without reading blocks 0 through N−1.',
      c: {
        'Inodes & Extents': { d: 'Per-file index structures: block pointers for small files, contiguous extents when the disk can offer them.' },
      },
    },
    'Journaling & Crash Consistency': { d: 'Write the intention before the change, so a crash mid-operation replays or rolls back — never half-happens.' },
  },
  'os-concurrency-synchronization': {
    'Race Conditions': { d: 'Two threads, one variable, no coordination: the outcome depends on timing you cannot see or reproduce.' },
    'Locks & Mutual Exclusion': {
      d: 'Make the critical section one-at-a-time and the race disappears — along with some parallelism.',
      c: {
        Semaphores: { d: 'A counter with atomic wait/signal — mutual exclusion, resource pools, and signaling in one primitive.' },
        'Spinlocks vs. Blocking': { d: 'Burn CPU waiting, or pay a context switch to sleep — the right answer depends on how long the wait is.' },
      },
    },
    Deadlock: {
      d: 'Everyone holds something and waits for someone else — the system is perfectly consistent and perfectly stuck.',
      c: {
        'The Four Conditions': { d: 'Mutual exclusion, hold-and-wait, no preemption, circular wait: break any one and deadlock is impossible.' },
      },
    },
    'Memory Ordering': { d: 'Compilers and CPUs reorder your reads and writes; without fences, other threads may see a history that never happened.' },
  },

  // ═══ math · Discrete Mathematics ═══════════════════════════════════════
  'dm-propositional-logic': {
    'Connectives & Truth Tables': { d: 'AND, OR, NOT, IMPLIES — meaning defined exhaustively, one row per possible world.' },
    'Equivalence & Normal Forms': {
      d: 'Different formulas, same truth table — and standard shapes every formula can be rewritten into.',
      c: {
        "De Morgan's Laws": { d: 'Negation distributes by flipping the connective — the little identity doing heavy lifting in code and proofs alike.' },
        'CNF & DNF': { d: 'ANDs of ORs, or ORs of ANDs: canonical forms that make formulas comparable and SAT solvers possible.' },
      },
    },
    'Rules of Inference': { d: 'Modus ponens and friends — the legal moves that carry truth from premises to conclusion.' },
    'Predicates & Quantifiers': { d: 'For-all and there-exists turn statements about one thing into statements about domains — where real math begins.' },
  },
  'dm-set-theory-functions': {
    'Set Operations & Algebra': { d: 'Union, intersection, complement, difference — and the algebra of identities they obey.' },
    Relations: {
      d: 'Subsets of pairs: the mathematical form of "is connected to", "is less than", "is equivalent to".',
      c: {
        'Equivalence Relations': { d: 'Reflexive, symmetric, transitive — and every one of them is secretly a partition into classes.' },
        'Partial Orders': { d: 'Some pairs comparable, some not: the shape of dependency, inheritance, and every DAG you will ever draw.' },
      },
    },
    'Functions & Mappings': {
      d: 'Relations where every input gets exactly one output — the arrows all of mathematics is drawn with.',
      c: {
        'Injections, Surjections, Bijections': { d: 'No collisions, full coverage, or both — the three ways a mapping can be well-behaved.' },
      },
    },
    'Cardinality & Infinity': {
      d: 'Comparing sizes by pairing elements off — with the shock that infinities come in different sizes.',
      c: {
        Countability: { d: 'A set is countable if the naturals can enumerate it — rationals yes, and that is already surprising.' },
        Diagonalization: { d: 'Assume the list is complete, build the element it must have missed — the argument behind uncountability and the halting problem.' },
      },
    },
  },
  'dm-graph-theory': {
    'Graphs & Degree': { d: 'Vertices, edges, and the first theorem everyone proves: degrees sum to twice the edge count.' },
    'Paths & Connectivity': {
      d: 'When can you get there from here — and what it takes to disconnect a graph.',
      c: {
        'Euler & Hamilton Paths': { d: 'Cross every edge once (easy to decide) versus visit every vertex once (NP-hard) — near-twins, opposite difficulty.' },
      },
    },
    'Trees & Spanning Structures': {
      d: 'Connected, acyclic, minimal: trees are the skeletons of graphs, and every connected graph contains one.',
      c: {
        'Minimum Spanning Trees': {
          d: 'The cheapest skeleton that still connects everything — and greedy algorithms provably find it.',
          c: {
            'Cut & Cycle Properties': {
              d: 'The lightest edge across any cut belongs to an MST; the heaviest edge on any cycle does not — two lemmas that power every MST algorithm.',
              c: {
                'The Exchange Argument': { d: 'Swap a tree edge for a better one and stay a spanning tree — the proof move that turns greedy from plausible into correct.' },
              },
            },
          },
        },
      },
    },
    'Coloring & Planarity': { d: 'Which graphs can be drawn without crossings, and how few colors a map really needs — where graph theory meets geometry.' },
  },
  'dm-combinatorics-counting': {
    'Counting Principles': {
      d: 'Multiply independent choices, add disjoint cases — and two famous corollaries that punch above their weight.',
      c: {
        'Pigeonhole Principle': { d: 'More pigeons than holes means a shared hole — trivial to state, weirdly powerful in proofs.' },
        'Inclusion–Exclusion': { d: 'Add the sets, subtract the overlaps, add back the over-subtractions — counting unions exactly.' },
      },
    },
    'Permutations & Combinations': {
      d: 'Ordered arrangements versus unordered selections — the two workhorse counts.',
      c: {
        'Binomial Coefficients': { d: 'n-choose-k: one number that shows up in counting, algebra, and probability, tied together by Pascal’s triangle.' },
      },
    },
    'Recurrence Relations': { d: 'Define a count by smaller versions of itself — the bridge between combinatorics and algorithm analysis.' },
  },
  'dm-induction-recursion': {
    'Weak & Strong Induction': { d: 'Prove the base, prove the step, own all of the naturals — with the strong form assuming everything below.' },
    'Structural Induction': { d: 'Induction over trees, lists, and grammars instead of numbers — the proof technique native to computer science.' },
    'Recursive Definitions': { d: 'Objects defined by smaller selves — legitimate exactly when something gets smaller every step.' },
    'Loop Invariants': { d: 'A property true before and after every iteration — induction wearing work clothes, proving loops correct.' },
  },

  // ═══ math · Applied Mathematics ════════════════════════════════════════
  'am-probability-statistics': {
    'Sample Spaces & Events': { d: 'All possible outcomes, and events as subsets of them — probability starts as set theory with a measure.' },
    'Conditional Probability': {
      d: 'How evidence reshapes probability — the mechanism behind inference, filters, and a thousand paradoxes.',
      c: {
        "Bayes' Theorem": { d: 'Invert the conditioning: from "probability of evidence given cause" to "probability of cause given evidence".' },
        Independence: { d: 'When knowing one event tells you nothing about another — the assumption most analyses quietly stand on.' },
      },
    },
    'Random Variables': {
      d: 'Outcomes turned into numbers, so distributions can be summarized, compared, and computed with.',
      c: {
        'Expectation & Variance': { d: 'The long-run average and the spread around it — the two numbers that summarize a distribution first.' },
        'Common Distributions': { d: 'Uniform, binomial, geometric, normal — the recurring shapes randomness takes in practice.' },
      },
    },
    'Sampling & Estimation': { d: 'Judging a population from a sample, with honest error bars — where statistics earns its keep.' },
  },
  'am-linear-algebra': {
    'Vectors & Vector Spaces': { d: 'Things you can add and scale — and the axioms that make "space" precise enough to compute in.' },
    'Matrices as Transformations': {
      d: 'A matrix is a linear map written down: rotation, projection, scaling — composition is multiplication.',
      c: {
        'Matrix Multiplication': { d: 'Rows meet columns: composing transformations, with the non-commutativity that surprises everyone once.' },
      },
    },
    'Eigenvalues & Eigenvectors': { d: 'The directions a transformation merely stretches — the axes along which complex behavior becomes simple.' },
    'Decompositions & Rank': { d: 'Factor a matrix into simpler pieces — how systems get solved and data gets compressed.' },
  },
  'am-modular-arithmetic': {
    'Congruences & Residues': { d: 'Arithmetic where numbers wrap at n — equality becomes "same remainder", and clocks become algebra.' },
    'Modular Inverses': {
      d: 'Division mod n exists exactly when the divisor shares no factor with n — and there is an algorithm to find it.',
      c: {
        'The Extended Euclidean Algorithm': { d: 'The GCD computation that also emits the coefficients — which happen to be the modular inverse.' },
      },
    },
    'Fermat & Euler Theorems': { d: 'Raise anything to the totient power and get 1 — the identity RSA is built directly on top of.' },
    'The Chinese Remainder Theorem': { d: 'Congruences with coprime moduli combine into one unique answer — split big arithmetic into parallel small pieces.' },
  },

  // ═══ cs · Data Structures ══════════════════════════════════════════════
  'ds-arrays-lists': {
    'Static & Dynamic Arrays': {
      d: 'Contiguous memory with O(1) indexing — and the growth trick that makes "resizable" nearly free.',
      c: {
        'Amortized Growth': { d: 'Double on overflow and the occasional expensive copy averages out to constant time per append.' },
      },
    },
    'Linked Lists': {
      d: 'Nodes chained by pointers: O(1) splicing bought by surrendering random access.',
      c: {
        'Singly vs. Doubly Linked': { d: 'One pointer per node or two — cheaper storage versus backward walks and O(1) removal.' },
      },
    },
    'Stacks & Queues': { d: 'Restrict where you may touch the sequence — LIFO and FIFO discipline as a feature, not a limitation.' },
    'Memory Layout & Cache Effects': { d: 'Arrays stride predictably, lists chase pointers — the constant factors that asymptotics politely ignore.' },
  },
  'ds-hash-tables': {
    'Hash Functions': { d: 'Deterministic chaos: spread keys uniformly so buckets stay short, cheaply enough to run on every operation.' },
    'Collision Resolution': {
      d: 'Two keys, one bucket — the two families of answers to the inevitable.',
      c: {
        'Separate Chaining': { d: 'Each bucket holds a little list — degradation is graceful and deletion is easy.' },
        'Open Addressing': {
          d: 'Store everything in the array itself and probe for the next free slot.',
          c: {
            'Probe Sequences': { d: 'Linear, quadratic, double hashing — how the next slot is chosen decides how clustering hurts.' },
          },
        },
      },
    },
    'Load Factor & Resizing': { d: 'The fullness ratio that governs performance — cross the threshold and the table rebuilds itself bigger.' },
  },
  'ds-trees-heaps': {
    'Binary Search Trees': {
      d: 'Left smaller, right larger, recursively — ordered data with logarithmic everything, if balance holds.',
      c: {
        'Balanced Trees': {
          d: 'AVL, red-black: invariants that force the height to stay logarithmic no matter the insertion order.',
          c: {
            Rotations: { d: 'The constant-time local re-hang that restores balance without disturbing the ordering.' },
          },
        },
      },
    },
    Heaps: {
      d: 'The weakest useful ordering: every parent beats its children, and that is enough for priority queues.',
      c: {
        'Array Encoding': { d: 'Parent at i, children at 2i+1 and 2i+2 — a complete tree stored with no pointers at all.' },
        'Sift Up & Sift Down': { d: 'Restore the heap property by bubbling the offender toward its place — O(log n) per repair.' },
      },
    },
    'B-Trees': { d: 'Wide, shallow, disk-friendly search trees — the reason databases and file systems rarely read more than a few blocks.' },
    Tries: { d: 'Store keys character by character along paths — prefix queries for free, memory as the price.' },
  },
  'ds-graph-representations': {
    'Adjacency Lists': { d: 'Per-vertex neighbor lists — space proportional to what actually exists, the default for sparse graphs.' },
    'Adjacency Matrices': { d: 'One bit per possible edge: O(1) edge tests and algebraic superpowers, at quadratic space.' },
    'Edge Lists & CSR': { d: 'Flat arrays of edges, or compressed row storage — the layouts graph engines actually iterate.' },
    'Weighted & Directed Variants': { d: 'Direction and cost annotations — small changes to the structure, large changes to which algorithms apply.' },
  },

  // ═══ cs · Algorithms ═══════════════════════════════════════════════════
  'alg-complexity-big-o': {
    'Asymptotic Notation': { d: 'O, Ω, Θ — comparing growth rates while deliberately forgetting constants and small inputs.' },
    'Analyzing Recurrences': {
      d: 'Recursive algorithms cost what their recurrence says — solve it and the running time falls out.',
      c: {
        'The Master Theorem': { d: 'Pattern-match divide-and-conquer recurrences to their answers — three cases cover most of the classics.' },
      },
    },
    'Space Complexity': { d: 'Memory grows too — and trading it against time is the oldest trick in the book.' },
    'Lower Bounds & Hardness': { d: 'Proofs that no algorithm can do better — comparison sorting needs n log n, and P vs. NP looms behind everything.' },
  },
  'alg-sorting-searching': {
    'Comparison Sorts': {
      d: 'Sorting by asking "which is bigger" — a family with a proven n log n floor and very different personalities.',
      c: {
        Quicksort: {
          d: 'Partition around a pivot, recurse on both sides — the fastest comparison sort in practice, with a worst case it gambles against.',
          c: {
            'Partitioning Schemes': {
              d: 'The in-place shuffle that splits the array around the pivot — where quicksort implementations actually differ.',
              c: {
                'Lomuto vs. Hoare': { d: 'One pointer sweeping versus two converging: Lomuto is teachable, Hoare does fewer swaps — both are subtly easy to get wrong.' },
              },
            },
            'Pivot Selection': { d: 'First element, median-of-three, random — the choice that decides whether sorted input is a best case or a disaster.' },
          },
        },
        Mergesort: { d: 'Split, sort halves, merge: guaranteed n log n and stable, paying with a second array.' },
        Heapsort: { d: 'Build a heap, extract the max repeatedly — n log n in place, beloved by theorists, betrayed by caches.' },
      },
    },
    'Linear-Time Sorts': {
      d: 'Skip comparisons entirely when keys have structure — counting and bucketing beat the n log n bound legally.',
      c: {
        'Counting & Radix Sort': { d: 'Tally occurrences, or sort digit by digit — linear time when the key universe cooperates.' },
      },
    },
    'Binary Search': {
      d: 'Halve the search space per question — and the classic exercise in getting boundary conditions exactly right.',
      c: {
        'Invariant Design': { d: 'Define what lo and hi promise, keep the promise every iteration — the cure for off-by-one guessing.' },
      },
    },
  },
  'alg-graph-traversal': {
    'Breadth-First Search': { d: 'Explore in rings with a queue — shortest paths in unweighted graphs fall out for free.' },
    'Depth-First Search': {
      d: 'Follow edges as deep as they go, backtrack, repeat — the traversal whose bookkeeping reveals graph structure.',
      c: {
        'Edge Classification': { d: 'Tree, back, forward, cross — what DFS timestamps say about every edge, and how back edges betray cycles.' },
        'Topological Sort': { d: 'Order a DAG so every edge points forward — the dependency order of build systems and curricula alike.' },
      },
    },
    'Shortest Paths': {
      d: 'Cheapest routes under weights, where greedy works only if edges behave.',
      c: {
        "Dijkstra's Algorithm": { d: 'Settle the closest unsettled vertex, relax its edges, repeat — correct exactly because weights are non-negative.' },
        'Bellman–Ford': { d: 'Relax every edge V−1 times: slower, but negative weights are fine and negative cycles get detected.' },
      },
    },
    'Connectivity & Components': { d: 'Which vertices form islands — and strongly connected components when direction matters.' },
  },
  'alg-dynamic-programming': {
    'Optimal Substructure': { d: 'The problem property DP requires: optimal solutions built from optimal solutions of subproblems.' },
    'Memoization vs. Tabulation': { d: 'Cache recursion top-down, or fill a table bottom-up — same subproblems, opposite directions.' },
    'Classic Problems': {
      d: 'The canon: each one a template for a family of real problems.',
      c: {
        Knapsack: { d: 'Maximize value under a weight budget — the prototype of resource-constrained choice.' },
        'Edit Distance': { d: 'Fewest insertions, deletions, substitutions between strings — spell checkers and DNA alignment share this table.' },
      },
    },
    'State Design': { d: 'The real skill: choosing what a subproblem is, so the recurrence is both correct and small.' },
  },

  // ═══ cs · Languages & Compilers ════════════════════════════════════════
  'pl-regular-expressions-automata': {
    'Regular Expressions': { d: 'A tiny algebra — concatenation, alternation, repetition — describing exactly the patterns finite memory can match.' },
    'Finite Automata': {
      d: 'Machines with states and transitions, no memory beyond where they stand — regex made operational.',
      c: {
        'DFA vs. NFA': { d: 'One successor per input versus many — nondeterminism buys compactness, not power.' },
        'Subset Construction': { d: 'Simulate all NFA states at once and the sets themselves become DFA states — determinism recovered, exponentially in the worst case.' },
      },
    },
    'The Pumping Lemma': { d: 'Long strings in a regular language must contain a repeatable loop — the tool for proving a language is NOT regular.' },
    'Lexical Analysis': { d: 'Regex put to work: chopping source text into tokens, the first phase of every compiler.' },
  },
  'pl-grammars-parsing': {
    'Context-Free Grammars': {
      d: 'Rules that rewrite symbols into structure — expressive enough for nesting, tame enough to parse.',
      c: {
        Ambiguity: { d: 'One string, two parse trees — the grammar bug behind dangling-else and operator-precedence wars.' },
      },
    },
    'Top-Down Parsing': {
      d: 'Grow the tree from the root, predicting which rule applies from the next tokens.',
      c: {
        'Recursive Descent': { d: 'One function per grammar rule — the parser you can write by hand and actually read.' },
      },
    },
    'Bottom-Up Parsing': { d: 'Recognize complete pieces and reduce upward — LR table machinery covering grammars prediction cannot.' },
    'Parse Trees & ASTs': { d: 'The concrete tree records the grammar; the abstract tree keeps only what later phases need.' },
  },
  'pl-type-systems': {
    'Static vs. Dynamic Typing': { d: 'Catch type errors before running, or check as you go — a trade of guarantees against flexibility.' },
    'Type Checking & Inference': {
      d: 'Verifying annotations is easy; deducing them from usage is where it gets interesting.',
      c: {
        Unification: { d: 'Solve type equations by making both sides identical — the engine inside Hindley–Milner inference.' },
      },
    },
    Polymorphism: {
      d: 'One piece of code, many types — the mechanisms that make abstraction type-safe.',
      c: {
        'Generics & Parametricity': { d: 'Type parameters constrain what code CAN do — a generic function is honest because it cannot inspect its T.' },
      },
    },
    'Types as Propositions': { d: 'Curry–Howard: a type is a claim and a program is its proof — the bridge between logic and code.' },
  },
  'pl-compilers-interpreters': {
    'Compilation Pipeline': {
      d: 'Lex, parse, check, optimize, emit — a factory line where each phase consumes the previous one’s structure.',
      c: {
        'Intermediate Representations': { d: 'A neutral form between source and machine — SSA and friends, where optimizations actually operate.' },
        'Optimization Passes': { d: 'Constant folding, inlining, dead-code elimination — semantics-preserving rewrites that pay for the whole pipeline.' },
      },
    },
    'Code Generation': {
      d: 'From IR to real instructions: choose them, order them, and fight over registers.',
      c: {
        'Register Allocation': { d: 'Infinite virtual registers onto a dozen physical ones — graph coloring with spill code as the penalty.' },
      },
    },
    'Interpreters & VMs': {
      d: 'Execute the structure directly instead of translating ahead — slower per instruction, instant to start.',
      c: {
        'Bytecode & Dispatch': { d: 'Compile to a compact instruction set for a software CPU — the middle ground most dynamic languages live on.' },
        'JIT Compilation': { d: 'Interpret first, watch what gets hot, compile exactly that — paying compilation cost only where it earns.' },
      },
    },
    'Linkers & Loaders': { d: 'Separate compilation’s bill comes due: resolve symbols across files and place code into a runnable image.' },
  },

  // ═══ net · Protocol Stack ══════════════════════════════════════════════
  'stk-link-layer-ethernet': {
    'Frames & MAC Addresses': { d: 'The link layer’s envelope: hardware addresses, a type field, a payload, and a checksum at the end.' },
    'Switching & VLANs': { d: 'Learn which port owns which address and forward only there — plus virtual LANs slicing one switch into many.' },
    ARP: { d: 'The question "who has this IP?" broadcast to the local network — the glue between addressing worlds.' },
    'Error Detection': {
      d: 'Wires corrupt bits; the link layer notices before anyone acts on garbage.',
      c: {
        CRC: { d: 'Polynomial division in hardware: a 32-bit remainder that catches burst errors with near-certainty.' },
      },
    },
  },
  'stk-ip-routing': {
    'IP Addressing': {
      d: 'Hierarchical addresses where the prefix encodes place — the property routing depends on.',
      c: {
        'CIDR & Subnetting': { d: 'Slice address space at any bit boundary — /24, /19, whatever the topology needs.' },
      },
    },
    'Routing Tables': {
      d: 'Per-router maps from destination prefix to next hop — consulted independently for every packet.',
      c: {
        'Longest-Prefix Match': { d: 'The most specific route wins — the one rule that lets general defaults and precise exceptions coexist.' },
      },
    },
    'Routing Protocols': {
      d: 'How routers learn the map: link-state flooding inside a network, path-vector diplomacy between networks.',
      c: {
        OSPF: { d: 'Every router floods its local view, all compute shortest paths on the shared map — Dijkstra in production.' },
        BGP: { d: 'Routing between organizations, where policy and money outrank path length — the protocol that holds the internet together, loosely.' },
      },
    },
    'NAT & Middleboxes': { d: 'Rewriting addresses in flight stretched IPv4 for decades — and quietly broke the end-to-end model.' },
  },
  'stk-tcp-udp': {
    'UDP Datagrams': { d: 'Ports and a checksum, nothing more — the thinnest possible wrapper when you bring your own reliability.' },
    'TCP Connections': {
      d: 'A reliable ordered byte stream conjured from unreliable packets — state machines at both ends doing the pretending.',
      c: {
        'Three-Way Handshake': { d: 'SYN, SYN-ACK, ACK: both sides prove they can hear each other and agree on sequence numbers.' },
        'Sliding Windows': { d: 'Keep many packets in flight, acknowledge cumulatively — throughput without waiting one round trip per packet.' },
        'Retransmission & Timeouts': { d: 'Lost packets are inferred, never announced — timers and duplicate ACKs decide when to resend.' },
      },
    },
    'Congestion Control': {
      d: 'The network never says "slow down" — TCP infers it from loss and delay, and the internet survives because everyone backs off.',
      c: {
        'Loss-Based Algorithms': {
          d: 'Treat packet loss as the congestion signal: grow until it hurts, cut, grow again.',
          c: {
            CUBIC: {
              d: 'The Linux default: window growth as a cubic curve around the last loss point — fast recovery, gentle probing near the ceiling.',
              c: {
                'Window Growth Function': { d: 'W(t) = C(t−K)³ + W_max — plateau near the old maximum, then accelerate: the curve IS the algorithm.' },
              },
            },
          },
        },
        'Delay-Based & Hybrid': { d: 'Watch RTT rise instead of waiting for loss — BBR models the pipe and fills exactly that.' },
      },
    },
  },
  'stk-dns-naming': {
    'Name Hierarchy & Zones': { d: 'Dot-separated labels, authority delegated at every boundary — a distributed database disguised as names.' },
    'Resolution Process': {
      d: 'From typed name to IP address: a chain of servers, each knowing one level more.',
      c: {
        'Recursive vs. Iterative': { d: 'Your resolver does the walking (recursive) or you follow referrals yourself (iterative) — same tree, different legwork.' },
      },
    },
    'Record Types': { d: 'A, AAAA, CNAME, MX, TXT — the name maps to more than addresses.' },
    'Caching & TTLs': { d: 'Every answer carries an expiry; caching makes DNS fast, TTLs decide how stale the world may be.' },
  },

  // ═══ net · Web & Services ══════════════════════════════════════════════
  'web-http-rest': {
    'Request & Response Anatomy': { d: 'Method, path, headers, body — a text protocol simple enough to speak by hand through a socket.' },
    'Methods & Status Codes': {
      d: 'The verb grammar (GET, POST, PUT, DELETE) and the three-digit reply taxonomy.',
      c: {
        'Idempotence & Safety': { d: 'Which requests may be retried blindly and which may not — the property proxies and clients rely on.' },
      },
    },
    'REST Resource Design': { d: 'Model the domain as addressable resources and let the uniform verbs do the work — architecture, not framework.' },
    'Caching & Conditional Requests': { d: 'ETags, max-age, if-modified-since: the machinery that lets the web serve most requests without serving them.' },
    'HTTP/2 & HTTP/3': { d: 'Multiplexed streams over one connection, then over QUIC — attacking head-of-line blocking layer by layer.' },
  },
  'web-sockets-apis': {
    'Socket Lifecycle': { d: 'Bind, listen, accept, read, write, close — the OS-level API every network abstraction bottoms out in.' },
    'Blocking vs. Non-Blocking IO': {
      d: 'Wait per call, or be notified when data is ready — the fork in the road for server architecture.',
      c: {
        'Event Loops': { d: 'One thread multiplexing thousands of connections via readiness notifications — the shape of nginx and Node alike.' },
      },
    },
    'WebSockets & Streaming': { d: 'Upgrade a request into a persistent two-way channel — the escape hatch from request/response.' },
    'Serialization Formats': { d: 'JSON, protobuf, and friends — how structured data survives the trip through a byte pipe.' },
  },

  // ═══ sec · Cryptography ════════════════════════════════════════════════
  'cry-symmetric-encryption': {
    'Block Ciphers': {
      d: 'Encrypt fixed-size blocks under one shared key — AES being the block cipher of record.',
      c: {
        'AES Rounds': { d: 'Substitute, shift, mix, add key — repeated ten-plus times until every output bit depends on every input bit.' },
        'Modes of Operation': {
          d: 'A block cipher alone encrypts sixteen bytes; modes extend it to messages — and choosing badly leaks patterns.',
          c: {
            'GCM & Authenticated Encryption': { d: 'Encrypt and authenticate in one pass — ciphertext that proves it has not been tampered with.' },
          },
        },
      },
    },
    'Stream Ciphers': { d: 'A keyed pseudorandom stream XORed over the message — fast, simple, and fatal if a keystream is ever reused.' },
    'Key Derivation': { d: 'From passwords or shared secrets to uniform keys — stretching, salting, and splitting one secret into many.' },
  },
  'cry-public-key-cryptography': {
    RSA: {
      d: 'Encrypt with a public modulus, decrypt with its secret factorization — security resting on multiplication being easy and factoring hard.',
      c: {
        'Key Generation': {
          d: 'Two large primes and some modular arithmetic — the private key’s safety is decided entirely here.',
          c: {
            'Prime Selection': {
              d: 'Finding random primes of hundreds of digits, quickly and with near-certain confidence.',
              c: {
                'Miller–Rabin Test': { d: 'A probabilistic witness test: each random round that fails to expose compositeness quarters the doubt — run forty and move on.' },
              },
            },
          },
        },
        'Padding Schemes': { d: 'Raw RSA is deterministic and malleable — OAEP-style padding is what makes it an actual encryption scheme.' },
      },
    },
    'Diffie–Hellman': {
      d: 'Two parties mix public values with private exponents and arrive at the same secret — agreement without ever sending it.',
      c: {
        'Elliptic-Curve Variants': { d: 'Same trick over curve points instead of integers — equal security from far smaller keys.' },
      },
    },
    'Digital Signatures': { d: 'Sign with the private key, verify with the public one — authenticity and non-repudiation from the same keypair.' },
  },
  'cry-cryptographic-hashing': {
    'Hash Properties': { d: 'Preimage, second-preimage, and collision resistance — three distinct promises, broken in that order historically.' },
    'Merkle–Damgård & SHA': { d: 'Chain a compression function over blocks — the construction behind MD5, SHA-1, SHA-2, and their shared length-extension quirk.' },
    'HMAC & Message Authentication': { d: 'A keyed hash proving both integrity and origin — the workhorse of API signing and session tokens.' },
    'Password Hashing': {
      d: 'Storing passwords means storing something an attacker with the database still cannot use.',
      c: {
        'Salts & Work Factors': { d: 'Unique salt kills rainbow tables; a tunable cost keeps brute force expensive as hardware improves.' },
      },
    },
  },
  'cry-tls-certificates': {
    'Handshake Protocol': {
      d: 'Negotiate versions and ciphers, authenticate the server, establish keys — all before the first byte of application data.',
      c: {
        'Key Exchange & Forward Secrecy': { d: 'Ephemeral Diffie–Hellman per session: steal the server key tomorrow, yesterday’s traffic stays sealed.' },
      },
    },
    'Certificate Anatomy': { d: 'A public key plus identity claims, signed by an authority — X.509’s baroque but load-bearing format.' },
    'Chains & Authorities': { d: 'Trust flows from root stores through intermediates to sites — a hierarchy of signatures your browser walks silently.' },
    'Revocation': { d: 'Certificates get compromised before they expire — CRLs, OCSP, and the awkward truth that revocation half-works.' },
  },

  // ═══ sec · Applied Security ════════════════════════════════════════════
  'app-authentication-authorization': {
    'Passwords & Beyond': { d: 'Something you know, have, or are — and why the first alone stopped being enough.' },
    'Sessions & Tokens': {
      d: 'HTTP forgets you between requests; sessions and tokens are how systems remember who is asking.',
      c: {
        JWTs: { d: 'Signed claims the server can verify without a lookup — stateless authentication, with revocation as the catch.' },
      },
    },
    'Multi-Factor Authentication': { d: 'Combine independent factors so one stolen credential is not enough — phishing resistance varies wildly by method.' },
    'Access Control Models': {
      d: 'Authenticated is not authorized: the frameworks deciding who may do what.',
      c: {
        'RBAC & Least Privilege': { d: 'Permissions attach to roles, people get roles, and nobody holds more power than their job needs.' },
      },
    },
  },
  'app-common-vulnerabilities': {
    'Injection Attacks': {
      d: 'Data crossing into code: the oldest and still most common way in.',
      c: {
        'SQL Injection': { d: 'User input concatenated into queries — solved decades ago by parameterization, exploited daily anyway.' },
        'Cross-Site Scripting': { d: 'Attacker JavaScript running in the victim’s page — every unescaped output is a potential stage.' },
      },
    },
    'Memory Safety Bugs': {
      d: 'The C-family failure class: writes that land outside their welcome.',
      c: {
        'Buffer Overflows': { d: 'Write past the end of a buffer onto return addresses — the classic path from bug to code execution.' },
      },
    },
    'CSRF & Session Attacks': { d: 'The browser helpfully attaches your cookies to forged requests — riding a session without ever stealing it.' },
    'Supply-Chain Risks': { d: 'Your code is fine; a dependency of a dependency is not — trust extended transitively to strangers.' },
  },

  // ═══ se · Practices ════════════════════════════════════════════════════
  'prc-version-control': {
    'Commits & History': { d: 'Immutable snapshots with parent links — the project’s history as a graph you can query and travel.' },
    'Branching & Merging': {
      d: 'Cheap parallel lines of development — and the reconciliation when they meet again.',
      c: {
        'Merge Conflicts': { d: 'Two edits to the same lines: the tool stops and a human decides — conflict is a feature, not a failure.' },
        'Rebase vs. Merge': { d: 'Replay commits onto a new base for linear history, or merge and keep the true shape — teams pick a religion.' },
      },
    },
    'Git Internals': {
      d: 'Under the porcelain, a content-addressed object database — understanding it turns git from incantations into a system.',
      c: {
        'The Object Model': {
          d: 'Blobs, trees, commits, tags — four object types, each named by the hash of its content.',
          c: {
            Packfiles: {
              d: 'Loose objects compacted into indexed archives — how a decade of history fits in megabytes.',
              c: {
                'Delta Compression': { d: 'Store one version whole and the rest as diffs against it — chosen pairwise by similarity, not by history.' },
              },
            },
          },
        },
        'Refs & The Index': { d: 'Branches are just files containing a hash; the index is the staging photograph the next commit will be.' },
      },
    },
    'Collaboration Workflows': { d: 'Fork-and-PR, trunk-based, gitflow — social contracts layered on the same primitive operations.' },
  },
  'prc-code-review': {
    'What Reviews Catch': { d: 'Less "bugs" than design drift, missing tests, and unshared context — the empirical case is about knowledge, not defects.' },
    'Pull Request Workflow': { d: 'Propose, discuss, revise, approve, merge — asynchronous review as the unit of team change.' },
    'Giving & Receiving Feedback': { d: 'Comment on the code, not the coder; distinguish blocking from preference — craft that keeps reviews useful and teams intact.' },
  },
  'prc-design-patterns': {
    'Creational Patterns': {
      d: 'Decoupling what gets made from where it is made.',
      c: {
        'Factory & Builder': { d: 'Hide the constructor behind intent: families of related objects, or complex assembly step by step.' },
      },
    },
    'Structural Patterns': {
      d: 'Composing objects into larger shapes without welding them together.',
      c: {
        'Adapter & Facade': { d: 'Wrap an awkward interface to fit, or put one simple face on a complicated subsystem.' },
      },
    },
    'Behavioral Patterns': {
      d: 'Distributing responsibility: who calls whom, who knows what.',
      c: {
        'Observer & Strategy': { d: 'Notify subscribers of changes; swap algorithms behind one interface — the two patterns hiding in every framework.' },
        Visitor: { d: 'Add operations to a stable object structure without touching it — double dispatch doing the walking.' },
      },
    },
    'Patterns as Vocabulary': { d: 'The lasting value is the shared names — "that is an adapter" transmits a design in three words. Overuse is its own anti-pattern.' },
  },

  // ═══ se · Testing ══════════════════════════════════════════════════════
  'tst-unit-testing': {
    'Test Anatomy': { d: 'Arrange, act, assert — one behavior per test, named so the failure message is the diagnosis.' },
    'Test Doubles': {
      d: 'Stand-ins for real collaborators, so a unit can be tested alone.',
      c: {
        'Mocks vs. Stubs': { d: 'Stubs feed canned answers; mocks verify interactions happened — confusing them couples tests to implementation.' },
      },
    },
    'Coverage & Its Limits': { d: 'Executed lines are not verified behavior — coverage finds untested code, never untested cases.' },
    'Test-Driven Development': { d: 'Red, green, refactor: write the failing test first and let it pull the design out of you.' },
  },
  'tst-integration-testing': {
    'Test Environments': { d: 'Real database, real queue, containerized per run — realism traded against speed and flakiness.' },
    'Contract Tests': { d: 'Provider and consumer each verify the shared interface — integration confidence without integrated test runs.' },
    'Test Data Management': { d: 'Fixtures, factories, seeded snapshots — stale or entangled data is where integration suites go to rot.' },
    'Fighting Flakiness': { d: 'Timing, ordering, shared state: a test that sometimes fails teaches the team to ignore red — fix or delete it.' },
  },
  'tst-property-based-testing': {
    'Properties & Invariants': { d: 'Assert what must hold for ALL inputs — reversing a reversal yields the original — instead of hand-picking examples.' },
    Generators: { d: 'Structured random input factories — the vocabulary the framework uses to explore your input space.' },
    Shrinking: { d: 'When a random case fails, the framework minimizes it automatically — you debug the essence, not the noise.' },
    'Model-Based Testing': { d: 'Run random operation sequences against a simple reference model — the property is "the real thing agrees with the obvious thing".' },
  },

  // ═══ se · Tooling ══════════════════════════════════════════════════════
  'tool-shell-scripting': {
    'Pipes & Redirection': { d: 'Small programs composed through text streams — the original composable architecture.' },
    'Text Processing Tools': {
      d: 'The classic trio for slicing streams: search, edit, report.',
      c: {
        'grep, sed & awk': { d: 'Filter lines by pattern, transform them in flight, compute over fields — a data pipeline in one command line.' },
      },
    },
    'Scripting Constructs': { d: 'Variables, conditionals, loops, exit codes — enough language to automate, plus quoting rules that bite everyone.' },
    'Job Control': { d: 'Foreground, background, signals, kill — the shell as a process supervisor, not just a launcher.' },
  },
  'tool-debuggers-profilers': {
    'Breakpoints & Stepping': { d: 'Stop time at a chosen line and walk it forward — the debugger’s basic bargain.' },
    'State Inspection': { d: 'Variables, call stacks, watch expressions — reading the program’s actual state instead of guessing at it.' },
    'Sampling Profilers': {
      d: 'Interrupt periodically and record where the program was — a statistical picture with negligible overhead.',
      c: {
        'Flame Graphs': { d: 'Stack samples stacked into a skyline — width is time, and the widest plateau is your bottleneck.' },
      },
    },
    'Instrumentation & Tracing': { d: 'Inject measurement into the code path — exact counts and timelines, bought with overhead sampling avoids.' },
  },

  // ═══ se · Automation ═══════════════════════════════════════════════════
  'auto-continuous-integration': {
    'Pipelines & Stages': { d: 'Build, test, package as declared steps — the merge gate as configuration, versioned next to the code.' },
    'Build Reproducibility': { d: 'Pinned dependencies, hermetic environments — the same inputs must yield the same artifact, or CI results mean nothing.' },
    'Artifacts & Caching': { d: 'Reuse what has not changed: cached dependencies and shared build outputs are the difference between minutes and hours.' },
  },
  'auto-deployment-monitoring': {
    'Deployment Strategies': {
      d: 'Ways to replace running software without a maintenance window.',
      c: {
        'Blue-Green & Canary': { d: 'Flip traffic between two identical stacks, or leak a percentage to the new version and watch it before committing.' },
      },
    },
    'Rollbacks': { d: 'The deploy is not safe because it cannot fail; it is safe because undoing it is one boring, rehearsed step.' },
    Telemetry: {
      d: 'Production observed: the three signal families every incident is debugged from.',
      c: {
        'Metrics, Logs & Traces': { d: 'Numbers over time, events with context, request paths across services — each answers questions the others cannot.' },
      },
    },
    'Alerting & SLOs': { d: 'Define how good is good enough, page humans only when the error budget is actually burning.' },
  },
}
