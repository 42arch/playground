import { Graphics } from 'pixi.js'
import { MapRenderContext, MeshPoint } from '../types'
import { line, curveCatmullRomClosed } from 'd3-shape'

export class CoastlineRenderer {
  readonly islandBackLayer = new Graphics()
  readonly islandMaskLayer = new Graphics() // 专门用于岛屿遮罩的层
  readonly lakeLayer = new Graphics() // 专门用于湖泊填充的层
  readonly coastlineLayer = new Graphics() // 专门用于岸线描边的层

  get layers(): Graphics[] {
    return [
      this.coastlineLayer,
      this.islandBackLayer,
      this.islandMaskLayer,
      this.lakeLayer
    ]
  }

  render(ctx: MapRenderContext) {
    const { coastline } = ctx
    if (!coastline) return

    this.coastlineLayer.clear()
    this.islandBackLayer.clear()
    this.islandMaskLayer.clear()
    this.lakeLayer.clear()

    const backAdapter = this.islandBackLayer as any
    const maskAdapter = this.islandMaskLayer as any
    const lakeAdapter = this.lakeLayer as any
    const lineAdapter = this.coastlineLayer as any

    if (!backAdapter.beginPath) backAdapter.beginPath = () => {}
    if (!maskAdapter.beginPath) maskAdapter.beginPath = () => {}
    if (!lakeAdapter.beginPath) lakeAdapter.beginPath = () => {}

    // const pathGenerator = line<MeshPoint>()
    //   .x((p) => p.x)
    //   .y((p) => p.y)
    //   .curve(curveCatmullRomClosed)
    //   .context(lineAdapter)

    // 1. 准备底色填充层 (用于遮罩)
    // this.islandBackLayer.beginPath()
    for (const feature of coastline) {
      if (feature.points.length < 3) continue

      const first = feature.points[0]
      const last = feature.points[feature.points.length - 1]
      const isClosed =
        Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01
      if (!isClosed) continue

      const islandBackGenerator = line<MeshPoint>()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(curveCatmullRomClosed)
        .context(backAdapter)

      islandBackGenerator(feature.points)

      const islandMaskGenerator = line<MeshPoint>()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(curveCatmullRomClosed)
        .context(maskAdapter)

      islandBackGenerator(feature.points)
      islandMaskGenerator(feature.points)
    }

    this.islandBackLayer.fill({ color: '#6dc0a8', alpha: 1.0 })
    this.islandMaskLayer.fill({ color: '#6dc0a8', alpha: 1.0 })

    // 2. 绘制平滑湖泊面 (lakeLayer)
    for (const feature of coastline) {
      if (feature.type !== 'Lake' || feature.points.length < 3) continue

      this.lakeLayer.beginPath()
      const lakeGen = line<MeshPoint>()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(curveCatmullRomClosed)
        .context(lakeAdapter)

      lakeGen(feature.points)
      // 使用背景色相同的深蓝色
      this.lakeLayer.fill({ color: '#4f9ecc', alpha: 1.0 })
    }

    // 3. 绘制描边线层
    for (const feature of coastline) {
      if (feature.points.length < 2) continue

      const color = '#333333'
      const width = 0.5

      const first = feature.points[0]
      const last = feature.points[feature.points.length - 1]
      const isClosed =
        Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01

      const lineGen = line<MeshPoint>()
        .x((p) => p.x)
        .y((p) => p.y)
        .curve(curveCatmullRomClosed)
        .context(lineAdapter)
      lineGen(feature.points)

      if (isClosed) {
        this.coastlineLayer.closePath()
      }

      this.coastlineLayer.stroke({
        width,
        color,
        alpha: 1.0,
        join: 'bevel'
      })
    }
  }
}
