'use client'

import React from 'react'

interface ReviewSummaryProps {
  summary: {
    averageRating: number
    totalReviews: number
    ratingDistribution: { [key: number]: number }
  }
  onFilterByRating?: (rating: number | null) => void
  selectedRating?: number | null
}

const StarRating: React.FC<{ rating: number; size?: 'sm' | 'md' | 'lg' }> = ({ 
  rating, 
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClasses[size]} ${
            star <= Math.floor(rating) 
              ? 'text-yellow-400 fill-current' 
              : star <= rating 
                ? 'text-yellow-400 fill-current opacity-50'
                : 'text-gray-300'
          }`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

const RatingBar: React.FC<{
  rating: number
  count: number
  total: number
  isSelected?: boolean
  onClick?: () => void
}> = ({ rating, count, total, isSelected, onClick }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center space-x-3 w-full text-left p-2 rounded hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border border-blue-200' : ''
      }`}
    >
      <span className="text-sm font-medium text-gray-700 w-6">
        {rating}
      </span>
      <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div
          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-gray-600 w-8 text-right">
        {count}
      </span>
    </button>
  )
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({
  summary,
  onFilterByRating,
  selectedRating
}) => {
  const { averageRating, totalReviews, ratingDistribution } = summary

  const handleRatingFilter = (rating: number) => {
    if (onFilterByRating) {
      // Toggle filter: if same rating is clicked, clear filter
      onFilterByRating(selectedRating === rating ? null : rating)
    }
  }

  const handleClearFilter = () => {
    if (onFilterByRating) {
      onFilterByRating(null)
    }
  }

  if (totalReviews === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-gray-500 mb-2">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.921-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <p className="text-lg font-medium">No reviews yet</p>
          <p className="text-sm">Be the first to review this product</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start space-x-6">
        {/* Overall Rating */}
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900 mb-1">
            {averageRating.toFixed(1)}
          </div>
          <StarRating rating={averageRating} size="lg" />
          <div className="text-sm text-gray-600 mt-2">
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1">
          <div className="space-y-1">
            {[5, 4, 3, 2, 1].map((rating) => (
              <RatingBar
                key={rating}
                rating={rating}
                count={ratingDistribution[rating] || 0}
                total={totalReviews}
                isSelected={selectedRating === rating}
                onClick={() => handleRatingFilter(rating)}
              />
            ))}
          </div>
          
          {selectedRating && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Showing {selectedRating}-star reviews
              </span>
              <button
                onClick={handleClearFilter}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Show all reviews
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReviewSummary