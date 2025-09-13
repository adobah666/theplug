'use client'

import React, { useEffect, useRef, useState } from 'react'
import { ProductCard } from './ProductCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface Item {
  _id: string
  name: string
  price: number
  images: string[]
  brand?: string
  rating?: number
  reviewCount?: number
}

interface RelatedCarouselProps {
  productId: string
  category: string
  title?: string
  subtitle?: string
  limit?: number
  className?: string
  serverItems?: Item[]
}

export function RelatedCarousel({
  productId,
  category,
  title = 'Related Products',
  subtitle = 'Customers also viewed these items',
  limit = 16,
  className = '',
  serverItems
}: RelatedCarouselProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    // If server-provided items are available, use them and skip fetching
    if (serverItems && serverItems.length > 0) {
      setItems(serverItems.slice(0, limit))
      setLoading(false)
      setError(null)
      return
    }
    let ignore = false
    const fetchRelated = async () => {
      try {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams()
        params.set('category', category)
        params.set('limit', String(limit * 2))
        params.set('sort', 'popularity')
        const res = await fetch(`/api/products/search?${params.toString()}`, { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || 'Failed to fetch related items')
        const list: Item[] = Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data?.data?.data)
            ? data.data.data
            : Array.isArray(data?.data)
              ? data.data
              : []
        const filtered = list
          .filter((p: any) => p && (p._id || p.id) && String(p._id || p.id) !== String(productId))
          .filter((p: any) => (typeof p.inventory === 'number' ? p.inventory : 0) > 0)
        if (!ignore) setItems(filtered.slice(0, limit))
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Failed to load related items')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    if (productId && category) fetchRelated()
    return () => { ignore = true }
  }, [productId, category, limit])

  const updateButtons = () => {
    const el = scrollRef.current
    if (!el) return
    setCanLeft(el.scrollLeft > 0)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateButtons()
    el.addEventListener('scroll', updateButtons)
    return () => el.removeEventListener('scroll', updateButtons)
  }, [items])

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const cardW = 320
    el.scrollTo({ left: el.scrollLeft + (dir === 'left' ? -1 : 1) * cardW * 3, behavior: 'smooth' })
  }

  if (error) {
    return (
      <section className={`py-8 ${className}`}>
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </section>
    )
  }
  if (loading) {
    return (
      <section className={`py-8 ${className}`}>
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-left mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="mt-2 text-gray-600">{subtitle}</p>
          </div>
          <div className="flex justify-center py-8"><LoadingSpinner size="lg" /></div>
        </div>
      </section>
    )
  }
  if (items.length === 0) return null

  return (
    <section className={`py-8 ${className}`}>
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            <p className="mt-1 text-gray-600">{subtitle}</p>
          </div>
        </div>

        <div className="relative group">
          {canLeft && (
            <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
          )}
          {canRight && (
            <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {items.map((p) => (
              <div key={p._id} className="flex-none w-72">
                <ProductCard product={p as any} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  )
}
