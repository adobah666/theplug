'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/product/SearchBar'
import { CartIcon } from '@/components/cart/CartIcon'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer'
import { useCart } from '@/lib/cart'
import { useAuth } from '@/lib/auth/hooks'

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  
  const { state, updateQuantity, removeItem } = useCart()
  const { user } = useAuth()

  const categories = [
    { name: 'Clothing', href: '/category/clothing' },
    { name: 'Shoes', href: '/category/shoes' },
    { name: 'Accessories', href: '/category/accessories' },
  ]

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      {/* Top bar */}
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-2">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Free shipping on orders over $50</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/help" className="text-gray-600 hover:text-gray-900">
              Help
            </Link>
            <Link href="/track-order" className="text-gray-600 hover:text-gray-900">
              Track Order
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-full bg-blue-600"></div>
            <span className="text-xl font-bold text-gray-900">ThePlug</span>
          </Link>

          {/* Search bar - Desktop */}
          <div className="hidden flex-1 max-w-lg mx-8 md:block">
            <SearchBar />
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Account */}
            {user ? (
              <Link href="/account" className="hidden md:flex items-center space-x-1 text-gray-700 hover:text-gray-900">
                <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-xs text-blue-600 font-medium">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm">{user.name}</span>
              </Link>
            ) : (
              <Link href="/login" className="hidden md:flex items-center space-x-1 text-gray-700 hover:text-gray-900">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm">Sign In</span>
              </Link>
            )}

            {/* Wishlist */}
            <Link href="/account/wishlist" className="hidden md:flex items-center space-x-1 text-gray-700 hover:text-gray-900">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="text-sm">Wishlist</span>
            </Link>

            {/* Cart */}
            <CartIcon 
              itemCount={state.itemCount}
              onClick={() => setIsCartOpen(true)}
            />

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-gray-900"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="mt-4 md:hidden">
          <SearchBar />
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between py-3">
            {/* Categories - Desktop */}
            <div className="hidden md:flex items-center space-x-8">
              {categories.map((category) => (
                <Link
                  key={category.name}
                  href={category.href}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  {category.name}
                </Link>
              ))}
            </div>

            {/* Auth buttons - Desktop */}
            {!user && (
              <div className="hidden md:flex items-center space-x-4">
                <Button variant="ghost" size="sm">
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button size="sm">
                  <Link href="/register">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>


        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
      />

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={state.items}
        subtotal={state.subtotal}
        itemCount={state.itemCount}
        isLoading={state.isLoading}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onCheckout={() => {
          setIsCartOpen(false)
          // Navigate to checkout page
          window.location.href = '/checkout'
        }}
        updatingItems={state.updatingItems}
        removingItems={state.removingItems}
      />
    </header>
  )
}

export { Header }