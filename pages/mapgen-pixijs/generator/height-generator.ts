import DualMesh from './dual-mesh'
import { createNoise2D } from 'simplex-noise'
import alea from 'alea'

export interface HeightOptions {
  height: number
  radius: number
  sharpness: number
  random: () => number // 注入随机数生成器
}

/**
 * 按照参考代码实现的高程添加方法
 * 使用基于种子点扩散的算法
 */
export function addHeight(
  mesh: DualMesh,
  start: number,
  type: 'island' | 'hill',
  options: HeightOptions
) {
  let { height, radius, sharpness, random } = options

  const queue: number[] = []
  const used = new Set<number>()

  // 1. 初始化起点
  mesh.polygons[start].height += height
  if (mesh.polygons[start].height > 1) {
    mesh.polygons[start].height = 1
  }
  mesh.polygons[start].featureType = undefined

  queue.push(start)
  used.add(start)

  // 2. BFS 扩散叠加
  for (let i = 0; i < queue.length && height > 0.01; i++) {
    const currIdx = queue[i]

    if (type === 'island') {
      height = mesh.polygons[currIdx].height * radius - height / 100
    } else {
      height = height * radius
    }

    const neighbors = mesh.polygons[currIdx].neighbors
    for (const neighborIdx of neighbors) {
      if (!used.has(neighborIdx)) {
        // 使用注入的 random 函数代替 Math.random()
        let mod = random() * sharpness + 1.1 - sharpness
        if (sharpness === 0) {
          mod = 1
        }

        mesh.polygons[neighborIdx].height += height * mod
        if (mesh.polygons[neighborIdx].height > 1) {
          mesh.polygons[neighborIdx].height = 1
        }

        mesh.polygons[neighborIdx].featureType = undefined
        queue.push(neighborIdx)
        used.add(neighborIdx)
      }
    }
  }
}

/**
 * 宏观地貌生成逻辑
 */
export function addBlobs(
  mesh: DualMesh,
  count: number,
  mapWidth: number,
  mapHeight: number,
  random: () => number, // 注入随机数生成器
  sharpness: number = 0.2
) {
  const hasLand = mesh.polygons.some((p) => p.height > 0)

  for (let c = 0; c < count; c++) {
    let type: 'island' | 'hill' = 'hill'
    let startIdx = -1

    if (c === 0 && !hasLand) {
      const x = (random() * mapWidth) / 2 + mapWidth / 4
      const y = (random() * mapHeight) / 3 + mapHeight / 3
      startIdx = mesh.find(x, y)
      type = 'island'
    } else {
      for (let i = 0; i < 50; i++) {
        const idx = Math.floor(random() * mesh.numSolidRegions)
        startIdx = idx

        if (
          mesh.polygons[idx].height <= 0.25 &&
          mesh.r_x[idx] >= mapWidth * 0.25 &&
          mesh.r_x[idx] <= mapWidth * 0.75 &&
          mesh.r_y[idx] >= mapHeight * 0.2 &&
          mesh.r_y[idx] <= mapHeight * 0.8
        ) {
          break
        }
      }
    }

    if (startIdx !== -1) {
      let height = random() * 0.4 + 0.1
      let radius = 0.99

      if (type === 'island') {
        height = random() * 0.1 + 0.9
        radius = 0.9
      }

      addHeight(mesh, startIdx, type, { height, radius, sharpness, random })
    }
  }
}

/**
 * 添加 Simplex 噪声细化
 */
export function addNoise(
  mesh: DualMesh,
  mapWidth: number,
  mapHeight: number,
  random: () => number // 用于确保噪声生成的微量随机性也是确定的
) {
  // 注意：SimplexNoise 本身也支持种子，如果需要极致确定性，可以给 createNoise2D 传参
  // 这里直接使用 alea 实例作为生成器的种子源
  const noise2D = createNoise2D(random)

  function getNoise(nx: number, ny: number) {
    return noise2D(nx, ny) / 2 + 0.5
  }

  mesh.polygons.forEach((poly, i) => {
    const cellHeight = poly.height
    if (cellHeight >= 0.2) {
      const x = mesh.r_x[i]
      const y = mesh.r_y[i]
      const nx = x / mapWidth - 0.5
      const ny = y / mapHeight - 0.5

      let noise = getNoise(2 * nx, 2 * ny) / 2
      noise += getNoise(4 * nx, 4 * ny) / 4
      noise += getNoise(8 * nx, 8 * ny) / 8

      let height = (cellHeight * 2 + noise) / 3
      if (height < 0.2) {
        height = 0.2
      }

      height *= random() * 0.1 + 0.95
      poly.height = height
    }
  })
}

/**
 * 侵蚀修整：降低整体陆地高度
 * 模拟海岸线修整
 */
export function downcutCoastline(mesh: DualMesh, amount: number) {
  mesh.polygons.forEach((poly) => {
    if (poly.height >= 0.2) {
      poly.height -= amount
    }
  })
}

/**
 * 河流切割：对于水量较大的单元格进行高程下切
 */
export function downcutRivers(mesh: DualMesh, amount: number) {
  mesh.polygons.forEach((poly) => {
    // 假设 poly.flux 已由河网计算模块得出 (参考代码阈值为 0.85)
    if (poly.flux !== undefined && poly.flux >= 0.85 && poly.height >= 0.21) {
      poly.height -= amount / 10
    }
  })
}
