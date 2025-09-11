'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils/currency'

interface Promotion {
  id: string
  title: string
  subtitle: string
  description: string
  discount?: string
  ctaText: string
  ctaLink: string
  backgroundImage?: string
  backgroundColor?: string
  textColor?: string
  endDate?: Date
  isActive?: boolean
}

interface SlideProduct { id: string; name: string; price: number; image: string; href: string }
interface CategorySlide { categorySlug: string; categoryName: string; products: SlideProduct[] }

interface PromotionalBannerProps {
  promotions?: Promotion[]
  autoRotate?: boolean
  rotationInterval?: number
  // New: when provided, overrides promotions and shows category slides
  categorySlides?: CategorySlide[]
}

// Default promotions defined outside component to prevent re-creation
const getDefaultPromotions = (): Promotion[] => [
  {
    id: 'summer-sale',
    title: 'Summer Sale',
    subtitle: 'Up to 70% Off',
    description: 'Refresh your wardrobe with our biggest sale of the season',
    discount: '70%',
    ctaText: 'Shop Sale',
    ctaLink: '/sale',
    backgroundColor: 'from-orange-400 to-pink-500',
    textColor: 'text-white',
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    isActive: true
  },
  {
    id: 'new-arrivals',
    title: 'New Arrivals',
    subtitle: 'Fresh Styles Weekly',
    description: 'Discover the latest trends and must-have pieces',
    ctaText: 'Explore New',
    ctaLink: '/new-arrivals',
    backgroundColor: 'from-blue-500 to-purple-600',
    textColor: 'text-white',
    isActive: true
  },
  {
    id: 'free-shipping',
    title: 'Free Shipping',
    subtitle: 'On Orders Over GH₵15,000',
    description: 'No minimum purchase required for premium members',
    ctaText: 'Learn More',
    ctaLink: '/shipping',
    backgroundColor: 'from-green-400 to-blue-500',
    textColor: 'text-white',
    isActive: true
  }
]

