import {
  AmbientLight,
  BoxGeometry,
  Clock,
  Color,
  Group,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  MeshPhongMaterial,
  NearestFilter,
  NoColorSpace,
  PerspectiveCamera,
  PointLight,
  RGBAFormat,
  Scene,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'
import * as THREE from 'three'
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

  private params: {
    rotate: boolean
  }

  private pickingScene: Scene = new Scene()
  private pickingRenderTarget: WebGLRenderTarget
  private idToMesh: Map<number, Mesh> = new Map() // ID到原始Mesh的映射
  private mouse: Vector2 = new Vector2(-1, -1)
  private lastPickedMesh: Mesh | null = null

  constructor(element: string) {
    this.canvas = document.querySelector(element) as HTMLElement
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.pixelRatio = Math.min(window.devicePixelRatio, 2)
    this.scene = new Scene()
    this.camera = new PerspectiveCamera(
      75,
      this.width / this.height,
      0.001,
      1000
    )
    this.camera.position.set(5, 5, 5)
    this.scene.add(this.camera)
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    })

    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(this.pixelRatio)

    // 初始化离屏渲染目标
    this.pickingRenderTarget = new WebGLRenderTarget(this.width, this.height, {
      generateMipmaps: false,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat
    })
    this.pickingRenderTarget.texture.colorSpace = LinearSRGBColorSpace

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.clock = new Clock()

    this.group = new Group()
    this.pickingGroup = new Group()

    this.params = {
      rotate: false
    }

    this.addLights()
    this.resize()
    this.addEventListeners()
    this.addGroup()
    this.animate()
    this.addPane()
  }

  resize() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth
      this.height = window.innerHeight
      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(this.width, this.height)
      this.pickingRenderTarget.setSize(this.width, this.height)
    })
  }

  animate() {
    const delta = this.clock.getDelta()

    if (this.params.rotate) {
      this.group.rotation.y += delta / 2
      // 重要：拾取场景必须与视觉场景同步运动
      this.pickingGroup.rotation.y = this.group.rotation.y
    }

    this.pick()
    this.renderer.render(this.scene, this.camera)
    this.controls.update()
    window.requestAnimationFrame(this.animate.bind(this))
  }

  addLights() {
    const ambient = new AmbientLight(0xffffff, 0.5)
    this.scene.add(ambient)
    const point = new PointLight(0xffffff, 100)
    point.position.set(5, 5, 5)
    this.scene.add(point)
  }

  addGroup() {
    this.scene.add(this.group)
    this.pickingScene.add(this.pickingGroup)
    const geometry = new BoxGeometry(0.2, 0.2, 0.2)

    for (let i = 1; i <= 1000; i++) {
      // 1. 创建视觉场景的物体
      const material = new MeshPhongMaterial({
        color: new Color().setHSL(Math.random(), 0.7, 0.5)
      })
      const mesh = new Mesh(geometry, material)
      mesh.position.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      )
      mesh.rotation.set(Math.random(), Math.random(), Math.random())
      this.group.add(mesh)

      const pickingColor = new Color()
      // 关键：直接操作 hex，避开颜色空间转换
      pickingColor.setHex(i, NoColorSpace)

      // 2. 创建拾取场景的“影子”物体
      const pickingMaterial = new MeshBasicMaterial({
        color: pickingColor,
        transparent: false,
        opacity: 1,
        fog: false // 禁用雾化，防止颜色偏移
      })
      const pickingMesh = new Mesh(geometry, pickingMaterial)
      pickingMesh.position.copy(mesh.position)
      pickingMesh.rotation.copy(mesh.rotation)
      this.pickingGroup.add(pickingMesh)

      this.idToMesh.set(i, mesh)
    }
  }

  // 拾取函数
  private pick() {
    if (this.mouse.x === -1) return
    // 1. 优化：设置相机偏移，只渲染鼠标指针下的 1x1 像素区域
    // 这样 GPU 只需要跑 1 个像素的片元着色器，速度极快
    this.camera.setViewOffset(
      this.width,
      this.height,
      this.mouse.x * this.pixelRatio,
      this.mouse.y * this.pixelRatio,
      1,
      1
    )

    // 2. 渲染拾取场景到离屏 RenderTarget
    this.renderer.setRenderTarget(this.pickingRenderTarget)
    this.renderer.render(this.pickingScene, this.camera)

    // 3. 读取该像素的颜色
    const pixelBuffer = new Uint8Array(4)
    this.renderer.readRenderTargetPixels(
      this.pickingRenderTarget,
      0,
      0,
      1,
      1,
      pixelBuffer
    )

    // 4. 将 RGB 还原为 ID (与 Three.js Color 的 setHex 逻辑一致)
    const id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | pixelBuffer[2]

    console.log('picked id', id)

    // 5. 5. 交互逻辑
    const mesh = this.idToMesh.get(id)
    // 恢复上一个物体的颜色
    if (this.lastPickedMesh) {
      this.lastPickedMesh.material.emissive?.set(0x000000)
    }
    if (mesh) {
      // 高亮当前物体
      ;(mesh.material as MeshPhongMaterial).emissive.set(0xff0000)
      this.lastPickedMesh = mesh
    }

    // 6. 重置状态
    this.renderer.setRenderTarget(null)
    this.camera.clearViewOffset()
  }

  private addEventListeners() {
    window.addEventListener('pointermove', (e) => {
      this.mouse.x = e.clientX
      this.mouse.y = e.clientY
    })
  }

  addPane() {
    const pane = new Pane({
      title: 'GPU Picking'
    })
    pane.addBinding(this.params, 'rotate')
  }
}

const view = new View('canvas.webgl')
