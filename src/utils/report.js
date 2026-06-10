const COMMON_DATA_SOURCES = [
  {
    label: '地理空间数据云',
    url: 'https://www.gscloud.cn/',
    note: '国内遥感与地学数据下载入口',
  },
  {
    label: 'NASA Earthdata Search',
    url: 'https://search.earthdata.nasa.gov/',
    note: 'Landsat、MODIS、Sentinel 等官方数据检索',
  },
  {
    label: 'USGS EarthExplorer',
    url: 'https://earthexplorer.usgs.gov/',
    note: 'Landsat、DEM、Sentinel 等数据查询入口',
  },
  {
    label: 'Copernicus Browser',
    url: 'https://dataspace.copernicus.eu/browser/',
    note: 'Sentinel 系列数据与在线浏览',
  },
]

function safeDateString(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date)
  } catch {
    return date.toISOString()
  }
}

export function getReportTitle(selectedRegion) {
  return `Terrain 3D Report - ${selectedRegion?.label || 'Unknown'}`
}

export function getReportSubtitle(selectedRegion) {
  return `Generated in browser from ${selectedRegion?.label || 'a selected region'}`
}

export function buildReportRows({ selectedRegion, terrainData, overlayData, settings, metrics }) {
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
    ['Generated at', safeDateString()],
  ]

  if (terrainData?.metadata?.crs || overlayData?.metadata?.crs) {
    rows.push(['CRS', terrainData?.metadata?.crs || overlayData?.metadata?.crs || 'Unknown'])
  }

  return rows
}

export function buildSourceEntries(report = {}) {
  const { selectedRegion, terrainData, overlayData } = report

  const dynamicSources = [
    terrainData?.sourceFile
      ? {
          label: 'DEM Source',
          value: terrainData.sourceFile,
          note: terrainData.metadata?.source || terrainData.metadata?.format || 'Raster DEM',
        }
      : null,
    overlayData?.sourceFile
      ? {
          label: 'Imagery Source',
          value: overlayData.sourceFile,
          note: overlayData.metadata?.source || overlayData.metadata?.format || 'Raster imagery',
        }
      : null,
    selectedRegion?.label
      ? {
          label: 'Selected Region',
          value: selectedRegion.label,
          note: selectedRegion.zoomHint || selectedRegion.description || 'Viewport / boundary focus',
        }
      : null,
  ].filter(Boolean)

  return [
    ...dynamicSources,
    ...COMMON_DATA_SOURCES.map((item) => ({
      label: item.label,
      value: item.url,
      note: item.note,
    })),
  ]
}

export function buildSourceMarkdown(report = {}) {
  const entries = buildSourceEntries(report)
  return entries.map((item) => `- ${item.label}: ${item.value}${item.note ? ` (${item.note})` : ''}`).join('\n')
}

export function buildSourceHtml(report = {}) {
  const entries = buildSourceEntries(report)
  return entries
    .map(
      (item) => `
        <div class="source-item">
          <div class="source-label">${escapeHtml(item.label)}</div>
          <div class="source-value">${escapeHtml(item.value)}</div>
          <div class="source-note">${escapeHtml(item.note || '')}</div>
        </div>`
    )
    .join('')
}

export function buildSourceBullets(report = {}) {
  return buildSourceEntries(report).slice(0, 6)
}

