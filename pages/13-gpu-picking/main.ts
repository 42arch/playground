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
  Mesh,
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
  WebGLRenderTarget,
  BufferAttribute
} from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'

THREE.ColorManagement.enabled = false

class View {
  private width: number
  private height: number
  private canvas: HTMLElement
  private scene: Scene = new Scene()
  private camera: PerspectiveCamera
  private renderer: WebGLRenderer
  private controls: OrbitControls
  private clock: Clock = new Clock()

  private group: Group = new Group() // 视觉组
  private pickingGroup: Group = new Group() // 拾取组
  private pickingScene: Scene = new Scene()
  private pickingRenderTarget: WebGLRenderTarget

  private matrices: Matrix4[] = []
  private highlightMesh: Mesh

  private params = {
    mode: 'Instanced' as 'Instanced' | 'Merged',
    count: 5000,
    rotate: false,
    dist: 30
  }

  private mouse = new Vector2(-1, -1)
  private lastId: number | null = null

  constructor(element: string) {
    this.canvas = document.querySelector(element) as HTMLElement
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.camera = new PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.set(25, 25, 25)

    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(window.devicePixelRatio)

    this.pickingRenderTarget = new WebGLRenderTarget(1, 1, {
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      format: RGBAFormat
    })

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true

    // --- 结构层级 ---
    this.scene.add(this.group)
    this.pickingScene.add(this.pickingGroup)

    // 将高亮 Mesh 添加到 group 中，而不是 scene 中
    // 这样它就会跟随 group 的旋转，坐标系完全一致
    const hGeom = new BoxGeometry(0.55, 0.55, 0.55) // 稍微大一点防止 Z-fighting
    const hMat = new MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      depthTest: true
    })
    this.highlightMesh = new Mesh(hGeom, hMat)
    this.highlightMesh.visible = false
    this.group.add(this.highlightMesh) // 重要：加入 group

    this.addLights()
    this.initScene()
    this.resize()
    this.addEventListeners()
    this.animate()
    this.addPane()
  }

  private addLights() {
    this.scene.add(new AmbientLight(0xffffff, 0.6))
    const sun = new PointLight(0xffffff, 1000)
    sun.position.set(20, 20, 20)
    this.scene.add(sun)
  }

  private initScene() {
    this.group.clear()
    this.pickingGroup.clear()
    this.matrices = []
    this.lastId = null

    // 重新添加高亮 Mesh 到 group（因为 group.clear() 会把它删掉）
    this.highlightMesh.visible = false
    this.group.add(this.highlightMesh)

    if (this.params.mode === 'Instanced') {
      this.addInstanced()
    } else {
      this.addMerged()
    }
  }

  private addInstanced() {
    const geometry = new BoxGeometry(0.5, 0.5, 0.5)
    const visualMesh = new InstancedMesh(
      geometry,
      new MeshPhongMaterial(),
      this.params.count
    )
    const pickingMesh = new InstancedMesh(
      geometry,
      new MeshBasicMaterial(),
      this.params.count
    )

    const matrix = new Matrix4()
    const color = new Color()

    for (let i = 0; i < this.params.count; i++) {
      this.randomizeMatrix(matrix)
      this.matrices.push(matrix.clone())

      visualMesh.setMatrixAt(i, matrix)
      pickingMesh.setMatrixAt(i, matrix)
      visualMesh.setColorAt(i, color.setHSL(Math.random(), 0.7, 0.5))
      pickingMesh.setColorAt(i, color.setHex(i + 1))
    }
    this.group.add(visualMesh)
    this.pickingGroup.add(pickingMesh)
  }

  private addMerged() {
    const geometries: THREE.BufferGeometry[] = []
    const pickingGeometries: THREE.BufferGeometry[] = []

    for (let i = 0; i < this.params.count; i++) {
      const geom = new BoxGeometry(0.5, 0.5, 0.5)
      const matrix = new Matrix4()
      this.randomizeMatrix(matrix)
      this.matrices.push(matrix.clone())

      // Merged 模式下直接变换顶点，但 matrices 依然存的是位置
      geom.applyMatrix4(matrix)
      const vColor = new Color().setHSL(Math.random(), 0.7, 0.5)
      const colors = new Float32Array(geom.attributes.position.count * 3)
      for (let j = 0; j < colors.length; j += 3) {
        colors[j] = vColor.r
        colors[j + 1] = vColor.g
        colors[j + 2] = vColor.b
      }
      geom.setAttribute('color', new BufferAttribute(colors, 3))
      geometries.push(geom)

      const pGeom = geom.clone()
      const pColor = new Color().setHex(i + 1)
      const pColors = new Float32Array(pGeom.attributes.position.count * 3)
      for (let j = 0; j < pColors.length; j += 3) {
        pColors[j] = pColor.r
        pColors[j + 1] = pColor.g
        pColors[j + 2] = pColor.b
      }
      pGeom.setAttribute('color', new BufferAttribute(pColors, 3))
      pickingGeometries.push(pGeom)
    }

    const visualMesh = new Mesh(
      BufferGeometryUtils.mergeGeometries(geometries),
      new MeshPhongMaterial({ vertexColors: true })
    )
    const pickingMesh = new Mesh(
      BufferGeometryUtils.mergeGeometries(pickingGeometries),
      new MeshBasicMaterial({ vertexColors: true })
    )
    this.group.add(visualMesh)
    this.pickingGroup.add(pickingMesh)
  }

  private randomizeMatrix(matrix: Matrix4) {
    const pos = new Vector3(
      (Math.random() - 0.5) * this.params.dist,
      (Math.random() - 0.5) * this.params.dist,
      (Math.random() - 0.5) * this.params.dist
    )
    const rot = new Euler(Math.random(), Math.random(), Math.random())
    matrix.makeRotationFromEuler(rot).setPosition(pos)
  }

  private pick() {
    if (this.mouse.x === -1) return

    this.camera.setViewOffset(
      this.width,
      this.height,
      this.mouse.x,
      this.mouse.y,
      1,
      1
    )
    this.renderer.setRenderTarget(this.pickingRenderTarget)
    this.renderer.render(this.pickingScene, this.camera)

    const buffer = new Uint8Array(4)
    this.renderer.readRenderTargetPixels(
      this.pickingRenderTarget,
      0,
      0,
      1,
      1,
      buffer
    )

    // 关键，颜色转回 id
    const id = (buffer[0] << 16) | (buffer[1] << 8) | buffer[2]
    const instanceId = id - 1

    if (instanceId !== this.lastId) {
      if (instanceId >= 0 && instanceId < this.matrices.length) {
        this.highlightMesh.visible = true

        // 直接应用矩阵
        // 因为 highlightMesh 和原始立方体都在同一个父级 group 下
        // 它们的局部矩阵（Local Matrix）是一一对应的
        const targetMatrix = this.matrices[instanceId]

        // 分解矩阵应用到高亮 Mesh
        targetMatrix.decompose(
          this.highlightMesh.position,
          this.highlightMesh.quaternion,
          this.highlightMesh.scale
        )

        this.lastId = instanceId
      } else {
        this.highlightMesh.visible = false
        this.lastId = null
      }
    }

    this.renderer.setRenderTarget(null)
    this.camera.clearViewOffset()
  }

  private addEventListeners() {
    window.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect()
      this.mouse.x = e.clientX - rect.left
      this.mouse.y = e.clientY - rect.top
    })
  }

  private animate() {
    const delta = this.clock.getDelta()
    if (this.params.rotate) {
      this.group.rotation.y += delta * 0.2
      // 必须确保拾取组旋转完全同步
      this.pickingGroup.rotation.y = this.group.rotation.y
    }

    this.pick()
    this.renderer.render(this.scene, this.camera)
    this.controls.update()
    requestAnimationFrame(() => this.animate())
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

  private addPane() {
    const pane = new Pane({ title: 'GPU Picking Fix' })
    pane
      .addBinding(this.params, 'mode', {
        options: { Instanced: 'Instanced', Merged: 'Merged' }
      })
      .on('change', () => this.initScene())
    pane
      .addBinding(this.params, 'count', { min: 100, max: 20000, step: 100 })
      .on('change', (e) => {
        if (e.last) this.initScene()
      })
    pane
      .addBinding(this.params, 'dist', { min: 10, max: 100, step: 1 })
      .on('change', (e) => {
        if (e.last) this.initScene()
      })
    pane.addBinding(this.params, 'rotate')
  }
}

new View('canvas.webgl')
