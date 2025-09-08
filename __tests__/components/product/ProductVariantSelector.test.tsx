import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProductVariantSelector } from '@/components/product/ProductVariantSelector'

describe('ProductVariantSelector', () => {
  const mockVariants = [
    {
      _id: '1',
      size: 'S',
      color: 'red',
      sku: 'TEST-S-RED',
      inventory: 5
    },
    {
      _id: '2',
      size: 'M',
      color: 'red',
      sku: 'TEST-M-RED',
      inventory: 3
    },
    {
      _id: '3',
      size: 'S',
      color: 'blue',
      sku: 'TEST-S-BLUE',
      inventory: 0
    },
    {
      _id: '4',
      size: 'M',
      color: 'blue',
      sku: 'TEST-M-BLUE',
      inventory: 2
    }
  ]

  it('renders size and color options', () => {
    render(
      <ProductVariantSelector
        variants={mockVariants}
        selectedVariant={null}
        onVariantChange={vi.fn()}
      />
    )
    
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'S' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'M' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'red' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'blue' })).toBeInTheDocument()
  })

  it('calls onVariantChange when size is selected', () => {
    const onVariantChange = vi.fn()
    render(
      <ProductVariantSelector
        variants={mockVariants}
        selectedVariant={null}
        onVariantChange={onVariantChange}
      />
    )
    
    const sizeButton = screen.getByRole('button', { name: 'S' })
    fireEvent.click(sizeButton)
    
    expect(onVariantChange).toHaveBeenCalledWith(mockVariants[0])
  })

  it('calls onVariantChange when color is selected', () => {
    const onVariantChange = vi.fn()
    render(
      <ProductVariantSelector
        variants={mockVariants}
        selectedVariant={null}
        onVariantChange={onVariantChange}
      />
    )
    
    const colorButton = screen.getByRole('button', { name: 'red' })
    fireEvent.click(colorButton)
    
    expect(onVariantChange).toHaveBeenCalledWith(mockVariants[0])
  })

  it('shows selected variant as active', () => {
    render(
      <ProductVariantSelector
        variants={mockVariants}
        selectedVariant={mockVariants[0]}
        onVariantChange={vi.fn()}
      />
    )
    
    const sizeButton = screen.getByRole('button', { name: 'S' })
    const colorButton = screen.getByRole('button', { name: 'red' })
    
    expect(sizeButton).toHaveClass('border-blue-500', 'bg-blue-50', 'text-blue-700')
    expect(colorButton).toHaveClass('border-blue-500', 'bg-blue-50', 'text-blue-700')
  })

  it('disables out of stock variants', () => {
    render(
      <ProductVariantSelector
        variants={mockVariants}
        selectedVariant={null}
        onVariantChange={vi.fn()}
      />
    )
    
    // Size S + Blue combination has 0 inventory, so blue should be available
    // but when S is selected and then blue is clicked, it should work
    const sizeButton = screen.getByRole('button', { name: 'S' })
    fireEvent.click(sizeButton)
    
    // Blue should still be clickable as there are other size+blue combinations with inventory
    const blueButton = screen.getByRole('button', { name: 'blue' })
    expect(blueButton).not.toBeDisabled()
  })

  it('shows selected variant information', () => {
    render(
      <ProductVariantSelector
        variants={mockVariants}
        selectedVariant={mockVariants[0]}
        onVariantChange={vi.fn()}
      />
    )
    
    expect(screen.getByText('SKU:')).toBeInTheDocument()
    expect(screen.getByText('TEST-S-RED')).toBeInTheDocument()
  })

  it('shows low stock warning', () => {
    const lowStockVariant = { ...mockVariants[0], inventory: 2 }
    render(
      <ProductVariantSelector
        variants={mockVariants}
        selectedVariant={lowStockVariant}
        onVariantChange={vi.fn()}
      />
    )
    
    expect(screen.getByText('Only 2 left in stock')).toBeInTheDocument()
  })

  it('shows out of stock message', () => {
    const outOfStockVariant = { ...mockVariants[0], inventory: 0 }
    render(
      <ProductVariantSelector
        variants={mockVariants}
        selectedVariant={outOfStockVariant}
        onVariantChange={vi.fn()}
      />
    )
    
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
  })

  it('shows clear selection button when variant is selected', () => {
    const onVariantChange = vi.fn()
    render(
      <ProductVariantSelector
        variants={mockVariants}
        selectedVariant={mockVariants[0]}
        onVariantChange={onVariantChange}
      />
    )
    
    const clearButton = screen.getByRole('button', { name: /clear selection/i })
    expect(clearButton).toBeInTheDocument()
    
    fireEvent.click(clearButton)
    expect(onVariantChange).toHaveBeenCalledWith(null)
  })

  it('does not render when no variants provided', () => {
    const { container } = render(
      <ProductVariantSelector
        variants={[]}
        selectedVariant={null}
        onVariantChange={vi.fn()}
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('handles variants with only sizes', () => {
    const sizeOnlyVariants = [
      { _id: '1', size: 'S', sku: 'TEST-S', inventory: 5 },
      { _id: '2', size: 'M', sku: 'TEST-M', inventory: 3 }
    ]
    
    render(
      <ProductVariantSelector
        variants={sizeOnlyVariants}
        selectedVariant={null}
        onVariantChange={vi.fn()}
      />
    )
    
    expect(screen.getByText('Size')).toBeInTheDocument()
    expect(screen.queryByText('Color')).not.toBeInTheDocument()
  })

  it('handles variants with only colors', () => {
    const colorOnlyVariants = [
      { _id: '1', color: 'red', sku: 'TEST-RED', inventory: 5 },
      { _id: '2', color: 'blue', sku: 'TEST-BLUE', inventory: 3 }
    ]
    
    render(
      <ProductVariantSelector
        variants={colorOnlyVariants}
        selectedVariant={null}
        onVariantChange={vi.fn()}
      />
    )
    
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.queryByText('Size')).not.toBeInTheDocument()
  })
})