import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface Category {
  id: string
  name: string
  description: string
  image: string
  href: string
  productCount?: number
  isPopular?: boolean
}

interface CategoryShowcaseProps {
  categories: Category[]
  title?: string
  subtitle?: string
}

const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({
  categories = [],
  title = "Shop by Category",
  subtitle = "Explore our diverse collection across different fashion categories"
}) => {
  const displayCategories = categories

  if (!displayCategories || displayCategories.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {displayCategories.slice(0, 8).map((category) => (
            <Link
              key={category.id}
              href={`/categories/${encodeURIComponent(category.id)}`}
              className={`group relative overflow-hidden rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-300`}
            >
              <div className={`relative aspect-[4/3]`}>
                {/* Category Image */}
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                
                {/* Popular Badge */}
                {category.isPopular && (
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-400 text-yellow-900">
                      Popular
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-yellow-300 transition-colors">
                    {category.name}
                  </h3>
                  <p className="text-gray-200 text-sm mb-3 line-clamp-2">
                    {category.description}
                  </p>
                  
                  {category.productCount && (
                    <p className="text-gray-300 text-xs mb-4">
                      {category.productCount.toLocaleString()} products
                    </p>
                  )}

                  <div className="flex items-center text-white group-hover:text-yellow-300 transition-colors">
                    <span className="text-sm font-medium">Shop Now</span>
                    <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </Link>
          ))}
        </div>

        {/* View All Categories */}
        <div className="text-center mt-12">
          <Link
            href="/categories"
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            View All Categories
            <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

export { CategoryShowcase }