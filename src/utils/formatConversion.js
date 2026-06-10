import { writeArrayBuffer } from 'geotiff'

const IMAGE_EXPORT_FORMATS = ['png', 'jpeg', 'jpg', 'webp', 'bmp', 'ppm', 'pgm']
const RASTER_EXPORT_FORMATS = ['geotiff', 'envi']

export const FORMAT_CATALOG = [
  {
    id: 'geotiff',
    label: 'GeoTIFF',
    extension: '.tif',
    mimeType: 'image/tiff',
    browserWritable: true,
    roundTrip: true,
    lossy: false,
    notes: '通用中转格式，尽量保留波段、位深、投影和 NoData。',
  },
  {
    id: 'envi',
    label: 'ENVI',
    extension: '.hdr + .dat',
    mimeType: 'application/octet-stream',
    browserWritable: true,
    roundTrip: true,
    lossy: false,
    pairFile: true,
    notes: '浏览器可导出标准 ENVI 头文件 + 原始栅格数据对。',
  },
  {
    id: 'png',
    label: 'PNG',
    extension: '.png',
    mimeType: 'image/png',
    browserWritable: true,
    roundTrip: false,
    lossy: false,
    notes: '适合无损可视化输出，不保留原始辐射位深。',
  },
  {
    id: 'webp',
    label: 'WebP',
    extension: '.webp',
    mimeType: 'image/webp',
    browserWritable: true,
    roundTrip: false,
    lossy: true,
    notes: '现代浏览器可直接导出，压缩效率高，适合快速分发。',
  },
  {
    id: 'jpeg',
    label: 'JPEG',
    extension: '.jpg',
    mimeType: 'image/jpeg',
    browserWritable: true,
    roundTrip: false,
    lossy: true,
    notes: '有损压缩，不建议用于科研定量分析。',
  },
  {
    id: 'bmp',
    label: 'BMP',
    extension: '.bmp',
    mimeType: 'image/bmp',
    browserWritable: true,
    roundTrip: false,
    lossy: false,
    notes: '无压缩普通位图，适合兼容性输出。',
  },
  {
    id: 'ppm',
    label: 'PPM',
    extension: '.ppm',
    mimeType: 'image/x-portable-pixmap',
    browserWritable: true,
    roundTrip: false,
    lossy: false,
    notes: '纯浏览器可写的二进制真彩格式，适合轻量交换。',
  },
  {
    id: 'pgm',
    label: 'PGM',
    extension: '.pgm',
    mimeType: 'image/x-portable-graymap',
    browserWritable: true,
    roundTrip: false,
    lossy: false,
    notes: '纯浏览器可写的二进制灰度格式，适合 DEM 和预览图。',
  },
]

function stripExtension(name = '') {
  const value = String(name || '').trim()
  const lastDot = value.lastIndexOf('.')
  if (lastDot <= 0) return value || 'raster'
  return value.slice(0, lastDot)
}

