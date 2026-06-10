function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function getTerrainRange(terrainData) {
  const minElevation = terrainData?.minElevation ?? 0
  const maxElevation = terrainData?.maxElevation ?? 1
  const range = maxElevation - minElevation || 1
  return { minElevation, maxElevation, range }
}

function sampleNormalized(data, width, height, x, y) {
  const x0 = clamp(Math.floor(x), 0, width - 1)
  const y0 = clamp(Math.floor(y), 0, height - 1)
  const x1 = clamp(x0 + 1, 0, width - 1)
  const y1 = clamp(y0 + 1, 0, height - 1)
  const tx = clamp(x - x0, 0, 1)
  const ty = clamp(y - y0, 0, 1)

  const idx = (row, col) => row * width + col
  const v00 = data[idx(y0, x0)] ?? 0
  const v10 = data[idx(y0, x1)] ?? v00
  const v01 = data[idx(y1, x0)] ?? v00
  const v11 = data[idx(y1, x1)] ?? v00

  const a = v00 * (1 - tx) + v10 * tx
  const b = v01 * (1 - tx) + v11 * tx
  return a * (1 - ty) + b * ty
}

function triangleArea3D(a, b, c) {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const cross = [
    ab[1] * ac[2] - ab[2] * ac[1],
    ab[2] * ac[0] - ab[0] * ac[2],
    ab[0] * ac[1] - ab[1] * ac[0],
  ]
  return 0.5 * Math.hypot(cross[0], cross[1], cross[2])
}

export function computeHistogram(terrainData, bins = 24) {
  if (!terrainData?.data?.length) return []
  const counts = new Array(bins).fill(0)
  for (let i = 0; i < terrainData.data.length; i += 1) {
    const value = clamp(terrainData.data[i] ?? 0, 0, 0.999999)
    counts[Math.floor(value * bins)] += 1
  }

  const maxCount = Math.max(...counts, 1)
  return counts.map((count, index) => ({
    index,
    count,
    ratio: count / maxCount,
    value: (index + 0.5) / bins,
  }))
}

export function computeProfiles(terrainData, sampleCount = 160) {
  if (!terrainData?.data?.length) return null
  const width = terrainData.width
  const height = terrainData.height
  const { minElevation, range } = getTerrainRange(terrainData)
  const midY = (height - 1) / 2
  const midX = (width - 1) / 2

  const buildPath = (start, end) => {
    const points = []
    let distance = 0
    let prev = null

    for (let i = 0; i < sampleCount; i += 1) {
      const t = sampleCount === 1 ? 0 : i / (sampleCount - 1)
      const x = start[0] + (end[0] - start[0]) * t
      const y = start[1] + (end[1] - start[1]) * t
      const normalized = sampleNormalized(terrainData.data, width, height, x, y)
      const elevation = minElevation + normalized * range

      if (prev) {
        distance += Math.hypot(x - prev.x, y - prev.y)
      }

      points.push({
        x,
        y,
        t,
        distance,
        normalized,
        elevation,
      })

      prev = { x, y }
    }

    return points
  }

  return {
    horizontal: buildPath([0, midY], [width - 1, midY]),
    vertical: buildPath([midX, 0], [midX, height - 1]),
  }
}

export function estimateSurfaceMetrics(terrainData, terrainScale = 1) {
  if (!terrainData?.data?.length) return null
  const width = terrainData.width
  const height = terrainData.height
  const data = terrainData.data
  const { minElevation, range } = getTerrainRange(terrainData)
  const heightScale = terrainScale * 20
  const stride = Math.max(1, Math.ceil(Math.max(width, height) / 192))

  let surfaceArea = 0
  let sumSlope = 0
  let cellCount = 0

  for (let y = 0; y < height - 1; y += stride) {
    for (let x = 0; x < width - 1; x += stride) {
      const h00 = (data[y * width + x] ?? 0) * heightScale
      const h10 = (data[y * width + Math.min(width - 1, x + stride)] ?? 0) * heightScale
      const h01 = (data[Math.min(height - 1, y + stride) * width + x] ?? 0) * heightScale
      const h11 = (data[Math.min(height - 1, y + stride) * width + Math.min(width - 1, x + stride)] ?? 0) * heightScale

      const p00 = [x, y, h00]
      const p10 = [Math.min(width - 1, x + stride), y, h10]
      const p01 = [x, Math.min(height - 1, y + stride), h01]
      const p11 = [Math.min(width - 1, x + stride), Math.min(height - 1, y + stride), h11]

      surfaceArea += triangleArea3D(p00, p10, p11) + triangleArea3D(p00, p11, p01)

      const dzdx = ((h10 + h11) - (h00 + h01)) / 2
      const dzdy = ((h01 + h11) - (h00 + h10)) / 2
      sumSlope += Math.atan(Math.hypot(dzdx, dzdy))
      cellCount += 1
    }
  }

  const planarArea = (width - 1) * (height - 1) || 1
  const meanSlopeDeg = (sumSlope / Math.max(1, cellCount)) * (180 / Math.PI)

  return {
    areaRatio: surfaceArea / planarArea,
    roughnessIndex: Math.abs(range) / Math.max(1, width + height),
    meanSlopeDeg,
  }
}

