import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AnalysisPanel from '../AnalysisPanel'
import ExportCenter from '../ExportCenter'
import FormatLab from '../format/FormatLab'
import BandComposer from '../BandComposer'

// 按钮菜单组件
function MenuButton({ icon, label, active, onClick, hint, color = 'amber' }) {
  const colorMap = {
    amber: 'from-amber-500/20 to-amber-600/10',
    sky: 'from-sky-500/20 to-sky-600/10',
    emerald: 'from-emerald-500/20 to-emerald-600/10',
    rose: 'from-rose-500/20 to-rose-600/10',
    indigo: 'from-indigo-500/20 to-indigo-600/10',
  }
  const activeColorMap = {
    amber: 'border-amber-500/60 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    sky: 'border-sky-500/60 bg-sky-500/20 shadow-[0_0_20px_rgba(14,165,233,0.25)]',
    emerald: 'border-emerald-500/60 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    rose: 'border-rose-500/60 bg-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.25)]',
    indigo: 'border-indigo-500/60 bg-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.25)]',
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
function ModalPanel({ title, isOpen, onClose, children, accentColor = 'sky' }) {
  const accentClassMap = {
    amber: 'from-amber-500/30 via-amber-400/15 to-transparent',
    sky: 'from-sky-500/30 via-sky-400/15 to-transparent',
    emerald: 'from-emerald-500/30 via-emerald-400/15 to-transparent',
    rose: 'from-rose-500/30 via-rose-400/15 to-transparent',
    indigo: 'from-indigo-500/30 via-indigo-400/15 to-transparent',
  }
  const borderColorMap = {
    amber: 'border-amber-400/30',
    sky: 'border-sky-400/30',
    emerald: 'border-emerald-400/30',
    rose: 'border-rose-400/30',
    indigo: 'border-indigo-400/30',
  }
  const textColorMap = {
    amber: 'text-amber-300',
    sky: 'text-sky-300',
    emerald: 'text-emerald-300',
    rose: 'text-rose-300',
    indigo: 'text-indigo-300',
  }
  const buttonColorMap = {
    amber: 'bg-amber-500/20 border-amber-400/40 hover:bg-amber-500/30 hover:border-amber-400/60 text-amber-300',
    sky: 'bg-sky-500/20 border-sky-400/40 hover:bg-sky-500/30 hover:border-sky-400/60 text-sky-300',
    emerald: 'bg-emerald-500/20 border-emerald-400/40 hover:bg-emerald-500/30 hover:border-emerald-400/60 text-emerald-300',
    rose: 'bg-rose-500/20 border-rose-400/40 hover:bg-rose-500/30 hover:border-rose-400/60 text-rose-300',
    indigo: 'bg-indigo-500/20 border-indigo-400/40 hover:bg-indigo-500/30 hover:border-indigo-400/60 text-indigo-300',
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

// 快速统计卡片组件
function QuickStat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-950/45 px-2.5 py-2">
      <div className="text-[9px] text-slate-400">{label}</div>
      <div className="mt-0.5 truncate text-xs font-semibold text-slate-100" title={String(value)}>
        {value}
      </div>
    </div>
  )
}

export default function RightInspector({ terrainData, overlayData, settings, selectedRegion, canvasElement, datasets = [], onImportConvertedData, onOpenBandComposer, onOpenReportPage }) {
  const [activeMenu, setActiveMenu] = useState(null)
  const [showBandComposer, setShowBandComposer] = useState(false)
  const activeCount = datasets.filter((item) => item.include !== false).length

  // 打开波段合成的回调
  const handleOpenBandComposer = () => {
    setShowBandComposer(true)
  }

  const menuItems = [
    { id: 'stats', icon: '📊', label: '快速统计', hint: activeCount + ' 活跃', color: 'sky' },
    { id: 'analysis', icon: '🔬', label: '分析看板', hint: terrainData ? '实时' : '等待', color: 'emerald' },
    { id: 'format', icon: '🔄', label: '格式转换', hint: 'TIFF/ENVI/PNG', color: 'amber' },
    { id: 'export', icon: '📤', label: '办公导出', hint: 'PNG/SVG/PDF', color: 'indigo' },
  ]

  return (
    <>
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-950/25">
        {/* 顶部状态区 */}
        <div className="border-b border-white/5 px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center">
                <span className="text-sm">📋</span>
              </div>
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold text-slate-100 leading-tight">信息面板</h2>
                <div className="flex items-center gap-2 text-[9px] text-slate-400 leading-tight mt-0.5">
                  <span>区域: {selectedRegion?.label || '未选择'}</span>
                </div>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-400/10 text-sky-300 border border-sky-400/20">
              {canvasElement ? '就绪' : '等待'}
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
              <span className="text-[9px] text-slate-400">活跃文件</span>
              <span className="text-[10px] text-slate-300">{activeCount} / {datasets.length}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[9px] text-slate-400">渲染模式</span>
              <span className="text-[10px] text-slate-300">{settings.colorScheme === 'natural' ? '自然' : settings.colorScheme === 'satellite' ? '卫星' : '等高'}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[9px] text-slate-400">地形夸张</span>
              <span className="text-[10px] text-slate-300">{settings.terrainScale.toFixed(1)}x</span>
            </div>
          </div>
        </div>
      </div>

      {/* 模态框面板 */}
      <AnimatePresence>
        {activeMenu === 'stats' ? (
          <ModalPanel title="📊 快速统计" isOpen onClose={() => setActiveMenu(null)} accentColor="sky">
            <div className="grid grid-cols-2 gap-2">
              <QuickStat label="文件总数" value={datasets.length} />
              <QuickStat label="已启用" value={activeCount} />
              <QuickStat label="DEM" value={terrainData?.sourceFile ? terrainData.sourceFile.substring(0, 12) + '…' : '未加载'} />
              <QuickStat label="影像" value={overlayData?.sourceFile ? overlayData.sourceFile.substring(0, 12) + '…' : '未加载'} />
              <QuickStat label="地形夸张" value={settings.terrainScale.toFixed(1) + 'x'} />
              <QuickStat label="等高线" value={settings.contourInterval + 'm'} />
              <QuickStat label="太阳方位" value={settings.sunAzimuth + '°'} />
              <QuickStat label="太阳高度" value={settings.sunElevation + '°'} />
            </div>
          </ModalPanel>
        ) : null}

        {activeMenu === 'analysis' ? (
          <ModalPanel title="🔬 分析看板" isOpen onClose={() => setActiveMenu(null)} accentColor="emerald">
            <AnalysisPanel terrainData={terrainData} overlayData={overlayData} settings={settings} />
          </ModalPanel>
        ) : null}

        {activeMenu === 'format' ? (
          <ModalPanel title="🔄 格式转换中心" isOpen onClose={() => setActiveMenu(null)} accentColor="amber">
            <FormatLab
              datasets={datasets}
              terrainData={terrainData}
              overlayData={overlayData}
              onImportConvertedData={onImportConvertedData}
              onOpenBandComposer={handleOpenBandComposer}
              onOpenReportPage={onOpenReportPage}
            />
          </ModalPanel>
        ) : null}

        {activeMenu === 'export' ? (
          <ModalPanel title="📤 办公输出中心" isOpen onClose={() => setActiveMenu(null)} accentColor="indigo">
            <ExportCenter
              terrainData={terrainData}
              overlayData={overlayData}
              settings={settings}
              selectedRegion={selectedRegion}
              canvasElement={canvasElement}
            />
          </ModalPanel>
        ) : null}
      </AnimatePresence>
    </>
  )
}
