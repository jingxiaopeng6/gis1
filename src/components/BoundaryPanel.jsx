import { useState, useRef } from 'react'

// 预设的 GeoJSON 示例：中国主要省份轮廓
// 简化的边界数据，用于演示效果
export const CHINA_PROVINCES_SAMPLE = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '示例区域A' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [105.0, 30.0], [110.0, 30.0], [110.0, 35.0], [105.0, 35.0], [105.0, 30.0]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: '示例区域B' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [110.0, 30.0], [115.0, 30.0], [115.0, 35.0], [110.0, 35.0], [110.0, 30.0]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: '示例区域C' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [105.0, 35.0], [110.0, 35.0], [110.0, 40.0], [105.0, 40.0], [105.0, 35.0]
        ]]
      }
    },
    {
      type: 'Feature',
      properties: { name: '示例区域D' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [110.0, 35.0], [115.0, 35.0], [115.0, 40.0], [110.0, 40.0], [110.0, 35.0]
        ]]
      }
    },
  ]
}

// 行政区划面板
export default function BoundaryPanel({
  boundaryData,
  onBoundaryDataChange,
  settings,
  onSettingsChange,
}) {
  const fileInputRef = useRef(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [featureCount, setFeatureCount] = useState(0)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsLoading(true)
    setError(null)

    try {
      const text = await file.text()
      const geo = JSON.parse(text)

      if (!geo.type || !geo.features) {
        throw new Error('无效的 GeoJSON 格式')
      }

      const count = geo.features?.length || 0
      setFeatureCount(count)
      onBoundaryDataChange(geo)
    } catch (err) {
      console.error('GeoJSON 解析失败:', err)
      setError(err.message || '文件解析失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadSample = () => {
    setFeatureCount(CHINA_PROVINCES_SAMPLE.features.length)
    onBoundaryDataChange(CHINA_PROVINCES_SAMPLE)
    setError(null)
  }

  const handleClear = () => {
    onBoundaryDataChange(null)
    setFeatureCount(0)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const updateSetting = (key, value) => {
    onSettingsChange((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4">
      {/* 说明 */}
      <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3">
        <p className="text-xs text-amber-300 mb-1">📝 使用说明</p>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          上传 GeoJSON 格式的行政区划边界数据。边界会自动根据地形高度贴合显示在三维地形图表面。
        </p>
      </div>

      {/* 上传区域 */}
      <div>
        <p className="text-xs text-slate-400 mb-2">GeoJSON 数据</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".geojson,.json,application/geo+json,application/json"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="flex gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="flex-1 py-2 px-3 rounded-lg border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 text-[11px] text-sky-300 transition-colors"
          >
            {isLoading ? '解析中…' : '📁 上传 GeoJSON'}
          </button>
          <button
            onClick={handleLoadSample}
            className="flex-1 py-2 px-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] text-emerald-300 transition-colors"
          >
            🎯 加载示例
          </button>
        </div>

        {featureCount > 0 && (
          <div className="mt-2 flex items-center justify-between text-[10px]">
            <span className="text-emerald-400">
              ✓ 已加载 {featureCount} 个边界要素
            </span>
            <button
              onClick={handleClear}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              清除
            </button>
          </div>
        )}

        {error && (
          <p className="mt-2 text-[10px] text-red-400">{error}</p>
        )}
      </div>

      {/* 分隔线 */}
      <div className="h-px bg-slate-700/50" />

      {/* 显示控制 */}
      <div>
        <p className="text-xs text-slate-400 mb-2">显示设置</p>
        <div className="space-y-2">
          {/* 开关 */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-300">显示边界</span>
            <button
              onClick={() => updateSetting('showBoundary', !settings.showBoundary)}
              className={`w-10 h-5 rounded-full transition-colors ${
                settings.showBoundary ? 'bg-amber-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings.showBoundary ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* 颜色 */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-300">边界颜色</span>
            <input
              type="color"
              value={settings.boundaryColor || '#f59e0b'}
              onChange={(e) => updateSetting('boundaryColor', e.target.value)}
              className="w-10 h-6 rounded bg-transparent cursor-pointer"
            />
          </div>

          {/* 透明度 */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-300">透明度</span>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={settings.boundaryOpacity ?? 0.9}
                onChange={(e) => updateSetting('boundaryOpacity', parseFloat(e.target.value))}
                className="flex-1 h-1"
              />
              <span className="text-[10px] text-slate-400 w-6 text-right">
                {Math.round((settings.boundaryOpacity ?? 0.9) * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 数据来源提示 */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-3">
        <p className="text-[10px] text-slate-500 leading-relaxed">
          💡 可使用阿里 DataV、天地图等提供的中国省市区县 GeoJSON 数据。
          确保 GeoJSON 的坐标为 WGS84 经纬度，与你的 DEM/影像数据坐标系一致。
        </p>
      </div>
    </div>
  )
}

export { CHINA_PROVINCES_SAMPLE as SampleGeoJSON }
