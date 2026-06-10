import { motion } from 'framer-motion'
import { buildDatasetSummary } from '../../core/dataset/datasetRegistry'

function DatasetBadge({ label, value }) {
  return (
    <div className="rounded-lg bg-terrain-card/35 border border-white/6 px-3 py-2">
      <div className="text-[10px] text-terrain-muted">{label}</div>
      <div className="text-sm font-semibold text-terrain-text">{value}</div>
    </div>
  )
}

function DatasetRow({ item, onToggleInclude, onAssignBand, onPickRole, onRemove }) {
  return (
    <div className={`rounded-xl border p-3 ${item.include ? 'border-terrain-accent/25 bg-terrain-accent/5' : 'border-white/8 bg-terrain-card/25'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={item.include !== false}
          onChange={() => onToggleInclude?.(item.id)}
          className="mt-1 h-4 w-4 accent-amber-500"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm text-terrain-text break-all leading-5" title={item.name}>
                {item.name}
              </div>
              <div className="mt-1 text-[10px] text-terrain-muted">
                {item.kind} · {item.crs || 'Unknown CRS'}
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] text-terrain-muted">
              {item.role || item.band || '未分配'}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onPickRole?.(item.id, 'terrain')}
              className={`rounded-md border px-2 py-1 text-[10px] ${item.role === 'terrain' ? 'border-amber-400 text-amber-300' : 'border-white/10 text-terrain-muted'}`}
            >
              设为 DEM
            </button>
            <button
              type="button"
              onClick={() => onPickRole?.(item.id, 'overlay')}
              className={`rounded-md border px-2 py-1 text-[10px] ${item.role === 'overlay' ? 'border-sky-400 text-sky-300' : 'border-white/10 text-terrain-muted'}`}
            >
              设为影像
            </button>
            <button
              type="button"
              onClick={() => onAssignBand?.(item.id, 'red')}
              className={`rounded-md border px-2 py-1 text-[10px] ${item.band === 'red' ? 'border-red-400 text-red-300' : 'border-white/10 text-terrain-muted'}`}
            >
              Red
            </button>
            <button
              type="button"
              onClick={() => onAssignBand?.(item.id, 'green')}
              className={`rounded-md border px-2 py-1 text-[10px] ${item.band === 'green' ? 'border-emerald-400 text-emerald-300' : 'border-white/10 text-terrain-muted'}`}
            >
              Green
            </button>
            <button
              type="button"
              onClick={() => onAssignBand?.(item.id, 'blue')}
              className={`rounded-md border px-2 py-1 text-[10px] ${item.band === 'blue' ? 'border-sky-400 text-sky-300' : 'border-white/10 text-terrain-muted'}`}
            >
              Blue
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemove?.(item.id)}
          className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] text-terrain-muted hover:border-red-400/50 hover:text-red-300"
        >
          删除
        </button>
      </div>
    </div>
  )
}

export default function DataHub({
  datasets = [],
  onToggleInclude,
  onAssignBand,
  onPickRole,
  onRemove,
  onClear,
}) {
  const summary = buildDatasetSummary(datasets)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="glass-card p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold text-terrain-text">数据中心</h3>
          <p className="mt-1 text-[11px] leading-5 text-terrain-muted">统一管理导入文件、加入状态、角色分配和波段标记。</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={!datasets.length}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-terrain-muted disabled:opacity-40"
        >
          清空
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <DatasetBadge label="总文件" value={summary.total} />
        <DatasetBadge label="已加入" value={summary.included} />
        <DatasetBadge label="DEM" value={summary.terrain} />
        <DatasetBadge label="影像" value={summary.imagery} />
      </div>

      <div className="space-y-2">
        {datasets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-terrain-card/20 px-3 py-4 text-center text-xs text-terrain-muted">
            导入文件后，这里会显示完整文件列表、加入状态和角色分配。
          </div>
        ) : (
          datasets.map((item) => (
            <DatasetRow
              key={item.id}
              item={item}
              onToggleInclude={onToggleInclude}
              onAssignBand={onAssignBand}
              onPickRole={onPickRole}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </motion.div>
  )
}
