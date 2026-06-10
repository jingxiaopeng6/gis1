import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { guessBandFromName, inspectRasterFile, isRasterFile } from '../utils/raster'
import { createColorTexture } from '../utils/terrain'

const MAX_PREVIEW_DIM = 768

function BandSlot({ label, file, enabled, onToggle, onPick }) {
  return (
    <div className="rounded-xl border border-white/10 bg-terrain-card/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onPick} className="flex-1 text-left">
          <div className="text-xs text-terrain-muted">{label}</div>
          <div className="mt-1 text-sm text-terrain-text whitespace-normal break-all leading-5" title={file?.name || '未选择'}>
            {file?.name || '未选择'}
          </div>
        </button>

        <button
          type="button"
          onClick={onToggle}
          disabled={!file}
          className={`shrink-0 px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
            enabled
              ? 'bg-terrain-accent text-terrain-dark border-terrain-accent'
              : 'bg-transparent text-terrain-muted border-white/10 hover:border-terrain-accent/40'
          } ${!file ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {enabled ? '已加入' : '加入'}
        </button>
      </div>
    </div>
  )
}

function ImportedFileRow({ item, onToggleInclude, onAssignBand, onRemove, isCompositeTarget }) {
  return (
    <div className={`rounded-lg border p-3 ${item.include ? 'border-terrain-accent/30 bg-terrain-accent/5' : 'border-white/10 bg-terrain-card/30'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.include}
          onChange={() => onToggleInclude(item.file.name)}
          className="mt-1 h-4 w-4 accent-amber-500"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm text-terrain-text whitespace-normal break-all leading-5" title={item.file.name}>
              {item.file.name}
            </div>
            <span className="text-[10px] text-terrain-muted shrink-0">{item.band || '未识别'}</span>
          </div>

          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onAssignBand(item.file.name, 'red')}
              className={`px-2 py-1 rounded-md text-[10px] border ${item.band === 'red' ? 'border-red-400 text-red-300' : 'border-white/10 text-terrain-muted'}`}
            >
              Red
            </button>
            <button
              type="button"
              onClick={() => onAssignBand(item.file.name, 'green')}
              className={`px-2 py-1 rounded-md text-[10px] border ${item.band === 'green' ? 'border-emerald-400 text-emerald-300' : 'border-white/10 text-terrain-muted'}`}
            >
              Green
            </button>
            <button
              type="button"
              onClick={() => onAssignBand(item.file.name, 'blue')}
              className={`px-2 py-1 rounded-md text-[10px] border ${item.band === 'blue' ? 'border-sky-400 text-sky-300' : 'border-white/10 text-terrain-muted'}`}
            >
              Blue
            </button>
            {isCompositeTarget && <span className="text-[10px] text-terrain-accent">合成目标</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.file.name)}
          className="shrink-0 px-2 py-1 rounded-md text-[10px] border border-white/10 text-terrain-muted hover:border-red-400/50 hover:text-red-300"
        >
          删除
        </button>
      </div>
    </div>
  )
}

