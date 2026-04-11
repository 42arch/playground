import DualMesh from './dual-mesh'
import { MeshPoint, CoastlineFeature } from '../types'

/**
 * 生成海岸线数据
 * 直接利用 Half-edge 结构提取 Voronoi 边，确保逻辑上的绝对连续
 */
export function generateCoastline(mesh: DualMesh): CoastlineFeature[] {
  const allEdges: { t1: number; t2: number; fId: string; type: 'Island' | 'Lake' }[] = []
  const seenSides = new Set<number>()

  // 1. 遍历所有半边，提取陆地与水域的交界
  for (let s = 0; s < mesh.numSides; s++) {
    if (seenSides.has(s)) continue

    const r1 = mesh.s_begin_r(s)
    const r2 = mesh.s_end_r(s)
    const poly1 = mesh.polygons[r1]
    const poly2 = mesh.polygons[r2]

    // 判定：一边是陆地，一边是水域
    const isCoast = (poly1.height >= 0.2 && poly2.height < 0.2) || 
                    (poly1.height < 0.2 && poly2.height >= 0.2)

    if (isCoast) {
      const opp = mesh.s_opp_s(s)
      const t1 = mesh.s_inner_t(s)
      const t2 = opp === -1 ? -1 : mesh.s_inner_t(opp)

      // 确定特征 ID
      const landPoly = poly1.height >= 0.2 ? poly1 : poly2
      const waterPoly = poly1.height < 0.2 ? poly1 : poly2
      const type = waterPoly.featureType === 'Ocean' ? 'Island' : 'Lake'
      const number = type === 'Island' ? landPoly.featureNumber! : waterPoly.featureNumber!
      const fId = `${type}_${number}`

      if (t1 !== -1 && t2 !== -1) {
        allEdges.push({ t1, t2, fId, type })
      }
      
      seenSides.add(s)
      if (opp !== -1) seenSides.add(opp)
    }
  }

  // 2. 路径串联 (基于索引的精确匹配)
  const features: CoastlineFeature[] = []
  const fIds = new Set(allEdges.map(e => e.fId))

  for (const fId of fIds) {
    const [type, numberStr] = fId.split('_')
    const number = parseInt(numberStr)
    const tempEdges = allEdges.filter(e => e.fId === fId)

    while (tempEdges.length > 0) {
      const start = tempEdges.shift()!
      let currPath: number[] = [start.t1, start.t2]
      let head = start.t1
      let tail = start.t2

      let found = true
      while (found) {
        found = false
        for (let i = 0; i < tempEdges.length; i++) {
          const e = tempEdges[i]
          if (e.t1 === tail) { tail = e.t2; currPath.push(tail); tempEdges.splice(i, 1); found = true; break }
          if (e.t2 === tail) { tail = e.t1; currPath.push(tail); tempEdges.splice(i, 1); found = true; break }
          if (e.t1 === head) { head = e.t2; currPath.unshift(head); tempEdges.splice(i, 1); found = true; break }
          if (e.t2 === head) { head = e.t1; currPath.unshift(head); tempEdges.splice(i, 1); found = true; break }
        }
      }

      features.push({
        type: type as 'Island' | 'Lake',
        number,
        points: currPath.map(t => ({ x: mesh.t_x[t], y: mesh.t_y[t] }))
      })
    }
  }

  return features
}
