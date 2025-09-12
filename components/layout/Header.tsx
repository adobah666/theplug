'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/product/SearchBar'
import { CartIcon } from '@/components/cart/CartIcon'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer'
import { useCart } from '@/lib/cart'
import { useAuthUser } from '@/lib/auth/hooks'

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)
  
  const { state, updateQuantity, removeItem } = useCart()
  const { user, logout } = useAuthUser()
  const [openOrdersCount, setOpenOrdersCount] = useState<number>(0)

  const [categories, setCategories] = useState<Array<{ name: string; slug: string }>>([])
  const [brands, setBrands] = useState<Array<{ name: string; slug?: string }>>([])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/categories', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) return
        const list = (json?.data?.categories || []) as Array<{ name: string; slug: string }>
        // sort by name ASC
        list.sort((a, b) => a.name.localeCompare(b.name))
        if (mounted) setCategories(list)
      } catch {
        // ignore
      }
    })()
    ;(async () => {
      try {
        const res = await fetch('/api/brands', { cache: 'no-store' })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) return
        const list = (json?.brands || []) as Array<{ name: string; slug?: string }>
        // Keep API order (already sorted by popularity via productCount desc)
        if (mounted) setBrands(list)
      } catch {
        // ignore
      }
    })()
    // Fetch unfinished orders count for logged-in user
    ;(async () => {
      try {
        if (!user) {
          if (mounted) setOpenOrdersCount(0)
          return
        }
        const uid = (user as any)?.id || (user as any)?._id
        if (!uid) return
        const res = await fetch(`/api/orders/user/${uid}?limit=100`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json().catch(() => ({} as any))
        const list = Array.isArray(json?.orders) ? json.orders : []
        const count = list.filter((o: any) => {
          const st = String(o?.status || '').toLowerCase()
          return st === 'confirmed' || st === 'processing'
        }).length
        if (mounted) setOpenOrdersCount(count)
      } catch {
        // ignore errors
      }
    })()
    return () => { mounted = false }
  }, [user])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      
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
              <div className="hidden md:flex items-center space-x-3">
                <Link href="/account" className="flex items-center space-x-1 text-gray-700 hover:text-gray-900">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs text-blue-600 font-medium">
                      {(user.firstName || user.name || '').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm">{user.firstName || user.name}</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="text-sm text-gray-700 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
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

            {/* Orders with badge */}
            <Link href="/account/orders" className="hidden md:flex items-center space-x-2 text-gray-700 hover:text-gray-900 relative">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
              </svg>
              <span className="text-sm">Orders</span>
              {openOrdersCount > 0 && (
                <span className="absolute -top-2 -right-2 rounded-full bg-blue-600 text-white text-[10px] leading-none px-1.5 py-1">
                  {openOrdersCount}
                </span>
              )}
            </Link>

            {/* Cart (icon only on mobile) */}
            <div className="md:hidden w-12 flex flex-col items-center justify-center">
              <CartIcon 
                itemCount={state.itemCount}
                onClick={() => setIsCartOpen(true)}
              />
            </div>
            <div className="hidden md:block">
              <CartIcon 
                itemCount={state.itemCount}
                onClick={() => setIsCartOpen(true)}
              />
            </div>

            {/* Orders icon (mobile) */}
            <Link
              href="/account/orders"
              className="relative md:hidden w-12 px-0 py-1 text-gray-700 hover:text-gray-900 flex flex-col items-center justify-center"
              aria-label="Orders"
            >
              {/* Package icon */}
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 7.5l-9 4.5-9-4.5m18 0L12 3 3 7.5m18 0V16.5L12 21l-9-4.5V7.5m9 4.5V21" />
              </svg>
              <span className="mt-0.5 text-[10px] leading-none">My Orders</span>
              {openOrdersCount > 0 && (
                <span className="absolute top-0 right-0 translate-x-1/4 -translate-y-1/4 rounded-full bg-blue-600 text-white text-[10px] leading-none px-1.5 py-0.5">
                  {openOrdersCount}
                </span>
              )}
            </Link>

            {/* Mobile menu button (icon only) */}
            <div className="md:hidden w-12 flex flex-col items-center justify-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-gray-700 hover:text-gray-900"
                aria-label="Menu"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
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
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.slug}
                  href={`/categories/${category.slug}`}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  {category.name}
                </Link>
              ))}
              {categories.length > 6 && (
                <Link href="/categories" className="text-sm font-medium text-gray-700 hover:text-blue-600">
                  All Categories
                </Link>
              )}
            </div>

            {/* Brands - Desktop */}
            <div className="hidden md:flex items-center space-x-6">
              {brands.slice(0, 3).map((brand) => (
                <Link
                  key={brand.slug || brand.name}
                  href={`/brands/${brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-sm text-gray-600 hover:text-blue-600"
                >
                  {brand.name}
                </Link>
              ))}
              <Link href="/brands" className="text-sm font-medium text-gray-700 hover:text-blue-600">All Brands</Link>
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