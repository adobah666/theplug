export const revalidate = 900
import Link from 'next/link'
import Image from 'next/image'
import { headers } from 'next/headers'

async function fetchCategories() {
  try {
    const hdrs = await headers()
    const host = hdrs.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const base = `${protocol}://${host}`
    const res = await fetch(`${base}/api/categories`, { next: { revalidate: 900 } })
    const json = await res.json().catch(() => ({} as any))
    let baseCats: Array<{ slug: string; name: string }> = (json?.data?.categories || []).map((c: any) => ({ slug: c.slug, name: c.name }))

    // Fallback: derive categories from recent products if API returns none
    if (!baseCats || baseCats.length === 0) {
      try {
        const params = new URLSearchParams({ sort: 'createdAt', order: 'desc', page: '1', limit: '200' })
        const prodRes = await fetch(`${base}/api/products/search?${params.toString()}`, { next: { revalidate: 900 } })
        const prodJson = await prodRes.json().catch(() => ({} as any))
        const list: any[] = Array.isArray(prodJson?.data?.data) ? prodJson.data.data : []
        const map = new Map<string, { slug: string; name: string; count: number }>()
        for (const p of list) {
          const cat = p?.category
          const slug = (cat?.slug || '').toString().trim()
          const name = (cat?.name || '').toString().trim()
          if (!slug || !name) continue
          const prev = map.get(slug) || { slug, name, count: 0 }
          prev.count += 1
          map.set(slug, prev)
        }
        baseCats = Array.from(map.values())
          .sort((a, b) => b.count - a.count)
          .map(c => ({ slug: c.slug, name: c.name }))
      } catch {}
    }

    // In parallel, fetch a representative image per category (prefer newest product with an image)
    const withImages = await Promise.all(baseCats.map(async (cat) => {
      try {
        const newestParams = new URLSearchParams({ category: cat.slug, sort: 'createdAt', order: 'desc', page: '1', limit: '6' })
        const newestRes = await fetch(`${base}/api/products/search?${newestParams.toString()}`, { next: { revalidate: 900 } })
        const newestJson = await newestRes.json().catch(() => ({} as any))
        let items: any[] = Array.isArray(newestJson?.data?.data) ? newestJson.data.data : []
        if (!items || items.length === 0) {
          const popParams = new URLSearchParams({ category: cat.slug, sort: 'popularity', order: 'desc', page: '1', limit: '6' })
          const popRes = await fetch(`${base}/api/products/search?${popParams.toString()}`, { next: { revalidate: 900 } })
          const popJson = await popRes.json().catch(() => ({} as any))
          items = Array.isArray(popJson?.data?.data) ? popJson.data.data : []
        }
        const firstWithImage = items.find((p: any) => Array.isArray(p?.images) && p.images.length > 0)
        let image: string = firstWithImage?.images?.[0] || '/icons/icon-144x144.png'
        // Normalize local image paths to start with '/'
        if (image && !image.startsWith('http') && !image.startsWith('/')) {
          image = `/${image}`
        }
        return { ...cat, image }
      } catch {
        return { ...cat, image: '/icons/icon-144x144.png' }
      }
    }))

    // Sort alphabetically by name
    withImages.sort((a, b) => a.name.localeCompare(b.name))
    return withImages
  } catch {
    return []
  }
}

export default async function CategoriesIndexPage() {
  const categories = await fetchCategories()

  if (!categories || categories.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Categories</h1>
        <p className="text-gray-600">No categories available.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
        <div className="text-sm text-gray-500">{categories.length} categories</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/categories/${encodeURIComponent(cat.slug)}`}
            className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200"
          >
            <div className="relative aspect-[4/3]">
              <Image
                src={(cat as any).image || '/icons/icon-144x144.png'}
                alt={cat.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4">
                <h2 className="text-lg font-semibold text-white truncate">{cat.name}</h2>
                <p className="text-xs text-white/80">View products →</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
