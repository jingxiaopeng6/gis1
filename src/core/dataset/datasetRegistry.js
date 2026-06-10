export function createDatasetId(file, prefix = 'dataset') {
  const base = `${file?.name || 'file'}_${file?.size || 0}_${file?.lastModified || 0}`
  const hash = base
    .split('')
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
    .toString(36)
  return `${prefix}_${hash}_${globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10)}`
}

export function normalizeDatasetItem(source, extra = {}) {
  if (!source) return null
  const file = source.file || source
  const meta = source.metadata || {}
  return {
    id: source.id || createDatasetId(file, extra.prefix || 'dataset'),
    name: source.name || file?.name || source.sourceFile || 'Unnamed file',
    file,
    kind: source.kind || meta.kind || 'unknown',
    role: source.role || null,
    band: source.band || null,
    include: source.include ?? true,
    sourceFile: source.sourceFile || file?.name || 'Unnamed file',
    width: source.width ?? meta.width ?? null,
    height: source.height ?? meta.height ?? null,
    bbox: source.bbox ?? meta.bbox ?? null,
    crs: source.crs ?? meta.crs ?? 'Unknown',
    channels: source.channels ?? meta.channels ?? null,
    metadata: meta,
    payload: source.payload || source,
    createdAt: source.createdAt || Date.now(),
    status: source.status || 'ready',
  }
}

export function upsertDataset(list, item) {
  const normalized = normalizeDatasetItem(item)
  if (!normalized) return list
  const next = list.filter((entry) => entry.id !== normalized.id)
  next.unshift({ ...normalized, include: normalized.include ?? true })
  return next
}

export function toggleDatasetInclude(list, id) {
  return list.map((entry) => (entry.id === id ? { ...entry, include: !entry.include } : entry))
}

export function assignDatasetBand(list, id, band) {
  return list.map((entry) => {
    if (entry.id === id) return { ...entry, band }
    if (entry.band === band && entry.id !== id) return { ...entry, band: null }
    return entry
  })
}

export function setDatasetRole(list, id, role) {
  return list.map((entry) => (entry.id === id ? { ...entry, role } : entry))
}

export function removeDataset(list, id) {
  return list.filter((entry) => entry.id !== id)
}

export function clearDatasets() {
  return []
}

export function buildDatasetSummary(list) {
  const total = list.length
  const included = list.filter((entry) => entry.include).length
  const terrain = list.filter((entry) => entry.kind === 'dem').length
  const imagery = list.filter((entry) => entry.kind === 'imagery').length
  const unknown = list.filter((entry) => entry.kind === 'unknown').length
  return { total, included, terrain, imagery, unknown }
}

export function pickDatasetByRole(list, role) {
  return list.find((entry) => entry.include !== false && entry.role === role) || null
}

export function pickFirstByKind(list, kind) {
  return list.find((entry) => entry.include !== false && entry.kind === kind) || null
}