function sanitizeBaseName(name = '') {
  const base = stripExtension(name)
  const cleaned = base.replace(/[\\/:*?"<>|]+/g, '_').trim()
  return cleaned || 'raster'
}

function getSourceRecord(source) {
  return source?.payload || source || {}
}

function getSourceFormat(source) {
  const record = getSourceRecord(source)
  const metadataFormat = String(record?.metadata?.format || '').toLowerCase()
  const sourceFile = String(record?.sourceFile || record?.name || '')
  const ext = sourceFile.includes('.') ? sourceFile.slice(sourceFile.lastIndexOf('.') + 1).toLowerCase() : ''
  const kind = String(record?.kind || '').toLowerCase()

  if (metadataFormat) {
    if (metadataFormat.includes('tiff') || metadataFormat.includes('tif')) return 'geotiff'
    if (metadataFormat.includes('envi')) return 'envi'
    if (metadataFormat.includes('png')) return 'png'
    if (metadataFormat.includes('webp')) return 'webp'
    if (metadataFormat.includes('jpeg') || metadataFormat.includes('jpg')) return 'jpeg'
    if (metadataFormat.includes('bmp')) return 'bmp'
    if (metadataFormat.includes('portable pixmap') || metadataFormat.includes('ppm')) return 'ppm'
    if (metadataFormat.includes('portable graymap') || metadataFormat.includes('pgm')) return 'pgm'
  }

  if (kind === 'dem') return ext === 'img' ? 'unknown' : 'geotiff'
  if (kind === 'imagery') {
    if (['png', 'jpg', 'jpeg', 'webp', 'bmp', 'ppm', 'pgm'].includes(ext)) {
      if (ext === 'jpg') return 'jpeg'
      return ext
    }
    return 'geotiff'
  }

  switch (ext) {
    case 'tif':
    case 'tiff':
      return 'geotiff'
    case 'hdr':
      return 'envi'
    case 'png':
      return 'png'
    case 'webp':
      return 'webp'
    case 'jpg':
    case 'jpeg':
      return 'jpeg'
    case 'bmp':
      return 'bmp'
    case 'ppm':
      return 'ppm'
    case 'pgm':
      return 'pgm'
    default:
      return 'unknown'
  }
}

function getTargetDefinition(targetFormat) {
  return FORMAT_CATALOG.find((item) => item.id === targetFormat) || null
}

function getDimensions(source) {
  const record = getSourceRecord(source)
  return {
    width: Number(record?.width || 0),
    height: Number(record?.height || 0),
  }
}

function getBbox(source) {
  const record = getSourceRecord(source)
  const bbox = record?.bbox || record?.metadata?.bbox || null
  return Array.isArray(bbox) && bbox.length === 4 ? bbox.map((value) => Number(value)) : null
}

function getCrs(source) {
  const record = getSourceRecord(source)
  return String(record?.crs || record?.metadata?.crs || '').trim() || 'Unknown'
}

function parseEpsgCode(crs) {
  const match = String(crs || '').match(/EPSG\s*:\s*(\d+)/i)
  if (!match) return null
  const code = Number(match[1])
  return Number.isFinite(code) ? code : null
}

function getKind(source) {
  const record = getSourceRecord(source)
  return String(record?.kind || 'unknown').toLowerCase()
}

function getNormalizedTerrainRange(source) {
  const record = getSourceRecord(source)
  const minElevation = Number.isFinite(Number(record?.minElevation)) ? Number(record.minElevation) : 0
  const maxElevation = Number.isFinite(Number(record?.maxElevation)) ? Number(record.maxElevation) : 1
  return { minElevation, maxElevation }
}

function clampByte(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value | 0
}

function toRgbaBytes(source) {
  const record = getSourceRecord(source)
  const { width, height } = getDimensions(record)
  const pixelCount = width * height
  const sourceData = record?.data

  if (!width || !height || !sourceData) return new Uint8ClampedArray()

  if (record?.kind === 'imagery') {
    if (record?.channels && record.channels >= 4 && sourceData.length >= pixelCount * 4) {
      return sourceData instanceof Uint8ClampedArray ? new Uint8ClampedArray(sourceData) : new Uint8ClampedArray(sourceData)
    }

    if (record?.channels === 3 && sourceData.length >= pixelCount * 3) {
      const rgba = new Uint8ClampedArray(pixelCount * 4)
      for (let i = 0, p = 0; i < pixelCount; i += 1, p += 4) {
        const s = i * 3
        rgba[p] = sourceData[s] ?? 0
        rgba[p + 1] = sourceData[s + 1] ?? rgba[p]
        rgba[p + 2] = sourceData[s + 2] ?? rgba[p]
        rgba[p + 3] = 255
      }
      return rgba
    }
  }

  const rgba = new Uint8ClampedArray(pixelCount * 4)
  const { minElevation, maxElevation } = getNormalizedTerrainRange(record)
  const range = maxElevation - minElevation || 1

  for (let i = 0, p = 0; i < pixelCount; i += 1, p += 4) {
    const normalized = Number(sourceData[i] ?? 0)
    const value = clampByte(Math.round((Number.isFinite(normalized) ? normalized : 0) * 255))
    rgba[p] = value
    rgba[p + 1] = value
    rgba[p + 2] = value
    rgba[p + 3] = 255
  }

  return rgba
}

function toRgbBytes(source) {
  const rgba = toRgbaBytes(source)
  const rgb = new Uint8Array((rgba.length / 4) * 3)
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    rgb[j] = rgba[i]
    rgb[j + 1] = rgba[i + 1]
    rgb[j + 2] = rgba[i + 2]
  }
  return rgb
}

function toFloat32Elevation(source) {
  const record = getSourceRecord(source)
  const { width, height } = getDimensions(record)
  const pixelCount = width * height
  const sourceData = record?.data
  const out = new Float32Array(pixelCount)
  const { minElevation, maxElevation } = getNormalizedTerrainRange(record)
  const range = maxElevation - minElevation || 1

  for (let i = 0; i < pixelCount; i += 1) {
    const normalized = Number(sourceData?.[i] ?? 0)
    out[i] = minElevation + (Number.isFinite(normalized) ? normalized : 0) * range
  }

  return out
}

function createCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}

