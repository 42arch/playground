import { Pane } from 'tweakpane'
import MapEngine from './map-engine'

export function setupUI(mapEngine: MapEngine) {
  const pane = new Pane({
    title: 'MapGen Controls',
    expanded: true
  })

  const params = {
    seed: Math.floor(Math.random() * 99999),
    spacing: 25,
    showPoints: true,
    showEdges: true,
    showCells: true
  }

  pane
    .addBinding(params, 'seed', {
      label: 'Seed',
      min: 0,
      max: 99999,
      step: 1
    })
    .on('change', (ev) => {
      if (ev.last) {
        mapEngine.generateMap(params.seed, params.spacing)
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
        mapEngine.generateMap(params.seed, params.spacing)
      }
    })

  const debugFolder = pane.addFolder({
    title: 'Layers',
    expanded: true
  })

  debugFolder.addBinding(params, 'showPoints', { label: 'Points' }).on('change', (ev) => {
    mapEngine.setLayerVisibility('points', ev.value)
  })

  debugFolder.addBinding(params, 'showEdges', { label: 'Edges' }).on('change', (ev) => {
    mapEngine.setLayerVisibility('edges', ev.value)
  })

  debugFolder.addBinding(params, 'showCells', { label: 'Cells' }).on('change', (ev) => {
    mapEngine.setLayerVisibility('cells', ev.value)
  })

  pane
    .addButton({
      title: 'Randomize Seed'
    })
    .on('click', () => {
      params.seed = Math.floor(Math.random() * 99999)
      pane.refresh()
      mapEngine.generateMap(params.seed, params.spacing)
    })

  return { pane, params }
}
