import { MathUtils } from 'three'
import { NoiseOptions, fbm } from './utils'
import { Pane } from 'tweakpane'

type Params = {
  cellSize: number
  seaLevel: number
  elevation: NoiseOptions
  moisture: NoiseOptions
  biomes: {
    [key: string]: {
      value: number
      color: string
    }
  }
}

class Demo {
  private canvas: HTMLCanvasElement
  private size: number
  private cellSize: number
  private cols: number
  private rows: number
  private dpr: number = 1
  private ctx: CanvasRenderingContext2D | null
  private params: Params

  constructor(dom: HTMLCanvasElement, params: Params) {
    this.canvas = dom
    this.dpr = window.devicePixelRatio
    this.params = params
    this.size = this.canvas.width
    this.cellSize = this.params.cellSize
    this.cols = Math.floor(this.size / this.cellSize)
    this.rows = Math.floor(this.size / this.cellSize)
    this.ctx = this.canvas.getContext('2d')

    this.resize()
    this.render()
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect()
    this.canvas.width = rect.width * this.dpr
    this.canvas.height = rect.height * this.dpr
    this.canvas.style.width = rect.width + 'px'
    this.canvas.style.height = rect.height + 'px'

    this.ctx?.scale(this.dpr, this.dpr)
  }

  assignColor(elevation: number) {
    const biomes = this.params.biomes
    const seaLevel = biomes.water.value

    if (elevation <= seaLevel) {
      return biomes['water'].color
    } else if (elevation <= seaLevel + biomes['shore'].value) {
      return biomes['shore'].color
    } else if (elevation <= seaLevel + biomes['beach'].value) {
      return biomes['beach'].color
    } else if (elevation <= seaLevel + biomes['shrub'].value) {
      return biomes['shrub'].color
    } else if (elevation <= seaLevel + biomes['forest'].value) {
      return biomes['forest'].color
    } else if (elevation <= seaLevel + biomes['stone'].value) {
      return biomes['stone'].color
    } else {
      return biomes['snow'].color
    }
  }

  render() {
    const ctx = this.ctx
    if (!ctx) return

    const elevations = []

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const elevation = fbm(
          col / this.cols - 0.5,
          row / this.rows - 0.5,
          this.params.elevation
        )

        const realElevation = Math.pow(
          MathUtils.mapLinear(elevation, -1, 1, 0, 1),
          2
        )

        elevations.push(realElevation)
        // const r = Math.floor(255 * elevation)
        // const g = Math.floor(255 * elevation)
        // const b = Math.floor(255 * elevation)
        const color = this.assignColor(realElevation)

        ctx.fillStyle = color
        ctx.fillRect(
          col * this.cellSize,
          row * this.cellSize,
          this.cellSize,
          this.cellSize
        )
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'
        ctx.lineWidth = 1.0
        ctx.strokeRect(
          col * this.cellSize,
          row * this.cellSize,
          this.cellSize,
          this.cellSize
        )
      }
    }

    console.log(elevations, Math.min(...elevations), Math.max(...elevations))
  }

  rerender(params: Params) {
    console.log('params', params)

    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.params = params
    this.cellSize = this.params.cellSize
    this.cols = Math.floor(this.size / this.cellSize)
    this.rows = Math.floor(this.size / this.cellSize)
    this.render()
  }
}

const params: Params = {
  cellSize: 4,
  seaLevel: 0.45,
  elevation: {
    seed: 1087,
    scale: 1,
    octaves: 6,
    persistance: 0.6,
    lacunarity: 2,
    redistribution: 1
  },
  moisture: {
    seed: 753,
    scale: 1,
    octaves: 6,
    persistance: 0.5,
    lacunarity: 2,
    redistribution: 1
  },
  biomes: {
    snow: {
      value: 0.6,
      color: '#9aa7ad'
    },
    stone: {
      value: 0.36,
      color: '#656565'
    },
    forest: {
      value: 0.29,
      color: '#586647'
    },
    shrub: {
      value: 0.1,
      color: '#9ea667'
    },
    beach: {
      value: 0.04,
      color: '#efb28f'
    },
    shore: {
      value: 0.01,
      color: '#ffd68f'
    },
    water: {
      value: 0.42,
      color: '#00a9ff'
    }
  }
}

const demo = new Demo(
  document.getElementById('map') as HTMLCanvasElement,
  params
)

const pane = new Pane({
  title: 'Terrain Map Generator'
})
pane.addBinding(params, 'cellSize', {
  min: 2,
  max: 10,
  step: 1
})
pane
  .addBinding(params, 'seaLevel', {
    min: 0,
    max: 1,
    step: 0.01
  })
  .on('change', (e) => {
    if (e.last) {
      params.biomes.water.value = e.value * 0.6
    }
  })

const elevation = pane.addFolder({
  title: 'elevation'
})
elevation.addBinding(params.elevation, 'seed', {
  min: 100,
  max: 6000,
  step: 1
})
elevation.addBinding(params.elevation, 'scale', {
  min: 0,
  max: 8,
  step: 0.01
})
elevation.addBinding(params.elevation, 'octaves', {
  min: 1,
  max: 12,
  step: 1
})
elevation.addBinding(params.elevation, 'persistance', {
  min: 0,
  max: 1,
  step: 0.01
})
elevation.addBinding(params.elevation, 'lacunarity', {
  min: 1,
  max: 8,
  step: 0.01
})
elevation.addBinding(params.elevation, 'redistribution', {
  min: 1,
  max: 8,
  step: 1
})

const moisture = pane.addFolder({
  title: 'moisture'
})
moisture.addBinding(params.moisture, 'seed', {
  min: 100,
  max: 6000,
  step: 1
})
moisture.addBinding(params.moisture, 'scale', {
  min: 0,
  max: 8,
  step: 0.01
})
moisture.addBinding(params.moisture, 'octaves', {
  min: 1,
  max: 12,
  step: 1
})
moisture.addBinding(params.moisture, 'persistance', {
  min: 0,
  max: 1,
  step: 0.01
})
moisture.addBinding(params.moisture, 'lacunarity', {
  min: 1,
  max: 8,
  step: 0.01
})
moisture.addBinding(params.moisture, 'redistribution', {
  min: 1,
  max: 8,
  step: 1
})

pane.on('change', (e) => {
  if (e.last) {
    demo.rerender(params)
  }
})
