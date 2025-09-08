'use client'

import React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/lib/auth/hooks'

interface MobileNavDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const MobileNavDrawer: React.FC<MobileNavDrawerProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth()

  const categories = [
    { name: 'Clothing', href: '/categories/clothing', icon: '👕' },
    { name: 'Shoes', href: '/categories/shoes', icon: '👟' },
    { name: 'Accessories', href: '/categories/accessories', icon: '👜' },
  ]

  const quickLinks = [
    { name: 'New Arrivals', href: '/new-arrivals' },
    { name: 'Sale', href: '/sale' },
    { name: 'Brands', href: '/brands' },
  ]

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <Link href="/" className="flex items-center space-x-2" onClick={onClose}>
              <div className="h-8 w-8 rounded-full bg-blue-600"></div>
              <span className="text-xl font-bold text-gray-900">ThePlug</span>
            </Link>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {/* User section */}
            {user ? (
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-blue-600 font-medium">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 border-b border-gray-200 space-y-2">
                <Button className="w-full" onClick={onClose}>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button variant="outline" className="w-full" onClick={onClose}>
                  <Link href="/register">Create Account</Link>
                </Button>
              </div>
            )}

            {/* Categories */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Shop by Category</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <Link
                    key={category.name}
                    href={category.href}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={onClose}
                  >
                    <span className="text-2xl">{category.icon}</span>
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <svg className="h-5 w-5 text-gray-400 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Links</h3>
              <div className="space-y-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    onClick={onClose}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Account Links */}
            {user && (
              <div className="p-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">My Account</h3>
                <div className="space-y-2">
                  <Link
                    href="/account"
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    onClick={onClose}
                  >
                    Profile & Settings
                  </Link>
                  <Link
                    href="/account/orders"
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    onClick={onClose}
                  >
                    Order History
                  </Link>
                  <Link
                    href="/account/wishlist"
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                    onClick={onClose}
                  >
                    Wishlist
                  </Link>
                </div>
              </div>
            )}

            {/* Help & Support */}
            <div className="p-4 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Help & Support</h3>
              <div className="space-y-2">
                <Link
                  href="/help"
                  className="block p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                  onClick={onClose}
                >
                  Help Center
                </Link>
                <Link
                  href="/contact"
                  className="block p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                  onClick={onClose}
                >
                  Contact Us
                </Link>
                <Link
                  href="/track-order"
                  className="block p-3 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                  onClick={onClose}
                >
                  Track Order
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          {user && (
            <div className="p-4 border-t border-gray-200">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  logout()
                  onClose()
                }}
              >
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export { MobileNavDrawer }