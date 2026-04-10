import DualMesh from './generator/dual-mesh'

export interface MeshPoint {
  x: number
  y: number
}

export interface MapRenderContext {
  mesh: DualMesh
}
