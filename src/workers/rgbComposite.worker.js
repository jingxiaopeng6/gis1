import { fromBlob, Pool } from 'geotiff'

const pool = new Pool()
const MAX_PREVIEW_DIM = 768

function clampByte(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value | 0
}

function percentile(sorted, p) {
  if (!sorted.length) return 0
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)))
  return sorted[index]
}

function computePercentileStretch(values, lowP = 0.02, highP = 0.98) {
  const sampleSize = Math.min(values.length, 65536)
  const sampled = new Float32Array(sampleSize)
  const step = Math.max(1, Math.floor(values.length / sampleSize))
  let n = 0
  for (let i = 0; i < values.length && n < sampleSize; i += step) {
    const v = values[i]
    if (Number.isFinite(v)) sampled[n++] = v
  }
  const arr = Array.from(sampled.slice(0, n)).sort((a, b) => a - b)
  const low = percentile(arr, lowP)
  const high = percentile(arr, highP)
  return { low, high: high <= low ? low + 1 : high }
}

async function readBandPreview(file, bbox, width, height, signal) {
  const tiff = await fromBlob(file)
  const image = await tiff.getImage()
  const rasters = await image.readRasters({
    bbox,
    width,
    height,
    samples: [0],
    interleave: false,
    pool,
    resampleMethod: 'bilinear',
    signal,
  })
  return rasters[0]
}

self.onmessage = async (event) => {
  const { requestId, red, green, blue, bbox, sourceWidth, sourceHeight, width, height } = event.data || {}
  const controller = new AbortController()

  try {
    const previewWidth = Math.max(1, Math.min(width || MAX_PREVIEW_DIM, MAX_PREVIEW_DIM))
    const previewHeight = Math.max(1, Math.min(height || MAX_PREVIEW_DIM, MAX_PREVIEW_DIM))
    const scale = Math.min(
      1,
      previewWidth / Math.max(1, sourceWidth || previewWidth),
      previewHeight / Math.max(1, sourceHeight || previewHeight)
    )
    const outWidth = Math.max(1, Math.round((sourceWidth || previewWidth) * scale))
    const outHeight = Math.max(1, Math.round((sourceHeight || previewHeight) * scale))

    const [r, g, b] = await Promise.all([
      readBandPreview(red, bbox, outWidth, outHeight, controller.signal),
      readBandPreview(green, bbox, outWidth, outHeight, controller.signal),
      readBandPreview(blue, bbox, outWidth, outHeight, controller.signal),
    ])

    const rStretch = computePercentileStretch(r)
    const gStretch = computePercentileStretch(g)
    const bStretch = computePercentileStretch(b)

    const output = new Uint8ClampedArray(outWidth * outHeight * 4)
    const rInv = 255 / (rStretch.high - rStretch.low)
    const gInv = 255 / (gStretch.high - gStretch.low)
    const bInv = 255 / (bStretch.high - bStretch.low)

    for (let i = 0, p = 0; i < r.length; i += 1, p += 4) {
      output[p] = clampByte((r[i] - rStretch.low) * rInv)
      output[p + 1] = clampByte((g[i] - gStretch.low) * gInv)
      output[p + 2] = clampByte((b[i] - bStretch.low) * bInv)
      output[p + 3] = 255
    }

    self.postMessage({
      requestId,
      width: outWidth,
      height: outHeight,
      rgba: output,
      previewOnly: true,
      stretch: {
        red: rStretch,
        green: gStretch,
        blue: bStretch,
      },
    }, [output.buffer])
  } catch (error) {
    self.postMessage({
      requestId,
      error: error?.message || String(error),
    })
  }
}