function drawSourceToCanvas(source) {
  const { width, height } = getDimensions(source)
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const record = getSourceRecord(source)
  const sourceData = record?.data

  if (!width || !height || !sourceData) {
    return canvas
  }

  if (record?.kind === 'imagery' && sourceData.length >= width * height * 4) {
    ctx.putImageData(new ImageData(toRgbaBytes(record), width, height), 0, 0)
    return canvas
  }

  const rgba = toRgbaBytes(record)
  ctx.putImageData(new ImageData(rgba, width, height), 0, 0)
  return canvas
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

function encodeBmpFromRgba(rgba, width, height) {
  const rowSize = Math.floor((24 * width + 31) / 32) * 4
  const pixelArraySize = rowSize * height
  const headerSize = 54
  const fileSize = headerSize + pixelArraySize
  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)
  const bytes = new Uint8Array(buffer)

  view.setUint8(0, 0x42)
  view.setUint8(1, 0x4d)
  view.setUint32(2, fileSize, true)
  view.setUint32(10, headerSize, true)
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  view.setUint32(34, pixelArraySize, true)
  view.setUint32(38, 2835, true)
  view.setUint32(42, 2835, true)

  const rowPadding = rowSize - width * 3
  let offset = headerSize

  for (let y = height - 1; y >= 0; y -= 1) {
    const rowBase = y * width * 4
    for (let x = 0; x < width; x += 1) {
      const src = rowBase + x * 4
      bytes[offset++] = rgba[src + 2]
      bytes[offset++] = rgba[src + 1]
      bytes[offset++] = rgba[src]
    }
    for (let i = 0; i < rowPadding; i += 1) {
      bytes[offset++] = 0
    }
  }

  return new Blob([buffer], { type: 'image/bmp' })
}

function encodePortablePixelMap(rgba, width, height) {
  const header = `P6\n${width} ${height}\n255\n`
  const pixels = new Uint8Array(width * height * 3)
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 3) {
    pixels[j] = rgba[i]
    pixels[j + 1] = rgba[i + 1]
    pixels[j + 2] = rgba[i + 2]
  }
  return new Blob([header, pixels], { type: 'image/x-portable-pixmap' })
}

function encodePortableGrayMap(gray, width, height) {
  const header = `P5\n${width} ${height}\n255\n`
  return new Blob([header, gray], { type: 'image/x-portable-graymap' })
}

