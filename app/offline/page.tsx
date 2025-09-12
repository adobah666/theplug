import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="mx-auto w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-8">
          <svg 
            className="w-12 h-12 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" 
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          You're Offline
        </h1>

        {/* Description */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          It looks like you've lost your internet connection. Don't worry - you can still browse 
          some of our cached content or try again when you're back online.
        </p>

        {/* Actions */}
        <div className="space-y-4">
          <Button className="w-full">
            <Link href=".">Try Again</Link>
          </Button>
          
          <Button variant="outline" className="w-full">
            <Link href="/">Go to Homepage</Link>
          </Button>
        </div>

        {/* Cached Content */}
        <div className="mt-12 p-6 bg-white rounded-lg shadow-sm border">
          <h3 className="font-semibold text-gray-900 mb-4">
            Available Offline
          </h3>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>Recently viewed products</span>
              <span className="text-green-600">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Shopping cart</span>
              <span className="text-green-600">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Account information</span>
              <span className="text-green-600">✓</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Order history</span>
              <span className="text-yellow-600">~</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            ✓ Available offline • ~ Limited offline access
          </p>
        </div>

        {/* Tips */}
        <div className="mt-8 text-left">
          <h4 className="font-medium text-gray-900 mb-3">
            While you're offline:
          </h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Your cart items are saved locally
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              You can browse cached product pages
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">•</span>
              Changes will sync when you're back online
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: 'Offline - ThePlug',
  description: 'You are currently offline. Some features may be limited.',
}