import * as geotiff from 'geotiff'

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']
const RASTER_EXTENSIONS = ['.tif', '.tiff', '.img', '.vrt']
const BAND_HINTS = {
  red: ['red', 'b4', 'band4', '_4', '-4', ' r'],
  green: ['green', 'b3', 'band3', '_3', '-3', ' g'],
  blue: ['blue', 'b2', 'band2', '_2', '-2', ' b'],
}

export function getFileExtension(name = '') {
  const lower = String(name).toLowerCase()
  const idx = lower.lastIndexOf('.')
  return idx >= 0 ? lower.slice(idx) : ''
}

export function isSupportedRasterFile(file) {
  const ext = getFileExtension(file?.name)
  return IMAGE_EXTENSIONS.includes(ext) || RASTER_EXTENSIONS.includes(ext)
}

export function isPlainImageFile(file) {
  return IMAGE_EXTENSIONS.includes(getFileExtension(file?.name))
}

export function isRasterFile(file) {
  return RASTER_EXTENSIONS.includes(getFileExtension(file?.name))
}

export function guessBandFromName(name = '') {
  const lower = String(name).toLowerCase()
  if (BAND_HINTS.red.some((hint) => lower.includes(hint))) return 'red'
  if (BAND_HINTS.green.some((hint) => lower.includes(hint))) return 'green'
  if (BAND_HINTS.blue.some((hint) => lower.includes(hint))) return 'blue'
  return null
}

export async function readImageFile(file) {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  bitmap.close?.()

  return {
    kind: 'imagery',
    width: bitmap.width,
    height: bitmap.height,
    data: new Uint8ClampedArray(imageData.data),
    metadata: {
      width: bitmap.width,
      height: bitmap.height,
      source: file.name,
      format: getFileExtension(file.name).slice(1).toUpperCase(),
      kind: 'image',
    },
    sourceFile: file.name,
  }
}

function pickNodataValue(image) {
  const gdalNoData = image.getGDALNoData?.()
  if (gdalNoData !== null && gdalNoData !== undefined && Number.isFinite(Number(gdalNoData))) {
    return Number(gdalNoData)
  }

  const nodataMeta = image.fileDirectory?.GDAL_NODATA
  if (typeof nodataMeta === 'string' && nodataMeta.trim() !== '') {
    const parsed = Number(nodataMeta)
    if (Number.isFinite(parsed)) return parsed
  }

  return null
}

function inferRasterKind(file, image) {
  const samples = image.getSamplesPerPixel?.() ?? image.fileDirectory?.SamplesPerPixel ?? 1
  const photometric = image.fileDirectory?.PhotometricInterpretation
  const sampleFormat = image.fileDirectory?.SampleFormat?.[0] ?? image.fileDirectory?.SampleFormat ?? 1
  const ext = getFileExtension(file?.name)

  if (samples >= 3 || photometric === 2) return 'imagery'
  if (ext === '.img') return 'dem'
  if ([2, 3, 4, 5, 6, 7].includes(sampleFormat)) return 'dem'
  return 'dem'
}

async function inspectGeoRaster(file) {
  const tiff = await geotiff.fromBlob(file)
  const image = await tiff.getImage()
  const width = image.getWidth()
  const height = image.getHeight()
  const bbox = image.getBoundingBox?.()
  const geoKeys = image.getGeoKeys?.() || {}
  const projectedCode = geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey
  const samples = image.getSamplesPerPixel?.() ?? image.fileDirectory?.SamplesPerPixel ?? 1
  const photometric = image.fileDirectory?.PhotometricInterpretation
  const sampleFormat = image.fileDirectory?.SampleFormat?.[0] ?? image.fileDirectory?.SampleFormat ?? 1

  return {
    kind: inferRasterKind(file, image),
    band: guessBandFromName(file?.name),
    width,
    height,
    bbox,
    crs: projectedCode ? `EPSG:${projectedCode}` : 'Unknown',
    samples,
    photometric,
    sampleFormat,
    sourceFile: file.name,
    file,
  }
}