function toGrayBytes(source) {
  const rgba = toRgbaBytes(source)
  const gray = new Uint8Array(rgba.length / 4)
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 1) {
    gray[j] = clampByte(Math.round(rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114))
  }
  return gray
}

function buildGeoMetadata(source, targetKind) {
  const record = getSourceRecord(source)
  const { width, height } = getDimensions(record)
  const bbox = getBbox(record)
  const crs = getCrs(record)
  const epsg = parseEpsgCode(crs)
  const metadata = {
    width,
    height,
    Compression: 1,
    PlanarConfiguration: 1,
    RowsPerStrip: height,
  }
  const warnings = []

  if (bbox) {
    const [xmin, ymin, xmax, ymax] = bbox
    const xRes = Math.abs((xmax - xmin) / Math.max(1, width))
    const yRes = Math.abs((ymax - ymin) / Math.max(1, height))
    metadata.ModelPixelScale = [xRes, yRes, 0]
    metadata.ModelTiepoint = [0, 0, 0, xmin, ymax, 0]

    if (epsg) {
      if (epsg === 4326) {
        metadata.GeographicTypeGeoKey = 4326
      } else {
        metadata.ProjectedCSTypeGeoKey = epsg
      }
    } else {
      metadata.GeographicTypeGeoKey = 4326
      warnings.push('未识别 CRS，已按 EPSG:4326 写入 GeoKey。')
    }
  } else {
    metadata.ModelPixelScale = [1, 1, 0]
    metadata.ModelTiepoint = [0, 0, 0, 0, 0, 0]
    metadata.GeographicTypeGeoKey = 4326
    warnings.push('未找到地理范围，已导出为像素坐标占位 GeoTIFF。')
  }

  const nodata = record?.metadata?.nodata
  if ((getKind(record) === 'dem' || targetKind === 'dem') && Number.isFinite(Number(nodata))) {
    metadata.GDAL_NODATA = String(nodata)
  }

  return { metadata, warnings, crs }
}

function buildGeoTiffBlobAndData(source) {
  const record = getSourceRecord(source)
  const kind = getKind(record)
  const { width, height } = getDimensions(record)
  const { metadata, warnings, crs } = buildGeoMetadata(record, kind)
  const outputNameBase = sanitizeBaseName(record?.sourceFile || record?.name || 'raster')
  const outputFileName = `${outputNameBase}.tif`
  const importedData = {
    ...record,
    kind: kind === 'dem' ? 'dem' : 'imagery',
    width,
    height,
    sourceFile: outputFileName,
    crs,
    metadata: {
      ...(record?.metadata || {}),
      format: 'GeoTIFF',
      width,
      height,
      crs,
    },
  }

  if (kind === 'dem') {
    const values = toFloat32Elevation(record)
    const metadataForWrite = {
      ...metadata,
      SamplesPerPixel: [1],
      BitsPerSample: [32],
      SampleFormat: [3],
      PhotometricInterpretation: 1,
    }

    if (Number.isFinite(Number(record?.metadata?.nodata))) {
      metadataForWrite.GDAL_NODATA = String(record.metadata.nodata)
    }

    const blob = new Blob([writeArrayBuffer(values, metadataForWrite)], { type: 'image/tiff' })
    return {
      supported: true,
      files: [{ name: outputFileName, blob, mimeType: 'image/tiff' }],
      importedData,
      warnings,
      route: 'browser-geotiff',
      sourceFormat: getSourceFormat(record),
      targetFormat: 'geotiff',
      outputNameBase,
    }
  }

  const rgb = toRgbBytes(record)
  const metadataForWrite = {
    ...metadata,
    SamplesPerPixel: [3],
    BitsPerSample: [8, 8, 8],
    SampleFormat: [1, 1, 1],
    PhotometricInterpretation: 2,
  }

  const blob = new Blob([writeArrayBuffer(rgb, metadataForWrite)], { type: 'image/tiff' })
  return {
    supported: true,
    files: [{ name: outputFileName, blob, mimeType: 'image/tiff' }],
    importedData,
    warnings,
    route: 'browser-geotiff',
    sourceFormat: getSourceFormat(record),
    targetFormat: 'geotiff',
    outputNameBase,
  }
}

