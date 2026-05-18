# Plan: 4-Way Closest Handles + ELK Compound Group View

## Context

Two visual improvements to KnowledgeNetworkDemo:

1. **Edges currently exit only from top/bottom of nodes.** The user wants Obsidian-style 4-way connectors (top, right, bottom, left) where each edge dynamically connects through the closest handle pair between source and target.

2. **The world map shows all nodes as flat dots.** The user wants a "compound" view mode where department nodes become visual containers holding their professor children, visually expressing the hierarchy as 3 big grouped areas (one per department) with branches flowing out to courses/students.

---

## Feature 1: 4-Way Closest-Connector Handles

### New file: `src/lib/closestHandles.ts`

Pure geometry utility. For a 120×50 node at position `{x, y}`:
- `top`: `{x+60, y}`, `bottom`: `{x+60, y+50}`, `left`: `{x, y+25}`, `right`: `{x+120, y+25}`

```ts
export function getClosestHandlePair(
  sourcePos: {x: number; y: number},
  targetPos: {x: number; y: number}
): { sourceHandle: string; targetHandle: string }
```

Tries all 16 combos (4 source sides × 4 target sides), returns min-distance pair as `{ sourceHandle: 'right-s', targetHandle: 'left-t' }` etc.

### Modify `src/components/KGNode.tsx`

Replace 2 existing handles with 8: one `type="source"` and one `type="target"` per direction.

```tsx
<Handle type="source" position={Position.Top}    id="top-s"    className="opacity-0" />
<Handle type="target" position={Position.Top}    id="top-t"    className="opacity-0" />
<Handle type="source" position={Position.Right}  id="right-s"  className="opacity-0" />
<Handle type="target" position={Position.Right}  id="right-t"  className="opacity-0" />
<Handle type="source" position={Position.Bottom} id="bottom-s" className="opacity-0" />
<Handle type="target" position={Position.Bottom} id="bottom-t" className="opacity-0" />
<Handle type="source" position={Position.Left}   id="left-s"   className="opacity-0" />
<Handle type="target" position={Position.Left}   id="left-t"   className="opacity-0" />
```

`KGEdge.tsx` needs **no changes** — ReactFlow automatically passes the correct `sourcePosition`/`targetPosition` for the assigned handle, so `getBezierPath()` already curves correctly.

### Modify `src/components/LayerCanvas.tsx`

Add `positionMap` to the `rfEdges` useMemo deps. Call `getClosestHandlePair` per edge:

```ts
const { sourceHandle, targetHandle } = getClosestHandlePair(
  positionMap[e.source] ?? { x: 0, y: 0 },
  positionMap[e.target] ?? { x: 0, y: 0 }
)
```

Add `sourceHandle` and `targetHandle` to each returned edge object.

### Modify `src/components/WorldMapCanvas.tsx` (Feature 1 portion)

Add a derived `activePositionMap` memo that selects the correct position map per mode:

```ts
const activePositionMap = useMemo(() => {
  if (viewMode === 'elk') return elkPositionMap
  if (viewMode === 'sugiyama') return sugiyamaPositionMap
  if (viewMode === 'cluster') return clusterPositionMap
  if (viewMode === 'compound') return elkCompoundResult.positions
  return positionMap
}, [...])
```

Replace `rfEdges` to use `activePositionMap` + `getClosestHandlePair` per edge. Add `activePositionMap` to its deps.

---

## Feature 2: ELK Compound Group View

### New file: `src/components/KGGroupNode.tsx`

Container node for department groups — sized dynamically by ReactFlow from ELK output. Uses `style={{ width: '100%', height: '100%' }}` so it fills whatever dimensions ReactFlow assigns. Renders a label at top-left, rounded border, semi-transparent fill. **No handles needed** — edges attach to the professor child nodes inside.

### Add `layoutCompoundElk` to `src/lib/layoutElk.ts`

```ts
export async function layoutCompoundElk(
  graph: KnowledgeGraph,
  layers: ComputedLayer[]
): Promise<{ positions: PositionMap; groupSizes: Record<string, {width: number; height: number}> }>
```

**ELK graph structure:**
- Layer 0 (departments) → ELK compound parents, each with their professors as `children`
- Layers 2–4 (courses, students, subtopics) → flat nodes at root level
- Edges: all hierarchy edges **except** `has_faculty` (already expressed by nesting)
- Root options: `ELK_LAYERED RIGHT` + **`'elk.hierarchyHandling': 'INCLUDE_CHILDREN'`** (critical for compound layout)
- Child compound options: `ELK_LAYERED DOWN` with padding

**Output parsing:** ELK returns children's `x/y` **relative to their parent**. Store professor positions as-is (relative); they map directly to ReactFlow's `parentId` system. Store department positions as absolute. Store department `width`/`height` from ELK output as `groupSizes`.

### Modify `src/components/WorldMapCanvas.tsx` (Feature 2 portion)

1. Add `'compound'` to viewMode union
2. Add `elkCompoundResult` state `{ positions, groupSizes }`, computed via `useEffect` when mode = `'compound'`
3. Add `kgGroupNode: KGGroupNode` to `nodeTypes` (must be outside component)
4. Add compound `rfNodes` branch — **order matters: group nodes first, then professors with `parentId` + `extent: 'parent'`, then flat nodes**
5. In compound `rfEdges` branch: skip `has_faculty` edges; for closest-handle routing, resolve professor absolute positions by adding parent dept position before calling `getClosestHandlePair`
6. Add `'compound'` tab button

---

## Implementation Order

1. `src/lib/closestHandles.ts` — new, no deps
2. `src/components/KGNode.tsx` — expand handles
3. `src/components/LayerCanvas.tsx` — wire Feature 1
4. `src/components/WorldMapCanvas.tsx` — Feature 1 portion (`activePositionMap` + new `rfEdges`)
5. `src/lib/layoutElk.ts` — add `layoutCompoundElk`
6. `src/components/KGGroupNode.tsx` — new component
7. `src/components/WorldMapCanvas.tsx` — Feature 2 portion (compound mode)

## Key Gotchas

| Risk | Mitigation |
|---|---|
| ELK not resolving compound children positions | Must set `'elk.hierarchyHandling': 'INCLUDE_CHILDREN'` on root |
| Professor positions in compound mode are relative, breaking `getClosestHandlePair` | Add parent dept absolute position before calling closest handle logic |
| ReactFlow silently breaks child nodes | Parent nodes must appear **before** children in `nodes[]` array |
| Group node wrong size | Use `style: { width, height }` on the node object, not hardcoded inside component |
| rfEdges stale after ELK resolves | Add `positionMap` (and `activePositionMap`) to rfEdges useMemo deps |

## Verification

1. `npx tsc --noEmit` — zero TypeScript errors
2. `npm run dev` — app loads at localhost:3000
3. **Drill-down panel**: edges should exit from sides (left/right) when nodes are horizontally adjacent, not just top/bottom
4. **World map → elk tab**: same 4-way routing visible across all modes
5. **World map → compound tab**: 3 department containers each holding their 2 professors; courses/students/subtopics positioned outside as flat nodes; edges cross group boundaries from professors to courses
