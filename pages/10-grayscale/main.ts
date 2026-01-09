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
import chessboardVertex from './shaders/chessboard/main.vert'
import chessboardFragment from './shaders/chessboard/main.frag'
import falloffVertex from './shaders/falloff/main.vert'
import falloffFragment from './shaders/falloff/main.frag'
import multiFalloffVertex from './shaders/multi-falloff/main.vert'
import multiFalloffFragment from './shaders/multi-falloff/main.frag'
import randomVertex from './shaders/random/main.vert'
import randomFragment from './shaders/random/main.frag'
import noiseVertex from './shaders/noise/main.vert'
import noiseFragment from './shaders/noise/main.frag'
import fbmVertex from './shaders/fbm/main.vert'
import fbmFragement from './shaders/fbm/main.frag'

enum Type {
  Chessboard = 'chessboard',
  Falloff = 'falloff',
  MultiFalloff = 'multi-falloff',
  Random = 'random',
  Noise = 'noise',
  FBM = 'fbm'
}

type Point = {
  x: number
  y: number
}

interface Params {
  type: Type
  size: number
  cellSize: number
  opacity: number
  axes: boolean
  falloff: {
    point: Point
  }
  multiFalloff: {
    points: Point[]
  }
  noise: {
    seed: number
    scale: number
  }
  fbm: {
    seed: number
    scale: number
    octaves: number
    lacunarity: number
    persistance: number
    redistribution: number
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
    this.group.add(helper)
  }

