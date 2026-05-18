## CS101: Python 101 — Node Inventory (Prof. Chen)

### Concepts (55)

| # | Concept | Parent (generalizes) | Description |
|---|---------|---------------------|-------------|
| 1 | Variable | — | A named storage location that holds a value |
| 2 | Local Variable | Variable | A variable accessible only within its enclosing function |
| 3 | Global Variable | Variable | A variable accessible throughout the entire program module |
| 4 | Data Type | — | A classification determining what values a variable can hold |
| 5 | Integer | Data Type | A whole number without a decimal component |
| 6 | Float | Data Type | A number with a fractional decimal component |
| 7 | String | Data Type | An immutable sequence of Unicode characters |
| 8 | Boolean | Data Type | A logical value that is either True or False |
| 9 | Type Conversion | — | Changing a value from one data type to another |
| 10 | Implicit Conversion | Type Conversion | Automatic type promotion performed by the Python interpreter |
| 11 | Explicit Conversion | Type Conversion | Manual type casting using built-in conversion functions |
| 12 | Operator | — | A symbol that performs a computation on operands |
| 13 | Arithmetic Operator | Operator | Performs mathematical calculations like addition and multiplication |
| 14 | Comparison Operator | Operator | Compares two values and returns a Boolean result |
| 15 | Logical Operator | Operator | Combines Boolean expressions using and, or, not |
| 16 | Expression | — | A combination of values and operators yielding a result |
| 17 | Assignment | — | Binding a value to a variable name using equals |
| 18 | Collection | — | A container data type that groups multiple elements |
| 19 | List | Collection | A mutable ordered sequence; contradicts immutability principles |
| 20 | Tuple | Collection | An immutable ordered sequence; commonly confused with List |
| 21 | Dictionary | Collection | A mutable mapping of unique keys to values |
| 22 | Set | Collection | An unordered collection of unique hashable elements |
| 23 | Index | — | A zero-based integer position of an element in a sequence |
| 24 | Slice | — | Extracting a subsequence using start, stop, and step values |
| 25 | List Comprehension | List | Concise syntax for creating lists from existing iterables |
| 26 | String Formatting | — | Techniques for embedding values inside string templates |
| 27 | F-String | String Formatting | A formatted string literal using inline expressions |
| 28 | Control Flow | — | Statements that determine the execution order of code |
| 29 | Conditional Statement | Control Flow | Branches execution based on Boolean test conditions |
| 30 | If Statement | Conditional Statement | Executes a block only when its condition is True |
| 31 | Loop | Control Flow | Repeats a block of code multiple times |
| 32 | For Loop | Loop | Iterates over each element in a sequence or iterable |
| 33 | While Loop | Loop | Repeats a block while a condition remains True |
| 34 | Iterator | — | An object that yields elements one at a time |
| 35 | Range | — | Generates an immutable sequence of evenly spaced integers |
| 36 | Break Statement | — | Immediately exits the innermost enclosing loop |
| 37 | Continue Statement | — | Skips the rest of the current loop iteration |
| 38 | Function | — | A reusable named block that performs a specific task |
| 39 | Parameter | Function | A variable declared in a function definition signature |
| 40 | Return Value | Function | The output a function sends back to its caller |
| 41 | Default Argument | Parameter | A parameter value used when no argument is supplied |
| 42 | Keyword Argument | Parameter | An argument passed by explicitly naming the parameter |
| 43 | Lambda Function | Function | An anonymous single-expression function defined inline |
| 44 | Recursion | Function | A function that calls itself to solve smaller subproblems |
| 45 | Scope | — | The region of code where a variable name is accessible |
| 46 | Class | — | A blueprint that defines attributes and behaviors for objects |
| 47 | Object | Class | A concrete instance created from a class blueprint |
| 48 | Constructor | Class | The __init__ method that initializes a new object |
| 49 | Method | Class | A function defined inside a class operating on instances |
| 50 | Attribute | Class | A variable bound to an object storing its state |
| 51 | Inheritance | Class | A mechanism where a subclass reuses parent class behavior |
| 52 | Module | — | A Python file containing reusable functions and variables |
| 53 | Import Statement | Module | Loads definitions from another module into current scope |
| 54 | File I/O | — | Reading from and writing data to files on disk |
| 55 | Exception Handling | — | Catching and responding to runtime errors using try-except |

### Examples (15)

| # | Example | Instantiates (is_instance_of) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Hello World Variables | Variable | Step-by-step trace showing variable assignment and printing |
| 2 | Temperature Celsius to Fahrenheit | Explicit Conversion | Converting a float temperature between unit scales |
| 3 | Shopping Cart Total | Arithmetic Operator | Calculating a sum of item prices using arithmetic operators |
| 4 | Vowel Counter String Scan | String | Iterating through a string to count vowel characters |
| 5 | Grocery List Builder | List | Appending, removing, and sorting items in a list |
| 6 | Student Record Dictionary | Dictionary | Storing and retrieving student data by name keys |
| 7 | Grade Checker If-Elif Chain | Conditional Statement | Mapping a numeric score to a letter grade |
| 8 | FizzBuzz For Loop | For Loop | Printing FizzBuzz output using modulo inside a loop |
| 9 | Countdown While Loop | While Loop | Decrementing a counter until it reaches zero |
| 10 | Squares via List Comprehension | List Comprehension | Generating squared values from a range in one line |
| 11 | Greeting Function Demo | Function | Defining and calling a function with a name parameter |
| 12 | Factorial via Recursion | Recursion | Computing n! by multiplying n by factorial of n-1 |
| 13 | Dog Class and Objects | Object | Creating dog instances with name and breed attributes |
| 14 | CSV File Reader Script | File I/O | Opening and reading comma-separated values from a file |
| 15 | Safe Division Handler | Exception Handling | Using try-except to catch ZeroDivisionError gracefully |

### Assessments (30)

| # | Assessment | Format | Applies To (applies_in) | Description |
|---|-----------|--------|------------------------|-------------|
| 1 | Quiz: Variable Basics | quiz | Variable | Identify valid variable names and predict assignment results |
| 2 | Quiz: Data Type Identification | quiz | Data Type | Classify values by their Python data type |
| 3 | Test: Types and Conversion | test | Data Type, Type Conversion | Identify types and apply explicit and implicit conversions |
| 4 | Test: Operators and Expressions | test | Operator, Expression | Evaluate arithmetic, comparison, and logical expressions |
| 5 | Quiz: List Operations | quiz | List | Predict output of append, remove, and index operations |
| 6 | Test: Collection Comparison | test | List, Tuple, Dictionary | Compare collection types and choose appropriate one for scenarios |
| 7 | Quiz: Conditional Logic | quiz | Conditional Statement | Trace if-elif-else branches for given input values |
| 8 | Test: Loop Mechanics | test | For Loop, While Loop, Range | Trace loop execution and predict output values |
| 9 | Quiz: Function Basics | quiz | Function | Identify function definition, call, and return patterns |
| 10 | Test: Function Parameters | test | Parameter, Return Value, Default Argument | Analyze function signatures with defaults and keyword args |
| 11 | Quiz: Recursion Concepts | quiz | Recursion | Identify base case and recursive case in given functions |
| 12 | Test: Class and Object | test | Class, Object, Constructor | Create classes, instantiate objects, and use constructors |
| 13 | Quiz: Inheritance Basics | quiz | Inheritance | Predict method resolution in single inheritance hierarchies |
| 14 | Test: Modules and Imports | test | Module, Import Statement | Use import variants and access module attributes |
| 15 | Test: File and Exception Handling | test | File I/O, Exception Handling | Read files with proper error handling using try-except |
| 16 | Exercise: Variable Swap | exercise | Variable | Write code to swap two variables without a temp |
| 17 | Exercise: Type Converter | exercise | Explicit Conversion | Convert user input strings to numeric types safely |
| 18 | Exercise: Expression Evaluator | exercise | Expression, Operator | Evaluate nested arithmetic and Boolean expressions |
| 19 | Exercise: List Reversal | exercise | List | Reverse a list in place without using built-in reverse |
| 20 | Exercise: Tuple Packing | exercise | Tuple | Pack and unpack multiple return values using tuples |
| 21 | Exercise: Dictionary Merger | exercise | Dictionary | Merge two dictionaries and handle duplicate keys |
| 22 | Exercise: Set Symmetric Difference | exercise | Set | Compute elements in either set but not both |
| 23 | Exercise: F-String Formatter | exercise | F-String, String Formatting | Format a receipt with aligned columns using f-strings |
| 24 | Exercise: Nested Conditional Refactor | exercise | Conditional Statement, If Statement | Refactor deeply nested if-else into cleaner structure |
| 25 | Exercise: Pattern Printer | exercise | For Loop, Range | Print a right triangle pattern using nested loops |
| 26 | Exercise: Search with Break | exercise | Break Statement, Loop | Search a list and exit early when target is found |
| 27 | Exercise: Build a Calculator | exercise | Function, Return Value | Implement a four-operation calculator using functions |
| 28 | Exercise: Lambda Sort | exercise | Lambda Function | Sort a list of tuples by second element using lambda |
| 29 | Exercise: Recursive Fibonacci | exercise | Recursion | Implement Fibonacci sequence using recursive function calls |
| 30 | Exercise: File Word Counter | exercise | File I/O | Count word frequencies in a text file |

