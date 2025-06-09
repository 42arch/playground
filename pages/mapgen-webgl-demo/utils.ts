import alea from 'alea'
import { createNoise2D } from 'simplex-noise'
import { Color as TColor } from 'three'
import { Color } from 'ogl'

export function getColor(ratio: number) {
  const hue = ratio * 0.7
  const saturation = 0.9
  const lightness = 0.5
  const color = new TColor().setHSL(hue, saturation, lightness)

  return [color.r, color.g, color.b, 0.5]
}

export function getElevationColor(
  elevation: number,
  seaLevel: number
): [number, number, number, number] {
  const colors = {
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
      value: 0.12,
      color: '#00a9ff'
    }
  }

  let color

  if (elevation < seaLevel) {
    color = new Color(colors.water.color)
  } else if (elevation < seaLevel + colors.shore.value) {
    color = new Color(colors.shore.color)
  } else if (elevation < seaLevel + colors.beach.value) {
    color = new Color(colors.beach.color)
  } else if (elevation < seaLevel + colors.shrub.value) {
    color = new Color(colors.shrub.color)
  } else if (elevation < seaLevel + colors.forest.value) {
    color = new Color(colors.forest.color)
  } else if (elevation < seaLevel + colors.stone.value) {
    color = new Color(colors.stone.color)
  } else {
    color = new Color(colors.snow.color)
  }

  return [color.r, color.g, color.b, 0.95]
}

export type NoiseOptions = {
  seed: number
  scale?: number
  persistance?: number
  lacunarity?: number
  octaves?: number
  redistribution?: number
}

export function fbm(x: number, y: number, options: NoiseOptions) {
  const {
    seed,
    scale = 1,
    persistance = 0.5,
    lacunarity = 2,
    octaves = 6,
    redistribution = 1
  } = options

  const prng = alea(seed)
  const noise = createNoise2D(prng)

  let result = 0
  let amplitude = 1
  let frequency = 1
  let max = amplitude

  for (let i = 0; i < octaves; i++) {
    let nx = x * scale * frequency
    let ny = y * scale * frequency
    let noiseValue = noise(nx, ny)

    result += (noiseValue * 0.5 + 0.5) * amplitude
    frequency *= lacunarity
    amplitude *= persistance
    max += amplitude
  }
  const redistributed = Math.pow(result, redistribution)
  return redistributed / max
}
