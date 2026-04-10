import MapEngine from './map-engine'
import { setupUI } from './ui'

async function run() {
  const dom = document.getElementById('map') as HTMLCanvasElement
  const mapEngine = new MapEngine(dom)
  await mapEngine.init()

  const { params } = setupUI(mapEngine)

  mapEngine.generateMap(params.seed, params.spacing)
}

run()
