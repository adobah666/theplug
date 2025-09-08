import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { CartItem, CartItemData } from '@/components/cart/CartItem'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
}))

const mockItem: CartItemData = {
  _id: '1',
  productId: 'prod-1',
  variantId: 'var-1',
  quantity: 2,
  price: 5000,
  name: 'Test Product',
  image: '/test-image.jpg',
  size: 'M',
  color: 'blue'
}

describe('CartItem', () => {
  const mockOnUpdateQuantity = vi.fn()
  const mockOnRemove = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders cart item with all details', () => {
    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
      />
    )

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText('Size: M')).toBeInTheDocument()
    expect(screen.getByText('Color: blue')).toBeInTheDocument()
    expect(screen.getByText('₦5,000.00')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('₦10,000.00')).toBeInTheDocument()
    
    const image = screen.getByAltText('Test Product')
    expect(image).toHaveAttribute('src', '/test-image.jpg')
  })

  it('renders item without variant info when not provided', () => {
    const itemWithoutVariant = {
      ...mockItem,
      size: undefined,
      color: undefined,
      variantId: undefined
    }

    render(
      <CartItem
        item={itemWithoutVariant}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
      />
    )

    expect(screen.queryByText(/Size:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Color:/)).not.toBeInTheDocument()
  })

  it('increases quantity when plus button is clicked', () => {
    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
      />
    )

    const increaseButton = screen.getByRole('button', { name: /increase quantity/i })
    fireEvent.click(increaseButton)

    expect(mockOnUpdateQuantity).toHaveBeenCalledWith('prod-1', 'var-1', 3)
  })

  it('decreases quantity when minus button is clicked', () => {
    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
      />
    )

    const decreaseButton = screen.getByRole('button', { name: /decrease quantity/i })
    fireEvent.click(decreaseButton)

    expect(mockOnUpdateQuantity).toHaveBeenCalledWith('prod-1', 'var-1', 1)
  })

  it('calls onRemove when quantity would go below 1', () => {
    const itemWithQuantity1 = { ...mockItem, quantity: 1 }
    
    render(
      <CartItem
        item={itemWithQuantity1}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
      />
    )

    const decreaseButton = screen.getByRole('button', { name: /decrease quantity/i })
    fireEvent.click(decreaseButton)

    expect(mockOnRemove).toHaveBeenCalledWith('prod-1', 'var-1')
    expect(mockOnUpdateQuantity).not.toHaveBeenCalled()
  })

  it('does not increase quantity beyond 99', () => {
    const itemWithMaxQuantity = { ...mockItem, quantity: 99 }
    
    render(
      <CartItem
        item={itemWithMaxQuantity}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
      />
    )

    const increaseButton = screen.getByRole('button', { name: /increase quantity/i })
    fireEvent.click(increaseButton)

    expect(mockOnUpdateQuantity).not.toHaveBeenCalled()
  })

  it('calls onRemove when remove button is clicked', () => {
    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
      />
    )

    const removeButton = screen.getByRole('button', { name: '' }) // Remove button doesn't have text
    fireEvent.click(removeButton)

    expect(mockOnRemove).toHaveBeenCalledWith('prod-1', 'var-1')
  })

  it('shows loading spinner when updating', () => {
    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
        isUpdating={true}
      />
    )

    // Should show loading spinner instead of quantity number
    expect(screen.queryByText('2')).not.toBeInTheDocument()
    
    // Buttons should be disabled
    const increaseButton = screen.getByRole('button', { name: /increase quantity/i })
    const decreaseButton = screen.getByRole('button', { name: /decrease quantity/i })
    
    expect(increaseButton).toBeDisabled()
    expect(decreaseButton).toBeDisabled()
  })

  it('shows loading spinner when removing', () => {
    render(
      <CartItem
        item={mockItem}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
        isRemoving={true}
      />
    )

    // All buttons should be disabled
    const increaseButton = screen.getByRole('button', { name: /increase quantity/i })
    const decreaseButton = screen.getByRole('button', { name: /decrease quantity/i })
    
    expect(increaseButton).toBeDisabled()
    expect(decreaseButton).toBeDisabled()
  })

  it('formats price correctly for Nigerian Naira', () => {
    const itemWithDifferentPrice = { ...mockItem, price: 12500 }
    
    render(
      <CartItem
        item={itemWithDifferentPrice}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemove={mockOnRemove}
      />
    )

    expect(screen.getByText('₦12,500.00')).toBeInTheDocument()
    expect(screen.getByText('₦25,000.00')).toBeInTheDocument() // 12500 * 2
  })
})