'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import ReviewCard from './ReviewCard'
import ReviewSummary from './ReviewSummary'

interface Review {
  id: string
  rating: number
  title?: string
  comment?: string
  isVerifiedPurchase: boolean
  helpfulVotes: number
  createdAt: string
  author: string
}

interface ReviewSummaryData {
  averageRating: number
  totalReviews: number
  ratingDistribution: { [key: number]: number }
}

interface ReviewListProps {
  productId: string
  className?: string
}

type SortOption = 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating' | 'most-helpful'

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Most Recent' },
  { value: 'most-helpful', label: 'Most Helpful' },
  { value: 'highest-rating', label: 'Highest Rating' },
  { value: 'lowest-rating', label: 'Lowest Rating' },
  { value: 'oldest', label: 'Oldest' }
]

export const ReviewList: React.FC<ReviewListProps> = ({ productId, className = '' }) => {
  const [reviews, setReviews] = useState<Review[]>([])
  const [summary, setSummary] = useState<ReviewSummaryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // Filters
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [filterRating, setFilterRating] = useState<number | null>(null)
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)

  const fetchReviews = async (pageNum: number = 1, reset: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }
      
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '10',
        sortBy,
        ...(filterRating && { rating: filterRating.toString() }),
        ...(showVerifiedOnly && { verified: 'true' })
      })

      const response = await fetch(`/api/reviews/product/${productId}?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch reviews')
      }

      const data = await response.json()
      
      if (reset || pageNum === 1) {
        setReviews(data.reviews)
      } else {
        setReviews(prev => [...prev, ...data.reviews])
      }
      
      setSummary(data.summary)
      setHasMore(data.pagination.hasNextPage)
      setPage(pageNum)
      setError(null)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reviews')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Initial load and when filters change
  useEffect(() => {
    fetchReviews(1, true)
  }, [productId, sortBy, filterRating, showVerifiedOnly])

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchReviews(page + 1)
    }
  }

  const handleHelpfulVote = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to vote')
      }
      
      // Update the review in the list
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { ...review, helpfulVotes: review.helpfulVotes + 1 }
          : review
      ))
    } catch (err) {
      console.error('Error voting helpful:', err)
    }
  }

  const handleReport = async (reviewId: string) => {
    if (!confirm('Are you sure you want to report this review?')) {
      return
    }
    
    try {
      const response = await fetch(`/api/reviews/${reviewId}/report`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to report review')
      }
      
      alert('Review reported successfully')
    } catch (err) {
      console.error('Error reporting review:', err)
      alert('Failed to report review')
    }
  }

  const handleFilterByRating = (rating: number | null) => {
    setFilterRating(rating)
    setPage(1)
  }

  if (loading) {
    return (
      <div className={`flex justify-center py-8 ${className}`}>
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorMessage 
          message={error}
          onRetry={() => fetchReviews(1, true)}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Review Summary */}
      {summary && (
        <div className="mb-8">
          <ReviewSummary
            summary={summary}
            onFilterByRating={handleFilterByRating}
            selectedRating={filterRating}
          />
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          {/* Sort Dropdown */}
          <div className="flex items-center space-x-2">
            <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Verified Purchase Filter */}
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showVerifiedOnly}
              onChange={(e) => setShowVerifiedOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-700">Verified purchases only</span>
          </label>
        </div>

        {/* Results Count */}
        <div className="text-sm text-gray-600">
          {summary && (
            <>
              Showing {reviews.length} of {summary.totalReviews} reviews
              {filterRating && ` (${filterRating}-star)`}
            </>
          )}
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No reviews found
          </h3>
          <p className="text-gray-600">
            {filterRating || showVerifiedOnly 
              ? 'Try adjusting your filters to see more reviews.'
              : 'Be the first to review this product!'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-0 divide-y divide-gray-200 border border-gray-200 rounded-lg">
          {reviews.map((review) => (
            <div key={review.id} className="p-6">
              <ReviewCard
                review={review}
                onHelpfulVote={handleHelpfulVote}
                onReport={handleReport}
              />
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {hasMore && (
        <div className="text-center mt-8">
          <Button
            onClick={handleLoadMore}
            loading={loadingMore}
            variant="outline"
            size="lg"
          >
            Load More Reviews
          </Button>
        </div>
      )}
    </div>
  )
}

export default ReviewList