async function readGeoRaster(file) {
  const tiff = await geotiff.fromBlob(file)
  const image = await tiff.getImage()
  const width = image.getWidth()
  const height = image.getHeight()
  const kind = inferRasterKind(file, image)
  const metadata = {
    width,
    height,
    source: file.name,
    format: getFileExtension(file.name).slice(1).toUpperCase(),
    kind,
  }

  const bbox = image.getBoundingBox?.()
  if (bbox) metadata.bbox = bbox

  const geoKeys = image.getGeoKeys?.() || {}
  const projectedCode = geoKeys.ProjectedCSTypeGeoKey || geoKeys.GeographicTypeGeoKey
  metadata.crs = projectedCode ? `EPSG:${projectedCode}` : 'Unknown'

  if (kind === 'imagery') {
    const rgb = await image.readRGB({
      interleave: true,
      width,
      height,
      enableAlpha: true,
    })
    const rgbData = rgb.data || rgb

    return {
      kind,
      width,
      height,
      data: rgbData instanceof Uint8ClampedArray ? rgbData : new Uint8ClampedArray(rgbData),
      channels: Math.max(3, (rgbData.length || 0) / (width * height)),
      metadata: {
        ...metadata,
        channels: Math.max(3, (rgbData.length || 0) / (width * height)),
      },
      sourceFile: file.name,
    }
  }

  const rasters = await image.readRasters({ interleave: false })
  const elevationData = rasters[0]
  const nodata = pickNodataValue(image)
  const isValidValue = (value) => {
    if (!Number.isFinite(value)) return false
    if (nodata === null || nodata === undefined) return true
    return value !== nodata
  }

  let minElevation = Infinity
  let maxElevation = -Infinity
  for (let i = 0; i < elevationData.length; i += 1) {
    const value = elevationData[i]
    if (isValidValue(value)) {
      if (value < minElevation) minElevation = value
      if (value > maxElevation) maxElevation = value
    }
  }

  if (!Number.isFinite(minElevation) || !Number.isFinite(maxElevation)) {
    minElevation = 0
    maxElevation = 1
  }

  const range = maxElevation - minElevation || 1
  const normalized = new Float32Array(width * height)
  for (let i = 0; i < elevationData.length; i += 1) {
    const value = elevationData[i]
    normalized[i] = isValidValue(value) ? (value - minElevation) / range : 0
  }

  metadata.minElevation = minElevation
  metadata.maxElevation = maxElevation
  metadata.nodata = nodata
  metadata.bbox = bbox

  return {
    kind,
    width,
    height,
    data: normalized,
    metadata,
    minElevation,
    maxElevation,
    sourceFile: file.name,
  }
}

export async function loadRasterFile(file) {
  const ext = getFileExtension(file?.name)

  if (isPlainImageFile(file)) {
    return readImageFile(file)
  }

  if (isRasterFile(file)) {
    try {
      return await readGeoRaster(file)
    } catch (error) {
      const message = error?.message || String(error)
      if (ext === '.img') {
        const err = new Error(
          '当前 .img 文件是 ERDAS/HFA 格式，浏览器端无法直接解码。请先转换为 GeoTIFF 再上传，或使用同区域的 GeoTIFF/TIFF 数据。'
        )
        err.cause = error
        throw err
      }
      throw new Error(`鏍呮牸鏂囦欢瑙ｆ瀽澶辫触: ${message}`)
    }
  }

  throw new Error('涓嶆敮鎸佺殑鏂囦欢鏍煎紡')
}

export async function inspectRasterFile(file) {
  const ext = getFileExtension(file?.name)

  if (isPlainImageFile(file)) {
    return {
      kind: 'imagery',
      band: null,
      width: null,
      height: null,
      bbox: null,
      crs: 'Unknown',
      samples: 4,
      photometric: null,
      sampleFormat: 1,
      sourceFile: file.name,
      file,
    }
  }

  if (isRasterFile(file)) {
    try {
      return await inspectGeoRaster(file)
    } catch (error) {
      if (ext === '.img') {
        const err = new Error(
          '当前 .img 文件是 ERDAS/HFA 格式，浏览器端无法直接解码。请先转换为 GeoTIFF 再上传，或使用同区域的 GeoTIFF/TIFF 数据。'
        )
        err.cause = error
        throw err
      }
      throw new Error(`鏍呮牸鏂囦欢瑙ｆ瀽澶辫触: ${error?.message || String(error)}`)
    }
  }

  throw new Error('涓嶆敮鎸佺殑鏂囦欢鏍煎紡')
}
