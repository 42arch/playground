import DualMesh from './generator/dual-mesh'

export interface MeshPoint {
  x: number
  y: number
}

export interface Polygon {
  index: number
  height: number
  vertex: MeshPoint[]
  neighbors: number[]
  featureType?: 'Ocean' | 'Island' | 'Lake'
  featureName?: string
  featureNumber?: number
  // 地理属性
  flux?: number
  precipitation?: number
  biom?: number
  biomColor?: string
  type?: string
}

export interface CoastlineFeature {
  type: 'Island' | 'Lake'
  number: number
  points: MeshPoint[]
}

export interface MapRenderContext {
  mesh: DualMesh
  coastline?: CoastlineFeature[]
  canvasWidth?: number
  canvasHeight?: number
}
