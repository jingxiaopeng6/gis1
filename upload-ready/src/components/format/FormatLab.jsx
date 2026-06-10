import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { downloadBlobFile } from '../../utils/export'
import {
  buildCompatibilityMatrix,
  convertRasterSource,
  describeRoute,
  getDefaultTargetFormatForSource,
  getFormatDefinition,
  listSupportedFormats,
} from '../../utils/formatConversion'

function Pill({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'border-white/10 bg-slate-950/35 text-slate-300',
    good: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    warn: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
    bad: 'border-red-400/20 bg-red-400/10 text-red-200',
    sky: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
  }

  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${tones[tone] || tones.neutral}`}>{children}</span>
}

function Card({ title, desc, children }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-terrain-card/35 p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-terrain-text">{title}</div>
        {desc ? <div className="mt-1 text-[11px] leading-5 text-terrain-muted">{desc}</div> : null}
      </div>
      {children}
    </div>
  )
}

function ActionButton({ label, onClick, disabled, tone = 'primary' }) {
  const toneClasses =
    tone === 'ghost'
      ? 'bg-terrain-card/50 text-terrain-text border border-white/8 hover:border-terrain-accent/30'
      : tone === 'accent'
        ? 'bg-terrain-accent text-terrain-dark hover:opacity-95'
        : 'bg-white/8 text-terrain-text hover:bg-white/12'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-xl px-3 py-2 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${toneClasses}`}
    >
      {label}
    </button>
  )
}

