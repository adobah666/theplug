"use client"

import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface ReviewFormProps {
  productId: string
  existingRating?: number
  existingTitle?: string
  existingComment?: string
  onSubmitted?: () => Promise<void> | void
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ productId, existingRating, existingTitle = '', existingComment = '', onSubmitted }) => {
  const [rating, setRating] = useState<number>(existingRating || 5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [title, setTitle] = useState<string>(existingTitle)
  const [comment, setComment] = useState<string>(existingComment)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating, title: title?.trim() || undefined, comment: comment?.trim() || undefined })
      })
      const data = await res.json()
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to submit review')
      }
      setSuccess('Review submitted successfully')
      if (onSubmitted) await onSubmitted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating</label>
        <div className="flex items-center space-x-1">
          {[1,2,3,4,5].map((value) => (
            <button
              key={value}
              type="button"
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(null)}
              onClick={() => setRating(value)}
              aria-label={`${value} star`}
              className="p-0.5"
            >
              <Star className={`w-6 h-6 ${ (hoverRating ?? rating) >= value ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
            </button>
          ))}
          <span className="ml-2 text-sm text-gray-600">{rating} / 5</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Summarize your review"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={4}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Share details about the fit, quality, and your experience"
        />
      </div>

      {error && <div className="text-sm text-red-600">{error}</div>}
      {success && <div className="text-sm text-green-600">{success}</div>}

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  )
}