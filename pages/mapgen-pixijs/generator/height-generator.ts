import DualMesh from './dual-mesh'

export interface HeightOptions {
  height: number
  radius: number
  sharpness: number
}

/**
 * 按照参考代码实现的高程添加方法
 * 使用基于种子点扩散的算法
 * 
 * @param mesh DualMesh 实例
 * @param start 起始多边形索引
 * @param type 扩散类型：'island' (基于当前节点高度衰减) 或 'hill' (基于全局步长衰减)
 * @param options 高程参数
 */
export function addHeight(
  mesh: DualMesh,
  start: number,
  type: 'island' | 'hill',
  options: HeightOptions
) {
  let { height, radius, sharpness } = options
  
  const queue: number[] = []
  const used = new Set<number>()

  // 1. 初始化起点
  mesh.polygons[start].height += height
  if (mesh.polygons[start].height > 1) {
    mesh.polygons[start].height = 1
  }
  // 重置地理特征，以便后续重新计算
  mesh.polygons[start].featureType = undefined

  queue.push(start)
  used.add(start)

  // 2. BFS 扩散叠加
  // 注意：参考代码中 i 和 height 是在同一作用域更新的，循环条件包含 height > 0.01
  for (let i = 0; i < queue.length && height > 0.01; i++) {
    const currIdx = queue[i]
    
    // 衰减逻辑：'island' 模式下，衰减系数基于当前网格的高度
    if (type === 'island') {
      height = mesh.polygons[currIdx].height * radius
    } else {
      height = height * radius
    }

    const neighbors = mesh.polygons[currIdx].neighbors
    for (const neighborIdx of neighbors) {
      if (!used.has(neighborIdx)) {
        // 计算随机扰动系数
        let mod = Math.random() * sharpness + 1.1 - sharpness
        if (sharpness === 0) {
          mod = 1
        }
        
        // 叠加高度并限高
        mesh.polygons[neighborIdx].height += height * mod
        if (mesh.polygons[neighborIdx].height > 1) {
          mesh.polygons[neighborIdx].height = 1
        }

        // 重要：重置特征，标记已使用并加入队列
        mesh.polygons[neighborIdx].featureType = undefined
        queue.push(neighborIdx)
        used.add(neighborIdx)
      }
    }
  }
}
