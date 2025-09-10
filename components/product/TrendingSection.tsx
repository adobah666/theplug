'use client'

import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { ProductCard } from './ProductCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

interface TrendingProduct {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  categorySlug: string
  rating?: number
  reviewCount?: number
  isNew?: boolean
  isOnSale?: boolean
  popularityScore: number
  purchaseCount: number
  addToCartCount: number
  viewCount: number
}

interface TrendingSectionProps {
  excludeIds?: string[]
  title?: string
  subtitle?: string
}

const TrendingSection: React.FC<TrendingSectionProps> = ({
  excludeIds = [],
  title = "Trending Now",
  subtitle = "Discover what's popular with our customers this week"
}) => {
  const [products, setProducts] = useState<TrendingProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  console.log('[TrendingSection] Component mounted with excludeIds:', excludeIds)

  useEffect(() => {
    fetchTrendingProducts()
  }, [excludeIds])

  const fetchTrendingProducts = async () => {
    try {
      console.log('[TrendingSection] Fetching trending products, excluding:', excludeIds)
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams({
        limit: '20'
      })
      
      if (excludeIds.length > 0) {
        params.append('exclude', excludeIds.join(','))
      }

      const response = await fetch(`/api/trending?${params.toString()}`)
      const data = await response.json()

      console.log('[TrendingSection] API response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch trending products')
      }

      if (data.success && Array.isArray(data.data)) {
        console.log('[TrendingSection] Setting products:', data.data.length, 'items')
        setProducts(data.data)
      } else {
        console.warn('[TrendingSection] Invalid response format:', data)
        setProducts([])
      }
    } catch (err) {
      console.error('[TrendingSection] Error fetching trending products:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trending products')
      setProducts([])
    } finally {
      setIsLoading(false)
    }
  }

  const updateScrollButtons = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      updateScrollButtons()
      container.addEventListener('scroll', updateScrollButtons)
      return () => container.removeEventListener('scroll', updateScrollButtons)
    }
  }, [products])

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 320 // Width of one product card + gap
      const newScrollLeft = direction === 'left' 
        ? scrollContainerRef.current.scrollLeft - scrollAmount * 3
        : scrollContainerRef.current.scrollLeft + scrollAmount * 3

      console.log('[TrendingSection] Scrolling', direction, 'by', scrollAmount * 3, 'pixels')

      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  if (error) {
    return (
      <section className="py-8 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4">
          <ErrorMessage message={error} />
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="py-8 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-left mb-6">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 text-gray-600">
              {subtitle}
            </p>
          </div>
          <div className="flex justify-center py-8">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </section>
    )
  }

  if (products.length === 0) {
    console.log('[TrendingSection] No products to display')
    return null // Don't render section if no products
  }

  console.log('[TrendingSection] Rendering', products.length, 'trending products')

  return (
    <section className="py-8 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {title}
            </h2>
            <p className="mt-2 text-gray-600">
              {subtitle}
            </p>
          </div>
          <Link 
            href="/search?sort=popularity" 
            className="text-blue-600 hover:text-blue-700 font-medium text-sm"
          >
            View All →
          </Link>
        </div>

        {/* Horizontal Scrolling Container */}
        <div className="relative group">
          {/* Left Scroll Button */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label="Scroll left"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Right Scroll Button */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              aria-label="Scroll right"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Products Container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {products.map((product, index) => {
              console.log('[TrendingSection] Rendering product:', product.name, 'at index:', index)
              return (
                <div 
                  key={product.id}
                  className="flex-none w-72"
                >
                  <ProductCard
                    product={{
                      _id: product.id,
                      name: product.name,
                      price: product.price,
                      images: [product.image],
                      brand: product.category,
                      rating: product.rating || 0,
                      reviewCount: product.reviewCount || 0,
                      inventory: 1,
                      description: `${product.category} - Trending Item`
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Debug Info (remove in production) */}
        <div className="mt-4 text-xs text-gray-400">
          Showing {products.length} trending products • Excluded {excludeIds.length} items
        </div>
      </div>

      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}

export { TrendingSection }