### References (4)

| # | Reference | Applies To (applies_in) | Description |
|---|----------|------------------------|-------------|
| 1 | Python 3 Official Documentation | Data Type | Official reference for all built-in types and functions |
| 2 | PEP 8 Style Guide | Function | Authoritative Python coding conventions and formatting rules |
| 3 | Think Python by Allen Downey | Variable | Introductory textbook covering fundamentals with exercises |
| 4 | Python Tutorial on python.org | Module | Official guided walkthrough of Python language features |

### Analogies (4)

| # | Analogy | Analogous To (is_analogous_to) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Variable as a Labeled Box | Variable | A labeled box stores one item like a variable stores a value |
| 2 | Dictionary as a Phone Book | Dictionary | A phone book maps names to numbers like key-value pairs |
| 3 | Function as a Recipe | Function | A recipe maps ingredients to a dish like inputs to outputs |
| 4 | Class as a Cookie Cutter | Class | A cookie cutter stamps shapes like a class creates objects |

**Course Total: 108 nodes** (Concepts: 55 + Examples: 15 + Assessments: 30 + References: 4 + Analogies: 4)

---

## CS201: Data Structures — Node Inventory (Prof. Martinez)

### Concepts (55)

| # | Concept | Parent (generalizes) | Description |
|---|---------|---------------------|-------------|
| 1 | Abstract Data Type | — | A logical description of data and its permitted operations |
| 2 | Array | — | A contiguous block of memory storing fixed-size elements |
| 3 | Dynamic Array | Array | An array that resizes automatically when capacity is exceeded |
| 4 | Linked List | — | A chain of nodes where each node points to the next |
| 5 | Singly Linked List | Linked List | Each node holds data and one pointer to the next node |
| 6 | Doubly Linked List | Linked List | Each node holds pointers to both next and previous nodes |
| 7 | Stack | Abstract Data Type | A last-in first-out collection with push and pop operations |
| 8 | Queue | Abstract Data Type | A first-in first-out collection with enqueue and dequeue |
| 9 | Deque | Queue | A double-ended queue allowing insertion and removal at both ends |
| 10 | Priority Queue | Queue | A queue where elements are dequeued by priority order |
| 11 | Node | — | A basic unit containing data and links to other nodes |
| 12 | Pointer | — | A reference that stores the memory address of another element |
| 13 | Binary Tree | — | A hierarchical structure where each node has at most two children |
| 14 | Binary Search Tree | Binary Tree | A binary tree maintaining sorted order for efficient lookup |
| 15 | AVL Tree | Binary Search Tree | A self-balancing BST with height difference at most one |
| 16 | Heap | Binary Tree | A complete binary tree satisfying the heap ordering property |
| 17 | Min-Heap | Heap | A heap where the smallest element is always at the root |
| 18 | Max-Heap | Heap | A heap where the largest element is always at the root |
| 19 | B-Tree | — | A balanced multi-way search tree optimized for disk access |
| 20 | Trie | — | A prefix tree storing strings character by character along paths |
| 21 | Tree Traversal | Binary Tree | A systematic method for visiting every node in a tree |
| 22 | In-Order Traversal | Tree Traversal | Visits left subtree, then root, then right subtree |
| 23 | Pre-Order Traversal | Tree Traversal | Visits root first, then left subtree, then right subtree |
| 24 | Post-Order Traversal | Tree Traversal | Visits left subtree, then right subtree, then root last |
| 25 | Level-Order Traversal | Tree Traversal | Visits nodes level by level from top to bottom |
| 26 | Graph | — | A set of vertices connected by edges representing relationships |
| 27 | Directed Graph | Graph | A graph where each edge has a specific direction |
| 28 | Undirected Graph | Graph | A graph where edges have no direction and connect symmetrically |
| 29 | Weighted Graph | Graph | A graph where each edge carries a numerical weight or cost |
| 30 | Adjacency Matrix | Graph | A two-dimensional array representing edge connections between vertices |
| 31 | Adjacency List | Graph | A collection of lists storing neighbors for each vertex |
| 32 | Vertex | Graph | A fundamental point or node within a graph structure |
| 33 | Edge | Graph | A connection linking two vertices in a graph |
| 34 | Breadth-First Search | Graph | Explores all neighbors at current depth before going deeper |
| 35 | Depth-First Search | Graph | Explores as far as possible along each branch before backtracking |
| 36 | Hash Table | — | A data structure mapping keys to values using a hash function |
| 37 | Hash Function | Hash Table | Computes an index from a key for array-based storage |
| 38 | Collision | Hash Table | Occurs when two distinct keys map to the same index |
| 39 | Chaining | Collision | Resolves collisions by storing multiple entries in a linked list |
| 40 | Open Addressing | Collision | Resolves collisions by probing for the next available slot |
| 41 | Linear Probing | Open Addressing | Probes consecutive slots sequentially until an empty slot is found |
| 42 | Load Factor | Hash Table | The ratio of stored entries to total table capacity |
| 43 | Time Complexity | — | A measure of how runtime grows with input size |
| 44 | Space Complexity | — | A measure of how memory usage grows with input size |
| 45 | Big-O Notation | Time Complexity | Describes the upper bound of an algorithm's growth rate |
| 46 | Big-Omega Notation | Time Complexity | Describes the lower bound of an algorithm's growth rate |
| 47 | Big-Theta Notation | Time Complexity | Describes the tight bound of an algorithm's growth rate |
| 48 | Amortized Analysis | Time Complexity | Averages cost over a sequence of operations for true cost |
| 49 | Worst-Case Analysis | Time Complexity | Evaluates maximum possible runtime for any valid input |
| 50 | Best-Case Analysis | Time Complexity | Evaluates minimum possible runtime for an ideal input |
| 51 | Iterator Pattern | Abstract Data Type | A design pattern providing sequential access without exposing internals |
| 52 | Recursion in Data Structures | — | Using self-referential calls to process recursive data structures |
| 53 | Balancing | Binary Search Tree | Maintaining tree height proportional to log of node count |
| 54 | Rotation | Balancing | A local restructuring operation that restores tree balance |
| 55 | Cycle Detection | Graph | Determining whether a graph contains a circular path |

### Examples (15)

