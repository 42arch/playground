import { Pane } from 'tweakpane'
import MapEngine from './map-engine'

export function setupUI(mapEngine: MapEngine) {
  const pane = new Pane({
    title: 'MapGen Controls',
    expanded: true
  })

  const params = {
    seed: 7888,
    spacing: 6,
    showPoints: false,
    showEdges: false,
    showCells: true,
    showHeightmap: true,
    showCoastline: true,
    height: 0.85,
    radius: 0.85,
    sharpness: 0.4,
    count: 1
  }

  // 应用初始设置
  mapEngine.setLayerVisibility('points', params.showPoints)
  mapEngine.setLayerVisibility('edges', params.showEdges)
  mapEngine.setLayerVisibility('cells', params.showCells)
  mapEngine.setLayerVisibility('heightmap', params.showHeightmap)
  mapEngine.setLayerVisibility('coastline', params.showCoastline)
  mapEngine.setHeightmapParams({
    height: params.height,
    radius: params.radius,
    sharpness: params.sharpness
  })

  pane
    .addBinding(params, 'seed', {
      label: 'Seed',
      min: 0,
      max: 99999,
      step: 1
    })
    .on('change', (ev) => {
      if (ev.last) {
        mapEngine.generateMap(params.seed, params.spacing, params.count)
      }
    })

  pane
    .addBinding(params, 'spacing', {
      label: 'Spacing',
      min: 4,
      max: 30,
      step: 1
    })
    .on('change', (ev) => {
      if (ev.last) {
        mapEngine.generateMap(params.seed, params.spacing, params.count)
      }
    })

  const debugFolder = pane.addFolder({
    title: 'Layers',
    expanded: true
  })

  debugFolder
    .addBinding(params, 'showPoints', { label: 'Points' })
    .on('change', (ev) => {
      mapEngine.setLayerVisibility('points', ev.value)
    })

  debugFolder
    .addBinding(params, 'showEdges', { label: 'Edges' })
    .on('change', (ev) => {
      mapEngine.setLayerVisibility('edges', ev.value)
    })

  debugFolder
    .addBinding(params, 'showCells', { label: 'Cells' })
    .on('change', (ev) => {
      mapEngine.setLayerVisibility('cells', ev.value)
    })

  debugFolder
    .addBinding(params, 'showCoastline', { label: 'Coastline' })
    .on('change', (ev) => {
      mapEngine.setLayerVisibility('coastline', ev.value)
    })

  const heightmapFolder = pane.addFolder({
    title: 'Heightmap',
    expanded: true
  })

  heightmapFolder
    .addBinding(params, 'showHeightmap', { label: 'Visible' })
    .on('change', (ev) => {
      mapEngine.setLayerVisibility('heightmap', ev.value)
    })

  heightmapFolder
    .addBinding(params, 'height', {
      label: 'Height',
      min: 0,
      max: 1,
      step: 0.01
    })
    .on('change', (ev) => {
      mapEngine.setHeightmapParams({ height: ev.value })
    })

  heightmapFolder
    .addBinding(params, 'radius', {
      label: 'Radius',
      min: 0,
      max: 1,
      step: 0.01
    })
    .on('change', (ev) => {
      mapEngine.setHeightmapParams({ radius: ev.value })
    })

  heightmapFolder
    .addBinding(params, 'sharpness', {
      label: 'Sharpness',
      min: 0.05,
      max: 1,
      step: 0.01
    })
    .on('change', (ev) => {
      mapEngine.setHeightmapParams({ sharpness: ev.value })
    })

  heightmapFolder
    .addBinding(params, 'count', {
      label: 'Island Count',
      min: 1,
      max: 20,
      step: 1
    })
    .on('change', () => {
      mapEngine.generateMap(params.seed, params.spacing, params.count)
    })

  pane
    .addButton({
      title: 'Randomize Seed'
    })
    .on('click', () => {
      params.seed = Math.floor(Math.random() * 99999)
      pane.refresh()
      mapEngine.generateMap(params.seed, params.spacing, params.count)
    })

  return { pane, params }
}
