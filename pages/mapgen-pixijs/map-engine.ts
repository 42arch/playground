import { Application, Container } from 'pixi.js'
import DualMesh from './generator/dual-mesh'
import { MapRenderContext } from './types'
import { generatePoints } from './generator/point-generator'
import { DebugRenderer } from './renderers/debug-renderer'
import { addHeight } from './generator/height-generator'
import { HeightmapRenderer } from './renderers/heightmap-renderer'
import { markFeatures } from './generator/feature-generator'
import { generateCoastline } from './generator/coastline'
import { CoastlineRenderer } from './renderers/coastline-renderer'
import { CoastlineFeature } from './types'

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

  // 高程生成参数
  private heightmapParams = {
    height: 0.3,
    radius: 0.85,
    sharpness: 0.4
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

    // 层级管理：底色模版(隐藏) -> 高程色块 -> 湖泊填充 -> 岸线描边 -> 调试点/线
    this.world.addChild(this.coastlineRenderer.islandBackLayer)
    this.world.addChild(this.heightmapRenderer.heightmapLayer)
    // this.world.addChild(this.coastlineRenderer.lakeLayer)
    this.world.addChild(this.coastlineRenderer.coastlineLayer)

    // 核心修复：使用平滑的底色层作为高程色块层的遮罩
    // 这能确保生硬的多边形边缘永远不会超出平滑的海岸线
    // this.heightmapRenderer.heightmapLayer.mask =
    //   this.coastlineRenderer.islandBackLayer

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
        const scaleSpeed = 0.001
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

      // 如果发生了明显的拖拽，则不触发点击
      // 这里可以加一个简单的距离判断，暂略

      const localPos = this.world.toLocal(e.global)
      // const found = this.mesh.find(localPos.x, localPos.y)

      // if (found !== undefined && found !== -1) {
      //   addHeight(this.mesh, found, 'island', {
      //     height: this.heightmapParams.height,
      //     radius: this.heightmapParams.radius,
      //     sharpness: this.heightmapParams.sharpness
      //   })

      //   markFeatures(this.mesh)
      //   this.coastline = generateCoastline(this.mesh)

      //   const ctx = this.getRenderContext()
      //   if (ctx) {
      //     this.heightmapRenderer.render(ctx)
      //     this.coastlineRenderer.render(ctx)
      //     this.debugRenderer.render(ctx)
      //   }
      // }

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
        // this.coastlineRenderer.islandBackLayer.visible = visible
        break
    }
  }

  public generateMap(
    seed: number,
    minDistance: number = 25,
    count: number = 1
  ) {
    const { points } = generatePoints(
      seed,
      this.width,
      this.height,
      minDistance
    )
    this.mesh = new DualMesh(points, this.width, this.height)

    if (this.mesh) {
      for (let c = 0; c < count; c++) {
        let x, y
        let type: 'island' | 'hill' = 'hill'

        if (c === 0) {
          // 第一个大岛屿居中
          x = (Math.random() * this.width) / 4 + (this.width * 3) / 8
          y = (Math.random() * this.height) / 4 + (this.height * 3) / 8
          type = 'island'
        } else {
          // 后续的小山丘/岛屿
          let rndIdx = -1
          for (let limit = 0; limit < 50; limit++) {
            const i = Math.floor(Math.random() * this.mesh.numSolidRegions)
            const rx = this.mesh.r_x[i]
            const ry = this.mesh.r_y[i]

            if (
              this.mesh.polygons[i].height <= 0.25 &&
              rx >= this.width * 0.25 &&
              rx <= this.width * 0.75 &&
              ry >= this.height * 0.2 &&
              ry <= this.height * 0.8
            ) {
              rndIdx = i
              break
            }
          }

          // 兜底：如果没找到理想点，则随机选择一个
          if (rndIdx === -1) {
            rndIdx = Math.floor(Math.random() * this.mesh.numSolidRegions)
          }

          x = this.mesh.r_x[rndIdx]
          y = this.mesh.r_y[rndIdx]
          type = 'hill'
        }

        const found = this.mesh.find(x, y)
        if (found !== undefined && found !== -1) {
          addHeight(this.mesh, found, type, {
            height: this.heightmapParams.height,
            radius: this.heightmapParams.radius,
            sharpness: this.heightmapParams.sharpness
          })
        }
      }

      // 重新标记地理特征
      markFeatures(this.mesh)
      this.coastline = generateCoastline(this.mesh)

      const ctx = this.getRenderContext()
      if (ctx) {
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
      coastline: this.coastline
    }
  }

  public render() {}

  public clear() {}
}
