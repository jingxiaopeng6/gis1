// 地理学主题配色
export const COLORS = {
  dark: '#020617',
  darker: '#0F172A',
  card: '#0F172A',
  cardLighter: '#1E293B',
  accent: '#F59E0B',
  accentSoft: '#FEF3C7',
  accentMuted: 'rgba(245, 158, 11, 0.2)',
  accentGlow: 'rgba(245, 158, 11, 0.35)',
  accentSecondary: '#0EA5E9',
  accentSecondaryGlow: 'rgba(14, 165, 233, 0.25)',
  text: '#F8FAFC',
  textMuted: '#94A3B8',
  textSoft: '#64748B',
  border: 'rgba(255, 255, 255, 0.1)',
  borderSoft: 'rgba(255, 255, 255, 0.06)',
}

// 地形高程配色渐变 (低到高)
export const ELEVATION_COLORS = [
  { stop: 0.0, color: [30, 64, 175] },   // 深蓝 - 深海/低地
  { stop: 0.12, color: [22, 101, 52] },  // 森林绿
  { stop: 0.35, color: [134, 239, 172] },// 浅绿
  { stop: 0.5, color: [253, 224, 71] },  // 黄色 - 丘陵
  { stop: 0.68, color: [180, 83, 9] },   // 棕色 - 山地
  { stop: 0.85, color: [124, 58, 23] },  // 深棕
  { stop: 1.0, color: [248, 250, 252] }, // 雪白 - 峰顶
]

// 渐变与视觉预设
export const GRADIENTS = {
  bgMain: 'radial-gradient(ellipse at 20% 15%, rgba(245, 158, 11, 0.15) 0%, transparent 48%), radial-gradient(ellipse at 80% 85%, rgba(14, 165, 233, 0.12) 0%, transparent 52%), linear-gradient(180deg, rgba(2, 6, 23, 0.98), rgba(15, 23, 42, 0.96))',
  glowAccent: '0 0 30px rgba(245, 158, 11, 0.15)',
  glowSoft: '0 0 24px rgba(148, 163, 184, 0.08)',
}

// 太阳位置预设
export const SUN_PRESETS = {
  morning: { azimuth: 45, elevation: 30 },
  noon: { azimuth: 180, elevation: 75 },
  afternoon: { azimuth: 270, elevation: 45 },
  evening: { azimuth: 315, elevation: 15 },
}

// 等高线间距预设 (米)
export const CONTOUR_INTERVALS = [10, 20, 50, 100, 200, 500]

// 3D场景默认设置
export const SCENE_DEFAULTS = {
  cameraPosition: [50, 50, 50],
  terrainSegments: 256,
  terrainScale: 1.0,
  waterLevel: 0,
}
