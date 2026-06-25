# Phase 1 — Domain Data Design
**Status:** Historical domain reference — Stage 6 data encoding must follow `VISION.md`, ADR-005/006/007, and `TYPE_SYSTEM_DESIGN.md`
**Last Updated:** 2026-04-16

---

## What This Document Is

This document preserves the curriculum-domain intent, representative edge examples, and professor-facing walkthroughs.
It is no longer the namespace or storage authority after the reflexivity redesign.

---

## Curriculum Architecture

### Program Overview

The demo models a **Computer Science undergraduate program** — a realistic multi-course knowledge graph that demonstrates the tool at scale (~500 nodes).

| Entity | Type | Description |
|---|---|---|
| CS Undergraduate Program | **Program** (org node) | Top-level container for all courses |
| 6 courses | **Course** (org nodes) | Each course `sys:contains` its knowledge nodes |
| 3 professors | **Professor** (org nodes) | Authors who own courses |
| ~500 knowledge nodes | Various (knowledge types) | Concepts, Principles, Examples, Assessments, References, Analogies |

### The 9 Node Types (2 Categories)

#### Knowledge Types (6) — cognitive content

| Type | Role | Visual Layer |
|---|---|---|
| **Concept** | Core knowledge unit — a topic a student must learn | L1 (always visible) |
| **Principle** | Broad rule, law, or design heuristic | L1 (always visible) |
| **Example** | Concrete instantiation — code walkthrough, diagram, trace | L2 |
| **Assessment** | Formal evaluation OR practice exercise (`format: 'test' \| 'exercise' \| 'quiz'`) | L3 (exercise), L4 (test) |
| **Reference** | External material pointer — textbook, documentation, paper | L4 |
| **Analogy** | Cross-domain mapping to aid intuition | L4 |

#### Organizational Types (3) — structural containers

| Type | Role | Visual Treatment |
|---|---|---|
| **Program** | Degree program — top-level container | Container badge, always visible |
| **Course** | University course — `sys:contains` its knowledge nodes | Container badge, always visible |
| **Professor** | Course author — connected to courses via `teaches` domain edge | Badge/avatar, always visible |

> **Decision (2026-04-16):** Node type system expanded from 6 to 9 types in two categories.
> Knowledge types (6) represent cognitive content and are subject to L1-L4 visibility filtering.
> Organizational types (3) represent structural containers and are always visible (or have their own toggle).
> EVōC clustering naturally separates knowledge clusters from organizational structure.

### Course Catalog

| Course | Professor | Semester | Est. Nodes | Key Topics |
|---|---|---|---|---|
| **CS101: Python 101** | Prof. Chen | Year 1, Fall | ~100 | Variables, data types, control flow, functions, OOP basics |
| **CS201: Data Structures** | Prof. Martinez | Year 1, Spring | ~100 | Arrays, linked lists, trees, graphs, heaps, hash tables |
| **CS301: Algorithms** | Prof. Chen | Year 2, Fall | ~90 | Sorting, searching, graph algorithms, DP, greedy |
| **CS302: OOP & Software Design** | Prof. Martinez | Year 2, Fall | ~80 | Design patterns, SOLID, UML, refactoring |
| **CS401: Databases** | Prof. Lee | Year 2, Spring | ~70 | SQL, normalization, transactions, indexing, NoSQL |
| **CS402: Operating Systems** | Prof. Lee | Year 2, Spring | ~60 | Processes, threads, memory management, scheduling, I/O |
| | | **Total** | **~500** | |

### Professor Assignments

| Professor | Courses | Specialty |
|---|---|---|
| **Prof. Chen** | CS101 (Python 101), CS301 (Algorithms) | Foundational CS + algorithmic thinking |
| **Prof. Martinez** | CS201 (Data Structures), CS302 (OOP & Software Design) | Systems design + engineering |
| **Prof. Lee** | CS401 (Databases), CS402 (Operating Systems) | Infrastructure + systems |

### Node Budget Per Topic

Each "topic" at lecture-slide depth generates a cluster of related nodes:

| Component | Type | Count per topic | Notes |
|---|---|---|---|
| Main concept | Concept | 1 | The topic itself (e.g., "Variable") |
| Sub-concepts | Concept | 0-3 | Via `generalizes` (e.g., Local Variable, Global Variable) |
| Example | Example | 1 | Code walkthrough or trace |
| Exercise | Assessment (exercise) | 1 | Practice problem |
| Principle | Principle | 0-1 | Shared across topics — not duplicated |
| **Typical total** | | **3-6** | Per topic |

