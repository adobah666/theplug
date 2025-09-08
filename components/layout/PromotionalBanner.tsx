'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'

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

interface PromotionalBannerProps {
  promotions?: Promotion[]
  autoRotate?: boolean
  rotationInterval?: number
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
    subtitle: 'On Orders Over ₦15,000',
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
  rotationInterval = 8000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState<{ [key: string]: string }>({})

  // Memoize active promotions to prevent infinite re-renders
  const activePromotions = React.useMemo(() => {
    return promotions && promotions.length > 0 
      ? promotions.filter(p => p.isActive !== false)
      : getDefaultPromotions().filter(p => p.isActive !== false)
  }, [promotions])

  // Auto-rotation
  useEffect(() => {
    if (autoRotate && activePromotions.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % activePromotions.length)
      }, rotationInterval)

      return () => clearInterval(interval)
    }
  }, [autoRotate, activePromotions.length, rotationInterval])

  // Countdown timer
  useEffect(() => {
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
  }, [activePromotions])

  if (activePromotions.length === 0) {
    return null
  }

  const currentPromotion = activePromotions[currentIndex]

  return (
    <section className="relative overflow-hidden">
      <div className={`bg-gradient-to-r ${currentPromotion.backgroundColor || 'from-blue-600 to-purple-700'} transition-all duration-1000`}>
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