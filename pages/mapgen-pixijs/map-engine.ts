import { Application, Container } from 'pixi.js'
import DualMesh from './generator/dual-mesh'
import { MapRenderContext, CoastlineFeature } from './types'
import { generatePoints } from './generator/point'
import { DebugRenderer } from './renderers/debug-renderer'
import { addBlobs, addNoise, downcutCoastline } from './generator/elevation'
import { HeightmapRenderer } from './renderers/heightmap-renderer'
import { markFeatures } from './generator/feature'
import { generateCoastline } from './generator/coastline'
import { CoastlineRenderer } from './renderers/coastline-renderer'
import { OceanRenderer } from './renderers/ocean-renderer'
import alea from 'alea'

export type OnClickCallback = (x: number, y: number) => void

export default class MapEngine {
  private readonly dom: HTMLCanvasElement
  private width: number = 0
  private height: number = 0
  private readonly app: Application

  private readonly world = new Container()

  private mesh: DualMesh | null = null
  private coastline: CoastlineFeature[] = []

  // 渲染器
  private readonly debugRenderer = new DebugRenderer()
  private readonly heightmapRenderer = new HeightmapRenderer()
  private readonly coastlineRenderer = new CoastlineRenderer()
  private readonly oceanRenderer = new OceanRenderer()

  // 高程生成参数
  private heightmapParams = {
    sharpness: 0.2,
    downcut: 0.05
  }

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
      backgroundColor: '#5e4fa2',
      preference: 'webgl'
    })

    this.app.stage.eventMode = 'static'
    this.app.stage.hitArea = this.app.screen

    this.app.stage.addChild(this.world)

    this.world.addChild(this.oceanRenderer.oceanLayer)
    this.world.addChild(this.coastlineRenderer.islandBackLayer)
    this.world.addChild(this.coastlineRenderer.islandMaskLayer)
    this.world.addChild(this.heightmapRenderer.heightmapLayer)
    this.world.addChild(this.coastlineRenderer.lakeLayer)

    this.world.addChild(this.coastlineRenderer.coastlineLayer)

    this.heightmapRenderer.heightmapLayer.mask =
      this.coastlineRenderer.islandBackLayer

    for (const layer of this.debugRenderer.layers) {
      this.world.addChild(layer)
    }

    // 添加鼠标事件
    this.setupInteractions()
  }

  private setupInteractions() {
    let isDragging = false
    let lastPos = { x: 0, y: 0 }

    this.app.stage.on('pointerdown', (e) => {
      isDragging = true
      lastPos = { x: e.global.x, y: e.global.y }
    })

    this.app.stage.on('pointermove', (e) => {
      if (isDragging) {
        const dx = e.global.x - lastPos.x
        const dy = e.global.y - lastPos.y
        this.world.x += dx
        this.world.y += dy
        lastPos = { x: e.global.x, y: e.global.y }
      }
    })

    this.app.stage.on('pointerup', () => {
      isDragging = false
    })

    this.app.stage.on('pointerupoutside', () => {
      isDragging = false
    })

    // 缩放逻辑
    this.dom.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        const delta = -e.deltaY
        const factor = Math.pow(1.1, delta / 100)

        const mouseGlobalPos = { x: e.offsetX, y: e.offsetY }
        const mouseLocalPos = this.world.toLocal(mouseGlobalPos)

        const newScale = Math.max(
          0.1,
          Math.min(this.world.scale.x * factor, 50)
        )

        this.world.scale.set(newScale)

        // 重新计算位置，使缩放中心处于鼠标位置
        const newGlobalPos = this.world.toGlobal(mouseLocalPos)
        this.world.x += mouseGlobalPos.x - newGlobalPos.x
        this.world.y += mouseGlobalPos.y - newGlobalPos.y
      },
      { passive: false }
    )

    // 点击事件（需考虑变换后的坐标）
    this.app.stage.on('click', (e) => {
      if (!this.mesh) return

      const localPos = this.world.toLocal(e.global)

      if (this.onClickCallback) {
        this.onClickCallback(localPos.x, localPos.y)
      }
    })
  }

  public setOnClick(callback: OnClickCallback) {
    this.onClickCallback = callback
  }

  public setHeightmapParams(params: {
    height?: number
    radius?: number
    sharpness?: number
  }) {
    this.heightmapParams = { ...this.heightmapParams, ...params }
  }

  public setLayerVisibility(
    layerName: 'points' | 'edges' | 'cells' | 'heightmap' | 'coastline',
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
      case 'coastline':
        this.coastlineRenderer.coastlineLayer.visible = visible
        break
    }
  }

  public generateMap(
    seed: number,
    minDistance: number = 25,
    count: number = 11
  ) {
    // 统一随机数生成器
    const random = alea(seed)

    const { points } = generatePoints(
      seed,
      this.width,
      this.height,
      minDistance
    )
    this.mesh = new DualMesh(points, this.width, this.height)

    if (this.mesh) {
      addBlobs(
        this.mesh,
        count,
        this.width,
        this.height,
        random,
        this.heightmapParams.sharpness
      )

      // 2. 侵蚀海岸线 (Downcut)
      downcutCoastline(this.mesh, this.heightmapParams.downcut)

      // 3. 添加噪声细化 (Noise)
      addNoise(this.mesh, this.width, this.height, random)
      markFeatures(this.mesh)
      this.coastline = generateCoastline(this.mesh)

      const ctx = this.getRenderContext()
      if (ctx) {
        this.oceanRenderer.render(ctx)
        this.heightmapRenderer.render(ctx)
        this.coastlineRenderer.render(ctx)
        this.debugRenderer.render(ctx)
      }
    }
  }

  private getRenderContext(): MapRenderContext | null {
    if (!this.mesh) {
      return null
    }
    return {
      mesh: this.mesh,
      coastline: this.coastline,
      canvasWidth: this.width,
      canvasHeight: this.height
    }
  }

  public render() {}

  public clear() {}
}