**Course-level additions** (not per-topic):
- 2-3 Tests (Assessment, test format) per course
- 2-4 References per course
- 2-5 Analogies per course
- 5-10 cross-cutting Principles per course (shared across topics)

### `sys:contains` Hierarchy

```
CS Undergraduate Program
├── sys:contains → CS101: Python 101
│   ├── sys:contains → Variable
│   ├── sys:contains → Data Type
│   │   ├── sys:contains → Integer          (sub-concept)
│   │   ├── sys:contains → String           (sub-concept)
│   │   └── ...
│   ├── sys:contains → FizzBuzz Walk-through  (example)
│   ├── sys:contains → Exercise: FizzBuzz     (assessment)
│   └── ...
├── sys:contains → CS201: Data Structures
│   ├── sys:contains → Array
│   ├── sys:contains → Linked List
│   └── ...
├── sys:contains → Prof. Chen
├── sys:contains → Prof. Martinez
└── sys:contains → Prof. Lee
```

**Containment rules:**
- Program `sys:contains` all Courses + all Professors
- Course `sys:contains` all its knowledge nodes (Concepts, Examples, Assessments, References, Analogies)
- Concepts MAY `sys:contains` sub-concepts (e.g., Data Type → Integer, String, Boolean)
- Concepts MAY `sys:contains` tightly-bound Examples and Exercises (existing rule from Session 2)
- Principles are NOT contained by courses — they're shared across courses (connected via `demonstrates` domain edges)

### Domain Edge: `teaches`

`teaches` is an education domain relationship — a professor's assignment to a course. It is NOT a system edge because it carries no lifecycle semantics (deleting a professor does not cascade-delete the course).

| Edge | OWL Property Type | Direction | Used Between |
|---|---|---|---|
| `teaches` | ObjectProperty | Professor → Course | Professor → Course |

```
Prof. Chen      teaches  CS101: Python 101
Prof. Chen      teaches  CS301: Algorithms
Prof. Martinez  teaches  CS201: Data Structures
Prof. Martinez  teaches  CS302: OOP & Software Design
Prof. Lee       teaches  CS401: Databases
Prof. Lee       teaches  CS402: Operating Systems
```

### Cross-Course Prerequisite Map

Courses have prerequisite relationships at the course level AND concept-level handoffs:

**Course-level prerequisites:**
```
CS101: Python 101        prerequisite_of  CS201: Data Structures
CS101: Python 101        prerequisite_of  CS302: OOP & Software Design
CS201: Data Structures   prerequisite_of  CS301: Algorithms
CS201: Data Structures   prerequisite_of  CS401: Databases
CS101: Python 101        prerequisite_of  CS402: Operating Systems
```

**Key concept-level cross-course handoffs:**
```
CS101:List               prerequisite_of  CS201:Array
CS101:List               prerequisite_of  CS201:Linked List
CS101:Dictionary         prerequisite_of  CS201:Hash Table
CS101:Recursion          prerequisite_of  CS301:Divide and Conquer
CS101:Class              prerequisite_of  CS302:Inheritance
CS101:Function           prerequisite_of  CS301:Algorithm Analysis
CS201:Binary Search Tree prerequisite_of  CS401:B-Tree Index
CS201:Graph              prerequisite_of  CS301:Graph Algorithms
CS201:Hash Table         prerequisite_of  CS401:Hash Index
CS101:For Loop           prerequisite_of  CS402:Process Scheduling
```

---

## The 13 Formal Edge Types + 1 Derived + 1 System Edge

### Knowledge domain edge reference

| Edge | OWL Property Type | Direction | Used Between |
|---|---|---|---|
| `prerequisite_of` | TransitiveProperty | A → B (A must come before B) | Concept → Concept, Course → Course |
| `generalizes` | TransitiveProperty | A → B (A is broader than B) | Concept → Concept |
| `is_instance_of` | ObjectProperty | A → B (A is a concrete case of B) | Example → Concept |
| `is_component_of` | ObjectProperty | A → B (A is a part of B) | Concept → Concept |
| `builds_on` | ObjectProperty | A → B (A extends or depends on B) | Concept → Concept |
| `contradicts` | SymmetricProperty | A ↔ B | Concept ↔ Principle |
| `is_analogous_to` | SymmetricProperty | A ↔ B | Analogy ↔ Concept |
| `applies_in` | ObjectProperty | A → B (A is applicable within B) | Assessment/Reference → Concept/Principle |
| `commonly_conflated_with` | SymmetricProperty | A ↔ B | Concept ↔ Concept |
| `demonstrates` | ObjectProperty + inverse | A → B / B → A (`is_demonstrated_by`) | Concept → Principle |
| `teaches` | ObjectProperty | A → B (A teaches B) | Professor → Course |
| `contains` | ObjectProperty | A → B (organizational grouping) | User-authored module/topic grouping (ADR-002) |
| `assesses` | **Derived** (from `applies_in`) | A → B | Assessment → Concept |

