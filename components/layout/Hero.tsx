'use client'
import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils/currency'
import { HeroImage } from '@/components/ui/OptimizedImage'

interface Product {
  id: string
  name: string
  price: number
  image: string
  href: string
  category?: string
}

interface Slide {
  id: string
  title: string
  subtitle: string
  cta: string
  ctaLink: string
  products: Product[]
  backgroundColor?: string
}

interface HeroProps {
  featuredProducts?: Product[]
}

const Hero: React.FC<HeroProps> = ({ featuredProducts = [] }) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile viewport
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 640px)')
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      // MediaQueryListEvent for modern browsers; initial set with MediaQueryList
      // @ts-ignore - unify types
      const matches = 'matches' in e ? e.matches : e.target.matches
      setIsMobile(matches)
    }
    handler(mq)
    // Modern browsers
    mq.addEventListener?.('change', handler as (e: MediaQueryListEvent) => void)
    // Fallback for older browsers
    // @ts-ignore
    mq.addListener?.(handler)
    return () => {
      mq.removeEventListener?.('change', handler as (e: MediaQueryListEvent) => void)
      // @ts-ignore
      mq.removeListener?.(handler)
    }
  }, [])

  // Create slides from featured products - group by category or create multiple product slides
  const createSlides = useCallback((): Slide[] => {
    if (featuredProducts.length === 0) {
      return [
        {
          id: 'default',
          title: 'Discover Your Perfect Style',
          subtitle: 'Explore our curated collection of fashion-forward clothing, shoes, and accessories.',
          cta: 'Shop Now',
          ctaLink: '/search',
          products: [],
          backgroundColor: 'from-slate-900 to-slate-800'
        }
      ]
    }

    // Group products by category or create slides with multiple products
    const slides: Slide[] = []
    const productsPerSlide = isMobile ? 1 : 3 // Mobile: one image per slide

    for (let i = 0; i < featuredProducts.length; i += productsPerSlide) {
      const slideProducts = featuredProducts.slice(i, i + productsPerSlide)
      const mainProduct = slideProducts[0]
      
      slides.push({
        id: `slide-${i}`,
        title: slideProducts.length > 1 ? 'Featured Collection' : mainProduct.name,
        subtitle: slideProducts.length > 1 
          ? `Discover ${slideProducts.length} amazing products` 
          : `Starting at ${formatCurrency(mainProduct.price)}`,
        cta: 'Shop Now',
        ctaLink: slideProducts.length > 1 ? '/search' : mainProduct.href,
        products: slideProducts,
        backgroundColor: i % 2 === 0 ? 'from-slate-900 to-slate-800' : 'from-indigo-900 to-purple-900'
      })
    }

    return slides
  }, [featuredProducts, isMobile])

  const slides = createSlides()

  // Auto-advance slides
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // Change slide every 5 seconds

    return () => clearInterval(interval)
  }, [isAutoPlaying, slides.length])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
    setIsAutoPlaying(false)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
    setIsAutoPlaying(false)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
  }

  // Resume auto-play after user interaction
  useEffect(() => {
    if (!isAutoPlaying) {
      const timeout = setTimeout(() => setIsAutoPlaying(true), 10000) // Resume after 10 seconds
      return () => clearTimeout(timeout)
    }
  }, [isAutoPlaying])

  const renderProductImages = (products: Product[]) => {
    if (products.length === 0) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <div className="text-gray-500 text-xl font-medium">No Image Available</div>
        </div>
      )
    }

    if (products.length === 1) {
      // Single product - full width
      return (
        <HeroImage
          src={products[0].image}
          alt={products[0].name}
          fill
          className="object-cover"
          priority={currentSlide === 0}
          sizes="100vw"
          quality={90}
        />
      )
    }

    if (products.length === 2) {
      // Two products side by side
      return (
        <div className="grid grid-cols-2 gap-2 w-full h-full">
          {products.map((product) => (
            <div key={product.id} className="relative overflow-hidden">
              <HeroImage
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="50vw"
                quality={85}
              />
            </div>
          ))}
        </div>
      )
    }

    // Three or more products - creative layout
    return (
      <div className="grid grid-cols-3 gap-2 w-full h-full">
        <div className="col-span-2 relative overflow-hidden">
          <HeroImage
            src={products[0].image}
            alt={products[0].name}
            fill
            className="object-cover"
            sizes="66vw"
            quality={85}
          />
        </div>
        <div className="grid grid-rows-2 gap-2">
          {products.slice(1, 3).map((product) => (
            <div key={product.id} className="relative overflow-hidden">
              <HeroImage
                src={product.image}
                alt={product.name}
                fill
                className="object-cover"
                sizes="33vw"
                quality={80}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Slideshow Container */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-transform duration-700 ease-in-out ${
              index === currentSlide ? 'translate-x-0' : 
              index < currentSlide ? '-translate-x-full' : 'translate-x-full'
            }`}
          >
            {/* Background */}
            <div className={`absolute inset-0 bg-gradient-to-r ${slide.backgroundColor}`} />
            
            {/* Product Images */}
            <div className="absolute inset-0">
              {renderProductImages(slide.products)}
              {/* Dark overlay for text readability */}
              <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Content */}
            <div className="relative h-full flex items-center justify-center">
              <div className="text-center text-white px-4 max-w-4xl mx-auto">
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-4 tracking-tight">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl mb-8 text-gray-200 max-w-2xl mx-auto">
                  {slide.subtitle}
                </p>
                <Button 
                  size="lg" 
                  className="bg-white text-black hover:bg-gray-100 font-semibold px-8 py-3 text-lg"
                >
                  <Link href={slide.ctaLink}>{slide.cta}</Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-200"
            aria-label="Previous slide"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-200"
            aria-label="Next slide"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5L15.75 12l-7.5 7.5" />
            </svg>
          </button>
        </>
      )}

      {/* Slide Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentSlide 
                  ? 'bg-white scale-110' 
                  : 'bg-white/50 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Play/Pause indicator (optional) */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setIsAutoPlaying(!isAutoPlaying)}
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-2 transition-all duration-200"
          aria-label={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
        >
          {isAutoPlaying ? (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>
      </div>
    </section>
  )
}

export { Hero }