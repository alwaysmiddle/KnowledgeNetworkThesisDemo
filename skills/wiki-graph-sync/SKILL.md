---
name: wiki-graph-sync
description: >-
  Deprecated. The KnowledgeNetworkThesisDemo wiki graph was migrated to DocHub.
  Use DocHub docs and validators instead of syncing this repo's old wiki/.
---

# Deprecated: Wiki Graph Sync

Do not use this skill for current project work.

`KnowledgeNetworkThesisDemo/wiki/` is deprecated and retained only for history.
The source of truth is the sibling DocHub repository:

```text
D:/ShiZhong/MyCode/DocHub/docs/knowledge-network-thesis-demo/
```

Use the current workflow instead:

1. Read `D:/ShiZhong/MyCode/KnowledgeNetworkThesisDemo/CLAUDE.md`.
2. Read the relevant DocHub pages under `docs/knowledge-network-thesis-demo/`.
3. For DocHub edits, run:

```powershell
npm --prefix ../DocHub run validate
```

4. For generated architecture updates from the code repo, run:

```powershell
npm run map
```

The old `npm run graph` / `npm run sync` workflow is intentionally retired.
