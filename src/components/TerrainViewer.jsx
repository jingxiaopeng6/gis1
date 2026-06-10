import { memo, useDeferredValue, useEffect, useMemo, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { createTerrainMaterial, GRADIENT_SCHEMES } from '../utils/shaders'
import { createColorTexture, createFloatTexture, downsampleColorGrid, downsampleFloatGrid } from '../utils/terrain'
import { COLORS } from '../constants/theme'
import BoundaryLayer from './BoundaryLayer'

function buildGeometry(width, height) {
  const MAX_SEGMENTS = 256
  const segmentsX = Math.max(1, Math.min(width - 1, MAX_SEGMENTS))
  const segmentsY = Math.max(1, Math.min(height - 1, MAX_SEGMENTS))
  const geo = new THREE.PlaneGeometry(50, 50, segmentsX, segmentsY)
  geo.rotateX(Math.PI / 2)
  geo.scale(-1, 1, 1)
  return geo
}

function createGridLines(size, step) {
  const half = size / 2
  const geometries = []

  for (let offset = -half; offset <= half; offset += step) {
    const meridian = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(offset, 0.08, -half),
      new THREE.Vector3(offset, 0.08, half),
    ])
    const parallel = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-half, 0.08, offset),
      new THREE.Vector3(half, 0.08, offset),
    ])
    geometries.push(meridian, parallel)
  }

  return geometries
}

function CompassOverlay() {
  return (
    <div className="absolute top-4 right-4 z-20 pointer-events-none">
      <div className="glass-card w-20 h-20 rounded-full flex items-center justify-center relative">
        <div className="absolute inset-3 rounded-full border border-terrain-muted/40" />
        <div className="absolute w-0.5 h-8 bg-terrain-accent top-2" />
        <div className="absolute top-1 text-[10px] font-semibold text-terrain-text tracking-[0.3em]">
          N
        </div>
        <div className="absolute bottom-1 left-1 text-[9px] text-terrain-muted">W</div>
        <div className="absolute bottom-1 right-1 text-[9px] text-terrain-muted">E</div>
        <div className="absolute top-1/2 -translate-y-1/2 left-1 text-[9px] text-terrain-muted">S</div>
      </div>
    </div>
  )
}

