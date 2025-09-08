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
    <section className="relative bg-gradient-to-r from-blue-600 to-purple-700 text-white overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-repeat" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
      </div>
      
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-24 lg:py-32">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Discover Your
              <span className="block text-yellow-300">Perfect Style</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-blue-100 max-w-2xl">
              Explore our curated collection of fashion-forward clothing, shoes, and accessories. 
              From everyday essentials to statement pieces, find everything you need to express your unique style.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                <Link href="/search">Shop Now</Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="border-white text-white hover:bg-white hover:text-blue-600"
              >
                <Link href="/new-arrivals">New Arrivals</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-12 grid grid-cols-3 gap-4 text-center lg:text-left">
              <div>
                <div className="text-2xl font-bold text-yellow-300">10K+</div>
                <div className="text-sm text-blue-100">Products</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-300">50K+</div>
                <div className="text-sm text-blue-100">Happy Customers</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-300">24/7</div>
                <div className="text-sm text-blue-100">Support</div>
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
                  className={`group relative overflow-hidden rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 ${
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
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
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
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-yellow-300 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-pink-300 rounded-full opacity-10 animate-pulse delay-1000"></div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  )
}

export { Hero }