const PromotionalBanner: React.FC<PromotionalBannerProps> = ({
  promotions,
  autoRotate = true,
  rotationInterval = 8000,
  categorySlides = []
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: string }>({})

  // Memoize active promotions to prevent infinite re-renders
  const activePromotions = React.useMemo(() => {
    return promotions && promotions.length > 0 
      ? promotions.filter(p => p.isActive !== false)
      : getDefaultPromotions().filter(p => p.isActive !== false)
  }, [promotions])

  const usingCategorySlides = Array.isArray(categorySlides) && categorySlides.length > 0

  // Auto-rotation
  useEffect(() => {
    if (usingCategorySlides) {
      if (autoRotate && categorySlides.length > 1) {
        const interval = setInterval(() => {
          setCurrentIndex(prev => (prev + 1) % categorySlides.length)
        }, rotationInterval)
        return () => clearInterval(interval)
      }
      return
    }
    if (autoRotate && activePromotions.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % activePromotions.length)
      }, rotationInterval)

      return () => clearInterval(interval)
    }
  }, [autoRotate, activePromotions.length, rotationInterval, usingCategorySlides, categorySlides.length])

  // Countdown timer (only for promotions mode)
  useEffect(() => {
    if (usingCategorySlides) return
    const updateCountdown = () => {
      const newTimeLeft: { [key: string]: string } = {}

      activePromotions.forEach(promotion => {
        if (promotion.endDate) {
          const now = new Date().getTime()
          const end = promotion.endDate.getTime()
          const difference = end - now

          if (difference > 0) {
            const days = Math.floor(difference / (1000 * 60 * 60 * 24))
            const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((difference % (1000 * 60)) / 1000)

            newTimeLeft[promotion.id] = `${days}d ${hours}h ${minutes}m ${seconds}s`
          } else {
            newTimeLeft[promotion.id] = 'Expired'
          }
        }
      })

      setTimeLeft(newTimeLeft)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [activePromotions, usingCategorySlides])

  if (!usingCategorySlides && activePromotions.length === 0) {
    return null
  }

  // Category slides mode
  if (usingCategorySlides) {
    const total = categorySlides.length
    const current = Math.max(0, Math.min(currentIndex, total - 1))
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="absolute inset-0 opacity-30">
          <div className="w-full h-full" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.4'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          {/* Header with improved typography */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-sm font-medium text-indigo-600 mb-4 shadow-sm">
              ✨ Featured Collection
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Latest in <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{categorySlides[current].categoryName}</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our handpicked selection of trending items in this category
            </p>
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-center items-center gap-4 mb-8">
            <button 
              onClick={() => setCurrentIndex((current - 1 + total) % total)} 
              className="group bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 hover:text-indigo-600 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 border border-white/20"
              aria-label="Previous category"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex gap-2">
              {categorySlides.map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentIndex(i)} 
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    i === current 
                      ? 'bg-indigo-600 scale-125 shadow-lg' 
                      : 'bg-white/60 hover:bg-white/80 hover:scale-110'
                  }`} 
                  aria-label={`Go to ${categorySlides[i].categoryName}`} 
                />
              ))}
            </div>
            
            <button 
              onClick={() => setCurrentIndex((current + 1) % total)} 
              className="group bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 hover:text-indigo-600 rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 border border-white/20"
              aria-label="Next category"
            >
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Products Carousel */}
          <div className="relative overflow-hidden rounded-3xl bg-white/60 backdrop-blur-sm shadow-2xl border border-white/20">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5"></div>
            
            <div className="relative flex transition-transform duration-700 ease-out" style={{ transform: `translateX(-${current * 100}%)` }}>
              {categorySlides.map((slide, i) => (
                <div key={slide.categorySlug + i} className="w-full flex-shrink-0 p-8" style={{ minWidth: '100%' }}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 max-w-6xl mx-auto">
                    {slide.products.slice(0, 12).map(p => (
                      <Link 
                        key={p.id} 
                        href={p.href} 
                        className="group relative rounded-2xl overflow-hidden bg-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
                      >
                        <div className="relative aspect-square w-full">
                          <Image 
                            src={p.image} 
                            alt={p.name} 
                            fill 
                            className="object-cover group-hover:scale-110 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          
                          {/* Floating price tag */}
                          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-full text-xs font-bold shadow-lg">
                            {formatCurrency(p.price)}
                          </div>
                          
                          {/* Product info overlay */}
                          <div className="absolute bottom-0 left-0 right-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <div className="text-white">
                              <div className="font-semibold text-sm truncate mb-1">{p.name}</div>
                              <div className="text-xs opacity-90">View Details →</div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View All CTA */}
          <div className="text-center mt-8">
            <Link 
              href={`/search?category=${categorySlides[current].categorySlug}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-8 py-4 rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
            >
              Explore All {categorySlides[current].categoryName}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const currentPromotion = activePromotions[currentIndex]

  return (
    <section className="relative overflow-hidden">
      <div className={`bg-white transition-all duration-1000`}>
        {/* Background Image */}
        {currentPromotion.backgroundImage && (
          <div className="absolute inset-0">
            <Image
              src={currentPromotion.backgroundImage}
              alt={currentPromotion.title}
              fill
              className="object-cover opacity-30"
            />
          </div>
        )}

        {/* Content */}
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <div className="text-center">
            {/* Discount Badge */}
            {currentPromotion.discount && (
              <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-400 text-yellow-900 rounded-full text-2xl font-bold mb-6 animate-pulse">
                {currentPromotion.discount}
              </div>
            )}

            {/* Title */}
            <h2 className={`text-4xl font-bold sm:text-5xl lg:text-6xl ${currentPromotion.textColor || 'text-white'}`}>
              {currentPromotion.title}
            </h2>

            {/* Subtitle */}
            <p className={`mt-4 text-xl sm:text-2xl font-semibold ${currentPromotion.textColor || 'text-white'} opacity-90`}>
              {currentPromotion.subtitle}
            </p>

            {/* Description */}
            <p className={`mt-6 text-lg ${currentPromotion.textColor || 'text-white'} opacity-80 max-w-2xl mx-auto`}>
              {currentPromotion.description}
            </p>

            {/* Countdown Timer */}
            {currentPromotion.endDate && timeLeft[currentPromotion.id] && timeLeft[currentPromotion.id] !== 'Expired' && (
              <div className="mt-8 inline-flex items-center space-x-4 bg-black/20 backdrop-blur-sm rounded-lg px-6 py-3">
                <span className={`text-sm font-medium ${currentPromotion.textColor || 'text-white'} opacity-80`}>
                  Ends in:
                </span>
                <span className={`text-lg font-bold ${currentPromotion.textColor || 'text-white'} font-mono`}>
                  {timeLeft[currentPromotion.id]}
                </span>
              </div>
            )}

            {/* CTA Button */}
            <div className="mt-10">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 text-lg font-semibold">
                <Link href={currentPromotion.ctaLink}>
                  {currentPromotion.ctaText}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Dots */}
        {activePromotions.length > 1 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {activePromotions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'bg-white scale-125' 
                    : 'bg-white/50 hover:bg-white/75'
                }`}
                aria-label={`Go to promotion ${index + 1}`}
              />
            ))}
          </div>
        )}

        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-16 -translate-y-16 animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-24 translate-y-24 animate-pulse delay-1000"></div>
      </div>
    </section>
  )
}

export { PromotionalBanner }