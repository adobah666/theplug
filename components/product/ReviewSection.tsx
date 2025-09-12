'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import ReviewList from './ReviewList'
import { ReviewForm } from './ReviewForm'
import { useAuth } from '@/lib/auth/context'

interface ReviewSectionProps {
  productId: string
  className?: string
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({
  productId,
  className = ''
}) => {
  const { session, status } = useAuth()
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleWriteReview = () => {
    if (status !== 'authenticated') {
      // Redirect to login or show login modal
      window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname)
      return
    }
    setShowReviewForm(true)
  }

  const handleReviewSubmitted = () => {
    setShowReviewForm(false)
    // Refresh the review list by changing the key
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className={className}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Customer Reviews
        </h2>
        <Button
          onClick={handleWriteReview}
          variant="primary"
          className="flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <span>Write a Review</span>
        </Button>
      </div>

      {/* Review List */}
      <ReviewList 
        key={refreshKey}
        productId={productId} 
      />

      {/* Review Form Modal */}
      <Modal
        isOpen={showReviewForm}
        onClose={() => setShowReviewForm(false)}
        title="Write a Review"
        size="lg"
      >
        <ReviewForm
          productId={productId}
          onSubmitted={handleReviewSubmitted}
        />
      </Modal>
    </div>
  )
}

export default ReviewSection