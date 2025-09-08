'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'

interface Testimonial {
  id: string
  name: string
  role?: string
  location?: string
  avatar?: string
  rating: number
  content: string
  productPurchased?: string
  date?: Date
}

interface TestimonialsProps {
  testimonials?: Testimonial[]
  title?: string
  subtitle?: string
  autoRotate?: boolean
  rotationInterval?: number
}

const Testimonials: React.FC<TestimonialsProps> = ({
  testimonials = [],
  title = "What Our Customers Say",
  subtitle = "Don't just take our word for it - hear from our satisfied customers",
  autoRotate = true,
  rotationInterval = 6000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Default testimonials if none provided
  const defaultTestimonials: Testimonial[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      role: 'Fashion Blogger',
      location: 'Lagos, Nigeria',
      avatar: '/images/avatars/sarah.jpg',
      rating: 5,
      content: "ThePlug has completely transformed my wardrobe! The quality is exceptional and the styles are always on-trend. I've received so many compliments on pieces I've bought here.",
      productPurchased: 'Summer Dress Collection',
      date: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'Michael Chen',
      role: 'Creative Director',
      location: 'Abuja, Nigeria',
      avatar: '/images/avatars/michael.jpg',
      rating: 5,
      content: "As someone who values both style and quality, ThePlug delivers on both fronts. The customer service is outstanding and shipping is always fast. Highly recommend!",
      productPurchased: 'Business Casual Collection',
      date: new Date('2024-01-20')
    },
    {
      id: '3',
      name: 'Aisha Okafor',
      role: 'Marketing Manager',
      location: 'Port Harcourt, Nigeria',
      avatar: '/images/avatars/aisha.jpg',
      rating: 5,
      content: "I love how ThePlug makes fashion accessible. The variety is amazing and I can always find something that fits my style and budget. The return policy is also very fair.",
      productPurchased: 'Accessories Bundle',
      date: new Date('2024-01-25')
    },
    {
      id: '4',
      name: 'David Adebayo',
      role: 'Software Engineer',
      location: 'Ibadan, Nigeria',
      avatar: '/images/avatars/david.jpg',
      rating: 4,
      content: "Great selection of men's fashion. The sizing guide is accurate and the quality exceeds expectations for the price point. Will definitely shop here again.",
      productPurchased: 'Casual Wear Set',
      date: new Date('2024-02-01')
    }
  ]

  const displayTestimonials = testimonials.length > 0 ? testimonials : defaultTestimonials

  // Auto-rotation
  useEffect(() => {
    if (autoRotate && displayTestimonials.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % displayTestimonials.length)
      }, rotationInterval)

      return () => clearInterval(interval)
    }
  }, [autoRotate, displayTestimonials.length, rotationInterval])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <svg
        key={index}
        className={`w-5 h-5 ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ))
  }

  if (displayTestimonials.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-4">
            {title}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Testimonials */}
        <div className="relative">
          {/* Main Testimonial */}
          <div className="bg-gray-50 rounded-2xl p-8 md:p-12 mb-8">
            <div className="max-w-4xl mx-auto text-center">
              {/* Quote */}
              <div className="mb-8">
                <svg className="w-12 h-12 text-blue-600 mx-auto mb-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" />
                </svg>
                <blockquote className="text-xl md:text-2xl text-gray-900 font-medium leading-relaxed">
                  "{displayTestimonials[currentIndex].content}"
                </blockquote>
              </div>

              {/* Rating */}
              <div className="flex justify-center mb-6">
                {renderStars(displayTestimonials[currentIndex].rating)}
              </div>

              {/* Customer Info */}
              <div className="flex items-center justify-center space-x-4">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                  {displayTestimonials[currentIndex].avatar ? (
                    <Image
                      src={displayTestimonials[currentIndex].avatar!}
                      alt={displayTestimonials[currentIndex].name}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-gray-600 font-semibold text-lg">
                      {displayTestimonials[currentIndex].name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">
                    {displayTestimonials[currentIndex].name}
                  </div>
                  <div className="text-sm text-gray-600">
                    {displayTestimonials[currentIndex].role}
                    {displayTestimonials[currentIndex].location && (
                      <span> • {displayTestimonials[currentIndex].location}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Purchased */}
              {displayTestimonials[currentIndex].productPurchased && (
                <div className="mt-4 text-sm text-gray-500">
                  Purchased: {displayTestimonials[currentIndex].productPurchased}
                </div>
              )}
            </div>
          </div>

          {/* Navigation Dots */}
          {displayTestimonials.length > 1 && (
            <div className="flex justify-center space-x-2">
              {displayTestimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'bg-blue-600 scale-125' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                  aria-label={`View testimonial ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">50K+</div>
            <div className="text-sm text-gray-600 mt-1">Happy Customers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">4.8</div>
            <div className="text-sm text-gray-600 mt-1">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">10K+</div>
            <div className="text-sm text-gray-600 mt-1">Reviews</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">99%</div>
            <div className="text-sm text-gray-600 mt-1">Satisfaction Rate</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export { Testimonials }