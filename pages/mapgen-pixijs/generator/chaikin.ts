export type Point = [number, number]

export interface ChaikinOptions {
  iterations?: number // 迭代次数（1~2 推荐）
  closed?: boolean // 是否闭合多边形
}

/**
 * Chaikin 平滑（Corner Cutting）
 */
export function chaikin(input: Point[], options: ChaikinOptions = {}): Point[] {
  const { iterations = 2, closed = true } = options

  if (input.length < 2) return input.slice()

  // 去掉重复首尾点（避免异常）
  let points = normalize(input, closed)

  for (let k = 0; k < iterations; k++) {
    const next: Point[] = []

    const n = points.length

    for (let i = 0; i < n - 1; i++) {
      const p0 = points[i]
      const p1 = points[i + 1]

      const q: Point = [
        0.75 * p0[0] + 0.25 * p1[0],
        0.75 * p0[1] + 0.25 * p1[1]
      ]

      const r: Point = [
        0.25 * p0[0] + 0.75 * p1[0],
        0.25 * p0[1] + 0.75 * p1[1]
      ]

      next.push(q, r)
    }

    // 闭合处理
    if (closed) {
      const p0 = points[n - 1]
      const p1 = points[0]

      const q: Point = [
        0.75 * p0[0] + 0.25 * p1[0],
        0.75 * p0[1] + 0.25 * p1[1]
      ]

      const r: Point = [
        0.25 * p0[0] + 0.75 * p1[0],
        0.25 * p0[1] + 0.75 * p1[1]
      ]

      next.push(q, r)
    } else {
      // 开放曲线保留端点
      next.unshift(points[0])
      next.push(points[n - 1])
    }

    points = next
  }

  return points
}

function normalize(points: Point[], closed: boolean): Point[] {
  if (!closed) return points.slice()

  if (points.length < 2) return points.slice()

  const first = points[0]
  const last = points[points.length - 1]

  // 去掉重复闭合点
  if (first[0] === last[0] && first[1] === last[1]) {
    return points.slice(0, -1)
  }

  return points.slice()
}