function SourceRow({ option, active, onPick }) {
  const route = describeRoute(option.source, option.defaultTarget)
  return (
    <button
      type="button"
      onClick={() => onPick(option.id)}
      className={`w-full rounded-2xl border p-3 text-left transition-colors ${
        active ? 'border-amber-400/35 bg-amber-400/10' : 'border-white/6 bg-terrain-card/25 hover:border-white/12'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-terrain-text">{option.label}</div>
          <div className="mt-1 text-[11px] leading-5 text-terrain-muted">{option.sublabel}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Pill tone={route.supported ? 'good' : 'bad'}>{route.supported ? '可转换' : '受限'}</Pill>
          <Pill tone="neutral">{option.kind || 'unknown'}</Pill>
        </div>
      </div>
    </button>
  )
}

function FormatBadge({ item }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-slate-950/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium text-terrain-text">{item.label}</div>
        <Pill tone={item.browserWritable ? 'good' : 'bad'}>{item.browserWritable ? '浏览器' : '不可用'}</Pill>
      </div>
      <div className="mt-1 text-[11px] leading-5 text-terrain-muted">{item.notes}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Pill tone="neutral">{item.extension}</Pill>
        {item.roundTrip ? <Pill tone="sky">可互转</Pill> : <Pill tone="warn">有损/只读</Pill>}
      </div>
    </div>
  )
}

function buildSourceOptions({ datasets, terrainData, overlayData }) {
  const options = []
  const seen = new Set()
  const addOption = (id, source, label, sublabel, kind, defaultTarget) => {
    if (!source) return
    const key = `${source?.sourceFile || source?.name || id}:${kind}:${source?.width || 0}x${source?.height || 0}`
    if (seen.has(key)) return
    seen.add(key)
    options.push({
      id,
      source,
      label,
      sublabel,
      kind,
      defaultTarget: defaultTarget || getDefaultTargetFormatForSource(source),
    })
  }

  addOption(
    'current-dem',
    terrainData,
    `当前 DEM：${terrainData?.sourceFile || terrainData?.name || '未加载'}`,
    terrainData ? `${terrainData.width || '?'} × ${terrainData.height || '?'} · ${terrainData.crs || 'Unknown CRS'}` : '未加载',
    terrainData?.kind || 'dem'
  )

  addOption(
    'current-overlay',
    overlayData,
    `当前影像：${overlayData?.sourceFile || overlayData?.name || '未加载'}`,
    overlayData ? `${overlayData.width || '?'} × ${overlayData.height || '?'} · ${overlayData.crs || 'Unknown CRS'}` : '未加载',
    overlayData?.kind || 'imagery'
  )

  ;(datasets || []).forEach((item) => {
    const payload = item?.payload || item
    const label = item?.name || payload?.sourceFile || payload?.name || 'Unnamed dataset'
    const role = item?.role ? ` · ${item.role}` : ''
    addOption(
      item.id,
      payload,
      `${label}${role}`,
      `${item?.kind || payload?.kind || 'unknown'} · ${payload?.width || '?'} × ${payload?.height || '?'} · ${item?.crs || payload?.crs || 'Unknown CRS'}`,
      item?.kind || payload?.kind || 'unknown'
    )
  })

  return options
}

export default function FormatLab({
  datasets = [],
  terrainData,
  overlayData,
  onImportConvertedData,
  onOpenBandComposer,
  onOpenReportPage,
}) {
  const sourceOptions = useMemo(
    () => buildSourceOptions({ datasets, terrainData, overlayData }),
    [datasets, terrainData, overlayData]
  )
  const formatMatrix = useMemo(() => buildCompatibilityMatrix(), [])
  const availableTargets = useMemo(() => listSupportedFormats().filter((item) => item.browserWritable), [])
  const [selectedSourceId, setSelectedSourceId] = useState(sourceOptions[0]?.id || '')
  const [targetFormat, setTargetFormat] = useState(getDefaultTargetFormatForSource(sourceOptions[0]?.source))
  const [autoImport, setAutoImport] = useState(true)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!sourceOptions.length) return
    const stillExists = sourceOptions.some((item) => item.id === selectedSourceId)
    if (!stillExists) {
      setSelectedSourceId(sourceOptions[0].id)
      setTargetFormat(getDefaultTargetFormatForSource(sourceOptions[0].source))
    }
  }, [sourceOptions, selectedSourceId])

  const selectedSource = sourceOptions.find((item) => item.id === selectedSourceId) || null
  const route = selectedSource ? describeRoute(selectedSource.source, targetFormat) : null
  const targetDefinition = getFormatDefinition(targetFormat)
  const activeCount = datasets.filter((item) => item.include !== false).length

  const handleConvert = async () => {
    if (!selectedSource?.source || busy) return

    setBusy(true)
    setResult(null)

    try {
      const conversion = await convertRasterSource(selectedSource.source, targetFormat)
      setResult(conversion)

      if (!conversion.supported) return

      for (const file of conversion.files || []) {
        downloadBlobFile(file.name, file.blob)
      }

      if (autoImport && conversion.importedData) {
        onImportConvertedData?.(conversion.importedData)
      }
    } catch (error) {
      setResult({
        supported: false,
        route: 'error',
        warnings: [error?.message || String(error)],
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card space-y-4 p-4"
    >
      <div>
        <h3 className="font-display text-sm font-semibold text-terrain-text">格式转换中心</h3>
        <p className="mt-1 text-[11px] leading-5 text-terrain-muted">
          这里把 GeoTIFF 作为核心中转，浏览器内可完成 GeoTIFF / ENVI / PNG / JPEG / BMP 的真实导出。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/6 bg-slate-950/35 px-3 py-2">
          <div className="text-[10px] text-slate-400">活跃文件</div>
          <div className="text-sm font-semibold text-slate-100">{activeCount}</div>
        </div>
        <div className="rounded-xl border border-white/6 bg-slate-950/35 px-3 py-2">
          <div className="text-[10px] text-slate-400">可导出格式</div>
          <div className="text-sm font-semibold text-slate-100">{availableTargets.length}</div>
        </div>
      </div>

      <Card title="1. 选择源数据" desc="可以从当前工作区里的 DEM / 影像 / 合成结果直接发起转换。">
        <div className="space-y-2">
          {sourceOptions.length ? (
            sourceOptions.map((option) => (
              <SourceRow
                key={option.id}
                option={option}
                active={option.id === selectedSourceId}
                onPick={setSelectedSourceId}
              />
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-terrain-card/20 px-3 py-4 text-center text-xs text-terrain-muted">
              先导入一份 DEM 或影像，转换中心就会在这里自动出现可选源。
            </div>
          )}
        </div>
      </Card>

      <Card title="2. 选择目标格式" desc={targetDefinition?.notes || '选择一个输出格式。'}>
        <div className="grid grid-cols-2 gap-2">
          {availableTargets.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTargetFormat(item.id)}
              className={`rounded-xl border p-3 text-left transition-all ${
                targetFormat === item.id
                  ? 'border-amber-400/35 bg-amber-400/10'
                  : 'border-white/6 bg-terrain-card/25 hover:border-white/12'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-terrain-text">{item.label}</div>
                <Pill tone="good">浏览器</Pill>
              </div>
              <div className="mt-1 text-[11px] leading-5 text-terrain-muted">{item.notes}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Pill tone="neutral">{item.extension}</Pill>
                {item.lossy ? <Pill tone="warn">有损</Pill> : <Pill tone="good">无损</Pill>}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="3. 路线判断" desc="系统会根据源数据和目标格式给出真实可执行路径。">
        <div className="space-y-2 text-[11px] leading-5 text-terrain-muted">
          <div className="flex flex-wrap gap-2">
            <Pill tone={route?.supported ? 'good' : 'bad'}>{route?.supported ? '可直接转换' : '当前路径受限'}</Pill>
            <Pill tone="neutral">源格式：{route?.sourceFormat || 'unknown'}</Pill>
            <Pill tone="neutral">目标格式：{route?.targetFormat || targetFormat}</Pill>
          </div>
          {(route?.warnings || []).length ? (
            <div className="space-y-1">
              {route.warnings.map((warning) => (
                <div key={warning} className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-2 py-1.5 text-amber-100">
                  {warning}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-white/6 bg-slate-950/25 px-2 py-1.5">
              当前路径可执行，点击下方按钮即可导出。
            </div>
          )}
        </div>
      </Card>

      <Card title="4. 执行转换" desc="导出后可选择自动回写到当前工作区。">
        <div className="space-y-3">
          <label className="flex items-center gap-2 rounded-xl border border-white/6 bg-slate-950/30 px-3 py-2 text-xs text-terrain-muted">
            <input
              type="checkbox"
              checked={autoImport}
              onChange={(e) => setAutoImport(e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            转换后自动回写到工作区
          </label>

          <div className="grid grid-cols-2 gap-2">
            <ActionButton
              label={busy ? '转换中...' : '开始转换'}
              onClick={handleConvert}
              disabled={!selectedSource || busy || route?.supported === false}
              tone="accent"
            />
            <ActionButton label="打开波段合成" onClick={onOpenBandComposer} disabled={!datasets.length} tone="ghost" />
            <ActionButton label="一键生成汇报页" onClick={onOpenReportPage} disabled={!terrainData && !overlayData} />
            <ActionButton
              label="目标说明"
              onClick={() => {
                setResult({
                  supported: true,
                  route: 'info',
                  warnings: [targetDefinition?.notes || '当前目标格式暂无说明。'],
                })
              }}
              tone="ghost"
            />
          </div>
        </div>
      </Card>

      <Card title="5. 转换结果" desc="这里会展示上一次转换的文件列表和提示。">
        {result ? (
          <div className="space-y-2 text-[11px] leading-5 text-terrain-muted">
            <div className="flex flex-wrap gap-2">
              <Pill tone={result.supported ? 'good' : 'bad'}>{result.supported ? '成功/可执行' : '未执行/受限'}</Pill>
              <Pill tone="neutral">{result.route || 'unknown'}</Pill>
              <Pill tone="neutral">{result.targetFormat || targetFormat}</Pill>
            </div>
            {(result.warnings || []).length ? (
              <div className="space-y-1">
                {result.warnings.map((warning) => (
                  <div key={warning} className="rounded-lg border border-white/6 bg-slate-950/25 px-2 py-1.5">
                    {warning}
                  </div>
                ))}
              </div>
            ) : null}
            {result.files?.length ? (
              <div className="space-y-1">
                {result.files.map((file) => (
                  <div key={file.name} className="rounded-lg border border-white/6 bg-slate-950/25 px-2 py-1.5">
                    {file.name}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 bg-terrain-card/20 px-3 py-4 text-center text-xs text-terrain-muted">
            还没有执行转换。选择源数据和目标格式后就可以开始。
          </div>
        )}
      </Card>

      <Card title="能力矩阵" desc="这里只保留浏览器内真实可执行的输出格式。">
        <div className="grid grid-cols-1 gap-2">
          {formatMatrix.map((item) => (
            <FormatBadge key={item.id} item={item} />
          ))}
        </div>
      </Card>
    </motion.div>
  )
}