> **Note on `contains` vs `sys:contains`:** Domain `contains` is a user-authored organizational edge (e.g., professor grouping nodes into lecture modules). `sys:contains` is the system's lifecycle ownership edge with cascade/exclusivity semantics. They are independent — see ADR-002.

### System edge reference

| Edge | Category | Direction | Used Between |
|---|---|---|---|
| `sys:contains` | System | Owner → Child | Program → Course, Course → Knowledge nodes, Concept → sub-concepts |

> **Decision (2026-04-10):** Exercise node type merged into Assessment.
> Both formal exams and practice exercises use `applies_in` → Concept and receive the derived `assesses` edge via Jena inference.
> The `format` field distinguishes them: `'test'`, `'exercise'`, `'quiz'`.

> **Decision (2026-04-11):** Domain changed from sorting algorithms to **Python 101**.
> Then expanded (2026-04-16) to a full 6-course CS undergraduate program (~500 nodes).

> **Decision (2026-04-11):** Primary user persona shifted to **professor as course author**.
> The tool is a course management and knowledge authoring toolset. Professors author the graph, validate structure, and use traversal strategies to inspect the learning paths their course design implies.

> **Decision (2026-04-16):** Multi-course program architecture adopted.
> 6 courses, 3 professors, ~500 nodes. Organizational node types (Program, Course, Professor) added.
> Courses are first-class nodes with `sys:contains` to their knowledge nodes.
> `teaches` domain edge connects professors to courses (ADR-002).

---

## System Edge Layer — Multi-Course

System edges manage structural ownership and assignment. They are orthogonal to domain edges — both can coexist on the same node pair.

### `sys:contains` hierarchy

```
CS Undergraduate Program  sys:contains  CS101: Python 101
CS Undergraduate Program  sys:contains  CS201: Data Structures
CS Undergraduate Program  sys:contains  CS301: Algorithms
CS Undergraduate Program  sys:contains  CS302: OOP & Software Design
CS Undergraduate Program  sys:contains  CS401: Databases
CS Undergraduate Program  sys:contains  CS402: Operating Systems
CS Undergraduate Program  sys:contains  Prof. Chen
CS Undergraduate Program  sys:contains  Prof. Martinez
CS Undergraduate Program  sys:contains  Prof. Lee
```

Each course contains its knowledge nodes (showing CS101 as representative):
```
CS101: Python 101  sys:contains  Variable
CS101: Python 101  sys:contains  Data Type
CS101: Python 101  sys:contains  List
CS101: Python 101  sys:contains  Function
CS101: Python 101  sys:contains  Class
CS101: Python 101  sys:contains  FizzBuzz Walk-through
CS101: Python 101  sys:contains  Quiz: Variable Basics
CS101: Python 101  sys:contains  Exercise: Variable Swap
...  (all 108 CS101 knowledge nodes)
```

Concept-level containment (sub-concepts):
```
Data Type          sys:contains  Integer
Data Type          sys:contains  String
Data Type          sys:contains  Boolean
Sorting Algorithm  sys:contains  Merge Sort         (CS301)
Sorting Algorithm  sys:contains  Quick Sort         (CS301)
Design Pattern     sys:contains  Creational Pattern (CS302)
Design Pattern     sys:contains  Behavioral Pattern (CS302)
Normalization      sys:contains  First Normal Form  (CS401)
Virtual Memory     sys:contains  Paging             (CS402)
```

### `sys:contains` behavioral properties

| Property | Value | Rationale |
|---|---|---|
| `onDelete` | `cascade` | Deleting a course deletes its contained knowledge nodes |
| `exclusive` | `true` for Course→node; `false` for Concept→sub-concept | A quiz belongs to one course; a sub-concept may be referenced across courses |
| `autoCreated` | `true` for promotion workflow | System creates containment when author promotes content to a node |
| `userEditable` | `true` | Author can reassign containment (e.g., move a node between courses) |

