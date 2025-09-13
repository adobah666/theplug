// Utility to optimize Cloudinary image URLs on the fly
// Inserts transformation parameters after the `/upload/` segment
// Example input:
// https://res.cloudinary.com/demo/image/upload/v12345/folder/image.jpg
// Output (with defaults):
// https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,dpr_auto,c_fill,g_auto,w_800,h_800/v12345/folder/image.jpg

export type CloudinaryOptions = {
  width?: number
  height?: number
  quality?: number | 'auto'
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'jpeg' | 'png' | string
  crop?: 'fill' | 'fit' | 'scale' | string
  gravity?: 'auto' | string
  dpr?: number | 'auto'
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
  } = opts

  try {
    // Only manipulate the path around the `/upload/` segment
    const u = new URL(url)
    const parts = u.pathname.split('/')
    const uploadIndex = parts.findIndex((p) => p === 'upload')
    if (uploadIndex === -1) return url

    const transforms: string[] = []
    // Order matters somewhat but Cloudinary is flexible
    if (format) transforms.push(`f_${format}`)
    if (quality) transforms.push(`q_${quality}`)
    if (typeof dpr !== 'undefined') transforms.push(`dpr_${dpr}`)
    if (crop) transforms.push(`c_${crop}`)
    if (gravity) transforms.push(`g_${gravity}`)
    if (width) transforms.push(`w_${Math.round(width)}`)
    if (height) transforms.push(`h_${Math.round(height)}`)

    // Insert transforms after `upload`
    const before = parts.slice(0, uploadIndex + 1) // includes 'upload'
    const after = parts.slice(uploadIndex + 1) // includes version/folders/file
    const newPath = [...before, transforms.join(','), ...after]
      .filter(Boolean)
      .join('/')

    // Ensure we have a leading slash before the path; otherwise the URL host may
    // accidentally swallow the first segment (e.g., "res.cloudinary.comdjrtta2w7").
    const normalizedPath = newPath.startsWith('/') ? newPath : `/${newPath}`

    return `${u.protocol}//${u.host}${normalizedPath}${u.search || ''}`
  } catch {
    return url
  }
}
