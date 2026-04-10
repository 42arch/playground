import { Mesh } from 'three'
import { MeshPoint } from '../types'
import { Delaunay, Voronoi } from 'd3-delaunay'

export default class DualMesh {
  public numRegions: number
  public numSolidRegions: number
  public numSides: number
  public numTriangles: number

  // Region centers
  public r_x: Float32Array
  public r_y: Float32Array

  // Triangle centers (Voronoi vertices)
  public t_x: Float32Array
  public t_y: Float32Array

  // Half-edge mappings
  public _r_in_s: Int32Array
  public _halfedges: Int32Array
  public _triangles: Uint32Array | Int32Array

  private readonly _voronoi: Voronoi<MeshPoint>
  private readonly _delaunay: Delaunay<Mesh>

  constructor(points: MeshPoint[], width: number, height: number) {
    this.numRegions = points.length
    this.numSolidRegions = points.length

    this.r_x = new Float32Array(this.numRegions)
    this.r_y = new Float32Array(this.numRegions)
    for (let i = 0; i < this.numRegions; i++) {
      this.r_x[i] = points[i].x
      this.r_y[i] = points[i].y
    }

    const delaunay = Delaunay.from(
      points,
      (d) => d.x,
      (d) => d.y
    )
    const voronoi = delaunay.voronoi([0, 0, width, height])

    this._delaunay = delaunay
    this._voronoi = voronoi

    this.numSides = delaunay.halfedges.length
    this.numTriangles = this.numSides / 3

    this._halfedges = delaunay.halfedges
    this._triangles = delaunay.triangles

    this.t_x = new Float32Array(this.numTriangles)
    this.t_y = new Float32Array(this.numTriangles)
  }

  // Get the next half-edge in the same triangle
  s_next_s(s: number): number {
    return s % 3 === 2 ? s - 2 : s + 1
  }

  // Get the opposite half-edge (in the adjacent triangle)
  s_opp_s(s: number): number {
    return this._halfedges[s]
  }

  // Get the region at the beginning of the half-edge
  s_begin_r(s: number): number {
    return this._triangles[s]
  }

  // Get the region at the end of the half-edge
  s_end_r(s: number): number {
    return this._triangles[this.s_next_s(s)]
  }

  // Get the triangle that this half-edge belongs to
  s_inner_t(s: number): number {
    return Math.floor(s / 3)
  }

  // Get the adjacent triangle that shares this half-edge
  s_outer_t(s: number): number {
    const opp = this.s_opp_s(s)
    return opp === -1 ? -1 : Math.floor(opp / 3)
  }

  r_polygon(r: number): MeshPoint[] {
    const polygon = this._voronoi.cellPolygon(r)

    if (!polygon || polygon.length < 4) return []

    return polygon.slice(0, -1).map(([x, y]) => ({ x, y }))
  }
}
