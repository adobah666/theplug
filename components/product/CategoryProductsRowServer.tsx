import React from 'react'
import Link from 'next/link'
import { ProductCard } from './ProductCard'

interface CategoryProductsRowServerProps {
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

async function getCategoryProducts(categorySlug: string, limit: number = 20): Promise<RowProduct[]> {
  try {
    const base = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0)
      ? process.env.NEXT_PUBLIC_SITE_URL
      : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const params = new URLSearchParams({ 
      category: categorySlug, 
      sort: 'newest', 
      order: 'desc', 
      page: '1', 
      limit: String(limit) 
    })
    
    const res = await fetch(`${base}/api/products/search?${params.toString()}`, {
      next: { revalidate: 900 } // 15 minutes cache
    })
    
    if (!res.ok) {
      console.error('[CategoryProductsRowServer] Failed to fetch products:', res.status)
      return []
    }

    const data = await res.json()
    const list: any[] = Array.isArray(data?.data?.data) ? data.data.data : []
    
    const mapped: RowProduct[] = list.map((p) => ({
      id: String(p?._id || p?.id || ''),
      name: p?.name || '',
      price: Number(p?.price || 0),
      image: (Array.isArray(p?.images) && p.images[0]) || '/images/placeholder.png',
      rating: p?.rating ?? 0,
      reviewCount: p?.reviewCount ?? 0,
    }))
    
    return mapped
  } catch (e: any) {
    console.error('[CategoryProductsRowServer] Error fetching products:', e?.message || e)
    return []
  }
}

const CategoryProductsRowServer: React.FC<CategoryProductsRowServerProps> = async ({ 
  categorySlug, 
  categoryName, 
  limit = 20 
}) => {
  const products = await getCategoryProducts(categorySlug, limit)

  if (products.length === 0) {
    return null
  }

  return (
    <section className="py-6 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">{categoryName || categorySlug}</h3>
          <Link 
            href={`/search?category=${encodeURIComponent(categorySlug)}&sort=newest`} 
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View All →
          </Link>
        </div>

        <div className="relative group">
          <div 
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4" 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {products.map((p) => (
              <div key={p.id} className="flex-none w-72">
                <ProductCard 
                  product={{ 
                    _id: p.id, 
                    name: p.name, 
                    price: p.price, 
                    images: [p.image], 
                    brand: categoryName || categorySlug, 
                    rating: p.rating || 0, 
                    reviewCount: p.reviewCount || 0, 
                    inventory: 1, 
                    description: `${categoryName || categorySlug} - Latest Item` 
                  }} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export { CategoryProductsRowServer }
