export function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadBlobFile(filename, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return true
  }
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
  return true
}

export async function copyHtml(html) {
  if (navigator.clipboard?.write && window.ClipboardItem) {
    const blob = new Blob([html], { type: 'text/html' })
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([html], { type: 'text/plain' }) })])
    return true
  }
  return copyText(html)
}

export async function copySvg(svgString) {
  if (navigator.clipboard?.write && window.ClipboardItem) {
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    await navigator.clipboard.write([new ClipboardItem({ 'image/svg+xml': blob, 'text/plain': new Blob([svgString], { type: 'text/plain' }) })])
    return true
  }
  return copyText(svgString)
}

export function canvasToDataUrl(canvas) {
  if (!canvas) return null
  return canvas.toDataURL('image/png')
}
