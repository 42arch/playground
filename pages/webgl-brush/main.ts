import {
  Camera,
  Geometry,
  Mesh,
  OGLRenderingContext,
  Program,
  Renderer,
  Transform
} from 'ogl'
import { Pane } from 'tweakpane'

interface Params {
  radius: number
  opacity: number
  sharpness: number
  color: string
}

class Brush {
  private dom: HTMLDivElement
  private width: number = 0
  private height: number = 0
  private renderer: Renderer
  private gl: OGLRenderingContext
  private camera: Camera
  private scene: Transform
  private handler: Program
  private dpr: number = 2
  private isDrawing: boolean = false
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
      far: 1000
    })
    this.camera.position.z = 3
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
      this.dpr = Math.min(window.devicePixelRatio, 2)

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

  setup() {
    this.bindEvents()
  }

  bindEvents() {
    this.dom.addEventListener('mousedown', () => {
      this.isDrawing = true
    })
    this.dom.addEventListener('mouseup', () => {
      this.isDrawing = false
    })
    this.dom.addEventListener('mouseleave', () => {
      this.isDrawing = false
    })
    this.dom.addEventListener('mousemove', (e) => {
      const rect = this.dom.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = this.height - (e.clientY - rect.top)
      this.draw([x, y])
    })
  }

  draw(position: [number, number]) {
    if (!this.isDrawing) return
    const gl = this.gl
    const geometry = this.createCircleGeometry()
    this.handler = new Program(gl, {
      vertex: `
        attribute vec2 position;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        uniform vec2 uMouse;
        uniform float uRadius;
        uniform float uOpacity;
        varying float vOpacity;
        uniform vec4 uColor;

        varying vec2 vLocalPos;

        void main() {
          float distance = length(position);
          vOpacity = uOpacity;
          vLocalPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position + uMouse, 0.0, 1.0);
        }
      `,
      fragment: `
        precision highp float;
        varying float vOpacity;
        varying vec2 vLocalPos;
        void main() {
          float distance = length(vLocalPos);
          float alpha = smoothstep(uRadius, uRadius - 1.0, distance);
          gl_FragColor = vec4(0.0941, 0.0431, 0.5725, vOpacity * alpha);
        }
      `,
      uniforms: {
        uMouse: {
          value: position
        },
        uRadius: {
          value: this.params.radius
        },
        uOpacity: {
          value: this.params.opacity
        },
        uColor: {
          value: this.params.color
        }
      },
      transparent: true
    })
    gl.enable(gl.BLEND)
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    const mesh = new Mesh(gl, {
      geometry,
      program: this.handler,
      mode: gl.TRIANGLE_FAN
    })
    mesh.setParent(this.scene)
  }

  createCircleGeometry() {
    const radius = 15,
      segments = 64
    const positions = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      positions.push([Math.cos(angle) * radius, Math.sin(angle) * radius])
    }

    const geometry = new Geometry(this.gl, {
      position: {
        size: 2,
        data: new Float32Array(positions.flat())
      }
    })
    return geometry
  }

  update(params: Params) {
    this.params = params
    this.handler.uniforms.uOpacity.value = params.opacity
  }
}

const params: Params = {
  radius: 15,
  opacity: 0.3,
  color: '#000000',
  sharpness: 1
}

const brush = new Brush(
  document.getElementById('demo') as HTMLDivElement,
  params
)

const pane = new Pane({
  title: 'WebGL Brush'
})
pane.addBinding(params, 'radius', {
  min: 1,
  max: 30,
  step: 1
})

pane
  .addBinding(params, 'opacity', {
    min: 0,
    max: 1,
    step: 0.01
  })
  .on('change', (e) => {
    if (e.last) {
      // console.log('opacity', e)
      brush.update(params)
    }
  })

pane.addBinding(params, 'sharpness', {
  min: 1,
  max: 10,
  step: 1
})

pane
  .addBinding(params, 'color', {
    view: 'color'
  })
  .on('change', (e) => {
    // brush.update(params)
    if (e.last) {
      console.log('color', e)
    }
  })
