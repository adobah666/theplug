// Client-side image compression utility
// Compresses images in the browser before uploading to reduce bandwidth and storage costs

export interface CompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 0.1 to 1.0
  format?: 'jpeg' | 'webp' | 'png'
  maxSizeKB?: number // Target max file size in KB
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  format: 'jpeg',
  maxSizeKB: 500
}

/**
 * Compresses an image file in the browser using Canvas API
 * Returns a compressed File object ready for upload
 */
export async function compressImage(
  file: File, 
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      const { width: newWidth, height: newHeight } = calculateDimensions(
        img.width, 
        img.height, 
        opts.maxWidth, 
        opts.maxHeight
      )

      // Set canvas dimensions
      canvas.width = newWidth
      canvas.height = newHeight

      // Draw and compress the image
      ctx.drawImage(img, 0, 0, newWidth, newHeight)

      // Try different quality levels to hit target file size
      compressToTargetSize(canvas, opts, file.name)
        .then(resolve)
        .catch(reject)
    }

    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Compresses multiple images in parallel with progress callback
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<File[]> {
  const results: File[] = []
  
  for (let i = 0; i < files.length; i++) {
    try {
      const compressed = await compressImage(files[i], options)
      results.push(compressed)
      onProgress?.(i + 1, files.length)
    } catch (error) {
      console.warn(`Failed to compress ${files[i].name}:`, error)
      // Fall back to original file if compression fails
      results.push(files[i])
      onProgress?.(i + 1, files.length)
    }
  }
  
  return results
}

/**
 * Calculate new dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight }

  // Scale down if larger than max dimensions
  if (width > maxWidth) {
    height = (height * maxWidth) / width
    width = maxWidth
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height
    height = maxHeight
  }

  return { width: Math.round(width), height: Math.round(height) }
}

/**
 * Compress canvas to target file size by adjusting quality
 */
async function compressToTargetSize(
  canvas: HTMLCanvasElement,
  options: Required<CompressionOptions>,
  originalName: string
): Promise<File> {
  const mimeType = `image/${options.format}`
  let quality = options.quality
  let blob: Blob | null = null

  // Try up to 5 iterations to hit target size
  for (let attempt = 0; attempt < 5; attempt++) {
    blob = await new Promise<Blob | null>(resolve => {
      canvas.toBlob(resolve, mimeType, quality)
    })

    if (!blob) {
      throw new Error('Failed to create blob from canvas')
    }

    const sizeKB = blob.size / 1024

    // If we're under target size or quality is already very low, use this version
    if (sizeKB <= options.maxSizeKB || quality <= 0.1) {
      break
    }

    // Reduce quality for next attempt
    quality = Math.max(0.1, quality * 0.8)
  }

  if (!blob) {
    throw new Error('Failed to compress image')
  }

  // Create new File object with compressed data
  const extension = options.format === 'jpeg' ? 'jpg' : options.format
  const newName = originalName.replace(/\.[^.]+$/, `.${extension}`)
  
  return new File([blob], newName, { type: mimeType })
}

/**
 * Get compression stats for display
 */
export function getCompressionStats(originalFile: File, compressedFile: File) {
  const originalSizeKB = Math.round(originalFile.size / 1024)
  const compressedSizeKB = Math.round(compressedFile.size / 1024)
  const savings = Math.round(((originalFile.size - compressedFile.size) / originalFile.size) * 100)
  
  return {
    originalSizeKB,
    compressedSizeKB,
    savings,
    ratio: `${originalSizeKB}KB → ${compressedSizeKB}KB`
  }
}

/**
 * Check if file needs compression
 */
export function shouldCompress(file: File, maxSizeKB: number = 500): boolean {
  return file.size / 1024 > maxSizeKB
}
