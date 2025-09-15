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
 
interface YouMayAlsoLikeProps {
  productId: string
  category: string
  brand?: string
  limit?: number
  className?: string
  serverItems?: Item[]
}

export function YouMayAlsoLike({ productId, category, brand, limit = 16, className = '', serverItems }: YouMayAlsoLikeProps) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  useEffect(() => {
    let ignore = false
    // If server-provided items are available, use them and skip fetching
    if (serverItems && serverItems.length > 0) {
      setItems(serverItems.slice(0, limit))
      setLoading(false)
      setError(null)
      return () => { /* noop */ }
    }

    const fetchLayer = async (qs: URLSearchParams) => {
      const res = await fetch(`/api/products/search?${qs.toString()}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({} as any))
      if (!res.ok) throw new Error(data?.error || 'Search failed')
      const list: Item[] = Array.isArray(data?.products)
        ? data.products
        : Array.isArray(data?.data?.data)
          ? data.data.data
          : Array.isArray(data?.data)
            ? data.data
            : []
      return list
    }

    const fetchAll = async () => {
      try {
        setLoading(true)
        setError(null)

        const seen = new Set<string>([productId])
        const result: Item[] = []

        // 1) Same category AND brand
        if (category && brand) {
          const qs = new URLSearchParams()
          qs.set('category', category)
          qs.set('brand', brand)
          qs.set('limit', String(limit * 2))
          qs.set('sort', 'popularity')
          const list = await fetchLayer(qs)
          for (const p of list) {
            if (!seen.has(p._id)) { seen.add(p._id); result.push(p) }
            if (result.length >= limit) break
          }
        }

        // 2) Same category only
        if (result.length < limit && category) {
          const qs = new URLSearchParams()
          qs.set('category', category)
          qs.set('limit', String(limit * 2))
          qs.set('sort', 'popularity')
          const list = await fetchLayer(qs)
          for (const p of list) {
            if (!seen.has(p._id)) { seen.add(p._id); result.push(p) }
            if (result.length >= limit) break
          }
        }

        // 3) Same brand only
        if (result.length < limit && brand) {
          const qs = new URLSearchParams()
          qs.set('brand', brand)
          qs.set('limit', String(limit * 2))
          qs.set('sort', 'popularity')
          const list = await fetchLayer(qs)
          for (const p of list) {
            if (!seen.has(p._id)) { seen.add(p._id); result.push(p) }
            if (result.length >= limit) break
          }
        }

        // 4) Fallback to trending
        if (result.length < limit) {
          try {
            const res = await fetch(`/api/trending?limit=${limit * 2}`)
            const data = await res.json().catch(() => ({} as any))
            if (res.ok && Array.isArray(data?.data)) {
              for (const t of data.data as any[]) {
                const id = t.id || t._id
                const mapped: Item = {
                  _id: id,
                  name: t.name,
                  price: t.price,
                  images: Array.isArray(t.images) ? t.images : (t.image ? [t.image] : []),
                  brand: t.brand || t.category,
                  rating: t.rating,
                  reviewCount: t.reviewCount,
                }
                if (!seen.has(mapped._id)) { seen.add(mapped._id); result.push(mapped) }
                if (result.length >= limit) break
              }
            }
          } catch {}
        }

        // Filter out out-of-stock items
        const inStock = result.filter((p: any) => (typeof p.inventory === 'number' ? p.inventory : 0) > 0)
        if (!ignore) setItems(inStock.slice(0, limit))
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Failed to load suggestions')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    fetchAll()
    return () => { ignore = true }
  }, [productId, category, brand, limit, serverItems])

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
            <h2 className="text-2xl font-bold text-gray-900">You May Also Like</h2>
            <p className="mt-1 text-gray-600">Hand-picked suggestions based on this item</p>
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
            <h2 className="text-2xl font-bold text-gray-900">You May Also Like</h2>
            <p className="mt-1 text-gray-600">Similar items by category and brand</p>
          </div>
        </div>

        <div className="relative group">

          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory -mx-4 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {items.map((p) => (
              <div key={p._id} className="flex-none w-[76vw] sm:w-72 snap-start">
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