export function buildMarkdownReport({
  selectedRegion,
  terrainData,
  overlayData,
  settings,
  metrics,
}) {
  const lines = [
    `# Terrain 3D Report`,
    '',
    `- Region: ${selectedRegion?.label || 'Unknown'}`,
    `- DEM: ${terrainData?.sourceFile || 'N/A'}`,
    `- Imagery: ${overlayData?.sourceFile || 'N/A'}`,
    `- Contours: ${settings?.showContours ? 'On' : 'Off'}`,
    `- Hillshade: ${settings?.showHillshade ? 'On' : 'Off'}`,
    `- Overlay: ${settings?.showOverlay ? 'On' : 'Off'}`,
  ]

  if (metrics?.terrain) {
    lines.push(
      `- Elevation range: ${metrics.terrain.minElevation.toFixed(1)} m - ${metrics.terrain.maxElevation.toFixed(1)} m`,
      `- Mean slope: ${metrics.surface?.meanSlopeDeg?.toFixed?.(2) || '0.00'}°`,
      `- Surface area ratio: ${metrics.surface?.areaRatio?.toFixed?.(3) || '1.000'}`
    )
  }

  lines.push('', '## Data sources', '- gscloud: https://www.gscloud.cn/', '- Earthdata Search: https://search.earthdata.nasa.gov/', '- EarthExplorer: https://earthexplorer.usgs.gov/', '- Copernicus Browser: https://dataspace.copernicus.eu/browser/')

  return lines.join('\n')
}

