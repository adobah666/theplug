'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils/currency'
import { HeroImage } from '@/components/ui/OptimizedImage'
import { preloadImages, getOptimizedImageUrl } from '@/lib/utils/images'

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
  const [hydrated, setHydrated] = useState(false)
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(new Set([0])) // Track which slides have loaded images

  // Detect mobile viewport
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Mark as hydrated as soon as we're on the client to avoid SSR/CSR mismatch flashes
    setHydrated(true)
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
          ? 'Today’s top picks' 
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

  // Auto-advance slides - only advance if next slide images are loaded
  useEffect(() => {
    if (!isAutoPlaying || slides.length <= 1) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextIndex = (prev + 1) % slides.length
        // Only advance if the next slide's images are loaded
        if (loadedSlides.has(nextIndex)) {
          return nextIndex
        }
        // If next slide isn't loaded, try to preload it but don't advance yet
        const nextProducts = slides[nextIndex]?.products || []
        const urls = nextProducts.map(p => getOptimizedImageUrl(p.image, 'hero'))
        if (urls.length) {
          preloadImages(urls, 3).then(() => {
            setLoadedSlides(prev => new Set([...prev, nextIndex]))
          }).catch(() => {})
        }
        return prev // Stay on current slide
      })
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [isAutoPlaying, slides.length, loadedSlides, slides])

  // Preload the next slide's images and mark as loaded
  useEffect(() => {
    if (!slides || slides.length === 0) return
    const nextIndex = (currentSlide + 1) % slides.length
    
    // Skip if already loaded
    if (loadedSlides.has(nextIndex)) return
    
    const nextProducts = slides[nextIndex]?.products || []
    const urls = nextProducts.map(p => getOptimizedImageUrl(p.image, 'hero'))
    if (urls.length) {
      preloadImages(urls, 3).then(() => {
        setLoadedSlides(prev => new Set([...prev, nextIndex]))
      }).catch(() => {})
    } else {
      // No images to load, mark as loaded
      setLoadedSlides(prev => new Set([...prev, nextIndex]))
    }
  }, [currentSlide, slides, loadedSlides])

  const nextSlide = () => {
    const nextIndex = (currentSlide + 1) % slides.length
    // Preload target slide if not already loaded
    if (!loadedSlides.has(nextIndex)) {
      const targetProducts = slides[nextIndex]?.products || []
      const urls = targetProducts.map(p => getOptimizedImageUrl(p.image, 'hero'))
      if (urls.length) {
        preloadImages(urls, 3).then(() => {
          setLoadedSlides(prev => new Set([...prev, nextIndex]))
          setCurrentSlide(nextIndex)
        }).catch(() => {
          // Even if preload fails, allow navigation
          setCurrentSlide(nextIndex)
        })
      } else {
        setCurrentSlide(nextIndex)
      }
    } else {
      setCurrentSlide(nextIndex)
    }
    setIsAutoPlaying(false)
  }

  const prevSlide = () => {
    const prevIndex = (currentSlide - 1 + slides.length) % slides.length
    // Preload target slide if not already loaded
    if (!loadedSlides.has(prevIndex)) {
      const targetProducts = slides[prevIndex]?.products || []
      const urls = targetProducts.map(p => getOptimizedImageUrl(p.image, 'hero'))
      if (urls.length) {
        preloadImages(urls, 3).then(() => {
          setLoadedSlides(prev => new Set([...prev, prevIndex]))
          setCurrentSlide(prevIndex)
        }).catch(() => {
          // Even if preload fails, allow navigation
          setCurrentSlide(prevIndex)
        })
      } else {
        setCurrentSlide(prevIndex)
      }
    } else {
      setCurrentSlide(prevIndex)
    }
    setIsAutoPlaying(false)
  }

  const goToSlide = (index: number) => {
    // Preload target slide if not already loaded
    if (!loadedSlides.has(index)) {
      const targetProducts = slides[index]?.products || []
      const urls = targetProducts.map(p => getOptimizedImageUrl(p.image, 'hero'))
      if (urls.length) {
        preloadImages(urls, 3).then(() => {
          setLoadedSlides(prev => new Set([...prev, index]))
          setCurrentSlide(index)
        }).catch(() => {
          // Even if preload fails, allow navigation
          setCurrentSlide(index)
        })
      } else {
        setCurrentSlide(index)
      }
    } else {
      setCurrentSlide(index)
    }
    setIsAutoPlaying(false)
  }

  // Resume auto-play after user interaction
  useEffect(() => {
    if (!isAutoPlaying) {
      const timeout = setTimeout(() => setIsAutoPlaying(true), 10000) // Resume after 10 seconds
      return () => clearTimeout(timeout)
    }
  }, [isAutoPlaying])

  const renderProductImages = (products: Product[], isActive: boolean) => {
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
          priority={isActive}
          fetchPriority={isActive ? 'high' : 'auto'}
          loading={isActive ? 'eager' : 'lazy'}
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
                priority={isActive}
                fetchPriority={isActive ? 'high' : 'auto'}
                loading={isActive ? 'eager' : 'lazy'}
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
            priority={isActive}
            fetchPriority={isActive ? 'high' : 'auto'}
            loading={isActive ? 'eager' : 'lazy'}
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
                priority={isActive}
                fetchPriority={isActive ? 'high' : 'auto'}
                loading={isActive ? 'eager' : 'lazy'}
                sizes="33vw"
                quality={80}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const scrollToTrending = () => {
    if (typeof window === 'undefined') return
    const el = document.getElementById('trending-now')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      // Fallback: navigate
      window.location.hash = '#trending-now'
    }
  }

  // While server-rendered (pre-hydration), show a CSS-only, responsive skeleton to prevent
  // flashing desktop layout on small screens. This avoids relying on JS-driven isMobile logic.
  // We do this regardless of whether products are already available to ensure no layout shift.
  if (!hydrated) {
    return (
      <section className="relative w-full overflow-hidden h-[calc(100svh-9.5rem)] sm:h-[calc(100svh-8rem)] lg:h-screen">
        {/* Static background only (no skeleton loaders) */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800" />
      </section>
    )
  }

  return (
    <section className="relative w-full overflow-hidden h-[calc(100svh-9.5rem)] sm:h-[calc(100svh-8rem)] lg:h-screen">
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
              {renderProductImages(slide.products, index === currentSlide)}
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
                  onClick={scrollToTrending}
                >
                  {slide.cta}
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

    </section>
  )
}

export { Hero }