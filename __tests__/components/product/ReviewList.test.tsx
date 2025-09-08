import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ReviewList from '@/components/product/ReviewList'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock fetch
global.fetch = vi.fn()

const mockReviewsResponse = {
  reviews: [
    {
      id: '1',
      rating: 5,
      title: 'Excellent product',
      comment: 'Love it!',
      isVerifiedPurchase: true,
      helpfulVotes: 10,
      createdAt: '2024-01-15T10:00:00Z',
      author: 'John D.'
    },
    {
      id: '2',
      rating: 4,
      title: 'Good quality',
      comment: 'Nice product overall',
      isVerifiedPurchase: false,
      helpfulVotes: 5,
      createdAt: '2024-01-14T10:00:00Z',
      author: 'Jane S.'
    }
  ],
  pagination: {
    currentPage: 1,
    totalPages: 2,
    totalCount: 15,
    hasNextPage: true,
    hasPrevPage: false,
    limit: 10
  },
  summary: {
    averageRating: 4.3,
    totalReviews: 15,
    ratingDistribution: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 }
  }
}

describe('ReviewList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    ;(fetch as any).mockImplementation(() => new Promise(() => {}))
    
    render(<ReviewList productId="product-1" />)
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
  })

  it('fetches and displays reviews', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReviewsResponse
    })
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Excellent product')).toBeInTheDocument()
      expect(screen.getByText('Good quality')).toBeInTheDocument()
    })
    
    expect(fetch).toHaveBeenCalledWith('/api/reviews/product/product-1?page=1&limit=10&sortBy=newest')
  })

  it('displays review summary', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReviewsResponse
    })
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('4.3')).toBeInTheDocument()
      expect(screen.getByText('15 reviews')).toBeInTheDocument()
    })
  })

  it('handles sort option changes', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReviewsResponse
    })
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Excellent product')).toBeInTheDocument()
    })
    
    // Change sort option
    const sortSelect = screen.getByLabelText('Sort by:')
    fireEvent.change(sortSelect, { target: { value: 'most-helpful' } })
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/reviews/product/product-1?page=1&limit=10&sortBy=most-helpful')
    })
  })

  it('handles verified purchase filter', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReviewsResponse
    })
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Excellent product')).toBeInTheDocument()
    })
    
    // Toggle verified purchase filter
    const verifiedCheckbox = screen.getByLabelText('Verified purchases only')
    fireEvent.click(verifiedCheckbox)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/reviews/product/product-1?page=1&limit=10&sortBy=newest&verified=true')
    })
  })

  it('handles rating filter from summary', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReviewsResponse
    })
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Excellent product')).toBeInTheDocument()
    })
    
    // Click on 5-star filter in summary
    const fiveStarButton = screen.getByRole('button', { name: /5.*5/ })
    fireEvent.click(fiveStarButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/reviews/product/product-1?page=1&limit=10&sortBy=newest&rating=5')
    })
  })

  it('displays load more button when there are more pages', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReviewsResponse
    })
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Load More Reviews')).toBeInTheDocument()
    })
  })

  it('loads more reviews when load more is clicked', async () => {
    ;(fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviewsResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockReviewsResponse,
          reviews: [
            {
              id: '3',
              rating: 3,
              title: 'Average product',
              comment: 'It\'s okay',
              isVerifiedPurchase: true,
              helpfulVotes: 2,
              createdAt: '2024-01-13T10:00:00Z',
              author: 'Bob M.'
            }
          ],
          pagination: {
            ...mockReviewsResponse.pagination,
            currentPage: 2,
            hasNextPage: false
          }
        })
      })
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Load More Reviews')).toBeInTheDocument()
    })
    
    const loadMoreButton = screen.getByText('Load More Reviews')
    fireEvent.click(loadMoreButton)
    
    await waitFor(() => {
      expect(screen.getByText('Average product')).toBeInTheDocument()
    })
    
    expect(fetch).toHaveBeenCalledWith('/api/reviews/product/product-1?page=2&limit=10&sortBy=newest')
  })

  it('handles helpful vote', async () => {
    ;(fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviewsResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Helpful (10)')).toBeInTheDocument()
    })
    
    const helpfulButton = screen.getByText('Helpful (10)')
    fireEvent.click(helpfulButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/reviews/1/helpful', {
        method: 'POST'
      })
    })
  })

  it('handles report review', async () => {
    ;(fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockReviewsResponse
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
    
    // Mock window.confirm and alert
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getAllByText('Report')[0]).toBeInTheDocument()
    })
    
    const reportButton = screen.getAllByText('Report')[0]
    fireEvent.click(reportButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/reviews/1/report', {
        method: 'POST'
      })
    })
    
    confirmSpy.mockRestore()
    alertSpy.mockRestore()
  })

  it('displays no reviews message when empty', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockReviewsResponse,
        reviews: [],
        summary: {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        }
      })
    })
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('No reviews found')).toBeInTheDocument()
    })
  })

  it('handles fetch error', async () => {
    ;(fetch as any).mockRejectedValueOnce(new Error('Network error'))
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('displays results count', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockReviewsResponse
    })
    
    render(<ReviewList productId="product-1" />)
    
    await waitFor(() => {
      expect(screen.getByText('Showing 2 of 15 reviews')).toBeInTheDocument()
    })
  })
})