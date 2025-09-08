'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { formatDistanceToNow } from 'date-fns'

interface ReviewCardProps {
  review: {
    id: string
    rating: number
    title?: string
    comment?: string
    isVerifiedPurchase: boolean
    helpfulVotes: number
    createdAt: string
    author: string
  }
  onHelpfulVote?: (reviewId: string) => void
  onReport?: (reviewId: string) => void
}

const StarRating: React.FC<{ rating: number; size?: 'sm' | 'md' }> = ({ rating, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClasses} ${
            star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
          }`}
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  onHelpfulVote,
  onReport
}) => {
  const [isHelpfulLoading, setIsHelpfulLoading] = useState(false)
  const [hasVoted, setHasVoted] = useState(false)

  const handleHelpfulVote = async () => {
    if (hasVoted || !onHelpfulVote) return
    
    setIsHelpfulLoading(true)
    try {
      await onHelpfulVote(review.id)
      setHasVoted(true)
    } catch (error) {
      console.error('Error voting helpful:', error)
    } finally {
      setIsHelpfulLoading(false)
    }
  }

  const handleReport = () => {
    if (onReport) {
      onReport(review.id)
    }
  }

  return (
    <div className="border-b border-gray-200 py-6 last:border-b-0">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Rating and Author */}
          <div className="flex items-center space-x-3 mb-2">
            <StarRating rating={review.rating} />
            <span className="text-sm font-medium text-gray-900">{review.author}</span>
            {review.isVerifiedPurchase && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Verified Purchase
              </span>
            )}
          </div>

          {/* Review Title */}
          {review.title && (
            <h4 className="text-base font-medium text-gray-900 mb-2">
              {review.title}
            </h4>
          )}

          {/* Review Comment */}
          {review.comment && (
            <p className="text-gray-700 mb-3 leading-relaxed">
              {review.comment}
            </p>
          )}

          {/* Review Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>
                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
              </span>
              
              {/* Helpful Votes */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleHelpfulVote}
                  disabled={hasVoted || isHelpfulLoading}
                  className="text-gray-500 hover:text-gray-700 p-1 h-auto"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L9 7v13m-3-4h-2m-2-2h2m0 0V9a2 2 0 012-2h2" />
                  </svg>
                  Helpful ({review.helpfulVotes})
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReport}
                  className="text-gray-500 hover:text-red-600 p-1 h-auto"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                  </svg>
                  Report
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReviewCard