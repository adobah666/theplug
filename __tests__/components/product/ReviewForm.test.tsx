import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ReviewForm from '@/components/product/ReviewForm'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { it } from 'zod/locales'
import { beforeEach } from 'node:test'
import { describe } from 'node:test'

// Mock fetch
global.fetch = vi.fn()

describe('ReviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders form elements correctly', () => {
    render(<ReviewForm productId="product-1" />)
    
    expect(screen.getByText('Write a Review')).toBeInTheDocument()
    expect(screen.getByText('Rating *')).toBeInTheDocument()
    expect(screen.getByLabelText('Review Title (Optional)')).toBeInTheDocument()
    expect(screen.getByLabelText('Your Review (Optional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit Review' })).toBeInTheDocument()
  })

  it('allows rating selection', () => {
    render(<ReviewForm productId="product-1" />)
    
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    
    // Click on 4th star
    fireEvent.click(stars[3])
    
    expect(screen.getByText('4 stars - Very Good')).toBeInTheDocument()
  })

  it('shows rating descriptions', () => {
    render(<ReviewForm productId="product-1" />)
    
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    
    fireEvent.click(stars[0]) // 1 star
    expect(screen.getByText('1 star - Poor')).toBeInTheDocument()
    
    fireEvent.click(stars[1]) // 2 stars
    expect(screen.getByText('2 stars - Fair')).toBeInTheDocument()
    
    fireEvent.click(stars[2]) // 3 stars
    expect(screen.getByText('3 stars - Good')).toBeInTheDocument()
    
    fireEvent.click(stars[3]) // 4 stars
    expect(screen.getByText('4 stars - Very Good')).toBeInTheDocument()
    
    fireEvent.click(stars[4]) // 5 stars
    expect(screen.getByText('5 stars - Excellent')).toBeInTheDocument()
  })

  it('validates required rating', () => {
    render(<ReviewForm productId="product-1" />)
    
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    
    // Button should be disabled when no rating is selected
    expect(submitButton).toBeDisabled()
  })

  it('validates that either title or comment is provided', async () => {
    render(<ReviewForm productId="product-1" />)
    
    // Select rating but leave title and comment empty
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(stars[4]) // 5 stars
    
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getAllByText('Please provide either a title or comment')).toHaveLength(2)
    })
  })

  it('validates title length', async () => {
    render(<ReviewForm productId="product-1" />)
    
    // First select a rating to enable submission
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(stars[4]) // 5 stars
    
    const titleInput = screen.getByLabelText('Review Title (Optional)')
    const longTitle = 'a'.repeat(101) // Exceeds 100 character limit
    
    fireEvent.change(titleInput, { target: { value: longTitle } })
    
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Title cannot exceed 100 characters/)).toBeInTheDocument()
    })
  })

  it('validates comment length', async () => {
    render(<ReviewForm productId="product-1" />)
    
    // First select a rating to enable submission
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(stars[4]) // 5 stars
    
    const commentInput = screen.getByLabelText('Your Review (Optional)')
    const longComment = 'a'.repeat(2001) // Exceeds 2000 character limit
    
    fireEvent.change(commentInput, { target: { value: longComment } })
    
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Comment cannot exceed 2000 characters/)).toBeInTheDocument()
    })
  })

  it('shows character counts', () => {
    render(<ReviewForm productId="product-1" />)
    
    const titleInput = screen.getByLabelText('Review Title (Optional)')
    const commentInput = screen.getByLabelText('Your Review (Optional)')
    
    fireEvent.change(titleInput, { target: { value: 'Great product' } })
    fireEvent.change(commentInput, { target: { value: 'I love this product!' } })
    
    expect(screen.getByText('13/100 characters')).toBeInTheDocument()
    expect(screen.getByText('20/2000 characters')).toBeInTheDocument()
  })

  it('submits review successfully', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Review submitted successfully' })
    })
    
    render(<ReviewForm productId="product-1" />)
    
    // Fill out form
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(stars[4]) // 5 stars
    
    const titleInput = screen.getByLabelText('Review Title (Optional)')
    const commentInput = screen.getByLabelText('Your Review (Optional)')
    
    fireEvent.change(titleInput, { target: { value: 'Excellent product' } })
    fireEvent.change(commentInput, { target: { value: 'I highly recommend this product!' } })
    
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: 'product-1',
          rating: 5,
          title: 'Excellent product',
          comment: 'I highly recommend this product!'
        })
      })
    })
    
    await waitFor(() => {
      expect(screen.getByText('Review Submitted Successfully!')).toBeInTheDocument()
    })
  })

  it('handles submission error', async () => {
    ;(fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'You have already reviewed this product' })
    })
    
    render(<ReviewForm productId="product-1" />)
    
    // Fill out form
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(stars[4]) // 5 stars
    
    const titleInput = screen.getByLabelText('Review Title (Optional)')
    fireEvent.change(titleInput, { target: { value: 'Great product' } })
    
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('You have already reviewed this product')).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    ;(fetch as any).mockImplementation(() => new Promise(resolve => 
      setTimeout(() => resolve({
        ok: true,
        json: async () => ({ message: 'Success' })
      }), 100)
    ))
    
    render(<ReviewForm productId="product-1" />)
    
    // Fill out form
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(stars[4]) // 5 stars
    
    const titleInput = screen.getByLabelText('Review Title (Optional)')
    fireEvent.change(titleInput, { target: { value: 'Great product' } })
    
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    fireEvent.click(submitButton)
    
    // Should show loading state
    expect(submitButton).toBeDisabled()
    
    await waitFor(() => {
      expect(screen.getByText('Review Submitted Successfully!')).toBeInTheDocument()
    })
  })

  it('calls onSubmitSuccess callback', async () => {
    const onSubmitSuccess = vi.fn()
    ;(fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Success' })
    })
    
    render(<ReviewForm productId="product-1" onSubmitSuccess={onSubmitSuccess} />)
    
    // Fill out and submit form
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(stars[4]) // 5 stars
    
    const titleInput = screen.getByLabelText('Review Title (Optional)')
    fireEvent.change(titleInput, { target: { value: 'Great product' } })
    
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Review Submitted Successfully!')).toBeInTheDocument()
    })
    
    // Wait for callback to be called (after 2 second delay)
    await waitFor(() => {
      expect(onSubmitSuccess).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('calls onCancel callback', () => {
    const onCancel = vi.fn()
    render(<ReviewForm productId="product-1" onCancel={onCancel} />)
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelButton)
    
    expect(onCancel).toHaveBeenCalled()
  })

  it('disables submit button when no rating selected', () => {
    render(<ReviewForm productId="product-1" />)
    
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    expect(submitButton).toBeDisabled()
  })

  it('enables submit button when rating is selected', () => {
    render(<ReviewForm productId="product-1" />)
    
    const stars = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    fireEvent.click(stars[4]) // 5 stars
    
    const submitButton = screen.getByRole('button', { name: 'Submit Review' })
    expect(submitButton).not.toBeDisabled()
  })

  it('displays review guidelines', () => {
    render(<ReviewForm productId="product-1" />)
    
    expect(screen.getByText('Review Guidelines')).toBeInTheDocument()
    expect(screen.getByText(/Be honest and helpful in your review/)).toBeInTheDocument()
    expect(screen.getByText(/Focus on the product features and your experience/)).toBeInTheDocument()
  })
})