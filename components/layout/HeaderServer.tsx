import React from 'react'
import Link from 'next/link'
import { getBaseUrl } from '@/lib/utils/server'
import { Button } from '@/components/ui/Button'
import { SearchBar } from '@/components/product/SearchBar'
import { CartIcon } from '@/components/cart/CartIcon'
import { HeaderClient } from '@/components/layout/HeaderClient'
import { Unbounded } from 'next/font/google'

interface Category {
  name: string
  slug: string
}

interface Brand {
  name: string
  slug?: string
}

const brandFont = Unbounded({ subsets: ['latin'], weight: ['700'] })

async function getNavigationData(): Promise<{ categories: Category[], brands: Brand[] }> {
  try {
    const base = getBaseUrl()

    const [categoriesRes, brandsRes] = await Promise.all([
      fetch(`${base}/api/categories`, { next: { revalidate: 900 } }),
      fetch(`${base}/api/brands`, { next: { revalidate: 900 } })
    ])

    let categories: Category[] = []
    let brands: Brand[] = []

    if (categoriesRes.ok) {
      const catJson = await categoriesRes.json().catch(() => ({}))
      const catList = (catJson?.data?.categories || []) as Array<{ name: string; slug: string }>
      categories = catList.sort((a, b) => a.name.localeCompare(b.name))
    }

    if (brandsRes.ok) {
      const brandJson = await brandsRes.json().catch(() => ({}))
      brands = (brandJson?.brands || []) as Array<{ name: string; slug?: string }>
    }

    return { categories, brands }
  } catch (error) {
    console.error('[HeaderServer] Error fetching navigation data:', error)
    return { categories: [], brands: [] }
  }
}

const HeaderServer: React.FC = async () => {
  const { categories, brands } = await getNavigationData()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      {/* Main header */}
      <div className="px-4 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className={`leading-tight ${brandFont.className}`}>
              <div className="text-xl font-extrabold text-gray-900">ThePlug</div>
              <div className="mt-0.5 w-fit rounded px-1 py-0.5 text-[10px] uppercase tracking-[0.2em] text-blue-600 bg-blue-50">
                online
              </div>
            </div>
          </Link>

          {/* Search bar - Desktop (lg and up) */}
          <div className="hidden flex-1 max-w-lg mx-8 lg:block">
            <SearchBar />
          </div>

          {/* Right side actions - Client component handles user state */}
          <HeaderClient />
        </div>

        {/* Mobile/medium search */}
        <div className="mt-4 lg:hidden">
          <SearchBar />
        </div>
      </div>

      {/* Navigation */}
      <nav className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex items-center justify-between py-3">
            {/* Categories - Desktop (lg and up) */}
            <div className="hidden lg:flex items-center space-x-8">
              {categories.slice(0, 6).map((category) => (
                <Link
                  key={category.slug}
                  href={`/categories/${category.slug}`}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600"
                >
                  {category.name}
                </Link>
              ))}
              {categories.length > 6 && (
                <Link href="/categories" className="text-sm font-medium text-gray-700 hover:text-blue-600">
                  All Categories
                </Link>
              )}
            </div>

            {/* Brands - Desktop (lg and up) */}
            <div className="hidden lg:flex items-center space-x-6">
              {brands.slice(0, 3).map((brand) => (
                <Link
                  key={brand.slug || brand.name}
                  href={`/brands/${brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-sm text-gray-600 hover:text-blue-600"
                >
                  {brand.name}
                </Link>
              ))}
              <Link href="/brands" className="text-sm font-medium text-gray-700 hover:text-blue-600">All Brands</Link>
            </div>
          </div>
        </div>
      </nav>
    </header>
  )
}

export { HeaderServer }