| # | Example | Instantiates (is_instance_of) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Stack-Based Undo System | Stack | Pushing and popping editor actions to undo recent changes |
| 2 | Queue-Based Print Spooler | Queue | Processing print jobs in first-come first-served order |
| 3 | Linked List Music Playlist | Singly Linked List | Navigating songs forward through a linked node chain |
| 4 | BST Phone Book Lookup | Binary Search Tree | Inserting and searching contacts in a sorted binary tree |
| 5 | AVL Tree Insertion Trace | AVL Tree | Step-by-step insertion showing rotations restoring balance |
| 6 | Min-Heap Priority Scheduler | Min-Heap | Scheduling tasks by extracting the lowest priority value first |
| 7 | Hash Table Word Counter | Hash Table | Counting word frequencies using key-value hash storage |
| 8 | Trie Autocomplete Engine | Trie | Suggesting word completions by traversing shared prefix paths |
| 9 | BFS Shortest Path Finder | Breadth-First Search | Finding shortest unweighted path between two vertices level by level |
| 10 | DFS Maze Solver | Depth-First Search | Navigating a maze by exploring each path to its dead end |
| 11 | Dynamic Array Growth Demo | Dynamic Array | Demonstrating capacity doubling when array becomes full |
| 12 | Adjacency List Social Network | Adjacency List | Modeling friend connections as neighbor lists per user vertex |
| 13 | In-Order BST Sorted Print | In-Order Traversal | Printing all BST values in ascending sorted order |
| 14 | Chaining Collision Resolution Demo | Chaining | Handling hash collisions by appending to a bucket's linked list |
| 15 | Big-O Growth Rate Comparison | Big-O Notation | Plotting O(1), O(n), O(n log n), and O(n²) on one chart |

### Assessments (29)

| # | Assessment | Format | Applies To (applies_in) | Description |
|---|-----------|--------|------------------------|-------------|
| 1 | Quiz: Array Fundamentals | quiz | Array | Identify array indexing patterns and bounds checking |
| 2 | Test: Linked List Variants | test | Singly Linked List, Doubly Linked List | Compare singly and doubly linked list operations and trade-offs |
| 3 | Quiz: Stack Operations | quiz | Stack | Trace push and pop sequences and predict stack contents |
| 4 | Test: Queue Family | test | Queue, Deque, Priority Queue | Compare queue variants and choose appropriate one for scenarios |
| 5 | Quiz: BST Properties | quiz | Binary Search Tree | Verify BST ordering property and trace insert operations |
| 6 | Test: Tree Traversals | test | Tree Traversal, In-Order Traversal, Pre-Order Traversal | Determine traversal output for a given binary tree |
| 7 | Test: Balanced Trees | test | AVL Tree, Rotation | Identify imbalanced nodes and apply rotation to restore balance |
| 8 | Test: Heap Operations | test | Heap, Min-Heap | Trace heapify and extract-min on a given array |
| 9 | Test: Graph Representations | test | Adjacency Matrix, Adjacency List | Convert between matrix and list representations |
| 10 | Test: Graph Traversal | test | Breadth-First Search, Depth-First Search | Trace BFS and DFS visit order on a given graph |
| 11 | Quiz: Hash Function Basics | quiz | Hash Function | Compute hash values and identify collision scenarios |
| 12 | Test: Collision Resolution | test | Chaining, Open Addressing | Compare chaining and open addressing collision strategies |
| 13 | Quiz: Big-O Classification | quiz | Big-O Notation | Classify algorithm runtimes using asymptotic notation |
| 14 | Test: Complexity Analysis | test | Time Complexity, Amortized Analysis | Analyze time complexity including amortized cost for dynamic arrays |
| 15 | Exercise: Dynamic Array Resize | exercise | Dynamic Array | Implement automatic capacity doubling when array is full |
| 16 | Exercise: Singly Linked List Insert | exercise | Singly Linked List | Implement insert at head, tail, and given position |
| 17 | Exercise: Stack Using Array | exercise | Stack, Array | Build a stack class backed by a fixed-size array |
| 18 | Exercise: Queue Using Linked List | exercise | Queue, Linked List | Implement a queue using singly linked list nodes |
| 19 | Exercise: BST Insert and Search | exercise | Binary Search Tree | Implement iterative insert and recursive search methods |
| 20 | Exercise: AVL Rotation | exercise | AVL Tree, Rotation | Implement single and double rotations to restore balance |
| 21 | Exercise: Heap Build | exercise | Heap | Build a min-heap from an unsorted array using heapify |
| 22 | Exercise: Level-Order Print | exercise | Level-Order Traversal | Print tree nodes level by level using a queue |
| 23 | Exercise: Trie Word Search | exercise | Trie | Insert words and search for prefix matches in a trie |
| 24 | Exercise: BFS Shortest Path | exercise | Breadth-First Search | Find shortest path in an unweighted graph using BFS |
| 25 | Exercise: DFS Connected Components | exercise | Depth-First Search | Count connected components in an undirected graph using DFS |
| 26 | Exercise: Hash Table with Chaining | exercise | Hash Table, Chaining | Implement a hash table using separate chaining for collisions |
| 27 | Exercise: Linear Probing Insert | exercise | Linear Probing | Implement insertion with linear probing collision resolution |
| 28 | Exercise: Cycle Detection Algorithm | exercise | Cycle Detection | Detect cycles in a directed graph using visited-state tracking |
| 29 | Exercise: Big-O Comparison | exercise | Big-O Notation, Amortized Analysis | Analyze and compare time complexities of given code snippets |

### References (4)

| # | Reference | Applies To (applies_in) | Description |
|---|----------|------------------------|-------------|
| 1 | Introduction to Algorithms (CLRS) | Time Complexity | Comprehensive textbook covering algorithms and complexity analysis |
| 2 | Algorithms by Robert Sedgewick | Graph | Practical algorithms textbook with Java implementations |
| 3 | VisuAlgo Online Visualizer | Binary Search Tree | Interactive web tool for visualizing data structure operations |
| 4 | Open Data Structures Textbook | Linked List | Free open-source textbook covering fundamental data structures |

### Analogies (4)

| # | Analogy | Analogous To (is_analogous_to) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Stack of Plates | Stack | Plates are added and removed from the top like LIFO |
| 2 | Family Tree as a Binary Tree | Binary Tree | Each person has at most two children like tree nodes |
| 3 | Library Card Catalog | Hash Table | A catalog maps titles to shelf locations like key-value pairs |
| 4 | Road Map as a Graph | Graph | Cities are vertices and roads are edges connecting them |

**Course Total: 107 nodes** (Concepts: 55 + Examples: 15 + Assessments: 29 + References: 4 + Analogies: 4)

---

## CS301: Algorithms — Node Inventory (Prof. Chen)

### Concepts (50)