const TerrainMesh = memo(function TerrainMesh({ terrainData, overlayData, settings }) {
  const meshRef = useRef()
  const baseData = terrainData || overlayData

  const renderTerrainData = useMemo(() => {
    if (!terrainData?.data) return null
    const proxy = downsampleFloatGrid(terrainData.data, terrainData.width, terrainData.height, 768)
    return {
      ...terrainData,
      data: proxy.data,
      width: proxy.width,
      height: proxy.height,
      renderScale: proxy.scale,
    }
  }, [terrainData])

  const renderOverlayData = useMemo(() => {
    if (!overlayData?.data) return null

    const proxy =
      overlayData.kind === 'imagery'
        ? downsampleColorGrid(overlayData.data, overlayData.width, overlayData.height, overlayData.channels || 4, 1024)
        : downsampleFloatGrid(overlayData.data, overlayData.width, overlayData.height, 1024)

    return {
      ...overlayData,
      data: proxy.data,
      width: proxy.width,
      height: proxy.height,
      channels: proxy.channels || overlayData.channels || 4,
      renderScale: proxy.scale,
    }
  }, [overlayData])

  const geometry = useMemo(() => {
    const source = renderTerrainData || renderOverlayData || baseData
    if (!source?.data) return null
    return buildGeometry(source.width, source.height)
  }, [baseData, renderTerrainData, renderOverlayData])

  const lightDirection = useMemo(() => {
    const azimuth = (settings.sunAzimuth * Math.PI) / 180
    const elevation = (settings.sunElevation * Math.PI) / 180
    return new THREE.Vector3(
      Math.cos(azimuth) * Math.cos(elevation),
      Math.sin(elevation),
      Math.sin(azimuth) * Math.cos(elevation)
    )
  }, [settings.sunAzimuth, settings.sunElevation])

  const heightTexture = useMemo(() => {
    if (renderTerrainData?.data) {
      return createFloatTexture(renderTerrainData.data, renderTerrainData.width, renderTerrainData.height)
    }

    if (renderOverlayData?.data && renderOverlayData.kind !== 'imagery') {
      const flat = new Float32Array(renderOverlayData.width * renderOverlayData.height)
      return createFloatTexture(flat, renderOverlayData.width, renderOverlayData.height)
    }

    return null
  }, [renderTerrainData, renderOverlayData])

  const overlayTexture = useMemo(() => {
    if (!renderOverlayData?.data || renderOverlayData.kind !== 'imagery') return null
    return createColorTexture(
      renderOverlayData.data,
      renderOverlayData.width,
      renderOverlayData.height,
      renderOverlayData.channels || 4
    )
  }, [renderOverlayData])

  // 基于 bbox 自动计算卫星图坐标对齐参数
  const overlayTransform = useMemo(() => {
    const t = terrainData?.bbox || renderTerrainData?.bbox
    const o = overlayData?.bbox || renderOverlayData?.bbox
    const base = t || o
    if (!base) return { offset: [0, 0], scale: [1, 1], aligned: false }

    // 主参考：terrain bbox（有 DEM 时），否则用 overlay bbox
    const refBbox = t || base
    const overlayBbox = o || base

    if (!refBbox || !overlayBbox || refBbox.length !== 4 || overlayBbox.length !== 4) {
      return { offset: [0, 0], scale: [1, 1], aligned: false }
    }

    const [txMin, tyMin, txMax, tyMax] = refBbox
    const [oxMin, oyMin, oxMax, oyMax] = overlayBbox

    // 同一图且 bbox 一致 → 直接映射
    if (txMin === oxMin && tyMin === oyMin && txMax === oxMax && tyMax === oyMax) {
      return { offset: [0, 0], scale: [1, 1], aligned: true }
    }

    // 计算交集
    const ixMin = Math.max(txMin, oxMin)
    const iyMin = Math.max(tyMin, oyMin)
    const ixMax = Math.min(txMax, oxMax)
    const iyMax = Math.min(tyMax, oyMax)

    const tWidth = txMax - txMin
    const tHeight = tyMax - tyMin
    const oWidth = oxMax - oxMin
    const oHeight = oyMax - oyMin

    if (tWidth <= 0 || tHeight <= 0 || oWidth <= 0 || oHeight <= 0) {
      return { offset: [0, 0], scale: [1, 1], aligned: false }
    }

    const ixWidth = ixMax - ixMin
    const ixHeight = iyMax - iyMin

    if (ixWidth <= 0 || ixHeight <= 0) {
      return { offset: [0, 0], scale: [1, 1], aligned: false }
    }

    // 计算卫星图相对 DEM 的纹理坐标偏移和缩放
    // 网格上某点的归一化坐标 vUv(u) = (txMin + u * tWidth - oxMin) / oWidth
    const offsetX = (ixMin - oxMin) / oWidth
    const offsetY = (iyMin - oyMin) / oHeight
    const scaleX = ixWidth / oWidth
    const scaleY = ixHeight / oHeight

    // 注意：Y 轴翻转（地理坐标 Y 从上到下，WebGL 纹理 v 从下到上）
    return {
      offset: [offsetX, 1.0 - offsetY - scaleY],
      scale: [scaleX, scaleY],
      aligned: true,
    }
  }, [terrainData, overlayData, renderTerrainData, renderOverlayData])

  const material = useMemo(() => {
    return createTerrainMaterial({
      terrainScale: settings.terrainScale * 20,
      showContours: settings.showContours,
      contourInterval: settings.contourInterval,
      showHillshade: settings.showHillshade,
      colorScheme: settings.colorScheme,
      showOverlay: settings.showOverlay,
      overlayOpacity: settings.overlayOpacity,
    })
  }, [baseData?.sourceFile])

  useEffect(() => {
    if (!material || !heightTexture) return
    const source = renderTerrainData || renderOverlayData || terrainData || overlayData
    const stops = GRADIENT_SCHEMES[settings.colorScheme] || GRADIENT_SCHEMES.natural

    material.uniforms.heightMap.value = heightTexture
    material.uniforms.heightMapSize.value = new THREE.Vector2(source.width, source.height)
    material.uniforms.terrainScale.value = settings.terrainScale * 20
    material.uniforms.showContours.value = settings.showContours
    material.uniforms.contourInterval.value = settings.contourInterval
    material.uniforms.showHillshade.value = settings.showHillshade
    material.uniforms.showOverlay.value = settings.showOverlay && !!overlayTexture
    material.uniforms.overlayOpacity.value = settings.overlayOpacity
    material.uniforms.overlayMap.value = overlayTexture
    material.uniforms.gradientColor.value = stops[0]
    material.uniforms.gradientColor1.value = stops[1]
    material.uniforms.gradientColor2.value = stops[2]
    material.uniforms.gradientColor3.value = stops[3]
    material.uniforms.gradientColor4.value = stops[4]
    material.uniforms.gradientColor5.value = stops[5]
    material.uniforms.gradientColor6.value = stops[6]

    material.uniforms.lightDirection.value = lightDirection
    material.uniforms.minElevation.value = terrainData?.minElevation ?? 0
    material.uniforms.maxElevation.value = terrainData?.maxElevation ?? 1
    material.uniforms.overlayUvOffset.value = new THREE.Vector2(overlayTransform.offset[0], overlayTransform.offset[1])
    material.uniforms.overlayUvScale.value = new THREE.Vector2(overlayTransform.scale[0], overlayTransform.scale[1])
    material.uniforms.overlayAligned.value = overlayTransform.aligned
  }, [
    material,
    heightTexture,
    overlayTexture,
    settings.terrainScale,
    settings.showContours,
    settings.contourInterval,
    settings.showHillshade,
    settings.showOverlay,
    settings.overlayOpacity,
    settings.colorScheme,
    settings.sunAzimuth,
    settings.sunElevation,
    terrainData?.minElevation,
    terrainData?.maxElevation,
    terrainData,
    overlayData,
    renderTerrainData,
    renderOverlayData,
    lightDirection,
    overlayTransform,
  ])

  useEffect(() => {
    return () => {
      heightTexture?.dispose()
      overlayTexture?.dispose()
      material?.dispose()
      geometry?.dispose()
    }
  }, [heightTexture, overlayTexture, material, geometry])

  if (!geometry || !heightTexture) return null
  return <mesh ref={meshRef} geometry={geometry} material={material} />
})

