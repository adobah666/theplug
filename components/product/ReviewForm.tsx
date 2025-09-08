'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

interface ReviewFormProps {
  productId: string
  onSubmitSuccess?: () => void
  onCancel?: () => void
  className?: string
}

interface ReviewFormData {
  rating: number
  title: string
  comment: string
}

const StarRatingInput: React.FC<{
  rating: number
  onRatingChange: (rating: number) => void
  error?: string
}> = ({ rating, onRatingChange, error }) => {
  const [hoverRating, setHoverRating] = useState(0)

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Rating *
      </label>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <svg
              className={`w-8 h-8 transition-colors ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        <span className="ml-3 text-sm text-gray-600">
          {rating > 0 && (
            <>
              {rating} star{rating !== 1 ? 's' : ''} - {
                rating === 1 ? 'Poor' :
                rating === 2 ? 'Fair' :
                rating === 3 ? 'Good' :
                rating === 4 ? 'Very Good' :
                'Excellent'
              }
            </>
          )}
        </span>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  productId,
  onSubmitSuccess,
  onCancel,
  className = ''
}) => {
  const [formData, setFormData] = useState<ReviewFormData>({
    rating: 0,
    title: '',
    comment: ''
  })
  const [errors, setErrors] = useState<Partial<ReviewFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: Partial<ReviewFormData> = {}

    if (formData.rating === 0) {
      newErrors.rating = 'Please select a rating'
    }

    if (!formData.title.trim() && !formData.comment.trim()) {
      newErrors.title = 'Please provide either a title or comment'
      newErrors.comment = 'Please provide either a title or comment'
    }

    if (formData.title.length > 100) {
      newErrors.title = 'Title cannot exceed 100 characters'
    }

    if (formData.comment.length > 2000) {
      newErrors.comment = 'Comment cannot exceed 2000 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId,
          rating: formData.rating,
          title: formData.title.trim() || undefined,
          comment: formData.comment.trim() || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review')
      }

      setSubmitSuccess(true)
      
      // Reset form
      setFormData({
        rating: 0,
        title: '',
        comment: ''
      })
      setErrors({})

      // Call success callback after a short delay to show success message
      setTimeout(() => {
        if (onSubmitSuccess) {
          onSubmitSuccess()
        }
      }, 2000)

    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRatingChange = (rating: number) => {
    setFormData(prev => ({ ...prev, rating }))
    if (errors.rating) {
      setErrors(prev => ({ ...prev, rating: undefined }))
    }
  }

  const handleInputChange = (field: keyof ReviewFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (submitSuccess) {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-6 text-center ${className}`}>
        <div className="flex items-center justify-center mb-4">
          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-green-900 mb-2">
          Review Submitted Successfully!
        </h3>
        <p className="text-green-700 mb-4">
          Thank you for your review. It will be published after moderation.
        </p>
        {onCancel && (
          <Button onClick={onCancel} variant="outline">
            Close
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-6">
        Write a Review
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating Input */}
        <StarRatingInput
          rating={formData.rating}
          onRatingChange={handleRatingChange}
          error={errors.rating}
        />

        {/* Title Input */}
        <div>
          <label htmlFor="review-title" className="block text-sm font-medium text-gray-700 mb-2">
            Review Title (Optional)
          </label>
          <Input
            id="review-title"
            type="text"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="Summarize your experience..."
            maxLength={100}
            error={errors.title}
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.title.length}/100 characters
          </p>
        </div>

        {/* Comment Input */}
        <div>
          <label htmlFor="review-comment" className="block text-sm font-medium text-gray-700 mb-2">
            Your Review (Optional)
          </label>
          <textarea
            id="review-comment"
            value={formData.comment}
            onChange={(e) => handleInputChange('comment', e.target.value)}
            placeholder="Tell others about your experience with this product..."
            rows={5}
            maxLength={2000}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.comment ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {errors.comment && (
            <p className="text-sm text-red-600 mt-1">{errors.comment}</p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            {formData.comment.length}/2000 characters
          </p>
        </div>

        {/* Submit Error */}
        {submitError && (
          <ErrorMessage message={submitError} />
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={formData.rating === 0}
          >
            Submit Review
          </Button>
        </div>
      </form>

      {/* Guidelines */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Review Guidelines
        </h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Be honest and helpful in your review</li>
          <li>• Focus on the product features and your experience</li>
          <li>• Avoid inappropriate language or personal information</li>
          <li>• Reviews are moderated and may take time to appear</li>
        </ul>
      </div>
    </div>
  )
}

export default ReviewForm