| # | Concept | Parent (generalizes) | Description |
|---|---------|---------------------|-------------|
| 1 | Sorting Algorithm | — | A procedure that arranges elements in a defined order |
| 2 | Comparison Sort | Sorting Algorithm | Sorting method that relies on pairwise element comparisons |
| 3 | Non-Comparison Sort | Sorting Algorithm | Sorting method that avoids direct element comparisons |
| 4 | Bubble Sort | Comparison Sort | Repeatedly swaps adjacent elements until list is sorted |
| 5 | Selection Sort | Comparison Sort | Finds the minimum element and places it in position |
| 6 | Insertion Sort | Comparison Sort | Builds sorted output one element at a time |
| 7 | Merge Sort | Comparison Sort | Divides list in halves, sorts, and merges recursively |
| 8 | Quick Sort | Comparison Sort | Partitions around a pivot and sorts sub-arrays recursively |
| 9 | Heap Sort | Comparison Sort | Uses a binary heap to repeatedly extract the maximum |
| 10 | Radix Sort | Non-Comparison Sort | Sorts integers by processing individual digit positions |
| 11 | Counting Sort | Non-Comparison Sort | Counts element occurrences to determine sorted positions |
| 12 | Stability | Sorting Algorithm | Property preserving the relative order of equal elements |
| 13 | Search Algorithm | — | A procedure that locates a target within a data structure |
| 14 | Linear Search | Search Algorithm | Checks each element sequentially until target is found |
| 15 | Binary Search | Search Algorithm | Halves the search space repeatedly using sorted order |
| 16 | Interpolation Search | Search Algorithm | Estimates target position using value distribution |
| 17 | Graph Algorithm | — | An algorithm operating on graph-structured data |
| 18 | Shortest Path | Graph Algorithm | Finds the minimum-cost route between two vertices |
| 19 | Dijkstra's Algorithm | Shortest Path | Greedy approach for shortest paths with non-negative weights |
| 20 | Bellman-Ford Algorithm | Shortest Path | Handles negative edge weights via iterative relaxation |
| 21 | Floyd-Warshall Algorithm | Shortest Path | Computes all-pairs shortest paths using dynamic programming |
| 22 | Minimum Spanning Tree | Graph Algorithm | Connects all vertices with minimum total edge weight |
| 23 | Kruskal's Algorithm | Minimum Spanning Tree | Builds spanning tree by adding cheapest edges with union-find |
| 24 | Prim's Algorithm | Minimum Spanning Tree | Grows spanning tree from a single vertex greedily |
| 25 | Topological Sort | Graph Algorithm | Orders directed acyclic graph vertices by dependency |
| 26 | Dynamic Programming | — | Solves problems by combining solutions to overlapping subproblems |
| 27 | Memoization | Dynamic Programming | Caches computed results to avoid redundant recursive calls |
| 28 | Tabulation | Dynamic Programming | Fills a table bottom-up to solve subproblems iteratively |
| 29 | Overlapping Subproblems | Dynamic Programming | Property where subproblems recur across recursive decomposition |
| 30 | Knapsack Problem | Dynamic Programming | Maximizes value of items within a weight capacity |
| 31 | Longest Common Subsequence | Dynamic Programming | Finds the longest subsequence shared by two sequences |
| 32 | Edit Distance | Dynamic Programming | Counts minimum operations to transform one string into another |
| 33 | Greedy Algorithm | — | Makes locally optimal choices aiming for a global optimum |
| 34 | Activity Selection | Greedy Algorithm | Selects maximum non-overlapping activities from a schedule |
| 35 | Huffman Coding | Greedy Algorithm | Builds an optimal prefix-free code using character frequencies |
| 36 | Fractional Knapsack | Greedy Algorithm | Maximizes value by taking fractional item portions greedily |
| 37 | Greedy Choice Property | Greedy Algorithm | Guarantees local optimal choices lead to global optimum |
| 38 | Divide and Conquer | — | Splits a problem into independent subproblems solved recursively |
| 39 | Backtracking | — | Explores solution space and prunes invalid branches systematically |
| 40 | N-Queens Problem | Backtracking | Places N non-attacking queens on an N×N chessboard |
| 41 | Algorithm Analysis | — | Study of algorithm efficiency in time and space |
| 42 | Recurrence Relation | Algorithm Analysis | Equation defining runtime in terms of smaller inputs |
| 43 | Master Theorem | Recurrence Relation | Provides closed-form solutions for divide-and-conquer recurrences |
| 44 | Asymptotic Analysis | Algorithm Analysis | Describes algorithm growth rate as input size approaches infinity |
| 45 | Best Case | Asymptotic Analysis | Input arrangement yielding minimum possible running time |
| 46 | Average Case | Asymptotic Analysis | Expected running time over all possible inputs |
| 47 | Worst Case | Asymptotic Analysis | Input arrangement yielding maximum possible running time |
| 48 | Complexity Class | — | Category grouping problems by computational resource requirements |
| 49 | P Class | Complexity Class | Problems solvable in polynomial time by deterministic machines |
| 50 | NP Class | Complexity Class | Problems verifiable in polynomial time by deterministic machines |

### Examples (12)

| # | Example | Instantiates (is_instance_of) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Merge Sort on [38,27,43,3,9,82,10] | Merge Sort | Step-by-step divide-and-merge trace on seven elements |
| 2 | Quick Sort Partitioning on [5,3,8,4,2] | Quick Sort | Demonstrates Lomuto partition with pivot selection steps |
| 3 | Bubble Sort on [64,34,25,12,22,11,90] | Bubble Sort | Shows adjacent-swap passes until fully sorted |
| 4 | Dijkstra on Campus Map | Dijkstra's Algorithm | Finds shortest walking routes between campus buildings |
| 5 | BFS Traversal of Social Network | Graph Algorithm | Explores friend connections level by level in a graph |
| 6 | Binary Search in Phone Directory | Binary Search | Locates a name by repeatedly halving the directory |
| 7 | Knapsack with Camping Gear | Knapsack Problem | Selects gear items maximizing utility within weight limit |
| 8 | Huffman Coding on "ABRACADABRA" | Huffman Coding | Builds optimal prefix code tree for repeated-letter string |
| 9 | N-Queens on 8×8 Board | N-Queens Problem | Places eight non-attacking queens using systematic backtracking |
| 10 | Counting Sort on Exam Scores | Counting Sort | Sorts integer scores by counting occurrences within range |
| 11 | Prim's Algorithm on City Power Grid | Prim's Algorithm | Connects city blocks with minimum total cable length |
| 12 | Edit Distance: "kitten" to "sitting" | Edit Distance | Computes minimum operations transforming one word into another |

### Assessments (25)

| # | Assessment | Format | Applies To (applies_in) | Description |
|---|-----------|--------|------------------------|-------------|
| 1 | Quiz: Sorting Classification | quiz | Sorting Algorithm | Classify sorting algorithms as comparison-based vs non-comparison |
| 2 | Test: Merge Sort and Quick Sort | test | Merge Sort, Quick Sort | Compare divide-and-conquer sorting strategies and their complexities |
| 3 | Quiz: Stability in Sorting | quiz | Stability | Identify which sorting algorithms are stable and explain why |
| 4 | Test: Search Strategies | test | Binary Search, Linear Search | Compare sequential and divide-and-conquer search approaches |
| 5 | Quiz: Shortest Path Basics | quiz | Shortest Path | Trace shortest path computation on a small weighted graph |
| 6 | Test: Dijkstra vs Bellman-Ford | test | Dijkstra's Algorithm, Bellman-Ford Algorithm | Compare single-source shortest path algorithms and their constraints |
| 7 | Test: Spanning Tree Algorithms | test | Kruskal's Algorithm, Prim's Algorithm | Apply and compare MST construction strategies on sample graphs |
| 8 | Quiz: Memoization Concept | quiz | Memoization | Identify overlapping subproblems and apply memoization to avoid recomputation |
| 9 | Test: DP Table Construction | test | Tabulation, Overlapping Subproblems | Build bottom-up DP tables for knapsack and edit distance problems |
| 10 | Test: Greedy vs DP | test | Greedy Choice Property, Optimal Substructure | Determine when greedy works vs when DP is required |
| 11 | Quiz: Backtracking Pruning | quiz | Backtracking | Identify pruning conditions in N-Queens and subset-sum backtracking |
| 12 | Test: Complexity Classes | test | Best Case, Worst Case, Average Case | Analyze algorithms for all three complexity cases |
| 13 | Exercise: Implement Merge Sort | exercise | Merge Sort | Code a recursive merge sort in Python |
| 14 | Exercise: Implement Quick Sort | exercise | Quick Sort | Build quick sort with Lomuto partitioning scheme |
| 15 | Exercise: Implement Binary Search | exercise | Binary Search | Write iterative and recursive binary search variants |
| 16 | Exercise: Implement Dijkstra's Algorithm | exercise | Dijkstra's Algorithm | Code Dijkstra's shortest path using a priority queue |
| 17 | Exercise: Solve 0/1 Knapsack | exercise | Knapsack Problem | Solve knapsack using a dynamic programming table |
| 18 | Exercise: Implement Kruskal's Algorithm | exercise | Kruskal's Algorithm | Build minimum spanning tree with union-find structure |
| 19 | Exercise: Compute Edit Distance | exercise | Edit Distance | Calculate minimum edit distance between two strings |
| 20 | Exercise: Implement Huffman Coding | exercise | Huffman Coding | Build a Huffman tree and generate prefix codes |
| 21 | Exercise: Solve N-Queens | exercise | N-Queens Problem | Place N queens on a board using backtracking |
| 22 | Exercise: Implement Counting Sort | exercise | Counting Sort | Code counting sort for bounded integer arrays |
| 23 | Exercise: Derive Merge Sort Recurrence | exercise | Recurrence Relation | Write and solve the recurrence relation for merge sort |
| 24 | Exercise: Prove Greedy Choice Property | exercise | Greedy Choice Property | Prove optimality of greedy choice for activity selection |
| 25 | Exercise: Topological Sort | exercise | Topological Sort | Implement topological ordering using DFS on a DAG |

