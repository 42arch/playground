import { Application, Container } from 'pixi.js'
import DualMesh from './generator/dual-mesh'
import { MapRenderContext } from './types'
import { generatePoints } from './generator/point-generator'
import { DebugRenderer } from './renderers/debug-renderer'
import { addHeight } from './generator/height-generator'
import { HeightmapRenderer } from './renderers/heightmap-renderer'

export type OnClickCallback = (x: number, y: number) => void

export default class MapEngine {
  private readonly dom: HTMLCanvasElement
  private width: number = 0
  private height: number = 0
  private readonly app: Application

  private readonly world = new Container()

  private mesh: DualMesh | null = null

  // 渲染器
  private readonly debugRenderer = new DebugRenderer()
  private readonly heightmapRenderer = new HeightmapRenderer()

  // 点击事件回调
  private onClickCallback: OnClickCallback | null = null

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

    const allRenderers = [this.heightmapRenderer, this.debugRenderer]
    for (const renderer of allRenderers) {
      for (const layer of renderer.layers) {
        this.world.addChild(layer)
      }
    }

    this.app.stage.addChild(this.world)

    // 添加鼠标点击事件
    this.setupClickHandler()
  }

  private setupClickHandler() {
    this.dom.addEventListener('click', (event: MouseEvent) => {
      const rect = this.dom.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top

      if (!this.mesh) return

      const found = this.mesh.find(x, y)

      if (found !== undefined && found !== -1) {
        addHeight(this.mesh, found, 'island', {
          height: 0.3,
          radius: 0.85,
          sharpness: 0.4
        })

        // 重新渲染
        const ctx = this.getRenderContext()
        if (ctx) {
          this.heightmapRenderer.render(ctx)
          this.debugRenderer.render(ctx)
        }
      }

      if (this.onClickCallback) {
        this.onClickCallback(x, y)
      }
    })
  }

  public setOnClick(callback: OnClickCallback) {
    this.onClickCallback = callback
  }

  public setLayerVisibility(
    layerName: 'points' | 'edges' | 'cells' | 'heightmap',
    visible: boolean
  ) {
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
      case 'heightmap':
        this.heightmapRenderer.heightmapLayer.visible = visible
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
      this.heightmapRenderer.render(ctx)
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
