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
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'

interface Params {
  type: string
  size: number
  cellSize: number
  falloff: {
    point: {
      x: number
      y: number
    }
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
        uColor2: { value: new Color(0x000000) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uSize;
        uniform float uCellSize;
        uniform vec3 uColor1;
        uniform vec3 uColor2;

        void main() {
          // 把[0, 1]的uv坐标转换为[-0.5, 0.5]再乘以总大小，得到世界坐标
          vec2 pos = (vUv - 0.5) * uSize;
          // 通过除以cellSize得到网格坐标（在第几个格子）
          vec2 cell = floor(pos / uCellSize);
          // 根据横纵坐标之和的奇偶性来判断是黑白棋盘
          float pattern = mod(cell.x + cell.y, 2.0);
          // pattern小于0.5时，使用uColor1，否则使用uColor2：
          // step函数阈值为0.5，小于阈值返回0，大于阈值返回1，
          // mix函数根据pattern的值来插值，混合因子要么是0，要么是1，所以颜色值要么是uColor1，要么是uColor2
          vec3 color = mix(uColor1, uColor2, step(0.5, pattern));

          gl_FragColor = vec4(color, 0.5);
        }
      `,
      transparent: true,
      side: DoubleSide
    })

    return material
  }

  createFalloffMaterial() {
    const size = this.params.size
    const cellSize = this.params.cellSize
    const centerPoint = this.params.falloff.point

    console.log('center', centerPoint)

    const material = new ShaderMaterial({
      uniforms: {
        uSize: { value: size },
        uCellSize: { value: cellSize },
        uPoint: { value: new Vector2(centerPoint.x, centerPoint.y) },
        uColor1: { value: new Color(0xffffff) },
        uColor2: { value: new Color(0x000000) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uSize;
        uniform float uCellSize;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec2 uPoint;

        void main() {
          vec2 pos = (vUv - 0.5) * uSize;
          vec2 cell = floor(pos / uCellSize);

          // 计算每个格子的中心坐标（以格子坐标为单位）
          vec2 cellCenter = (cell + 0.5) * uCellSize;

          // 距离棋盘中心 (0, 0) 的距离
          // float dist = length(cellCenter);
          float dist = distance(cellCenter, uPoint);

          // 最大可能的距离（在角落处）
          // float maxDist = length(vec2(uSize, uSize) * 0.5);
          float maxDist = distance(vec2(uSize, uSize) * 0.5, uPoint);

          // 归一化到 0~1
          float t = pow(clamp(dist / maxDist, 0.0, 1.0), 0.5);

          vec3 color = mix(uColor1, uColor2, t);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
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
      default:
        break
    }
    // const material = this.createChessMaterial()
    // const material = this.createFalloffMaterial()
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
  type: 'noise',
  size: 1000,
  cellSize: 10,
  falloff: {
    point: {
      x: 0,
      y: 0
    }
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

pane.on('change', (e) => {
  if (e.last) {
    view.rerender(params)
  }
})