### Principles are NOT contained

The 22 shared principles (DRY, KISS, Abstraction, etc.) are independent nodes at the Program level. They connect to courses via `demonstrates` edges from course concepts, NOT via `sys:contains`. This is deliberate — principles are cross-cutting and not owned by any single course.

---

## Representative Edge Samples (Multi-Course)

> **Full node inventory:** See `NODE_INVENTORY.md` (559 nodes across 6 courses + 22 shared principles).
> Below are representative samples showing each edge type used across the multi-course system.

### `generalizes` (TransitiveProperty)

Forms concept hierarchies within each course.

```
# CS101
Data Type              generalizes  Integer
Data Type              generalizes  String
Data Type              generalizes  Boolean
Data Type              generalizes  List
Data Type              generalizes  Tuple
Data Type              generalizes  Dictionary

# CS201
JOIN                   generalizes  Inner Join       (CS401)
JOIN                   generalizes  Outer Join       (CS401)
NoSQL Database         generalizes  Document Store   (CS401)
NoSQL Database         generalizes  Key-Value Store  (CS401)

# CS301
Sorting Algorithm      generalizes  Merge Sort
Sorting Algorithm      generalizes  Quick Sort
Sorting Algorithm      generalizes  Heap Sort
Graph Algorithm        generalizes  Shortest Path
Dynamic Programming    generalizes  Memoization
Dynamic Programming    generalizes  Tabulation

# CS302
Design Pattern         generalizes  Creational Pattern
Design Pattern         generalizes  Behavioral Pattern
Design Pattern         generalizes  Structural Pattern
Polymorphism           generalizes  Method Overloading
Polymorphism           generalizes  Method Overriding

# CS402
CPU Scheduling         generalizes  Round Robin
CPU Scheduling         generalizes  Priority Scheduling
Virtual Memory         generalizes  Paging
Virtual Memory         generalizes  Segmentation
```

**Inference demo:** `Data Type generalizes Integer` is authored; Jena derives the transitive chain `Variable generalizes Integer` when combined with `Variable generalizes Data Type`.

---

### `prerequisite_of` (TransitiveProperty)

Within-course prerequisite chains and cross-course handoffs.

```
# CS101 core chain
Variable               prerequisite_of  Conditional Statement
Conditional Statement  prerequisite_of  For Loop
For Loop               prerequisite_of  Function
Function               prerequisite_of  Class

# CS201 chains
Array                  prerequisite_of  Dynamic Array
Linked List            prerequisite_of  Doubly Linked List
Binary Search Tree     prerequisite_of  AVL Tree
Hash Function          prerequisite_of  Hash Table

# CS301 chains
Divide and Conquer     prerequisite_of  Merge Sort
Greedy Algorithm       prerequisite_of  Huffman Coding
Dynamic Programming    prerequisite_of  Knapsack Problem

# CS401 chains
Table                  prerequisite_of  JOIN
Normalization          prerequisite_of  First Normal Form
First Normal Form      prerequisite_of  Second Normal Form
Second Normal Form     prerequisite_of  Third Normal Form

# CS402 chains
Process                prerequisite_of  Thread
Synchronization        prerequisite_of  Mutex
Paging                 prerequisite_of  Page Replacement

# Cross-course handoffs (concept-level)
CS101:List             prerequisite_of  CS201:Array
CS101:List             prerequisite_of  CS201:Linked List
CS101:Dictionary       prerequisite_of  CS201:Hash Table
CS101:Recursion        prerequisite_of  CS301:Divide and Conquer
CS101:Class            prerequisite_of  CS302:Inheritance
CS101:Function         prerequisite_of  CS301:Algorithm Analysis
CS201:Binary Search Tree prerequisite_of  CS401:B-Tree Index
CS201:Graph            prerequisite_of  CS301:Graph Algorithm
CS201:Hash Table       prerequisite_of  CS401:Hash Index
CS101:For Loop         prerequisite_of  CS402:CPU Scheduling
```

---

### `is_instance_of` (ObjectProperty)

Connects Example nodes to the Concept they instantiate.

