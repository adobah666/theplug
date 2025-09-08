import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />)
    const spinner = document.querySelector('svg')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('animate-spin', 'text-blue-600', 'h-8', 'w-8')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />)
    let spinner = document.querySelector('svg')
    expect(spinner).toHaveClass('h-4', 'w-4')

    rerender(<LoadingSpinner size="lg" />)
    spinner = document.querySelector('svg')
    expect(spinner).toHaveClass('h-12', 'w-12')
  })

  it('renders with text', () => {
    render(<LoadingSpinner text="Loading..." />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByText('Loading...')).toHaveClass('text-sm', 'text-gray-600')
  })

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />)
    const spinner = document.querySelector('svg')
    expect(spinner).toHaveClass('custom-spinner')
  })

  it('renders without text by default', () => {
    render(<LoadingSpinner />)
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
})