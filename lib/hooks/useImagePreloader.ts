'use client'

import { useEffect, useCallback } from 'react'
import { preloadImages, getOptimizedImageUrl } from '@/lib/utils/images'

interface UseImagePreloaderOptions {
  enabled?: boolean
  maxConcurrent?: number
  priority?: boolean
}

export function useImagePreloader(
  images: string[], 
  options: UseImagePreloaderOptions = {}
) {
  const { enabled = true, maxConcurrent = 3, priority = false } = options

  const preloadImageList = useCallback(async () => {
    if (!enabled || !images.length) return

    // Optimize images for preloading
    const optimizedUrls = images.map(url => 
      getOptimizedImageUrl(url, 'card', { width: 400, height: 400 })
    )

    try {
      await preloadImages(optimizedUrls, maxConcurrent)
    } catch (error) {
      console.warn('Image preloading failed:', error)
    }
  }, [images, enabled, maxConcurrent])

  useEffect(() => {
    if (priority) {
      // Preload immediately for priority images
      preloadImageList()
    } else {
      // Delay preloading for non-priority images to avoid blocking critical resources
      const timeoutId = setTimeout(preloadImageList, 100)
      return () => clearTimeout(timeoutId)
    }
  }, [preloadImageList, priority])

  return { preloadImageList }
}

// Hook for preloading images on hover
export function useHoverPreloader() {
  const preloadOnHover = useCallback((imageUrls: string[]) => {
    const optimizedUrls = imageUrls.map(url => 
      getOptimizedImageUrl(url, 'card', { width: 800, height: 800 })
    )
    
    // Preload with lower priority
    setTimeout(() => {
      preloadImages(optimizedUrls, 2).catch(() => {})
    }, 50)
  }, [])

  return { preloadOnHover }
}

// Hook for intersection observer based preloading
export function useIntersectionPreloader(
  images: string[],
  options: IntersectionObserverInit = {}
) {
  const defaultOptions = {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  }

  useEffect(() => {
    if (!images.length || typeof window === 'undefined') return

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const optimizedUrls = images.map(url => 
            getOptimizedImageUrl(url, 'card', { width: 600, height: 600 })
          )
          preloadImages(optimizedUrls, 2).catch(() => {})
          observer.disconnect()
        }
      })
    }, defaultOptions)

    // Create a dummy element to observe
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
  }, [images, defaultOptions])
}
