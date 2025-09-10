import { Suspense } from 'react'
import { Hero } from '@/components/layout/Hero'
import { FeaturedProducts } from '@/components/product/FeaturedProducts'
import { CategoryShowcase } from '@/components/layout/CategoryShowcase'
import { PromotionalBanner } from '@/components/layout/PromotionalBanner'
import { Newsletter } from '@/components/layout/Newsletter'
import { Testimonials } from '@/components/layout/Testimonials'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

// Build dynamic trending list: pick the top product per category (by popularity), then
// take the overall top 5 across categories (ensures one per category).
async function getFeaturedProducts() {
  try {
    // 1) Get active categories (already filtered to those with products)
    const base = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0)
      ? process.env.NEXT_PUBLIC_SITE_URL
      : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
    const catRes = await fetch(`${base}/api/categories`, { cache: 'no-store', next: { revalidate: 0 } })
    if (!catRes.ok) {
      console.error('[home:getFeatured] /api/categories HTTP', catRes.status, catRes.statusText)
    }
    const catJson = await catRes.json().catch((e) => { console.error('[home:getFeatured] categories.json error', e); return {} as any })
    const catList: Array<{ slug: string; name: string }> = (catJson?.data?.categories || []).map((c: any) => ({ slug: c.slug, name: c.name }))
    console.log('[home:getFeatured] categories count=', catList.length, 'slugs=', catList.map(c => c.slug))

    // If we don't have any categories (e.g., categories not populated), fallback to overall popularity unique-by-category
    if (!catList || catList.length === 0) {
      const p = new URLSearchParams({ sort: 'popularity', order: 'desc', page: '1', limit: '50' })
      const r = await fetch(`${base}/api/products/search?${p.toString()}`, { cache: 'no-store', next: { revalidate: 0 } })
      const j = await r.json().catch(() => ({} as any))
      const list: any[] = Array.isArray(j?.data?.data) ? j.data.data : []
      const seen = new Set<string>()
      const picked = [] as Array<{ id: string; name: string; price: number; originalPrice?: number; image: string; category: string; rating?: number; reviewCount?: number; isNew?: boolean; isOnSale?: boolean }>
      for (const raw of list) {
        const catSlug: string = raw?.category?.slug || 'uncategorized'
        if (seen.has(catSlug)) continue
        const img = Array.isArray(raw?.images) && raw.images.length > 0 ? raw.images[0] : '/images/placeholder.png'
        picked.push({
          id: String(raw?._id || raw?.id || ''),
          name: raw?.name || '',
          price: Number(raw?.price || 0),
          originalPrice: undefined,
          image: img,
          category: raw?.category?.name || catSlug,
          rating: raw?.rating ?? 0,
          reviewCount: raw?.reviewCount ?? 0,
          isNew: false,
          isOnSale: false
        })
        seen.add(catSlug)
        if (picked.length >= 5) break
      }
      console.log('[home:getFeatured] fallback overall picked count=', picked.length)
      console.log('[home:getFeatured] final picked length=', picked.length, 'categories=', picked.map(p => p.category))
    return picked
    }

    // 2) For each category, fetch top 1 by popularity
    const perCategoryPromises = catList.map(async (cat) => {
      const p = new URLSearchParams({ category: cat.slug, sort: 'popularity', order: 'desc', page: '1', limit: '1' })
      const r = await fetch(`${base}/api/products/search?${p.toString()}`, { cache: 'no-store', next: { revalidate: 0 } })
      if (!r.ok) {
        console.warn('[home:getFeatured] per-cat search failed', cat.slug, r.status, r.statusText)
      }
      const j = await r.json().catch((e) => { console.warn('[home:getFeatured] per-cat json failed', cat.slug, e); return {} as any })
      const item = Array.isArray(j?.data?.data) && j.data.data.length > 0 ? j.data.data[0] : null
      console.log('[home:getFeatured] per-cat result', cat.slug, !!item)
      if (!item) return null
      return {
        raw: item,
        popularity: Number(item?.popularityScore ?? item?.popularityComputed ?? 0),
        categorySlug: cat.slug,
        categoryName: cat.name
      }
    })

    const perCategory = (await Promise.all(perCategoryPromises)).filter(Boolean) as Array<{
      raw: any; popularity: number; categorySlug: string; categoryName: string
    }>

    if (perCategory.length === 0) {
      // Fallback to overall popularity unique-by-category if per-category queries returned nothing
      const p = new URLSearchParams({ sort: 'popularity', order: 'desc', page: '1', limit: '50' })
      const r = await fetch(`${base}/api/products/search?${p.toString()}`, { cache: 'no-store', next: { revalidate: 0 } })
      if (!r.ok) console.warn('[home:getFeatured] fallback overall search HTTP', r.status, r.statusText)
      const j = await r.json().catch((e) => { console.warn('[home:getFeatured] fallback overall json error', e); return {} as any })
      const list: any[] = Array.isArray(j?.data?.data) ? j.data.data : []
      console.log('[home:getFeatured] fallback overall list count=', list.length)
      const seen = new Set<string>()
      const picked = [] as Array<{ id: string; name: string; price: number; originalPrice?: number; image: string; category: string; rating?: number; reviewCount?: number; isNew?: boolean; isOnSale?: boolean }>
      for (const raw of list) {
        const catSlug: string = raw?.category?.slug || 'uncategorized'
        if (seen.has(catSlug)) continue
        const img = Array.isArray(raw?.images) && raw.images.length > 0 ? raw.images[0] : '/images/placeholder.png'
        picked.push({
          id: String(raw?._id || raw?.id || ''),
          name: raw?.name || '',
          price: Number(raw?.price || 0),
          originalPrice: undefined,
          image: img,
          category: raw?.category?.name || catSlug,
          rating: raw?.rating ?? 0,
          reviewCount: raw?.reviewCount ?? 0,
          isNew: false,
          isOnSale: false
        })
        seen.add(catSlug)
        if (picked.length >= 5) break
      }
      return picked
    }

    // 3) Sort by popularity across categories and take top 5
    perCategory.sort((a, b) => b.popularity - a.popularity)
    const top = perCategory.slice(0, 5)
    console.log('[home:getFeatured] per-category winners count=', perCategory.length, 'top used=', top.length)

    // 4) Map to UI product shape
    const picked: Array<{
      id: string
      name: string
      price: number
      originalPrice?: number
      image: string
      category: string
      rating?: number
      reviewCount?: number
      isNew?: boolean
      isOnSale?: boolean
    }> = top.map(({ raw, categoryName, categorySlug }) => {
      const img = Array.isArray(raw?.images) && raw.images.length > 0 ? raw.images[0] : '/images/placeholder.png'
      return {
        id: String(raw?._id || raw?.id || ''),
        name: raw?.name || '',
        price: Number(raw?.price || 0),
        originalPrice: undefined,
        image: img,
        category: raw?.category?.name || categoryName || categorySlug,
        rating: raw?.rating ?? 0,
        reviewCount: raw?.reviewCount ?? 0,
        isNew: false,
        isOnSale: false
      }
    })
    console.log('[home:getFeatured] final picked length=', picked.length, 'categories=', picked.map(p => p.category))
    return picked
  } catch (e) {
    // Fallback to empty list on error to avoid breaking homepage
    return []
  }
}

