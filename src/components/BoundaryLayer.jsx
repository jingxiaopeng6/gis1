import { useMemo, memo } from 'react'
import * as THREE from 'three'
import { createBoundarySegments } from '../utils/geojson'

// 3D 边界层组件
const BoundaryLayer = memo(function BoundaryLayer({
  geoData,
  terrainData,
  overlayData,
  settings,
}) {
  const baseData = terrainData || overlayData

  // 生成几何体
  const geometry = useMemo(() => {
    if (!geoData || !baseData?.bbox) return null

    const segments = createBoundarySegments(geoData, baseData.bbox, terrainData || overlayData, {
      exaggeration: settings?.terrainScale * 20,
      gridSize: 50,
      minElevation: baseData.minElevation || 0,
      maxElevation: baseData.maxElevation || 1,
    })

    if (segments.pointPairs.length === 0) return null

    const positions = new Float32Array(segments.pointPairs.length * 3)
    for (let i = 0; i < segments.pointPairs.length; i++) {
      positions[i * 3] = segments.pointPairs[i].x
      positions[i * 3 + 1] = segments.pointPairs[i].y
      positions[i * 3 + 2] = segments.pointPairs[i].z
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [geoData, baseData?.bbox, terrainData?.data, overlayData?.data, settings?.terrainScale])

  if (!geometry) return null

  const color = new THREE.Color(settings?.boundaryColor || '#f59e0b')

  return (
    <>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color={color} linewidth={settings?.boundaryWidth || 1} transparent opacity={settings?.boundaryOpacity ?? 0.9} />
      </lineSegments>
    </>
  )
})

export default BoundaryLayer
