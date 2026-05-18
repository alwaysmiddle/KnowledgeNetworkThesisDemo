import type { RelationshipChain } from '../types'

export const SCHOOL_LAYER_NAMES = ['Departments', 'Professors', 'Courses', 'Students', 'Subtopics']

export const SCHOOL_RELATIONSHIP_CHAIN: RelationshipChain = [
  ['has_faculty'],
  ['teaches'],
  ['has_enrollment'],
  ['A', 'B', 'C', 'D', 'F'],   // grade relationships — any grade connects student → subtopic
]
