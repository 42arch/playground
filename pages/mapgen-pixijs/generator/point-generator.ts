import alea from 'alea'
import PoissonDiskSampling from 'poisson-disk-sampling'

export interface Point {
  x: number
  y: number
}

export function generatePoints(
  seed: number,
  width: number,
  height: number,
  minDistance: number = 25
) {
  const prng = alea(seed)
  const pds = new PoissonDiskSampling(
    {
      shape: [width, height],
      minDistance,
      maxDistance: minDistance * 3,
      tries: 30
    },
    prng
  )

  const innerPoints = pds.fill().map(([x, y]) => ({
    x,
    y
  }))

  return {
    points: innerPoints
  }
}
