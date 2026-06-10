import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { buildAnalysisSvgReport, buildMarkdownReport, estimateSurfaceMetrics } from '../utils/analysis'
import {
  buildOfficeHtml,
  createDocxBlob,
  createPdfBlob,
  createPptxBlob,
  createSvgBlob,
} from '../utils/office'
import { canvasToDataUrl, copySvg, downloadBlobFile, downloadTextFile } from '../utils/export'

function ActionButton({ label, onClick, disabled, tone = 'primary' }) {
  const toneClasses =
    tone === 'ghost'
      ? 'bg-slate-800/60 text-slate-200 border border-slate-600/30 hover:border-amber-500/30'
      : tone === 'accent'
        ? 'bg-amber-500 text-slate-950 hover:opacity-95'
        : 'bg-slate-800/60 text-slate-200 hover:bg-slate-700/60'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${toneClasses}`}
    >
      {label}
    </button>
  )
}

export default function ExportCenter({ terrainData, overlayData, settings, selectedRegion, canvasElement }) {
  const [exporting, setExporting] = useState(false)

  const report = useMemo(() => {
    const terrain = terrainData
      ? {
          minElevation: terrainData.minElevation ?? 0,
          maxElevation: terrainData.maxElevation ?? 1,
        }
      : null
    const surface = estimateSurfaceMetrics(terrainData, settings.terrainScale)
    return {
      selectedRegion,
      terrainData,
      overlayData,
      settings,
      metrics: {
        terrain,
        surface,
      },
    }
  }, [terrainData, overlayData, selectedRegion, settings])

  const captureSnapshot = async () => {
    if (!canvasElement) return null
    await new Promise((resolve) => requestAnimationFrame(resolve))
    await new Promise((resolve) => requestAnimationFrame(resolve))
    try {
      return canvasToDataUrl(canvasElement)
    } catch {
      return null
    }
  }

  const withSnapshot = async (handler) => {
    setExporting(true)
    try {
      const snapshotDataUri = await captureSnapshot()
      await handler(snapshotDataUri)
    } finally {
      setExporting(false)
    }
  }

  const handleDownloadPng = async () => {
    const snapshotUrl = await captureSnapshot()
    if (!snapshotUrl) return
    const link = document.createElement('a')
    link.href = snapshotUrl
    link.download = `terrain-${selectedRegion?.id || 'snapshot'}.png`
    link.click()
  }

  const handleDownloadSvg = async () => {
    const svgBlob = createSvgBlob(report)
    downloadBlobFile(`terrain-${selectedRegion?.id || 'report'}.svg`, svgBlob)
  }

  const handleDownloadDocx = () =>
    withSnapshot(async (snapshotDataUri) => {
      const blob = createDocxBlob({ ...report, snapshotDataUri })
      downloadBlobFile(`terrain-${selectedRegion?.id || 'report'}.docx`, blob)
    })

  const handleDownloadPptx = () =>
    withSnapshot(async (snapshotDataUri) => {
      const blob = createPptxBlob({ ...report, snapshotDataUri })
      downloadBlobFile(`terrain-${selectedRegion?.id || 'report'}.pptx`, blob)
    })

  const handleDownloadPdf = () =>
    withSnapshot(async (snapshotDataUri) => {
      const blob = await createPdfBlob({ ...report, snapshotDataUri })
      downloadBlobFile(`terrain-${selectedRegion?.id || 'report'}.pdf`, blob)
    })

  const handleOpenReportPage = async () => {
    const snapshotUrl = await captureSnapshot()
    const html = buildOfficeHtml({ ...report, snapshotDataUri: snapshotUrl })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-2">
        <ActionButton label="导出 PNG" onClick={handleDownloadPng} disabled={!canvasElement || exporting} />
        <ActionButton label="导出 SVG" onClick={handleDownloadSvg} disabled={!terrainData || exporting} />
        <ActionButton label={exporting ? '生成中...' : '导出 PDF'} onClick={handleDownloadPdf} disabled={!terrainData || exporting} tone="accent" />
        <ActionButton label={exporting ? '生成中...' : '导出 PPTX'} onClick={handleDownloadPptx} disabled={!terrainData || exporting} />
        <ActionButton label={exporting ? '生成中...' : '导出 DOCX'} onClick={handleDownloadDocx} disabled={!terrainData || exporting} />
        <ActionButton label="汇报页" onClick={handleOpenReportPage} disabled={!terrainData || exporting} />
      </div>
    </motion.div>
  )
}
