import * as THREE from 'three'
import {
  AmbientLight,
  BoxGeometry,
  Clock,
  Color,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshPhongMaterial,
  NearestFilter,
  PerspectiveCamera,
  PointLight,
  RGBAFormat,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'

// 核心优化：禁用色彩管理，防止 ID 颜色因 Gamma 校正而漂移
THREE.ColorManagement.enabled = false

class View {
  private width: number
  private height: number
  private pixelRatio: number
  private canvas: HTMLElement
  private scene: Scene
  private camera: PerspectiveCamera
  private renderer: WebGLRenderer
  private controls: OrbitControls
  private clock: Clock

  private group: Group
  private pickingGroup: Group
  private pickingScene: Scene = new Scene()
  private pickingRenderTarget: WebGLRenderTarget

  private instancedMesh: InstancedMesh | null = null
  private pickingInstancedMesh: InstancedMesh | null = null

  private params: {
    rotate: boolean,
    count: number,
    dist: number
  }

  private mouse: Vector2 = new Vector2(-1, -1)
  private lastPickedInstanceId: number | null = null
  private lastPickedOriginalColor: Color = new Color()

  constructor(element: string) {
    this.canvas = document.querySelector(element) as HTMLElement
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.pixelRatio = Math.min(window.devicePixelRatio, 2)
    
    this.scene = new Scene()
    this.camera = new PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.set(20, 20, 20)

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(this.pixelRatio)

    // 初始化 1x1 离屏渲染目标，极致性能
    this.pickingRenderTarget = new WebGLRenderTarget(1, 1, {
      generateMipmaps: false,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat
    })

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.clock = new Clock()

    this.group = new Group()
    this.pickingGroup = new Group()
    this.scene.add(this.group)
    this.pickingScene.add(this.pickingGroup)

    this.params = {
      rotate: true,
      count: 5000,
      dist: 30
    }

    this.addLights()
    this.resize()
    this.addEventListeners()
    this.addGroup()
    this.animate()
    this.addPane()
  }

  private addLights() {
    const ambient = new AmbientLight(0xffffff, 0.6)
    this.scene.add(ambient)
    const point = new PointLight(0xffffff, 500)
    point.position.set(20, 20, 20)
    this.scene.add(point)
  }

  private addGroup() {
    // 1. 清理资源
    if (this.instancedMesh) {
      this.group.remove(this.instancedMesh)
      this.pickingGroup.remove(this.pickingInstancedMesh!)
      this.instancedMesh.geometry.dispose()
      ;(this.instancedMesh.material as THREE.Material).dispose()
      ;(this.pickingInstancedMesh!.material as THREE.Material).dispose()
    }

    const geometry = new BoxGeometry(0.5, 0.5, 0.5)

    // 2. 视觉网格：不要设置 vertexColors: true
    const material = new MeshPhongMaterial({ color: 0xffffff })
    this.instancedMesh = new InstancedMesh(geometry, material, this.params.count)
    this.group.add(this.instancedMesh)

    // 3. 拾取网格：同样不设置 vertexColors
    const pickingMaterial = new MeshBasicMaterial()
    this.pickingInstancedMesh = new InstancedMesh(geometry, pickingMaterial, this.params.count)
    this.pickingGroup.add(this.pickingInstancedMesh)

    const matrix = new Matrix4()
    const color = new Color()

    for (let i = 0; i < this.params.count; i++) {
      const position = new Vector3(
        (Math.random() - 0.5) * this.params.dist,
        (Math.random() - 0.5) * this.params.dist,
        (Math.random() - 0.5) * this.params.dist
      )
      const rotation = new Euler(Math.random(), Math.random(), Math.random())
      matrix.makeRotationFromEuler(rotation)
      matrix.setPosition(position)

      this.instancedMesh.setMatrixAt(i, matrix)
      this.pickingInstancedMesh.setMatrixAt(i, matrix)

      // 视觉颜色
      color.setHSL(Math.random(), 0.8, 0.5)
      this.instancedMesh.setColorAt(i, color)

      // 拾取 ID 颜色 (i+1)
      const idColor = new Color().setHex(i + 1)
      this.pickingInstancedMesh.setColorAt(i, idColor)
    }

    this.instancedMesh.instanceColor!.needsUpdate = true
    this.pickingInstancedMesh.instanceColor!.needsUpdate = true
  }

  private pick() {
    if (this.mouse.x === -1 || !this.instancedMesh) return

    // 1. 设置相机偏移，只看鼠标下 1x1 的区域
    // 关键：不乘以 pixelRatio，setViewOffset 内部会自动处理
    this.camera.setViewOffset(
      this.width, this.height,
      this.mouse.x, this.mouse.y,
      1, 1
    )

    // 2. 渲染到 1x1 RenderTarget
    this.renderer.setRenderTarget(this.pickingRenderTarget)
    this.renderer.render(this.pickingScene, this.camera)

    // 3. 读取该像素颜色
    const pixelBuffer = new Uint8Array(4)
    this.renderer.readRenderTargetPixels(this.pickingRenderTarget, 0, 0, 1, 1, pixelBuffer)

    // 4. 解析 ID 并转换回 instanceId
    const id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | pixelBuffer[2]
    const instanceId = id - 1

    // 5. 交互逻辑
    if (instanceId !== this.lastPickedInstanceId) {
      // 恢复旧色
      if (this.lastPickedInstanceId !== null) {
        this.instancedMesh.setColorAt(this.lastPickedInstanceId, this.lastPickedOriginalColor)
      }

      // 高亮新色
      if (instanceId >= 0 && instanceId < this.params.count) {
        this.instancedMesh.getColorAt(instanceId, this.lastPickedOriginalColor)
        this.instancedMesh.setColorAt(instanceId, new Color(0xffffff)) // 白色高亮
        this.lastPickedInstanceId = instanceId
      } else {
        this.lastPickedInstanceId = null
      }

      this.instancedMesh.instanceColor!.needsUpdate = true
    }

    // 6. 重置状态
    this.renderer.setRenderTarget(null)
    this.camera.clearViewOffset()
  }

  private addEventListeners() {
    window.addEventListener('pointermove', (e) => {
      // 获取 Canvas 相对视口的坐标，解决非全屏下的偏移问题
      const rect = this.canvas.getBoundingClientRect()
      this.mouse.x = e.clientX - rect.left
      this.mouse.y = e.clientY - rect.top
    })
  }

  private resize() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth
      this.height = window.innerHeight
      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.width, this.height)
    })
  }

  private animate() {
    const delta = this.clock.getDelta()

    if (this.params.rotate) {
      this.group.rotation.y += delta * 0.1
      this.pickingGroup.rotation.y = this.group.rotation.y
    }

    this.pick()
    this.renderer.render(this.scene, this.camera)
    this.controls.update()
    window.requestAnimationFrame(this.animate.bind(this))
  }

  private addPane() {
    const pane = new Pane({ title: 'GPU Picking Optimized' })
    pane.addBinding(this.params, 'count', { min: 100, max: 20000, step: 100 }).on('change', (e) => {
      if (e.last) this.addGroup()
    })
    pane.addBinding(this.params, 'dist', { min: 20, max: 100, step: 1 }).on('change', (e) => {
      if (e.last) this.addGroup()
    })
    pane.addBinding(this.params, 'rotate')
  }
}

const view = new View('canvas.webgl')