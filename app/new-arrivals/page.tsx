export const revalidate = 900
import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'
import { ProductCard } from '@/components/product/ProductCard'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

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

  return (
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
  )
}
