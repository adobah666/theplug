'use client'

import React from 'react'
import { usePWA } from '@/lib/pwa/context'

const OfflineIndicator: React.FC = () => {
  const { isOnline, showOfflineToast, dismissOfflineToast } = usePWA()

  if (isOnline || !showOfflineToast) {
    return null
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm font-medium">
            You're offline. Some features may be limited.
          </span>
        </div>
        
        <button
          onClick={dismissOfflineToast}
          className="text-white hover:text-yellow-200 transition-colors"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export { OfflineIndicator }