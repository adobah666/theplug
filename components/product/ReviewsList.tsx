"use client"

import React from 'react'
import { Star } from 'lucide-react'

export interface ReviewItem {
  _id: string
  userId: string | { _id: string; name?: string; email?: string }
  rating: number
  title?: string
  comment?: string
  isVerifiedPurchase?: boolean
  createdAt: string
}

interface ReviewsListProps {
  reviews: ReviewItem[]
  className?: string
}

const Stars: React.FC<{ value: number }> = ({ value }) => (
  <div className="flex items-center">
    {[...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(value) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ))}
  </div>
)

export const ReviewsList: React.FC<ReviewsListProps> = ({ reviews, className = '' }) => {
  if (!reviews || reviews.length === 0) {
    return (
      <div className={`text-sm text-gray-600 ${className}`}>No reviews yet. Be the first to review this product.</div>
    )
  }

  return (
    <div className={className}>
      <ul className="space-y-6">
        {reviews.map((r) => (
          <li key={r._id} className="border-b pb-6 last:border-b-0">
            <div className="flex items-center justify-between">
              <Stars value={r.rating} />
              <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
            </div>
            {r.title && (
              <h4 className="mt-2 text-sm font-semibold text-gray-900">{r.title}</h4>
            )}
            {r.comment && (
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{r.comment}</p>
            )}
            {r.isVerifiedPurchase && (
              <span className="mt-2 inline-flex items-center text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded">
                Verified Purchase
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
