import type { ComputedLayer } from '../types'
import type { NodePosition } from './layoutNodes'

export function layoutWorldMap(
  layers: ComputedLayer[],
  columnSpacingX = 280,
  rowSpacingY = 90,
  headerOffsetY = 60
): NodePosition[] {
  const positions: NodePosition[] = []

  layers.forEach((layer, colIndex) => {
    layer.nodeIds.forEach((id, rowIndex) => {
      positions.push({
        id,
        position: {
          x: colIndex * columnSpacingX,
          y: headerOffsetY + rowIndex * rowSpacingY,
        },
      })
    })
  })

  return positions
}
