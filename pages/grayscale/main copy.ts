import {
  AmbientLight,
  AxesHelper,
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'

interface Params {
  type: string
  size: number
  cellSize: number
}

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
  private params: Params

  constructor(element: string, params: Params) {
    this.canvas = document.querySelector(element) as HTMLElement
    this.params = params
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.pixelRatio = Math.min(window.devicePixelRatio, 2)
    this.scene = new Scene()
    this.camera = new PerspectiveCamera(
      75,
      this.width / this.height,
      0.001,
      10000
    )
    this.camera.position.set(0, 0, this.params.size)
    this.scene.add(this.camera)
    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    })

    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(this.pixelRatio)

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.clock = new Clock()

    this.group = new Group()
    this.scene.add(this.group)

    this.resize()
    this.addLight()
    this.render()
    this.animate()
  }

  resize() {
    window.addEventListener('resize', () => {
      this.width = window.innerWidth
      this.height = window.innerHeight

      this.camera.aspect = this.width / this.height
      this.camera.updateProjectionMatrix()

      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(this.pixelRatio)
    })
  }

  animate() {
    const delta = this.clock.getDelta()

    this.renderer.render(this.scene, this.camera)
    this.controls.update()
    window.requestAnimationFrame(this.animate.bind(this))
  }

  addLight() {
    const ambientLight = new AmbientLight(0xffffff, 4)
    this.scene.add(ambientLight)

    const directionalLight = new DirectionalLight(0xffffff, Math.PI)
    directionalLight.position.set(4, 0, 2)
    directionalLight.castShadow = true
    this.scene.add(directionalLight)
  }

  addHelper() {
    const helper = new AxesHelper((this.params.size * 2) / 3)
    this.scene.add(helper)
  }

  addGrid() {
    const type = this.params.type
    const size = this.params.size
    const cellSize = this.params.cellSize
    const cellCount = size / cellSize
    const totalSize = cellCount * cellCount

    const geometry = new PlaneGeometry(cellSize, cellSize, cellCount, cellCount)
    const material = new MeshBasicMaterial({
      side: DoubleSide,
      transparent: true,
      opacity: 0.3
    })

    const mesh = new InstancedMesh(geometry, material, totalSize)
    const dummy = new Object3D()
    const color = new Color()
    const colorArray = new Float32Array(totalSize * 3)

    let index = 0
    for (let x = 0; x < cellCount; x++) {
      for (let y = 0; y < cellCount; y++) {
        const nx = x * cellSize - size / 2 + cellSize / 2
        const ny = y * cellSize - size / 2 + cellSize / 2

        dummy.position.set(nx, ny, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(index, dummy.matrix)
        const isWhite = (x + y) % 2 === 0
        color.set(isWhite ? 0xffffff : 0x000000)
        colorArray[index * 3] = color.r
        colorArray[index * 3 + 1] = color.g
        colorArray[index * 3 + 2] = color.b
        index++
      }
    }

    mesh.instanceColor = new InstancedBufferAttribute(colorArray, 3)
    this.group.add(mesh)
  }

  render() {
    this.addHelper()
    this.addGrid()
  }

  rerender(params: Params) {
    this.params = params
    this.group.clear()
    this.camera.position.set(0, 0, this.params.size)
    this.render()
  }
}

const params: Params = {
  type: 'noise',
  size: 100,
  cellSize: 10
}
const types = ['chess', 'noise', 'fbm', 'falloff'].map((i) => {
  return {
    title: i
  }
})

const view = new View('canvas.webgl', params)

const pane = new Pane({
  title: 'greyscale'
})

const common = pane.addFolder({
  title: 'common'
})

common.addBinding(params, 'cellSize', {
  min: 2,
  max: 40,
  step: 2
})
common.addBinding(params, 'size', {
  min: 80,
  max: 1000,
  step: 20
})

pane
  .addTab({
    pages: types
  })
  .on('select', (e) => {
    console.log('tab', types[e.index].title)
    params.type = types[e.index].title
    view.rerender(params)
  })

pane.on('change', (e) => {
  if (e.last) {
    view.rerender(params)
  }
})