function buildEnviHeader({ width, height, bands, dataType, interleave, crs, bbox, sourceName }) {
  const lines = [
    'ENVI',
    `description = {Converted from ${sourceName}}`,
    `samples = ${width}`,
    `lines = ${height}`,
    `bands = ${bands}`,
    'header offset = 0',
    'file type = ENVI Standard',
    `data type = ${dataType}`,
    `interleave = ${interleave}`,
    'byte order = 0',
  ]

  if (bbox) {
    const [xmin, ymin, xmax, ymax] = bbox
    const xRes = Math.abs((xmax - xmin) / Math.max(1, width))
    const yRes = Math.abs((ymax - ymin) / Math.max(1, height))
    const mapInfo = crs && crs !== 'Unknown'
      ? `map info = {Geographic Lat/Lon, 1.000000, 1.000000, ${xmin.toFixed(8)}, ${ymax.toFixed(8)}, ${xRes.toFixed(8)}, ${yRes.toFixed(8)}, WGS-84, units=Degrees}`
      : `map info = {Arbitrary Grid, 1.000000, 1.000000, ${xmin.toFixed(8)}, ${ymax.toFixed(8)}, ${xRes.toFixed(8)}, ${yRes.toFixed(8)}, Arbitrary, units=Unknown}`
    lines.push(mapInfo)
  }

  return `${lines.join('\n')}\n`
}

function buildEnviExport(source) {
  const record = getSourceRecord(source)
  const kind = getKind(record)
  const { width, height } = getDimensions(record)
  const bbox = getBbox(record)
  const crs = getCrs(record)
  const outputBase = sanitizeBaseName(record?.sourceFile || record?.name || 'raster')
  const warnings = []
  let importedData
  let dataType
  let bandCount
  let rawBuffer
  let rawName

  if (kind === 'dem') {
    const values = toFloat32Elevation(record)
    dataType = 4
    bandCount = 1
    rawBuffer = values.buffer.slice(0)
    rawName = `${outputBase}.dat`
    importedData = {
      ...record,
      kind: 'dem',
      width,
      height,
      sourceFile: rawName,
      crs,
      metadata: {
        ...(record?.metadata || {}),
        format: 'ENVI',
        interleave: 'bip',
        dataType,
        width,
        height,
        crs,
      },
    }
  } else {
    const rgb = toRgbBytes(record)
    dataType = 1
    bandCount = 3
    rawBuffer = rgb.buffer.slice(0)
    rawName = `${outputBase}.dat`
    importedData = {
      ...record,
      kind: 'imagery',
      width,
      height,
      channels: 3,
      sourceFile: rawName,
      crs,
      data: toRgbaBytes(record),
      metadata: {
        ...(record?.metadata || {}),
        format: 'ENVI',
        interleave: 'bip',
        dataType,
        width,
        height,
        channels: 3,
        crs,
      },
    }
  }

  const headerText = buildEnviHeader({
    width,
    height,
    bands: bandCount,
    dataType,
    interleave: 'bip',
    crs,
    bbox,
    sourceName: record?.sourceFile || record?.name || 'raster',
  })

  warnings.push('ENVI 会导出为 .hdr + .dat 两个文件，请同时保留。')
  if (kind !== 'dem') {
    warnings.push('RGBA/alpha 已折叠为 RGB 三波段导出。')
  }

  return {
    supported: true,
    files: [
      {
        name: `${outputBase}.hdr`,
        blob: new Blob([headerText], { type: 'text/plain;charset=utf-8' }),
        mimeType: 'text/plain;charset=utf-8',
      },
      {
        name: rawName,
        blob: new Blob([rawBuffer], { type: 'application/octet-stream' }),
        mimeType: 'application/octet-stream',
      },
    ],
    importedData,
    warnings,
    route: 'browser-envi',
    sourceFormat: getSourceFormat(record),
    targetFormat: 'envi',
    outputNameBase: outputBase,
  }
}

