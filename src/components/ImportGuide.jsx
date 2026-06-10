import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// 新手引导步骤
const GUIDE_STEPS = [
  {
    icon: '📊',
    title: '准备数据文件',
    desc: '需要准备两种文件：DEM高程数据和卫星影像',
    details: [
      { tag: 'DEM文件', desc: '数字高程模型，控制地形起伏，如 SRTM、ASTER 数据' },
      { tag: '卫星影像', desc: '真彩色卫星图，控制表面纹理，如 Landsat、Planet 影像' },
    ],
  },
  {
    icon: '📁',
    title: '导入DEM文件',
    desc: '导入高程数据作为地形底座',
    details: [
      { tag: '支持格式', desc: 'GeoTIFF (.tif)、ENVI (.img)、PNG、JPEG 等' },
      { tag: '识别方式', desc: '系统会自动识别为高程数据（terrain）' },
    ],
  },
  {
    icon: '🖼️',
    title: '导入卫星影像',
    desc: '导入真彩色影像覆盖在地形表面',
    details: [
      { tag: '波段要求', desc: '需要 R/G/B 三个波段组合成彩色图像' },
      { tag: '自动对齐', desc: '系统会自动根据坐标信息对齐两张图' },
    ],
  },
  {
    icon: '🎨',
    title: '调整渲染效果',
    desc: '在渲染控制中调整叠加效果',
    details: [
      { tag: '影像透明度', desc: '调整卫星图的透明度，找到最佳叠加效果' },
      { tag: '地形夸张', desc: '调整高度比例，使地形起伏更明显' },
      { tag: '配色方案', desc: '选择不同的地形配色风格' },
    ],
  },
]

