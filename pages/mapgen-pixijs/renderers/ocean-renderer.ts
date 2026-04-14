import { Graphics } from 'pixi.js'
import { MapRenderContext } from '../types'
import { contours } from 'd3-contour'
import { line, curveBasisClosed } from 'd3-shape'

export class OceanRenderer {
  readonly oceanLayer = new Graphics()

  get layers(): Graphics[] {
    return [this.oceanLayer]
  }

  render(ctx: MapRenderContext) {
    this.renderOcean(ctx)
  }

  clear() {
    this.oceanLayer.clear()
  }

  private renderOcean(ctx: MapRenderContext): void {
    const { mesh, canvasWidth = 800, canvasHeight = 600 } = ctx
    this.oceanLayer.clear()

    // 1. 采样网格
    const step = 8 // 采样可以稍微粗略一点
    const gridW = Math.ceil(canvasWidth / step)
    const gridH = Math.ceil(canvasHeight / step)
    const heightValues = []

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const idx = mesh.find(x * step, y * step)
        heightValues.push(mesh.polygons[idx]?.height || 0)
      }
    }

    // 2. 定义层级和颜色 (参考自 reference/index.js)
    // 0.02 (深海), 0.08 (中等), 0.16 (浅滩)
    const thresholds = [0.02, 0.08, 0.16]
    const colors = ['#5E78B6', '#6d8cc5', '#7EABD5']

    // 首先填充整个背景为最深蓝色
    this.oceanLayer.beginPath()
    this.oceanLayer.rect(0, 0, canvasWidth, canvasHeight)
    this.oceanLayer.fill({ color: '#5167a9' })

    const contourData = contours()
      .size([gridW, gridH])
      .smooth(true)
      .thresholds(thresholds)(heightValues)

    // 3. 绘制适配器
    const adapter: any = {
      moveTo: (x: number, y: number) => this.oceanLayer.moveTo(x, y),
      lineTo: (x: number, y: number) => this.oceanLayer.lineTo(x, y),
      bezierCurveTo: (
        cp1x: number,
        cp1y: number,
        cp2x: number,
        cp2y: number,
        x: number,
        y: number
      ) => this.oceanLayer.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y),
      closePath: () => this.oceanLayer.closePath(),
      beginPath: () => {}
    }

    const lineGenerator = line<number[]>()
      .x((d) => d[0] * step)
      .y((d) => d[1] * step)
      .curve(curveBasisClosed)
      .context(adapter)

    // 4. 逐层渲染
    contourData.forEach((layer, i) => {
      const color = colors[i]

      layer.coordinates.forEach((multipolygon) => {
        multipolygon.forEach((polygon) => {
          if (polygon.length < 3) return
          this.oceanLayer.beginPath()
          // 移除 D3 重复的闭合点
          lineGenerator(polygon)
          // lineGenerator(polygon.slice(0, -1))
          this.oceanLayer.fill({ color })
        })
      })
    })
  }
}
