import React from 'react'
import Link from 'next/link'
import { ProductCard } from './ProductCard'

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

interface TrendingSectionServerProps {
  excludeIds?: string[]
  title?: string
  subtitle?: string
}

async function getTrendingProducts(excludeIds: string[] = []): Promise<TrendingProduct[]> {
  try {
    const base = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0)
      ? process.env.NEXT_PUBLIC_SITE_URL
      : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const params = new URLSearchParams({
      limit: '20'
    })
    
    if (excludeIds.length > 0) {
      params.append('exclude', excludeIds.join(','))
    }

    const response = await fetch(`${base}/api/trending?${params.toString()}`, {
      next: { revalidate: 900 } // 15 minutes cache
    })
    
    if (!response.ok) {
      console.error('[TrendingSectionServer] Failed to fetch trending products:', response.status)
      return []
    }

    const data = await response.json()

    if (data.success && Array.isArray(data.data)) {
      return data.data
    } else {
      console.warn('[TrendingSectionServer] Invalid response format:', data)
      return []
    }
  } catch (err) {
    console.error('[TrendingSectionServer] Error fetching trending products:', err)
    return []
  }
}

const TrendingSectionServer: React.FC<TrendingSectionServerProps> = async ({
  excludeIds = [],
  title = "Trending Now",
  subtitle = "Discover what's popular with our customers this week"
}) => {
  const products = await getTrendingProducts(excludeIds)

  if (products.length === 0) {
    return null // Don't render section if no products
  }

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
          {/* Products Container */}
          <div
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }}
          >
            {products.map((product) => (
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
            ))}
          </div>
        </div>

        {/* Debug Info (remove in production) */}
        <div className="mt-4 text-xs text-gray-400">
          Showing {products.length} trending products • Excluded {excludeIds.length} items
        </div>
      </div>
    </section>
  )
}

export { TrendingSectionServer }
