'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ProductCard } from './ProductCard'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

interface Product {
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
}

interface FeaturedProductsProps {
  products: Product[]
  isLoading?: boolean
  error?: string
  title?: string
  subtitle?: string
}

const FeaturedProducts: React.FC<FeaturedProductsProps> = ({
  products = [],
  isLoading = false,
  error,
  title = "Featured Products",
  subtitle = "Discover our handpicked selection of trending items"
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  const itemsPerView = {
    mobile: 1,
    tablet: 2,
    desktop: 4
  }

  const maxIndex = Math.max(0, products.length - itemsPerView.desktop)

  // Auto-scroll functionality
  useEffect(() => {
    if (isAutoPlaying && products.length > itemsPerView.desktop) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1))
      }, 4000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isAutoPlaying, maxIndex, products.length])

  const scrollTo = (index: number) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    
    // Resume auto-play after 10 seconds
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const scrollLeft = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex
    scrollTo(newIndex)
  }

  const scrollRight = () => {
    const newIndex = currentIndex < maxIndex ? currentIndex + 1 : 0
    scrollTo(newIndex)
  }

  if (error) {
    return (
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4">
          <ErrorMessage message={error} />
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 bg-white">
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No featured products available at the moment.</p>
          </div>
        ) : (
          <>
            {/* Carousel Container */}
            <div className="relative">
              {/* Navigation Buttons */}
              {products.length > itemsPerView.desktop && (
                <>
                  <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors"
                    aria-label="Previous products"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors"
                    aria-label="Next products"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              {/* Products Grid */}
              <div 
                ref={scrollContainerRef}
                className="overflow-hidden"
              >
                <div 
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    transform: `translateX(-${currentIndex * (100 / itemsPerView.desktop)}%)`
                  }}
                >
                  {products.map((product) => (
                    <div 
                      key={product.id}
                      className="w-full sm:w-1/2 lg:w-1/4 flex-shrink-0 px-3"
                    >
                      <ProductCard
                        id={product.id}
                        name={product.name}
                        price={product.price}
                        originalPrice={product.originalPrice}
                        image={product.image}
                        category={product.category}
                        rating={product.rating}
                        reviewCount={product.reviewCount}
                        isNew={product.isNew}
                        isOnSale={product.isOnSale}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Dots Indicator */}
              {products.length > itemsPerView.desktop && (
                <div className="flex justify-center mt-8 space-x-2">
                  {Array.from({ length: maxIndex + 1 }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => scrollTo(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        index === currentIndex 
                          ? 'bg-blue-600' 
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* View All Button */}
            <div className="text-center mt-12">
              <Button variant="outline" size="lg">
                <Link href="/search">View All Products</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}

export { FeaturedProducts }