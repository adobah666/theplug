// Performance monitoring utilities for image loading
export class ImagePerformanceMonitor {
  private static instance: ImagePerformanceMonitor
  private metrics: Map<string, number> = new Map()
  private observers: PerformanceObserver[] = []

  static getInstance(): ImagePerformanceMonitor {
    if (!ImagePerformanceMonitor.instance) {
      ImagePerformanceMonitor.instance = new ImagePerformanceMonitor()
    }
    return ImagePerformanceMonitor.instance
  }

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.initializeObservers()
    }
  }

  private initializeObservers() {
    // Monitor resource loading times
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.name.includes('res.cloudinary.com') || entry.name.includes('/images/')) {
          const resourceEntry = entry as PerformanceResourceTiming
          const loadTime = resourceEntry.responseEnd - resourceEntry.startTime
          this.metrics.set(entry.name, loadTime)
          
          // Log slow images in development
          if (process.env.NODE_ENV === 'development' && loadTime > 1000) {
            console.warn(`Slow image load: ${entry.name} took ${loadTime.toFixed(2)}ms`)
          }
        }
      })
    })

    resourceObserver.observe({ entryTypes: ['resource'] })
    this.observers.push(resourceObserver)

    // Monitor largest contentful paint
    const lcpObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        const lcpEntry = entry as any // LCP entries have different structure
        if (lcpEntry.element?.tagName === 'IMG') {
          console.log(`LCP Image: ${lcpEntry.url || 'unknown'} - ${entry.startTime.toFixed(2)}ms`)
        }
      })
    })

    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    this.observers.push(lcpObserver)
  }

  getImageLoadTime(url: string): number | undefined {
    return this.metrics.get(url)
  }

  getAverageLoadTime(): number {
    const times = Array.from(this.metrics.values())
    return times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0
  }

  getSlowestImages(count: number = 5): Array<{ url: string; time: number }> {
    return Array.from(this.metrics.entries())
      .map(([url, time]) => ({ url, time }))
      .sort((a, b) => b.time - a.time)
      .slice(0, count)
  }

  clearMetrics() {
    this.metrics.clear()
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Utility to measure Core Web Vitals related to images
export function measureImageCoreWebVitals() {
  if (typeof window === 'undefined') return

  // Measure Cumulative Layout Shift caused by images
  let clsValue = 0
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        clsValue += (entry as any).value
      }
    }
  })
  clsObserver.observe({ entryTypes: ['layout-shift'] })

  // Report CLS after 5 seconds
  setTimeout(() => {
    console.log(`Cumulative Layout Shift: ${clsValue.toFixed(4)}`)
    clsObserver.disconnect()
  }, 5000)
}

// Preload critical resources
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return

  // Preload common image formats
  const formats = ['webp', 'avif']
  formats.forEach(format => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.type = `image/${format}`
    link.href = `data:image/${format};base64,`
    document.head.appendChild(link)
  })
}

// Initialize performance monitoring
export function initializeImagePerformanceMonitoring() {
  if (typeof window === 'undefined') return

  const monitor = ImagePerformanceMonitor.getInstance()
  measureImageCoreWebVitals()
  preloadCriticalResources()

  // Report performance metrics in development
  if (process.env.NODE_ENV === 'development') {
    setTimeout(() => {
      const avgTime = monitor.getAverageLoadTime()
      const slowest = monitor.getSlowestImages(3)
      
      console.group('🖼️ Image Performance Report')
      console.log(`Average load time: ${avgTime.toFixed(2)}ms`)
      console.log('Slowest images:', slowest)
      console.groupEnd()
    }, 10000)
  }

  return monitor
}
