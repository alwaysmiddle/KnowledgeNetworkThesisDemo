export interface NodePosition {
  id: string
  position: { x: number; y: number }
}

export function layoutNodes(
  nodeIds: string[],
  columns = 4,
  spacingX = 200,
  spacingY = 150
): NodePosition[] {
  return nodeIds.map((id, i) => ({
    id,
    position: {
      x: (i % columns) * spacingX,
      y: Math.floor(i / columns) * spacingY,
    },
  }))
}
