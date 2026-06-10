import * as THREE from 'three'

// GeoJSON 解析与坐标变换工具

// 从 GeoJSON 提取所有多边形/线要素
export function parseGeoJSONFeatures(geoData) {
  const features = geoData?.features || []
  const result = []

  for (const feature of features) {
    const geom = feature?.geometry
    if (!geom) continue

    const name = feature?.properties?.name ||
      feature?.properties?.NAME ||
      feature?.properties?.省 ||
      feature?.properties?.NAME_1 ||
      feature?.properties?.ADCODE ||
      null

    if (geom.type === 'Polygon') {
      result.push({
        type: 'polygon',
        rings: geom.coordinates,
        name,
        properties: feature.properties,
      })
    } else if (geom.type === 'MultiPolygon') {
      for (const polygon of geom.coordinates) {
        result.push({
          type: 'polygon',
          rings: polygon,
          name,
          properties: feature.properties,
        })
      }
    } else if (geom.type === 'LineString') {
      result.push({
        type: 'line',
        rings: [geom.coordinates],
        name,
        properties: feature.properties,
      })
    } else if (geom.type === 'MultiLineString') {
      for (const line of geom.coordinates) {
        result.push({
          type: 'line',
          rings: [line],
          name,
          properties: feature.properties,
        })
      }
    }
  }

  return result
}

// 经纬度到网格坐标映射
export function projectLatLngToGrid(lat, lng, bbox) {
  if (!bbox || bbox.length !== 4) {
    return { x: 0, z: 0 }
  }
  const [minLng, minLat, maxLng, maxLat] = bbox
  const lngRange = maxLng - minLng || 1
  const latRange = maxLat - minLat || 1
  const x = ((lng - minLng) / lngRange) * 2 - 1
  const z = 1 - ((lat - minLat) / latRange) * 2
  return { x, z }
}

// 从 DEM 纹理采样高度
export function sampleHeight(heightData, texWidth, texHeight, uvU, uvV) {
  if (!heightData) return 0
  const u = Math.max(0, Math.min(1, uvU))
  const v = Math.max(0, Math.min(1, uvV))
  const px = Math.floor(u * (texWidth - 1))
  const py = Math.floor(v * (texHeight - 1))
  const idx = py * texWidth + px
  return heightData[idx] || 0
}

// 将 GeoJSON ring 转换为 3D 空间点集
export function ringTo3DPoints(ring, bbox, terrainData, settings = {}) {
  const { exaggeration = 1, gridSize = 50, minElevation = 0, maxElevation = 1 } = settings
  const halfSize = gridSize / 2
  const heightArray = terrainData?.data || null
  const texWidth = terrainData?.width || 1
  const texHeight = terrainData?.height || 1

  return ring.map(([lng, lat]) => {
    const { x, z } = projectLatLngToGrid(lat, lng, bbox)
    const gridX = x * halfSize
    const gridZ = z * halfSize

    const u = (x + 1) * 0.5
    const v = (1 - z) * 0.5
    const normalizedHeight = sampleHeight(heightArray, texWidth, texHeight, u, v)
    const realHeight = minElevation + normalizedHeight * (maxElevation - minElevation)
    const elevation = realHeight * exaggeration

    return new THREE.Vector3(gridX, elevation + 0.15, gridZ)
  })
}

// 从 GeoJSON 构建 Three.js LineSegments
export function createBoundarySegments(geoData, bbox, terrainData, settings = {}) {
  const features = parseGeoJSONFeatures(geoData)
  const pointPairs = []
  const labels = []

  for (const feature of features) {
    for (const ring of feature.rings) {
      if (!ring || ring.length < 2) continue
      const pts = ringTo3DPoints(ring, bbox, terrainData, settings)
      for (let i = 0; i < pts.length - 1; i++) {
        pointPairs.push(pts[i], pts[i + 1])
      }
      if (feature.name && pts.length > 0) {
        const centerIdx = Math.floor(pts.length / 2)
        labels.push({
          name: feature.name,
          position: pts[centerIdx].clone(),
        })
      }
    }
  }

  return { pointPairs, labels }
}

// 简化 GeoJSON ring（减少点数以提升性能）
export function simplifyRing(ring, tolerance = 0.001) {
  if (ring.length <= 2) return ring
  const result = [ring[0]]
  for (let i = 1; i < ring.length; i++) {
    const last = result[result.length - 1]
    const dx = ring[i][0] - last[0]
    const dy = ring[i][1] - last[1]
    if (Math.sqrt(dx * dx + dy * dy) >= tolerance) {
      result.push(ring[i])
    }
  }
  return result
}

// 计算 GeoJSON 的整体 bounding box
export function computeGeoJSONBBox(geoData) {
  const features = geoData?.features || []
  if (features.length === 0) return null

  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity

  for (const feature of features) {
    const geom = feature?.geometry
    if (!geom) continue

    const rings = geom.type === 'Polygon' ? geom.coordinates :
                  geom.type === 'MultiPolygon' ? geom.coordinates.flat() :
                  geom.type === 'LineString' ? [geom.coordinates] :
                  geom.type === 'MultiLineString' ? geom.coordinates.flat() : null

    if (!rings) continue

    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng
        if (lat < minLat) minLat = lat
        if (lng > maxLng) maxLng = lng
        if (lat > maxLat) maxLat = lat
      }
    }
  }

  return [minLng, minLat, maxLng, maxLat]
}
