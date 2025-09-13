'use client'

import { useEffect } from 'react'
import { useImagePreloader } from '@/lib/hooks/useImagePreloader'

interface ImagePreloaderProps {
  images: string[]
  priority?: boolean
  maxConcurrent?: number
}

export const ImagePreloader: React.FC<ImagePreloaderProps> = ({
  images,
  priority = false,
  maxConcurrent = 3
}) => {
  useImagePreloader(images, { priority, maxConcurrent })
  return null // This component doesn't render anything
}

// Component for preloading images when they come into viewport
export const LazyImagePreloader: React.FC<ImagePreloaderProps> = ({
  images,
  maxConcurrent = 2
}) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !images.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Preload images when component comes into view
            import('@/lib/utils/images').then(({ preloadImages, getOptimizedImageUrl }) => {
              const optimizedUrls = images.map(url => 
                getOptimizedImageUrl(url, 'card', { width: 600, height: 600 })
              )
              preloadImages(optimizedUrls, maxConcurrent).catch(() => {})
            })
            observer.disconnect()
          }
        })
      },
      { rootMargin: '100px', threshold: 0.1 }
    )

    const element = document.createElement('div')
    element.style.position = 'absolute'
    element.style.top = '0'
    element.style.left = '0'
    element.style.width = '1px'
    element.style.height = '1px'
    element.style.opacity = '0'
    element.style.pointerEvents = 'none'
    
    document.body.appendChild(element)
    observer.observe(element)

    return () => {
      observer.disconnect()
      if (document.body.contains(element)) {
        document.body.removeChild(element)
      }
    }
  }, [images, maxConcurrent])

  return null
}