function buildPortableMapExport(source, targetFormat) {
  const record = getSourceRecord(source)
  const { width, height } = getDimensions(record)
  const outputBase = sanitizeBaseName(record?.sourceFile || record?.name || 'raster')
  const isGray = targetFormat === 'pgm'
  const warnings = []
  const importedData = {
    ...record,
    kind: 'imagery',
    width,
    height,
    channels: isGray ? 1 : 3,
    sourceFile: `${outputBase}.${targetFormat}`,
    metadata: {
      ...(record?.metadata || {}),
      format: targetFormat.toUpperCase(),
      width,
      height,
      channels: isGray ? 1 : 3,
    },
    data: isGray ? toGrayBytes(record) : toRgbaBytes(record),
  }

  if (record?.kind === 'dem') {
    warnings.push(isGray ? 'DEM 已转为 8 位灰度 PGM，原始高程位深不再保留。' : 'DEM 已转为 8 位真彩 PPM，原始高程位深不再保留。')
  } else if (isGray) {
    warnings.push('PGM 为灰度位图，彩色信息会被折叠。')
  }

  const blob = isGray
    ? encodePortableGrayMap(importedData.data, width, height)
    : encodePortablePixelMap(importedData.data, width, height)

  return {
    supported: true,
    files: [{ name: `${outputBase}.${targetFormat}`, blob, mimeType: isGray ? 'image/x-portable-graymap' : 'image/x-portable-pixmap' }],
    importedData,
    warnings,
    route: 'browser-image',
    sourceFormat: getSourceFormat(record),
    targetFormat,
    outputNameBase: outputBase,
  }
}

async function buildCanvasImageExport(source, targetFormat) {
  const record = getSourceRecord(source)
  const { width, height } = getDimensions(record)
  const canvas = drawSourceToCanvas(record)
  const outputBase = sanitizeBaseName(record?.sourceFile || record?.name || 'raster')
  const isWebp = targetFormat === 'webp'
  const importedData = {
    ...record,
    kind: 'imagery',
    width,
    height,
    channels: 4,
    sourceFile: `${outputBase}.${targetFormat === 'jpeg' ? 'jpg' : targetFormat}`,
    metadata: {
      ...(record?.metadata || {}),
      format: targetFormat.toUpperCase(),
      width,
      height,
    },
    data: toRgbaBytes(record),
  }

  if (targetFormat === 'bmp') {
    const blob = encodeBmpFromRgba(importedData.data, width, height)
    return {
      supported: true,
      files: [{ name: `${outputBase}.bmp`, blob, mimeType: 'image/bmp' }],
      importedData,
      warnings: record?.kind === 'dem' ? ['DEM 已转成 8 位灰度位图，原始高程精度不再保留。'] : [],
      route: 'browser-image',
      sourceFormat: getSourceFormat(record),
      targetFormat,
      outputNameBase: outputBase,
    }
  }

  if (targetFormat === 'ppm' || targetFormat === 'pgm') {
    return buildPortableMapExport(record, targetFormat)
  }

  const mimeType = isWebp
    ? 'image/webp'
    : targetFormat === 'jpeg'
      ? 'image/jpeg'
      : 'image/png'
  const quality = targetFormat === 'jpeg' || isWebp ? 0.92 : undefined
  const blob = await canvasToBlob(canvas, mimeType, quality)
  return {
    supported: true,
    files: [{ name: `${outputBase}.${targetFormat === 'jpeg' ? 'jpg' : targetFormat}`, blob, mimeType }],
    importedData,
    warnings: record?.kind === 'dem' ? ['DEM 已转成 8 位灰度图，适合展示，不适合定量分析。'] : [],
    route: 'browser-image',
    sourceFormat: getSourceFormat(record),
    targetFormat,
    outputNameBase: outputBase,
  }
}

