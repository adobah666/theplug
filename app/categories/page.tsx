import Link from 'next/link'
import Image from 'next/image'

async function fetchCategories() {
  try {
    const base = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0)
      ? process.env.NEXT_PUBLIC_SITE_URL
      : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const res = await fetch(`${base}/api/categories`, { cache: 'no-store', next: { revalidate: 0 } })
    const json = await res.json().catch(() => ({} as any))
    const baseCats: Array<{ slug: string; name: string }> = (json?.data?.categories || []).map((c: any) => ({ slug: c.slug, name: c.name }))

    // In parallel, fetch a representative image per category (prefer newest product with an image)
    const withImages = await Promise.all(baseCats.map(async (cat) => {
      try {
        const newestParams = new URLSearchParams({ category: cat.slug, sort: 'newest', order: 'desc', page: '1', limit: '6' })
        const newestRes = await fetch(`${base}/api/products/search?${newestParams.toString()}`, { cache: 'no-store', next: { revalidate: 0 } })
        const newestJson = await newestRes.json().catch(() => ({} as any))
        let items: any[] = Array.isArray(newestJson?.data?.data) ? newestJson.data.data : []
        if (!items || items.length === 0) {
          const popParams = new URLSearchParams({ category: cat.slug, sort: 'popularity', order: 'desc', page: '1', limit: '6' })
          const popRes = await fetch(`${base}/api/products/search?${popParams.toString()}`, { cache: 'no-store', next: { revalidate: 0 } })
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