### References (4)

| # | Reference | Applies To (applies_in) | Description |
|---|----------|------------------------|-------------|
| 1 | CLRS: Introduction to Algorithms | Sorting Algorithm, Graph Algorithm, Dynamic Programming | Comprehensive textbook covering core algorithm design and analysis |
| 2 | The Algorithm Design Manual (Skiena) | Greedy Algorithm, Backtracking, Divide and Conquer | Practical guide emphasizing algorithm design techniques and heuristics |
| 3 | VisuAlgo Online Visualization | Sorting Algorithm, Graph Algorithm | Interactive web tool for visualizing algorithm execution steps |
| 4 | MIT OCW 6.006: Introduction to Algorithms | Algorithm Analysis, Complexity Class | Open lecture series covering foundational algorithm concepts |

### Analogies (4)

| # | Analogy | Analogous To (is_analogous_to) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Library Shelf as Binary Search | Binary Search | Finding a book by halving shelf sections mirrors binary search |
| 2 | Road Network as Graph Algorithm | Graph Algorithm | City roads and intersections model weighted graph traversal |
| 3 | Tournament Bracket as Heap Sort | Heap Sort | Elimination rounds mirror repeated heap extraction of maximum |
| 4 | Russian Dolls as Divide and Conquer | Divide and Conquer | Nested dolls illustrate recursive decomposition into subproblems |

**Course Total: 95 nodes** (Concepts: 50 + Examples: 12 + Assessments: 25 + References: 4 + Analogies: 4)

---

## CS302: OOP & Software Design — Node Inventory (Prof. Martinez)

### Concepts (44)

| # | Concept | Parent (generalizes) | Description |
|---|---------|---------------------|-------------|
| 1 | Encapsulation | — | Bundles data and methods while restricting direct access |
| 2 | Access Modifier | Encapsulation | Keywords controlling visibility of class members |
| 3 | Getter and Setter | Encapsulation | Methods providing controlled access to private fields |
| 4 | Inheritance | — | Mechanism for a class to acquire properties of another |
| 5 | Multiple Inheritance | Inheritance | A class inheriting behavior from two or more parents |
| 6 | Method Resolution Order | Multiple Inheritance | Algorithm determining which inherited method to invoke |
| 7 | Polymorphism | — | Ability of objects to respond differently to the same message |
| 8 | Method Overloading | Polymorphism | Defining multiple methods with the same name but different signatures |
| 9 | Method Overriding | Polymorphism | Subclass replaces an inherited method with its own implementation |
| 10 | Abstraction | — | Hides complex details and exposes only essential interfaces |
| 11 | Abstract Class | Abstraction | A class that cannot be instantiated and declares abstract methods |
| 12 | Interface | Abstraction | A contract specifying methods a class must implement |
| 13 | Single Responsibility Principle | — | A class should have only one reason to change |
| 14 | Open/Closed Principle | — | Software entities should be open for extension, closed for modification |
| 15 | Liskov Substitution Principle | — | Subtypes must be substitutable for their base types |
| 16 | Interface Segregation Principle | — | Clients should not depend on interfaces they do not use |
| 17 | Dependency Inversion Principle | — | High-level modules should depend on abstractions, not details |
| 18 | Design Pattern | — | Reusable solution template for common software design problems |
| 19 | Creational Pattern | Design Pattern | Patterns that abstract the object instantiation process |
| 20 | Singleton Pattern | Creational Pattern | Ensures a class has exactly one instance globally |
| 21 | Factory Pattern | Creational Pattern | Delegates object creation to a dedicated factory method |
| 22 | Behavioral Pattern | Design Pattern | Patterns defining communication between objects and responsibilities |
| 23 | Observer Pattern | Behavioral Pattern | Notifies dependent objects automatically when state changes |
| 24 | Strategy Pattern | Behavioral Pattern | Encapsulates interchangeable algorithms behind a common interface |
| 25 | Command Pattern | Behavioral Pattern | Encapsulates a request as an object for flexible execution |
| 26 | Structural Pattern | Design Pattern | Patterns composing classes and objects into larger structures |
| 27 | Decorator Pattern | Structural Pattern | Wraps an object to add behavior dynamically without subclassing |
| 28 | Adapter Pattern | Structural Pattern | Converts one interface into another that clients expect |
| 29 | MVC Pattern | Design Pattern | Separates application into model, view, and controller layers |
| 30 | UML Diagram | — | Standardized visual notation for modeling software systems |
| 31 | Class Diagram | UML Diagram | Shows classes, attributes, methods, and their relationships |
| 32 | Sequence Diagram | UML Diagram | Illustrates object interactions ordered by time sequence |
| 33 | Use Case Diagram | UML Diagram | Depicts system functionality from the user's perspective |
| 34 | Refactoring | — | Restructuring existing code without changing its external behavior |
| 35 | Code Smell | Refactoring | Symptom in code suggesting a deeper design problem |
| 36 | Extract Method | Refactoring | Pulls a code fragment into a separate named method |
| 37 | Replace Conditional with Polymorphism | Refactoring | Substitutes conditional logic with polymorphic method dispatch |
| 38 | God Class | Code Smell | A class that centralizes too many responsibilities |
| 39 | Feature Envy | Code Smell | A method that excessively uses data from another class |
| 40 | Unit Testing | — | Verifies individual components work correctly in isolation |
| 41 | Test-Driven Development | Unit Testing | Writes failing tests before implementing production code |
| 42 | Test Case | Unit Testing | A single scenario verifying one specific expected behavior |
| 43 | Mock Object | Unit Testing | Simulated object replacing real dependencies during testing |
| 44 | Assertion | Unit Testing | Statement verifying an expected condition holds true in tests |

### Examples (11)

| # | Example | Instantiates (is_instance_of) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Singleton Logger Implementation | Singleton Pattern | Ensures only one logger instance exists application-wide |
| 2 | Shape Factory with Polymorphic Creation | Factory Pattern | Creates circles, squares, and triangles via factory method |
| 3 | Event System with Observer | Observer Pattern | Notifies multiple listeners when application state changes |
| 4 | Payment Processing with Strategy | Strategy Pattern | Swaps payment methods at runtime without changing client code |
| 5 | Coffee Order with Decorators | Decorator Pattern | Wraps a base coffee with dynamic condiment additions |
| 6 | Legacy API Adapter | Adapter Pattern | Converts an old XML interface to modern JSON format |
| 7 | Todo App with MVC | MVC Pattern | Separates task data, display, and user interaction logic |
| 8 | Extract Method Refactoring Demo | Extract Method | Pulls duplicated logic into a reusable named method |
| 9 | Library System Class Diagram | Class Diagram | Models books, patrons, and loans with UML relationships |
| 10 | Conditional to Polymorphism Refactoring | Replace Conditional with Polymorphism | Replaces switch statement with polymorphic method dispatch |
| 11 | Service Test with Mock Objects | Mock Object | Tests service logic by substituting fake dependencies |

### Assessments (24)

