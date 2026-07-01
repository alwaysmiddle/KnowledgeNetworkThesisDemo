// Deprecated.
//
// KnowledgeNetworkThesisDemo no longer owns a local wiki graph. The knowledge
// base was migrated to the sibling DocHub repository:
//
//   ../DocHub/docs/knowledge-network-thesis-demo/
//
// Keep this shim so old commands fail loudly instead of rewriting deprecated
// files under ./wiki.

console.error('scripts/wiki-graph.mjs is deprecated.')
console.error('DocHub is the source of truth: ../DocHub/docs/knowledge-network-thesis-demo/')
console.error('Use `npm run map` to refresh the generated DocHub architecture page.')
console.error('Use `npm --prefix ../DocHub run validate` to validate DocHub docs.')
process.exit(1)
