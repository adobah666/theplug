'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'

interface HeroProps {
  featuredProducts?: Array<{
    id: string
    name: string
    price: number
    image: string
    href: string
  }>
}

const Hero: React.FC<HeroProps> = ({ featuredProducts = [] }) => {
  return (
    <section className="relative bg-white text-gray-900 overflow-hidden">
      {/* Subtle background accents */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-32 -left-24 w-96 h-96 bg-gradient-to-tr from-indigo-50 to-pink-50 rounded-full blur-3xl"></div>

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Discover Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Perfect Style</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl">
              Explore our curated collection of fashion-forward clothing, shoes, and accessories. 
              From everyday essentials to statement pieces, find everything you need to express your unique style.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700">
                <Link href="/search">Shop Now</Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-gray-300 text-gray-800 hover:bg-gray-100"
              >
                <Link href="/new-arrivals">New Arrivals</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-4 text-center lg:text-left">
              <div>
                <div className="text-2xl font-bold text-indigo-600">10K+</div>
                <div className="text-sm text-gray-500">Products</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-600">50K+</div>
                <div className="text-sm text-gray-500">Happy Customers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-600">24/7</div>
                <div className="text-sm text-gray-500">Support</div>
              </div>
            </div>
          </div>

          {/* Featured Products Preview */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4">
              {featuredProducts.slice(0, 4).map((product, index) => (
                <Link
                  key={product.id}
                  href={product.href}
                  className={`group relative overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 ${
                    index === 0 ? 'col-span-2' : ''
                  }`}
                >
                  <div className={`aspect-square ${index === 0 ? 'aspect-[2/1]' : ''}`}>
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="font-semibold text-white text-sm truncate">
                        {product.name}
                      </h3>
                      <p className="text-yellow-300 font-bold">
                        ₦{product.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-indigo-200 rounded-full opacity-30"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-200 rounded-full opacity-20"></div>
          </div>
        </div>
        {/* Optional: subtle scroll indicator */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
          <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  )
}

export { Hero }