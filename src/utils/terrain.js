import * as THREE from 'three'

function computeReducedSize(width, height, maxDimension) {
  const maxSide = Math.max(width, height, 1)
  if (maxSide <= maxDimension) return { width, height, scale: 1 }
  const scale = maxDimension / maxSide
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  }
}

export function downsampleFloatGrid(data, width, height, maxDimension = 768) {
  if (!data?.length || !width || !height) {
    return { data, width, height, scale: 1 }
  }

  const nextSize = computeReducedSize(width, height, maxDimension)
  if (nextSize.scale === 1) {
    return { data, width, height, scale: 1 }
  }

  const out = new Float32Array(nextSize.width * nextSize.height)
  const xRatio = width / nextSize.width
  const yRatio = height / nextSize.height

  for (let y = 0; y < nextSize.height; y += 1) {
    const srcY = Math.min(height - 1, Math.floor(y * yRatio))
    for (let x = 0; x < nextSize.width; x += 1) {
      const srcX = Math.min(width - 1, Math.floor(x * xRatio))
      out[y * nextSize.width + x] = data[srcY * width + srcX] ?? 0
    }
  }

  return { data: out, ...nextSize }
}

export function downsampleColorGrid(data, width, height, channels = 4, maxDimension = 1024) {
  if (!data?.length || !width || !height) {
    return { data, width, height, scale: 1, channels }
  }

  const nextSize = computeReducedSize(width, height, maxDimension)
  if (nextSize.scale === 1) {
    return { data, width, height, scale: 1, channels }
  }

  const sourceChannels = Math.max(1, channels)
  const out = new Uint8ClampedArray(nextSize.width * nextSize.height * sourceChannels)
  const xRatio = width / nextSize.width
  const yRatio = height / nextSize.height

  for (let y = 0; y < nextSize.height; y += 1) {
    const srcY = Math.min(height - 1, Math.floor(y * yRatio))
    for (let x = 0; x < nextSize.width; x += 1) {
      const srcX = Math.min(width - 1, Math.floor(x * xRatio))
      const src = (srcY * width + srcX) * sourceChannels
      const dst = (y * nextSize.width + x) * sourceChannels

      for (let c = 0; c < sourceChannels; c += 1) {
        out[dst + c] = data[src + c] ?? (c === 3 ? 255 : data[src] ?? 0)
      }
    }
  }

  return { data: out, ...nextSize, channels: sourceChannels }
}

export function createFloatTexture(data, width, height) {
  const texture = new THREE.DataTexture(
    data,
    width,
    height,
    THREE.RedFormat,
    THREE.FloatType
  )
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.flipY = true
  texture.needsUpdate = true
  return texture
}

export function createColorTexture(data, width, height, channels = 4) {
  let textureData = data

  if (channels !== 4) {
    const pixelCount = width * height
    const rgba = new Uint8ClampedArray(pixelCount * 4)
    const sourceChannels = Math.max(1, channels)
    for (let i = 0; i < pixelCount; i += 1) {
      const src = i * sourceChannels
      const dst = i * 4
      rgba[dst] = data[src] ?? 0
      rgba[dst + 1] = data[src + 1] ?? rgba[dst]
      rgba[dst + 2] = data[src + 2] ?? rgba[dst]
      rgba[dst + 3] = sourceChannels > 3 ? (data[src + 3] ?? 255) : 255
    }
    textureData = rgba
  }

  const texture = new THREE.DataTexture(
    textureData,
    width,
    height,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  )
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.generateMipmaps = false
  texture.colorSpace = THREE.SRGBColorSpace
  texture.flipY = true
  texture.needsUpdate = true
  return texture
}
