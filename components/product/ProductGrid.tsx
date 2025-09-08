import React from 'react'
import { ProductCard } from './ProductCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Button } from '@/components/ui/Button'
import { NoResults } from './NoResults'

interface Product {
  _id: string
  name: string
  description?: string
  price: number
  images: string[]
  category?: {
    _id: string
    name: string
    slug: string
  }
  brand: string
  rating: number
  reviewCount: number
  inventory: number
}

interface ProductGridProps {
  products: Product[]
  loading?: boolean
  isLoading?: boolean // Alternative prop name for compatibility
  error?: string
  onRetry?: () => void
  onAddToCart?: (productId: string) => void
  onAddToWishlist?: (productId: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loadingMore?: boolean
  className?: string
  viewMode?: 'grid' | 'list'
  query?: string
  hasActiveFilters?: boolean
  onClearFilters?: () => void
  onNewSearch?: (query: string) => void
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading = false,
  isLoading = false,
  error,
  onRetry,
  onAddToCart,
  onAddToWishlist,
  onLoadMore,
  hasMore = false,
  loadingMore = false,
  className = '',
  viewMode = 'grid',
  query,
  hasActiveFilters = false,
  onClearFilters,
  onNewSearch
}) => {
  const isLoadingState = loading || isLoading

  if (isLoadingState && products.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" text="Loading products..." />
      </div>
    )
  }

  if (error && products.length === 0) {
    return (
      <div className="py-12">
        <ErrorMessage
          title="Failed to load products"
          message={error}
          onRetry={onRetry}
        />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <NoResults
        query={query}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
        onNewSearch={onNewSearch}
      />
    )
  }

  const gridClasses = viewMode === 'grid' 
    ? 'grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4'
    : 'space-y-4'

  return (
    <div className={className}>
      {/* Products grid */}
      <div className={gridClasses}>
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            onAddToCart={onAddToCart}
            onAddToWishlist={onAddToWishlist}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore && onLoadMore && (
        <div className="mt-8 flex justify-center">
          <Button
            onClick={onLoadMore}
            loading={loadingMore}
            variant="outline"
            size="lg"
          >
            {loadingMore ? 'Loading...' : 'Load More Products'}
          </Button>
        </div>
      )}

      {/* Error message for load more */}
      {error && products.length > 0 && (
        <div className="mt-6">
          <ErrorMessage
            title="Failed to load more products"
            message={error}
            onRetry={onRetry}
          />
        </div>
      )}
    </div>
  )
}

export { ProductGrid }