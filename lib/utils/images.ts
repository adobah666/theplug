// Ultra-fast image optimization for Cloudinary URLs
// Optimized for maximum loading speed like IMDB/TMDB
// Inserts aggressive transformation parameters after the `/upload/` segment

export type CloudinaryOptions = {
  width?: number
  height?: number
  quality?: number | 'auto' | 'eco' | 'low'
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'jpeg' | 'png' | string
  crop?: 'fill' | 'fit' | 'scale' | 'pad' | 'crop' | 'thumb' | string
  gravity?: 'auto' | 'face' | 'faces' | 'center' | 'north' | 'south' | 'east' | 'west' | string
  dpr?: number | 'auto'
  flags?: string[]
  effect?: string
  blur?: number
}

// Presets for different use cases to maximize speed
export const IMAGE_PRESETS = {
  // Ultra-fast loading with aggressive compression
  thumbnail: {
    quality: 'eco' as const,
    format: 'auto' as const,
    crop: 'thumb' as const,
    gravity: 'auto' as const,
    dpr: 'auto' as const,
    flags: ['progressive', 'immutable_cache']
  },
  // Product cards - balance speed and quality
  card: {
    quality: 'auto' as const,
    format: 'auto' as const,
    crop: 'fill' as const,
    gravity: 'auto' as const,
    dpr: 'auto' as const,
    flags: ['progressive', 'immutable_cache']
  },
  // Hero images - slightly better quality but still fast
  hero: {
    quality: 'auto' as const,
    format: 'auto' as const,
    crop: 'fill' as const,
    gravity: 'auto' as const,
    dpr: 'auto' as const,
    flags: ['progressive', 'immutable_cache']
  },
  // Blur placeholder for progressive loading
  placeholder: {
    quality: 'eco' as const,
    format: 'auto' as const,
    crop: 'fill' as const,
    gravity: 'auto' as const,
    blur: 50,
    flags: ['progressive']
  }
}

export function isCloudinaryUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false
  return /(^https?:)?\/\/res\.cloudinary\.com\//.test(url)
}

export function optimizeImageUrl(url?: string, opts: CloudinaryOptions = {}): string {
  if (!url || !isCloudinaryUrl(url)) return url || ''

  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
    gravity = 'auto',
    dpr = 'auto',
    flags = [],
    effect,
    blur,
  } = opts

  try {
    // Only manipulate the path around the `/upload/` segment
    const u = new URL(url)
    const parts = u.pathname.split('/')
    const uploadIndex = parts.findIndex((p) => p === 'upload')
    if (uploadIndex === -1) return url

    const transforms: string[] = []
    
    // Order optimized for fastest processing
    if (format) transforms.push(`f_${format}`)
    if (quality) transforms.push(`q_${quality}`)
    if (typeof dpr !== 'undefined') transforms.push(`dpr_${dpr}`)
    if (crop) transforms.push(`c_${crop}`)
    if (gravity) transforms.push(`g_${gravity}`)
    if (width) transforms.push(`w_${Math.round(width)}`)
    if (height) transforms.push(`h_${Math.round(height)}`)
    if (effect) transforms.push(`e_${effect}`)
    if (blur) transforms.push(`e_blur:${blur}`)
    
    // Add performance flags
    if (flags.length > 0) {
      flags.forEach(flag => transforms.push(`fl_${flag}`))
    }

    // Insert transforms after `upload`
    const before = parts.slice(0, uploadIndex + 1) // includes 'upload'
    const after = parts.slice(uploadIndex + 1) // includes version/folders/file
    const newPath = [...before, transforms.join(','), ...after]
      .filter(Boolean)
      .join('/')

    // Ensure we have a leading slash before the path
    const normalizedPath = newPath.startsWith('/') ? newPath : `/${newPath}`

    return `${u.protocol}//${u.host}${normalizedPath}${u.search || ''}`
  } catch {
    return url
  }
}

// Generate optimized image URL with preset
export function getOptimizedImageUrl(
  url: string, 
  preset: keyof typeof IMAGE_PRESETS, 
  customOpts: Partial<CloudinaryOptions> = {}
): string {
  const presetOpts = IMAGE_PRESETS[preset]
  return optimizeImageUrl(url, { ...presetOpts, ...customOpts })
}

// Generate blur placeholder for progressive loading
export function getBlurPlaceholder(url: string, width: number = 40, height: number = 40): string {
  return getOptimizedImageUrl(url, 'placeholder', { width, height })
}

// Generate responsive image URLs for different screen sizes
export function getResponsiveImageUrls(url: string, preset: keyof typeof IMAGE_PRESETS = 'card') {
  const baseOpts = IMAGE_PRESETS[preset]
  
  return {
    mobile: optimizeImageUrl(url, { ...baseOpts, width: 400, height: 400 }),
    tablet: optimizeImageUrl(url, { ...baseOpts, width: 600, height: 600 }),
    desktop: optimizeImageUrl(url, { ...baseOpts, width: 800, height: 800 }),
    large: optimizeImageUrl(url, { ...baseOpts, width: 1200, height: 1200 }),
  }
}

// Preload critical images
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = reject
    img.src = url
  })
}

// Preload multiple images with priority
export async function preloadImages(urls: string[], maxConcurrent: number = 3): Promise<void> {
  const chunks = []
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    chunks.push(urls.slice(i, i + maxConcurrent))
  }
  
  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(preloadImage))
  }
}
