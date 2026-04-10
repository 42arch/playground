import { Application, Container } from 'pixi.js'
import DualMesh from './generator/dual-mesh'
import { MapRenderContext, MeshPoint } from './types'
import { generatePoints } from './generator/point-generator'
import { DebugRenderer } from './renderers/debug-renderer'

export default class MapEngine {
  private readonly dom: HTMLCanvasElement
  private width: number = 0
  private height: number = 0
  private readonly app: Application

  private readonly world = new Container()

  private mesh: DualMesh | null = null

  // 渲染器
  private readonly debugRenderer = new DebugRenderer()

  constructor(dom: HTMLCanvasElement) {
    this.dom = dom
    this.width = dom.clientWidth
    this.height = dom.clientHeight

    this.app = new Application()
  }

  public async init() {
    await this.app.init({
      canvas: this.dom,
      width: this.width,
      height: this.height,
      antialias: true,
      backgroundAlpha: 1,
      backgroundColor: '#eaf0f4',
      preference: 'webgl'
    })

    const allRenderers = [this.debugRenderer]
    for (const renderer of allRenderers) {
      for (const layer of renderer.layers) {
        this.world.addChild(layer)
      }
    }

    this.app.stage.addChild(this.world)
  }

  public setLayerVisibility(layerName: 'points' | 'edges' | 'cells', visible: boolean) {
    switch (layerName) {
      case 'points':
        this.debugRenderer.pointsLayer.visible = visible
        break
      case 'edges':
        this.debugRenderer.edgesLayer.visible = visible
        break
      case 'cells':
        this.debugRenderer.cellsLayer.visible = visible
        break
    }
  }

  public generateMap(seed: number, minDistance: number = 25) {
    const { points } = generatePoints(
      seed,
      this.width,
      this.height,
      minDistance
    )
    this.mesh = new DualMesh(points, this.width, this.height)

    const ctx = this.getRenderContext()
    if (ctx) {
      this.debugRenderer.render(ctx)
    }
  }

  private getRenderContext(): MapRenderContext | null {
    if (!this.mesh) {
      return null
    }
    return {
      mesh: this.mesh
    }
  }

  public render() {}

  public clear() {}
}