async function getCategories() {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 50))
  
  return [
    {
      id: 'clothing',
      name: 'Clothing',
      description: 'Discover the latest trends in fashion',
      image: '/images/categories/clothing.jpg',
      href: '/search?category=clothing',
      productCount: 1250,
      isPopular: true
    },
    {
      id: 'shoes',
      name: 'Shoes',
      description: 'Step up your style game',
      image: '/images/categories/shoes.jpg',
      href: '/search?category=shoes',
      productCount: 850,
      isPopular: true
    },
    {
      id: 'accessories',
      name: 'Accessories',
      description: 'Complete your look with perfect accessories',
      image: '/images/categories/accessories.jpg',
      href: '/search?category=accessories',
      productCount: 650
    }
  ]
}

// Build slides for the promo banner: one slide per category with latest items (side-by-side)
async function getCategorySlides() {
  try {
    const base = (process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim().length > 0)
      ? process.env.NEXT_PUBLIC_SITE_URL
      : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

    const catRes = await fetch(`${base}/api/categories`, { cache: 'no-store', next: { revalidate: 0 } })
    const catJson = await catRes.json().catch(() => ({} as any))
    const cats: Array<{ slug: string; name: string }> = (catJson?.data?.categories || []).map((c: any) => ({ slug: c.slug, name: c.name }))

    // Limit to a reasonable number of slides (e.g., 5)
    const topCats = cats.slice(0, 5)

    const slidePromises = topCats.map(async (cat) => {
      // Try newest first (API accepts 'newest'), then fall back to popularity
      const newestParams = new URLSearchParams({ category: cat.slug, sort: 'newest', order: 'desc', page: '1', limit: '24' })
      const newestRes = await fetch(`${base}/api/products/search?${newestParams.toString()}`, { cache: 'no-store', next: { revalidate: 0 } })
      const newestJson = await newestRes.json().catch(() => ({} as any))
      let items: any[] = Array.isArray(newestJson?.data?.data) ? newestJson.data.data : []
      if (items.length === 0) {
        const popParams = new URLSearchParams({ category: cat.slug, sort: 'popularity', order: 'desc', page: '1', limit: '24' })
        const popRes = await fetch(`${base}/api/products/search?${popParams.toString()}`, { cache: 'no-store', next: { revalidate: 0 } })
        const popJson = await popRes.json().catch(() => ({} as any))
        items = Array.isArray(popJson?.data?.data) ? popJson.data.data : []
      }
      const withImages = items.filter((p: any) => Array.isArray(p?.images) && p.images.length > 0)
      console.log('[home:getCategorySlides] cat', cat.slug, 'items=', items.length, 'withImages=', withImages.length)
      const pool = withImages.length >= 6 ? withImages : items
      const products = pool.slice(0, 8).map((p: any) => ({
        id: String(p?._id || p?.id || ''),
        name: p?.name || '',
        price: Number(p?.price || 0),
        image: (Array.isArray(p?.images) && p.images[0]) || '/images/placeholder.png',
        href: `/products/${String(p?._id || p?.id || '')}`
      }))
      return { categorySlug: cat.slug, categoryName: cat.name, products }
    })

    const slides = (await Promise.all(slidePromises)).filter(s => s.products && s.products.length > 0)
    return slides
  } catch {
    return []
  }
}

