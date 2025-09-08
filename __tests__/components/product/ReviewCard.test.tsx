import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ReviewCard from '@/components/product/ReviewCard'

const mockReview = {
  id: '1',
  rating: 4,
  title: 'Great product!',
  comment: 'I really love this product. It exceeded my expectations.',
  isVerifiedPurchase: true,
  helpfulVotes: 5,
  createdAt: '2024-01-15T10:00:00Z',
  author: 'John D.'
}

describe('ReviewCard', () => {
  it('renders review information correctly', () => {
    render(<ReviewCard review={mockReview} />)
    
    expect(screen.getByText('Great product!')).toBeInTheDocument()
    expect(screen.getByText('I really love this product. It exceeded my expectations.')).toBeInTheDocument()
    expect(screen.getByText('John D.')).toBeInTheDocument()
    expect(screen.getByText('Verified Purchase')).toBeInTheDocument()
    expect(screen.getByText('Helpful (5)')).toBeInTheDocument()
  })

  it('displays correct number of stars for rating', () => {
    render(<ReviewCard review={mockReview} />)
    
    const starElements = document.querySelectorAll('svg')
    // Should have 5 star elements
    expect(starElements.length).toBeGreaterThanOrEqual(5)
  })

  it('shows verified purchase badge when applicable', () => {
    render(<ReviewCard review={mockReview} />)
    
    expect(screen.getByText('Verified Purchase')).toBeInTheDocument()
  })

  it('does not show verified purchase badge for unverified reviews', () => {
    const unverifiedReview = { ...mockReview, isVerifiedPurchase: false }
    render(<ReviewCard review={unverifiedReview} />)
    
    expect(screen.queryByText('Verified Purchase')).not.toBeInTheDocument()
  })

  it('handles helpful vote click', async () => {
    const onHelpfulVote = vi.fn().mockResolvedValue(undefined)
    render(<ReviewCard review={mockReview} onHelpfulVote={onHelpfulVote} />)
    
    const helpfulButton = screen.getByRole('button', { name: /helpful/i })
    fireEvent.click(helpfulButton)
    
    await waitFor(() => {
      expect(onHelpfulVote).toHaveBeenCalledWith('1')
    })
  })

  it('handles report click with confirmation', async () => {
    const onReport = vi.fn()
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    
    render(<ReviewCard review={mockReview} onReport={onReport} />)
    
    const reportButton = screen.getByRole('button', { name: /report/i })
    fireEvent.click(reportButton)
    
    expect(onReport).toHaveBeenCalledWith('1')
    
    confirmSpy.mockRestore()
  })

  it('prevents multiple helpful votes', async () => {
    const onHelpfulVote = vi.fn().mockResolvedValue(undefined)
    render(<ReviewCard review={mockReview} onHelpfulVote={onHelpfulVote} />)
    
    const helpfulButton = screen.getByRole('button', { name: /helpful/i })
    
    // Click multiple times
    fireEvent.click(helpfulButton)
    fireEvent.click(helpfulButton)
    
    await waitFor(() => {
      expect(onHelpfulVote).toHaveBeenCalledTimes(1)
    })
  })

  it('displays relative time correctly', () => {
    render(<ReviewCard review={mockReview} />)
    
    // Should show relative time like "X days ago"
    expect(screen.getByText(/ago$/)).toBeInTheDocument()
  })

  it('renders without title when not provided', () => {
    const reviewWithoutTitle = { ...mockReview, title: undefined }
    render(<ReviewCard review={reviewWithoutTitle} />)
    
    expect(screen.queryByText('Great product!')).not.toBeInTheDocument()
    expect(screen.getByText('I really love this product. It exceeded my expectations.')).toBeInTheDocument()
  })

  it('renders without comment when not provided', () => {
    const reviewWithoutComment = { ...mockReview, comment: undefined }
    render(<ReviewCard review={reviewWithoutComment} />)
    
    expect(screen.getByText('Great product!')).toBeInTheDocument()
    expect(screen.queryByText('I really love this product. It exceeded my expectations.')).not.toBeInTheDocument()
  })

  it('handles loading state for helpful vote', async () => {
    const onHelpfulVote = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    render(<ReviewCard review={mockReview} onHelpfulVote={onHelpfulVote} />)
    
    const helpfulButton = screen.getByRole('button', { name: /helpful/i })
    fireEvent.click(helpfulButton)
    
    // Button should be disabled during loading
    expect(helpfulButton).toBeDisabled()
    
    await waitFor(() => {
      expect(onHelpfulVote).toHaveBeenCalled()
    })
  })
})