export function buildReportHtml({
  selectedRegion,
  terrainData,
  overlayData,
  settings,
  metrics,
  snapshotUrl,
}) {
  const title = `Terrain 3D Report - ${selectedRegion?.label || 'Unknown'}`
  const rows = [
    ['Region', selectedRegion?.label || 'Unknown'],
    ['DEM', terrainData?.sourceFile || 'N/A'],
    ['Imagery', overlayData?.sourceFile || 'N/A'],
    ['Contours', settings?.showContours ? 'On' : 'Off'],
    ['Hillshade', settings?.showHillshade ? 'On' : 'Off'],
    ['Overlay', settings?.showOverlay ? 'On' : 'Off'],
    ['Elevation range', metrics?.terrain ? `${metrics.terrain.minElevation.toFixed(1)} m - ${metrics.terrain.maxElevation.toFixed(1)} m` : 'N/A'],
    ['Mean slope', metrics?.surface ? `${metrics.surface.meanSlopeDeg.toFixed(2)}°` : 'N/A'],
    ['Surface area ratio', metrics?.surface ? metrics.surface.areaRatio.toFixed(3) : 'N/A'],
  ]

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
    h1 { margin: 0 0 12px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 16px 0; }
    .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 12px; }
    .shot { width: 100%; max-width: 1100px; border-radius: 12px; border: 1px solid #e5e7eb; margin: 18px 0; }
    table { border-collapse: collapse; width: 100%; max-width: 900px; }
    td { border-bottom: 1px solid #e5e7eb; padding: 8px 0; vertical-align: top; }
    td:first-child { color: #6b7280; width: 220px; }
    .sources a { color: #2563eb; text-decoration: none; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated in browser from the current 3D terrain workspace.</p>
  ${snapshotUrl ? `<img class="shot" src="${snapshotUrl}" alt="Terrain snapshot" />` : ''}
  <div class="card">
    <table>
      ${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}
    </table>
  </div>
  <div class="card sources" style="margin-top:16px;">
    <strong>Data sources</strong>
    <ul>
      <li><a href="https://www.gscloud.cn/">gscloud</a></li>
      <li><a href="https://search.earthdata.nasa.gov/">NASA Earthdata Search</a></li>
      <li><a href="https://earthexplorer.usgs.gov/">USGS EarthExplorer</a></li>
      <li><a href="https://dataspace.copernicus.eu/browser/">Copernicus Browser</a></li>
    </ul>
  </div>
</body>
</html>`
}

export function formatMetricValue(value, digits = 2) {
  if (!Number.isFinite(value)) return '0'
  return value.toFixed(digits)
}

function profilePath(points, width, height) {
  if (!points?.length) return ''
  const values = points.map((p) => p.value ?? p.elevation ?? 0)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1

  return points
    .map((p, index) => {
      const value = p.value ?? p.elevation ?? 0
      const x = (index / Math.max(1, points.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')
}

export function buildAnalysisSvgReport(terrainData, settings = {}) {
  if (!terrainData?.data?.length) return ''
  const histogram = computeHistogram(terrainData, 24)
  const profiles = computeProfiles(terrainData, 100)
  const { minElevation, maxElevation } = getTerrainRange(terrainData)
  const width = 840
  const height = 680
  const chartWidth = 780
  const histogramHeight = 130
  const profileHeight = 120
  const barWidth = chartWidth / Math.max(1, histogram.length)
  const profileW = chartWidth
  const profileY1 = 300
  const profileY2 = 480

  const histogramRects = histogram
    .map((bin, index) => {
      const barH = bin.ratio * (histogramHeight - 18)
      const x = 30 + index * barWidth
      const y = 50 + histogramHeight - barH
      return `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(1, barWidth - 2).toFixed(2)}" height="${barH.toFixed(2)}" rx="2" fill="rgba(245, 158, 11, 0.85)" />`
    })
    .join('')

  const horizontalPath = profilePath(profiles.horizontal, profileW, profileHeight)
  const verticalPath = profilePath(profiles.vertical, profileW, profileHeight)

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="fillHist" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#F59E0B" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#2563EB" stop-opacity="0.45"/>
    </linearGradient>
    <linearGradient id="fillProfile" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#60A5FA" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" rx="24" fill="#0F172A"/>
  <text x="30" y="28" fill="#E2E8F0" font-size="18" font-weight="700">Terrain Analysis Report</text>
  <text x="30" y="44" fill="#94A3B8" font-size="11">${settings?.colorScheme || 'natural'} / ${minElevation.toFixed(1)}m - ${maxElevation.toFixed(1)}m</text>

  <text x="30" y="68" fill="#E2E8F0" font-size="13" font-weight="600">Elevation Histogram</text>
  <rect x="24" y="50" width="792" height="150" rx="18" fill="rgba(30,41,59,0.75)" stroke="rgba(255,255,255,0.08)"/>
  ${histogramRects}

  <text x="30" y="244" fill="#E2E8F0" font-size="13" font-weight="600">Horizontal Profile</text>
  <rect x="24" y="258" width="792" height="150" rx="18" fill="rgba(30,41,59,0.75)" stroke="rgba(255,255,255,0.08)"/>
  <path d="${horizontalPath}" fill="none" stroke="#F59E0B" stroke-width="2.5" transform="translate(30, 300)"/>
  <path d="M 30 420 L 810 420" stroke="rgba(148,163,184,0.25)" />

  <text x="30" y="424" fill="#E2E8F0" font-size="13" font-weight="600">Vertical Profile</text>
  <rect x="24" y="438" width="792" height="150" rx="18" fill="rgba(30,41,59,0.75)" stroke="rgba(255,255,255,0.08)"/>
  <path d="${verticalPath}" fill="none" stroke="#60A5FA" stroke-width="2.5" transform="translate(30, 480)"/>
  <path d="M 30 600 L 810 600" stroke="rgba(148,163,184,0.25)" />

  <text x="30" y="646" fill="#94A3B8" font-size="11">Exported in browser from the current terrain workspace</text>
</svg>`
}