```
# CS101
FizzBuzz Walk-through               is_instance_of  Conditional Statement
List Comprehension Trace             is_instance_of  List
Recursive Factorial Trace            is_instance_of  Recursion

# CS201
Array Resize Animation              is_instance_of  Dynamic Array
BST Insert Visualization            is_instance_of  Binary Search Tree
Chaining Collision Resolution Demo   is_instance_of  Chaining

# CS301
Merge Sort Step-by-Step              is_instance_of  Merge Sort
Dijkstra Shortest Path Trace         is_instance_of  Dijkstra's Algorithm

# CS302
Singleton Logger Implementation      is_instance_of  Singleton Pattern
Coffee Order with Decorators         is_instance_of  Decorator Pattern

# CS401
Customer-Order Join                  is_instance_of  Inner Join
Bank Transfer Transaction            is_instance_of  Transaction

# CS402
Dining Philosophers Problem          is_instance_of  Deadlock
LRU Page Eviction Trace              is_instance_of  LRU Page Replacement
```

---

### `is_component_of` (ObjectProperty)

Part-whole semantic structure.

```
# CS101
Parameter     is_component_of  Function
Return Value  is_component_of  Function

# CS201
Node (linked list)  is_component_of  Linked List
Edge                is_component_of  Graph
Vertex              is_component_of  Graph

# CS401
Row             is_component_of  Table
Column          is_component_of  Table
Primary Key     is_component_of  Table
Foreign Key     is_component_of  Table

# CS402
Page Table  is_component_of  Paging
TLB         is_component_of  Paging
Inode       is_component_of  File System
```

---

### `builds_on` (ObjectProperty)

Cumulative dependency — one concept extends or depends on another.

```
# CS101
Recursion          builds_on  Function
Class              builds_on  Function

# CS201
AVL Tree           builds_on  Binary Search Tree
Priority Queue     builds_on  Heap
Trie               builds_on  Tree

# CS301
Bellman-Ford       builds_on  Dijkstra's Algorithm
Knapsack Problem   builds_on  Tabulation
Huffman Coding     builds_on  Greedy Algorithm

# CS302
Test-Driven Development  builds_on  Unit Testing
Decorator Pattern        builds_on  Polymorphism

# CS401
Boyce-Codd Normal Form  builds_on  Third Normal Form
Covering Index          builds_on  Composite Index
```

---

### `contradicts` (SymmetricProperty)

Represents conceptual tension. Symmetric — only needs to be authored once.

```
List              contradicts  Immutability         (CS101)
Mutable Default   contradicts  Immutability         (CS101)
Multiple Inheritance  contradicts  Single Responsibility  (CS302)
Locking           contradicts  Loose Coupling       (CS402/CS302)
```

---

### `is_analogous_to` (SymmetricProperty)

Cross-domain mappings to aid intuition.

```
# CS101
Variable as a Labeled Box     is_analogous_to  Variable
Function as a Recipe          is_analogous_to  Function
Class as a Cookie Cutter      is_analogous_to  Class

# CS201
Stack of Plates               is_analogous_to  Stack
Road Map as a Graph           is_analogous_to  Graph

# CS301
Library Shelf as Binary Search  is_analogous_to  Binary Search
Tournament Bracket as Heap Sort is_analogous_to  Heap Sort

# CS302
Power Adapter as Adapter Pattern  is_analogous_to  Adapter Pattern
Newspaper Subscription as Observer is_analogous_to  Observer Pattern

# CS401
Spreadsheet as a Table        is_analogous_to  Table
Library Card Catalog as Index  is_analogous_to  Index

# CS402
Factory Workers as Threads    is_analogous_to  Thread
Traffic Signal as a Mutex     is_analogous_to  Mutex
```

---

### `applies_in` (ObjectProperty)

Connects Assessment (all formats) and Reference nodes to the Concepts they apply to.
This edge is the input that Jena uses to derive `assesses`.

```
# CS101 — quiz (1 concept), test (2-3 concepts), exercise (practice)
Quiz: Variable Basics                applies_in  Variable
Test: Types and Conversion           applies_in  Data Type
Test: Types and Conversion           applies_in  Type Conversion
Exercise: Variable Swap              applies_in  Variable
Exercise: Recursive Fibonacci        applies_in  Recursion
Python 3 Official Documentation      applies_in  Data Type

# CS201
Quiz: Stack Operations               applies_in  Stack
Test: Linked List Variants           applies_in  Singly Linked List
Test: Linked List Variants           applies_in  Doubly Linked List
Exercise: BST Insert and Search      applies_in  Binary Search Tree

# CS301
Test: Dijkstra vs Bellman-Ford       applies_in  Dijkstra's Algorithm
Test: Dijkstra vs Bellman-Ford       applies_in  Bellman-Ford Algorithm
Exercise: Solve 0/1 Knapsack        applies_in  Knapsack Problem

# CS302
Quiz: Encapsulation Basics           applies_in  Encapsulation
Test: SOLID — SRP and OCP            applies_in  Single Responsibility Principle
Test: SOLID — SRP and OCP            applies_in  Open/Closed Principle

# CS401
Test: JOIN Types                     applies_in  Inner Join
Test: JOIN Types                     applies_in  Outer Join
Test: JOIN Types                     applies_in  Cross Join
Exercise: Normalize to 3NF          applies_in  Third Normal Form

# CS402
Test: Synchronization Primitives     applies_in  Mutex
Test: Synchronization Primitives     applies_in  Semaphore
Exercise: Simulate LRU Replacement   applies_in  LRU Page Replacement
```

