import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '@/components/ui/Modal'

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div>Modal content</div>
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when isOpen is true', () => {
    render(<Modal {...defaultProps} />)
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument()
  })

  it('renders with title', () => {
    render(<Modal {...defaultProps} title="Test Modal" />)
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Test Modal')
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<Modal {...defaultProps} onClose={onClose} />)
    
    const backdrop = document.querySelector('.bg-black.bg-opacity-50')
    fireEvent.click(backdrop!)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<Modal {...defaultProps} title="Test Modal" onClose={onClose} />)
    
    const closeButton = screen.getByRole('button')
    fireEvent.click(closeButton)
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<Modal {...defaultProps} onClose={onClose} />)
    
    fireEvent.keyDown(document, { key: 'Escape' })
    
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />)
    expect(document.querySelector('.max-w-md')).toBeInTheDocument()

    rerender(<Modal {...defaultProps} size="lg" />)
    expect(document.querySelector('.max-w-2xl')).toBeInTheDocument()

    rerender(<Modal {...defaultProps} size="xl" />)
    expect(document.querySelector('.max-w-4xl')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Modal {...defaultProps} className="custom-modal" />)
    expect(document.querySelector('.custom-modal')).toBeInTheDocument()
  })

  it('prevents body scroll when open', () => {
    const { unmount } = render(<Modal {...defaultProps} />)
    expect(document.body.style.overflow).toBe('hidden')
    
    unmount()
    expect(document.body.style.overflow).toBe('unset')
  })
})