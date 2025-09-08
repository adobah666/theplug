import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorMessage } from '@/components/ui/ErrorMessage'

describe('ErrorMessage', () => {
  it('renders with required message prop', () => {
    render(<ErrorMessage message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Error')).toBeInTheDocument() // default title
  })

  it('renders with custom title', () => {
    render(<ErrorMessage title="Custom Error" message="Something went wrong" />)
    expect(screen.getByText('Custom Error')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('renders retry button when onRetry is provided', () => {
    const onRetry = vi.fn()
    render(<ErrorMessage message="Something went wrong" onRetry={onRetry} />)
    
    const retryButton = screen.getByRole('button', { name: /try again/i })
    expect(retryButton).toBeInTheDocument()
  })

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorMessage message="Something went wrong" onRetry={onRetry} />)
    
    const retryButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(retryButton)
    
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorMessage message="Something went wrong" />)
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<ErrorMessage message="Test error message" className="custom-error" data-testid="error-message" />)
    const errorContainer = screen.getByTestId('error-message')
    expect(errorContainer).toHaveClass('custom-error')
  })

  it('renders with error icon', () => {
    render(<ErrorMessage message="Something went wrong" />)
    const icon = document.querySelector('svg')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveClass('h-5', 'w-5', 'text-red-400')
  })

  it('has proper styling classes', () => {
    render(<ErrorMessage message="Something went wrong" />)
    const container = screen.getByText('Something went wrong').closest('div')?.parentElement?.parentElement
    expect(container).toHaveClass('rounded-lg', 'border', 'border-red-200', 'bg-red-50', 'p-4')
  })
})