---

### `commonly_conflated_with` (SymmetricProperty)

Documented student misconceptions — concepts frequently confused.

```
List    commonly_conflated_with  Tuple          (CS101: both ordered sequences, mutable vs immutable)
Array   commonly_conflated_with  Linked List    (CS201: both store sequences, contiguous vs chained)
Stack   commonly_conflated_with  Queue          (CS201: both linear ADTs, LIFO vs FIFO)
Thread  commonly_conflated_with  Process        (CS402: both execution units, shared vs isolated memory)
```

---

### `demonstrates` (ObjectProperty + inverse `is_demonstrated_by`)

Connects concepts to the 22 shared principles they embody.

```
# DRY
Function   demonstrates  DRY          (CS101)
Recursion  demonstrates  DRY          (CS101)

# Abstraction
Class              demonstrates  Abstraction  (CS101)
Abstract Data Type demonstrates  Abstraction  (CS201)
Abstract Class     demonstrates  Abstraction  (CS302)
Virtual Memory     demonstrates  Abstraction  (CS402)

# Separation of Concerns
MVC Pattern         demonstrates  Separation of Concerns  (CS302)
Schema              demonstrates  Separation of Concerns  (CS401)
Device Driver       demonstrates  Separation of Concerns  (CS402)

# Divide and Conquer
Merge Sort          demonstrates  Divide and Conquer  (CS301)
Quick Sort          demonstrates  Divide and Conquer  (CS301)

# Time-Space Trade-off
Hash Table          demonstrates  Time-Space Trade-off  (CS201)
Memoization         demonstrates  Time-Space Trade-off  (CS301)
Index               demonstrates  Time-Space Trade-off  (CS401)

# Immutability
Tuple               demonstrates  Immutability  (CS101)

# Single Responsibility
Single Responsibility Principle  demonstrates  Single Responsibility  (CS302)
```

---

### `assesses` — Derived Edge

Not authored. Appears **only after Jena inference runs**.

**Rule:** `Assessment applies_in Concept → Assessment assesses Concept`

```
Quiz: Variable Basics          assesses  Variable              ← inferred
Test: Types and Conversion     assesses  Data Type             ← inferred
Test: Types and Conversion     assesses  Type Conversion       ← inferred
Exercise: Variable Swap        assesses  Variable              ← inferred
Test: JOIN Types               assesses  Inner Join            ← inferred
Test: JOIN Types               assesses  Outer Join            ← inferred
Test: JOIN Types               assesses  Cross Join            ← inferred
```

Rendered with dashed stroke + distinct colour to distinguish from authored edges.

---

## Coverage Check

Every edge type must appear at least once in the authored data.

### Domain edges

| Edge | Present | Representative examples |
|---|---|---|
| `prerequisite_of` | ✓ | CS101 chain (Variable → Class); cross-course (CS101:List → CS201:Array) |
| `generalizes` | ✓ | Data Type hierarchy (CS101); Sorting Algorithm hierarchy (CS301) |
| `is_instance_of` | ✓ | FizzBuzz Walk-through (CS101); Dining Philosophers (CS402) |
| `is_component_of` | ✓ | Parameter → Function (CS101); Row → Table (CS401) |
| `builds_on` | ✓ | Recursion builds_on Function (CS101); AVL builds_on BST (CS201) |
| `contradicts` | ✓ | List ↔ Immutability (CS101) |
| `is_analogous_to` | ✓ | Recipe ↔ Function (CS101); Stack of Plates ↔ Stack (CS201) |
| `applies_in` | ✓ | 148 assessments + 22 references across 6 courses |
| `commonly_conflated_with` | ✓ | List ↔ Tuple (CS101); Thread ↔ Process (CS402) |
| `demonstrates` | ✓ | Concepts from all 6 courses → 22 shared principles |
| `teaches` | ✓ | 6 edges: 3 professors × 2 courses each |
| `contains` (domain) | ✓ | Professor-authored organizational grouping (e.g., lecture modules) |
| `assesses` (derived) | ✓ (post-inference) | Jena derives from all `applies_in` edges |

