import { Delaunay } from 'd3-delaunay'

interface Triangle {
  id: number // triangle index
  vertices: [number, number, number] // point indices
  elevation: number
  downslopeTo?: number | null // triangle ID it flows to
  flow?: number
}

function buildTriangles(
  delaunay: Delaunay<Float64Array<ArrayBufferLike>>,
  elevations: number[]
) {
  const triangles: Triangle[] = []
  const coords = delaunay.points

  for (let i = 0; i < delaunay.triangles.length; i += 3) {
    const a = delaunay.triangles[i]
    const b = delaunay.triangles[i + 1]
    const c = delaunay.triangles[i + 2]
    const elevation = (elevations[a] + elevations[b] + elevations[c]) / 3
    const triangle: Triangle = {
      id: i / 3,
      vertices: [a, b, c],
      elevation
    }
    triangles.push(triangle)
  }

  console.log('triangles', triangles)

  return triangles
}

function computeTriangleAdjacency(
  delaunay: Delaunay<Float64Array<ArrayBufferLike>>
) {
  const adjacency: Map<number, number[]> = new Map()

  const { triangles, halfedges } = delaunay
  for (let t = 0; t < triangles.length; t += 3) {
    const triId = t / 3
    adjacency.set(triId, [])

    for (let e = 0; e < 3; e++) {
      const ei = t + e
      const twin = halfedges[ei]
      if (twin >= 0) {
        const neighborId = Math.floor(twin / 3)
        adjacency.get(triId)!.push(neighborId)
      }
    }
  }

  return adjacency
}

function assignDownslope(
  triangles: Triangle[],
  adjacency: Map<number, number[]>
) {
  for (const tri of triangles) {
    const neighbors = adjacency.get(tri.id) || []
    let minNeighbor = null
    let minElev = tri.elevation

    for (const nId of neighbors) {
      const n = triangles[nId]
      if (n.elevation < minElev) {
        minElev = n.elevation
        minNeighbor = nId
      }
    }
    tri.downslopeTo = minNeighbor
  }
}

function assignFlow(triangles: Triangle[]) {
  for (const tri of triangles) {
    tri.flow = 1
  }
  const visited = new Set<number>()
  const dfs = (id: number): number => {
    if (visited.has(id)) return triangles[id].flow!
    visited.add(id)

    const to = triangles[id].downslopeTo
    if (to !== null && to !== undefined) {
      triangles[id].flow! += dfs(to)
    }
    return triangles[id].flow!
  }

  for (const tri of triangles) {
    dfs(tri.id)
  }
}

function traceRivers(triangles: Triangle[], minFlow: number): number[][] {
  const rivers: number[][] = []

  for (const tri of triangles) {
    if (tri.flow! < minFlow) continue

    const path: number[] = [tri.id]
    let current = tri

    while (current.downslopeTo !== null && current.flow! >= minFlow) {
      const next = triangles[current.downslopeTo!]
      if (next.flow! < minFlow) break
      path.push(next.id)
      current = next
    }

    if (path.length > 1) {
      rivers.push(path)
    }
  }

  return rivers
}

export function generateRivers(
  delaunay: Delaunay<Float64Array<ArrayBufferLike>>,
  elevations: number[],
  minFlow: number
) {
  const triangles = buildTriangles(delaunay, elevations)
  const adjacency = computeTriangleAdjacency(delaunay)
  assignDownslope(triangles, adjacency)
  assignFlow(triangles)
  return traceRivers(triangles, minFlow)
}
