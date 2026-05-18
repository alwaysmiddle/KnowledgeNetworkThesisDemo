import type { KnowledgeGraph } from '../types'

export const mockGraph: KnowledgeGraph = {
  nodes: [
    // ── Departments (3) ───────────────────────────────────────────────────────
    { id: 'dept-cs',   label: 'Computer Science', type: 'Department' },
    { id: 'dept-math', label: 'Mathematics',       type: 'Department' },
    { id: 'dept-phys', label: 'Physics',           type: 'Department' },

    // ── Professors (6) ────────────────────────────────────────────────────────
    { id: 'prof-alice', label: 'Prof. Alice', type: 'Professor', metadata: { dept: 'cs'   } },
    { id: 'prof-bob',   label: 'Prof. Bob',   type: 'Professor', metadata: { dept: 'cs'   } },
    { id: 'prof-carol', label: 'Prof. Carol', type: 'Professor', metadata: { dept: 'math' } },
    { id: 'prof-dave',  label: 'Prof. Dave',  type: 'Professor', metadata: { dept: 'math' } },
    { id: 'prof-eve',   label: 'Prof. Eve',   type: 'Professor', metadata: { dept: 'phys' } },
    { id: 'prof-frank', label: 'Prof. Frank', type: 'Professor', metadata: { dept: 'phys' } },

    // ── Courses (8) ───────────────────────────────────────────────────────────
    { id: 'course-algo',     label: 'Algorithms',        type: 'Course' },
    { id: 'course-ml',       label: 'Machine Learning',  type: 'Course' },
    { id: 'course-db',       label: 'Databases',         type: 'Course' },
    { id: 'course-calculus', label: 'Calculus',          type: 'Course' },
    { id: 'course-linalg',   label: 'Linear Algebra',    type: 'Course' },
    { id: 'course-stats',    label: 'Statistics',        type: 'Course' },
    { id: 'course-quantum',  label: 'Quantum Mechanics', type: 'Course' },
    { id: 'course-thermo',   label: 'Thermodynamics',    type: 'Course' },

    // ── Students (12) ─────────────────────────────────────────────────────────
    { id: 'stu-1',  label: 'Alice S.',  type: 'Student' },
    { id: 'stu-2',  label: 'Bob S.',    type: 'Student' },
    { id: 'stu-3',  label: 'Carol S.',  type: 'Student' },
    { id: 'stu-4',  label: 'Dave S.',   type: 'Student' },
    { id: 'stu-5',  label: 'Eve S.',    type: 'Student' },
    { id: 'stu-6',  label: 'Frank S.',  type: 'Student' },
    { id: 'stu-7',  label: 'Grace S.',  type: 'Student' },
    { id: 'stu-8',  label: 'Hank S.',   type: 'Student' },
    { id: 'stu-9',  label: 'Iris S.',   type: 'Student' },
    { id: 'stu-10', label: 'Jack S.',   type: 'Student' },
    { id: 'stu-11', label: 'Kate S.',   type: 'Student' },
    { id: 'stu-12', label: 'Leo S.',    type: 'Student' },

    // ── Subtopics (48) ────────────────────────────────────────────────────────
    // Algorithms (6)
    { id: 'sub-algo-sort',       label: 'Sorting Algs',       type: 'Subtopic' },
    { id: 'sub-algo-graph',      label: 'Graph Traversal',    type: 'Subtopic' },
    { id: 'sub-algo-dp',         label: 'Dynamic Prog.',      type: 'Subtopic' },
    { id: 'sub-algo-greedy',     label: 'Greedy Algs',        type: 'Subtopic' },
    { id: 'sub-algo-complexity', label: 'Complexity Theory',  type: 'Subtopic' },
    { id: 'sub-algo-trees',      label: 'Tree Algorithms',    type: 'Subtopic' },

    // Machine Learning (7)
    { id: 'sub-ml-linreg',   label: 'Linear Regression',      type: 'Subtopic' },
    { id: 'sub-ml-nn',       label: 'Neural Networks',         type: 'Subtopic' },
    { id: 'sub-ml-trees',    label: 'Decision Trees',          type: 'Subtopic' },
    { id: 'sub-ml-cluster',  label: 'Clustering',              type: 'Subtopic' },
    { id: 'sub-ml-features', label: 'Feature Engineering',     type: 'Subtopic' },
    { id: 'sub-ml-eval',     label: 'Model Evaluation',        type: 'Subtopic' },
    { id: 'sub-ml-rl',       label: 'Reinforcement Learning',  type: 'Subtopic' },

    // Databases (5)
    { id: 'sub-db-sql',   label: 'SQL Basics',    type: 'Subtopic' },
    { id: 'sub-db-norm',  label: 'Normalization', type: 'Subtopic' },
    { id: 'sub-db-index', label: 'Indexing',      type: 'Subtopic' },
    { id: 'sub-db-tx',    label: 'Transactions',  type: 'Subtopic' },
    { id: 'sub-db-nosql', label: 'NoSQL Systems', type: 'Subtopic' },

    // Calculus (6)
    { id: 'sub-calc-limits', label: 'Limits & Continuity', type: 'Subtopic' },
    { id: 'sub-calc-deriv',  label: 'Derivatives',         type: 'Subtopic' },
    { id: 'sub-calc-integ',  label: 'Integration',         type: 'Subtopic' },
    { id: 'sub-calc-series', label: 'Series & Sequences',  type: 'Subtopic' },
    { id: 'sub-calc-multi',  label: 'Multivariable Calc',  type: 'Subtopic' },
    { id: 'sub-calc-diffeq', label: 'Diff. Equations',     type: 'Subtopic' },

    // Linear Algebra (5)
    { id: 'sub-linalg-vectors',   label: 'Vectors & Matrices',  type: 'Subtopic' },
    { id: 'sub-linalg-eigen',     label: 'Eigenvalues',         type: 'Subtopic' },
    { id: 'sub-linalg-transform', label: 'Linear Transforms',   type: 'Subtopic' },
    { id: 'sub-linalg-spaces',    label: 'Vector Spaces',       type: 'Subtopic' },
    { id: 'sub-linalg-decomp',    label: 'Matrix Decomp.',      type: 'Subtopic' },

    // Statistics (6)
    { id: 'sub-stats-prob',  label: 'Probability Theory',   type: 'Subtopic' },
    { id: 'sub-stats-dist',  label: 'Distributions',        type: 'Subtopic' },
    { id: 'sub-stats-hypo',  label: 'Hypothesis Testing',   type: 'Subtopic' },
    { id: 'sub-stats-reg',   label: 'Regression Analysis',  type: 'Subtopic' },
    { id: 'sub-stats-bayes', label: 'Bayesian Stats',       type: 'Subtopic' },
    { id: 'sub-stats-inf',   label: 'Statistical Inference', type: 'Subtopic' },

    // Quantum Mechanics (7)
    { id: 'sub-quantum-wave',     label: 'Wave Functions',       type: 'Subtopic' },
    { id: 'sub-quantum-schrod',   label: 'Schrödinger Eq.',      type: 'Subtopic' },
    { id: 'sub-quantum-states',   label: 'Quantum States',       type: 'Subtopic' },
    { id: 'sub-quantum-uncert',   label: 'Uncertainty Principle', type: 'Subtopic' },
    { id: 'sub-quantum-spin',     label: 'Spin & Angular Mom.',  type: 'Subtopic' },
    { id: 'sub-quantum-entangle', label: 'Entanglement',         type: 'Subtopic' },
    { id: 'sub-quantum-measure',  label: 'Measurement Problem',  type: 'Subtopic' },

    // Thermodynamics (6)
    { id: 'sub-thermo-laws',     label: 'Laws of Thermo.',    type: 'Subtopic' },
    { id: 'sub-thermo-entropy',  label: 'Entropy',            type: 'Subtopic' },
    { id: 'sub-thermo-engines',  label: 'Heat Engines',       type: 'Subtopic' },
    { id: 'sub-thermo-phase',    label: 'Phase Transitions',  type: 'Subtopic' },
    { id: 'sub-thermo-statmech', label: 'Statistical Mech.',  type: 'Subtopic' },
    { id: 'sub-thermo-chem',     label: 'Chemical Thermo.',   type: 'Subtopic' },
  ],

  edges: [
    // ── Department → Professor (has_faculty) ──────────────────────────────────
    { id: 'e-cs-hf-alice',   source: 'dept-cs',   target: 'prof-alice', relationship: 'has_faculty', inverseRelationship: 'member_of_faculty' },
    { id: 'e-cs-hf-bob',     source: 'dept-cs',   target: 'prof-bob',   relationship: 'has_faculty', inverseRelationship: 'member_of_faculty' },
    { id: 'e-math-hf-carol', source: 'dept-math', target: 'prof-carol', relationship: 'has_faculty', inverseRelationship: 'member_of_faculty' },
    { id: 'e-math-hf-dave',  source: 'dept-math', target: 'prof-dave',  relationship: 'has_faculty', inverseRelationship: 'member_of_faculty' },
    { id: 'e-phys-hf-eve',   source: 'dept-phys', target: 'prof-eve',   relationship: 'has_faculty', inverseRelationship: 'member_of_faculty' },
    { id: 'e-phys-hf-frank', source: 'dept-phys', target: 'prof-frank', relationship: 'has_faculty', inverseRelationship: 'member_of_faculty' },

    // ── Professor → Course (teaches) ──────────────────────────────────────────
    { id: 'e-alice-t-algo',     source: 'prof-alice', target: 'course-algo',     relationship: 'teaches', inverseRelationship: 'taught_by' },
    { id: 'e-alice-t-ml',       source: 'prof-alice', target: 'course-ml',       relationship: 'teaches', inverseRelationship: 'taught_by' },
    { id: 'e-bob-t-db',         source: 'prof-bob',   target: 'course-db',       relationship: 'teaches', inverseRelationship: 'taught_by' },
    { id: 'e-carol-t-calculus', source: 'prof-carol', target: 'course-calculus', relationship: 'teaches', inverseRelationship: 'taught_by' },
    { id: 'e-carol-t-linalg',   source: 'prof-carol', target: 'course-linalg',   relationship: 'teaches', inverseRelationship: 'taught_by' },
    { id: 'e-dave-t-stats',     source: 'prof-dave',  target: 'course-stats',    relationship: 'teaches', inverseRelationship: 'taught_by' },
    { id: 'e-eve-t-quantum',    source: 'prof-eve',   target: 'course-quantum',  relationship: 'teaches', inverseRelationship: 'taught_by' },
    { id: 'e-frank-t-thermo',   source: 'prof-frank', target: 'course-thermo',   relationship: 'teaches', inverseRelationship: 'taught_by' },

    // ── Course → Student (has_enrollment) ─────────────────────────────────────
    { id: 'e-algo-he-s1',     source: 'course-algo',     target: 'stu-1',  relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-algo-he-s2',     source: 'course-algo',     target: 'stu-2',  relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-ml-he-s3',       source: 'course-ml',       target: 'stu-3',  relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-ml-he-s4',       source: 'course-ml',       target: 'stu-4',  relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-db-he-s5',       source: 'course-db',       target: 'stu-5',  relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-calculus-he-s6', source: 'course-calculus', target: 'stu-6',  relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-calculus-he-s7', source: 'course-calculus', target: 'stu-7',  relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-linalg-he-s8',   source: 'course-linalg',   target: 'stu-8',  relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-stats-he-s9',    source: 'course-stats',    target: 'stu-9',  relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-quantum-he-s10', source: 'course-quantum',  target: 'stu-10', relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-quantum-he-s11', source: 'course-quantum',  target: 'stu-11', relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },
    { id: 'e-thermo-he-s12',  source: 'course-thermo',   target: 'stu-12', relationship: 'has_enrollment', inverseRelationship: 'enrolled_in' },

    // ── Professor ↔ Professor (collaborates_with) ─────────────────────────────
    { id: 'e-alice-cw-carol', source: 'prof-alice', target: 'prof-carol', relationship: 'collaborates_with', inverseRelationship: 'collaborates_with' },
    { id: 'e-dave-cw-eve',    source: 'prof-dave',  target: 'prof-eve',   relationship: 'collaborates_with', inverseRelationship: 'collaborates_with' },
    { id: 'e-bob-cw-frank',   source: 'prof-bob',   target: 'prof-frank', relationship: 'collaborates_with', inverseRelationship: 'collaborates_with' },

    // ── Course → Subtopic (has_subtopic) ──────────────────────────────────────
    // Algorithms
    { id: 'e-algo-hs-sort',       source: 'course-algo', target: 'sub-algo-sort',       relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-algo-hs-graph',      source: 'course-algo', target: 'sub-algo-graph',      relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-algo-hs-dp',         source: 'course-algo', target: 'sub-algo-dp',         relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-algo-hs-greedy',     source: 'course-algo', target: 'sub-algo-greedy',     relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-algo-hs-complexity', source: 'course-algo', target: 'sub-algo-complexity', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-algo-hs-trees',      source: 'course-algo', target: 'sub-algo-trees',      relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    // Machine Learning
    { id: 'e-ml-hs-linreg',   source: 'course-ml', target: 'sub-ml-linreg',   relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-ml-hs-nn',       source: 'course-ml', target: 'sub-ml-nn',       relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-ml-hs-trees',    source: 'course-ml', target: 'sub-ml-trees',    relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-ml-hs-cluster',  source: 'course-ml', target: 'sub-ml-cluster',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-ml-hs-features', source: 'course-ml', target: 'sub-ml-features', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-ml-hs-eval',     source: 'course-ml', target: 'sub-ml-eval',     relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-ml-hs-rl',       source: 'course-ml', target: 'sub-ml-rl',       relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    // Databases
    { id: 'e-db-hs-sql',   source: 'course-db', target: 'sub-db-sql',   relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-db-hs-norm',  source: 'course-db', target: 'sub-db-norm',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-db-hs-index', source: 'course-db', target: 'sub-db-index', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-db-hs-tx',    source: 'course-db', target: 'sub-db-tx',    relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-db-hs-nosql', source: 'course-db', target: 'sub-db-nosql', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    // Calculus
    { id: 'e-calc-hs-limits', source: 'course-calculus', target: 'sub-calc-limits', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-calc-hs-deriv',  source: 'course-calculus', target: 'sub-calc-deriv',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-calc-hs-integ',  source: 'course-calculus', target: 'sub-calc-integ',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-calc-hs-series', source: 'course-calculus', target: 'sub-calc-series', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-calc-hs-multi',  source: 'course-calculus', target: 'sub-calc-multi',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-calc-hs-diffeq', source: 'course-calculus', target: 'sub-calc-diffeq', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    // Linear Algebra
    { id: 'e-linalg-hs-vectors',   source: 'course-linalg', target: 'sub-linalg-vectors',   relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-linalg-hs-eigen',     source: 'course-linalg', target: 'sub-linalg-eigen',     relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-linalg-hs-transform', source: 'course-linalg', target: 'sub-linalg-transform', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-linalg-hs-spaces',    source: 'course-linalg', target: 'sub-linalg-spaces',    relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-linalg-hs-decomp',    source: 'course-linalg', target: 'sub-linalg-decomp',    relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    // Statistics
    { id: 'e-stats-hs-prob',  source: 'course-stats', target: 'sub-stats-prob',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-stats-hs-dist',  source: 'course-stats', target: 'sub-stats-dist',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-stats-hs-hypo',  source: 'course-stats', target: 'sub-stats-hypo',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-stats-hs-reg',   source: 'course-stats', target: 'sub-stats-reg',   relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-stats-hs-bayes', source: 'course-stats', target: 'sub-stats-bayes', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-stats-hs-inf',   source: 'course-stats', target: 'sub-stats-inf',   relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    // Quantum Mechanics
    { id: 'e-quantum-hs-wave',     source: 'course-quantum', target: 'sub-quantum-wave',     relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-quantum-hs-schrod',   source: 'course-quantum', target: 'sub-quantum-schrod',   relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-quantum-hs-states',   source: 'course-quantum', target: 'sub-quantum-states',   relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-quantum-hs-uncert',   source: 'course-quantum', target: 'sub-quantum-uncert',   relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-quantum-hs-spin',     source: 'course-quantum', target: 'sub-quantum-spin',     relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-quantum-hs-entangle', source: 'course-quantum', target: 'sub-quantum-entangle', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-quantum-hs-measure',  source: 'course-quantum', target: 'sub-quantum-measure',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    // Thermodynamics
    { id: 'e-thermo-hs-laws',     source: 'course-thermo', target: 'sub-thermo-laws',     relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-thermo-hs-entropy',  source: 'course-thermo', target: 'sub-thermo-entropy',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-thermo-hs-engines',  source: 'course-thermo', target: 'sub-thermo-engines',  relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-thermo-hs-phase',    source: 'course-thermo', target: 'sub-thermo-phase',    relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-thermo-hs-statmech', source: 'course-thermo', target: 'sub-thermo-statmech', relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },
    { id: 'e-thermo-hs-chem',     source: 'course-thermo', target: 'sub-thermo-chem',     relationship: 'has_subtopic', inverseRelationship: 'subtopic_of' },

    // ── Student → Subtopic (grade: A / B / C / D / F) ────────────────────────
    // stu-1 (Algorithms)
    { id: 'g-s1-sort',       source: 'stu-1', target: 'sub-algo-sort',       relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s1-graph',      source: 'stu-1', target: 'sub-algo-graph',      relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s1-dp',         source: 'stu-1', target: 'sub-algo-dp',         relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s1-greedy',     source: 'stu-1', target: 'sub-algo-greedy',     relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s1-complexity', source: 'stu-1', target: 'sub-algo-complexity', relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s1-trees',      source: 'stu-1', target: 'sub-algo-trees',      relationship: 'A', inverseRelationship: 'grade_received' },
    // stu-2 (Algorithms)
    { id: 'g-s2-sort',       source: 'stu-2', target: 'sub-algo-sort',       relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s2-graph',      source: 'stu-2', target: 'sub-algo-graph',      relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s2-dp',         source: 'stu-2', target: 'sub-algo-dp',         relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s2-greedy',     source: 'stu-2', target: 'sub-algo-greedy',     relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s2-complexity', source: 'stu-2', target: 'sub-algo-complexity', relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s2-trees',      source: 'stu-2', target: 'sub-algo-trees',      relationship: 'C', inverseRelationship: 'grade_received' },
    // stu-3 (Machine Learning)
    { id: 'g-s3-linreg',   source: 'stu-3', target: 'sub-ml-linreg',   relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s3-nn',       source: 'stu-3', target: 'sub-ml-nn',       relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s3-trees',    source: 'stu-3', target: 'sub-ml-trees',    relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s3-cluster',  source: 'stu-3', target: 'sub-ml-cluster',  relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s3-features', source: 'stu-3', target: 'sub-ml-features', relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s3-eval',     source: 'stu-3', target: 'sub-ml-eval',     relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s3-rl',       source: 'stu-3', target: 'sub-ml-rl',       relationship: 'B', inverseRelationship: 'grade_received' },
    // stu-4 (Machine Learning)
    { id: 'g-s4-linreg',   source: 'stu-4', target: 'sub-ml-linreg',   relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s4-nn',       source: 'stu-4', target: 'sub-ml-nn',       relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s4-trees',    source: 'stu-4', target: 'sub-ml-trees',    relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s4-cluster',  source: 'stu-4', target: 'sub-ml-cluster',  relationship: 'D', inverseRelationship: 'grade_received' },
    { id: 'g-s4-features', source: 'stu-4', target: 'sub-ml-features', relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s4-eval',     source: 'stu-4', target: 'sub-ml-eval',     relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s4-rl',       source: 'stu-4', target: 'sub-ml-rl',       relationship: 'A', inverseRelationship: 'grade_received' },
    // stu-5 (Databases)
    { id: 'g-s5-sql',   source: 'stu-5', target: 'sub-db-sql',   relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s5-norm',  source: 'stu-5', target: 'sub-db-norm',  relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s5-index', source: 'stu-5', target: 'sub-db-index', relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s5-tx',    source: 'stu-5', target: 'sub-db-tx',    relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s5-nosql', source: 'stu-5', target: 'sub-db-nosql', relationship: 'C', inverseRelationship: 'grade_received' },
    // stu-6 (Calculus)
    { id: 'g-s6-limits', source: 'stu-6', target: 'sub-calc-limits', relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s6-deriv',  source: 'stu-6', target: 'sub-calc-deriv',  relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s6-integ',  source: 'stu-6', target: 'sub-calc-integ',  relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s6-series', source: 'stu-6', target: 'sub-calc-series', relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s6-multi',  source: 'stu-6', target: 'sub-calc-multi',  relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s6-diffeq', source: 'stu-6', target: 'sub-calc-diffeq', relationship: 'A', inverseRelationship: 'grade_received' },
    // stu-7 (Calculus)
    { id: 'g-s7-limits', source: 'stu-7', target: 'sub-calc-limits', relationship: 'D', inverseRelationship: 'grade_received' },
    { id: 'g-s7-deriv',  source: 'stu-7', target: 'sub-calc-deriv',  relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s7-integ',  source: 'stu-7', target: 'sub-calc-integ',  relationship: 'D', inverseRelationship: 'grade_received' },
    { id: 'g-s7-series', source: 'stu-7', target: 'sub-calc-series', relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s7-multi',  source: 'stu-7', target: 'sub-calc-multi',  relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s7-diffeq', source: 'stu-7', target: 'sub-calc-diffeq', relationship: 'D', inverseRelationship: 'grade_received' },
    // stu-8 (Linear Algebra)
    { id: 'g-s8-vectors',   source: 'stu-8', target: 'sub-linalg-vectors',   relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s8-eigen',     source: 'stu-8', target: 'sub-linalg-eigen',     relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s8-transform', source: 'stu-8', target: 'sub-linalg-transform', relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s8-spaces',    source: 'stu-8', target: 'sub-linalg-spaces',    relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s8-decomp',    source: 'stu-8', target: 'sub-linalg-decomp',    relationship: 'A', inverseRelationship: 'grade_received' },
    // stu-9 (Statistics)
    { id: 'g-s9-prob',  source: 'stu-9', target: 'sub-stats-prob',  relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s9-dist',  source: 'stu-9', target: 'sub-stats-dist',  relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s9-hypo',  source: 'stu-9', target: 'sub-stats-hypo',  relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s9-reg',   source: 'stu-9', target: 'sub-stats-reg',   relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s9-bayes', source: 'stu-9', target: 'sub-stats-bayes', relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s9-inf',   source: 'stu-9', target: 'sub-stats-inf',   relationship: 'B', inverseRelationship: 'grade_received' },
    // stu-10 (Quantum Mechanics)
    { id: 'g-s10-wave',     source: 'stu-10', target: 'sub-quantum-wave',     relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s10-schrod',   source: 'stu-10', target: 'sub-quantum-schrod',   relationship: 'D', inverseRelationship: 'grade_received' },
    { id: 'g-s10-states',   source: 'stu-10', target: 'sub-quantum-states',   relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s10-uncert',   source: 'stu-10', target: 'sub-quantum-uncert',   relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s10-spin',     source: 'stu-10', target: 'sub-quantum-spin',     relationship: 'D', inverseRelationship: 'grade_received' },
    { id: 'g-s10-entangle', source: 'stu-10', target: 'sub-quantum-entangle', relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s10-measure',  source: 'stu-10', target: 'sub-quantum-measure',  relationship: 'B', inverseRelationship: 'grade_received' },
    // stu-11 (Quantum Mechanics)
    { id: 'g-s11-wave',     source: 'stu-11', target: 'sub-quantum-wave',     relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s11-schrod',   source: 'stu-11', target: 'sub-quantum-schrod',   relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s11-states',   source: 'stu-11', target: 'sub-quantum-states',   relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s11-uncert',   source: 'stu-11', target: 'sub-quantum-uncert',   relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s11-spin',     source: 'stu-11', target: 'sub-quantum-spin',     relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s11-entangle', source: 'stu-11', target: 'sub-quantum-entangle', relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s11-measure',  source: 'stu-11', target: 'sub-quantum-measure',  relationship: 'A', inverseRelationship: 'grade_received' },
    // stu-12 (Thermodynamics)
    { id: 'g-s12-laws',     source: 'stu-12', target: 'sub-thermo-laws',     relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s12-entropy',  source: 'stu-12', target: 'sub-thermo-entropy',  relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s12-engines',  source: 'stu-12', target: 'sub-thermo-engines',  relationship: 'B', inverseRelationship: 'grade_received' },
    { id: 'g-s12-phase',    source: 'stu-12', target: 'sub-thermo-phase',    relationship: 'A', inverseRelationship: 'grade_received' },
    { id: 'g-s12-statmech', source: 'stu-12', target: 'sub-thermo-statmech', relationship: 'C', inverseRelationship: 'grade_received' },
    { id: 'g-s12-chem',     source: 'stu-12', target: 'sub-thermo-chem',     relationship: 'B', inverseRelationship: 'grade_received' },

    // ── Subtopic → Subtopic (prerequisite_of) ────────────────────────────────
    // Algorithms: complexity theory unlocks DP and Greedy; Graph Traversal underlies Tree Algorithms
    { id: 'p-algo-complexity-dp',      source: 'sub-algo-complexity', target: 'sub-algo-dp',         relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-algo-complexity-greedy',  source: 'sub-algo-complexity', target: 'sub-algo-greedy',     relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-algo-graph-trees',        source: 'sub-algo-graph',      target: 'sub-algo-trees',      relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    // Machine Learning: Feature Engineering must come before modelling; Linear Regression before Neural Nets
    { id: 'p-ml-features-linreg',      source: 'sub-ml-features',     target: 'sub-ml-linreg',       relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-ml-features-cluster',     source: 'sub-ml-features',     target: 'sub-ml-cluster',      relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-ml-linreg-nn',            source: 'sub-ml-linreg',       target: 'sub-ml-nn',           relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-ml-nn-rl',                source: 'sub-ml-nn',           target: 'sub-ml-rl',           relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    // Databases: SQL is the foundation for Normalization and Indexing
    { id: 'p-db-sql-norm',             source: 'sub-db-sql',          target: 'sub-db-norm',         relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-db-sql-index',            source: 'sub-db-sql',          target: 'sub-db-index',        relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-db-norm-tx',              source: 'sub-db-norm',         target: 'sub-db-tx',           relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    // Calculus: classic chain of dependencies
    { id: 'p-calc-limits-deriv',       source: 'sub-calc-limits',     target: 'sub-calc-deriv',      relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-calc-deriv-integ',        source: 'sub-calc-deriv',      target: 'sub-calc-integ',      relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-calc-integ-diffeq',       source: 'sub-calc-integ',      target: 'sub-calc-diffeq',     relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-calc-limits-series',      source: 'sub-calc-limits',     target: 'sub-calc-series',     relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-calc-deriv-multi',        source: 'sub-calc-deriv',      target: 'sub-calc-multi',      relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    // Linear Algebra: Vectors & Matrices is the foundation for everything else
    { id: 'p-linalg-vectors-eigen',    source: 'sub-linalg-vectors',  target: 'sub-linalg-eigen',    relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-linalg-vectors-transform',source: 'sub-linalg-vectors',  target: 'sub-linalg-transform',relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-linalg-vectors-spaces',   source: 'sub-linalg-vectors',  target: 'sub-linalg-spaces',   relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-linalg-eigen-decomp',     source: 'sub-linalg-eigen',    target: 'sub-linalg-decomp',   relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    // Statistics: Probability first, then distributions, then inference
    { id: 'p-stats-prob-dist',         source: 'sub-stats-prob',      target: 'sub-stats-dist',      relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-stats-prob-bayes',        source: 'sub-stats-prob',      target: 'sub-stats-bayes',     relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-stats-dist-hypo',         source: 'sub-stats-dist',      target: 'sub-stats-hypo',      relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-stats-hypo-inf',          source: 'sub-stats-hypo',      target: 'sub-stats-inf',       relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    // Quantum: Wave Functions → Schrödinger → States → Measurement
    { id: 'p-quantum-wave-schrod',     source: 'sub-quantum-wave',    target: 'sub-quantum-schrod',  relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-quantum-schrod-states',   source: 'sub-quantum-schrod',  target: 'sub-quantum-states',  relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-quantum-states-measure',  source: 'sub-quantum-states',  target: 'sub-quantum-measure', relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-quantum-uncert-spin',     source: 'sub-quantum-uncert',  target: 'sub-quantum-spin',    relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    // Thermodynamics: Laws first, then entropy, engines, and statistical mechanics
    { id: 'p-thermo-laws-entropy',     source: 'sub-thermo-laws',     target: 'sub-thermo-entropy',  relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-thermo-laws-engines',     source: 'sub-thermo-laws',     target: 'sub-thermo-engines',  relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },
    { id: 'p-thermo-entropy-statmech', source: 'sub-thermo-entropy',  target: 'sub-thermo-statmech', relationship: 'prerequisite_of', inverseRelationship: 'has_prerequisite' },

    // ── Subtopic ↔ Subtopic (related_to) ─────────────────────────────────────
    // Algorithms
    { id: 'r-algo-dp-greedy',          source: 'sub-algo-dp',         target: 'sub-algo-greedy',     relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-algo-sort-trees',         source: 'sub-algo-sort',       target: 'sub-algo-trees',      relationship: 'related_to', inverseRelationship: 'related_to' },
    // Machine Learning
    { id: 'r-ml-trees-cluster',        source: 'sub-ml-trees',        target: 'sub-ml-cluster',      relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-ml-linreg-eval',          source: 'sub-ml-linreg',       target: 'sub-ml-eval',         relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-ml-nn-eval',              source: 'sub-ml-nn',           target: 'sub-ml-eval',         relationship: 'related_to', inverseRelationship: 'related_to' },
    // Databases
    { id: 'r-db-norm-nosql',           source: 'sub-db-norm',         target: 'sub-db-nosql',        relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-db-index-tx',             source: 'sub-db-index',        target: 'sub-db-tx',           relationship: 'related_to', inverseRelationship: 'related_to' },
    // Calculus
    { id: 'r-calc-series-multi',       source: 'sub-calc-series',     target: 'sub-calc-multi',      relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-calc-multi-diffeq',       source: 'sub-calc-multi',      target: 'sub-calc-diffeq',     relationship: 'related_to', inverseRelationship: 'related_to' },
    // Linear Algebra
    { id: 'r-linalg-spaces-transform', source: 'sub-linalg-spaces',   target: 'sub-linalg-transform',relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-linalg-eigen-decomp',     source: 'sub-linalg-eigen',    target: 'sub-linalg-decomp',   relationship: 'related_to', inverseRelationship: 'related_to' },
    // Statistics
    { id: 'r-stats-dist-bayes',        source: 'sub-stats-dist',      target: 'sub-stats-bayes',     relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-stats-reg-inf',           source: 'sub-stats-reg',       target: 'sub-stats-inf',       relationship: 'related_to', inverseRelationship: 'related_to' },
    // Quantum Mechanics
    { id: 'r-quantum-wave-uncert',     source: 'sub-quantum-wave',    target: 'sub-quantum-uncert',  relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-quantum-spin-entangle',   source: 'sub-quantum-spin',    target: 'sub-quantum-entangle',relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-quantum-states-entangle', source: 'sub-quantum-states',  target: 'sub-quantum-entangle',relationship: 'related_to', inverseRelationship: 'related_to' },
    // Thermodynamics
    { id: 'r-thermo-entropy-engines',  source: 'sub-thermo-entropy',  target: 'sub-thermo-engines',  relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-thermo-statmech-chem',    source: 'sub-thermo-statmech', target: 'sub-thermo-chem',     relationship: 'related_to', inverseRelationship: 'related_to' },
    { id: 'r-thermo-phase-chem',       source: 'sub-thermo-phase',    target: 'sub-thermo-chem',     relationship: 'related_to', inverseRelationship: 'related_to' },
  ],
}
