import { Suspense, useDeferredValue, useMemo, useState, useTransition } from 'react'
import { motion } from 'framer-motion'
import TerrainViewer from './components/TerrainViewer'
import WorkspaceConsole from './components/WorkspaceConsole'
import Shell from './components/layout/Shell'
import GlobalSearchBar from './components/layout/GlobalSearchBar'
import SplitView from './components/layout/SplitView'
import RightInspector from './components/layout/RightInspector'
import { REGIONS } from './constants/dataSources'
import { buildMarkdownReport, estimateSurfaceMetrics } from './utils/analysis'
import { buildOfficeHtml, createDocxBlob, createPdfBlob, createPptxBlob, createSvgBlob } from './utils/office'
import { downloadBlobFile, downloadTextFile } from './utils/export'
import {
  assignDatasetBand,
  buildDatasetSummary,
  createDatasetId,
  normalizeDatasetItem,
  removeDataset,
  setDatasetRole,
  toggleDatasetInclude,
} from './core/dataset/datasetRegistry'

function buildEntryFromPayload(data) {
  const kind = data?.kind || data?.metadata?.kind || 'unknown'
  const sourceFile = data?.sourceFile || data?.metadata?.source || data?.metadata?.name || 'Imported dataset'
  const role =
    data?.metadata?.source === 'band-composite'
      ? 'overlay'
      : kind === 'dem'
        ? 'terrain'
        : kind === 'imagery'
          ? 'overlay'
          : null

  return normalizeDatasetItem({
    id: createDatasetId({ name: sourceFile }, 'dataset'),
    name: sourceFile,
    kind,
    role,
    band: data?.band || null,
    include: true,
    sourceFile,
    width: data?.width ?? null,
    height: data?.height ?? null,
    bbox: data?.bbox ?? data?.metadata?.bbox ?? null,
    crs: data?.metadata?.crs || data?.crs || 'Unknown',
    channels: data?.channels || null,
    metadata: data?.metadata || {},
    payload: data,
    status: 'ready',
  })
}

function pickFallbackData(list, predicate) {
  const hit = list.find((item) => item.include !== false && predicate(item))
  return hit?.payload || null
}