| # | Assessment | Format | Applies To (applies_in) | Description |
|---|-----------|--------|------------------------|-------------|
| 1 | Quiz: Encapsulation Basics | quiz | Encapsulation | Identify proper use of access modifiers and data hiding |
| 2 | Test: Access Control Mechanisms | test | Access Modifier, Getter and Setter | Compare public, private, protected access and property patterns |
| 3 | Quiz: Inheritance Hierarchies | quiz | Inheritance | Trace method inheritance and identify is-a relationships |
| 4 | Test: MRO and Multiple Inheritance | test | Multiple Inheritance, Method Resolution Order | Predict method resolution in diamond inheritance scenarios |
| 5 | Quiz: Polymorphism Concepts | quiz | Polymorphism | Distinguish overloading from overriding with code examples |
| 6 | Test: SOLID — SRP and OCP | test | Single Responsibility Principle, Open/Closed Principle | Identify SRP violations and apply OCP through extension |
| 7 | Test: SOLID — LSP and DIP | test | Liskov Substitution Principle, Dependency Inversion Principle | Evaluate substitutability and dependency direction in class hierarchies |
| 8 | Quiz: Interface Segregation | quiz | Interface Segregation Principle | Identify fat interfaces and propose focused alternatives |
| 9 | Test: Creational Patterns | test | Singleton Pattern, Factory Pattern | Compare singleton and factory instantiation strategies |
| 10 | Test: Behavioral Patterns | test | Observer Pattern, Strategy Pattern | Apply observer and strategy patterns to given scenarios |
| 11 | Quiz: Structural Patterns | quiz | Decorator Pattern | Identify decorator wrapping patterns in code samples |
| 12 | Test: UML Reading | test | Class Diagram, Sequence Diagram | Interpret class and sequence diagrams and identify relationships |
| 13 | Exercise: Implement Singleton Pattern | exercise | Singleton Pattern | Build a thread-safe singleton class in Java |
| 14 | Exercise: Implement Factory Pattern | exercise | Factory Pattern | Create a shape factory with polymorphic creation logic |
| 15 | Exercise: Implement Observer Pattern | exercise | Observer Pattern | Build an event notification system with observers |
| 16 | Exercise: Implement Strategy Pattern | exercise | Strategy Pattern | Design interchangeable sorting strategies for a collection |
| 17 | Exercise: Implement Decorator Pattern | exercise | Decorator Pattern | Wrap a beverage class with dynamic condiment decorators |
| 18 | Exercise: Implement Adapter Pattern | exercise | Adapter Pattern | Adapt a legacy API to a modern interface contract |
| 19 | Exercise: Draw Class Diagram | exercise | Class Diagram | Create a UML class diagram for a library system |
| 20 | Exercise: Refactor God Class | exercise | God Class | Split a monolithic class into focused single-responsibility classes |
| 21 | Exercise: Write Unit Tests with Mocks | exercise | Mock Object | Test a service layer using mock dependencies |
| 22 | Exercise: Apply Liskov Substitution | exercise | Liskov Substitution Principle | Refactor a class hierarchy to satisfy LSP constraints |
| 23 | Exercise: Build MVC Calculator | exercise | MVC Pattern | Implement a calculator using model-view-controller separation |
| 24 | Exercise: Identify Code Smells | exercise | Code Smell | Find and categorize smells in a provided codebase |

### References (3)

| # | Reference | Applies To (applies_in) | Description |
|---|----------|------------------------|-------------|
| 1 | Design Patterns (Gang of Four) | Design Pattern, Creational Pattern, Behavioral Pattern, Structural Pattern | Definitive catalog of twenty-three object-oriented design patterns |
| 2 | Clean Code (Robert C. Martin) | Single Responsibility Principle, Code Smell, Refactoring | Guide to writing readable, maintainable, and clean code |
| 3 | Refactoring (Martin Fowler) | Refactoring, Extract Method, Code Smell | Systematic catalog of code refactoring techniques and motivations |

### Analogies (4)

| # | Analogy | Analogous To (is_analogous_to) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Power Adapter as Adapter Pattern | Adapter Pattern | A travel plug converter mirrors interface adaptation |
| 2 | Newspaper Subscription as Observer | Observer Pattern | Subscribers receive automatic updates when new issues publish |
| 3 | Vending Machine as Factory Pattern | Factory Pattern | Selecting a button produces a specific product type |
| 4 | Russian Nesting Dolls as Decorator | Decorator Pattern | Each outer doll layer adds decoration to the inner one |

**Course Total: 86 nodes** (Concepts: 44 + Examples: 11 + Assessments: 24 + References: 3 + Analogies: 4)

---

## CS401: Databases — Node Inventory (Prof. Lee)

### Concepts (38)

| # | Concept | Parent (generalizes) | Description |
|---|---------|---------------------|-------------|
| 1 | Relational Model | — | Mathematical framework for organizing data into relations |
| 2 | Table | Relational Model | A structured collection of rows and columns |
| 3 | Row | Table | A single record within a database table |
| 4 | Column | Table | A named attribute defining one field of a table |
| 5 | Primary Key | Table | Unique identifier for each row in a table |
| 6 | Foreign Key | Table | Column referencing a primary key in another table |
| 7 | Schema | Relational Model | Logical blueprint defining tables, columns, and constraints |
| 8 | SQL | — | Standard language for querying and managing relational databases |
| 9 | SELECT Statement | SQL | Command to retrieve data from one or more tables |
| 10 | WHERE Clause | SELECT Statement | Filter condition limiting which rows are returned |
| 11 | JOIN | SQL | Operation combining rows from two or more tables |
| 12 | Inner Join | JOIN | Returns only rows with matching values in both tables |
| 13 | Outer Join | JOIN | Returns matched rows plus unmatched rows from one or both tables |
| 14 | Cross Join | JOIN | Produces the Cartesian product of two tables |
| 15 | Subquery | SQL | A query nested inside another SQL statement |
| 16 | Aggregation | SQL | Functions that compute summary values over row groups |
| 17 | GROUP BY | Aggregation | Clause grouping rows sharing column values for aggregation |
| 18 | HAVING Clause | Aggregation | Filter applied to groups after aggregation is computed |
| 19 | Normalization | — | Process of organizing tables to reduce data redundancy |
| 20 | Functional Dependency | Normalization | Constraint where one attribute uniquely determines another |
| 21 | First Normal Form | Normalization | Requires all column values to be atomic and indivisible |
| 22 | Second Normal Form | Normalization | Eliminates partial dependencies on composite primary keys |
| 23 | Third Normal Form | Normalization | Removes transitive dependencies among non-key attributes |
| 24 | Boyce-Codd Normal Form | Normalization | Strengthened third normal form eliminating all redundancy anomalies |
| 25 | Transaction | — | Logical unit of work containing one or more operations |
| 26 | ACID Properties | Transaction | Atomicity, consistency, isolation, and durability guarantees for transactions |
| 27 | Concurrency Control | Transaction | Mechanisms ensuring correct execution of simultaneous transactions |
| 28 | Locking | Concurrency Control | Protocol restricting concurrent access to shared data resources |
| 29 | Isolation Level | Transaction | Degree to which concurrent transactions are separated from each other |
| 30 | Index | — | Data structure enabling fast lookup of table rows |
| 31 | B-Tree Index | Index | Balanced tree structure supporting efficient range and equality queries |
| 32 | Hash Index | Index | Hash-based structure optimized for exact-match lookups only |
| 33 | Composite Index | Index | Index spanning multiple columns for multi-attribute queries |
| 34 | Covering Index | Index | Index containing all columns needed to satisfy a query |
| 35 | NoSQL Database | — | Non-relational database designed for flexible or unstructured data |
| 36 | Document Store | NoSQL Database | NoSQL model storing data as self-describing JSON-like documents |
| 37 | Key-Value Store | NoSQL Database | Simplest NoSQL model mapping unique keys to values |
| 38 | ER Modeling | — | Technique for diagramming entities and their relationships |

### Examples (10)

