import { Graphics, Color } from 'pixi.js'
import { MapRenderContext } from '../types'

export class HeightmapRenderer {
  readonly heightmapLayer = new Graphics()

  get layers(): Graphics[] {
    return [this.heightmapLayer]
  }

  render(ctx: MapRenderContext) {
    this.renderHeightmap(ctx)
  }

  clear() {
    this.heightmapLayer.clear()
  }

  private renderHeightmap(ctx: MapRenderContext): void {
    const { mesh } = ctx
    this.heightmapLayer.clear()

    // 按照参考代码的逻辑，海平面以下的限制
    const seaLevel = 0.2

    for (const polygon of mesh.polygons) {
      // 参考代码逻辑：如果 height < 0.2 且未开启 seaInput，则可能不渲染或渲染背景
      // 这里我们统一根据高度渲染颜色
      
      if (polygon.vertex.length < 3) continue

      const color = this.getHeightColor(polygon.height)
      
      this.heightmapLayer.beginPath()
      const first = polygon.vertex[0]
      this.heightmapLayer.moveTo(first.x, first.y)
      
      for (let i = 1; i < polygon.vertex.length; i++) {
        const v = polygon.vertex[i]
        this.heightmapLayer.lineTo(v.x, v.y)
      }
      
      this.heightmapLayer.closePath()
      this.heightmapLayer.fill({ color, alpha: 1 })

      // 如果高度大于水位线，增加一个描边（参考代码中的 mapStroke）
      if (polygon.height >= seaLevel) {
          // 可选：添加描边逻辑
          // this.heightmapLayer.stroke({ width: 0.5, color: color, alpha: 0.5 });
      }
    }
  }

  /**
   * 简单的光谱颜色插值，模拟 d3.interpolateSpectral
   * 这里实现一个从 蓝色(低) -> 绿色 -> 黄色 -> 红色(高) 的简易映射
   */
  private getHeightColor(h: number): number {
    // 限制在 0-1 之间
    const t = Math.max(0, Math.min(1, h))
    
    // 我们反转一下，因为参考代码是用 color(1 - height)
    // 0.0 是红色（高山），1.0 是蓝色（深海）
    const invertedT = 1 - t

    // 简单的颜色映射逻辑 (HSL 方式比较容易实现光谱感)
    // 0 -> 红色 (0), 0.3 -> 黄色 (60), 0.6 -> 绿色 (120), 1.0 -> 蓝色 (240)
    const hue = invertedT * 240
    const c = new Color({ h: hue, s: 70, l: 50 })
    return c.toNumber()
  }
}