const LatLonGrid = memo(function LatLonGrid() {
  const geometries = useMemo(() => createGridLines(50, 5), [])

  return (
    <group>
      {geometries.map((geometry, index) => (
        <line key={index} geometry={geometry}>
          <lineBasicMaterial color={index % 2 === 0 ? COLORS.accent : COLORS.card} transparent opacity={0.28} />
        </line>
      ))}
    </group>
  )
})

function EmptyState() {
  return (
    <mesh>
      <planeGeometry args={[50, 50]} />
      <meshBasicMaterial color="#1E293B" wireframe />
    </mesh>
  )
}

function CanvasReadyBridge({ onCanvasReady }) {
  const { gl } = useThree()

  useEffect(() => {
    onCanvasReady?.(gl.domElement)
  }, [gl, onCanvasReady])

  return null
}

function RenderInvalidator({ deps }) {
  const { invalidate } = useThree()

  useEffect(() => {
    invalidate()
  }, deps)

  return null
}

const Scene = memo(function Scene({ terrainData, overlayData, boundaryData, settings }) {
  const { invalidate } = useThree()

  return (
    <>
      <RenderInvalidator deps={[terrainData, overlayData, boundaryData, settings]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={0.8} />

      {(terrainData?.data || overlayData?.data) ? (
        <>
          <TerrainMesh terrainData={terrainData} overlayData={overlayData} settings={settings} />
          {settings.showBoundary && boundaryData && (
            <BoundaryLayer
              geoData={boundaryData}
              terrainData={terrainData}
              overlayData={overlayData}
              settings={settings}
            />
          )}
          <LatLonGrid />
        </>
      ) : (
        <EmptyState />
      )}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2.1}
        onChange={invalidate}
        onEnd={invalidate}
      />
    </>
  )
})

const TerrainViewer = memo(function TerrainViewer({ terrainData, overlayData, boundaryData, settings, onCanvasReady }) {
  const deferredSettings = useDeferredValue(settings)

  return (
    <div className="relative w-full h-full">
      <Canvas shadows frameloop="demand" gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[40, 40, 40]} fov={50} />
        <color attach="background" args={['#0F172A']} />
        <fog attach="fog" args={['#0F172A', 60, 120]} />
        <CanvasReadyBridge onCanvasReady={onCanvasReady} />
        <Scene terrainData={terrainData} overlayData={overlayData} boundaryData={boundaryData} settings={deferredSettings} />
      </Canvas>
      <CompassOverlay />
    </div>
  )
})

export default TerrainViewer