| # | Example | Instantiates (is_instance_of) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Student Records Table | Table | Sample table storing student enrollment and grade data |
| 2 | Employee Salary Query | SELECT Statement | Query retrieving employee names and salaries from payroll table |
| 3 | Orders Filtered by Date | WHERE Clause | Query returning orders placed within a specific date range |
| 4 | Customer-Order Join | Inner Join | Joining customers and orders on matching customer ID |
| 5 | Products Without Sales | Outer Join | Left join showing all products including those never sold |
| 6 | Average Sales by Region | GROUP BY | Aggregating total and average sales grouped by region |
| 7 | Unnormalized Invoice Table | First Normal Form | Invoice table with repeating groups violating first normal form |
| 8 | Bank Transfer Transaction | Transaction | Atomic transfer debiting one account and crediting another |
| 9 | Username Lookup Index | B-Tree Index | B-tree index on username column for fast login queries |
| 10 | MongoDB User Profile | Document Store | User profile stored as a JSON document in MongoDB |

### Assessments (21)

| # | Assessment | Format | Applies To (applies_in) | Description |
|---|-----------|--------|------------------------|-------------|
| 1 | Quiz: Relational Model Basics | quiz | Relational Model | Identify tables, rows, columns, and key constraints |
| 2 | Test: Primary and Foreign Keys | test | Primary Key, Foreign Key | Define and enforce referential integrity between tables |
| 3 | Quiz: SELECT Fundamentals | quiz | SELECT Statement | Write basic SELECT queries with column selection and aliases |
| 4 | Test: JOIN Types | test | Inner Join, Outer Join, Cross Join | Choose and apply the correct join type for given scenarios |
| 5 | Quiz: Subquery Usage | quiz | Subquery | Identify when to use subqueries vs joins for filtering |
| 6 | Test: Aggregation and Grouping | test | GROUP BY, HAVING Clause | Write aggregation queries with grouping and having filters |
| 7 | Quiz: First Normal Form | quiz | First Normal Form | Identify repeating groups and convert to atomic values |
| 8 | Test: Normalization to 3NF | test | Second Normal Form, Third Normal Form | Decompose relations through successive normal forms |
| 9 | Test: ACID and Transactions | test | ACID Properties, Transaction | Identify ACID property violations in transaction scenarios |
| 10 | Quiz: Index Selection | quiz | B-Tree Index, Hash Index | Choose appropriate index type based on query patterns |
| 11 | Exercise: Write SELECT Query | exercise | SELECT Statement | Write queries to retrieve filtered data from a table |
| 12 | Exercise: Compose Inner Join | exercise | Inner Join | Join two tables and return only matching rows |
| 13 | Exercise: Write Subquery | exercise | Subquery | Nest a query inside a SELECT to filter results |
| 14 | Exercise: Apply GROUP BY | exercise | GROUP BY | Group rows and compute aggregate values per group |
| 15 | Exercise: Normalize to 3NF | exercise | Third Normal Form | Decompose an unnormalized table into third normal form |
| 16 | Exercise: Identify Functional Dependencies | exercise | Functional Dependency | Determine functional dependencies from a given relation schema |
| 17 | Exercise: Create B-Tree Index | exercise | B-Tree Index | Define a B-tree index and explain its query performance benefit |
| 18 | Exercise: Design ER Diagram | exercise | ER Modeling | Draw an ER diagram for a university registration system |
| 19 | Exercise: Write Transaction | exercise | Transaction | Write a multi-statement transaction with commit and rollback |
| 20 | Exercise: Implement Foreign Key | exercise | Foreign Key | Add foreign key constraints enforcing referential integrity between tables |
| 21 | Exercise: NoSQL Document Query | exercise | Document Store | Query and filter documents in a MongoDB collection |

### References (4)

| # | Reference | Applies To (applies_in) | Description |
|---|----------|------------------------|-------------|
| 1 | PostgreSQL Official Documentation | SQL | Comprehensive reference for PostgreSQL SQL syntax and features |
| 2 | Database System Concepts (Silberschatz) | Relational Model | Standard textbook covering relational database theory and practice |
| 3 | MongoDB Documentation | NoSQL Database | Official guide for MongoDB document store operations and design |
| 4 | Use The Index, Luke (Web Guide) | Index | Practical web resource explaining SQL indexing and performance |

### Analogies (3)

| # | Analogy | Analogous To (is_analogous_to) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Spreadsheet as a Table | Table | Spreadsheet rows and columns mirror database table structure |
| 2 | Library Card Catalog as an Index | Index | Card catalog enables fast book lookup like a database index |
| 3 | Filing Cabinet as a Schema | Schema | Cabinet drawer labels organize contents like schema organizes tables |

**Course Total: 76 nodes** (Concepts: 38 + Examples: 10 + Assessments: 21 + References: 4 + Analogies: 3)

---

## CS402: Operating Systems — Node Inventory (Prof. Lee)

### Concepts (32)

| # | Concept | Parent (generalizes) | Description |
|---|---------|---------------------|-------------|
| 1 | Process | — | An executing program instance with its own address space |
| 2 | Thread | Process | Lightweight execution unit sharing a process address space |
| 3 | Process State | Process | Current status of a process such as ready or running |
| 4 | Context Switch | Process | Saving and restoring CPU state when switching between processes |
| 5 | CPU Scheduling | — | Policy determining which process runs on the CPU next |
| 6 | First-Come First-Served | CPU Scheduling | Scheduling algorithm processing jobs in arrival order |
| 7 | Shortest Job First | CPU Scheduling | Scheduling algorithm selecting the job with smallest burst time |
| 8 | Round Robin | CPU Scheduling | Preemptive scheduling assigning equal time slices to each process |
| 9 | Priority Scheduling | CPU Scheduling | Scheduling algorithm selecting the highest-priority process first |
| 10 | Synchronization | — | Coordinating concurrent threads to prevent data corruption |
| 11 | Mutex | Synchronization | Lock allowing only one thread into a critical section |
| 12 | Semaphore | Synchronization | Counter-based signaling mechanism controlling concurrent resource access |
| 13 | Monitor | Synchronization | High-level construct combining mutual exclusion with condition variables |
| 14 | Deadlock | Synchronization | State where processes block forever waiting for each other |
| 15 | Race Condition | Synchronization | Bug arising when output depends on uncontrolled execution ordering |
| 16 | Critical Section | Synchronization | Code segment accessing shared resources requiring mutual exclusion |
| 17 | Virtual Memory | — | Abstraction giving each process its own large address space |
| 18 | Paging | Virtual Memory | Dividing memory into fixed-size pages mapped via page tables |
| 19 | Page Table | Paging | Data structure mapping virtual page numbers to physical frames |
| 20 | Segmentation | Virtual Memory | Dividing memory into variable-size logical segments per program |
| 21 | Page Replacement | Paging | Algorithm choosing which page to evict when memory is full |
| 22 | FIFO Page Replacement | Page Replacement | Evicts the oldest loaded page first regardless of usage |
| 23 | LRU Page Replacement | Page Replacement | Evicts the page that has not been used most recently |
| 24 | TLB | Paging | Hardware cache speeding up virtual-to-physical address translation |
| 25 | File System | — | Software layer organizing persistent storage into files and directories |
| 26 | File | File System | Named sequence of bytes stored on persistent media |
| 27 | Directory | File System | Container organizing files and subdirectories into a hierarchy |
| 28 | Inode | File System | Metadata structure storing file attributes and block pointers |
| 29 | Device Driver | — | Software module enabling the OS to communicate with hardware |
| 30 | Interrupt | — | Signal from hardware or software requesting immediate CPU attention |
| 31 | DMA | — | Hardware mechanism transferring data without CPU involvement |
| 32 | Access Control | — | Mechanism restricting who can read, write, or execute resources |

### Examples (8)

| # | Example | Instantiates (is_instance_of) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Chrome Browser Tabs | Thread | Each browser tab runs as a separate thread in Chrome |
| 2 | Linux Process Lifecycle | Process State | Process transitions through new, ready, running, and terminated states |
| 3 | Round Robin Time Slice Demo | Round Robin | Three processes cycling through ten-millisecond time quantum slices |
| 4 | Dining Philosophers Problem | Deadlock | Classic scenario illustrating deadlock among competing resource holders |
| 5 | Virtual Address Translation | Page Table | Translating a virtual address to a physical frame using page table |
| 6 | LRU Page Eviction Trace | LRU Page Replacement | Step-by-step trace showing LRU evictions on a reference string |
| 7 | Unix Inode Structure | Inode | Inode storing ownership, permissions, and data block pointers in Unix |
| 8 | Keyboard Interrupt Handling | Interrupt | Hardware interrupt triggered by a keystroke invoking the driver |

