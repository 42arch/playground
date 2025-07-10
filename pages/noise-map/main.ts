import { Pane } from 'tweakpane'
import { generateElevation, generateMoisture } from './utils'

export type NoiseOptions = {
  seed: number
  e1: number
  e2: number
  e3: number
  e4: number
  e5: number
  e6: number
}

type Params = {
  cellSize: number
  elevation: NoiseOptions
  moisture: NoiseOptions
  elevationPow: number
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

  assignColor(e: number, m: number) {
    const OCEAN = '#41467b'
    const BEACH = '#979087'

    const TEMPERATE_DESERT = '#c9d29b'
    const SHRUBLAND = '#889978'
    const TAIGA = '#99ab77'

    const TEMPERATE_DECIDUOUS_FOREST = '#68945a'
    const TEMPERATE_RAIN_FOREST = '#448755'

    const SUBTROPICAL_DESERT = '#d1b988'
    const GRASSLAND = '#88aa56'
    const TROPICAL_SEASONAL_FOREST = '#559a45'
    const TROPICAL_RAIN_FOREST = '#327754'

    const SCORCHED = '#565656'
    const BARE = '#888888'
    const TUNDRA = '#bbbbab'
    const SNOW = '#dddee4'

    if (e < 0.1) return OCEAN
    if (e < 0.12) return BEACH

    if (e > 0.8) {
      if (m < 0.1) return SCORCHED
      if (m < 0.2) return BARE
      if (m < 0.5) return TUNDRA
      return SNOW
    }

    if (e > 0.6) {
      if (m < 0.33) return TEMPERATE_DESERT
      if (m < 0.66) return SHRUBLAND
      return TAIGA
    }

    if (e > 0.3) {
      if (m < 0.16) return TEMPERATE_DESERT
      if (m < 0.5) return GRASSLAND
      if (m < 0.83) return TEMPERATE_DECIDUOUS_FOREST
      return TEMPERATE_RAIN_FOREST
    }

    if (m < 0.16) return SUBTROPICAL_DESERT
    if (m < 0.33) return GRASSLAND
    if (m < 0.66) return TROPICAL_SEASONAL_FOREST
    return TROPICAL_RAIN_FOREST
  }

  render() {
    const ctx = this.ctx
    if (!ctx) return

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const nx = col / this.cols - 0.5
        const ny = row / this.rows - 0.5

        const elevation = generateElevation(
          nx,
          ny,
          this.params.elevation,
          this.params.elevationPow
        )

        const moisture = generateMoisture(nx, ny, this.params.moisture)

        const color = this.assignColor(elevation, moisture)

        ctx.fillStyle = color
        ctx.fillRect(
          col * this.cellSize,
          row * this.cellSize,
          this.cellSize,
          this.cellSize
        )
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'
        ctx.lineWidth = 1.0
        ctx.strokeRect(
          col * this.cellSize,
          row * this.cellSize,
          this.cellSize,
          this.cellSize
        )
      }
    }
  }

  rerender(params: Params) {
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.params = params
    this.cellSize = this.params.cellSize
    this.cols = Math.floor(this.size / this.cellSize)
    this.rows = Math.floor(this.size / this.cellSize)
    this.render()
  }
}

const params: Params = {
  cellSize: 8,
  elevationPow: 3.2,
  elevation: {
    seed: 2087,
    e1: 1,
    e2: 0.5,
    e3: 0.25,
    e4: 0.13,
    e5: 0.06,
    e6: 0.03
  },
  moisture: {
    seed: 753,
    e1: 1,
    e2: 0.75,
    e3: 0.33,
    e4: 0.33,
    e5: 0.33,
    e6: 0.5
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
  title: 'JS Noise Map'
})
pane.addBinding(params, 'cellSize', {
  min: 2,
  max: 10,
  step: 1
})
pane.addBinding(params, 'elevationPow', {
  min: 0.1,
  max: 10,
  step: 0.1
})

const elevation = pane.addFolder({
  title: 'elevation'
})
elevation.addBinding(params.elevation, 'seed', {
  min: 100,
  max: 6000,
  step: 1
})
elevation.addBinding(params.elevation, 'e1', {
  min: 0,
  max: 1,
  step: 0.01
})
elevation.addBinding(params.elevation, 'e2', {
  min: 0,
  max: 1,
  step: 0.01
})
elevation.addBinding(params.elevation, 'e3', {
  min: 0,
  max: 1,
  step: 0.01
})
elevation.addBinding(params.elevation, 'e4', {
  min: 0,
  max: 1,
  step: 0.01
})
elevation.addBinding(params.elevation, 'e5', {
  min: 0,
  max: 1,
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
moisture.addBinding(params.moisture, 'e1', {
  min: 0,
  max: 1,
  step: 0.01
})
moisture.addBinding(params.moisture, 'e2', {
  min: 0,
  max: 1,
  step: 0.01
})
moisture.addBinding(params.moisture, 'e3', {
  min: 0,
  max: 1,
  step: 0.01
})
moisture.addBinding(params.moisture, 'e4', {
  min: 0,
  max: 1,
  step: 0.01
})
moisture.addBinding(params.moisture, 'e5', {
  min: 0,
  max: 1,
  step: 1
})

pane.on('change', (e) => {
  if (e.last) {
    demo.rerender(params)
  }
})
