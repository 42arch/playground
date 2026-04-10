import MapEngine from './map-engine'
import { setupUI } from './ui'

async function run() {
  const dom = document.getElementById('map') as HTMLCanvasElement
  const mapEngine = new MapEngine(dom)
  await mapEngine.init()

  const { params } = setupUI(mapEngine)

  mapEngine.generateMap(params.seed, params.spacing)

  // 设置点击事件处理
  mapEngine.setOnClick((x: number, y: number) => {
    console.log(`地图上点击: x=${x.toFixed(2)}, y=${y.toFixed(2)}`)
    // 可以在这里实现自定义逻辑
    // 比如：放置建筑、标记位置等
  })
}

run()
