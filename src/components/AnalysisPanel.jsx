import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { computeHistogram, computeProfiles, estimateSurfaceMetrics } from '../utils/analysis'

function metricCard({ label, value, hint }) {
  return { label, value, hint }
}

function sparkPath(points, width, height) {
  if (!points?.length) return ''
  const values = points.map((p) => p.value ?? p.elevation ?? 0)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  return points
    .map((p, index) => {
      const x = (index / Math.max(1, points.length - 1)) * width
      const v = p.value ?? p.elevation ?? 0
      const y = height - ((v - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

function HistogramSvg({ bins }) {
  const width = 320
  const height = 130
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
      <defs>
        <linearGradient id="histGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} rx="14" fill="rgba(15,23,42,0.45)" />
      {bins.map((bin, index) => {
        const barWidth = (width - 24) / bins.length
        const barHeight = bin.ratio * (height - 28)
        const x = 12 + index * barWidth
        const y = height - 12 - barHeight
        return <rect key={index} x={x} y={y} width={barWidth - 2} height={barHeight} rx="2" fill="url(#histGrad)" />
      })}
    </svg>
  )
}

function ProfileSvg({ points, title, minElevation, maxElevation }) {
  const width = 320
  const height = 130
  const path = sparkPath(points, width - 24, height - 32)
  const max = Math.max(maxElevation, 1)
  const min = Math.min(minElevation, max)
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32">
      <defs>
        <linearGradient id="profileFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width={width} height={height} rx="14" fill="rgba(15,23,42,0.45)" />
      <text x="14" y="20" fill="#E2E8F0" fontSize="11" fontWeight="600">{title}</text>
      <path d={`${path} L ${width - 12} ${height - 12} L 12 ${height - 12} Z`} fill="url(#profileFill)" />
      <path d={path} fill="none" stroke="#F59E0B" strokeWidth="2.2" />
      <line x1="12" y1={height - 12} x2={width - 12} y2={height - 12} stroke="rgba(148,163,184,0.35)" />
      <text x="14" y={height - 8} fill="#94A3B8" fontSize="9">{min.toFixed(0)} m</text>
      <text x={width - 50} y="20" fill="#94A3B8" fontSize="9">{max.toFixed(0)} m</text>
    </svg>
  )
}

export default function AnalysisPanel({ terrainData, overlayData, settings }) {
  const histogram = useMemo(() => computeHistogram(terrainData, 24), [terrainData])
  const profiles = useMemo(() => computeProfiles(terrainData, 150), [terrainData])
  const surface = useMemo(() => estimateSurfaceMetrics(terrainData, 1), [terrainData])

  const metrics = terrainData
    ? [
        metricCard({
          label: '高程范围',
          value: `${terrainData.minElevation?.toFixed?.(1) || '0'} - ${terrainData.maxElevation?.toFixed?.(1) || '0'} m`,
          hint: '用于论文和汇报摘要',
        }),
        metricCard({
          label: '平均坡度',
          value: surface ? `${surface.meanSlopeDeg.toFixed(2)}°` : '0.00°',
          hint: '越大表示起伏越剧烈',
        }),
        metricCard({
          label: '表面面积比',
          value: surface ? surface.areaRatio.toFixed(3) : '1.000',
          hint: '3D 表面 / 平面面积',
        }),
        metricCard({
          label: '影像覆盖',
          value: overlayData?.sourceFile || '未加载',
          hint: '卫星影像或普通图片',
        }),
      ]
    : [
        metricCard({ label: '状态', value: '等待导入 DEM', hint: '先上传 tif / img 栅格' }),
      ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-4"
    >
      <h3 className="font-display text-sm font-semibold text-terrain-text mb-3 flex items-center gap-2">
        <svg className="w-4 h-4 text-terrain-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        分析看板
      </h3>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-lg bg-terrain-card/50 p-3 border border-white/5">
            <div className="text-[10px] text-terrain-muted mb-1">{item.label}</div>
            <div className="text-sm font-medium text-terrain-text truncate">{item.value}</div>
            <div className="text-[10px] text-terrain-muted mt-1">{item.hint}</div>
          </div>
        ))}
      </div>

      {terrainData ? (
        <div className="space-y-3">
          <HistogramSvg bins={histogram} />
          {profiles && (
            <div className="grid gap-2">
              <ProfileSvg
                points={profiles.horizontal}
                title="水平剖面"
                minElevation={terrainData.minElevation || 0}
                maxElevation={terrainData.maxElevation || 1}
              />
              <ProfileSvg
                points={profiles.vertical}
                title="垂直剖面"
                minElevation={terrainData.minElevation || 0}
                maxElevation={terrainData.maxElevation || 1}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-terrain-muted bg-terrain-card/50 rounded-lg p-3">
          导入 DEM 后，这里会自动生成高程直方图和横纵剖面，便于论文、竞赛和汇报快速引用。
        </div>
      )}
    </motion.div>
  )
}
