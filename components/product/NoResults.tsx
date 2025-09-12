'use client'

import React from 'react'
import { Search, RefreshCw, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface NoResultsProps {
  query?: string
  onClearFilters?: () => void
  onNewSearch?: (query: string) => void
  hasActiveFilters?: boolean
  suggestions?: string[]
}

export const NoResults: React.FC<NoResultsProps> = ({
  query,
  onClearFilters,
  onNewSearch,
  hasActiveFilters = false,
  suggestions = []
}) => {
  const popularSearches = [
    'Nike shoes',
    'Summer dresses',
    'Denim jackets',
    'Sneakers',
    'Handbags',
    'T-shirts'
  ]

  const searchTips = [
    'Check your spelling',
    'Try more general keywords',
    'Use fewer filters',
    'Try different product categories'
  ]

  return (
    <div className="text-center py-12 px-4">
      {/* Icon */}
      <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
        <Search className="h-12 w-12 text-gray-400" />
      </div>

      {/* Main message */}
      <h3 className="text-2xl font-semibold text-gray-900 mb-2">
        {query ? `No results found for "${query}"` : 'No products found'}
      </h3>
      
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        {hasActiveFilters 
          ? "We couldn't find any products matching your current filters. Try adjusting your search criteria."
          : "We couldn't find any products matching your search. Try different keywords or browse our categories."
        }
      </p>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        {hasActiveFilters && onClearFilters && (
          <Button onClick={onClearFilters} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear All Filters
          </Button>
        )}
        
        <Button 
          onClick={() => window.location.href = '/'}
          variant="primary"
        >
          Browse All Products
        </Button>
      </div>

      {/* Search suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-8">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Did you mean?</h4>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => onNewSearch?.(suggestion)}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors text-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Popular searches */}
      <div className="mb-8">
        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 mr-2" />
          Popular Searches
        </h4>
        <div className="flex flex-wrap justify-center gap-2">
          {popularSearches.map((search, index) => (
            <button
              key={index}
              onClick={() => onNewSearch?.(search)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors text-sm"
            >
              {search}
            </button>
          ))}
        </div>
      </div>

      {/* Search tips */}
      <div className="max-w-md mx-auto">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Search Tips</h4>
        <ul className="text-left space-y-2 text-gray-600">
          {searchTips.map((tip, index) => (
            <li key={index} className="flex items-start">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Categories */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Browse by Category</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-lg mx-auto">
          {[
            { name: 'Clothing', href: '/search?category=clothing' },
            { name: 'Shoes', href: '/search?category=shoes' },
            { name: 'Accessories', href: '/search?category=accessories' },
            { name: 'Bags', href: '/search?category=bags' },
            { name: 'Jewelry', href: '/search?category=jewelry' },
            { name: 'Sale Items', href: '/search?sale=true' }
          ].map((category) => (
            <a
              key={category.name}
              href={category.href}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-center"
            >
              <span className="text-gray-900 font-medium">{category.name}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}