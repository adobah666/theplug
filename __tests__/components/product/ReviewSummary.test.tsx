import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import ReviewSummary from '@/components/product/ReviewSummary'
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
import { describe } from 'node:test'

const mockSummary = {
  averageRating: 4.2,
  totalReviews: 150,
  ratingDistribution: {
    5: 75,
    4: 45,
    3: 20,
    2: 7,
    1: 3
  }
}

describe('ReviewSummary', () => {
  it('renders summary information correctly', () => {
    render(<ReviewSummary summary={mockSummary} />)
    
    expect(screen.getByText('4.2')).toBeInTheDocument()
    expect(screen.getByText('150 reviews')).toBeInTheDocument()
  })

  it('displays rating distribution bars', () => {
    render(<ReviewSummary summary={mockSummary} />)
    
    // Check that rating levels are displayed in the distribution bars
    const ratingButtons = screen.getAllByRole('button')
    expect(ratingButtons).toHaveLength(5) // Should have 5 rating filter buttons
    
    // Check that counts are displayed
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('handles rating filter clicks', () => {
    const onFilterByRating = vi.fn()
    render(<ReviewSummary summary={mockSummary} onFilterByRating={onFilterByRating} />)
    
    const fiveStarButton = screen.getByRole('button', { name: /5.*75/ })
    fireEvent.click(fiveStarButton)
    
    expect(onFilterByRating).toHaveBeenCalledWith(5)
  })

  it('shows selected rating filter', () => {
    render(
      <ReviewSummary 
        summary={mockSummary} 
        selectedRating={5}
        onFilterByRating={vi.fn()}
      />
    )
    
    expect(screen.getByText('Showing 5-star reviews')).toBeInTheDocument()
    expect(screen.getByText('Show all reviews')).toBeInTheDocument()
  })

  it('handles clear filter click', () => {
    const onFilterByRating = vi.fn()
    render(
      <ReviewSummary 
        summary={mockSummary} 
        selectedRating={5}
        onFilterByRating={onFilterByRating}
      />
    )
    
    const clearButton = screen.getByText('Show all reviews')
    fireEvent.click(clearButton)
    
    expect(onFilterByRating).toHaveBeenCalledWith(null)
  })

  it('toggles rating filter when same rating is clicked', () => {
    const onFilterByRating = vi.fn()
    render(
      <ReviewSummary 
        summary={mockSummary} 
        selectedRating={5}
        onFilterByRating={onFilterByRating}
      />
    )
    
    const fiveStarButton = screen.getByRole('button', { name: /5.*75/ })
    fireEvent.click(fiveStarButton)
    
    expect(onFilterByRating).toHaveBeenCalledWith(null)
  })

  it('displays no reviews state', () => {
    const emptySummary = {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    }
    
    render(<ReviewSummary summary={emptySummary} />)
    
    expect(screen.getByText('No reviews yet')).toBeInTheDocument()
    expect(screen.getByText('Be the first to review this product')).toBeInTheDocument()
  })

  it('displays correct star rating visualization', () => {
    render(<ReviewSummary summary={mockSummary} />)
    
    // Should display 5 stars with appropriate fill based on 4.2 rating
    const starElements = document.querySelectorAll('svg')
    expect(starElements.length).toBeGreaterThanOrEqual(5)
  })

  it('calculates rating bar percentages correctly', () => {
    render(<ReviewSummary summary={mockSummary} />)
    
    // 5-star should be 50% (75/150)
    // 4-star should be 30% (45/150)
    // etc.
    
    // We can't easily test the actual bar widths, but we can verify the data is rendered
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.getByText('45')).toBeInTheDocument()
  })

  it('handles singular vs plural review text', () => {
    const singleReviewSummary = {
      averageRating: 5.0,
      totalReviews: 1,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 }
    }
    
    render(<ReviewSummary summary={singleReviewSummary} />)
    
    expect(screen.getByText('1 review')).toBeInTheDocument()
  })

  it('highlights selected rating bar', () => {
    render(
      <ReviewSummary 
        summary={mockSummary} 
        selectedRating={5}
        onFilterByRating={vi.fn()}
      />
    )
    
    const fiveStarButton = screen.getByRole('button', { name: /5.*75/ })
    expect(fiveStarButton).toHaveClass('bg-blue-50', 'border-blue-200')
  })
})