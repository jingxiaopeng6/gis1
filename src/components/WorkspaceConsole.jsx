import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GlobeExplorer from './GlobeExplorer'
import UploadZone from './UploadZone'
import BandComposer from './BandComposer'
import DataHub from './data/DataHub'
import { CONTOUR_INTERVALS } from '../constants/theme'

const COLOR_SCHEMES = [
  { key: 'natural', label: '自然', colors: ['#1E40AF', '#166534', '#854D0E'] },
  { key: 'satellite', label: '卫星', colors: ['#1E3A5F', '#4A7C59', '#8B7355'] },
  { key: 'topographic', label: '等高', colors: ['#F8FAFC', '#D4E6D4', '#6B8E6B'] },
]

// 通用按钮菜单组件
function MenuButton({ icon, label, active, onClick, hint, color = 'amber' }) {
  const colorMap = {
    amber: 'from-amber-500/20 to-amber-600/10',
    sky: 'from-sky-500/20 to-sky-600/10',
    emerald: 'from-emerald-500/20 to-emerald-600/10',
    rose: 'from-rose-500/20 to-rose-600/10',
  }
  const activeColorMap = {
    amber: 'border-amber-500/60 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    sky: 'border-sky-500/60 bg-sky-500/20 shadow-[0_0_20px_rgba(14,165,233,0.25)]',
    emerald: 'border-emerald-500/60 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    rose: 'border-rose-500/60 bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.25)]',
  }

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 transition-all duration-300 ${
        active
          ? `${activeColorMap[color]} scale-[1.02]`
          : `border-white/6 bg-gradient-to-b ${colorMap[color]} hover:border-white/15 hover:scale-[1.02]`
      }`}
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-[11px] font-medium text-slate-200 leading-tight text-center">{label}</span>
      {hint ? <span className="text-[8px] text-slate-400 leading-tight text-center">{hint}</span> : null}
    </button>
  )
}

// 模态框面板组件
function ModalPanel({ title, isOpen, onClose, children, accentColor = 'amber' }) {
  const accentClassMap = {
    amber: 'from-amber-500/30 via-amber-400/15 to-transparent',
    sky: 'from-sky-500/30 via-sky-400/15 to-transparent',
    emerald: 'from-emerald-500/30 via-emerald-400/15 to-transparent',
    rose: 'from-rose-500/30 via-rose-400/15 to-transparent',
  }
  const borderColorMap = {
    amber: 'border-amber-400/30',
    sky: 'border-sky-400/30',
    emerald: 'border-emerald-400/30',
    rose: 'border-rose-400/30',
  }
  const textColorMap = {
    amber: 'text-amber-300',
    sky: 'text-sky-300',
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
  }
  const buttonColorMap = {
    amber: 'bg-amber-500/20 border-amber-400/40 hover:bg-amber-500/30 hover:border-amber-400/60 text-amber-300',
    sky: 'bg-sky-500/20 border-sky-400/40 hover:bg-sky-500/30 hover:border-sky-400/60 text-sky-300',
    emerald: 'bg-emerald-500/20 border-emerald-400/40 hover:bg-emerald-500/30 hover:border-emerald-400/60 text-emerald-300',
    rose: 'bg-rose-500/20 border-rose-400/40 hover:bg-rose-500/30 hover:border-rose-400/60 text-rose-300',
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-stretch justify-center bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 20, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className={`relative flex flex-col w-full max-w-lg my-4 rounded-3xl border ${borderColorMap[accentColor]} bg-slate-900/95 shadow-[0_40px_120px_rgba(0,0,0,0.6)]`}
      >
        {/* 顶部装饰条 */}
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${accentClassMap[accentColor]}`} />
        <div className={`pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b ${accentClassMap[accentColor]} opacity-30`} />

        {/* 头部 - 固定在顶部 */}
        <div className="flex-none flex items-center justify-between gap-3 px-5 py-3 border-b border-white/5 bg-slate-900/80 backdrop-blur-sm">
          <h3 className={`text-base font-semibold ${textColorMap[accentColor]}`}>{title}</h3>
          <button
            onClick={onClose}
            className={`h-9 w-16 flex items-center justify-center gap-1.5 rounded-xl border font-medium text-sm transition-all ${buttonColorMap[accentColor]}`}
          >
            <span>✕</span>
            <span>关闭</span>
          </button>
        </div>

        {/* 内容区域 - 自适应高度，可滚动 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}

// 内联的简单控件组件
function ToggleButton({ label, active, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
        active
          ? 'border-amber-500/40 bg-amber-500/15'
          : 'border-white/5 bg-slate-900/35 hover:border-slate-600/30'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
    >
      <div className="text-[11px] text-slate-200">{label}</div>
      <div className={`relative h-3.5 w-7 rounded-full transition-colors ${active ? 'bg-amber-500' : 'bg-slate-700'}`}>
        <motion.div animate={{ x: active ? 14 : 2 }} className="absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white" />
      </div>
    </button>
  )
}

function RangeControl({ label, value, displayValue, suffix, min, max, step, onChange, onCommit }) {
  return (
    <div className="rounded-xl border border-white/6 bg-slate-950/35 p-2.5">
      <div className="mb-1 flex justify-between text-[11px]">
        <span className="text-slate-400">{label}</span>
        <span className="text-amber-300">
          {displayValue ?? value}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={() => onCommit?.()}
        onMouseUp={() => onCommit?.()}
        onTouchEnd={() => onCommit?.()}
        className="w-full cursor-pointer appearance-none rounded-full bg-slate-800 h-1.5
          [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-amber-500"
      />
    </div>
  )
}

// 主组件
export default function WorkspaceConsole({
  terrainData,
  overlayData,
  settings,
  onSettingsChange,
  onFileUpload,
  selectedRegion,
  onRegionChange,
  datasets = [],
  onToggleDatasetInclude,
  onAssignDatasetBand,
  onPickDatasetRole,
  onRemoveDataset,
  onClearDatasets,
}) {
  const hasOverlay = !!overlayData
  const hasData = !!terrainData
  const [activeMenu, setActiveMenu] = useState(null)
  const [terrainScaleDraft, setTerrainScaleDraft] = useState(settings.terrainScale)
  const terrainScaleDragActive = useRef(false)
  const activeFiles = datasets.filter((item) => item.include !== false).length

  const handleChange = (key, value) => {
    onSettingsChange((prev) => ({ ...prev, [key]: value }))
  }

  const handleTerrainScaleChange = (value) => {
    terrainScaleDragActive.current = true
    setTerrainScaleDraft(value)
    onSettingsChange((prev) => ({ ...prev, terrainScale: value }))
  }

  const commitTerrainScale = () => {
    terrainScaleDragActive.current = false
    onSettingsChange((prev) => ({ ...prev, terrainScale: terrainScaleDraft }))
  }

  const menuItems = [
    { id: 'data', icon: '📁', label: '数据管理', hint: `${datasets.length} 文件`, color: 'sky' },
    { id: 'geo', icon: '🌍', label: '地名定位', hint: selectedRegion?.label || '未选择', color: 'emerald' },
    { id: 'import', icon: '⬆️', label: '导入文件', hint: '上传/合成', color: 'amber' },
    { id: 'render', icon: '🎨', label: '渲染控制', hint: '实时调整', color: 'rose' },
  ]

  return (
    <>
      <motion.div
        initial={{ x: -320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-slate-950/25"
      >
        {/* 顶部状态区 */}
        <div className="border-b border-white/5 px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <span className="text-sm">🗺️</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-slate-100 leading-tight">工作台</h2>
                <div className="flex items-center gap-2 text-[9px] text-slate-400 leading-tight mt-0.5">
                  <span>{datasets.length} 文件</span>
                  <span>·</span>
                  <span>{activeFiles} 启用</span>
                </div>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
              Live
            </span>
          </div>
        </div>

        {/* 按钮菜单区 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-2.5">
            {menuItems.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + idx * 0.05 }}
              >
                <MenuButton
                  icon={item.icon}
                  label={item.label}
                  hint={item.hint}
                  active={activeMenu === item.id}
                  color={item.color}
                  onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                />
              </motion.div>
            ))}
          </div>

          {/* 底部状态栏 */}
          <div className="mt-5 rounded-2xl border border-white/5 bg-slate-950/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-400">地形数据</span>
              <span className="text-[10px] text-slate-300 truncate max-w-[140px]">
                {terrainData?.sourceFile ? '已加载' : '未加载'}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[9px] text-slate-400">影像图层</span>
              <span className="text-[10px] text-slate-300 truncate max-w-[140px]">
                {overlayData?.sourceFile ? '已加载' : '未加载'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 模态框面板 */}
      <AnimatePresence>
        {activeMenu === 'data' ? (
          <ModalPanel title="📁 数据管理" isOpen onClose={() => setActiveMenu(null)} accentColor="sky">
            <DataHub
              datasets={datasets}
              onToggleInclude={onToggleDatasetInclude}
              onAssignBand={onAssignDatasetBand}
              onPickRole={onPickDatasetRole}
              onRemove={onRemoveDataset}
              onClear={onClearDatasets}
            />
          </ModalPanel>
        ) : null}

        {activeMenu === 'geo' ? (
          <ModalPanel title="🌍 地名与区域定位" isOpen onClose={() => setActiveMenu(null)} accentColor="emerald">
            <GlobeExplorer selectedRegion={selectedRegion} onRegionChange={(r) => { onRegionChange(r); setActiveMenu(null); }} />
          </ModalPanel>
        ) : null}

        {activeMenu === 'import' ? (
          <ModalPanel title="⬆️ 文件导入与波段合成" isOpen onClose={() => setActiveMenu(null)} accentColor="amber">
            <div className="space-y-3">
              <UploadZone
                onFileUpload={(data) => {
                  onFileUpload?.(data)
                  if (data?.kind === 'imagery') {
                    onSettingsChange((prev) => ({ ...prev, showOverlay: true }))
                  }
                }}
              />
              <BandComposer
                onCompositeReady={(data) => {
                  onFileUpload?.(data)
                }}
              />
            </div>
          </ModalPanel>
        ) : null}

        {activeMenu === 'render' ? (
          <ModalPanel title="🎨 渲染控制" isOpen onClose={() => setActiveMenu(null)} accentColor="rose">
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] text-slate-400">渲染风格</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {COLOR_SCHEMES.map(({ key, label, colors }) => (
                    <button
                      key={key}
                      onClick={() => handleChange('colorScheme', key)}
                      className={`rounded-xl border p-2 text-left transition-all ${
                        settings.colorScheme === key
                          ? 'border-amber-500/40 bg-amber-500/10'
                          : 'border-white/5 bg-slate-900/40 hover:border-slate-600/30'
                      }`}
                    >
                      <div className="mb-1.5 flex gap-0.5">
                        {colors.map((c) => (
                          <div key={c} className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <span className="text-[9px] text-slate-400">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <RangeControl
                label="地形夸张"
                value={terrainScaleDraft}
                displayValue={terrainScaleDraft.toFixed(1)}
                suffix="x"
                min={0.1}
                max={3}
                step={0.1}
                onChange={handleTerrainScaleChange}
                onCommit={commitTerrainScale}
              />

              <div>
                <div className="mb-1.5 flex justify-between text-[11px]">
                  <span className="text-slate-400">等高线间距</span>
                  <span className="text-amber-300">{settings.contourInterval}m</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {CONTOUR_INTERVALS.map((interval) => (
                    <button
                      key={interval}
                      onClick={() => handleChange('contourInterval', interval)}
                      className={`min-w-9 flex-1 rounded-lg py-1.5 text-[10px] transition-all ${
                        settings.contourInterval === interval
                          ? 'bg-amber-500 font-medium text-slate-950'
                          : 'bg-slate-800/50 text-slate-300 hover:bg-amber-500/15'
                      }`}
                    >
                      {interval}
                    </button>
                  ))}
                </div>
              </div>

              <RangeControl
                label="影像透明度"
                value={settings.overlayOpacity * 100}
                displayValue={Math.round(settings.overlayOpacity * 100)}
                suffix="%"
                min={0}
                max={100}
                step={5}
                onChange={(value) => handleChange('overlayOpacity', value / 100)}
              />

              <RangeControl
                label="太阳方位"
                value={settings.sunAzimuth}
                suffix="°"
                min={0}
                max={360}
                step={1}
                onChange={(value) => handleChange('sunAzimuth', value)}
              />

              <RangeControl
                label="太阳高度"
                value={settings.sunElevation}
                suffix="°"
                min={0}
                max={90}
                step={1}
                onChange={(value) => handleChange('sunElevation', value)}
              />

              <div className="space-y-1.5">
                <ToggleButton
                  label="显示影像"
                  active={settings.showOverlay}
                  onClick={() => handleChange('showOverlay', !settings.showOverlay)}
                  disabled={!hasOverlay}
                />
                <ToggleButton
                  label="显示阴影"
                  active={settings.showHillshade}
                  onClick={() => handleChange('showHillshade', !settings.showHillshade)}
                  disabled={!hasData}
                />
                <ToggleButton
                  label="显示等高线"
                  active={settings.showContours}
                  onClick={() => handleChange('showContours', !settings.showContours)}
                  disabled={!hasData}
                />
              </div>
            </div>
          </ModalPanel>
        ) : null}
      </AnimatePresence>
    </>
  )
}
