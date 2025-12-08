import {
  Camera,
  Geometry,
  Mesh,
  OGLRenderingContext,
  Plane,
  Program,
  Renderer,
  Texture,
  Transform
} from 'ogl'
import { Pane } from 'tweakpane'
import vertex from './main.vert'
import fragment from './main.frag'

interface Params {
  opacity: number
}

class GLFilter {
  private dom: HTMLDivElement
  private width: number = 0
  private height: number = 0
  private imageWidth: number = 0
  private imageHeight: number = 0
  private renderer: Renderer
  private gl: OGLRenderingContext
  private camera: Camera
  private scene: Transform
  private dpr: number = 1
  private mesh: Mesh
  private params: Params

  constructor(dom: HTMLDivElement, params: Params) {
    this.dom = dom
    this.params = params

    this.renderer = new Renderer({
      antialias: true
    })

    this.gl = this.renderer.gl

    this.camera = new Camera(this.gl, {
      near: 0.1,
      far: 10000
    })
    this.camera.position.z = 100
    this.camera.lookAt([0, 0, 0])

    this.resize()
    this.gl.clearColor(1, 1, 1, 0)
    this.dom.appendChild(this.gl.canvas)

    this.scene = new Transform()

    this.animate()

    this.setup()
  }

  resize() {
    const _resize = () => {
      this.width = this.dom.clientWidth
      this.height = this.dom.clientHeight
      // this.dpr = Math.min(window.devicePixelRatio, 2)

      this.renderer.dpr = this.dpr
      this.renderer.setSize(this.width, this.height)

      this.camera.orthographic({
        left: 0,
        right: this.width,
        top: this.height,
        bottom: 0
      })
    }
    window.addEventListener('resize', _resize, false)
    _resize()
  }

  animate() {
    const _animate = (t: number) => {
      requestAnimationFrame(_animate)
      this.renderer.render({ scene: this.scene, camera: this.camera })
    }
    requestAnimationFrame(_animate)
  }

  async loadImage(
    url: string
  ): Promise<{ texture: Texture; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const gl = this.gl
      const texture = new Texture(gl, {
        wrapS: gl.CLAMP_TO_EDGE,
        wrapT: gl.CLAMP_TO_EDGE,
        minFilter: gl.LINEAR,
        magFilter: gl.LINEAR
      })
      const img = new Image()
      img.src = url
      img.onload = () => {
        texture.image = img
        this.imageHeight = img.naturalHeight
        this.imageWidth = img.naturalWidth
        // console.log(img, texture, texture.width, texture.height)
        resolve({
          texture,
          width: img.naturalWidth,
          height: img.naturalHeight
        })
        this.resize()
      }
    })
  }

  updateMeshUVs() {
    const gl = this.gl
    const screenAspect = gl.canvas.width / gl.canvas.height
    const imageAspect = this.imageWidth / this.imageHeight
    let scaleX = 1
    let scaleY = 1

    if (imageAspect > screenAspect) {
      scaleX = 1
      scaleY = screenAspect / imageAspect
    } else {
      scaleX = imageAspect / screenAspect
      scaleY = 1
    }

    console.log(22223, scaleX, scaleY)

    this.mesh.scale.set(scaleX, scaleY, 1)
  }

  async setup() {
    const gl = this.gl
    const { texture, width, height } = await this.loadImage('./images/cat.jpg')

    console.log(width, height, texture)

    const program = new Program(gl, {
      vertex: /* glsl */ `
        attribute vec2 uv;
        attribute vec3 position;
        uniform mat4 modelMatrix;
        uniform mat4 viewMatrix;
        uniform mat4 projectionMatrix;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
      `,
      fragment: /* glsl */ `
        precision highp float;
        uniform sampler2D tMap;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(tMap, vUv);
        }
      `,
      uniforms: {
        tMap: { value: texture }
      }
    })

    const geometry = new Plane(gl, {
      width,
      height
    })
    const mesh = new Mesh(gl, { geometry, program })
    this.mesh = mesh
    mesh.setParent(this.scene)

    // 3. 计算并调整 UV 坐标
    const planeAspect = 1.0 // 默认 Plane 几何体是 1x1
    const imageAspect = width / height

    let scaleX = 1
    let scaleY = 1

    if (imageAspect > planeAspect) {
      scaleX = planeAspect / imageAspect
    } else {
      scaleY = imageAspect / planeAspect
    }

    const uvBuffer = geometry.attributes.uv
    const uv = uvBuffer.data
    if (uv) {
      for (let i = 0; i < uv.length; i += 2) {
        const u = uv[i]
        const v = uv[i + 1]

        const scaledU = (u - 0.5) * scaleX + 0.5
        const scaledV = (v - 0.5) * scaleY + 0.5

        uv[i] = scaledU
        uv[i + 1] = scaledV
      }
    }
    uvBuffer.needsUpdate = true
  }
}

const params: Params = {
  opacity: 0.3
}

const glFilter = new GLFilter(
  document.getElementById('demo') as HTMLDivElement,
  params
)

// const pane = new Pane({
//   title: 'WebGL Brush'
// })

// pane.addBinding(params, 'opacity', {
//   min: 0,
//   max: 1,
//   step: 0.01
// })
