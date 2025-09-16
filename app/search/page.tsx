import React, { Suspense } from 'react'
import { Metadata } from 'next'
import SearchResults from './SearchResults'

export const metadata: Metadata = {
  title: 'Search Products - Find Your Perfect Style | ThePlug',
  description: 'Search and filter through our extensive collection of fashion items including clothing, shoes, and accessories for men, women, and kids. Find exactly what you\'re looking for at ThePlug.',
  keywords: 'search products, fashion search, clothing search, shoes search, accessories search, filter products, ThePlug search',
  openGraph: {
    title: 'Search Products - Find Your Perfect Style | ThePlug',
    description: 'Search and filter through our extensive collection of fashion items including clothing, shoes, and accessories.',
    type: 'website',
    locale: 'en_GH',
    siteName: 'ThePlug',
    images: [
      {
        url: '/og-search.jpg',
        width: 1200,
        height: 630,
        alt: 'Search Products at ThePlug',
      },
    ],
    url: '/search',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search Products - Find Your Perfect Style | ThePlug',
    description: 'Search and filter through our extensive collection of fashion items.',
    images: ['/og-search.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/search',
  },
}

interface SearchPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default function SearchPage({ searchParams }: SearchPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<SearchPageSkeleton />}>
          <SearchResults searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  )
}

function SearchPageSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar skeleton */}
        <div className="lg:w-1/4">
          <div className="bg-white rounded-lg p-4 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="space-y-1">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="h-3 bg-gray-100 rounded w-full"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Results skeleton */}
        <div className="lg:w-3/4">
          {/* Sort bar skeleton */}
          <div className="flex justify-between items-center mb-6">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>

          {/* Products grid skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}