// 文件信息卡片
function FileInfoCard({ data }) {
  if (!data) {
    return (
      <div className="rounded-xl border border-dashed border-amber-400/30 bg-amber-500/5 p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="text-sm text-slate-300">暂无导入文件</p>
            <p className="text-xs text-slate-500">拖拽或点击上传栅格文件</p>
          </div>
        </div>
      </div>
    )
  }

  const getKindLabel = (kind) => {
    const map = {
      dem: '高程数据 (DEM)',
      imagery: '影像数据',
      unknown: '未知类型',
    }
    return map[kind] || kind || '未知'
  }

  const getRoleLabel = (role) => {
    const map = {
      terrain: '地形 (控制起伏)',
      overlay: '叠加 (控制纹理)',
    }
    return map[role] || role || '待分配'
  }

  const getBandInfo = (data) => {
    if (data.channels) return `${data.channels} 通道`
    if (data.bands?.length) return `${data.bands.length} 波段`
    return null
  }

  return (
    <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">✅</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-emerald-300 truncate" title={data.sourceFile || data.name}>
              {data.sourceFile || data.name}
            </p>
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-emerald-500/30 text-emerald-300 whitespace-nowrap">
              {getRoleLabel(data.role)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-slate-500">类型：</span>
              <span className="text-slate-300">{getKindLabel(data.kind)}</span>
            </div>
            {data.width && data.height && (
              <div>
                <span className="text-slate-500">分辨率：</span>
                <span className="text-slate-300">{data.width} × {data.height}</span>
              </div>
            )}
            {getBandInfo(data) && (
              <div>
                <span className="text-slate-500">波段：</span>
                <span className="text-slate-300">{getBandInfo(data)}</span>
              </div>
            )}
            {data.crs && data.crs !== 'Unknown' && (
              <div className="col-span-2">
                <span className="text-slate-500">坐标系统：</span>
                <span className="text-slate-300">{data.crs}</span>
              </div>
            )}
            {data.bbox && data.bbox.length === 4 && (
              <div className="col-span-2">
                <span className="text-slate-500">范围：</span>
                <span className="text-slate-300">
                  {data.bbox[0].toFixed(4)}° ~ {data.bbox[2].toFixed(4)}° E,{' '}
                  {data.bbox[1].toFixed(4)}° ~ {data.bbox[3].toFixed(4)}° N
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 新手引导组件
export default function ImportGuide({ terrainData, overlayData, datasets }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const hasTerrain = !!terrainData
  const hasOverlay = !!overlayData
  const totalFiles = datasets?.length || 0

  return (
    <div className="space-y-3">
      {/* 状态概览 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-200">🧭 新手引导</span>
          {totalFiles === 0 && (
            <span className="px-1.5 py-0.5 text-[9px] rounded bg-amber-500/30 text-amber-300 animate-pulse">
              建议先阅读
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {isExpanded ? '收起 ↑' : '展开 ↓'}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* 创建3D卫星地形模型的三步流程 */}
            <div className="rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-500/5 to-transparent p-4 mb-3">
              <h4 className="text-sm font-medium text-amber-300 mb-3 flex items-center gap-2">
                <span className="text-base">🚀</span>
                如何创建带卫星图的三维模型
              </h4>

              <div className="space-y-2">
                {/* 步骤 1 */}
                <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-900/50">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-amber-400">1</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">导入 DEM 高程数据</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      如 SRTM、ASTER 等数字高程模型，控制地形起伏
                    </p>
                    {hasTerrain ? (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-emerald-400">
                        ✓ 已导入
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-amber-400">
                        ○ 待导入
                      </span>
                    )}
                  </div>
                </div>

                {/* 步骤 2 */}
                <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-900/50">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-amber-400">2</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">导入真彩色卫星影像</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      R/G/B 三波段合成的彩色图像，覆盖在地形表面
                    </p>
                    {hasOverlay ? (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-emerald-400">
                        ✓ 已导入
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 mt-1 text-amber-400">
                        ○ 待导入
                      </span>
                    )}
                  </div>
                </div>

                {/* 步骤 3 */}
                <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-900/50">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-amber-400">3</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-200">开启真彩影像叠加</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      在「渲染控制」中启用「显示真彩影像」，自动对齐叠加
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-slate-400">
                      → 点击左侧「🎨 渲染控制」
                    </span>
                  </div>
                </div>
              </div>

              {/* 成功提示 */}
              {hasTerrain && hasOverlay && (
                <div className="mt-3 p-2 rounded-lg bg-emerald-500/10 border border-emerald-400/30">
                  <p className="text-xs text-emerald-300 flex items-center gap-2">
                    <span>🎉</span>
                    已具备创建卫星地形3D模型的全部数据！
                  </p>
                </div>
              )}
            </div>

            {/* 数据文件类型说明 */}
            <div className="rounded-xl border border-sky-400/20 bg-sky-500/5 p-4 mb-3">
              <h4 className="text-sm font-medium text-sky-300 mb-3 flex items-center gap-2">
                <span className="text-base">📚</span>
                数据文件类型说明
              </h4>

              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-sky-400">D</span>
                  </span>
                  <div>
                    <p className="text-xs text-slate-200">DEM / 高程数据</p>
                    <p className="text-[10px] text-slate-500">单波段灰度图，每个像素值代表海拔高度（米）</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-emerald-400">R</span>
                  </span>
                  <div>
                    <p className="text-xs text-slate-200">真彩色卫星影像</p>
                    <p className="text-[10px] text-slate-500">RGB 三波段合成，显示地表真实颜色</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-purple-400">M</span>
                  </span>
                  <div>
                    <p className="text-xs text-slate-200">多光谱影像</p>
                    <p className="text-[10px] text-slate-500">可选择不同波段组合（红/绿/蓝/近红外等）</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 数据来源推荐 */}
            <div className="rounded-xl border border-slate-400/20 bg-slate-800/30 p-4">
              <h4 className="text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                <span className="text-base">🔗</span>
                免费数据下载
              </h4>
              <div className="space-y-1 text-[10px] text-slate-500">
                <p>• NASA SRTM: https://earthexplorer.usgs.gov/</p>
                <p>• 天地图: https://www.tianditu.gov.cn/</p>
                <p>• 地理空间数据云: https://www.gscloud.cn/</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { FileInfoCard }