export function buildReportVectorSvg(report = {}) {
  const title = getReportTitle(report?.selectedRegion)
  const subtitle = getReportSubtitle(report?.selectedRegion)
  const rows = buildReportRows(report)
  const sources = buildSourceEntries(report)
  const width = 1240
  const height = 1720
  const left = 72
  const right = 1168
  const snapshotBox = { x: 72, y: 180, w: 760, h: 520 }
  const statsBox = { x: 864, y: 180, w: 304, h: 520 }
  const sourceBox = { x: 72, y: 748, w: 1096, h: 840 }

  const renderRows = rows
    .slice(0, 8)
    .map((row, index) => {
      const y = 260 + index * 48
      return `
        <text x="${statsBox.x + 20}" y="${y}" fill="#E2E8F0" font-size="20" font-weight="600">${escapeXml(row[0])}</text>
        <text x="${statsBox.x + 20}" y="${y + 20}" fill="#CBD5E1" font-size="18">${escapeXml(row[1])}</text>`
    })
    .join('')

  const renderSources = sources
    .slice(0, 8)
    .map((item, index) => {
      const y = sourceBox.y + 82 + index * 78
      return `
        <text x="${left + 20}" y="${y}" fill="#E2E8F0" font-size="18" font-weight="600">${escapeXml(item.label)}</text>
        <text x="${left + 20}" y="${y + 22}" fill="#93C5FD" font-size="16">${escapeXml(item.value)}</text>
        <text x="${left + 20}" y="${y + 42}" fill="#94A3B8" font-size="14">${escapeXml(item.note || '')}</text>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <linearGradient id="heroGrad" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#1D4ED8" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bgGrad)"/>
  <rect x="48" y="48" width="1144" height="1624" rx="30" fill="rgba(15,23,42,0.72)" stroke="rgba(255,255,255,0.08)"/>
  <rect x="72" y="72" width="1096" height="84" rx="20" fill="url(#heroGrad)"/>
  <text x="${left + 20}" y="118" fill="#F8FAFC" font-size="34" font-weight="700">${escapeXml(title)}</text>
  <text x="${left + 20}" y="148" fill="#94A3B8" font-size="18">${escapeXml(subtitle)}</text>

  <rect x="${snapshotBox.x}" y="${snapshotBox.y}" width="${snapshotBox.w}" height="${snapshotBox.h}" rx="24" fill="rgba(30,41,59,0.9)" stroke="rgba(255,255,255,0.08)"/>
  <text x="${snapshotBox.x + 24}" y="${snapshotBox.y + 42}" fill="#E2E8F0" font-size="20" font-weight="600">视图快照</text>
  <text x="${snapshotBox.x + 24}" y="${snapshotBox.y + 74}" fill="#94A3B8" font-size="15">可直接作为矢量复制与报告封面</text>

  <rect x="${statsBox.x}" y="${statsBox.y}" width="${statsBox.w}" height="${statsBox.h}" rx="24" fill="rgba(30,41,59,0.9)" stroke="rgba(255,255,255,0.08)"/>
  <text x="${statsBox.x + 20}" y="${statsBox.y + 42}" fill="#E2E8F0" font-size="20" font-weight="600">关键指标</text>
  ${renderRows}

  <rect x="${sourceBox.x}" y="${sourceBox.y}" width="${sourceBox.w}" height="${sourceBox.h}" rx="24" fill="rgba(30,41,59,0.9)" stroke="rgba(255,255,255,0.08)"/>
  <text x="${sourceBox.x + 20}" y="${sourceBox.y + 42}" fill="#E2E8F0" font-size="20" font-weight="600">数据来源说明</text>
  <text x="${sourceBox.x + 20}" y="${sourceBox.y + 70}" fill="#94A3B8" font-size="15">导出内容会自动附带来源链接，便于汇报、审稿和存档</text>
  ${renderSources}

  <text x="${right - 310}" y="${height - 52}" fill="#94A3B8" font-size="15">Generated entirely in browser</text>
</svg>`
}

export function buildOfficeReportHtml(report = {}) {
  const title = getReportTitle(report?.selectedRegion)
  const subtitle = getReportSubtitle(report?.selectedRegion)
  const rows = buildReportRows(report)
  const sources = buildSourceEntries(report)
  const snapshotDataUri = report?.snapshotDataUri || ''

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #0f172a;
      --panel: rgba(15, 23, 42, 0.82);
      --panel-strong: rgba(30, 41, 59, 0.95);
      --line: rgba(255,255,255,0.08);
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #f59e0b;
      --accent-2: #60a5fa;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at top left, rgba(245,158,11,.12), transparent 32%),
        radial-gradient(circle at bottom right, rgba(96,165,250,.14), transparent 34%),
        var(--bg);
      color: var(--text);
      font-family: Arial, "Microsoft YaHei", sans-serif;
    }
    .page {
      max-width: 1280px;
      margin: 0 auto;
      padding: 32px 24px 40px;
    }
    .hero {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 20px;
      align-items: stretch;
      margin-bottom: 20px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 24px;
      background: var(--panel);
      box-shadow: 0 24px 70px rgba(0,0,0,0.24);
      overflow: hidden;
    }
    .hero-main {
      padding: 28px;
      background: linear-gradient(135deg, rgba(30,64,175,.35), rgba(15,23,42,0.92) 55%, rgba(245,158,11,.16));
      min-height: 280px;
    }
    .eyebrow {
      font-size: 12px;
      letter-spacing: .18em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 10px;
    }
    h1 { margin: 0; font-size: 36px; line-height: 1.12; }
    .subtitle { margin-top: 12px; color: var(--muted); font-size: 15px; max-width: 56ch; }
    .grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 20px;
    }
    .snapshot { grid-column: span 8; padding: 18px; }
    .snapshot img {
      width: 100%;
      display: block;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: #0b1220;
      min-height: 280px;
      object-fit: cover;
    }
    .metrics { grid-column: span 4; padding: 18px; }
    .section-title {
      margin: 0 0 16px;
      font-size: 18px;
      color: var(--text);
    }
    table { width: 100%; border-collapse: collapse; }
    td {
      padding: 11px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      vertical-align: top;
    }
    td:first-child {
      color: var(--muted);
      width: 40%;
      padding-right: 16px;
    }
    .panel {
      margin-top: 20px;
      padding: 18px;
      background: var(--panel-strong);
      border: 1px solid var(--line);
      border-radius: 24px;
    }
    .sources {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }
    .source-item {
      padding: 14px 15px;
      border-radius: 16px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.05);
    }
    .source-label { font-size: 13px; color: var(--accent); margin-bottom: 6px; }
    .source-value { font-size: 14px; color: var(--text); word-break: break-all; }
    .source-note { font-size: 12px; color: var(--muted); margin-top: 6px; line-height: 1.5; }
    .footer {
      margin-top: 16px;
      color: var(--muted);
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    @media print {
      body { background: #fff; color: #111827; }
      .page { max-width: none; padding: 0; }
      .card, .panel { box-shadow: none; }
    }
    @media (max-width: 960px) {
      .hero, .grid, .sources { grid-template-columns: 1fr; }
      .snapshot, .metrics { grid-column: span 1; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="hero">
      <div class="card hero-main">
        <div class="eyebrow">Office Output Center</div>
        <h1>${escapeHtml(title)}</h1>
        <div class="subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="card hero-main" style="display:flex;flex-direction:column;justify-content:space-between;">
        <div>
          <div class="eyebrow">Data Story</div>
          <div style="font-size:18px;line-height:1.65;color:#e2e8f0;">
            自动附带数据来源说明，适合汇报页、报告、答辩和项目留档。
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px;">
          <span style="padding:8px 12px;border-radius:999px;background:rgba(245,158,11,.16);border:1px solid rgba(245,158,11,.25);">PNG / SVG / PDF / PPTX / DOCX</span>
          <span style="padding:8px 12px;border-radius:999px;background:rgba(96,165,250,.12);border:1px solid rgba(96,165,250,.22);">矢量复制</span>
          <span style="padding:8px 12px;border-radius:999px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.22);">一键汇报页</span>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="card snapshot">
        <div class="section-title">视图快照</div>
        ${snapshotDataUri ? `<img src="${snapshotDataUri}" alt="snapshot" />` : '<div style="padding:36px;color:var(--muted);">未提供快照</div>'}
      </div>
      <div class="card metrics">
        <div class="section-title">关键指标</div>
        <table>
          ${rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="section-title">数据来源说明</div>
      <div class="sources">
        ${sources
          .map(
            (item) => `
              <div class="source-item">
                <div class="source-label">${escapeHtml(item.label)}</div>
                <div class="source-value">${escapeHtml(item.value)}</div>
                <div class="source-note">${escapeHtml(item.note || '')}</div>
              </div>`
          )
          .join('')}
      </div>
    </div>

    <div class="footer">
      <div>Generated entirely in browser</div>
      <div>${escapeHtml(safeDateString())}</div>
    </div>
  </div>
</body>
</html>`
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export { COMMON_DATA_SOURCES }
