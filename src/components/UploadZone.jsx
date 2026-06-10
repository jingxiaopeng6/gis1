import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { loadRasterFile, isSupportedRasterFile } from '../utils/raster'

function UploadZone({ onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const processFile = async (file) => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await loadRasterFile(file)
      onFileUpload(result)
    } catch (err) {
      console.error('栅格解析失败:', err)
      setError(err?.message || '文件解析失败，请检查格式是否受支持')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (isSupportedRasterFile(file)) {
        processFile(file)
      } else {
        setError('请上传 tif、tiff、png、jpg、jpeg、webp、bmp 或 img 等栅格文件')
      }
    }
  }, [])

  const handleFileSelect = useCallback((e) => {
    const files = e.target.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }, [])

  return (
    <motion.div
      className={`relative rounded-xl border-2 border-dashed transition-all duration-300 ${
        isDragging
          ? 'border-terrain-accent bg-terrain-accent/10 scale-[1.02]'
          : 'border-terrain-muted/30 hover:border-terrain-accent/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={{ scale: 1.01 }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".tif,.tiff,.png,.jpg,.jpeg,.webp,.bmp,.img,.vrt,image/tiff,image/png,image/jpeg,image/webp,image/bmp"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        className="cursor-pointer px-5 py-6 text-center"
        onClick={() => fileInputRef.current?.click()}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-10 h-10 border-3 border-terrain-accent/30 border-t-terrain-accent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-terrain-text text-sm">正在解析栅格数据...</p>
            </motion.div>
          ) : (
            <motion.div
              key="default"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-terrain-accent/20' : 'bg-terrain-card'
                }`}
              >
                <svg className="w-6 h-6 text-terrain-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-terrain-text font-medium mb-1">
                {isDragging ? '释放以上传' : '上传 DEM / 影像'}
              </p>
              <p className="text-terrain-muted text-xs">
                支持 tif、tiff、png、jpg、jpeg、webp、bmp、img 等栅格文件
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-3"
          >
            <p className="text-red-400 text-xs text-center">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default UploadZone