  createChessboardMaterial() {
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
      vertexShader: chessboardVertex,
      fragmentShader: chessboardFragment,
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

  createMultiFalloffMaterial() {
    const size = this.params.size
    const cellSize = this.params.cellSize
    const points = this.params.multiFalloff.points.map(
      (p) => new Vector2(p.x, p.y)
    )

    const material = new ShaderMaterial({
      uniforms: {
        uSize: { value: size },
        uCellSize: { value: cellSize },
        uPoints: { value: points },
        uColor1: { value: new Color(0xffffff) },
        uColor2: { value: new Color(0x000000) },
        uOpacity: { value: this.params.opacity }
      },
      vertexShader: multiFalloffVertex,
      fragmentShader: multiFalloffFragment,
      transparent: true,
      side: DoubleSide
    })
    return material
  }

  createRandomMaterial() {
    const size = this.params.size
    const cellSize = this.params.cellSize
    const material = new ShaderMaterial({
      uniforms: {
        uSize: { value: size },
        uCellSize: { value: cellSize },
        uRandom: { value: Math.random() },
        uOpacity: { value: this.params.opacity }
      },
      vertexShader: randomVertex,
      fragmentShader: randomFragment,
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
      vertexShader: noiseVertex,
      fragmentShader: noiseFragment,
      transparent: true,
      side: DoubleSide
    })
    return material
  }

  createFbmMaterial() {
    const size = this.params.size
    const cellSize = this.params.cellSize
    const material = new ShaderMaterial({
      uniforms: {
        uSize: { value: size },
        uCellSize: { value: cellSize },
        uOpacity: { value: this.params.opacity },
        uSeed: { value: this.params.fbm.seed },
        uScale: { value: this.params.fbm.scale },
        uOctaves: { value: this.params.fbm.octaves },
        uLacunarity: { value: this.params.fbm.lacunarity },
        uPersistance: { value: this.params.fbm.persistance },
        uRedistribution: { value: this.params.fbm.redistribution }
      },
      vertexShader: fbmVertex,
      fragmentShader: fbmFragement,
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
      case Type.Chessboard:
        material = this.createChessboardMaterial()
        break
      case Type.Falloff:
        material = this.createFalloffMaterial()
        break
      case Type.MultiFalloff:
        material = this.createMultiFalloffMaterial()
        break
      case Type.Random:
        material = this.createRandomMaterial()
        break
      case Type.Noise:
        material = this.createNoiseMaterial()
        break
      case Type.FBM:
        material = this.createFbmMaterial()
        break
      default:
        break
    }
    const mesh = new Mesh(geometry, material)

    this.group.add(mesh)
  }

  render() {
    if (this.params.axes) {
      this.addHelper()
    }
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
  type: Type.Chessboard,
  size: 1000,
  cellSize: 10,
  opacity: 0.5,
  axes: false,
  falloff: {
    point: {
      x: 0,
      y: 0
    }
  },
  multiFalloff: {
    points: [
      {
        x: 0,
        y: 0
      },
      {
        x: 200,
        y: 210
      },
      {
        x: -200,
        y: -210
      }
    ]
  },
  noise: {
    seed: 1,
    scale: 0.01
  },
  fbm: {
    seed: 1,
    scale: 0.01,
    octaves: 6,
    persistance: 0.5,
    lacunarity: 2,
    redistribution: 1
  }
}

const view = new View('canvas.webgl', params)

const pane = new Pane({
  title: `greyscale-${params.type}`
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
common.addBinding(params, 'axes')

const types = [
  Type.Chessboard,
  Type.Falloff,
  Type.MultiFalloff,
  Type.Random,
  Type.Noise,
  Type.FBM
].map((i) => {
  return {
    title: i
  }
})

const tab = pane
  .addTab({
    pages: types
  })
  .on('select', (e) => {
    params.type = types[e.index].title
    view.rerender(params)
    pane.title = `greyscale-${params.type}`
  })

tab.pages[1].addBinding(params.falloff, 'point', {
  x: {
    min: -params.size / 2,
    max: params.size / 2,
    step: 1,
    inverted: true
  },
  y: {
    min: -params.size / 2,
    max: params.size / 2,
    step: 1,
    inverted: true
  }
})

const multiPoints: Record<string, Point> = {}
params.multiFalloff.points.forEach((p, index) => {
  multiPoints[`point-${index + 1}`] = p
})

Object.keys(multiPoints).forEach((key) => {
  tab.pages[2]
    .addBinding(multiPoints, key, {
      x: {
        min: -params.size / 2,
        max: params.size / 2,
        step: 1,
        inverted: true
      },
      y: {
        min: -params.size / 2,
        max: params.size / 2,
        step: 1,
        inverted: true
      }
    })
    .on('change', (e) => {
      if (e.last) {
        params.multiFalloff.points = Object.values(multiPoints)
      }
    })
})

// tab.pages[2].addBinding(params.multiFalloff, 'point', {
//   x: {
//     min: -params.size / 2,
//     max: params.size / 2,
//     step: 1,
//     inverted: true
//   },
//   y: {
//     min: -params.size / 2,
//     max: params.size / 2,
//     step: 1,
//     inverted: true
//   }
// })

tab.pages[3]
  .addButton({
    title: 'random'
  })
  .on('click', () => {
    view.rerender(params)
  })

tab.pages[4].addBinding(params.noise, 'seed', {
  min: 0,
  max: 100,
  step: 1
})
tab.pages[4].addBinding(params.noise, 'scale', {
  min: 0,
  max: 0.1,
  step: 0.001
})

tab.pages[5].addBinding(params.fbm, 'seed', {
  min: 0,
  max: 100,
  step: 1
})
tab.pages[5].addBinding(params.fbm, 'scale', {
  min: 0,
  max: 0.1,
  step: 0.001
})
tab.pages[5].addBinding(params.fbm, 'octaves', {
  min: 1,
  max: 12,
  step: 1
})
tab.pages[5].addBinding(params.fbm, 'persistance', {
  min: 0.1,
  max: 2,
  step: 0.1
})
tab.pages[5].addBinding(params.fbm, 'lacunarity', {
  min: 0.1,
  max: 8,
  step: 0.1
})
tab.pages[5].addBinding(params.fbm, 'redistribution', {
  min: 1,
  max: 8,
  step: 1
})

pane.on('change', (e) => {
  if (e.last) {
    view.rerender(params)
  }
})
