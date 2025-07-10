import alea from 'alea'
import { createNoise2D } from 'simplex-noise'
import { Color } from 'three'
import { NoiseOptions } from './main'

export function getColor(ratio: number) {
  const hue = ratio * 0.7 // 0.7限制色相范围避免循环回红色
  const saturation = 0.9
  const lightness = 0.5
  const color = new Color().setHSL(hue, saturation, lightness)
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(
    color.g * 255
  )}, ${Math.round(color.b * 255)}, 0.5)`
}

// export type NoiseOptions = {
//   seed: number
//   scale?: number
//   persistance?: number
//   lacunarity?: number
//   octaves?: number
//   redistribution?: number
// }

// export function fbm(x: number, y: number, options: NoiseOptions) {
//   const {
//     seed,
//     scale = 1,
//     persistance = 0.5,
//     lacunarity = 2,
//     octaves = 6,
//     redistribution = 1
//   } = options

//   const prng = alea(seed)
//   const noise = createNoise2D(prng)

//   let result = 0
//   let amplitude = 1
//   let frequency = 1
//   let max = amplitude

//   for (let i = 0; i < octaves; i++) {
//     let nx = x * scale * frequency
//     let ny = y * scale * frequency
//     let noiseValue = noise(nx, ny)

//     // result += (noiseValue * 0.5 + 0.5) * amplitude
//     result += noiseValue * amplitude
//     frequency *= lacunarity
//     amplitude *= persistance
//     max += amplitude
//   }
//   const redistributed = Math.pow(result, redistribution)
//   return redistributed / max
// }

function noiseE(x: number, y: number, seed: number) {
  const prng = alea(seed)
  const genE = createNoise2D(prng)
  return genE(x, y) * 0.5 + 0.5
}

export function generateElevation(
  x: number,
  y: number,
  options: NoiseOptions,
  pow: number
) {
  const { seed, e1, e2, e3, e4, e5, e6 } = options

  let elevation =
    e1 * noiseE(1 * x, 1 * y, seed) +
    e2 * noiseE(2 * x, 2 * y, seed) +
    e3 * noiseE(4 * x, 4 * y, seed) +
    e4 * noiseE(8 * x, 8 * y, seed) +
    e5 * noiseE(16 * x, 16 * y, seed) +
    e6 * noiseE(32 * x, 32 * y, seed)

  elevation = elevation / (e1 + e2 + e3 + e4 + e5 + e6)

  elevation = Math.pow(elevation, pow)
  return elevation
}

export function generateMoisture(x: number, y: number, options: NoiseOptions) {
  const { seed, e1, e2, e3, e4, e5, e6 } = options

  let moisture =
    e1 * noiseE(1 * x, 1 * y, seed) +
    e2 * noiseE(2 * x, 2 * y, seed) +
    e3 * noiseE(4 * x, 4 * y, seed) +
    e4 * noiseE(8 * x, 8 * y, seed) +
    e5 * noiseE(16 * x, 16 * y, seed) +
    e6 * noiseE(32 * x, 32 * y, seed)

  moisture = moisture / (e1 + e2 + e3 + e4 + e5 + e6)

  return moisture
}
