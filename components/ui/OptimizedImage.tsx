'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { isCloudinaryUrl, getOptimizedImageUrl, getBlurPlaceholder, IMAGE_PRESETS } from '@/lib/utils/images'
import type { CloudinaryOptions } from '@/lib/utils/images'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  preset?: keyof typeof IMAGE_PRESETS
  priority?: boolean
  loading?: 'lazy' | 'eager'
  fetchPriority?: 'high' | 'low' | 'auto'
  sizes?: string
  quality?: CloudinaryOptions['quality']
  onLoad?: () => void
  onError?: () => void
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string
  /** When true, shows a gray overlay while the image loads. Default: true */
  showLoadingOverlay?: boolean
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  preset = 'card',
  priority = false,
  loading = 'lazy',
  fetchPriority,
  sizes,
  quality,
  onLoad,
  onError,
  placeholder = 'blur',
  blurDataURL,
  showLoadingOverlay = true
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const imgRef = useRef<HTMLImageElement>(null)

  // Generate optimized URLs with fallback
  const optimizedSrc = (() => {
    try {
      // If retrying for thumbnails, use original URL
      if (preset === 'thumbnail' && retryCount > 0) {
        return src
      }
      
      return isCloudinaryUrl(src) 
        ? getOptimizedImageUrl(src, preset, { 
            width, 
            height, 
            quality: quality || IMAGE_PRESETS[preset].quality 
          })
        : src
    } catch (error) {
      console.warn(`Failed to optimize image URL: ${src}`, error)
      return src // Fallback to original URL
    }
  })()

  // Generate blur placeholder if using Cloudinary
  const blurPlaceholderUrl = blurDataURL || (
    isCloudinaryUrl(src) && placeholder === 'blur'
      ? getBlurPlaceholder(src, 40, 40)
      : undefined
  )

  // Preload critical images
  useEffect(() => {
    if (priority && optimizedSrc) {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = optimizedSrc
      try {
        const u = new URL(optimizedSrc, window.location.href)
        if (u.origin !== window.location.origin) {
          link.crossOrigin = 'anonymous'
        }
      } catch {}
      document.head.appendChild(link)

      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link)
        }
      }
    }
  }, [optimizedSrc, priority])

  const handleLoad = () => {
    setImageLoaded(true)
    setImageError(false)
    onLoad?.()
  }

  const handleError = () => {
    console.warn(`Failed to load image: ${src}`)
    
    // For thumbnails, try fallback to original URL if optimized version fails
    if (preset === 'thumbnail' && retryCount === 0 && isCloudinaryUrl(src)) {
      setRetryCount(1)
      setImageError(false)
      // Force re-render with original URL
      return
    }
    
    setImageError(true)
    setImageLoaded(false)
    onError?.()
  }

  // Fallback for broken images
  if (imageError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={fill ? undefined : { width, height }}
      >
        <svg 
          className={`${preset === 'thumbnail' ? 'w-4 h-4' : 'w-8 h-8'} text-gray-400`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    )
  }

  // Ensure compliance with Next/Image: do not set loading="lazy" when priority is true
  const effectiveLoading: 'lazy' | 'eager' | undefined = priority ? undefined : loading

  const imageProps = {
    ref: imgRef,
    src: optimizedSrc,
    alt,
    className: `transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'} ${className}`,
    onLoad: handleLoad,
    onError: handleError,
    priority,
    ...(effectiveLoading ? { loading: effectiveLoading } : {}),
    // Next/Image supports fetchPriority for better LCP
    ...(typeof fetchPriority !== 'undefined' ? { fetchPriority } : {}),
    sizes: sizes || (fill ? '100vw' : `${width}px`),
    // Only pass Next.js blur placeholder when we have a data URL (required by Next/Image)
    ...((blurPlaceholderUrl && blurPlaceholderUrl.startsWith('data:')) ? { 
      placeholder: 'blur' as const,
      blurDataURL: blurPlaceholderUrl 
    } : {}),
    // We already apply Cloudinary transformations in the URL; bypass Next's image optimizer
    // to avoid proxy timeouts (/_next/image 500s) when offline or under poor connectivity.
    ...(isCloudinaryUrl(src) ? { unoptimized: true } : {}),
    ...(fill ? { fill: true } : { width, height })
  }

  // Wrapper should mirror the intended layout
  // If fill, we must absolutely position to fill the aspect-ratio container
  const wrapperStyle = fill ? undefined : { width, height }
  const wrapperClass = fill ? 'absolute inset-0' : 'relative'

  return (
    <div className={wrapperClass} style={wrapperStyle}>
      <Image {...imageProps} />
      
      {/* Loading state */}
      {showLoadingOverlay && !imageLoaded && !imageError && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse"
        />
      )}
    </div>
  )
}

// Specialized components for different use cases
export const ProductImage: React.FC<Omit<OptimizedImageProps, 'preset'>> = (props) => (
  <OptimizedImage {...props} preset="card" />
)

export const HeroImage: React.FC<Omit<OptimizedImageProps, 'preset'>> = (props) => (
  // Let callers decide priority per-usage (e.g., only the visible slide)
  <OptimizedImage {...props} preset="hero" showLoadingOverlay={false} />
)

export const ThumbnailImage: React.FC<Omit<OptimizedImageProps, 'preset'>> = (props) => (
  <OptimizedImage {...props} preset="thumbnail" showLoadingOverlay={false} />
)
