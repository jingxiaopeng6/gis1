import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { DATA_SOURCES, REGIONS } from '../constants/dataSources'

function Globe() {
  return (
    <group>
      <mesh rotation={[0.2, 0.6, 0]}>
        <sphereGeometry args={[1.15, 40, 40]} />
        <meshStandardMaterial color="#1D4ED8" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh rotation={[0.2, 0.6, 0]} scale={1.005}>
        <sphereGeometry args={[1.155, 24, 24]} />
        <meshBasicMaterial color="#93C5FD" wireframe transparent opacity={0.18} />
      </mesh>
      <mesh rotation={[0.2, 0.6, 0]} position={[0.4, 0.1, 0.85]}>
        <sphereGeometry args={[0.18, 18, 18]} />
        <meshStandardMaterial color="#FBBF24" emissive="#F59E0B" emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}

function RegionPin({ region, active }) {
  const [lat, lon] = region.center
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lon + 180) * Math.PI) / 180
  const radius = 1.18
  const x = radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)

  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[active ? 0.07 : 0.05, 12, 12]} />
      <meshStandardMaterial
        color={active ? '#F59E0B' : '#60A5FA'}
        emissive={active ? '#F59E0B' : '#2563EB'}
        emissiveIntensity={0.7}
      />
    </mesh>
  )
}

function GlobeExplorer({ selectedRegion, onRegionChange }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)

  const sourceList = useMemo(
    () => selectedRegion?.sourceLinks || DATA_SOURCES[selectedRegion?.id] || DATA_SOURCES.global || [],
    [selectedRegion]
  )

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(trimmed)}`
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error(`搜索失败：${response.status}`)
      const data = await response.json()
      setResults(data || [])
      if (!data?.length) setError('没有找到结果，可以换个更具体的地名。')
    } catch (err) {
      setError(err?.message || '地名搜索失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePickResult = (item) => {
    const countryCode = item?.address?.country_code?.toLowerCase?.()
    const sourceLinks = countryCode === 'cn'
      ? DATA_SOURCES.china
      : countryCode === 'us'
        ? DATA_SOURCES.usa
        : DATA_SOURCES.global

    onRegionChange?.({
      id: `place-${item.place_id}`,
      label: item.display_name?.split(',')?.[0] || query,
      center: [Number(item.lat), Number(item.lon)],
      zoomHint: item.display_name,
      sourceLinks,
      raw: item,
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card p-4"
    >
      <h3 className="font-display text-sm font-semibold text-terrain-text mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-terrain-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657A8 8 0 106.343 5.343a8 8 0 0011.314 11.314z" />
        </svg>
        数据地球仪
      </h3>

      <div className="mb-3">
        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch()
            }}
            placeholder="输入地名，例如 泰山 / 西湖 / 北京"
            className="flex-1 rounded-lg bg-terrain-card/60 border border-white/10 px-3 py-2 text-sm text-terrain-text placeholder:text-terrain-muted outline-none focus:border-terrain-accent/50"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-terrain-accent text-terrain-dark text-sm font-semibold disabled:opacity-50"
          >
            {loading ? '搜索中' : '搜索'}
          </button>
        </div>
        {error && <p className="mt-2 text-[10px] text-red-300">{error}</p>}
        {!!results.length && (
          <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.place_id}
                onClick={() => handlePickResult(item)}
                className="w-full text-left p-2 rounded-lg bg-terrain-card/50 border border-transparent hover:border-terrain-accent/30 transition-colors"
              >
                <div className="text-xs text-terrain-text leading-5">{item.display_name}</div>
                <div className="text-[10px] text-terrain-muted mt-1">
                  {Number(item.lat).toFixed(4)}, {Number(item.lon).toFixed(4)}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-48 rounded-xl overflow-hidden bg-slate-900/60 border border-white/10 mb-3">
        <Canvas camera={{ position: [0, 0, 3.2], fov: 40 }}>
          <ambientLight intensity={0.9} />
          <directionalLight position={[4, 2, 4]} intensity={1.2} />
          <Globe />
          {REGIONS.map((region) => (
            <RegionPin
              key={region.id}
              region={region}
              active={selectedRegion?.id === region.id}
            />
          ))}
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} />
        </Canvas>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {REGIONS.map((region) => {
          const isActive = selectedRegion?.id === region.id
          return (
            <button
              key={region.id}
              onClick={() => onRegionChange(region)}
              className={`p-2 rounded-lg border text-left transition-all ${
                isActive
                  ? 'border-terrain-accent bg-terrain-accent/10'
                  : 'border-transparent bg-terrain-card/50 hover:border-terrain-muted/30'
              }`}
            >
              <div className="text-sm text-terrain-text font-medium">{region.label}</div>
              <div className="text-[10px] text-terrain-muted mt-1">{region.zoomHint}</div>
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        {selectedRegion?.raw && (
          <div className="p-3 rounded-lg border border-terrain-accent/20 bg-terrain-accent/5">
            <div className="text-sm text-terrain-text font-medium">{selectedRegion.label}</div>
            <div className="text-[10px] text-terrain-muted mt-1">{selectedRegion.zoomHint}</div>
          </div>
        )}
        {sourceList.map((source) => (
          <a
            key={source.url}
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="block p-3 rounded-lg bg-terrain-card/50 border border-transparent hover:border-terrain-accent/30 transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm text-terrain-text font-medium">{source.name}</div>
                <div className="text-[10px] text-terrain-muted mt-1">{source.description}</div>
              </div>
              <span className="text-xs text-terrain-accent">打开</span>
            </div>
          </a>
        ))}
      </div>
    </motion.div>
  )
}

export default GlobeExplorer
