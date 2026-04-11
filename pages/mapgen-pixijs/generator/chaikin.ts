import { MeshPoint } from '../types'

/**
 * Chaikin 平滑算法 (切角算法)
 *
 * 原理：在每一条边上取 1/4 和 3/4 处的点来替换原有顶点。
 * 特性：生成的曲线永远处于原始折线的内部（凸包内）。
 *
 * @param points 原始顶点数组
 * @param iterations 迭代次数 (建议 2-3 次)
 * @param closed 是否为闭合多边形
 * @returns 平滑后的顶点数组
 */
export function chaikinSmoothing(
  points: MeshPoint[],
  iterations: number = 2,
  closed: boolean = true
): MeshPoint[] {
  if (iterations <= 0 || points.length < 2) return points

  let currentPoints = points

  for (let iter = 0; iter < iterations; iter++) {
    const nextPoints: MeshPoint[] = []
    const len = currentPoints.length

    // 处理闭合多边形逻辑
    if (closed) {
      for (let i = 0; i < len; i++) {
        const p0 = currentPoints[i]
        const p1 = currentPoints[(i + 1) % len]

        // 生成两个新顶点
        nextPoints.push({
          x: 0.75 * p0.x + 0.25 * p1.x,
          y: 0.75 * p0.y + 0.25 * p1.y
        })
        nextPoints.push({
          x: 0.25 * p0.x + 0.75 * p1.x,
          y: 0.25 * p0.y + 0.75 * p1.y
        })
      }
    } else {
      // 处理开放折线逻辑：保留首尾原始点
      nextPoints.push(currentPoints[0])
      for (let i = 0; i < len - 1; i++) {
        const p0 = currentPoints[i]
        const p1 = currentPoints[i + 1]

        nextPoints.push({
          x: 0.75 * p0.x + 0.25 * p1.x,
          y: 0.75 * p0.y + 0.25 * p1.y
        })
        nextPoints.push({
          x: 0.25 * p0.x + 0.75 * p1.x,
          y: 0.25 * p0.y + 0.75 * p1.y
        })
      }
      nextPoints.push(currentPoints[len - 1])
    }

    currentPoints = nextPoints
  }

  return currentPoints
}

/**
 * 偏移平滑函数
 * 先将多边形沿法线（角平分线）向内缩进，再进行平滑
 * 这样可以确保平滑后的曲线被原始多边形完全包裹，消除缝隙
 * 
 * @param points 原始顶点
 * @param offset 偏移量（像素）。正值向内，负值向外
 * @param iterations 平滑迭代次数
 * @returns 偏移且平滑后的点集
 */
export function offsetSmoothing(
  points: MeshPoint[],
  offset: number = 2,
  iterations: number = 2
): MeshPoint[] {
  if (points.length < 3) return points

  // 1. 执行偏移 (基于 D3 Voronoi 的 CCW 绕序)
  const len = points.length
  const offsetPoints: MeshPoint[] = []

  for (let i = 0; i < len; i++) {
    const prev = points[(i - 1 + len) % len]
    const curr = points[i]
    const next = points[(i + 1) % len]

    // 边向量
    const v1 = { x: curr.x - prev.x, y: curr.y - prev.y }
    const v2 = { x: next.x - curr.x, y: next.y - curr.y }

    // 单位边向量
    const l1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y)
    const l2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y)

    if (l1 < 0.001 || l2 < 0.001) {
      offsetPoints.push({ ...curr })
      continue
    }

    // 计算两条边的法向量 (CCW 内部方向为: -dy, dx)
    const n1 = { x: -v1.y / l1, y: v1.x / l1 }
    const n2 = { x: -v2.y / l2, y: v2.x / l2 }

    // 计算角平分线方向
    let nx = n1.x + n2.x
    let ny = n1.y + n2.y
    const nl = Math.sqrt(nx * nx + ny * ny)

    if (nl < 0.01) {
      // 如果两条边共线，直接使用法线偏移
      offsetPoints.push({
        x: curr.x + n1.x * offset,
        y: curr.y + n1.y * offset
      })
    } else {
      // 沿角平分线偏移
      offsetPoints.push({
        x: curr.x + (nx / nl) * offset,
        y: curr.y + (ny / nl) * offset
      })
    }
  }

  // 2. 在偏移后的基础上执行平滑
  return chaikinSmoothing(offsetPoints, iterations, true)
}
