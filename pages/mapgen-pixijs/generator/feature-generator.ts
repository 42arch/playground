import DualMesh from './dual-mesh'

const ADJECTIVES = [
  'Ablaze', 'Ashy', 'Beaming', 'Blazing', 'Bleached', 'Bright', 'Brilliant', 'Burnt',
  'Chromatic', 'Classic', 'Clean', 'Colorful', 'Cool', 'Crisp', 'Dark', 'Deep',
  'Delicate', 'Earth', 'Electric', 'Faded', 'Fiery', 'Frosty', 'Glowing', 'Hazy',
  'Hot', 'Icy', 'Illuminated', 'Intense', 'Light', 'Loud', 'Luminous', 'Majestic',
  'Marbled', 'Mellow', 'Mixed', 'Muddy', 'Natural', 'Neutral', 'Pale', 'Pastel',
  'Perfect', 'Plain', 'Primary', 'Pure', 'Radiant', 'Rich', 'Royal', 'Rustic',
  'Saturated', 'Shaded', 'Shining', 'Shiny', 'Soft', 'Solid', 'Sunny', 'Swirling',
  'Transparent', 'Vibrant', 'Vivid', 'Warm', 'Wild'
]

/**
 * 标记地理特征（海洋、岛屿、湖泊）
 * 逻辑参照 reference/index.js 中的 markFeatures
 * 
 * @param mesh DualMesh 实例
 */
export function markFeatures(mesh: DualMesh) {
  const queue: number[] = []
  const used = new Set<number>()

  // 1. 识别海洋 (Ocean) - 从 [0, 0] 开始泛洪
  const oceanStart = mesh.find(0, 0)
  if (oceanStart !== -1) {
    const name = getRandomName()
    mesh.polygons[oceanStart].featureType = 'Ocean'
    mesh.polygons[oceanStart].featureName = name
    queue.push(oceanStart)
    used.add(oceanStart)

    while (queue.length > 0) {
      const currIdx = queue.shift()!
      const neighbors = mesh.polygons[currIdx].neighbors
      for (const nextIdx of neighbors) {
        if (!used.has(nextIdx) && mesh.polygons[nextIdx].height < 0.2) {
          mesh.polygons[nextIdx].featureType = 'Ocean'
          mesh.polygons[nextIdx].featureName = name
          queue.push(nextIdx)
          used.add(nextIdx)
        }
      }
    }
  }

  // 2. 识别岛屿 (Island) 和 湖泊 (Lake)
  let islandCount = 0
  let lakeCount = 0

  for (let r = 0; r < mesh.numSolidRegions; r++) {
    // 已经标记过或者是海洋则跳过
    if (used.has(r)) continue

    let type: 'Island' | 'Lake'
    let number: number
    let heightThreshold: (h: number) => boolean

    if (mesh.polygons[r].height >= 0.2) {
      type = 'Island'
      number = islandCount++
      heightThreshold = (h) => h >= 0.2
    } else {
      type = 'Lake'
      number = lakeCount++
      heightThreshold = (h) => h < 0.2
    }

    const name = getRandomName()
    
    // 泛洪标记该特征的所有连通多边形
    const featureQueue: number[] = [r]
    used.add(r)
    mesh.polygons[r].featureType = type
    mesh.polygons[r].featureName = name
    mesh.polygons[r].featureNumber = number

    while (featureQueue.length > 0) {
      const currIdx = featureQueue.shift()!
      const neighbors = mesh.polygons[currIdx].neighbors
      for (const nextIdx of neighbors) {
        if (!used.has(nextIdx) && heightThreshold(mesh.polygons[nextIdx].height)) {
          mesh.polygons[nextIdx].featureType = type
          mesh.polygons[nextIdx].featureName = name
          mesh.polygons[nextIdx].featureNumber = number
          featureQueue.push(nextIdx)
          used.add(nextIdx)
        }
      }
    }
  }
}

function getRandomName(): string {
  return ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
}
