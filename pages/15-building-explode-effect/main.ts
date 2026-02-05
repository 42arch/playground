import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  FrontSide,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Scene,
  Vector3,
  WebGLRenderer
} from 'three'
import { OrbitControls } from 'three/examples/jsm/Addons.js'
import gsap from 'gsap'
import { Pane } from 'tweakpane'

interface Params {
  viewMode: 'Transparent' | 'Solid'
  explode: number
  floorSelect: number
}

class View {
  private width: number
  private height: number
  private canvas: HTMLElement
  private scene: Scene = new Scene()
  private camera!: PerspectiveCamera
  private renderer!: WebGLRenderer
  private controls!: OrbitControls
  private pane!: Pane

  private floors: Group[] = []
  private config: any
  private materials: any

  private params: Params = {
    viewMode: 'Transparent',
    explode: 0,
    floorSelect: -1
  }

  constructor(element: string) {
    this.canvas = document.querySelector(element) as HTMLElement
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.floors = []

    this.config = {
      floorCount: 8,
      floorHeight: 4,
      floorSize: { x: 40, z: 25 },
      spacing: 10,
      colors: {
        wallTransparent: 0xaaccff,
        wallOpaque: 0xdddddd,
        floor: 0x223344,
        highlight: 0x00f0ff
      }
    }

    this.materials = {
      glass: new MeshPhysicalMaterial({
        color: this.config.colors.wallTransparent,
        transparent: true,
        opacity: 0.15,
        transmission: 0.6,
        roughness: 0.1,
        metalness: 0.1,
        side: DoubleSide,
        depthWrite: false
      }),
      solidWall: new MeshStandardMaterial({
        color: this.config.colors.wallOpaque,
        roughness: 0.8,
        metalness: 0.2,
        side: FrontSide,
        transparent: true
      }),
      slab: new MeshStandardMaterial({
        color: this.config.colors.floor,
        roughness: 0.2,
        metalness: 0.5,
        side: FrontSide,
        transparent: true
      }),
      edge: new LineBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.4,
        polygonOffset: true,
        polygonOffsetFactor: -2.0,
        polygonOffsetUnits: -10.0
      })
    }

    this.addLights()
    this.initScene()
    this.generateBuilding()
    this.resize()
    this.animate()
    this.addPane()
  }

  private updateExplode() {
    this.floors.forEach((floor, index) => {
      const targetY =
        floor.userData.originalY +
        index * this.params.explode * this.config.spacing
      gsap.to(floor.position, {
        y: targetY,
        duration: 0.8,
        ease: 'power2.out'
      })
    })
  }

  private updateViewMode() {
    const isTransparent = this.params.viewMode === 'Transparent'
    this.floors.forEach((floor) => {
      const wall = floor.getObjectByName('ExteriorWall') as Mesh
      if (wall) {
        wall.material = (
          isTransparent ? this.materials.glass : this.materials.solidWall
        ).clone()
        // Reset opacity to current state (either selected or faded)
        const isSelected = floor.userData.id === this.params.floorSelect
        const isNoneSelected = this.params.floorSelect === -1
        wall.material.opacity =
          isSelected || isNoneSelected ? (isTransparent ? 0.15 : 1) : 0.05
      }
    })
  }

  private selectFloor(id: number) {
    this.floors.forEach((floor) => {
      const isSelected = floor.userData.id === id
      const isNoneSelected = id === -1

      gsap.to(floor.scale, {
        x: isSelected || isNoneSelected ? 1 : 0.8,
        y: isSelected || isNoneSelected ? 1 : 0.8,
        z: isSelected || isNoneSelected ? 1 : 0.8,
        duration: 0.5
      })

      floor.traverse((child: any) => {
        if (child.isMesh) {
          gsap.to(child.material, {
            opacity:
              isSelected || isNoneSelected
                ? child.material.transparent
                  ? child.name === 'ExteriorWall'
                    ? 0.15
                    : 0.3
                  : 1
                : 0.05,
            duration: 0.5
          })
        }
      })

      if (isSelected) {
        const targetPos = new Vector3(0, floor.position.y, 0)
        // 拉近视角
        gsap.to(this.camera.position, {
          x: 40,
          y: floor.position.y + 30,
          z: 40,
          duration: 1.2,
          ease: 'power2.inOut'
        })
        gsap.to(this.controls.target, {
          x: targetPos.x,
          y: targetPos.y,
          z: targetPos.z,
          duration: 1.2,
          ease: 'power2.inOut',
          onUpdate: () => {
            this.controls.update()
          }
        })
      }
    })

    if (id === -1) {
      // 恢复初始视角
      gsap.to(this.camera.position, {
        x: 60,
        y: 60,
        z: 60,
        duration: 1.2,
        ease: 'power2.inOut'
      })
      gsap.to(this.controls.target, {
        x: 0,
        y: (this.config.floorCount * this.config.floorHeight) / 2,
        z: 0,
        duration: 1.2,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.controls.update()
        }
      })
    }
  }

  private addLights() {
    this.scene.add(new AmbientLight(0x404040, 1.0))

    const dirLight = new DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(50, 80, 50)
    dirLight.castShadow = true

    // 调整阴影相机范围以覆盖整个楼宇
    dirLight.shadow.camera.left = -60
    dirLight.shadow.camera.right = 60
    dirLight.shadow.camera.top = 60
    dirLight.shadow.camera.bottom = -60
    dirLight.shadow.camera.near = 1
    dirLight.shadow.camera.far = 200
    dirLight.shadow.mapSize.set(2048, 2048)
    dirLight.shadow.bias = -0.0005

    this.scene.add(dirLight)

    const pointLight = new PointLight(0x00f0ff, 0.5, 100)
    pointLight.position.set(-30, 20, -30)
    this.scene.add(pointLight)
  }

  private initScene() {
    this.scene.background = new Color(0x0a0a12)

    const gridHelper = new GridHelper(200, 30, 0x1a1a2e, 0x1a1a2e)
    this.scene.add(gridHelper)

    // 添加地面接收阴影
    const groundGeo = new PlaneGeometry(400, 400)
    const groundMat = new MeshStandardMaterial({
      color: 0x0a0a12,
      roughness: 1,
      metalness: 0
    })
    const ground = new Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = -0.3
    ground.receiveShadow = true
    this.scene.add(ground)

    this.camera = new PerspectiveCamera(75, this.width / this.height, 0.1, 1000)
    this.camera.position.set(60, 60, 60)

    this.renderer = new WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.maxPolarAngle = Math.PI * 0.5 - 0.05
    this.controls.target.set(
      0,
      (this.config.floorCount * this.config.floorHeight) / 2,
      0
    )
  }

  private generateBuilding() {
    const { floorCount, floorHeight, floorSize } = this.config

    // 增加一个总的楼层循环，最后补一个顶板
    for (let i = 0; i <= floorCount; i++) {
      const isRoof = i === floorCount

      const floorGroup = new Group()
      floorGroup.userData = {
        id: i,
        isFloor: !isRoof,
        originalY: i * floorHeight
      }

      // 楼板 slab (顶层只加楼板作为屋顶)
      const slabGeo = new BoxGeometry(floorSize.x, 0.5, floorSize.z)
      const slabMat = this.materials.slab.clone()
      // 为楼板增加偏移防止与线闪烁
      slabMat.polygonOffset = true
      slabMat.polygonOffsetFactor = 1
      slabMat.polygonOffsetUnits = 1

      const slab = new Mesh(slabGeo, slabMat)
      slab.castShadow = true
      slab.receiveShadow = true
      floorGroup.add(slab)

      const edges = new EdgesGeometry(slabGeo)
      const line = new LineSegments(edges, this.materials.edge)
      floorGroup.add(line)

      if (!isRoof) {
        // 外墙 wall - 增大垂直间隙以消除 Z-fighting
        const pureWallHeight = floorHeight - 0.5 - 0.1 // 间隙从 0.02 增大到 0.1
        const wallGeo = new BoxGeometry(
          floorSize.x - 0.2,
          pureWallHeight,
          floorSize.z - 0.2
        )
        const wallMat = this.materials.glass.clone()
        wallMat.polygonOffset = true
        wallMat.polygonOffsetFactor = 1
        wallMat.polygonOffsetUnits = 1

        const walls = new Mesh(wallGeo, wallMat)
        walls.name = 'ExteriorWall'
        walls.position.y = 0.3 + pureWallHeight / 2 // 起始 Y 从 0.26 移至 0.3
        walls.castShadow = false
        walls.receiveShadow = true
        floorGroup.add(walls)

        this.generateRealInterior(floorGroup, floorSize, pureWallHeight)
      }

      floorGroup.position.y = i * floorHeight
      this.scene.add(floorGroup)
      this.floors.push(floorGroup)
    }
  }

  private generateRealInterior(group: Group, size: Vector3, height: number) {
    const halfX = size.x / 2

    const halfZ = size.z / 2

    const coreSizeX = 8

    const coreSizeZ = 6

    // Core structure

    const coreMat = new MeshLambertMaterial({
      color: 0x556677,

      transparent: true
    })

    coreMat.polygonOffset = true

    coreMat.polygonOffsetFactor = 1

    coreMat.polygonOffsetUnits = 1

    const core = new Mesh(
      new BoxGeometry(coreSizeX, height, coreSizeZ),
      coreMat
    )

    core.position.y = 0.3 + height / 2

    core.castShadow = true

    core.receiveShadow = true

    group.add(core)

    const colGeo = new BoxGeometry(0.8, height, 0.8)

    const colMat = new MeshLambertMaterial({
      color: 0x444444,

      transparent: true,

      polygonOffset: true,

      polygonOffsetFactor: 1,

      polygonOffsetUnits: 1
    })

    for (let x = -halfX + 2; x <= halfX - 2; x += 12) {
      for (let z = -halfZ + 2; z <= halfZ - 2; z += 10) {
        if (Math.abs(x) < coreSizeX / 2 + 1 && Math.abs(z) < coreSizeZ / 2 + 1)
          continue

        const col = new Mesh(colGeo, colMat)

        col.position.set(x, 0.3 + height / 2, z)

        col.castShadow = true

        col.receiveShadow = true

        group.add(col)
      }
    }

    // Offices / Rooms

    const deskGeo = new BoxGeometry(2, 1.2, 1.4)

    const deskMat = new MeshLambertMaterial({
      color: 0x223344,

      transparent: true
    })
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const x = -halfX + 4 + c * 3.5
        const z = -halfZ + 4 + r * 3
        if (x > -coreSizeX / 2 - 2) break
        const desk = new Mesh(deskGeo, deskMat)
        desk.position.set(x, 0.85, z)
        group.add(desk)
      }
    }

    this.createRoom(
      group,
      new Vector3(halfX - 6, 0.26 + height / 2, -halfZ + 4),
      new Vector3(10, height, 6),
      0x4caf50
    )
    this.createRoom(
      group,
      new Vector3(halfX - 5, 0.26 + height / 2, halfZ - 5),
      new Vector3(8, height, 8),
      0xff9800
    )
  }

  private createRoom(
    group: Group,
    pos: Vector3,
    size: Vector3,
    colorHex: number
  ) {
    const floorMat = new MeshBasicMaterial({
      color: colorHex,
      opacity: 0.3,
      transparent: true,
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1, // 稍微拉近一点点
      polygonOffsetUnits: -1
    })
    const floor = new Mesh(
      new PlaneGeometry(size.x - 0.5, size.z - 0.5),
      floorMat
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(pos.x, 0.35, pos.z) // 高于 slab 顶部的 0.25
    group.add(floor)

    const roomEdges = new EdgesGeometry(
      new BoxGeometry(size.x, size.y * 0.8, size.z)
    )
    const lineMat = new LineBasicMaterial({
      color: 0xffffff,
      opacity: 0.2,
      transparent: true
    })
    const roomLines = new LineSegments(roomEdges, lineMat)
    roomLines.position.set(pos.x, pos.y, pos.z)
    group.add(roomLines)
  }

  private animate() {
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
    this.pane = new Pane({ title: 'Building Explode Effect' })
    const fView = this.pane.addFolder({ title: 'View Settings' })

    fView
      .addBinding(this.params, 'viewMode', {
        options: { Transparent: 'Transparent', Solid: 'Solid' },
        label: 'View Mode'
      })
      .on('change', () => {
        this.updateViewMode()
      })

    fView
      .addBinding(this.params, 'explode', {
        min: 0,
        max: 1,
        step: 0.01,
        label: 'Factor'
      })
      .on('change', () => {
        this.updateExplode()
      })

    const floorOptions: any = { None: -1 }
    for (let i = 0; i < this.config.floorCount; i++) {
      floorOptions[`Floor ${i + 1}`] = i
    }

    fView
      .addBinding(this.params, 'floorSelect', {
        options: floorOptions,
        label: 'Floor'
      })
      .on('change', (ev) => {
        this.selectFloor(ev.value)
      })

    const btn = this.pane.addButton({ title: 'Reset View' })
    btn.on('click', () => {
      this.params.explode = 0
      this.params.floorSelect = -1
      this.params.viewMode = 'Transparent'
      this.pane.refresh()
      this.updateExplode()
      this.updateViewMode()
      this.selectFloor(-1)
    })
  }
}

new View('canvas.webgl')
