"use client"

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ProductCard } from './ProductCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

interface CategoryProductsRowProps {
  categorySlug: string
  categoryName?: string
  limit?: number
}

interface RowProduct {
  id: string
  name: string
  price: number
  image: string
  rating?: number
  reviewCount?: number
}

export const CategoryProductsRow: React.FC<CategoryProductsRowProps> = ({ categorySlug, categoryName, limit = 20 }) => {
  const [products, setProducts] = useState<RowProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const params = new URLSearchParams({ category: categorySlug, sort: 'newest', order: 'desc', page: '1', limit: String(limit) })
        const res = await fetch(`/api/products/search?${params.toString()}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Failed to load products')
        const list: any[] = Array.isArray(data?.data?.data) ? data.data.data : []
        const mapped: RowProduct[] = list.map((p) => ({
          id: String(p?._id || p?.id || ''),
          name: p?.name || '',
          price: Number(p?.price || 0),
          image: (Array.isArray(p?.images) && p.images[0]) || '/images/placeholder.png',
          rating: p?.rating ?? 0,
          reviewCount: p?.reviewCount ?? 0,
        }))
        setProducts(mapped)
      } catch (e: any) {
        setError(e?.message || 'Failed to load products')
        setProducts([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchProducts()
  }, [categorySlug, limit])

  const updateScrollButtons = () => {
    if (scroller.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scroller.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    updateScrollButtons()
    el.addEventListener('scroll', updateScrollButtons)
    return () => el.removeEventListener('scroll', updateScrollButtons)
  }, [products])

  const scroll = (dir: 'left' | 'right') => {
    if (!scroller.current) return
    const cardWidth = 320
    scroller.current.scrollTo({ left: scroller.current.scrollLeft + (dir === 'left' ? -1 : 1) * cardWidth * 3, behavior: 'smooth' })
  }

  if (error) {
    return (
      <section className="py-6 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <ErrorMessage message={error} />
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="py-6 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">{categoryName || categorySlug}</h3>
            <div className="text-sm text-gray-600">Loading latest items…</div>
          </div>
          <div className="flex justify-center py-6"><LoadingSpinner size="md" /></div>
        </div>
      </section>
    )
  }

  if (products.length === 0) return null

  return (
    <section className="py-6 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{categoryName || categorySlug}</h3>
          <Link href={`/search?category=${encodeURIComponent(categorySlug)}&sort=newest`} className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All →</Link>
        </div>

        <div className="relative group">
          {canScrollLeft && (
            <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" aria-label="Scroll left">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {canScrollRight && (
            <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" aria-label="Scroll right">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          )}

          <div ref={scroller} className="flex gap-4 overflow-x-auto scrollbar-hide pb-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {products.map((p) => (
              <div key={p.id} className="flex-none w-72">
                <ProductCard product={{ _id: p.id, name: p.name, price: p.price, images: [p.image], brand: categoryName || categorySlug, rating: p.rating || 0, reviewCount: p.reviewCount || 0, inventory: 1, description: `${categoryName || categorySlug} - Latest Item` }} />
              </div>
            ))}
          </div>
        </div>

        <style jsx>{`
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
        `}</style>
      </div>
    </section>
  )
}
