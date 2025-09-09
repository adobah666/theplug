'use client'

import React, { useState } from 'react'
import { Grid, List, SlidersHorizontal } from 'lucide-react'
import { SearchBar } from '@/components/product/SearchBar'
import { AdvancedFilters } from '@/components/product/AdvancedFilters'
import { MobileFilterDrawer } from '@/components/product/MobileFilterDrawer'
import { ProductGrid } from '@/components/product/ProductGrid'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { useSearch, useSearchResults } from '@/lib/search/hooks'

interface SearchResultsProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating_desc', label: 'Customer Rating' },
  { value: 'newest', label: 'Newest First' },
  { value: 'popularity', label: 'Most Popular' }
]

export default function SearchResults({ searchParams }: SearchResultsProps) {
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  
  // Use search hooks for state management
  const {
    searchState,
    updateSearch,
    clearFilters,
    removeFilter,
    setSort,
    setPage,
    setViewMode,
    activeFilterCount,
    bookmarkableUrl,
    error: searchError
  } = useSearch('/search')

  // Fetch search results
  const {
    results,
    totalResults,
    totalPages,
    currentPage,
    isLoading,
    error: resultsError,
    refetch
  } = useSearchResults(searchState)

  const error = searchError || resultsError

  // Handle sort change
  const handleSortChange = (newSort: string) => {
    // When selecting Relevance, clear sort/order to let the backend use full-text relevance
    if (newSort === 'relevance') {
      updateSearch({ sort: undefined, order: undefined })
      return
    }

    const [sortField, sortOrder] = newSort.includes('_')
      ? newSort.split('_')
      : [newSort, 'desc']
    setSort(sortField, sortOrder as 'asc' | 'desc')
  }

  // Handle pagination
  const handlePageChange = (page: number) => {
    setPage(page)
  }

  // Handle view mode change
  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode)
  }

  // Handle filter change
  const handleFilterChange = (filters: Record<string, any>) => {
    updateSearch(filters)
  }

  // Generate search results summary
  const getResultsSummary = () => {
    if (!results) return ''
    
    const limit = searchState.limit || 20
    const start = ((currentPage - 1) * limit) + 1
    const end = Math.min(currentPage * limit, totalResults)
    
    if (totalResults === 0) {
      return searchState.query ? `No results found for "${searchState.query}"` : 'No products found'
    }
    
    const baseText = `Showing ${start}-${end} of ${totalResults.toLocaleString()} results`
    return searchState.query ? `${baseText} for "${searchState.query}"` : baseText
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <ErrorMessage message={error} />
        <Button 
          onClick={refetch} 
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Search header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {searchState.query ? `Search Results` : 'All Products'}
        </h1>
        
        {/* Search bar */}
        <div className="max-w-2xl">
          <SearchBar />
        </div>
        
        {/* Results summary and bookmarkable URL */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="text-gray-600">
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Searching...</span>
              </div>
            ) : (
              getResultsSummary()
            )}
          </div>
          
          {/* Active filters indicator */}
          {activeFilterCount > 0 && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <span>{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Mobile filter toggle */}
        <div className="lg:hidden">
          <Button
            variant="outline"
            onClick={() => setShowMobileFilters(true)}
            className="w-full mb-4"
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Desktop Sidebar */}
        <div className="hidden lg:block lg:w-1/4">
          <AdvancedFilters 
            onFilterChange={handleFilterChange}
            isLoading={isLoading}
            searchQuery={searchState.query}
          />
        </div>

        {/* Mobile Filter Drawer */}
        <MobileFilterDrawer
          isOpen={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
          searchQuery={searchState.query}
        />

        {/* Main content */}
        <div className="lg:w-3/4">
          {/* Sort and view controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center space-x-4">
              {/* Sort dropdown */}
              <div className="flex items-center space-x-2">
                <label htmlFor="sort" className="text-sm font-medium text-gray-700">
                  Sort by:
                </label>
                <select
                  id="sort"
                  value={((): string => {
                    const s = searchState.sort
                    const o = searchState.order || 'desc'
                    if (!s) return 'relevance'
                    if (s === 'price') return o === 'asc' ? 'price_asc' : 'price_desc'
                    if (s === 'rating') return 'rating_desc'
                    if (s === 'newest' || s === 'createdAt' || s === 'date') return 'newest'
                    if (s === 'popularity') return 'popularity'
                    // Fallback
                    return 'relevance'
                  })()}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                >
                  {SORT_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center space-x-2">
              <Button
                variant={searchState.viewMode === 'grid' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('grid')}
                disabled={isLoading}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={searchState.viewMode === 'list' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleViewModeChange('list')}
                disabled={isLoading}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : results ? (
            <>
              <ProductGrid 
                products={results}
                viewMode={searchState.viewMode || 'grid'}
                isLoading={false}
                query={searchState.query}
                hasActiveFilters={activeFilterCount > 0}
                onClearFilters={clearFilters}
                onNewSearch={(newQuery) => updateSearch({ query: newQuery })}
              />
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <nav className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, currentPage - 2) + i
                      if (pageNum > totalPages) return null
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? 'primary' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                    </Button>
                  </nav>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}