type CategorySlides = Array<{ categorySlug: string; categoryName: string; products: Array<{ id: string; name: string; price: number; image: string; href: string }> }>

interface HomePageContentProps {
  featuredProducts: Awaited<ReturnType<typeof getFeaturedProducts>>
  categories: Awaited<ReturnType<typeof getCategories>>
  categorySlides: CategorySlides
}

function HomePageContent({ featuredProducts, categories, categorySlides }: HomePageContentProps) {
  // Prepare hero featured products (first 4 products)
  const heroProducts = featuredProducts.slice(0, 4).map(product => ({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    href: `/products/${product.id}`
  }))

  return (
    <>
      {/* Hero Section */}
      <Hero featuredProducts={heroProducts} />

      {/* Promotional Banner - category-based slides */}
      <PromotionalBanner categorySlides={categorySlides} />

      {/* Featured Products */}
      <FeaturedProducts 
        products={featuredProducts}
        title="Trending Now"
        subtitle="Discover what's popular with our customers this week"
      />

      {/* Category Showcase */}
      <CategoryShowcase 
        categories={categories}
        title="Shop by Category"
        subtitle="Find exactly what you're looking for in our curated collections"
      />

      {/* Customer Testimonials */}
      <Testimonials />

      {/* Newsletter Signup */}
      <Newsletter />
    </>
  )
}

export default async function Home() {
  try {
    // Fetch data in parallel
    const [featuredProducts, categories, categorySlides] = await Promise.all([
      getFeaturedProducts(),
      getCategories(),
      getCategorySlides()
    ])

    return (
      <div className="min-h-screen">
        <Suspense 
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <LoadingSpinner size="lg" />
            </div>
          }
        >
          <HomePageContent 
            featuredProducts={featuredProducts}
            categories={categories}
            categorySlides={categorySlides}
          />
        </Suspense>
      </div>
    )
  } catch (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ErrorMessage 
          message="Failed to load homepage content. Please try refreshing the page." 
        />
      </div>
    )
  }
}