export function getFormatDefinition(formatId) {
  return getTargetDefinition(formatId)
}

export function listSupportedFormats() {
  return FORMAT_CATALOG.slice()
}

export function describeRoute(source, targetFormat) {
  const sourceFormat = getSourceFormat(source)
  const target = getTargetDefinition(targetFormat)
  const warnings = []
  const sourceKind = getKind(source)
  const targetIsImage = IMAGE_EXPORT_FORMATS.includes(targetFormat)
  const targetIsRaster = RASTER_EXPORT_FORMATS.includes(targetFormat)

  if (!target) {
    return {
      sourceFormat,
      targetFormat,
      route: 'unsupported',
      supported: false,
      warnings: ['未知目标格式。'],
    }
  }

  if (targetIsRaster) {
    if (!getDimensions(source).width || !getDimensions(source).height) {
      warnings.push('当前数据缺少宽高，无法执行栅格导出。')
      return {
        sourceFormat,
        targetFormat,
        route: 'unsupported',
        supported: false,
        warnings,
      }
    }

    if (targetFormat === 'envi') {
      warnings.push('ENVI 导出会生成 .hdr + .dat 对文件。')
    }

    if (targetFormat === 'webp') {
      warnings.push('WebP 压缩效率更高，但属于有损位图导出。')
    }

    if (targetFormat === 'ppm' || targetFormat === 'pgm') {
      warnings.push(targetFormat === 'pgm' ? 'PGM 会导出为灰度位图。' : 'PPM 会导出为真彩位图。')
    }

    return {
      sourceFormat,
      targetFormat,
      route: 'browser',
      supported: true,
      warnings,
    }
  }

  if (targetIsImage) {
    if (!getDimensions(source).width || !getDimensions(source).height) {
      warnings.push('当前数据缺少宽高，无法执行图片导出。')
      return {
        sourceFormat,
        targetFormat,
        route: 'unsupported',
        supported: false,
        warnings,
      }
    }
    if (sourceKind === 'dem' || targetFormat === 'jpeg') {
      warnings.push(targetFormat === 'jpeg' ? 'JPEG 会丢失辐射信息，不建议用于定量分析。' : 'DEM 将被折叠为 8 位灰度图。')
    }
    return {
      sourceFormat,
      targetFormat,
      route: 'browser',
      supported: true,
      warnings,
    }
  }

  warnings.push('此转换路径当前未实现。')
  return {
    sourceFormat,
    targetFormat,
    route: 'unsupported',
    supported: false,
    warnings,
  }
}

export function buildCompatibilityMatrix() {
  return FORMAT_CATALOG.map((item) => ({
    ...item,
    status: '浏览器支持',
  }))
}

export async function convertRasterSource(source, targetFormat) {
  const route = describeRoute(source, targetFormat)
  if (!route.supported) {
    return route
  }

  if (targetFormat === 'geotiff') {
    return buildGeoTiffBlobAndData(source)
  }

  if (targetFormat === 'envi') {
    return buildEnviExport(source)
  }

  if (IMAGE_EXPORT_FORMATS.includes(targetFormat)) {
    return buildCanvasImageExport(source, targetFormat)
  }

  return {
    ...route,
    supported: false,
    warnings: [...(route.warnings || []), '当前目标格式不在浏览器导出范围内。'],
  }
}

export function buildImportedDatasetFromConversion(result) {
  if (!result?.importedData) return null
  return {
    ...result.importedData,
    payload: {
      ...result.importedData,
    },
  }
}

export function getDefaultTargetFormatForSource(source) {
  const kind = getKind(source)
  if (kind === 'dem') return 'geotiff'
  if (kind === 'imagery') return 'png'
  return 'geotiff'
}