function App() {
  const [isPending, startTransition] = useTransition()
  const [datasets, setDatasets] = useState([])
  const [terrainData, setTerrainData] = useState(null)
  const [overlayData, setOverlayData] = useState(null)
  const [boundaryData, setBoundaryData] = useState(null)
  const [rgbComposite, setRgbComposite] = useState(null)
  const [selectedRegion, setSelectedRegion] = useState(REGIONS[0])
  const [canvasElement, setCanvasElement] = useState(null)
  const [viewMode, setViewMode] = useState('split')
  const [settings, setSettings] = useState({
    showContours: true,
    showHillshade: true,
    showOverlay: true,
    showBoundary: false,
    contourInterval: 50,
    sunAzimuth: 315,
    sunElevation: 45,
    terrainScale: 1.0,
    overlayOpacity: 0.85,
    boundaryColor: '#f59e0b',
    boundaryOpacity: 0.9,
    colorScheme: 'natural',
  })

  const registerDataset = (data) => {
    const entry = buildEntryFromPayload(data)
    startTransition(() => {
      setDatasets((prev) => [entry, ...prev.filter((item) => item.id !== entry.id)])

      if (entry.metadata?.source === 'band-composite') {
        setRgbComposite(data)
        setOverlayData(data)
        setSettings((prev) => ({ ...prev, showOverlay: true }))
        return
      }

      if (entry.kind === 'imagery') {
        setOverlayData(data)
        setSettings((prev) => ({ ...prev, showOverlay: true }))
        return
      }

      if (entry.kind === 'dem') {
        setTerrainData(data)
        return
      }

      setTerrainData(data)
    })
  }

  const handleFileUpload = (data) => {
    if (!data) return
    registerDataset(data)
  }

  const handleToggleDatasetInclude = (id) => {
    startTransition(() => {
      setDatasets((prev) => {
        const next = toggleDatasetInclude(prev, id)
        const removedItem = prev.find((item) => item.id === id)
        const toggled = next.find((item) => item.id === id)

        if (toggled?.include === false) {
          if (removedItem?.payload === terrainData) {
            setTerrainData(pickFallbackData(next, (item) => item.role === 'terrain' || item.kind === 'dem'))
          }

          if (removedItem?.payload === overlayData) {
            const fallbackOverlay = pickFallbackData(next, (item) => item.role === 'overlay' || item.kind === 'imagery')
            setOverlayData(fallbackOverlay)
            if (fallbackOverlay?.metadata?.source === 'band-composite') {
              setRgbComposite(fallbackOverlay)
            }
          }
        }

        return next
      })
    })
  }

  const handleAssignDatasetBand = (id, band) => {
    startTransition(() => {
      setDatasets((prev) => assignDatasetBand(prev, id, band))
    })
  }

  const handlePickDatasetRole = (id, role) => {
    startTransition(() => {
      setDatasets((prev) => {
        const next = setDatasetRole(prev, id, role)
        const item = next.find((entry) => entry.id === id)

        if (role === 'terrain' && item?.payload) {
          setTerrainData(item.payload)
        }

        if (role === 'overlay' && item?.payload) {
          setOverlayData(item.payload)
          if (item.payload?.metadata?.source === 'band-composite') {
            setRgbComposite(item.payload)
          }
        }

        return next
      })
    })
  }

  const handleRemoveDataset = (id) => {
    startTransition(() => {
      setDatasets((prev) => {
        const removed = prev.find((item) => item.id === id)
        const next = removeDataset(prev, id)

        if (removed?.payload === terrainData) {
          setTerrainData(pickFallbackData(next, (item) => item.role === 'terrain' || item.kind === 'dem'))
        }

        if (removed?.payload === overlayData) {
          const fallbackOverlay = pickFallbackData(next, (item) => item.role === 'overlay' || item.kind === 'imagery')
          setOverlayData(fallbackOverlay)
          if (fallbackOverlay?.metadata?.source === 'band-composite') {
            setRgbComposite(fallbackOverlay)
          }
        }

        return next
      })
    })
  }

  const handleClearDatasets = () => {
    startTransition(() => {
      setDatasets([])
      setTerrainData(null)
      setOverlayData(null)
      setRgbComposite(null)
    })
  }

  const summary = useMemo(() => buildDatasetSummary(datasets), [datasets])
  const activeOverlay = rgbComposite || overlayData
  const deferredTerrainScale = useDeferredValue(settings.terrainScale)
  const surfaceMetrics = useMemo(
    () => estimateSurfaceMetrics(terrainData, deferredTerrainScale),
    [terrainData, deferredTerrainScale]
  )

  const captureSnapshot = async () => {
    if (!canvasElement) return null
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    try {
      return canvasElement.toDataURL('image/png')
    } catch {
      return null
    }
  }

  const officeReport = useMemo(
    () => ({
      selectedRegion,
      terrainData,
      overlayData: activeOverlay,
      settings,
      metrics: {
        terrain: terrainData
          ? {
              minElevation: terrainData.minElevation ?? 0,
              maxElevation: terrainData.maxElevation ?? 1,
            }
          : null,
        surface: surfaceMetrics,
      },
    }),
    [selectedRegion, terrainData, activeOverlay, settings, surfaceMetrics]
  )

  const exportHandlers = {
    onExportPng: async () => {
      const snapshotUrl = await captureSnapshot()
      if (!snapshotUrl) return
      const link = document.createElement('a')
      link.href = snapshotUrl
      link.download = `terrain-${selectedRegion?.id || 'snapshot'}.png`
      link.click()
    },
    onExportSvg: () => {
      const blob = createSvgBlob({ ...officeReport })
      downloadBlobFile(`terrain-${selectedRegion?.id || 'report'}.svg`, blob)
    },
    onExportPdf: async () => {
      const snapshotDataUri = await captureSnapshot()
      const blob = await createPdfBlob({ ...officeReport, snapshotDataUri })
      downloadBlobFile(`terrain-${selectedRegion?.id || 'report'}.pdf`, blob)
    },
    onExportPptx: async () => {
      const snapshotDataUri = await captureSnapshot()
      const blob = createPptxBlob({ ...officeReport, snapshotDataUri })
      downloadBlobFile(`terrain-${selectedRegion?.id || 'report'}.pptx`, blob)
    },
    onExportDocx: async () => {
      const snapshotDataUri = await captureSnapshot()
      const blob = createDocxBlob({ ...officeReport, snapshotDataUri })
      downloadBlobFile(`terrain-${selectedRegion?.id || 'report'}.docx`, blob)
    },
    onExportHtml: async () => {
      const snapshotDataUri = await captureSnapshot()
      const html = buildOfficeHtml({ ...officeReport, snapshotDataUri })
      downloadTextFile(`terrain-${selectedRegion?.id || 'report'}.html`, html, 'text/html;charset=utf-8')
    },
    onExportMarkdown: () => {
      const markdown = buildMarkdownReport({
        selectedRegion,
        terrainData,
        overlayData: activeOverlay,
        settings,
        metrics: officeReport.metrics,
      })
      downloadTextFile(`terrain-${selectedRegion?.id || 'report'}.md`, markdown)
    },
    onExportJson: () => {
      const payload = {
        selectedRegion,
        settings,
        terrainData: terrainData
          ? {
              sourceFile: terrainData.sourceFile,
              width: terrainData.width,
              height: terrainData.height,
              minElevation: terrainData.minElevation,
              maxElevation: terrainData.maxElevation,
              metadata: terrainData.metadata,
            }
          : null,
        overlayData: activeOverlay
          ? {
              sourceFile: activeOverlay.sourceFile,
              width: activeOverlay.width,
              height: activeOverlay.height,
              metadata: activeOverlay.metadata,
            }
          : null,
        metrics: officeReport.metrics,
      }
      downloadTextFile(`terrain-${selectedRegion?.id || 'report'}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
    },
    onOpenReportPage: async () => {
      const snapshotDataUri = await captureSnapshot()
      const html = buildOfficeHtml({ ...officeReport, snapshotDataUri })
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    },
  }

  const topBar = (
    <div className="space-y-3">
      <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-[24px] px-5 py-4 hover-lift">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <span className="text-lg">🗺️</span>
            </div>
            <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-sky-500 border-2 border-slate-900 flex items-center justify-center">
              <span className="text-[8px]">3D</span>
            </div>
          </div>
          <div>
            <div className="text-base font-bold text-slate-50 tracking-tight">地形数据工作台</div>
            <div className="mt-0.5 text-[11px] leading-5 text-slate-400">
              专业的空间数据处理 · 3D 可视化 · 分析与报告生成
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: '3d', label: '3D 模式' },
            { key: 'split', label: '分屏模式' },
          ].map((item) => (
            <motion.button
              key={item.key}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => setViewMode(item.key)}
              className={`relative overflow-hidden rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 btn-glow ${
                viewMode === item.key
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/30'
                  : 'bg-slate-800/60 text-slate-300 border border-slate-700/50 hover:bg-slate-800/80 hover:border-slate-600/60'
              }`}
            >
              {item.label}
            </motion.button>
          ))}
        </div>
      </div>

      {isPending ? (
        <div className="glass-card rounded-[22px] px-4 py-3 text-xs text-slate-300 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          正在同步数据与更新状态...
        </div>
      ) : null}

      <GlobalSearchBar
        onPickRegion={(region) => setSelectedRegion(region)}
        onOpenSource={(source) => {
          if (source?.url) window.open(source.url, '_blank', 'noopener,noreferrer')
        }}
      />
    </div>
  )

  const bottomBar = (
    <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-[24px] px-5 py-3">
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          就绪
        </span>
        <span className="text-slate-500">·</span>
        <span>提示：拖拽旋转 · 滚轮缩放 · 右键平移</span>
      </div>
      <div className="flex items-center gap-5 text-xs text-slate-300">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
          <span className="text-slate-500">📁</span>
          <span className="font-medium">{summary.total}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-700/50">
          <span className="text-slate-500">✅</span>
          <span className="font-medium">{summary.included}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          <span className="text-amber-400">⛰️</span>
          <span className="font-medium text-amber-200">DEM {summary.terrain}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20">
          <span className="text-sky-400">🖼️</span>
          <span className="font-medium text-sky-200">影像 {summary.imagery}</span>
        </div>
      </div>
    </div>
  )

  const mainView =
    viewMode === 'split' ? (
      <SplitView terrainData={terrainData} overlayData={activeOverlay} boundaryData={boundaryData} settings={settings} onCanvasReady={setCanvasElement} />
    ) : (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="h-full w-full overflow-hidden rounded-2xl"
        style={{ background: 'rgba(15, 23, 42, 0.6)' }}
      >
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-terrain-accent/30 border-t-terrain-accent" />
                <p className="text-terrain-muted">加载中...</p>
              </div>
            </div>
          }
        >
          <TerrainViewer terrainData={terrainData} overlayData={activeOverlay} boundaryData={boundaryData} settings={settings} onCanvasReady={setCanvasElement} />
        </Suspense>
      </motion.div>
    )

  return (
    <Shell
      topBar={topBar}
      leftSidebar={
        <WorkspaceConsole
          terrainData={terrainData}
          overlayData={overlayData}
          settings={settings}
          onSettingsChange={setSettings}
          onFileUpload={handleFileUpload}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          datasets={datasets}
          onToggleDatasetInclude={handleToggleDatasetInclude}
          onAssignDatasetBand={handleAssignDatasetBand}
          onPickDatasetRole={handlePickDatasetRole}
          onRemoveDataset={handleRemoveDataset}
          onClearDatasets={handleClearDatasets}
          boundaryData={boundaryData}
          onBoundaryDataChange={setBoundaryData}
        />
      }
      mainView={mainView}
      rightSidebar={
        <RightInspector
          terrainData={terrainData}
          overlayData={activeOverlay}
          settings={settings}
          selectedRegion={selectedRegion}
          canvasElement={canvasElement}
          datasets={datasets}
          onImportConvertedData={handleFileUpload}
          onOpenReportPage={exportHandlers.onOpenReportPage}
        />
      }
      bottomBar={bottomBar}
    />
  )
}

export default App
