import { motion } from 'framer-motion'
import { GRADIENTS } from '../../constants/theme'

// 程序化地形等高线背景组件
function AlgorithmicTerrainBg() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-20">
      <svg className="w-full h-full" style={{ transform: 'scale(1.2)' }}>
        <defs>
          <pattern id="contour-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M0 40 Q20 20 40 40 T80 40" fill="none" stroke="rgba(245, 158, 11, 0.4)" strokeWidth="0.6" />
            <path d="M0 55 Q20 35 40 55 T80 55" fill="none" stroke="rgba(14, 165, 233, 0.3)" strokeWidth="0.4" />
            <path d="M0 25 Q20 45 40 25 T80 25" fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#contour-pattern)" />
      </svg>
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(2, 6, 23, 0.95) 100%)'
        }}
      />
    </div>
  )
}

// 浮动装饰粒子组件
function FloatingParticles() {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 6,
    delay: `${Math.random() * 8}s`,
    duration: `${12 + Math.random() * 10}s`,
    color: Math.random() > 0.5 ? 'rgba(245, 158, 11, 0.5)' : 'rgba(14, 165, 233, 0.4)'
  }))

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, 20, 0],
            opacity: [0.3, 0.7, 0.3],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: parseFloat(p.duration),
            delay: parseFloat(p.delay),
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export default function Shell({ topBar, leftSidebar, mainView, rightSidebar, bottomBar }) {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* 主要背景 */}
      <div
        className="absolute inset-0"
        style={{
          background: GRADIENTS.bgMain,
        }}
      />

      {/* 算法艺术等高线背景 */}
      <AlgorithmicTerrainBg />

      {/* 浮动装饰粒子 */}
      <FloatingParticles />

      {/* 柔和光晕 */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25), transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-20%] right-[-5%] w-[45%] h-[45%] rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.22), transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 flex h-full w-full flex-col">
        {/* 顶部栏区域 */}
        {topBar ? (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.3, 1] }}
            className="sticky top-0 z-30 shrink-0 px-5 pt-4"
          >
            {topBar}
          </motion.div>
        ) : null}

        {/* 主内容区域 - 收窄的侧边栏宽度 */}
        <div className="min-h-0 flex-1 px-4 py-3">
          <div className="grid h-full min-h-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,280px)_minmax(0,1fr)_minmax(260px,280px)]">
            {/* 左侧侧边栏 */}
            <motion.aside
              initial={{ x: -30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative min-h-[280px] overflow-hidden rounded-3xl border border-white/6 bg-slate-950/55 shadow-[0_20px_60px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-2xl xl:min-h-0"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/4 via-transparent to-sky-500/3" />
              {leftSidebar}
            </motion.aside>

            {/* 主视口 */}
            <motion.main
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative min-h-[420px] overflow-hidden rounded-[32px] border border-white/8 bg-slate-950/30 shadow-[0_32px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5 backdrop-blur-2xl xl:min-h-0"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/3 via-transparent to-white/2" />
              {mainView}
            </motion.main>

            {/* 右侧侧边栏 */}
            <motion.aside
              initial={{ x: 30, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative min-h-[320px] overflow-hidden rounded-[32px] border border-white/8 bg-slate-950/55 shadow-[0_28px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/5 backdrop-blur-2xl xl:min-h-0 hover-lift"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/40 to-transparent" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-bl from-sky-500/5 via-transparent to-amber-500/3" />
              {rightSidebar}
            </motion.aside>
          </div>
        </div>

        {/* 底部栏区域 */}
        {bottomBar ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.25, ease: [0.2, 0.8, 0.3, 1] }}
            className="sticky bottom-0 z-30 shrink-0 px-5 pb-4"
          >
            {bottomBar}
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}