### System edges

| Edge | Present | Count |
|---|---|---|
| `sys:contains` | ✓ | Program → 6 Courses + 3 Professors; each Course → its knowledge nodes; Concept → sub-concepts |

---

## Traversal Strategy Walkthrough (Multi-Course)

### Linear Traversal (Claim 4 — "inspect the learning path")

**Within-course:** Start node: `Variable` (CS101)
Chain: `Variable → Conditional Statement → For Loop → Function → Class`
Gap detected at: **Class** (no Assessment applies to it via `applies_in`)

**Cross-course:** Start node: `CS101:List`
Cross-course chain: `CS101:List → CS201:Array → CS201:Dynamic Array`
Then: `CS101:List → CS201:Linked List → CS201:Doubly Linked List`

**Professor use:** "I can trace whether students arriving from Python 101 have the prerequisite foundation for Data Structures. The system shows the full chain from List in my CS101 to Array in Martinez's CS201."

### Explore Traversal (Claim 5 — "see all relationships around a topic")

Start node: **Hash Table** (CS201)
All edges expanded:
- `prerequisite_of` inbound from Hash Function
- `builds_on` inbound from none
- `is_component_of` inbound from none
- `is_instance_of` inbound from Hash Table with Chaining Demo
- `demonstrates` outbound to Time-Space Trade-off (shared principle)
- `applies_in` inbound from Quiz: Hash Function Basics, Test: Collision Resolution, Exercise: Hash Table with Chaining
- `commonly_conflated_with` none
- Cross-course: `CS201:Hash Table prerequisite_of CS401:Hash Index`
- `sys:contains` from CS201: Data Structures

**Professor use:** "I can see Hash Table is well-covered in CS201 with 3 assessments, demonstrates a shared principle, and feeds into Prof. Lee's CS401 via Hash Index."

### Problem-First Traversal (Claim 6 — "verify what an assessment implicitly requires")

Start node: **Test: Dijkstra vs Bellman-Ford** (CS301)
Backward over `applies_in`: reaches Dijkstra's Algorithm and Bellman-Ford Algorithm
Then backward over `prerequisite_of`: reaches Graph Algorithm → Graph (CS201) → CS101:List
Then backward over `builds_on`: Bellman-Ford builds_on Dijkstra's Algorithm

**Professor use:** "This test requires both shortest path algorithms. The system traces back through CS201 graphs to CS101 lists — I can verify students have the prerequisite chain before assigning this test."

---

## Inference Demo Script (Multi-Course)

This is the exact sequence shown during the thesis walkthrough for the inference claim:

1. Graph loads — only authored edges visible
2. Professor clicks **Run Inference**
3. Jena processes the OWL ontology + authored triples
4. New edges appear dashed:
   - `Variable generalizes Integer` (transitive: Variable → Data Type → Integer)
   - `Variable generalizes String` (transitive)
   - `Variable generalizes Boolean` (transitive)
   - `Variable generalizes List` (transitive)
   - `Sorting Algorithm generalizes Heap Sort` (transitive: via CS301 hierarchy)
   - `Normalization generalizes Third Normal Form` (transitive: 1NF → 2NF → 3NF)
   - `Quiz: Variable Basics assesses Variable` (derived from applies_in)
   - `Test: Types and Conversion assesses Data Type` (derived from applies_in)
   - `Test: Types and Conversion assesses Type Conversion` (derived from applies_in)
   - `Test: JOIN Types assesses Inner Join` (derived from applies_in, CS401)
   - `Test: JOIN Types assesses Outer Join` (derived from applies_in, CS401)
   - ... (all 148 assessments generate `assesses` edges)
5. UI shows count: "N edges inferred" (transitive closures + all derived `assesses`)

**Professor framing:** "The inference engine reveals implicit structure — studying Variable means studying all data type subtypes; a single test assessment implicitly covers 3 join types. Jena derives this automatically from my authored graph."

---

## Design Decisions Log

### 2026-04-10 Session

