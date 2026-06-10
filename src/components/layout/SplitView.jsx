import { useState, useRef, useCallback } from 'react'
import TerrainViewer from '../TerrainViewer'
import Map2DView from '../map/Map2DView'

export default function SplitView({ terrainData, overlayData, boundaryData, settings, onCanvasReady }) {
  const [ratio, setRatio] = useState(52)
  const containerRef = useRef(null)
  const isDragging = useRef(false)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (!isDragging.current || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const newRatio = (x / rect.width) * 100
    setRatio(Math.min(85, Math.max(15, newRatio)))
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  return (
    <div 
      ref={containerRef}
      className="flex h-full w-full bg-slate-950"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="relative min-w-0 overflow-hidden" style={{ width: `${ratio}%` }}>
        <TerrainViewer terrainData={terrainData} overlayData={overlayData} boundaryData={boundaryData} settings={settings} onCanvasReady={onCanvasReady} />
      </div>

      {/* 可拖动分割线 */}
      <div
        onMouseDown={handleMouseDown}
        className="group relative w-3 cursor-col-resize flex-shrink-0"
      >
        {/* 拖动手柄 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-1.5 rounded-full bg-slate-600/50 transition-all duration-200 group-hover:bg-amber-500/70 group-hover:h-20" />
        </div>
        {/* 两侧边距 */}
        <div className="absolute left-0 top-0 h-full w-1 bg-transparent transition-colors group-hover:bg-gradient-to-r group-hover:from-transparent group-hover:to-white/5" />
        <div className="absolute right-0 top-0 h-full w-1 bg-transparent transition-colors group-hover:bg-gradient-to-l group-hover:from-transparent group-hover:to-white/5" />
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <Map2DView terrainData={terrainData} overlayData={overlayData} settings={settings} title="2D 联动预览" />
      </div>
    </div>
  )
}
