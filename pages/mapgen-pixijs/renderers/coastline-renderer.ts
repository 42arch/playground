import { Graphics } from 'pixi.js'
import { MapRenderContext, MeshPoint } from '../types'
import {
  line,
  curveBasisClosed,
  curveBasis,
  curveCatmullRomClosed,
  curveCatmullRom
} from 'd3-shape'
import { chaikinSmoothing, offsetSmoothing } from '../generator/chaikin'

export class CoastlineRenderer {
  readonly islandBackLayer = new Graphics()
  readonly lakeLayer = new Graphics() // 专门用于湖泊填充的层
  readonly coastlineLayer = new Graphics()

  get layers(): Graphics[] {
    return [this.islandBackLayer, this.lakeLayer, this.coastlineLayer]
  }

  render(ctx: MapRenderContext) {
    const { coastline } = ctx
    if (!coastline) return

    this.islandBackLayer.clear()
    this.lakeLayer.clear()
    this.coastlineLayer.clear()

    const backAdapter = this.islandBackLayer as any
    const lakeAdapter = this.lakeLayer as any
    const lineAdapter = this.coastlineLayer as any
    if (!backAdapter.beginPath) backAdapter.beginPath = () => {}
    if (!lakeAdapter.beginPath) lakeAdapter.beginPath = () => {}
    if (!lineAdapter.beginPath) lineAdapter.beginPath = () => {}

    // 1. 准备底色填充层 (用于遮罩)
    // this.islandBackLayer.beginPath()
    for (const feature of coastline) {
      if (feature.points.length < 3) continue

      const first = feature.points[0]
      const last = feature.points[feature.points.length - 1]
      const isClosed =
        Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01
      if (!isClosed) continue

      // const backGenerator = line<any>()
      //   .x((p) => p.x)
      //   .y((p) => p.y)
      //   .curve(curveBasisClosed)
      //   .context(backAdapter)

      // backGenerator(feature.points)
    }
    // this.islandBackLayer.fill({ color: 0xffffff, alpha: 1.0 })

    // 2. 绘制平滑湖泊面 (lakeLayer)
    for (const feature of coastline) {
      if (feature.type !== 'Lake' || feature.points.length < 3) continue

      this.lakeLayer.beginPath()
      // const lakeGen = line<any>()
      //   .x((p) => p.x)
      //   .y((p) => p.y)
      //   .curve(curveCatmullRomClosed)
      //   .context(lakeAdapter)

      // lakeGen(feature.points)
      // 使用背景色相同的深蓝色
      this.lakeLayer.fill({ color: 0x5e4fa2, alpha: 1.0 })
    }

    console.log(2333333, coastline)
    // 3. 绘制描边线层
    for (const feature of coastline) {
      if (feature.points.length < 2) continue

      const isIsland = feature.type === 'Island'
      const color = '#333333'
      const width = 0.6

      const first = feature.points[0]
      const last = feature.points[feature.points.length - 1]
      const isClosed =
        Math.abs(first.x - last.x) < 0.01 && Math.abs(first.y - last.y) < 0.01

      // const lineGen = line<MeshPoint>()
      //   .x((p) => p.x)
      //   .y((p) => p.y)
      //   .curve(curveCatmullRomClosed)
      //   .context(lineAdapter)
      // lineGen(feature.points)

      const smoothed = chaikinSmoothing(feature.points, 2, isClosed)

      // 绘制路径
      for (let i = 0; i < smoothed.length; i++) {
        const point = smoothed[i]
        if (i === 0) {
          this.coastlineLayer.moveTo(point.x, point.y)
        } else {
          this.coastlineLayer.lineTo(point.x, point.y)
        }
      }

      if (isClosed) {
        this.coastlineLayer.closePath()
      }

      this.coastlineLayer.stroke({ width, color, alpha: 1.0 })
    }
  }
}