| Decision | Resolution | Rationale |
|---|---|---|
| Exercise node type | **Merged into Assessment** (`format: 'exercise'`) | Both exams and exercises use `applies_in` → Concept and receive the derived `assesses` edge. Distinct behavior, same structural role. Schema simplifies to 6 node types. |
| Principle connectivity (`Stability`, `In-Place Sorting`) | **`demonstrates` edge** — `Concept demonstrates Principle` | New 10th formal edge with inverse `is_demonstrated_by`. Semantically precise. OWL ObjectProperty with inverseOf. |
| Backend language | **C# ASP.NET Core Web API** (see ADR-001) | Developer familiarity; full Neo4j driver support; Jena via HttpClient. |
| Jena setup | **Fuseki + in-memory dataset** | 23 nodes need no persistent storage; simpler Docker setup. |
| EVōC embedding source | **Deferred** | Decide after core build phases complete. |

### 2026-04-11 Session (Design Iteration)

| Decision | Resolution | Rationale |
|---|---|---|
| Domain pivot | **Sorting algorithms → Python 101** | Python 101 is more universally recognizable to thesis examiners; richer prerequisite chains (Variable → Data Types → Control Flow → Functions → OOP); a real university course naturally scales to 200–300 nodes |
| Primary user persona | **Professor as course author and manager** | Thesis is about course management tools; professor authors the knowledge graph, validates structure, and uses traversal strategies to inspect implied learning paths. Stronger thesis framing than student-facing viewer. |
| Scale target | **200–300 nodes for a realistic course; ~26 nodes for demo** | Demo is a representative slice showing all 6 node types and all 13 domain edge types. Full course simulation deferred. |
| Org layer (students, departments, TAs) | **Deferred — context only** | School structure is scaffolding for realism, not a thesis claim. Can be added later without architectural changes. |

### 2026-04-11 Session (System vs Domain Edge Architecture)

| Decision | Resolution | Rationale |
|---|---|---|
| System vs domain edges | **Orthogonal axes** — `sys:contains` = lifecycle ownership; `is_component_of` = semantic part-whole. Both can coexist. | Clean separation: system edges are plumbing; domain edges are user knowledge. |
| `sys:contains` in demo data | **System edges for structural ownership** — Courses contain knowledge nodes; concepts may contain sub-concepts | These nodes were created FOR a specific parent and have no meaning without it. |
| Naming convention | **Colon-separated qualified names** — `sys:contains` (system); bare names for domain edges (ADR-002) | Maps to RDF QNames; extensible to hierarchical namespaces. |
| Shared concepts (Principles) | **No `sys:contains`** — remain independent nodes with domain edges only | They are semantically independent and referenced across multiple courses via `demonstrates`. |

### 2026-04-16 Session (Multi-Course Expansion)

| Decision | Resolution | Rationale |
|---|---|---|
| Scale expansion | **26 nodes → 559 nodes across 6 courses** | 200–300 per course was the original target; multi-course shows cross-course traversal and program-wide visualization |
| Course selection | **6 courses: CS101, CS201, CS301, CS302, CS401, CS402** | Covers breadth of a CS undergraduate program; creates rich cross-course prerequisite web |
| Professor count | **3 professors, 2 courses each** | Minimum needed to show `teaches` domain edge and cross-professor prerequisites |
| Organizational node types | **3 new types: Program, Course, Professor** | Added to the 6 knowledge types (total 9). Organizational types always visible; knowledge types subject to L1-L4 filtering. |
| `teaches` edge | **Domain edge** connecting Professor → Course (ADR-002) | User-authored assignment data; not a system concern |
| Assessment format | **`'test' \| 'exercise' \| 'quiz'`** (dropped `'exam'`) | Quiz = mastery check for 1 concept; Test = mastery check for 2-3 concept cluster; Exercise = practice problem. No midterm/final exams — all assessments are per-concept or small-cluster mastery checks. |
| Shared principles | **22 principles, cross-course via `demonstrates`** | Not contained by any course; connected through domain edges from concepts in multiple courses |

### The Authoring Promotion Model

A knowledge node's identity comes from two complementary sources:

1. **Semantic independence** — worth a node when it can be referenced from multiple places (e.g., `Immutability` is demonstrated by Tuple, contradicted by List, referenced by exercises)
2. **Authoring promotion** — the author promotes a content section to a node; the tool auto-creates `sys:contains` (lifecycle) + the author supplies a domain edge (semantic)

**Future LLM features (not in demo scope):**
- Post-promotion scan: check if the new node is redundant with existing nodes; suggest merge
- Edge suggestion: analyze node content + current graph; suggest additional edges beyond the first
- Author reviews and accepts/rejects suggestions
