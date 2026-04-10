import { Graphics } from 'pixi.js'
import { MapRenderContext } from '../types'

export class DebugRenderer {
  readonly pointsLayer = new Graphics()
  readonly edgesLayer = new Graphics()
  readonly cellsLayer = new Graphics()

  get layers(): Graphics[] {
    return [this.pointsLayer, this.edgesLayer, this.cellsLayer]
  }

  render(ctx: MapRenderContext) {
    this.renderPoints(ctx)
    this.renderEdges(ctx)
    this.renderCells(ctx)
  }

  clear() {
    this.pointsLayer.clear()
    this.edgesLayer.clear()
    this.cellsLayer.clear()
  }

  private renderPoints(ctx: MapRenderContext): void {
    const { mesh } = ctx

    this.pointsLayer.clear()

    for (let i = 0; i < mesh.numSolidRegions; i++) {
      this.pointsLayer
        .circle(mesh.r_x[i], mesh.r_y[i], 1.2)
        .fill({ color: 0xff4d4d })
    }
  }

  private renderEdges(ctx: MapRenderContext): void {
    const { mesh } = ctx

    this.edgesLayer.clear()

    for (let s = 0; s < mesh.numSides; s++) {
      const opp = mesh.s_opp_s(s)

      if (s < opp) {
        const r1 = mesh.s_begin_r(s)
        const r2 = mesh.s_end_r(s)

        if (r1 < mesh.numSolidRegions && r2 < mesh.numSolidRegions) {
          this.edgesLayer
            .moveTo(mesh.r_x[r1], mesh.r_y[r1])
            .lineTo(mesh.r_x[r2], mesh.r_y[r2])
        }
      }
    }

    this.edgesLayer.stroke({ width: 0.8, color: 0x555555, alpha: 0.3 })
  }

  private renderCells(ctx: MapRenderContext): void {
    const { mesh } = ctx

    this.cellsLayer.clear()
    const drawnEdges = new Set<string>()

    for (let r = 0; r < mesh.numSolidRegions; r++) {
      const polygon = mesh.r_polygon(r)

      if (polygon.length < 2) continue

      for (let i = 0; i < polygon.length; i++) {
        const start = polygon[i]
        const end = polygon[(i + 1) % polygon.length]
        const key = getEdgeKey(start.x, start.y, end.x, end.y)

        if (!drawnEdges.has(key)) {
          drawnEdges.add(key)
          this.cellsLayer.moveTo(start.x, start.y).lineTo(end.x, end.y)
        }
      }
    }

    this.cellsLayer.stroke({ width: 0.65, color: 0x000000, alpha: 0.16 })
  }
}

function getEdgeKey(x1: number, y1: number, x2: number, y2: number): string {
  const a = `${x1.toFixed(3)},${y1.toFixed(3)}`
  const b = `${x2.toFixed(3)},${y2.toFixed(3)}`

  return a < b ? `${a}|${b}` : `${b}|${a}`
}
