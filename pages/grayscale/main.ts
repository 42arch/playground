import {
  AmbientLight,
  AxesHelper,
  Clock,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'
import chessVertex from './shaders/chess/main.vert'
import chessFragment from './shaders/chess/main.frag'
import falloffVertex from './shaders/falloff/main.vert'
import falloffFragment from './shaders/falloff/main.frag'
import noiseVertext from './shaders/noise/main.vert'
import noiseFragment from './shaders/noise/main.frag'

interface Params {
  type: string
  size: number
  cellSize: number
  opacity: number
  falloff: {
    point: {
      x: number
      y: number
    }
  }
  noise: {
    seed: number
    scale: number
  }
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

  createChessMaterial() {
    const size = this.params.size
    const cellSize = this.params.cellSize
    const material = new ShaderMaterial({
      uniforms: {
        uSize: { value: size },
        uCellSize: { value: cellSize },
        uColor1: { value: new Color(0xffffff) },
        uColor2: { value: new Color(0x000000) },
        uOpacity: { value: this.params.opacity }
      },
      vertexShader: chessVertex,
      fragmentShader: chessFragment,
      transparent: true,
      side: DoubleSide
    })

    return material
  }

  createFalloffMaterial() {
    const size = this.params.size
    const cellSize = this.params.cellSize
    const centerPoint = this.params.falloff.point

    const material = new ShaderMaterial({
      uniforms: {
        uSize: { value: size },
        uCellSize: { value: cellSize },
        uPoint: { value: new Vector2(centerPoint.x, centerPoint.y) },
        uColor1: { value: new Color(0xffffff) },
        uColor2: { value: new Color(0x000000) },
        uOpacity: { value: this.params.opacity }
      },
      vertexShader: falloffVertex,
      fragmentShader: falloffFragment,
      transparent: true,
      side: DoubleSide
    })
    return material
  }

  createNoiseMaterial() {
    const size = this.params.size
    const cellSize = this.params.cellSize
    const material = new ShaderMaterial({
      uniforms: {
        uSize: { value: size },
        uSeed: { value: this.params.noise.seed },
        uCellSize: { value: cellSize },
        uOpacity: { value: this.params.opacity },
        uScale: { value: this.params.noise.scale }
      },
      vertexShader: noiseVertext,
      fragmentShader: noiseFragment,
      transparent: true,
      side: DoubleSide
    })
    return material
  }

  addGrid() {
    const type = this.params.type
    const size = this.params.size
    const cellSize = this.params.cellSize

    const geometry = new PlaneGeometry(
      size,
      size,
      size / cellSize,
      size / cellSize
    )
    let material
    switch (type) {
      case 'chess':
        material = this.createChessMaterial()
        break
      case 'falloff':
        material = this.createFalloffMaterial()
        break
      case 'noise':
        material = this.createNoiseMaterial()
        break
      default:
        break
    }
    const mesh = new Mesh(geometry, material)

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
  type: 'chess',
  size: 1000,
  cellSize: 10,
  opacity: 0.5,
  falloff: {
    point: {
      x: 0,
      y: 0
    }
  },
  noise: {
    seed: 1,
    scale: 0.01
  }
}
const types = ['chess', 'falloff', 'noise', 'fbm'].map((i) => {
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
common.addBinding(params, 'opacity', {
  min: 0,
  max: 1,
  step: 0.01
})

const tab = pane
  .addTab({
    pages: types
  })
  .on('select', (e) => {
    params.type = types[e.index].title
    view.rerender(params)
  })

tab.pages[1].addBinding(params.falloff, 'point', {
  x: {
    min: -params.size / 2,
    max: params.size / 2,
    step: 1
  },
  y: {
    min: -params.size / 2,
    max: params.size / 2,
    step: 1
  }
})

tab.pages[2].addBinding(params.noise, 'seed', {
  min: 0,
  max: 100,
  step: 1
})
tab.pages[2].addBinding(params.noise, 'scale', {
  min: 0,
  max: 0.1,
  step: 0.001
})

pane.on('change', (e) => {
  if (e.last) {
    view.rerender(params)
  }
})