### Assessments (19)

| # | Assessment | Format | Applies To (applies_in) | Description |
|---|-----------|--------|------------------------|-------------|
| 1 | Quiz: Process Basics | quiz | Process | Identify process states and transitions in a lifecycle diagram |
| 2 | Test: Threads vs Processes | test | Thread, Process | Compare thread and process isolation, creation cost, and sharing |
| 3 | Quiz: Context Switch Mechanics | quiz | Context Switch | Describe what is saved and restored during a context switch |
| 4 | Test: Scheduling Algorithms | test | First-Come First-Served, Shortest Job First, Round Robin | Compute turnaround and waiting times for three scheduling policies |
| 5 | Quiz: Priority Scheduling | quiz | Priority Scheduling | Identify starvation risk and aging solutions in priority scheduling |
| 6 | Test: Synchronization Primitives | test | Mutex, Semaphore | Compare mutex and semaphore usage in producer-consumer scenarios |
| 7 | Quiz: Deadlock Conditions | quiz | Deadlock | Identify the four necessary conditions for deadlock |
| 8 | Test: Virtual Memory Concepts | test | Paging, Segmentation | Compare paging and segmentation approaches to virtual memory |
| 9 | Quiz: Page Replacement | quiz | LRU Page Replacement | Trace LRU replacement and count page faults on a reference string |
| 10 | Quiz: File System Basics | quiz | File System | Match file system components (inode, directory, file) to their roles |
| 11 | Exercise: Simulate Context Switch | exercise | Context Switch | Trace register save and restore during a process context switch |
| 12 | Exercise: Implement Round Robin | exercise | Round Robin | Simulate round robin scheduling for a set of process bursts |
| 13 | Exercise: Solve Deadlock Scenario | exercise | Deadlock | Analyze a resource allocation graph and resolve the deadlock |
| 14 | Exercise: Use Semaphore | exercise | Semaphore | Implement producer-consumer synchronization using semaphores |
| 15 | Exercise: Calculate Page Table Size | exercise | Page Table | Compute page table entries and memory overhead for given parameters |
| 16 | Exercise: Simulate LRU Replacement | exercise | LRU Page Replacement | Trace LRU page replacements and count page faults for a reference string |
| 17 | Exercise: Traverse Directory Tree | exercise | Directory | Write pseudocode to recursively list all files in a directory tree |
| 18 | Exercise: Write Device Driver Stub | exercise | Device Driver | Implement a minimal device driver skeleton with read and write functions |
| 19 | Exercise: Race Condition Demo | exercise | Race Condition | Demonstrate and fix a race condition using mutex protection |

### References (3)

| # | Reference | Applies To (applies_in) | Description |
|---|----------|------------------------|-------------|
| 1 | Operating System Concepts (Silberschatz) | Process | Standard textbook covering OS theory and design principles |
| 2 | Linux Kernel Documentation | File System | Official documentation for Linux kernel subsystems and file systems |
| 3 | POSIX Standard Reference | Thread | Specification defining portable OS interfaces for thread and process APIs |

### Analogies (3)

| # | Analogy | Analogous To (is_analogous_to) | Description |
|---|---------|-------------------------------|-------------|
| 1 | Factory Workers as Threads | Thread | Workers sharing a factory floor mirror threads sharing process memory |
| 2 | Book Index as a Page Table | Page Table | Book index maps topics to pages like page table maps addresses |
| 3 | Traffic Signal as a Mutex | Mutex | Traffic signal grants one direction access like a mutex lock |

**Course Total: 65 nodes** (Concepts: 32 + Examples: 8 + Assessments: 19 + References: 3 + Analogies: 3)

---

## Shared Principles (Cross-Course)

| # | Principle | Demonstrated By (courses) | Description |
|---|----------|--------------------------|-------------|
| 1 | DRY (Don't Repeat Yourself) | CS101, CS302 | Eliminate duplication by extracting reusable abstractions |
| 2 | KISS (Keep It Simple) | CS101, CS302, CS301 | Prefer the simplest solution that correctly solves the problem |
| 3 | Separation of Concerns | CS302, CS401, CS402 | Divide system into distinct sections each addressing one concern |
| 4 | Abstraction | CS101, CS201, CS302, CS402 | Hide complexity behind simplified interfaces exposing only essentials |
| 5 | Divide and Conquer | CS201, CS301 | Break a problem into independent subproblems solved recursively |
| 6 | Modularity | CS101, CS302, CS401 | Organize software into self-contained interchangeable modules |
| 7 | Information Hiding | CS302, CS402 | Conceal internal implementation details behind stable interfaces |
| 8 | Defensive Programming | CS101, CS302, CS401 | Validate inputs and anticipate failures to prevent unexpected behavior |
| 9 | Immutability | CS101, CS201 | Avoid modifying data after creation to prevent side effects |
| 10 | Time-Space Trade-off | CS201, CS301, CS401 | Balance memory usage against computation speed for optimal performance |
| 11 | Locality of Reference | CS201, CS402 | Programs tend to access nearby memory addresses in short time spans |
| 12 | Invariant Maintenance | CS201, CS301 | Preserve logical conditions that must hold true throughout execution |
| 13 | Optimal Substructure | CS301, CS201 | Optimal solution contains optimal solutions to its subproblems |
| 14 | Fail Fast | CS101, CS302, CS401 | Detect and report errors immediately at the point of occurrence |
| 15 | Data Integrity | CS401, CS302 | Ensure data remains accurate, consistent, and uncorrupted over time |
| 16 | Least Privilege | CS402, CS401 | Grant only the minimum permissions necessary for a task |
| 17 | Determinism | CS301, CS402 | Same inputs always produce the same outputs and behavior |
| 18 | Idempotency | CS401, CS301 | Repeated application of an operation yields the same result |
| 19 | Composition over Inheritance | CS302, CS101 | Build behavior by combining objects rather than extending class hierarchies |
| 20 | Loose Coupling | CS302, CS401 | Minimize dependencies between modules for independent changeability |
| 21 | High Cohesion | CS302, CS401 | Keep related functionality together within a single focused module |
| 22 | Principle of Least Astonishment | CS101, CS302 | Design interfaces so behavior matches user expectations naturally |

**Shared Principles Total: 22 nodes**

---

## Grand Total

| Course | Concepts | Examples | Assessments (quiz/test/exercise) | References | Analogies | Total |
|--------|----------|----------|----------------------------------|------------|-----------|-------|
| CS101 | 55 | 15 | 30 (7q / 8t / 15x) | 4 | 4 | 108 |
| CS201 | 55 | 15 | 29 (5q / 9t / 15x) | 4 | 4 | 107 |
| CS301 | 50 | 12 | 25 (5q / 7t / 13x) | 4 | 4 | 95 |
| CS302 | 44 | 11 | 24 (5q / 7t / 12x) | 3 | 4 | 86 |
| CS401 | 38 | 10 | 21 (5q / 5t / 11x) | 4 | 3 | 76 |
| CS402 | 32 | 8 | 19 (5q / 5t / 9x) | 3 | 3 | 65 |
| **Subtotal** | **274** | **71** | **148** (32q / 41t / 75x) | **22** | **22** | **537** |
| Shared Principles | — | — | — | — | — | 22 |
| **Grand Total** | | | | | | **559** |

### Assessment Format Key
- **quiz (q)**: Mastery check for 1 concept — focused knowledge verification
- **test (t)**: Mastery check for 2-3 concept cluster — integration understanding
- **exercise (x)**: Practice problem — hands-on skill building

