import DualMesh from './generator/dual-mesh'

export interface MeshPoint {
  x: number
  y: number
}

export interface Polygon {
  index: number
  height: number
  vertex: MeshPoint[]
  neighbors: number[] // Added for common mapping requirements
}

export interface MapRenderContext {
  mesh: DualMesh
}
