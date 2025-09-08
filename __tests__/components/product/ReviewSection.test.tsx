import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ReviewSection from '@/components/product/ReviewSection'
import { useAuth } from '@/lib/auth/context'

// Mock the auth context
vi.mock('@/lib/auth/context', () => ({
  useAuth: vi.fn()
}))

// Mock the child components
vi.mock('@/components/product/ReviewList', () => ({
  default: ({ productId }: { productId: string }) => (
    <div data-testid="review-list">ReviewList for {productId}</div>
  )
}))

vi.mock('@/components/product/ReviewForm', () => ({
  default: ({ productId, onSubmitSuccess, onCancel }: any) => (
    <div data-testid="review-form">
      ReviewForm for {productId}
      <button onClick={onSubmitSuccess}>Submit Success</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  )
}))

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    pathname: '/products/test-product'
  },
  writable: true
})

describe('ReviewSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders section header and review list', () => {
    ;(useAuth as any).mockReturnValue({
      user: null,
      isAuthenticated: false
    })
    
    render(<ReviewSection productId="product-1" />)
    
    expect(screen.getByText('Customer Reviews')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /write a review/i })).toBeInTheDocument()
    expect(screen.getByTestId('review-list')).toBeInTheDocument()
  })

  it('opens review form when authenticated user clicks write review', () => {
    ;(useAuth as any).mockReturnValue({
      user: { id: 'user-1', name: 'John Doe' },
      isAuthenticated: true
    })
    
    render(<ReviewSection productId="product-1" />)
    
    const writeReviewButton = screen.getByRole('button', { name: /write a review/i })
    fireEvent.click(writeReviewButton)
    
    expect(screen.getByTestId('review-form')).toBeInTheDocument()
  })

  it('redirects to login when unauthenticated user clicks write review', () => {
    ;(useAuth as any).mockReturnValue({
      user: null,
      isAuthenticated: false
    })
    
    render(<ReviewSection productId="product-1" />)
    
    const writeReviewButton = screen.getByRole('button', { name: /write a review/i })
    fireEvent.click(writeReviewButton)
    
    expect(window.location.href).toBe('/auth/login?redirect=%2Fproducts%2Ftest-product')
  })

  it('closes review form when cancel is clicked', () => {
    ;(useAuth as any).mockReturnValue({
      user: { id: 'user-1', name: 'John Doe' },
      isAuthenticated: true
    })
    
    render(<ReviewSection productId="product-1" />)
    
    // Open form
    const writeReviewButton = screen.getByRole('button', { name: /write a review/i })
    fireEvent.click(writeReviewButton)
    
    expect(screen.getByTestId('review-form')).toBeInTheDocument()
    
    // Close form
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument()
  })

  it('closes form and refreshes list when review is submitted successfully', async () => {
    ;(useAuth as any).mockReturnValue({
      user: { id: 'user-1', name: 'John Doe' },
      isAuthenticated: true
    })
    
    render(<ReviewSection productId="product-1" />)
    
    // Open form
    const writeReviewButton = screen.getByRole('button', { name: /write a review/i })
    fireEvent.click(writeReviewButton)
    
    expect(screen.getByTestId('review-form')).toBeInTheDocument()
    
    // Submit review
    const submitButton = screen.getByText('Submit Success')
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.queryByTestId('review-form')).not.toBeInTheDocument()
    })
    
    // Review list should be refreshed (new key)
    expect(screen.getByTestId('review-list')).toBeInTheDocument()
  })

  it('displays write review button with correct icon', () => {
    ;(useAuth as any).mockReturnValue({
      user: null,
      isAuthenticated: false
    })
    
    render(<ReviewSection productId="product-1" />)
    
    const writeReviewButton = screen.getByRole('button', { name: /write a review/i })
    expect(writeReviewButton).toBeInTheDocument()
    
    // Check for SVG icon
    const icon = writeReviewButton.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('passes correct productId to child components', () => {
    ;(useAuth as any).mockReturnValue({
      user: { id: 'user-1', name: 'John Doe' },
      isAuthenticated: true
    })
    
    render(<ReviewSection productId="test-product-123" />)
    
    expect(screen.getByText('ReviewList for test-product-123')).toBeInTheDocument()
    
    // Open form to check productId is passed
    const writeReviewButton = screen.getByRole('button', { name: /write a review/i })
    fireEvent.click(writeReviewButton)
    
    expect(screen.getByText('ReviewForm for test-product-123')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    ;(useAuth as any).mockReturnValue({
      user: null,
      isAuthenticated: false
    })
    
    const { container } = render(
      <ReviewSection productId="product-1" className="custom-class" />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles modal state correctly', () => {
    ;(useAuth as any).mockReturnValue({
      user: { id: 'user-1', name: 'John Doe' },
      isAuthenticated: true
    })
    
    render(<ReviewSection productId="product-1" />)
    
    // Initially modal should be closed
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument()
    
    // Open modal
    const writeReviewButton = screen.getByRole('button', { name: /write a review/i })
    fireEvent.click(writeReviewButton)
    
    expect(screen.getByTestId('review-form')).toBeInTheDocument()
    
    // Close modal via cancel
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)
    
    expect(screen.queryByTestId('review-form')).not.toBeInTheDocument()
  })
})