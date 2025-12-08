import {
  AmbientLight,
  BackSide,
  Clock,
  Color,
  DirectionalLight,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Spherical,
  SRGBColorSpace,
  TextureLoader,
  Uniform,
  Vector3,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import { Pane } from 'tweakpane'
import earthVertex from './shaders/earth/vertex.glsl'
import earthFragment from './shaders/earth/fragment.glsl'
import atomsphereVertex from './shaders/atomsphere/vertex.glsl'
import atomsphereFragment from './shaders/atomsphere/fragment.glsl'

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

  private sunSpherical: Spherical | null
  private sun: Mesh | null = null
  private earth: Mesh<SphereGeometry, ShaderMaterial> | null = null
  private atomsphere: Mesh<SphereGeometry, ShaderMaterial> | null = null

  private group: Group
  private params: {
    rotate: boolean
    phi: number
    theta: number
    atomsphereDayColor: string
    atomsphereTwilightColor: string
  }

  constructor(element: string) {
    this.canvas = document.querySelector(element) as HTMLElement
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.pixelRatio = Math.min(window.devicePixelRatio, 2)
    this.scene = new Scene()
    this.camera = new PerspectiveCamera(
      25,
      this.width / this.height,
      0.001,
      1000
    )
    this.camera.position.set(12, 5, 4)
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
    this.sunSpherical = null

    this.group = new Group()

    this.params = {
      rotate: false,
      phi: Math.PI * 0.5,
      theta: 0.5,
      atomsphereDayColor: '#00aaff',
      atomsphereTwilightColor: '#ff6600'
    }

    this.resize()
    // this.addLight()
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
      this.renderer.setPixelRatio(this.pixelRatio)
    })
  }

  animate() {
    const delta = this.clock.getDelta()

    if (this.params.rotate) {
      this.group.rotation.y += delta * 0.1
    }

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

  addGroup() {
    this.scene.add(this.group)

    const textureLoader = new TextureLoader()
    const earthDayTexture = textureLoader.load('./textures/day.jpg')
    earthDayTexture.colorSpace = SRGBColorSpace
    earthDayTexture.anisotropy = 8
    const earthNightTexture = textureLoader.load('./textures/night.jpg')
    earthNightTexture.colorSpace = SRGBColorSpace
    earthNightTexture.anisotropy = 8
    const earthCloudTexture = textureLoader.load(
      './textures/specularClouds.jpg'
    )
    // earthCloudTexture.colorSpace = SRGBColorSpace
    earthCloudTexture.anisotropy = 8

    const earthGeometry = new SphereGeometry(2, 64, 64)
    const earthMaterial = new ShaderMaterial({
      vertexShader: earthVertex,
      fragmentShader: earthFragment,
      uniforms: {
        uDayTexture: new Uniform(earthDayTexture),
        uNightTexture: new Uniform(earthNightTexture),
        uCloudTexture: new Uniform(earthCloudTexture),
        uSunDirection: new Uniform(new Vector3()),
        uAtomsphereDayColor: new Uniform(
          new Color(this.params.atomsphereDayColor)
        ),
        uAtomsphereTwilightColor: new Uniform(
          new Color(this.params.atomsphereTwilightColor)
        )
      }
    })
    this.earth = new Mesh(earthGeometry, earthMaterial)
    this.group.add(this.earth)

    // atomsphere
    const atomsphereMaterial = new ShaderMaterial({
      vertexShader: atomsphereVertex,
      fragmentShader: atomsphereFragment,
      uniforms: {
        uSunDirection: new Uniform(new Vector3(0, 0, 1)),
        uAtomsphereDayColor: new Uniform(
          new Color(this.params.atomsphereDayColor)
        ),
        uAtomsphereTwilightColor: new Uniform(
          new Color(this.params.atomsphereTwilightColor)
        )
      },
      side: BackSide,
      transparent: true
    })
    this.atomsphere = new Mesh(earthGeometry, atomsphereMaterial)
    this.atomsphere.scale.set(1.04, 1.04, 1.04)
    this.group.add(this.atomsphere)

    // sun
    this.sunSpherical = new Spherical(1, Math.PI * 0.5, 0.5)

    this.sun = new Mesh(
      new IcosahedronGeometry(0.1, 2),
      new MeshBasicMaterial()
    )
    this.group.add(this.sun)
    this.updateSun()
  }

  updateSun() {
    const sunDirection = new Vector3()
    sunDirection.setFromSpherical(this.sunSpherical!)
    this.sun?.position.copy(sunDirection).multiplyScalar(5)
    this.earth?.material.uniforms.uSunDirection.value.copy(sunDirection)
    this.atomsphere?.material.uniforms.uSunDirection.value.copy(sunDirection)
    this.earth?.material.uniforms.uAtomsphereDayColor.value.set(
      this.params.atomsphereDayColor
    )
    this.earth?.material.uniforms.uAtomsphereTwilightColor.value.set(
      this.params.atomsphereTwilightColor
    )
    this.atomsphere?.material.uniforms.uAtomsphereDayColor.value.set(
      this.params.atomsphereDayColor
    )
    this.atomsphere?.material.uniforms.uAtomsphereTwilightColor.value.set(
      this.params.atomsphereTwilightColor
    )
  }

  addPane() {
    const pane = new Pane({
      title: 'Shader Earth'
    })
    pane.addBinding(this.params, 'atomsphereDayColor', {
      view: 'color'
    })
    pane.addBinding(this.params, 'atomsphereTwilightColor', {
      view: 'color'
    })
    pane.addBinding(this.params, 'rotate')
    pane.addBinding(this.params, 'phi', {
      min: 0,
      max: Math.PI
    })
    pane.addBinding(this.params, 'theta', {
      min: -Math.PI,
      max: Math.PI
    })

    pane.on('change', () => {
      this.sunSpherical!.phi = this.params.phi
      this.sunSpherical!.theta = this.params.theta
      this.updateSun()
    })
  }
}

const view = new View('canvas.webgl')
