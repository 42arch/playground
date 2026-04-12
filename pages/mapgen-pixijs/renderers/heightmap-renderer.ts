import { Graphics, Color } from 'pixi.js'
import { MapRenderContext } from '../types'
import { scaleSequential } from 'd3-scale'
import { interpolateSpectral } from 'd3-scale-chromatic'
import { contours } from 'd3-contour'
import { line, curveCatmullRomClosed } from 'd3-shape'

export class HeightmapRenderer {
  readonly heightmapLayer = new Graphics()
  // 渲染等高线的阴影层，增加立体感
  readonly shadowLayer = new Graphics()

  // 定义颜色映射：从 100 到 0 映射为光谱色 (符合参考代码风格)
  private colorScale = scaleSequential([100, 0], interpolateSpectral)

  get layers(): Graphics[] {
    // 阴影层在下，内容层在上
    return [this.shadowLayer, this.heightmapLayer]
  }

  render(ctx: MapRenderContext) {
    this.renderContours(ctx)
  }

  clear() {
    this.heightmapLayer.clear()
    this.shadowLayer.clear()
  }

  /**
   * 按照参考代码逻辑实现等高线绘制
   */
  private renderContours(ctx: MapRenderContext): void {
    const { mesh, canvasWidth = 800, canvasHeight = 600 } = ctx
    this.heightmapLayer.clear()
    this.shadowLayer.clear()

    // 1. 数据采样：将离散的多边形数据映射到规则网格
    // 采样步长，步长越小越精细但计算量越大
    const step = 4
    const gridW = Math.ceil(canvasWidth / step)
    const gridH = Math.ceil(canvasHeight / step)
    const heightValues = []

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        // 找到该网格点对应的多边形高度
        const idx = mesh.find(x * step, y * step)
        heightValues.push(mesh.polygons[idx]?.height || 0)
      }
    }

    // 2. 生成等高线
    // 阈值范围：从水位线 0.2 到 0.9，每隔 0.1 一个层级
    const thresholds = []
    for (let t = 0.2; t <= 0.95; t += 0.12) thresholds.push(t)

    const contourData = contours()
      .size([gridW, gridH])
      .smooth(true)
      .thresholds(thresholds)(heightValues)

    // 3. 绘制每一层
    contourData.forEach((layer) => {
      const height = layer.value
      const color = this.getHeightColor(height)
      const shadowColor = new Color(color).multiply(0.7).toNumber()

      // 遍历该高度层下的所有多边形路径
      layer.coordinates.forEach((multipolygon) => {
        multipolygon.forEach((polygon) => {
          if (polygon.length < 3) return

          // 绘制阴影（向右下偏移，参考代码中的 contoursShade）
          this.drawSmoothedPath(
            this.shadowLayer,
            polygon,
            step,
            shadowColor,
            1,
            1.2
          )

          // 绘制主体
          this.drawSmoothedPath(this.heightmapLayer, polygon, step, color, 1)
        })
      })
    })
  }

  /**
   * 使用 d3-shape 绘制平滑路径
   */
  private drawSmoothedPath(
    g: Graphics,
    points: number[][],
    step: number,
    color: number,
    alpha: number,
    offset: number = 0
  ) {
    // 创建一个适配器，将 D3 的 Canvas 指令转发给 PixiJS Graphics
    const adapter: any = {
      moveTo: (x: number, y: number) => g.moveTo(x, y),
      lineTo: (x: number, y: number) => g.lineTo(x, y),
      bezierCurveTo: (
        cp1x: number,
        cp1y: number,
        cp2x: number,
        cp2y: number,
        x: number,
        y: number
      ) => g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y),
      closePath: () => g.closePath(),
      beginPath: () => {}
    }

    const lineGenerator = line<number[]>()
      .x((d) => d[0] * step + offset)
      .y((d) => d[1] * step + offset)
      .curve(curveCatmullRomClosed)
      .context(adapter)

    // d3-contour 返回的点集最后一点通常与第一点重复，
    // 而 curveCatmullRomClosed 会自动处理闭合，不需要最后一个重复点
    // const cleanPoints = points.slice(0, -1)

    g.beginPath()
    lineGenerator(points)
    g.fill({ color, alpha })
  }

  private getHeightColor(h: number): number {
    const t = Math.max(0, Math.min(100, h * 100))
    const colorStr = this.colorScale(t)
    return new Color(colorStr).toNumber()
  }
}
