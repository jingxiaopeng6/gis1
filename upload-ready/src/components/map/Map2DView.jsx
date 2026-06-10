import { useEffect, useMemo, useRef, useState } from 'react'

function drawPlaceholder(ctx, width, height, label) {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  gradient.addColorStop(0, '#0F172A')
  gradient.addColorStop(1, '#1E293B')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  for (let x = 0; x < width; x += 32) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += 32) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.fillStyle = '#E2E8F0'
  ctx.font = '600 20px Arial, sans-serif'
  ctx.fillText(label, 24, 40)
  ctx.fillStyle = '#94A3B8'
  ctx.font = '14px Arial, sans-serif'
  ctx.fillText('导入栅格或影像后，这里显示 2D 预览与联动结果。', 24, 68)
}

export default function Map2DView({ terrainData, overlayData, settings, title = '2D 地图预览' }) {
  const canvasRef = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  const source = useMemo(() => overlayData || terrainData, [overlayData, terrainData])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect()
      setSize({
        width: Math.max(1, Math.round(rect.width)),
        height: Math.max(1, Math.round(rect.height)),
      })
    }

    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !size.width || !size.height) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(size.width * dpr))
    canvas.height = Math.max(1, Math.round(size.height * dpr))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    if (!source?.data) {
      drawPlaceholder(ctx, size.width, size.height, title)
      return
    }

    const w = source.width
    const h = source.height
    const off = document.createElement('canvas')
    off.width = w
    off.height = h
    const offCtx = off.getContext('2d')

    if (source.kind === 'imagery' && source.channels >= 3) {
      const input = source.data instanceof Uint8ClampedArray ? source.data : new Uint8ClampedArray(source.data)
      offCtx.putImageData(new ImageData(input, w, h), 0, 0)
    } else {
      const imageData = offCtx.createImageData(w, h)
      const values = source.data || []
      for (let i = 0, p = 0; i < values.length; i += 1, p += 4) {
        const v = Math.max(0, Math.min(255, Math.round((values[i] || 0) * 255)))
        imageData.data[p] = v
        imageData.data[p + 1] = v
        imageData.data[p + 2] = v
        imageData.data[p + 3] = 255
      }
      offCtx.putImageData(imageData, 0, 0)
    }

    ctx.fillStyle = '#0B1220'
    ctx.fillRect(0, 0, size.width, size.height)

    const scale = Math.min(size.width / w, size.height / h)
    const drawW = w * scale
    const drawH = h * scale
    const dx = (size.width - drawW) / 2
    const dy = (size.height - drawH) / 2
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(off, dx, dy, drawW, drawH)

    ctx.fillStyle = 'rgba(15, 23, 42, 0.62)'
    ctx.fillRect(0, 0, size.width, 58)
    ctx.fillStyle = '#E2E8F0'
    ctx.font = '600 18px Arial, sans-serif'
    ctx.fillText(title, 18, 36)
    ctx.fillStyle = '#94A3B8'
    ctx.font = '12px Arial, sans-serif'
    ctx.fillText(`${source.sourceFile || 'preview'} · ${w} × ${h} · ${source.crs || 'Unknown CRS'}`, 18, 54)

    if (settings?.showOverlay && overlayData?.data) {
      ctx.fillStyle = 'rgba(245, 158, 11, 0.08)'
      ctx.fillRect(0, 0, size.width, size.height)
    }
  }, [source, overlayData, settings, title, size])

  return (
    <div className="h-full w-full bg-slate-950">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  )
}
