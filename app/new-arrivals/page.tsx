export const revalidate = 900

import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'
import { Metadata } from 'next'
import { ProductCard } from '@/components/product/ProductCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

export const metadata: Metadata = {
  title: 'New Arrivals - Latest Fashion Trends | ThePlug',
  description: 'Discover the newest fashion arrivals at ThePlug. Shop the latest trends in clothing, shoes, and accessories for men, women, and kids. Updated daily with fresh styles.',
  keywords: 'new arrivals, latest fashion, new products, trending styles, fresh arrivals, ThePlug, Ghana fashion',
  openGraph: {
    title: 'New Arrivals - Latest Fashion Trends | ThePlug',
    description: 'Discover the newest fashion arrivals at ThePlug. Shop the latest trends in clothing, shoes, and accessories.',
    type: 'website',
    locale: 'en_GH',
    siteName: 'ThePlug',
    images: [
      {
        url: '/og-new-arrivals.jpg',
        width: 1200,
        height: 630,
        alt: 'New Arrivals at ThePlug',
      },
    ],
    url: '/new-arrivals',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'New Arrivals - Latest Fashion Trends | ThePlug',
    description: 'Discover the newest fashion arrivals at ThePlug. Shop the latest trends in clothing, shoes, and accessories.',
    images: ['/og-new-arrivals.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/new-arrivals',
  },
}

async function fetchNewArrivals(page: number, limit: number) {
  try {
    const hdrs = await headers()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const base = `${protocol}://${host}`
    const params = new URLSearchParams({ sort: 'createdAt', order: 'desc', page: String(page), limit: String(limit) })
    const res = await fetch(`${base}/api/products/search?${params.toString()}`, { next: { revalidate: 900 } })
    const json = await res.json().catch(() => ({} as any))

    const data = Array.isArray(json?.data?.data) ? json.data.data : []
    const total = Number(json?.data?.total || 0)

    return { items: data, total }
  } catch {
    return { items: [], total: 0 }
  }
}

function getPage(searchParams: { [key: string]: string | string[] | undefined }): number {
  const p = Array.isArray(searchParams?.page) ? searchParams.page[0] : searchParams?.page
  const n = Number(p)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
}

export default async function NewArrivalsPage({ searchParams }: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const sp = (searchParams ? await searchParams : {}) as { [key: string]: string | string[] | undefined }
  const page = getPage(sp)
  const limit = 30

  const { items, total } = await fetchNewArrivals(page, limit)
  const displayTotal = total && total > 0 ? total : items.length
  const totalPages = total && total > 0 ? Math.max(1, Math.ceil(total / limit)) : Math.max(1, Math.ceil(displayTotal / limit))

  // Get base URL for structured data
  const hdrs = await headers()
  const host = hdrs.get('host') || 'localhost:3000'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  // Generate structured data for new arrivals page
  const newArrivalsStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "New Arrivals",
    "description": "Latest fashion arrivals at ThePlug",
    "url": `${baseUrl}/new-arrivals`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": displayTotal,
      "itemListElement": items.slice(0, 10).map((product: any, index: number) => ({
        "@type": "Product",
        "position": index + 1,
        "name": product.name,
        "description": product.description,
        "image": Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '/images/placeholder.png',
        "offers": {
          "@type": "Offer",
          "price": product.price,
          "priceCurrency": "GHS",
          "availability": (product.inventory ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
        }
      }))
    }
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "New Arrivals",
        "item": `${baseUrl}/new-arrivals`
      }
    ]
  };

  return (
    <>
      {/* Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newArrivalsStructuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-10">
      <Breadcrumb
        items={[{ label: 'Home', href: '/' }, { label: 'New Arrivals' }]}
        className="mb-6"
      />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Arrivals</h1>
        <div className="text-sm text-gray-600">{displayTotal.toLocaleString()} items</div>
      </div>

      {items.length === 0 ? (
        <div className="py-20 text-center text-gray-600">No products found.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((p: any) => (
            <ProductCard
              key={String(p?._id || p?.id)}
              product={{
                _id: String(p?._id || p?.id || ''),
                name: p?.name || '',
                price: Number(p?.price || 0),
                images: Array.isArray(p?.images) && p.images.length > 0 ? p.images : ['/images/placeholder.png'],
                brand: (p as any)?.brand || '',
                rating: p?.rating ?? 0,
                reviewCount: p?.reviewCount ?? 0,
                inventory: p?.inventory ?? 0,
                description: p?.description || ''
              }}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Link
            href={`/new-arrivals?page=${Math.max(1, page - 1)}`}
            className={`px-4 py-2 rounded-md border text-sm ${page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
            aria-disabled={page <= 1}
          >
            Previous
          </Link>
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>
          <Link
            href={`/new-arrivals?page=${Math.min(totalPages, page + 1)}`}
            className={`px-4 py-2 rounded-md border text-sm ${page >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
            aria-disabled={page >= totalPages}
          >
            Next
          </Link>
        </div>
      )}
    </div>
    </>
  )
}
