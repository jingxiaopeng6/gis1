import { useMemo, useState } from 'react'
import { DATA_SOURCES, REGIONS } from '../../constants/dataSources'

function searchSources(keyword) {
  const q = keyword.trim().toLowerCase()
  if (!q) return []

  const regionMatches = REGIONS.filter((region) => region.label.toLowerCase().includes(q)).map((region) => ({
    type: 'region',
    label: region.label,
    sublabel: region.zoomHint,
    payload: region,
  }))

  const sourceMatches = Object.entries(DATA_SOURCES)
    .flatMap(([regionId, items]) =>
      items.map((item) => ({
        type: 'source',
        label: item.name,
        sublabel: item.description,
        payload: { ...item, regionId },
      }))
    )
    .filter((item) => `${item.label} ${item.sublabel}`.toLowerCase().includes(q))
    .slice(0, 6)

  return [...regionMatches, ...sourceMatches].slice(0, 8)
}

export default function GlobalSearchBar({ onPickRegion, onOpenSource }) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => searchSources(query), [query])

  return (
    <div className="glass-card rounded-2xl p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索地名、区域、数据源..."
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-terrain-card/60 px-3 py-2 text-sm text-terrain-text outline-none placeholder:text-terrain-muted focus:border-terrain-accent/40"
        />
        <button
          type="button"
          onClick={() => setQuery('')}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs text-terrain-muted"
        >
          清空
        </button>
      </div>

      {query.trim() ? (
        <div className="mt-2 max-h-60 space-y-2 overflow-y-auto">
          {results.length ? (
            results.map((item) => (
              <button
                key={`${item.type}-${item.label}`}
                type="button"
                onClick={() => {
                  if (item.type === 'region') onPickRegion?.(item.payload)
                  if (item.type === 'source') onOpenSource?.(item.payload)
                  setQuery('')
                }}
                className="w-full rounded-xl border border-white/8 bg-terrain-card/35 p-3 text-left transition-colors hover:border-terrain-accent/25"
              >
                <div className="text-sm text-terrain-text">{item.label}</div>
                <div className="mt-1 text-[11px] leading-5 text-terrain-muted">{item.sublabel}</div>
              </button>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-terrain-muted">
              没有匹配项
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
