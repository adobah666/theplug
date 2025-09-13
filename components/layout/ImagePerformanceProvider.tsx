'use client'

import { useEffect } from 'react'
import { initializeImagePerformanceMonitoring } from '@/lib/utils/performance'

export const ImagePerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    // Initialize image performance monitoring
    const monitor = initializeImagePerformanceMonitoring()
    
    return () => {
      monitor?.destroy()
    }
  }, [])

  return <>{children}</>
}