export default function BandComposer({ onCompositeReady }) {
  const inputRef = useRef(null)
  const workerRef = useRef(null)
  const metaCacheRef = useRef(new Map())
  const [files, setFiles] = useState([])
  const [previewUrl, setPreviewUrl] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/rgbComposite.worker.js', import.meta.url), { type: 'module' })
    const worker = workerRef.current

    worker.onmessage = (event) => {
      const { rgba, width, height, error: workerError } = event.data || {}
      if (workerError) {
        setError(workerError)
        setBusy(false)
        return
      }

      if (rgba && width && height) {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.putImageData(new ImageData(rgba, width, height), 0, 0)
        setPreviewUrl(canvas.toDataURL('image/png'))

        const texture = createColorTexture(rgba, width, height, 4)
        onCompositeReady?.({
          kind: 'imagery',
          width,
          height,
          data: rgba,
          channels: 4,
          texture,
          sourceFile: 'rgb-composite',
          metadata: { source: 'band-composite', width, height },
        })
      }

      setBusy(false)
    }

    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [onCompositeReady])

  const normalizeName = (name) => String(name || '').toLowerCase()

  const upsertFiles = async (incomingFiles) => {
    const rasterFiles = Array.from(incomingFiles).filter(isRasterFile)
    if (!rasterFiles.length) return

    setError(null)
    const enriched = []

    for (const file of rasterFiles) {
      const cacheKey = `${file.name}_${file.size}_${file.lastModified}`
      let meta = metaCacheRef.current.get(cacheKey)
      if (!meta) {
        meta = await inspectRasterFile(file)
        metaCacheRef.current.set(cacheKey, meta)
      }

      enriched.push({
        file,
        band: meta.band || guessBandFromName(file.name),
        include: true,
        width: meta.width,
        height: meta.height,
        bbox: meta.bbox,
        sourceFile: file.name,
        cacheKey,
      })
    }

    setFiles((prev) => {
      const map = new Map(prev.map((item) => [item.cacheKey, item]))
      for (const item of enriched) {
        const existing = map.get(item.cacheKey)
        if (existing) {
          map.set(item.cacheKey, {
            ...existing,
            ...item,
            include: existing.include ?? true,
          })
        } else {
          map.set(item.cacheKey, item)
        }
      }
      return Array.from(map.values())
    })
  }

  const handleFileSelect = async (e) => {
    await upsertFiles(e.target.files || [])
    e.target.value = ''
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    await upsertFiles(e.dataTransfer.files || [])
  }

  const toggleInclude = (fileName) => {
    setFiles((prev) => prev.map((item) => (item.file.name === fileName ? { ...item, include: !item.include } : item)))
  }

  const assignBand = (fileName, band) => {
    setFiles((prev) =>
      prev.map((item) => {
        if (item.file.name === fileName) return { ...item, band }
        if (item.band === band && item.file.name !== fileName) return { ...item, band: null }
        return item
      })
    )
  }

  const removeFile = (fileName) => {
    setFiles((prev) => prev.filter((item) => item.file.name !== fileName))
  }

  const resetAll = () => {
    setFiles([])
    setPreviewUrl(null)
    setError(null)
  }

  const toggleBandEnabled = (band) => {
    setFiles((prev) =>
      prev.map((item) => {
        if (item.band !== band) return item
        return { ...item, include: !item.include }
      })
    )
  }

  const pickCompositeFiles = () => {
    const selected = files.filter((item) => item.include)
    const red = selected.find((item) => item.band === 'red')
    const green = selected.find((item) => item.band === 'green')
    const blue = selected.find((item) => item.band === 'blue')
    return { red, green, blue }
  }

  const handleComposite = async () => {
    const { red, green, blue } = pickCompositeFiles()
    if (!red || !green || !blue) {
      setError('请至少勾选并指定 Red / Green / Blue 三个文件')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const bbox = red.bbox || green.bbox || blue.bbox
      const sourceWidth = Math.max(red.width || 0, green.width || 0, blue.width || 0)
      const sourceHeight = Math.max(red.height || 0, green.height || 0, blue.height || 0)
      const scale = Math.min(
        1,
        MAX_PREVIEW_DIM / Math.max(1, sourceWidth),
        MAX_PREVIEW_DIM / Math.max(1, sourceHeight)
      )
      const width = Math.max(1, Math.round(sourceWidth * scale))
      const height = Math.max(1, Math.round(sourceHeight * scale))

      workerRef.current?.postMessage({
        requestId: crypto.randomUUID(),
        red: red.file,
        green: green.file,
        blue: blue.file,
        width,
        height,
        bbox,
        previewOnly: true,
        sourceWidth,
        sourceHeight,
      })
    } catch (err) {
      setError(err?.message || '波段合成失败')
      setBusy(false)
    }
  }

  const importedCount = files.length
  const activeCount = files.filter((item) => item.include).length
  const selectedCount = files.filter((item) => item.include && item.band).length
  const compositeTarget = pickCompositeFiles()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-3 space-y-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-terrain-text">RGB 波段合成</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetAll}
            className="text-xs px-3 py-1.5 rounded-lg bg-terrain-card text-terrain-muted border border-white/10 hover:border-red-400/40 hover:text-red-300"
          >
            重置
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded-lg bg-terrain-accent text-terrain-dark font-medium"
          >
            导入文件
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".tif,.tiff,.img,.vrt"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="grid grid-cols-1 gap-2">
        <BandSlot
          label="Red"
          file={compositeTarget.red?.file}
          enabled={!!compositeTarget.red?.include}
          onPick={() => inputRef.current?.click()}
          onToggle={() => toggleBandEnabled('red')}
        />
        <BandSlot
          label="Green"
          file={compositeTarget.green?.file}
          enabled={!!compositeTarget.green?.include}
          onPick={() => inputRef.current?.click()}
          onToggle={() => toggleBandEnabled('green')}
        />
        <BandSlot
          label="Blue"
          file={compositeTarget.blue?.file}
          enabled={!!compositeTarget.blue?.include}
          onPick={() => inputRef.current?.click()}
          onToggle={() => toggleBandEnabled('blue')}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px] text-terrain-muted">
        <div className="rounded-lg bg-terrain-card/30 px-2 py-1">已导入 {importedCount}</div>
        <div className="rounded-lg bg-terrain-card/30 px-2 py-1">已加入 {activeCount}</div>
        <div className="rounded-lg bg-terrain-card/30 px-2 py-1">已指定 {selectedCount}</div>
      </div>

      <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
        {files.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-terrain-card/20 px-3 py-4 text-center text-xs text-terrain-muted">
            拖入多个单波段 GeoTIFF 后，会在这里显示完整文件列表，并可选择是否加入合成。
          </div>
        ) : (
          files.map((item) => (
            <ImportedFileRow
              key={item.cacheKey}
              item={item}
              onToggleInclude={toggleInclude}
              onAssignBand={assignBand}
              onRemove={removeFile}
              isCompositeTarget={
                compositeTarget.red?.file?.name === item.file.name ||
                compositeTarget.green?.file?.name === item.file.name ||
                compositeTarget.blue?.file?.name === item.file.name
              }
            />
          ))
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={handleComposite}
          disabled={busy || !compositeTarget.red || !compositeTarget.green || !compositeTarget.blue}
          className="flex-1 rounded-lg bg-terrain-accent text-terrain-dark text-sm font-semibold py-2 disabled:opacity-40"
        >
          {busy ? '合成中...' : '生成真彩色预览'}
        </button>
      </div>

      {error && <div className="text-xs text-red-300">{error}</div>}

      {previewUrl && (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <div className="text-xs text-terrain-muted px-3 py-2 border-b border-white/10">
            预览纹理已生成，可直接作为 3D 地形贴图使用。
          </div>
          <div className="p-3">
            <img alt="RGB composite preview" className="w-full max-h-48 rounded-md object-contain" src={previewUrl} />
          </div>
        </div>
      )}
    </motion.div>
  )
}
