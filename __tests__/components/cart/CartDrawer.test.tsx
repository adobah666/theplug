import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartDrawer } from '@/components/cart/CartDrawer'
import { CartItemData } from '@/components/cart/CartItem'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
}))

const mockItems: CartItemData[] = [
  {
    _id: '1',
    productId: 'prod-1',
    variantId: 'var-1',
    quantity: 2,
    price: 5000,
    name: 'Test Product 1',
    image: '/test-image-1.jpg',
    size: 'M',
    color: 'blue'
  },
  {
    _id: '2',
    productId: 'prod-2',
    quantity: 1,
    price: 8000,
    name: 'Test Product 2',
    image: '/test-image-2.jpg'
  }
]

describe('CartDrawer', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    items: mockItems,
    subtotal: 18000,
    itemCount: 3,
    onUpdateQuantity: vi.fn(),
    onRemoveItem: vi.fn(),
    onCheckout: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset body overflow style
    document.body.style.overflow = 'unset'
  })

  it('renders drawer when open', () => {
    render(<CartDrawer {...defaultProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Shopping Cart (3)')).toBeInTheDocument()
    expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByText('Test Product 2')).toBeInTheDocument()
  })

  it('does not render drawer when closed', () => {
    render(<CartDrawer {...defaultProps} isOpen={false} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('displays subtotal correctly', () => {
    render(<CartDrawer {...defaultProps} />)

    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('₦18,000.00')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(<CartDrawer {...defaultProps} />)

    const closeButton = screen.getByRole('button', { name: /close cart/i })
    fireEvent.click(closeButton)

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when backdrop is clicked', () => {
    render(<CartDrawer {...defaultProps} />)

    const backdrop = document.querySelector('.bg-black.bg-opacity-50')
    expect(backdrop).toBeInTheDocument()
    
    fireEvent.click(backdrop!)
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onCheckout when checkout button is clicked', () => {
    render(<CartDrawer {...defaultProps} />)

    const checkoutButton = screen.getByRole('button', { name: /proceed to checkout/i })
    fireEvent.click(checkoutButton)

    expect(defaultProps.onCheckout).toHaveBeenCalledTimes(1)
  })

  it('shows empty cart state when no items', () => {
    render(
      <CartDrawer
        {...defaultProps}
        items={[]}
        subtotal={0}
        itemCount={0}
      />
    )

    expect(screen.getByText('Your cart is empty')).toBeInTheDocument()
    expect(screen.getByText('Add some items to your cart to get started')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continue shopping/i })).toBeInTheDocument()
    expect(screen.queryByText('Proceed to Checkout')).not.toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<CartDrawer {...defaultProps} isLoading={true} />)

    // Should show loading spinner instead of items
    expect(screen.queryByText('Test Product 1')).not.toBeInTheDocument()
  })

  it('passes correct props to CartItem components', () => {
    const updatingItems = new Set(['prod-1-var-1'])
    const removingItems = new Set(['prod-2'])

    render(
      <CartDrawer
        {...defaultProps}
        updatingItems={updatingItems}
        removingItems={removingItems}
      />
    )

    // Both items should be rendered
    expect(screen.getByText('Test Product 1')).toBeInTheDocument()
    expect(screen.getByText('Test Product 2')).toBeInTheDocument()
  })

  it('disables checkout button when loading', () => {
    render(<CartDrawer {...defaultProps} isLoading={true} />)

    const checkoutButton = screen.getByRole('button', { name: /proceed to checkout/i })
    expect(checkoutButton).toBeDisabled()
  })

  it('disables checkout button when no items', () => {
    render(
      <CartDrawer
        {...defaultProps}
        items={[]}
        subtotal={0}
        itemCount={0}
      />
    )

    // Checkout button should not be visible when cart is empty
    expect(screen.queryByRole('button', { name: /proceed to checkout/i })).not.toBeInTheDocument()
  })

  it('handles escape key to close drawer', () => {
    render(<CartDrawer {...defaultProps} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close on escape when drawer is closed', () => {
    render(<CartDrawer {...defaultProps} isOpen={false} />)

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('prevents body scroll when open', () => {
    const { rerender } = render(<CartDrawer {...defaultProps} isOpen={false} />)
    expect(document.body.style.overflow).toBe('unset')

    rerender(<CartDrawer {...defaultProps} isOpen={true} />)
    expect(document.body.style.overflow).toBe('hidden')

    rerender(<CartDrawer {...defaultProps} isOpen={false} />)
    expect(document.body.style.overflow).toBe('unset')
  })

  it('has proper accessibility attributes', () => {
    render(<CartDrawer {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'cart-drawer-title')

    const title = screen.getByText('Shopping Cart (3)')
    expect(title).toHaveAttribute('id', 'cart-drawer-title')
  })

  it('shows shipping notice', () => {
    render(<CartDrawer {...defaultProps} />)

    expect(screen.getByText('Shipping and taxes calculated at checkout')).toBeInTheDocument()
  })

  it('shows continue shopping link in footer', () => {
    render(<CartDrawer {...defaultProps} />)

    const continueShoppingLinks = screen.getAllByText('Continue Shopping')
    expect(continueShoppingLinks).toHaveLength(1) // Only in footer when items exist
    
    fireEvent.click(continueShoppingLinks[0])
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })
})